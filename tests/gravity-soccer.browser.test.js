"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",timeout:30000,args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  const click=name=>page.getByRole("button",{name,exact:true}).click();await click("Play");await click("Dashball");await click("Online 1v1");
  await page.getByRole("button",{name:"Gravity Flip Soccer",exact:true}).waitFor();await click("Gravity Flip Soccer");
  assert(await page.getByRole("button",{name:"Online 1v1",exact:true}).isVisible());
  fs.mkdirSync("artifacts/gravity-soccer",{recursive:true});await page.screenshot({path:"artifacts/gravity-soccer/stage-select.png"});
  await page.evaluate(async()=>{window.filmFreeze=true;document.body.classList.remove("menu-active");document.querySelector("#menuLayer").hidden=true;
    for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))if(clip.image?.decode)await clip.image.decode();
  });
  const scenes=[];
  for(const width of [1440,980]){
    await page.setViewportSize({width,height:width===1440?1000:720});
    for(const scene of ["floor","transit","ceiling"]){
      const result=await page.evaluate(scene=>{
        const d=window.__dashPunchDebug,rb=d.online.rollback;d.dashball.setup({arena:"gravity-soccer",teamSize:5},{ai:false});
        if(scene!=="floor"){
          const f=d.fighters[0],c=d.dashball.arena.gravitySwitch;Object.assign(f,{x:c.x-65,y:c.y});
          f.attack={id:999,age:.1,startup:0,active:1,recovery:.2,total:1.2,charge:0,dir:{x:1,y:0},hitTargets:new Set()};d.gravity.hitSwitch();
          for(let n=0;n<(scene==="transit"?85:250);n++)d.dashball.step();
        }
        d.camera.update(1);const hash=rb.hash();d.stagePresentation.draw();const s=d.dashball.state;
        return {scene,players:d.fighters.length,gravity:d.gravity.direction,goals:s.movingGoals,pure:hash===rb.hash(),camera:d.camera.state,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))};
      },scene);assert(result.pure&&result.finite);assert.equal(result.players,10);assert.equal(result.gravity,scene==="floor"?1:-1);
      await page.waitForTimeout(100);await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());
      const pixels=await page.locator("#game").screenshot({path:`artifacts/gravity-soccer/${scene}-${width}.png`});assert(pixels.length>12000);scenes.push({width,...result});
    }
  }
  await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"gravity-soccer",teamSize:5},{characters:["rain","orbit","spike","gunman","archer","kite","anchor","whipado","chungus","edgebert"],ai:true});window.filmFreeze=false;});
  await page.waitForTimeout(1500);
  const timing=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last;function tick(now){if(last!==undefined)a.push(now-last);last=now;if(a.length<180)return requestAnimationFrame(tick);a.sort((x,y)=>x-y);const d=window.__dashPunchDebug;resolve({median:a[90],p95:a[171],over25:a.filter(n=>n>25).length,players:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))});}requestAnimationFrame(tick);}));
  assert(timing.finite);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const results={passed:true,root,scenes,timing,errors,missing};
  fs.writeFileSync("artifacts/gravity-soccer/browser-results.json",JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
