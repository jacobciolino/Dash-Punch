"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome"});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())
    .replace("  function frame(now) {","  function frame(now) { if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}")
    .replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  const click=name=>page.getByRole("button",{name,exact:true}).click();
  await click("Play");assert.equal(await page.getByRole("button",{name:"Showcase",exact:true}).count(),0);
  await click("Dashball");assert.match(await page.locator(".settings-grid").innerText(),/Battle/);
  await page.evaluate(()=>{window.filmFreeze=true;});
  await page.evaluate(async()=>{
    for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips)){
      if(clip.image?.decode)await clip.image.decode();
    }
    for(const src of ["assets/dashball/rush-ball.png","assets/dashball/golden-rush.png","assets/sandbag/conditions.png"]){const image=new Image();image.src=src;await image.decode();}
    document.body.classList.remove("menu-active");document.querySelector("#menuLayer").hidden=true;
    const d=window.__dashPunchDebug;d.dashball.setup({arena:"golden-rush",teamSize:5},{ai:false});d.camera.update(1);d.stagePresentation.draw();
  });
  fs.mkdirSync("artifacts/sports-update",{recursive:true});
  await page.locator("#game").screenshot({path:"artifacts/sports-update/golden-rush.png"});
  const samples=[];
  for(const elapsed of [0,.6,7.5]){
    const result=await page.evaluate(elapsed=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard",teamSize:2},{characters:["orbit","spike"]});
      d.dashball.knockout(0);const s=d.dashball.state,f=d.fighters[0];s.respawns[f.id]=15-elapsed;
      const ctx=document.querySelector("#game").getContext("2d"),text=[],draws=[],nativeText=ctx.fillText,nativeImage=ctx.drawImage;
      ctx.fillText=function(value,...args){text.push(value);return nativeText.call(this,value,...args);};
      ctx.drawImage=function(image,...args){draws.push({width:image.width,height:image.height,src:image.src});return nativeImage.call(this,image,...args);};
      const hash=d.online.rollback.hash();d.camera.update(1);d.stagePresentation.draw();ctx.fillText=nativeText;ctx.drawImage=nativeImage;
      return {elapsed,health:f.health,pure:hash===d.online.rollback.hash(),text,draws,deathSrc:window.DASH_PUNCH_ART.spriteSets[f.data.spriteSet].clips.death.src,returning:d.sportsPresentation.respawn(0),death:d.sportsPresentation.death(0)};
    },elapsed);
    assert.equal(result.health,0);assert(result.pure);assert(Math.abs(result.returning.fraction-elapsed/15)<1e-8);
    assert(!result.text.some(t=>t.includes("ELIMINATED")));assert(result.text.includes("KO"));
    if(elapsed<1){assert(result.death);assert(result.draws.some(image=>image.src?.includes(result.deathSrc)));}
    else {assert.equal(result.death,null);assert(result.text.includes("RETURNING 8s"));}
    await page.locator("#game").screenshot({path:`artifacts/sports-update/respawn-${elapsed}.png`});samples.push(result);
  }
  assert(samples[1].death.animation.frame>samples[0].death.animation.frame);
  await page.setViewportSize({width:980,height:720});
  await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"golden-rush",teamSize:5});for(let i=0;i<10;i++)d.dashball.knockout(i);d.camera.update(1);d.stagePresentation.draw();});
  await page.locator("#game").screenshot({path:"artifacts/sports-update/ten-eliminations-small.png"});
  await page.setViewportSize({width:1440,height:1000});
  const performanceResults=[];
  for(const mode of ["golden-rush","brawl"]){
    await page.evaluate(mode=>{const d=window.__dashPunchDebug,api=mode==="brawl"?d.sandbag:d.dashball;
      api.setup(mode==="brawl"?{ruleset:mode,teamSize:5}:{arena:mode,teamSize:5},{ai:true,characters:["orbit","spike","rain","kite","chungus","archer","anchor","microusb","gunman","whipado"]});window.filmFreeze=false;
    },mode);await page.waitForTimeout(1800);
    const timing=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,players:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))});}requestAnimationFrame(tick);}));
    assert.equal(timing.players,10);assert(timing.finite);performanceResults.push({mode,...timing});await page.locator("#game").screenshot({path:`artifacts/sports-update/ten-${mode}.png`});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  const result={passed:true,edition:root,deathFrames:samples.slice(0,2).map(s=>s.death.animation.frame),performanceResults,errors,missing};
  fs.writeFileSync("artifacts/sports-update/results.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
