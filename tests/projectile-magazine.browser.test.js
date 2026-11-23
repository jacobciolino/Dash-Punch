"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",timeout:30000,args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.addInitScript(()=>{
    window.pad={index:0,id:"Magazine Test Controller",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,"getGamepads",{value:()=>[window.pad]});
  });
  await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())
    .replace("  function frame(now) {","  function frame(now) { if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}")
    .replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  const click=name=>page.getByRole("button",{name,exact:true}).click();
  const button=async(index,held,wait=100)=>{await page.evaluate(({index,held})=>window.pad.buttons[index]={pressed:held,value:held?1:0},{index,held});await page.waitForTimeout(wait);};
  await click("Play");await click("Local");await page.waitForTimeout(200);await button(9,true);await button(9,false);
  assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].device),0);
  const keys=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys);
  for(const [index,key] of [[0,"gunman"],[1,"archer"]]){
    await page.locator(`[data-menu-action="selectRosterPlayer"][data-slot="${index}"]`).click();await page.locator(`[data-menu-action="chooseCharacter"][data-character="${keys.indexOf(key)}"]`).click();
  }
  if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="cpu"]').click();
  await page.locator('[data-player-slot="0"] [data-field="ready"]').click();await click("Choose Stage");
  const stage=await page.evaluate(()=>window.__dashPunchDebug.stageNames.indexOf("Perch"));await page.locator(`[data-menu-action="chooseStage"][data-stage="${stage}"]`).click();await click("Fight");
  await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
  await page.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state?.phase==="playing");
  await page.evaluate(()=>{
    const d=window.__dashPunchDebug;d.updateHumanInput(1,0);Object.assign(d.fighters[1],{x:1100,y:500,health:10000});
    window.pad.axes=[1,0,0,0];window.shotsSeen=new Set();
    function count(){for(const a of d.fighters[0].projectiles)window.shotsSeen.add(a.id);requestAnimationFrame(count);}requestAnimationFrame(count);
  });
  for(let i=0;i<3;i++){await button(1,true,40);await button(1,false,90);}
  try{await page.waitForFunction(()=>window.__dashPunchDebug.fighters[0].ammo===0,{},{timeout:5000});}catch(error){console.error(await page.evaluate(()=>({phase:window.__dashPunchDebug.matchFlow.state?.phase,shots:window.shotsSeen.size,fighters:window.__dashPunchDebug.fighters.map(f=>({name:f.data.name,ammo:f.ammo,reload:f.reloadRemaining,health:f.health,stun:f.hitstun,ko:f.koScored}))})));throw error;}
  assert(await page.evaluate(()=>window.__dashPunchDebug.fighters[0].reloadRemaining>0));
  assert.equal(await page.evaluate(()=>window.shotsSeen.size),3);
  await button(6,true);await button(1,true);await button(6,false);
  assert(await page.evaluate(()=>window.__dashPunchDebug.fighters[0].chargingPunch));
  await button(0,true);await button(0,false);
  assert(await page.evaluate(()=>window.__dashPunchDebug.fighters[0].chargingPunch));
  await button(1,false);assert.equal(await page.evaluate(()=>window.shotsSeen.size),3,"reload emitted a fourth projectile");
  await page.waitForFunction(()=>{const f=window.__dashPunchDebug.fighters[0];return f.ammo===3&&f.reloadRemaining===0;});
  fs.mkdirSync("artifacts/projectile-magazine",{recursive:true});
  await page.evaluate(async()=>{
    window.filmFreeze=true;
    for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))if(clip.image?.decode)await clip.image.decode();
  });
  const scenes=[];
  for(const [axis,sign] of [["y",1],["y",-1],["x",1]]){
    const result=await page.evaluate(({axis,sign})=>{
      const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:rb.stageNames.indexOf("Perch"),characterKeys:["gunman","archer"]});
      d.gravity.setDirection(axis,sign);
      d.fighters.forEach((f,i)=>Object.assign(f,{x:420+i*440,y:380,onGround:true,vx:0,vy:0,ammo:0,reloadRemaining:f.data.projectileConfig.reloadTime/2,gunRecoil:0}));
      const context=document.querySelector("#game").getContext("2d"),draws=[],native=context.drawImage;
      context.drawImage=function(image,...args){draws.push([image.width,image.height]);return native.call(this,image,...args);};
      const hash=rb.hash();d.stagePresentation.draw();context.drawImage=native;
      return {axis,sign,indicators:d.fighters.map((_,i)=>d.projectileMagazine.indicator(i)),clips:d.fighters.map((_,i)=>d.getAssetAnimation(i).clip),conjureDraws:draws.filter(([w,h])=>w===200&&h===152).length,pure:hash===rb.hash()};
    },{axis,sign});
    assert(result.pure);assert.deepEqual(result.clips,["reload","reload"]);assert.equal(result.conjureDraws,2);
    assert.deepEqual(result.indicators.map(i=>i.capacity),[3,5]);assert(result.indicators.every(i=>i.ammo===0&&Math.abs(i.progress-.5)<1e-8));
    await page.locator("#game").screenshot({path:`artifacts/projectile-magazine/reload-${axis}-${sign}.png`});scenes.push(result);
  }
  for(const width of [980,1440]){
    await page.setViewportSize({width,height:900});await page.evaluate(()=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"elevated",teamSize:5},{characters:["gunman","archer"]});
      d.fighters.forEach((f,i)=>Object.assign(f,{ammo:i%2?2:1,reloadRemaining:0}));d.camera.update(1);const hash=d.online.rollback.hash();d.stagePresentation.draw();if(hash!==d.online.rollback.hash())throw Error("Indicators changed simulation");
    });await page.locator("#game").screenshot({path:`artifacts/projectile-magazine/ten-indicators-${width}.png`});
  }
  const reflected=await page.evaluate(()=>{
    const d=window.__dashPunchDebug;d.dashball.setup({arena:"standard"},{characters:["gunman","archer"]});
    function fire(i){const f=d.fighters[i];f.whiffLag=f.punchLockout=0;Object.assign(f.controls,{hasAim:true,aim:{x:i?-1:1,y:0}});
      for(const held of [true,false]){f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(i);}const a=f.attack;d.updateAttack(i,a.startup+1e-8);return a;
    }
    const a=fire(0),b=fire(1),ownerBefore=d.projectileMagazine.colors(0);d.projectileMagazine.reflect(a,1,{x:-1,y:0});d.projectileMagazine.reflect(b,0,{x:1,y:0});
    Object.assign(a.projectile,{x:1000,y:900});Object.assign(b.projectile,{x:1500,y:900});d.fighters[0].koScored=true;d.fighters[0].koCorpseGone=true;
    d.camera.update(1);d.stagePresentation.draw();return {ownerBefore,ownerAfter:d.projectileMagazine.colors(1),remaining:a.projectile.remainingLife,owner:a.reflectedOwnerId};
  });assert.notEqual(reflected.ownerBefore.primary,reflected.ownerAfter.primary);assert.equal(reflected.remaining,.4);
  await page.locator("#game").screenshot({path:"artifacts/projectile-magazine/reflected-ownership.png"});
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{const d=window.__dashPunchDebug,stage=d.arena.setup("Castle Dungeon",{characters:["gunman","archer"],ai:true});d.fighters.forEach((f,i)=>Object.assign(f,{x:500+i*135,y:stage.floorY-f.data.height/2,health:10000}));window.filmFreeze=false;});
  await page.waitForTimeout(1800);
  const timing=await page.evaluate(()=>new Promise(resolve=>{let last,peak=0;const samples=[];function tick(now){const d=window.__dashPunchDebug;peak=Math.max(peak,d.fighters.reduce((n,f)=>n+f.projectiles.length,0));if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,peakShots:peak,players:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))});}requestAnimationFrame(tick);}));
  assert.equal(timing.players,10);assert(timing.finite);assert(timing.peakShots>0);await page.locator("#game").screenshot({path:"artifacts/projectile-magazine/ten-fighters.png"});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  const report={passed:true,root,controllerPolling:true,aliases:true,reloadMeleeAndDash:true,scenes,reflected,timing,errors,missing};fs.writeFileSync("artifacts/projectile-magazine/browser-results.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
