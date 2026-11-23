"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome"});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],failed=[];
    page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)failed.push([r.status(),r.url()]);});
    await page.addInitScript(()=>{window.testPad={index:0,id:"Showdown Test Controller",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{value:()=>[window.testPad]});});
    await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    const button=async i=>{await page.evaluate(i=>window.testPad.buttons[i]={pressed:true,value:1},i);await page.waitForTimeout(100);await page.evaluate(i=>window.testPad.buttons[i]={pressed:false,value:0},i);await page.waitForTimeout(180);};
    await click("Play");await click("Sandbag Showdown");assert.equal(await page.locator('[data-menu-screen="sandbagSetup"]').count(),1);
    await click("Damage Brawl");assert.equal(await page.locator('[data-menu-action="sandbagHealthUp"]').count(),1);await click("Damage Race");
    await page.setViewportSize({width:980,height:720});assert(await page.locator('[data-menu-screen="sandbagSetup"]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:"artifacts/sandbag/settings-small.png"});await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-menu-action="sandbagSizeUp"]').focus();await button(0);assert.match(await page.locator(".settings-grid").innerText(),/2 v 2/);await page.locator('[data-menu-action="sandbagSizeDown"]').click();
    await click("Choose Fighters");await page.waitForTimeout(250);await button(9);
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].ready))await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();
    await click("Start Showdown");await page.locator('[data-menu-screen="countdown"]').waitFor();
    const initial=await page.evaluate(()=>{const d=window.__dashPunchDebug;return {time:d.sandbag.state.remaining,bags:d.sandbag.state.bags.length,fighters:d.fighters.length};});assert.equal(initial.time,90);assert.equal(initial.bags,2);assert.equal(initial.fighters,2);
    await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    const art=await page.evaluate(async()=>{const i=new Image();i.src="assets/sandbag/conditions.png";await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const ctx=c.getContext("2d");ctx.drawImage(i,0,0);const p=ctx.getImageData(0,0,i.width,i.height).data;let opaque=0;for(let n=3;n<p.length;n+=4){if(p[n]!==0&&p[n]!==255)throw Error("Soft sprite edges");if(p[n])opaque++;}return {size:[i.width,i.height],opaque};});assert.deepEqual(art.size,[150,56]);assert(art.opaque>3000);
    // Real keyboard Punch input, through the same two-button action layer used by controllers.
    await page.evaluate(()=>{const d=window.__dashPunchDebug,b=d.sandbag.state.bags[0],f=d.fighters[0];Object.assign(f,{x:b.x-100,y:b.y,prevX:b.x-100,prevY:b.y,onGround:false,vx:0,vy:0});});
    await page.keyboard.down("d");await page.keyboard.down("f");await page.waitForTimeout(130);await page.keyboard.up("f");await page.waitForTimeout(500);await page.keyboard.up("d");
    assert(await page.evaluate(()=>window.__dashPunchDebug.sandbag.state.scores[0]>0));
    await page.evaluate(()=>{const d=window.__dashPunchDebug;d.sandbag.state.scores=[12000,8000];d.sandbag.state.bags.forEach((b,i)=>b.damage=i?2200:450);d.stagePresentation.draw();});await page.locator("#game").screenshot({path:"artifacts/sandbag/damage-states.png"});
    await page.evaluate(()=>{const d=window.__dashPunchDebug,s=d.sandbag.state;s.remaining=.001;s.scores=[100,90];d.sandbag.step();});await page.locator('[data-menu-screen="sandbagResult"]').waitFor();assert.match(await page.locator("#menuLayer").innerText(),/BLUE WINS/);
    await click("Rematch");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:15000});assert(await page.evaluate(()=>window.__dashPunchDebug.sandbag.state.scores.every(n=>n===0)));
    const performanceResults=[];
    for(const ruleset of ["race","brawl","scramble"]){
      await page.evaluate(ruleset=>window.__dashPunchDebug.sandbag.setup({ruleset,teamSize:5},{ai:true,characters:["orbit","spike","rain","chungus","anchor","whipado","archer","gunman","microusb","edgebert"]}),ruleset);await page.waitForTimeout(2200);
      const perf=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<120)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug,h=d.online.rollback.hash();d.stagePresentation.draw();resolve({median:samples[60],p95:samples[114],over25:samples.filter(n=>n>25).length,players:d.fighters.length,finite:d.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)),scores:[...d.sandbag.state.scores],pure:h===d.online.rollback.hash(),camera:d.camera.state});}requestAnimationFrame(tick);}));assert.equal(perf.players,10);assert(perf.finite&&perf.pure);performanceResults.push({ruleset,...perf});
      await page.locator("#game").screenshot({path:`artifacts/sandbag/${ruleset}-ten-players.png`});
    }
    await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard"});if(d.sandbag.state)throw Error("Sandbag leaked into Dashball");d.dashball.standard();if(d.sandbag.state||d.dashball.state)throw Error("Sports state leaked into standard");});
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify({tests:"passed",keyboardPunch:true,controllerSettings:true,countdownLoaded:true,rematch:true,smallWindow:true,art,performanceResults,errors}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
