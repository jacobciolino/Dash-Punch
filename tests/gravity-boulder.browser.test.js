"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",timeout:30000,args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  const click=name=>page.getByRole("button",{name,exact:true}).click();await click("Play");await click("Dashball");await page.locator('[data-menu-action="dashballRules"]').click();await click("Online 1v1");await click("Gravity Flip Boulder Control");await click("Boulder Settings");
  assert.equal(await page.locator('[data-menu-action="dashballRules"]').count(),0);assert.equal(await page.getByText("Battle",{exact:true}).count(),1);
  fs.mkdirSync("artifacts/gravity-boulder",{recursive:true});await page.screenshot({path:"artifacts/gravity-boulder/settings.png"});await click("Choose Fighters");
  if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
  await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();await click("Choose Stage");await page.screenshot({path:"artifacts/gravity-boulder/stage-select.png"});await click("Start Dashball");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
  await page.evaluate(async()=>{window.filmFreeze=true;for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))if(clip.image?.decode)await clip.image.decode();});
  const scenes=[];
  for(const width of [1440,980]){
    await page.setViewportSize({width,height:width===1440?1000:720});
    for(const scene of ["floor","transit","ceiling"]){
      const result=await page.evaluate(scene=>{
        const d=window.__dashPunchDebug,rb=d.online.rollback;d.dashball.setup({arena:"gravity-boulder",teamSize:5},{characters:["orbit","spike","rain","whipado","chungus","gunman","archer","kite","anchor","edgebert"]});
        if(scene!=="floor"){
          const f=d.fighters[0],c=d.dashball.arena.gravitySwitch;Object.assign(f,{x:c.x-65,y:c.y});f.attack={id:999,dir:{x:1,y:0},charge:0,age:.1,startup:0,active:1,recovery:.2,total:1.2,hitTargets:new Set()};d.gravity.hitSwitch();
          for(let i=0;i<(scene==="transit"?30:180);i++)d.dashball.step();
        }
        const s=d.dashball.state;Object.assign(s.ball,{x:615,y:scene==="floor"?800:scene==="transit"?1440:970,vx:0,vy:0});d.dashball.ballStep();d.camera.update(1);
        const hash=rb.hash();d.stagePresentation.draw();const camera=d.camera.state,b=s.ball,canvas=document.querySelector("#game"),pixel=Array.from(canvas.getContext("2d").getImageData(Math.round(camera.offset.x+b.x*camera.zoom),Math.round(camera.offset.y+b.y*camera.zoom),1,1).data);
        return {scene,players:d.fighters.length,gravity:d.gravity.direction,bodies:s.movingPlatforms,region:{team:s.boulder.activeTeam,multiplier:s.boulder.multiplier},pixel,camera,pure:hash===rb.hash(),finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))};
      },scene);assert(result.pure&&result.finite);assert.equal(result.players,10);assert.equal(result.gravity,scene==="floor"?1:-1);assert.equal(result.region.team,1);assert.equal(result.region.multiplier,2);assert(result.pixel[0]>50);
      const png=await page.locator("#game").screenshot({path:`artifacts/gravity-boulder/${scene}-${width}.png`});assert(png.length>15000);scenes.push({width,...result});
    }
  }
  await page.evaluate(()=>{window.__dashPunchDebug.dashball.setup({arena:"gravity-boulder",teamSize:5},{characters:["orbit","spike","rain","whipado","chungus","gunman","archer","kite","anchor","edgebert"],ai:true});window.filmFreeze=false;});
  await page.waitForTimeout(1800);const timing=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,players:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))});}requestAnimationFrame(tick);}));
  assert(timing.finite);await page.locator("#game").screenshot({path:"artifacts/gravity-boulder/ten-ai.png"});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const results={passed:true,root,scenes,timing,errors,missing};fs.writeFileSync("artifacts/gravity-boulder/browser-results.json",JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
