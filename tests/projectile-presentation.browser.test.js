"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  fs.mkdirSync("artifacts/projectile-presentation",{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[];
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;").replace("drawDebugHitboxes();","");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  for(const key of["gunman","archer","boomerangus"]){
    await page.evaluate(key=>{
      const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:d.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:44});d.matchFlow.begin({countdown:false});
      d.fighters.forEach((f,i)=>Object.assign(f,{x:350+i*700,y:540,onGround:false,invulnerable:0}));d.booster.punch(0,.5,{x:1,y:0});d.updateAttack(0,d.fighters[0].attack.startup+.001);
      for(let n=0;n<5;n++){d.updateProjectiles(1/60);d.presentationEffects.step(1/60);}d.camera.update(1);d.stagePresentation.draw();
    },key);await page.waitForTimeout(350);
    const sample=await page.evaluate(async key=>{
      const d=window.__dashPunchDebug,rb=d.online.rollback,shot=d.fighters[0].projectiles[0]?.projectile;
      for(let n=0;n<8;n++){d.advancePlatforms(.051);d.stagePresentation.draw();}
      const hash=rb.hash();d.stagePresentation.draw();const before=d.projectileVisuals.cache;
      for(let n=0;n<30;n++)d.stagePresentation.draw();const after=d.projectileVisuals.cache,canvas=document.querySelector("#game"),frame=canvas.toDataURL();
      let alpha=null;
      if(key!=="boomerangus"){
        const set=window.DASH_PUNCH_ART.spriteSets[key==="gunman"?"seekerprogun":"seekerproarcher"],sprite=set.spellProjectile||set.arrowSprite,image=new Image();image.src=sprite.src;await image.decode();
        const c=document.createElement("canvas");c.width=sprite.width;c.height=sprite.height;const p=c.getContext("2d");p.drawImage(image,0,0);const pixels=p.getImageData(0,0,c.width,c.height).data;let opaque=0;for(let n=3;n<pixels.length;n+=4)if(pixels[n])opaque++;alpha={opaque,total:c.width*c.height,corner:pixels[3]};
      }
      return {key,pure:hash===rb.hash(),before,after,trail:d.projectileVisuals.trails.length,shadow:shot?.boomerang?d.projectileVisuals.shadow(shot):null,alpha,frame};
    },key);assert(sample.pure);assert.equal(sample.after.builds,sample.before.builds);assert(sample.after.entries<=24);
    if(key!=="boomerangus"){assert(sample.trail>0);assert.equal(sample.alpha.corner,0);assert(sample.alpha.opaque<sample.alpha.total*.7);}else assert(sample.shadow);
    fs.writeFileSync(`artifacts/projectile-presentation/${key}.png`,Buffer.from(sample.frame.split(",")[1],"base64"));delete sample.frame;results.push(sample);
  }
  const performance=await page.evaluate(async()=>{
    const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",ruleset:"battle",teamSize:5},{characters:["gunman","archer"],ai:false,seed:44});d.matchFlow.begin({countdown:false});d.dashball.state.phase="playing";
    d.fighters.forEach((f,i)=>{Object.assign(f,{x:140+i*230,y:1000,onGround:false,invulnerable:0});d.booster.punch(i,.3,{x:i%2?-1:1,y:-.7});d.updateAttack(i,f.attack.startup+.001);});
    d.camera.update(1);d.stagePresentation.draw();await new Promise(r=>setTimeout(r,200));
    const times=[];let peak=0;for(let n=0;n<30;n++){const start=performance.now();d.updateProjectiles(1/60);d.presentationEffects.step(1/60);d.stagePresentation.draw();times.push(performance.now()-start);peak=Math.max(peak,d.projectileVisuals.trails.length);}
    times.sort((a,b)=>a-b);return {fighters:d.fighters.length,peakFragments:peak,cache:d.projectileVisuals.cache,median:times[15],p95:times[28],limit:d.projectileVisuals.limit};
  });assert.equal(performance.fighters,10);assert(performance.peakFragments>20&&performance.peakFragments<=192);assert(performance.cache.entries<=24);
  assert.deepEqual(errors,[]);fs.writeFileSync("artifacts/projectile-presentation/results.json",JSON.stringify({passed:true,results,performance,errors,benchmark:"Headless software-rendered update/draw microbenchmark, not a live hardware frame-rate guarantee."},null,2));console.log(JSON.stringify({passed:true,results,performance,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
