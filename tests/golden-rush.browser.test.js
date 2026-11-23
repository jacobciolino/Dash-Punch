"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.addInitScript(()=>{window.testPad={index:0,id:"Rush Test Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{value:()=>[window.testPad]});});
    await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    const button=async index=>{await page.evaluate(i=>window.testPad.buttons[i]={pressed:true,value:1},index);await page.waitForTimeout(100);await page.evaluate(i=>window.testPad.buttons[i]={pressed:false,value:0},index);await page.waitForTimeout(150);};
    await click("Play");await click("Dashball");await click("Choose Fighters");await page.waitForTimeout(250);await button(9);
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();await click("Choose Stage");await page.waitForTimeout(250);
    for(let i=0;i<4;i++)await button(15);await button(0);
    assert.equal(await page.locator(".stage-preview-large h2").textContent(),"Golden Rush");assert.equal(await page.locator(".stage-preview-large .stage-ring").count(),6);assert.equal(await page.locator('[data-menu-screen="countdown"]').count(),0);
    await click("Golden Rush Settings");const settings=await page.locator('[data-menu-screen="dashballSetup"]').innerText();assert.match(settings,/100/);assert.match(settings,/Unlimited/);assert.match(settings,/15s/);
    for(const key of ["Balls","Score","GoldenRespawn","Respawn","Reward","Time"]){await page.locator(`[data-menu-action="rush${key}Up"]`).click();await page.locator(`[data-menu-action="rush${key}Down"]`).click();}
    const respawnRow=()=>page.locator('[data-menu-action="rushRespawnDown"]').evaluate(e=>e.closest(".setting-row").textContent);
    for(let i=0;i<2;i++)await page.locator('[data-menu-action="rushRespawnDown"]').click();assert.match(await respawnRow(),/10s/);
    for(let i=0;i<3;i++)await page.locator('[data-menu-action="rushRespawnUp"]').click();assert.match(await respawnRow(),/20s/);await page.locator('[data-menu-action="rushRespawnDown"]').click();
    await page.setViewportSize({width:980,height:720});assert(await page.locator('[data-menu-screen="dashballSetup"]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.setViewportSize({width:1440,height:1000});
    await click("Choose Fighters");await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();await click("Choose Stage");await click("Start Dashball");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    fs.mkdirSync("artifacts/golden-rush",{recursive:true});
    const initial=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"golden-rush"});d.fighters[1].y=700;d.camera.update(1);
      const i=new Image();i.src="assets/dashball/golden-rush.png";await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const ctx=c.getContext("2d");ctx.drawImage(i,0,0);const pixels=ctx.getImageData(0,0,i.width,i.height).data;for(let n=3;n<pixels.length;n+=4)if(pixels[n]!==0&&pixels[n]!==255)throw Error("Antialiased art");
      const hash=d.online.rollback.hash();d.stagePresentation.draw();return {art:[i.width,i.height],pure:hash===d.online.rollback.hash(),image:document.querySelector("#game").toDataURL(),camera:d.camera.state};
    });assert.deepEqual(initial.art,[128,288]);assert(initial.pure);assert(initial.camera.zoom>=.25);fs.writeFileSync("artifacts/golden-rush/full-arena.png",Buffer.from(initial.image.split(",")[1],"base64"));
    await page.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;s.scores[0]=99;s.ringPoints[0]=99;const r=d.dashball.arena.rings.find(r=>r.team===1&&r.row===0);Object.assign(s.ball,{x:r.line-80,y:(r.top+r.bottom)/2,vx:1800,vy:0});for(let i=0;i<10;i++)d.dashball.step();});
    await page.locator('[data-menu-screen="dashballResult"]').waitFor({timeout:5000});const result=await page.locator('[data-menu-screen="dashballResult"]').innerText();assert.match(result,/RED WINS/);assert.match(result,/100 ring points/);assert.match(result,/golden captures/);
    await click("Rematch");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:15000});assert(await page.evaluate(()=>{const s=window.__dashPunchDebug.dashball.state;return s.scores.every(n=>n===0)&&s.extraBalls.length===2&&s.golden.health===48;}));
    const performanceResults=[];
    for(const ballCount of [3,5]){
      await page.evaluate(ballCount=>window.__dashPunchDebug.dashball.setup({arena:"golden-rush",teamSize:5,ballCount},{characters:["orbit","spike","rain","chungus","anchor","whipado","archer","gunman","microusb","edgebert"],ai:true}),ballCount);await page.waitForTimeout(2500);
      const perf=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,players:d.fighters.length,finite:d.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)),scores:[...d.dashball.state.scores]});}requestAnimationFrame(tick);}));assert.equal(perf.players,10);assert(perf.finite);performanceResults.push({ballCount,...perf});
      await page.evaluate(()=>{const d=window.__dashPunchDebug,h=d.online.rollback.hash();d.stagePresentation.draw();if(h!==d.online.rollback.hash())throw Error("Render changed simulation");});
      await page.locator("#game").screenshot({path:`artifacts/golden-rush/ten-players-${ballCount}-balls.png`});
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",controllerStageSelection:true,settings:true,smallWindow:true,art:initial.art,rematch:true,performanceResults}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
