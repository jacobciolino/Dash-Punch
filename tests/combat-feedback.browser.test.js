"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server"),{instrument}=require("./feedback-harness"),out="artifacts/combat-feedback";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],audio=[],visual=[];
  const source=instrument(fs.readFileSync("game.js","utf8")).replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  async function page(viewport={width:1280,height:720}){
    const p=await browser.newPage({viewport});p.on("pageerror",e=>errors.push(e.message));
    await p.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));
    await p.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");return p;
  }
  for(const kind of["anchor","chungus","rain","orbit","kite","edgebert","gunman","archer","spike","whipado","microusb","defiplate","reverso","booster","lamer","phantom","reflektor","lancer","boomerangus","superJump","firedUpClash","ko","simultaneous"]){
    const p=await page();const sample=await p.evaluate(async kind=>{
      const d=window.__dashPunchDebug,key=["superJump","firedUpClash","ko","simultaneous"].includes(kind)?"anchor":kind;
      d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:44});const f=d.fighters[0];Object.assign(f,{x:400,y:450,onGround:true,invulnerable:0});
      window.AudioContext=class extends OfflineAudioContext{constructor(){super(1,44100,44100);window.audioProbe=this;}};
      if(kind==="superJump"){Object.assign(f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true});d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);}
      else if(kind==="ko")d.matchFlow.knockout(0);
      else if(kind==="firedUpClash")d.combatAudio.play("firedUpClash");
      else if(kind==="simultaneous")for(let i=0;i<10;i++)for(const name of["ko","firedUpClash","superJump"])d.combatAudio.play(name,0,{upwardSpeed:2300});
      else{d.booster.punch(0,.4,{x:1,y:0});for(let n=0;n<40;n++)d.updateAttack(0,1/60);}
      const hash=d.online.rollback.hash(),buffer=await window.audioProbe.startRendering(),data=buffer.getChannelData(0);let peak=0,sum=0,last=0;
      for(let n=0;n<data.length;n++){if(!Number.isFinite(data[n]))throw Error("non-finite audio");peak=Math.max(peak,Math.abs(data[n]));sum+=data[n]*data[n];if(Math.abs(data[n])>.00005)last=n;}
      return {kind,peak,rms:Math.sqrt(sum/data.length),lastSound:last/44100,events:window.__audioEvents,pure:hash===d.online.rollback.hash()};
    },kind);
    assert(sample.peak>.001&&sample.peak<.95,`${kind} peak ${sample.peak}`);assert(sample.rms>.0001,kind);assert(sample.pure,kind);
    if(kind==="edgebert")assert.equal(sample.events.filter(e=>e.name==="punchSwing").length,3);
    if(kind==="simultaneous")assert.equal(sample.events.length,30);audio.push(sample);await p.close();
  }
  for(const width of[1280,1920]){
    const p=await page({width,height:width*9/16});await p.waitForTimeout(500);
    await p.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle"},{characters:["anchor","rain"],seed:44});d.stagePresentation.draw();});
    await p.waitForTimeout(400);
    const sample=await p.evaluate(()=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle"},{characters:["anchor","rain"],seed:44});
      const s=d.dashball.state;s.phase="playing";const floor=d.dashball.arena.floorY;
      d.fighters.forEach((f,i)=>Object.assign(f,{x:850+i*400,y:floor-f.data.height/2,onGround:true,invulnerable:0}));
      d.camera.update(1);d.stagePresentation.draw();const canvas=document.querySelector("#game"),paint=canvas.getContext("2d"),before=paint.getImageData(0,0,canvas.width,canvas.height).data;
      d.matchFlow.knockout(1);d.gravity.dash(0,{x:1,y:0},0);d.presentationEffects.step(.12);
      const hash=d.online.rollback.hash();d.stagePresentation.draw();const after=paint.getImageData(0,0,canvas.width,canvas.height).data;let changed=0;for(let n=0;n<after.length;n+=4)if(after[n]!==before[n]||after[n+1]!==before[n+1]||after[n+2]!==before[n+2])changed++;
      return {width:innerWidth,changed,pure:hash===d.online.rollback.hash(),effects:d.presentationEffects.feedback,marker:d.sportsPresentation.marker(1),image:canvas.toDataURL()};
    });assert(sample.changed>50);assert(sample.pure);assert(sample.effects.some(p=>p.feedback==="ko"));assert(sample.marker);
    fs.writeFileSync(`${out}/ko-ground-${width}.png`,Buffer.from(sample.image.split(",")[1],"base64"));delete sample.image;visual.push(sample);
    const burst=await p.evaluate(()=>{
      const d=window.__dashPunchDebug;d.arena.setup("Enchanted Forest",{characters:["anchor"],ai:false});
      const start=performance.now();for(let repeat=0;repeat<10;repeat++)for(let i=0;i<10;i++){
        const f=d.fighters[i];Object.assign(f,{onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true});d.gravity.dash(i,{x:0,y:-1},f.data.dashChargeTime);
      }
      const emitted=performance.now()-start,frames=[];for(let n=0;n<30;n++){const start=performance.now();d.presentationEffects.step(1/60);d.stagePresentation.draw();frames.push(performance.now()-start);}
      frames.sort((a,b)=>a-b);return {emitted,remaining:d.presentationEffects.feedback.length,median:frames[15],p95:frames[28]};
    });assert.equal(burst.remaining,0);
    visual.at(-1).tenPlayerBurst=burst;await p.close();
  }
  assert.deepEqual(errors,[]);const report={passed:true,audio,visual,errors,actualWebAudioDSP:true,physicalPlaybackTested:false,benchmark:"Headless software-rendered presentation microbenchmark, not real-time controller/hardware certification."};
  fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,audio:audio.map(({kind,peak,rms})=>({kind,peak,rms})),visual:visual.map(({width,changed,tenPlayerBurst})=>({width,changed,tenPlayerBurst})),errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
