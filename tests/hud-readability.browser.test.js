"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const keys=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"];
(async()=>{let browser;try{
  fs.mkdirSync("artifacts/hud-readability",{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],masks=[],scenes=[];
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  for(const key of keys){
    const samples=await page.evaluate(async key=>{
      const d=window.__dashPunchDebug;d.online.rollback.setup({characterKeys:[key,"anchor"],seed:44});
      const asset=window.DASH_PUNCH_ART.spriteSets[d.fighters[0].data.spriteSet],results=[];
      const load=async src=>{const image=new Image();image.src=src;await image.decode();return image;};
      for(const name of["idle","walk","attack1","hurt"]){
        const clip=asset.clips[name];if(!clip)continue;await load(clip.src||clip.sources[0]);
        let frame=d.hudReadability.criticalArt(0,name);for(let n=0;!frame&&n<10;n++){await new Promise(r=>setTimeout(r,20));frame=d.hudReadability.criticalArt(0,name);}if(!frame)throw Error(`Missing ${key}/${name}`);
        const [original,tinted]=await Promise.all([load(frame.source),load(frame.src)]),c=document.createElement("canvas");c.width=frame.width;c.height=frame.height;const p=c.getContext("2d");p.imageSmoothingEnabled=false;
        p.drawImage(original,frame.sx,frame.sy,frame.sw,frame.sh,0,0,c.width,c.height);const before=p.getImageData(0,0,c.width,c.height).data;
        p.clearRect(0,0,c.width,c.height);p.drawImage(tinted,0,0);const after=p.getImageData(0,0,c.width,c.height).data;let alphaDelta=0,changed=0,opaque=0;const colors=new Set();
        for(let i=0;i<before.length;i+=4){alphaDelta=Math.max(alphaDelta,Math.abs(before[i+3]-after[i+3]));if(after[i+3]){opaque++;colors.add(`${after[i]},${after[i+1]},${after[i+2]}`);if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2])changed++;}}
        results.push({name,width:c.width,height:c.height,alphaDelta,changed,opaque,colors:colors.size});
      }
      return results;
    },key);for(const sample of samples){assert(sample.alphaDelta<=1,`${key}/${sample.name} alpha ${sample.alphaDelta}`);assert(sample.changed>0);assert(sample.colors>1);}masks.push({key,samples});
  }
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});
    for(const [name,characters,critical]of[["themes-a",keys.slice(0,10),false],["themes-b",keys.slice(10),false],["critical",keys.slice(0,10),true],["identical",Array(10).fill("rain"),false]]){
      await page.evaluate(({characters,critical})=>{
        const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle",teamSize:5},{characters,seed:44});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
        const floor=d.dashball.arena.floorY;
        d.fighters.forEach((f,i)=>{Object.assign(f,{x:550+i*150,y:floor-f.data.height/2,onGround:true,invulnerable:0,flash:0,health:d.compactHud.player(i).maximum*(critical?.2:1),airDashes:i%Math.max(1,f.data.maxAirDashes),escapeAvailable:i%3!==0,punchParryAvailable:i%3!==0});});
        d.presentationEffects.step(1/60);d.advancePlatforms(.1-d.online.rollback.save().core.stageTime);d.camera.update(1);d.stagePresentation.draw();d.matchFlow.hud();
      },{characters,critical});await page.waitForTimeout(200);
      const sample=await page.evaluate(()=>{
        const d=window.__dashPunchDebug,hash=d.online.rollback.hash(),camera=JSON.stringify(d.camera.state);d.stagePresentation.draw();const dash=d.fighters.map((_,i)=>d.hudReadability.dash(i));
        return {pure:hash===d.online.rollback.hash(),cameraUnchanged:camera===JSON.stringify(d.camera.state),dash,cache:d.hudReadability.cache,layout:d.compactHud.layout()};
      });assert(sample.pure&&sample.cameraUnchanged);assert.equal(sample.layout.height,58);assert(sample.dash.every(v=>v.rows<=2));await page.screenshot({path:`artifacts/hud-readability/${name}-${width}.png`});scenes.push({name,width,...sample});
    }
    await page.evaluate(()=>{
      const d=window.__dashPunchDebug;d.dashball.standard();d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Flat"),characterKeys:["phantom","rain"],seed:44});d.matchFlow.begin({countdown:false});
      d.fighters.forEach((f,i)=>Object.assign(f,{x:500+i*200,y:390,onGround:false,invulnerable:0,flash:0,health:d.compactHud.player(i).maximum*.2,escapeAvailable:false,punchParryAvailable:false}));d.gravity.dash(0,{x:1,y:0},0);d.advancePlatforms(.1-d.online.rollback.save().core.stageTime);d.stagePresentation.draw();
    });await page.waitForTimeout(200);
    const phantom=await page.evaluate(()=>{const d=window.__dashPunchDebug,hash=d.online.rollback.hash();d.stagePresentation.draw();return {ghost:d.phantom.ghost(0),alpha:d.phantom.alpha(0),critical:d.hudReadability.critical(0),pure:hash===d.online.rollback.hash()};});assert(phantom.ghost&&phantom.alpha<=.45&&phantom.critical&&phantom.pure);await page.screenshot({path:`artifacts/hud-readability/phantom-${width}.png`});
  }
  const aim=await page.evaluate(()=>{
    const d=window.__dashPunchDebug;d.dashball.standard();d.online.rollback.setup({stageIndex:d.stageNames.indexOf("Flat"),characterKeys:["anchor","whipado"],seed:44});d.matchFlow.begin({countdown:false});d.fighters.forEach((f,i)=>Object.assign(f,{x:460+i*300,y:400,onGround:false,chargingPunch:true,punchAim:{x:Math.SQRT1_2,y:-Math.SQRT1_2},punchCharge:.2,flash:0,invulnerable:0,escapeAvailable:false,punchParryAvailable:false}));
    const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash(),colors:d.fighters.map((f,i)=>d.hudReadability.outline(i,f.punchAim,.5).color)};
  });assert(aim.pure);assert.equal(new Set(aim.colors).size,1);await page.screenshot({path:"artifacts/hud-readability/gray-aim.png"});
  const performanceSample=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",teamSize:5},{characters:["rain"],seed:44});d.fighters.forEach(f=>{f.health=1;f.invulnerable=0;});d.advancePlatforms(.1-d.online.rollback.save().core.stageTime);const times=[];for(let n=0;n<40;n++){const start=performance.now();d.stagePresentation.draw();times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {median:times[20],p95:times[38],cache:d.hudReadability.cache};});
  assert(performanceSample.cache.criticalFrames<=96&&performanceSample.cache.criticalPixels<=800000);assert.deepEqual(errors,[]);fs.writeFileSync("artifacts/hud-readability/results.json",JSON.stringify({passed:true,masks,scenes,aim,performanceSample,errors,benchmark:"Headless render-only microbenchmark, not physical controller or live 5v5 certification."},null,2));console.log(JSON.stringify({passed:true,characters:masks.length,masks:masks.reduce((n,c)=>n+c.samples.length,0),scenes:scenes.length+3,performanceSample,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
