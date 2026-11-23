"use strict";
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { server } = require("../server");
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
    browser = await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || undefined});
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.testPads=[];
      window.makePad=index=>({index,id:`Test Controller ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});
      Object.defineProperty(navigator,"getGamepads",{value:()=>window.testPads});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    const slots=()=>page.evaluate(()=>window.__dashPunchDebug.lobby.slots);
    const press=async (pad,button)=>{
      await page.evaluate(([p,b])=>{window.testPads.find(pad=>pad.index===p).buttons[b]={pressed:true,value:1};},[pad,button]);
      await page.waitForTimeout(180);
      await page.evaluate(([p,b])=>{window.testPads.find(pad=>pad.index===p).buttons[b]={pressed:false,value:0};},[pad,button]);
      await page.waitForTimeout(160);
    };
    await page.getByRole("switch",{name:"Experimental Content",exact:true}).click();
    await click("Play");await click("Local");await page.waitForTimeout(200);
    assert.equal(await page.locator(".slot-card").count(),10);
    assert.equal((await slots()).filter(slot=>!slot.empty).length,2);
    await page.evaluate(()=>{window.testPads=[window.makePad(0),window.makePad(1)];});
    await press(0,9); await press(1,0);
    assert.deepEqual((await slots()).slice(0,2).map(s=>s.device),[0,1],JSON.stringify(await slots()));
    assert((await slots()).every(s=>!s.ready),"join must not ready");
    await press(0,0);await press(1,0);
    await press(0,9);await page.locator('[data-menu-screen="stages"]').waitFor();
    await click("Back");await page.waitForTimeout(200);
    for(let i=2;i<10;i++) {
      await page.evaluate(i=>window.testPads.push(window.makePad(i)),i);
      await press(i,9);
      assert.equal((await slots())[i].device,i);
      assert.equal((await slots())[i].ready,false);
      assert.equal(await page.locator('[data-menu-screen="characters"]').count(),1);
    }
    assert.deepEqual((await slots()).map(s=>s.device),[0,1,2,3,4,5,6,7,8,9]);
    await press(0,1); await press(1,1); // unready first two
    const before=await slots();
    await page.evaluate(()=>{window.testPads[0].axes[0]=1;window.testPads[1].axes[0]=-1;});
    await page.waitForTimeout(80);
    await page.evaluate(()=>{window.testPads[0].axes[0]=0;window.testPads[1].axes[0]=0;});
    const after=await slots();
    assert.notEqual(after[0].character,before[0].character);
    assert.notEqual(after[1].character,before[1].character);
    assert.equal(after[2].character,before[2].character);
    await page.locator('[data-player-slot="2"] [data-field="costume"]').click();assert.equal((await slots())[2].costume,1);
    await page.locator('[data-player-slot="2"] [data-field="team"]').click();
    assert.equal((await slots())[2].team,1);
    // Close explicitly, without shifting any other seat.
    await page.locator('[data-player-slot="3"] [data-menu-action="closeSlot"]').click();
    assert((await slots())[3].empty);assert.equal((await slots())[4].device,4);
    await page.locator('[data-player-slot="3"] [data-field="kind"]').click();
    assert((await slots())[3].cpu);assert.equal((await slots())[3].device,null);
    // CPU -> Human -> Empty -> CPU -> Human: disconnected/unbound humans cannot ready.
    await page.locator('[data-player-slot="3"] [data-field="kind"]').click();
    assert.equal((await slots())[3].cpu,false);
    await press(3,9);assert.equal((await slots())[3].device,3);
    await press(4,0);assert((await slots())[4].ready);
    await page.evaluate(()=>{window.testPads=window.testPads.filter(p=>p.index!==4);});
    await page.waitForTimeout(120);
    assert((await slots())[4].disconnected);assert(!(await slots())[4].ready);
    assert.equal((await slots())[4].device,4,"disconnect must reserve ownership");
    // Same device returning at a different browser index reclaims its old slot on Start.
    await page.evaluate(()=>{const pad=window.makePad(11);pad.id="Test Controller 4";window.testPads.push(pad);});
    await press(11,9);assert.equal((await slots())[4].device,11);
    assert(!(await slots())[4].ready);
    assert.equal((await slots())[5].device,5);
    await page.screenshot({path:"/tmp/dash-drop-in-lobby-desktop.png"});
    // Every human readies; any joined controller may advance the shared stage menu.
    for(const slot of await slots()) if(!slot.empty&&!slot.cpu&&!slot.ready) await press(slot.device,0);
    assert(await page.evaluate(()=>window.__dashPunchDebug.lobby.valid));
    await press(1,9);await page.locator('[data-menu-screen="stages"]').waitFor();
    await click("Back");await page.waitForTimeout(200);
    const saved=await slots();
    await press(0,9); await page.locator('[data-menu-screen="stages"]').waitFor();
    assert((await page.locator('.stage-tile .tile-name').allTextContents()).some(name=>name.endsWith('*')));
    await click("Fight");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.fighters.length),10);
    assert(await page.evaluate(()=>window.__dashPunchDebug.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y))));
    await page.keyboard.press("Escape");await click("Local");
    assert.deepEqual(await slots(),saved,"return must preserve lobby");
    assert(await page.getByRole('button',{name:'Rematch',exact:true}).isEnabled());
    // Sparse seats: remove P4 while P5 and later keep their devices and fighter IDs.
    await page.locator('[data-player-slot="3"] [data-menu-action="closeSlot"]').click();
    const sparse=await slots();
    assert(sparse[3].empty);assert.equal(sparse[4].device,11);
    await click("Choose Stage");await click("Fight");
    await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    assert.deepEqual(await page.evaluate(()=>window.__dashPunchDebug.fighters.map(f=>f.id)),["p1","p2","p3","p5","p6","p7","p8","p9","p10"]);
    await page.keyboard.press("Escape");await click("Local");
    await page.setViewportSize({width:960,height:720});
    await page.screenshot({path:"/tmp/dash-drop-in-lobby-small.png"});
    assert(await page.getByRole('button',{name:'Choose Stage',exact:true}).isVisible());
    assert.deepEqual(errors,[]);
    console.log("Drop-in lobby: 2–10 players, Start/confirm join isolation, simultaneous selection, costumes/teams, CPU/Empty, reserved reconnect, shared stage advance, ten-fighter and sparse-fighter matches, retained settings, mouse/keyboard and experimental content passed.");
  } finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
