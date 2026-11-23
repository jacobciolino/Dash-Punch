"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/shield-audio";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[],source=fs.readFileSync(path.join(root,"game.js"),"utf8");
  for(const kind of ["normal","spike","normal-ball","spike-ball","offline"]){const p=await browser.newPage();p.on("pageerror",e=>errors.push(e.stack));await p.route("**/game.js",route=>route.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;")}));
    await p.goto(kind==="offline"?pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1":`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
    const result=await p.evaluate(async kind=>{const d=window.__dashPunchDebug,key=kind.startsWith("spike")||kind==="offline"?"spike":"orbit",ball=kind.endsWith("ball");
      if(ball)d.dashball.setup({arena:"standard",ruleset:"battle"},{characters:["anchor",key],seed:835});else d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Crosswire"),characterKeys:["anchor",key],seed:835});
      d.fighters.forEach((f,i)=>Object.assign(f,{x:430+i*50,y:300,prevX:430+i*50,prevY:300,onGround:false,vx:0,vy:0,invulnerable:0}));const [a,b]=d.fighters;Object.assign(b,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0},punchCharge:0,shieldHealth:10000});
      window.AudioContext=class extends OfflineAudioContext{constructor(){super(1,22050,44100);window.audioProbe=this;}};
      if(ball){a.x=a.prevX=200;b.x=b.prevX=700;Object.assign(d.dashball.state.ball,{x:665,y:300,prevX:665,prevY:300,vx:1400,vy:0,contacts:{},ownerId:a.id,ownerTeam:a.team,launched:2});d.dashball.ballStep();}
      else{a.attack={id:999,age:.1,startup:0,active:.2,recovery:.2,total:.4,dir:{x:1,y:0},charge:0,hitTargets:new Set(),grounded:false};d.resolveHit(0,1);}
      if(!window.audioProbe)throw Error("No shield sound graph");const hash=d.online.rollback.hash(),buffer=await window.audioProbe.startRendering(),data=buffer.getChannelData(0);let peak=0,sum=0,last=0;
      for(let i=0;i<data.length;i++){if(!Number.isFinite(data[i]))throw Error("Non-finite audio");peak=Math.max(peak,Math.abs(data[i]));sum+=data[i]*data[i];if(Math.abs(data[i])>.00005)last=i;}
      return {kind,key,peak,rms:Math.sqrt(sum/data.length),lastSound:last/44100,pure:hash===d.online.rollback.hash(),captured:ball&&d.dashball.state.ball.carrier===b.id};
    },kind);assert(result.peak>.005&&result.peak<1);assert(result.rms>.001);assert(result.pure);if(kind==="spike-ball")assert(result.captured);results.push(result);await p.close();
  }
  assert(results.find(r=>r.kind==="spike").lastSound>results.find(r=>r.kind==="normal").lastSound+.03);assert.deepEqual(errors,[]);
  const report={passed:true,root,results,actualWebAudioDSP:true,offline:true,physicalPlaybackTested:false,errors};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
