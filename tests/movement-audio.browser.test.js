"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/movement-audio";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[];
  for(const kind of["tap","charged","full","charge-ready","super-jump","whiff","offline"]){const p=await browser.newPage();p.on("pageerror",e=>errors.push(e.stack));const source=fs.readFileSync(path.join(root,"game.js"),"utf8");await p.route("**/game.js",async route=>{await route.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;")});});
    await p.goto(kind==="offline"?pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1":`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
    const result=await p.evaluate(async kind=>{const d=window.__dashPunchDebug;d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Crosswire"),characterKeys:["orbit","spike"],seed:211});const f=d.fighters[0];Object.assign(f,{x:300,y:500,prevX:300,prevY:500,onGround:true,vx:0,vy:0,invulnerable:0});
      window.AudioContext=class extends OfflineAudioContext{constructor(){super(1,22050,44100);window.audioProbe=this;}};
      if(kind==="whiff"){
        Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});for(const held of[true,false]){f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.1;d.updateHumanInput(0);}d.updateAttack(0,f.attack.startup+f.attack.active+.001);
      }else if(kind==="charge-ready"){
        Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.dashHeld=true;f.controls.buffers.dashPressed=.1;d.updateHumanInput(0);f.chargingDash=f.dashPending=true;f.dashCharge=f.data.dashChargeTime-.005;d.updateHumanInput(0);
      }else{const charge=kind==="full"?1:kind==="charged"||kind==="super-jump"?.5:0,dir=kind==="super-jump"?{x:0,y:-1}:{x:1,y:0};if(kind==="super-jump")Object.assign(f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:dir});d.gravity.dash(0,dir,charge*f.data.dashChargeTime);}
      if(!window.audioProbe)throw Error("No audio graph");const before=d.online.rollback.hash(),buffer=await window.audioProbe.startRendering(),data=buffer.getChannelData(0);let peak=0,sum=0,last=0;for(let i=0;i<data.length;i++){if(!Number.isFinite(data[i]))throw Error("Non-finite audio");peak=Math.max(peak,Math.abs(data[i]));sum+=data[i]*data[i];if(Math.abs(data[i])>.00005)last=i;}
      return {kind,peak,rms:Math.sqrt(sum/data.length),lastSound:last/44100,samples:data.length,pure:before===d.online.rollback.hash()};
    },kind);assert(result.peak>.001&&result.peak<1);assert(result.rms>.0001);assert(result.pure);results.push(result);await p.close();
  }
  const durations=results.filter(r=>["tap","charged","full"].includes(r.kind)).map(r=>r.lastSound);assert(durations[0]<durations[1]&&durations[1]<durations[2]);assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({passed:true,root,results,errors,actualWebAudioDSP:true,physicalPlaybackTested:false},null,2));console.log(JSON.stringify({passed:true,results,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
