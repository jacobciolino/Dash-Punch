"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  fs.mkdirSync("artifacts/shield-presentation",{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[];
  for(const width of[1280,1920]){
    const page=await browser.newPage({viewport:{width,height:width*9/16}});page.on("pageerror",e=>errors.push(e.message));
    const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
    await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
    for(const key of["anchor","spike","reflektor"]){
      await page.evaluate(key=>{
        const d=window.__dashPunchDebug;d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Flat"),characterKeys:["anchor",key],seed:44});d.matchFlow.begin({countdown:false});
        d.fighters.forEach((f,i)=>Object.assign(f,{x:500+i*90,y:400,prevX:500+i*90,prevY:400,onGround:false,invulnerable:0,vx:0,vy:0}));
        Object.assign(d.fighters[1],{chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchReleaseQueued:false,punchAim:{x:-1,y:0},shieldActiveTime:.3});d.camera.update(1);d.stagePresentation.draw();
      },key);await page.waitForTimeout(250);
      for(const state of["held","block","break"]){
        const sample=await page.evaluate(state=>{
          const d=window.__dashPunchDebug,t=d.fighters[1];
          if(state!=="held"){
            Object.assign(t,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchReleaseQueued:false,punchAim:{x:-1,y:0},shieldActiveTime:.4,hitstun:0,hitstop:0,juked:0,shieldDashLockout:false,shieldReactivationTimer:0});
            if(state==="break")t.shieldHealth=1;d.booster.punch(0,.6,{x:1,y:0});d.fighters[0].attack.age=d.fighters[0].attack.startup+.001;d.resolveHit(0,1);d.presentationEffects.step(1/60);
          }
          const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash(),effects:d.presentationEffects.shields.length,broken:t.stunType==="shieldBreak",geometry:d.shieldPresentation.geometry(1)};
        },state);assert(sample.pure);if(state!=="held")assert(sample.effects>0);if(state==="break")assert(sample.broken);
        await page.screenshot({path:`artifacts/shield-presentation/${key}-${state}-${width}.png`});results.push({width,key,state,...sample});
      }
    }
    const sample=await page.evaluate(()=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle",teamSize:5},{characters:["spike","reflektor"],ai:false,seed:44});
      for(const f of d.fighters)Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchReleaseQueued:false,punchAim:{x:1,y:0},shieldActiveTime:.5});
      const times=[];for(let i=0;i<40;i++){const start=performance.now();d.stagePresentation.draw();times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {median:times[20],p95:times[38],fighters:d.fighters.length};
    });assert.equal(sample.fighters,10);results.push({width,tenShieldRender:sample});await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync("artifacts/shield-presentation/results.json",JSON.stringify({passed:true,results,errors,benchmark:"Headless rendering microbenchmark; no physical-controller or human visual-mix certification."},null,2));console.log(JSON.stringify({passed:true,scenes:results.length,performance:results.filter(r=>r.tenShieldRender),errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
