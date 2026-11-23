"use strict";
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.addInitScript(()=>{
      window.pad={index:0,id:"054c DualShock 4",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,"getGamepads",{value:()=>[window.pad]});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const press=async b=>{await page.evaluate(b=>window.pad.buttons[b]={pressed:true,value:1},b);await page.waitForTimeout(180);await page.evaluate(b=>window.pad.buttons[b]={pressed:false,value:0},b);await page.waitForTimeout(180);};
    await page.waitForTimeout(200);await press(0);await press(0);
    await page.locator('[data-menu-screen="characters"]').waitFor();
    const move=async(x,y)=>{await page.evaluate(([x,y])=>window.pad.axes=[x,y,0,0],[x,y]);await page.waitForTimeout(90);await page.evaluate(()=>window.pad.axes=[0,0,0,0]);await page.waitForTimeout(90);};
    await press(0); // Dash joins, without selecting or readying.
    await press(1); // Punch opens player selector.
    await move(1,0); // Host edits P2; ownership remains P1.
    for(let i=0;i<4;i++)await move(0,-1); // Type field.
    await press(0); // Human -> CPU.
    assert(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu));
    await press(1); // Back to roster.
    const before=await page.evaluate(()=>window.__dashPunchDebug.lobby.slots.map(s=>s.character));
    await move(1,0);
    const after=await page.evaluate(()=>window.__dashPunchDebug.lobby.slots);
    assert.equal(after[0].character,before[0]);assert.notEqual(after[1].character,before[1]);
    assert.equal(after[0].device,0);assert.equal(after[1].device,null);
    await press(1); await move(-1,0); await press(0); // P1 roster.
    await press(0); await press(0); // Ready, then Choose Stage.
    await page.locator('[data-menu-screen="stages"]').waitFor();
    await page.screenshot({path:"/tmp/dash-two-button-stages.png"});
    await press(1);
    await page.locator('[data-menu-screen="characters"]').waitFor();
    await press(1); await press(1); // Unready, then open player selector.
    await move(1,0); await move(0,1);
    await page.screenshot({path:"/tmp/dash-two-button-lobby.png"});
    await press(0); // Close P2 with Dash.
    assert(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].empty));
    console.log("Two-button lobby: join, CPU setup, roster selection, ownership, ready/stage/back and explicit slot removal passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
