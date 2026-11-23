"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/ground-running";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],scenes=[];page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});
    for(const key of["anchor","boomerangus","lancer","phantom"]){
      await page.evaluate(key=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard-wide",ruleset:"battle",teamSize:1},{characters:[key,"rain"],seed:919});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";d.fighters.forEach((f,i)=>Object.assign(f,{x:i?3400:600,y:d.dashball.arena.floorY-f.data.height/2,onGround:true,vx:0,vy:0,invulnerable:0}));},key);
      await page.waitForFunction(key=>window.__dashPunchDebug.characterPresentation.sheet(key,"walk"),key);
      const result=await page.evaluate(()=>{const d=window.__dashPunchDebug;for(let n=0;n<210;n++)d.online.rollback.step([{hasAim:true,aimX:1,aimY:0},{}]);d.camera.update(1);const f=d.fighters[0],hash=d.online.rollback.hash();d.stagePresentation.draw();const p=document.getElementById("game").getContext("2d").getImageData(0,0,1280,720).data;let opaque=0;for(let i=3;i<p.length;i+=4)if(p[i])opaque++;return {speed:f.vx,time:f.groundRun?.time,running:d.groundMovement.running(0),animation:d.getAssetAnimation(0),pure:hash===d.online.rollback.hash(),opaque};});
      assert(result.running&&result.time>=3.5&&result.speed>0&&result.pure);assert.equal(result.animation.clip,"walk");assert(result.opaque>1000);await page.screenshot({path:`${out}/${key}-run-${width}.png`});
      const stopped=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.online.rollback.step([{hasAim:true,aimX:0,aimY:1,downHeld:true},{}]);d.stagePresentation.draw();const f=d.fighters[0];return {crouching:f.crouching,speed:f.vx,running:d.groundMovement.running(0)};});assert(stopped.crouching&&!stopped.running);assert.equal(stopped.speed,0);scenes.push({width,key,...result,stopped});
    }
  }
  // A second page exercises the real keyboard/input loop rather than debug steps.
  const live=await browser.newPage({viewport:{width:1280,height:720}});live.on("pageerror",e=>errors.push(e.message));await live.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await live.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  await live.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard-wide",ruleset:"battle"},{characters:["anchor","rain"],ai:false,seed:919});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";d.fighters.forEach((f,i)=>Object.assign(f,{x:i?3400:600,y:d.dashball.arena.floorY-f.data.height/2,onGround:true,vx:0,vy:0,invulnerable:0}));});
  await live.keyboard.down("KeyD");await live.waitForFunction(()=>window.__dashPunchDebug.groundMovement.running(0),null,{timeout:9000});await live.keyboard.up("KeyD");await live.keyboard.down("KeyS");await live.waitForFunction(()=>{const f=window.__dashPunchDebug.fighters[0];return f.crouching&&f.vx===0;});await live.keyboard.up("KeyS");await live.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,scenes,keyboard:true,errors,limitations:"Headless browser and native keyboard events; no physical controller testing."},null,2));console.log(JSON.stringify({passed:true,scenes:scenes.length,keyboard:true,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
