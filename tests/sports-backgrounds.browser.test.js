"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const scenes=[["tri-ball","sports-sky"],["volleyball","sports-sky"],["standard-wide","sports-sky"],["gravity-soccer-open","sports-sky"],["field-goal-wide","sports-sky"],["sticky-ball-flip","sports-temple"],["elevated","sports-hall"],["golden-rush","sports-courtyard"],["target-break","sports-courtyard"],["target-charge-roaming","sports-citadel"]];
(async()=>{let browser;try{
  const out="artifacts/sports-backgrounds";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[],benchmarks=[];
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});
    for(const[arena,theme]of scenes){
      await page.evaluate(async arena=>{
        const d=window.__dashPunchDebug,art=window.DASH_PUNCH_ART;d.dashball.setup({arena,ruleset:"battle",teamSize:5},{characters:["anchor","orbit","rain","spike","boomerangus","reflektor","lancer","gunman","archer","phantom"],ai:true,seed:47});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
        const name=art.sportsScenery[arena],profile=art.stageThemes[name],sources=[art.backdrops[name].src,...profile.layers.flatMap(layer=>layer.sources)];
        await Promise.all([...new Set(sources)].map(async src=>{const image=new Image();image.src=src;await image.decode();}));d.camera.update(1);d.stagePresentation.draw();
      },arena);await page.waitForTimeout(90);
      const sample=await page.evaluate(()=>{
        const d=window.__dashPunchDebug,hash=d.online.rollback.hash(),camera=JSON.stringify(d.camera.state);d.stagePresentation.draw();
        const c=document.querySelector("#game"),pixels=c.getContext("2d").getImageData(0,0,c.width,c.height).data,colors=new Set();let opaque=0;
        for(let i=0;i<pixels.length;i+=256){colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);if(pixels[i+3])opaque++;}
        return {theme:d.stagePresentation.snapshot().profile.id,pure:hash===d.online.rollback.hash(),cameraUnchanged:camera===JSON.stringify(d.camera.state),colors:colors.size,opaque,stats:d.stagePresentation.stats,roster:d.fighters.length};
      });assert.equal(sample.theme,theme);assert(sample.pure&&sample.cameraUnchanged);assert(sample.colors>35);assert.equal(sample.roster,10);
      await page.screenshot({path:`${out}/${arena}-${width}.png`});results.push({arena,width,...sample});
    }
  }
  for(const quality of["classic","enhanced"]){
    const sample=await page.evaluate(quality=>{
      const d=window.__dashPunchDebug;d.stagePresentation.setQuality(quality);d.dashball.setup({arena:"golden-rush",teamSize:5,ruleset:"battle",ballCount:10},{characters:["gunman","archer","spike","orbit","boomerangus","reflektor","rain","lancer","anchor","phantom"],ai:true,seed:47});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
      const rows=[];for(let i=0;i<160;i++){const start=performance.now();d.dashball.step();const simulated=performance.now();d.stagePresentation.draw();const drawn=performance.now();if(i>=40)rows.push({frame:i,step:simulated-start,draw:drawn-simulated,total:drawn-start});}
      const times=rows.map(r=>r.total).sort((a,b)=>a-b),drawTimes=rows.map(r=>r.draw).sort((a,b)=>a-b),slowest=[...rows].sort((a,b)=>b.total-a.total).slice(0,3);
      return {quality,median:times[60],p95:times[114],maximum:times.at(-1),drawP95:drawTimes[114],slowest,stats:d.stagePresentation.stats,balls:1+(d.dashball.state.extraBalls?.length||0)};
    },quality);assert(sample.stats.entries<=4);assert.equal(sample.balls,10);benchmarks.push(sample);
  }
  // Optional missing-image fallback must keep the match renderable without changing gameplay.
  const missing=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.stagePresentation.setQuality("enhanced");d.dashball.setup({arena:"elevated"},{characters:["anchor","spike"]});window.DASH_PUNCH_ART.stageThemes["sports-hall"].layers[0].sources=["assets/stages/sports/missing.png"];const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash(),stats:d.stagePresentation.stats};});assert(missing.pure);
  // A file:// fixture exercises the exact runtime renderer and packaged data-URI artwork,
  // without running a release build or changing the frozen ZIP.
  const artContext={window:{}};vm.runInNewContext(fs.readFileSync("presentation-assets.js","utf8"),artContext);const art=artContext.window.DASH_PUNCH_ART;
  const profiles=Object.fromEntries(Object.entries(art.stageThemes).filter(([name])=>name.startsWith("sports-"))),images={};for(const p of Object.values(profiles))for(const layer of p.layers)for(const file of layer.sources)images[file]="data:image/png;base64,"+fs.readFileSync(file).toString("base64");
  const fixture=path.resolve(`${out}/offline.html`),script=fs.readFileSync("stage-renderer.js","utf8");
  fs.writeFileSync(fixture,`<!doctype html><meta charset="utf-8"><canvas width="960" height="540" id="scene"></canvas><script>${script}</script><script>
    (async()=>{const profiles=${JSON.stringify(profiles)},sources=${JSON.stringify(images)},images={};await Promise.all(Object.entries(sources).map(async([key,src])=>{const image=new Image();image.src=src;await image.decode();images[key]=image;}));
    const renderer=window.DashStageRenderer.create({getImage:key=>images[key]}),c=document.querySelector('canvas'),paint=c.getContext('2d'),samples=[];
    for(const profile of Object.values(profiles))for(const quality of ['classic','enhanced'])for(const time of [0,90,1e6]){paint.clearRect(0,0,c.width,c.height);if(!renderer.draw(paint,{profile,quality,time,view:{x:0,y:0,w:960,h:540},focus:{x:1,y:-1},camera:{x:1e6,y:1e6}}))throw Error('Missing offline '+profile.id);
      const rgba=paint.getImageData(0,0,c.width,c.height).data;let transparent=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]!==255)transparent++;samples.push({id:profile.id,quality,time,transparent});}
    window.offlineResult={samples,stats:renderer.stats};})().catch(e=>window.offlineError=e.stack);
  </script>`);
  const offline=await browser.newPage({viewport:{width:1280,height:720}}),network=[];offline.on("request",r=>{if(/^https?:/.test(r.url()))network.push(r.url());});offline.on("pageerror",e=>errors.push(e.message));await offline.goto(pathToFileURL(fixture).href);
  await offline.waitForFunction(()=>window.offlineResult||window.offlineError);const offlineResult=await offline.evaluate(()=>({result:window.offlineResult,error:window.offlineError}));assert(!offlineResult.error,offlineResult.error);assert(offlineResult.result.samples.every(s=>s.transparent===0));assert.equal(offlineResult.result.stats.filterPasses,0);assert.deepEqual(network,[]);
  await offline.screenshot({path:`${out}/offline.png`});await offline.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,results,benchmarks,offline:offlineResult.result,network,missing,errors,limitations:"Headless simulation/render microbenchmark, not TV hardware or physical controllers. An earlier first-use mixed run observed one 214ms spike, not reproduced after a longer warm-up; its cause was not isolated. No release ZIP built; offline coverage here is the background renderer fixture."},null,2));console.log(JSON.stringify({passed:true,scenes:results.length,benchmarks,offlineSamples:offlineResult.result.samples.length,network,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
