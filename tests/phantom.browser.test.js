"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js")),out="artifacts/phantom";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[];
  page.on("pageerror",e=>errors.push(e.stack));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const response=await route.fetch(),source=await response.text();await route.fulfill({response,body:source.replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  for(const name of ["Play","Local"])await page.getByRole("button",{name,exact:true}).click();
  assert.equal(await page.locator(".character-tile").count(),15);
  await page.getByRole("button",{name:"Phantom",exact:true}).hover();await page.waitForTimeout(300);
  await page.getByRole("button",{name:"Phantom",exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].character),"phantom");
  for(const viewport of [{width:1280,height:720},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(120);
    assert(await page.locator(".character-tile").evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})));
    await page.screenshot({path:`${out}/roster-${viewport.width}.png`});
  }
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(async()=>{window.filmFreeze=true;document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");const a=window.DASH_PUNCH_ART,set=a.spriteSets[a.assignments.phantom.spriteSet];for(const clip of Object.values(set.clips)){const image=new Image();image.src=clip.src;await image.decode();}});
  const scenes=[];
  for(const state of ["idle","ground-dash","ghost-right","ghost-left","ghost-up","second-dash","materialize","punch","hitstun","ko"]){
    const scene=await page.evaluate(state=>{
      const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:rb.stageNames.indexOf("Crosswire"),characterKeys:["phantom","anchor"],seed:541});
      const [f,t]=d.fighters;Object.assign(f,{x:500,y:400,prevX:500,prevY:400,vx:0,vy:0,onGround:false,invulnerable:0});Object.assign(t,{x:900,y:400,prevX:900,prevY:400,vx:0,vy:0,invulnerable:0});
      if(state==="ground-dash"){Object.assign(f,{y:647,prevY:647,onGround:true});d.gravity.dash(0,{x:1,y:0},0);}
      if(state.startsWith("ghost")||state==="second-dash"||state==="materialize"){
        if(state==="ghost-up")d.gravity.setDirection("y",-1);
        d.gravity.dash(0,{x:state==="ghost-left"?-1:1,y:0},0);
        if(state==="second-dash"){for(let i=0;i<75;i++)rb.step([{},{}]);d.gravity.dash(0,{x:-1,y:0},0);}
        if(state==="materialize"){f.phantomDash.remaining=1/60;Object.assign(t,{x:f.x+520/60,y:f.y,prevX:f.x+520/60,prevY:f.y});rb.step([{},{}]);}
      }
      if(state==="punch"){for(const held of [true,false]){f.controls.hasAim=true;f.controls.aim={x:1,y:0};f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(0);}d.updateAttack(0,f.attack.startup+.01);}
      if(state==="hitstun"){f.hitstun=.5;f.vx=200;}
      if(state==="ko"){f.koScored=true;f.koCorpseGone=true;}
      d.camera.update(1);const hash=rb.hash();d.stagePresentation.draw();
      return {state,ghost:d.phantom.ghost(),alpha:d.phantom.alpha(),charges:f.airDashes,animation:d.getAssetAnimation(0),pure:hash===rb.hash(),contacts:f.phantomDash?.contacts||[]};
    },state);
    assert(scene.pure);assert.equal(scene.ghost,state.startsWith("ghost")||state==="second-dash");
    if(scene.ghost)assert.equal(scene.alpha,.4);if(state==="materialize")assert(scene.contacts.includes("p2"));
    await page.locator("#game").screenshot({path:`${out}/${state}-1280.png`});scenes.push(scene);
  }
  const pixels=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({characterKeys:["phantom","orbit"]});const f=d.fighters[0];Object.assign(f,{x:500,y:400,prevX:500,prevY:400,onGround:false,invulnerable:0});
    const c=document.getElementById("game"),ctx=c.getContext("2d"),results=[];
    for(const ghost of [false,true]){if(ghost)d.gravity.dash(0,{x:1,y:0},0);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.translate(c.width/2-f.x,c.height/2-f.y);d.gravity.draw(0);ctx.restore();const data=ctx.getImageData(0,0,c.width,c.height).data;let alpha=0,count=0;for(let i=3;i<data.length;i+=4){alpha+=data[i];if(data[i])count++;}results.push({ghost,alpha,count});}return results;
  });assert(pixels[0].count>100);assert(pixels[1].count>100);assert(pixels[1].alpha<pixels[0].alpha*.75);
  const sports=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,results=[];
    for(const arena of window.Dashball.ARENAS){d.dashball.setup({arena:arena.id,teamSize:5},{characters:["phantom","boomerangus","gunman","spike","archer"],ai:true,seed:433});for(let i=0;i<180;i++)d.dashball.step();const hash=d.online.rollback.hash();d.stagePresentation.draw();results.push({arena:arena.id,count:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),pure:hash===d.online.rollback.hash()});}
    for(const ruleset of ["race","brawl","scramble"]){d.sandbag.setup({ruleset,teamSize:5},{characters:["phantom","edgebert","kite"],ai:true,seed:433});for(let i=0;i<180;i++)d.sandbag.step();const hash=d.online.rollback.hash();d.stagePresentation.draw();results.push({ruleset,count:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),pure:hash===d.online.rollback.hash()});}return results;
  });assert(sports.every(r=>r.count===10&&r.finite&&r.pure));
  for(const viewport of [{width:1280,height:720},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"total-rush",teamSize:5},{characters:["phantom","spike","boomerangus","gunman","archer"],ai:true,seed:339});for(let i=0;i<120;i++)d.dashball.step();const f=d.fighters[0];Object.assign(f,{x:900,y:600,onGround:false});d.gravity.dash(0,{x:1,y:0},0);d.camera.update(1);d.stagePresentation.draw();});await page.locator("#game").screenshot({path:`${out}/ten-fighters-${viewport.width}.png`});
  }
  await page.evaluate(()=>{window.__dashPunchDebug.dashball.setup({arena:"total-rush",teamSize:5},{characters:["phantom","gunman","boomerangus","archer","spike"],ai:true,seed:343});window.filmFreeze=false;});await page.waitForTimeout(800);
  const pacing=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function next(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(next);samples.sort((a,b)=>a-b);resolve({median:samples[90],p95:samples[171],over25:samples.filter(v=>v>25).length,count:window.__dashPunchDebug.fighters.length});}requestAnimationFrame(next);}));assert.equal(pacing.count,10);
  const offline=await browser.newPage({viewport:{width:1280,height:720}});offline.on("pageerror",e=>errors.push(e.stack));await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");
  const file=await offline.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"elevated"},{characters:["phantom","phantom"]});const f=d.fighters[0];Object.assign(f,{x:1000,y:400,onGround:false});d.gravity.dash(0,{x:1,y:0},0);d.stagePresentation.draw();return {ghost:d.phantom.ghost(),charges:f.airDashes,alpha:d.phantom.alpha()};});assert(file.ghost);assert.equal(file.charges,1);assert.equal(file.alpha,.4);await offline.screenshot({path:`${out}/offline-1280.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={passed:true,root,scenes,pixels,sports,pacing,offline:file,errors,missing,benchmark:"Headless software Chrome, live ten-CPU Total Rush, 180 requestAnimationFrame intervals. Not a hardware guarantee or physical-controller test."};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
