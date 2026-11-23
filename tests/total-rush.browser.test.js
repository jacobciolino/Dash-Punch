"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.addInitScript(()=>{window.testPad={index:0,id:"Team Settings Test Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{value:()=>[window.testPad]});});
  await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`,click=name=>page.getByRole("button",{name,exact:true}).click();await page.goto(url);
  await click("Settings");await page.locator('[data-menu-action="toggleTeamOutlines"]').focus();await page.waitForTimeout(200);await page.evaluate(()=>window.testPad.buttons[0]={pressed:true,value:1});await page.waitForTimeout(120);await page.evaluate(()=>window.testPad.buttons[0]={pressed:false,value:0});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.teamVisuals.settings.outlines),false);await page.locator('[data-menu-action="toggleTeamOutlines"]').focus();await page.keyboard.press("Enter");
  await page.locator('[data-menu-action="toggleTeamGlow"]').focus();await page.keyboard.press("Enter");assert.equal(await page.evaluate(()=>window.__dashPunchDebug.teamVisuals.settings.glow),false);
  await page.reload();assert.equal(await page.evaluate(()=>window.__dashPunchDebug.teamVisuals.settings.glow),false);await click("Settings");await page.locator('[data-menu-action="toggleTeamGlow"]').focus();await page.keyboard.press("Enter");await click("Done");
  await click("Play");await click("Dashball");await click("Online 1v1");await click("Total Rush");await click("Total Rush Settings");assert.equal(await page.locator('[data-menu-action="dashballRules"]').count(),0);assert.equal(await page.getByText("300",{exact:true}).count(),1);
  await click("Choose Fighters");for(const index of [0,1])await page.locator(`[data-menu-action="slotReady"][data-slot="${index}"]`).click();await click("Choose Stage");await click("Start Dashball");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
  await page.evaluate(async()=>{window.filmFreeze=true;for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))if(clip.image?.decode)await clip.image.decode();});
  fs.mkdirSync("artifacts/total-rush",{recursive:true});
  const teamChecks=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,rb=d.online.rollback,canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");d.dashball.setup({arena:"total-rush",teamSize:5},{characters:["orbit"]});
    function draw(index){ctx.clearRect(0,0,1280,720);d.gravity.draw(index);const pixels=ctx.getImageData(0,0,1280,720).data;let red=0,blue=0,opaque=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>180){opaque++;if(Math.abs(pixels[i]-255)<5&&Math.abs(pixels[i+1]-88)<5&&Math.abs(pixels[i+2]-79)<5)red++;if(Math.abs(pixels[i]-53)<5&&Math.abs(pixels[i+1]-191)<5&&Math.abs(pixels[i+2]-255)<5)blue++;}}return {red,blue,opaque};}
    const f=d.fighters[0];Object.assign(f,{x:640,y:360,prevX:640,prevY:360,face:{x:1,y:0},vx:0,vy:0,flash:0,invulnerable:0});const hash=rb.hash(),red=draw(0);f.team=1;const blue=draw(0);f.face.x=-1;const flipped=draw(0);d.gravity.setDirection("y",-1);const inverted=draw(0);d.gravity.setDirection("x",-1);const sideways=draw(0);d.gravity.setDirection("y",1);f.face.x=1;f.team=0;
    d.teamVisuals.set({glow:false});const outlineOnly=draw(0);d.teamVisuals.set({outlines:false});const off=draw(0);d.teamVisuals.set({outlines:true,glow:true});
    Object.assign(f,{koScored:true,koCorpseGone:true});const gone=draw(0);Object.assign(f,{koScored:false,koCorpseGone:false});
    f.modelStyle="block";const block=draw(0);f.modelStyle="pixel";
    const before=rb.hash();d.stagePresentation.draw();const pure=before===rb.hash(),stats=d.teamVisuals.stats;return {red,blue,flipped,inverted,sideways,outlineOnly,off,gone,block,pure,stats};
  });console.log(JSON.stringify({teamChecks}));assert(teamChecks.red.red>20,JSON.stringify(teamChecks));assert(teamChecks.blue.blue>20);assert(teamChecks.flipped.blue>20);assert(teamChecks.inverted.blue>20);assert(teamChecks.sideways.blue>20);assert(teamChecks.outlineOnly.red>20);assert.equal(teamChecks.off.red,0);assert.equal(teamChecks.gone.opaque,0);assert(teamChecks.block.red>20);assert(teamChecks.pure);
  const modes=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,rows=[];
    for(const arena of ["standard","elevated","elevated-open","target-break","golden-rush","gravity-soccer","boulder-control","gravity-boulder","total-rush"]){d.dashball.setup({arena});const hash=d.online.rollback.hash();d.stagePresentation.draw();rows.push({arena,colors:d.fighters.map(d.teamVisuals.color),pure:hash===d.online.rollback.hash()});}
    for(const ruleset of ["race","brawl","scramble"]){d.sandbag.setup({ruleset});const hash=d.online.rollback.hash();d.stagePresentation.draw();rows.push({arena:"sandbag-"+ruleset,colors:d.fighters.map(d.teamVisuals.color),pure:hash===d.online.rollback.hash()});}
    d.dashball.standard();d.arena.setup("Castle Dungeon",{ai:false,characters:["orbit"]});rows.push({arena:"versus-teams",colors:d.fighters.map(d.teamVisuals.color),pure:true});const snap=d.online.rollback.save();snap.core.currentTeamModeIndex=0;d.online.rollback.restore(snap);rows.push({arena:"versus-ffa",colors:d.fighters.map(d.teamVisuals.color),pure:true});
    return rows;
  });assert(modes.every(m=>m.pure));assert(modes.slice(0,9).every(m=>JSON.stringify(m.colors)===JSON.stringify(["#ff584f","#35bfff"])));assert(modes.slice(9,12).every(m=>JSON.stringify(m.colors)===JSON.stringify(["#35bfff","#ff584f"])));assert(modes.at(-1).colors.every(c=>c===null));
  const preview=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),preview=document.createElement("canvas");preview.width=640;preview.height=360;const p=preview.getContext("2d");p.imageSmoothingEnabled=false;p.fillStyle="#17232a";p.fillRect(0,0,640,360);d.dashball.setup({arena:"total-rush"},{characters:["orbit","orbit"]});
    for(const [i,f] of d.fighters.entries()){Object.assign(f,{x:640,y:360,prevX:640,prevY:360});ctx.clearRect(0,0,1280,720);d.gravity.draw(i);p.drawImage(canvas,560,270,160,180,i*320,0,320,360);}return preview.toDataURL();
  });fs.writeFileSync("artifacts/total-rush/team-silhouettes.png",Buffer.from(preview.split(",")[1],"base64"));
  const scenes=[];
  for(const width of [1440,980]){await page.setViewportSize({width,height:width===1440?1000:720});
    for(const scene of ["opening","combat"]){const result=await page.evaluate(scene=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"total-rush",teamSize:5},{characters:["gunman","archer","chungus","spike","kite","rain","anchor","edgebert","whipado","microusb"],ai:scene==="combat"});
      if(scene==="combat")for(let i=0;i<240;i++)d.dashball.step();
      d.camera.update(1);const hash=d.online.rollback.hash();d.stagePresentation.draw();const s=d.dashball.state;return {scene,players:d.fighters.length,balls:s.extraBalls.length,boulder:s.ball.r,snitch:s.golden.health,rings:d.dashball.arena.rings.length,pure:hash===d.online.rollback.hash(),scores:[...s.scores],cache:d.teamVisuals.stats};
    },scene);assert(result.pure);assert.equal(result.players,10);assert.equal(result.balls,3);assert.equal(result.rings,4);scenes.push({width,...result});await page.locator("#game").screenshot({path:`artifacts/total-rush/${scene}-${width}.png`});}
  }
  const animations=await page.evaluate(()=>{
    const d=window.__dashPunchDebug,keys=d.online.rollback.characterKeys,results=[];
    for(const key of keys){d.dashball.setup({arena:"total-rush"},{characters:[key,key]});const f=d.fighters[0];Object.assign(f,{x:640,y:360,prevX:640,prevY:360,onGround:true});
      for(const state of ["idle","dash","attack","shield","hit","ko"]){Object.assign(f,{attack:null,chargingPunch:false,chargingDash:false,hitstun:0,koScored:false,health:f.data.maxHealth,vx:0,vy:0,dashCarryTimer:0});
        if(state==="dash")Object.assign(f,{onGround:false,vx:600,dashCarryTimer:.2,dashDir:{x:1,y:0}});
        if(state==="attack")f.attack={id:999,dir:{x:1,y:0},charge:.8,age:.2,startup:.1,active:2,recovery:.2,total:2.3,hitTargets:new Set()};
        if(state==="shield")Object.assign(f,{chargingPunch:true,punchCharge:.4});if(state==="hit")Object.assign(f,{hitstun:.4,stunType:"hit"});if(state==="ko")Object.assign(f,{koScored:true,health:0});
        const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error("sprite render mutated "+key+state);
      }results.push(key);
    }return {characters:results,cache:d.teamVisuals.stats};
  });assert.equal(animations.characters.length,13);assert(animations.cache.pixels<=animations.cache.maxPixels);assert(animations.cache.entries<=animations.cache.maxEntries);
  const drawBenchmark=await page.evaluate(()=>{
    const d=window.__dashPunchDebug;d.dashball.setup({arena:"total-rush",teamSize:5},{characters:["gunman","archer","chungus","spike","kite","rain","anchor","edgebert","whipado","microusb"],ai:true});for(let i=0;i<120;i++)d.dashball.step();
    const results=[];for(const enabled of [false,true]){d.teamVisuals.set({outlines:enabled,glow:enabled});for(let i=0;i<5;i++)d.stagePresentation.draw();const builds=d.teamVisuals.stats.builds,samples=[];for(let i=0;i<60;i++){const t=performance.now();d.stagePresentation.draw();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);results.push({enabled,median:samples[30],p95:samples[57],newBuilds:d.teamVisuals.stats.builds-builds});}return results;
  });assert(drawBenchmark.every(r=>r.newBuilds===0));
  await page.evaluate(()=>window.filmFreeze=false);await page.waitForTimeout(1500);const timing=await page.evaluate(()=>new Promise(resolve=>{let last;const rows=[];function tick(now){if(last!==undefined)rows.push(now-last);last=now;if(rows.length<180)return requestAnimationFrame(tick);rows.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({median:rows[90],p95:rows[171],over25:rows.filter(n=>n>25).length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),cache:d.teamVisuals.stats});}requestAnimationFrame(tick);}));assert(timing.finite);
  await page.locator("#game").screenshot({path:"artifacts/total-rush/ten-cpu-live.png"});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const result={passed:true,root,teamChecks,modes,animations,scenes,drawBenchmark,timing,errors,missing};fs.writeFileSync("artifacts/total-rush/browser-results.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
