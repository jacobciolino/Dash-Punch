"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require(path.join(process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),"server.js"));
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome"});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[],orcRequests=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)bad.push(r.url());});page.on("request",r=>{if(r.url().includes("orc-arena"))orcRequests.push(r.url());});
    fs.mkdirSync("artifacts/sports-polish",{recursive:true});
    await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);const click=name=>page.getByRole("button",{name,exact:true}).click();
    await click("Play");await click("Dashball");
    assert.match(await page.locator(".settings-grid").innerText(),/50%/);assert.match(await page.locator(".settings-grid").innerText(),/15s/);
    await page.locator('[data-menu-action="dashballRespawnUp"]').click();assert.match(await page.locator(".settings-grid").innerText(),/20s/);await page.locator('[data-menu-action="dashballRespawnDown"]').click();await page.locator('[data-menu-action="dashballRespawnDown"]').click();assert.match(await page.locator(".settings-grid").innerText(),/10s/);
    const audio=await page.evaluate(async()=>{
      const calls=[],original=window.DashSportsAudio.play;window.DashSportsAudio.play=(...args)=>{calls.push(args[0]);return original(...args);};
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard"},{characters:["edgebert","orbit"]});d.dashball.step();
      const f=d.fighters[0];Object.assign(f,{x:800,y:1000,prevX:800,prevY:1000});f.attack={id:999,sequenceStage:0,age:.1,startup:0,active:.3,recovery:.1,total:.5,charge:0,dir:{x:1,y:0},hitTargets:new Set()};
      const box=d.getPunchHitbox(0,{x:1,y:0},0);Object.assign(d.dashball.state.ball,{x:box.cx,y:box.cy,vx:0,vy:0});d.dashball.ballStep();
      const s=d.dashball.state,g=d.dashball.arena.goals[1];Object.assign(s.ball,{x:g.line-60,y:g.bottom-150,vx:1200,vy:0});for(let i=0;i<15;i++)d.dashball.ballStep();
      const context=new AudioContext();await context.resume();await window.DashSportsAudio.prepare(context);const sample=window.DashSportsAudio.play("soccerKick",context,.7);await context.close();
      return {calls,scores:[...s.scores],sample};
    });assert(audio.calls.includes("soccerStart")&&audio.calls.includes("soccerKick")&&audio.calls.includes("soccerGoal"));assert.equal(audio.scores[0],1);assert(audio.sample);
    await page.evaluate(()=>{document.body.classList.remove("menu-active");document.querySelector("#menuLayer").hidden=true;});
    const plainCourts=[];
    for(const arena of ["elevated","target-break","golden-rush"]){
      await page.evaluate(arena=>window.__dashPunchDebug.dashball.setup({arena},{characters:["edgebert","chungus"]}),arena);await page.waitForTimeout(450);
      await page.evaluate(()=>{const d=window.__dashPunchDebug,h=d.online.rollback.hash();d.stagePresentation.draw();if(h!==d.online.rollback.hash())throw Error("Render mutated simulation");});
      if(arena!=="elevated")plainCourts.push(await page.evaluate(()=>{
        const d=window.__dashPunchDebug;d.stagePresentation.setQuality("enhanced");d.stagePresentation.draw();
        if(d.stagePresentation.snapshot().profile)throw Error("Sports court still has an environment profile");
        const canvas=document.querySelector("#game"),pixels=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
        let neutral=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]===34&&pixels[i+1]===44&&pixels[i+2]===50&&pixels[i+3]===255)neutral++;
        if(neutral<canvas.width*canvas.height*.3)throw Error("Plain sports background did not render");
        return {arena:d.dashball.state.config.arena,neutralPixels:neutral};
      }));
      await page.locator("#game").screenshot({path:`artifacts/sports-polish/browser-${arena}.png`});
    }
    await page.evaluate(()=>{const d=window.__dashPunchDebug;d.sandbag.setup({ruleset:"scramble"},{characters:["chungus","anchor"]});});
    let armDraws=0;
    for(const sign of [1,-1]){
      const draws=await page.evaluate(sign=>{const d=window.__dashPunchDebug,f=d.fighters[0];Object.assign(f,{x:sign===1?650:1700,y:600,prevX:sign===1?650:1700,prevY:600,onGround:false,vx:0,vy:0,face:{x:sign,y:0}});f.attack={id:500,age:1,startup:0,active:5,recovery:.5,total:5.5,charge:1,dir:{x:sign,y:0},hitTargets:new Set()};let count=0;const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;proto.drawImage=function(image,...args){if(image.src?.includes("chungus-arm"))count++;return draw.call(this,image,...args);};d.stagePresentation.draw();proto.drawImage=draw;return count;},sign);
      await page.waitForTimeout(120);armDraws+=draws;await page.locator("#game").screenshot({path:`artifacts/sports-polish/browser-chungus-${sign}.png`});
    }
    assert(armDraws>4);
    let performanceResult=null;
    if(process.env.SPORTS_BENCHMARK!=="0"){
      await page.evaluate(()=>window.__dashPunchDebug.dashball.setup({arena:"golden-rush",teamSize:5},{ai:true,characters:["orbit","spike","rain","chungus","anchor","whipado","archer","gunman","microusb","edgebert"]}));await page.waitForTimeout(3000);
      performanceResult=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({players:d.fighters.length,median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,scores:[...d.dashball.state.scores],finite:d.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)),cache:d.stagePresentation.stats});}requestAnimationFrame(tick);}));assert.equal(performanceResult.players,10);assert(performanceResult.finite);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(orcRequests,[]);const result={tests:"passed",battleSettings:true,audio,armDraws,plainCourts,orcRequests,performanceResult,errors};fs.writeFileSync("artifacts/sports-polish/browser-results.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
