"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/timer-audio";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[],source=fs.readFileSync(path.join(root,"game.js"),"utf8");
  for(const kind of ["tick","urgent","buzzer","basketball","sandbag","offline"]){const p=await browser.newPage();p.on("pageerror",e=>errors.push(e.stack));await p.route("**/game.js",route=>route.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;")}));
    await p.goto(kind==="offline"?pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1":`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
    const result=await p.evaluate(async kind=>{const d=window.__dashPunchDebug;if(kind==="basketball")d.dashball.setup({arena:"elevated",ruleset:"battle"});else if(kind==="sandbag")d.sandbag.setup({ruleset:"scramble"});else d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Crosswire"),characterKeys:["orbit","spike"],seed:140});
      d.matchFlow.begin({seconds:12,countdown:false});d.matchFlow.state.remainingTicks=kind==="tick"?601:kind==="urgent"?181:1;
      window.AudioContext=class extends OfflineAudioContext{constructor(){super(1,44100,44100);window.audioProbe=this;}};
      d.online.rollback.presentStep(d.fighters.map(()=>window.DashRollback.decode(window.DashRollback.neutral())));
      if(!window.audioProbe)throw Error("No timer sound graph");const hash=d.online.rollback.hash(),buffer=await window.audioProbe.startRendering(),data=buffer.getChannelData(0);let peak=0,sum=0,last=0;
      for(let i=0;i<data.length;i++){if(!Number.isFinite(data[i]))throw Error("Non-finite timer audio");peak=Math.max(peak,Math.abs(data[i]));sum+=data[i]*data[i];if(Math.abs(data[i])>.00005)last=i;}
      return {kind,remainingTicks:d.matchFlow.state.remainingTicks,peak,rms:Math.sqrt(sum/data.length),lastSound:last/44100,pure:hash===d.online.rollback.hash()};
    },kind);assert(result.peak>.005&&result.peak<1);assert(result.rms>.001);assert(result.pure);assert.equal(result.remainingTicks,kind==="tick"?600:kind==="urgent"?180:0);results.push(result);await p.close();
  }
  assert(results.find(r=>r.kind==="urgent").lastSound>results.find(r=>r.kind==="tick").lastSound+.015);assert(results.find(r=>r.kind==="buzzer").lastSound>.5);assert.deepEqual(errors,[]);
  const report={passed:true,root,results,actualWebAudioDSP:true,offline:true,physicalPlaybackTested:false,errors};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
