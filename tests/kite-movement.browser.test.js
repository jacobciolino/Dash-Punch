"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"chrome",headless:true,timeout:30000,args:["--disable-gpu"]});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text())
    .replace("  function frame(now) {","  function frame(now) {if(window.filmFreeze){lastTime=now;requestAnimationFrame(frame);return;}")
    .replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  await page.evaluate(async()=>{window.filmFreeze=true;document.body.classList.remove("menu-active");document.querySelector("#menuLayer").hidden=true;
    for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))if(clip.image?.decode)await clip.image.decode();
  });
  fs.mkdirSync("artifacts/kite-movement",{recursive:true});const scenes=[];
  for(const scene of ["tap-burst","charged-drift","chungus-launch","inverted"]){
    const result=await page.evaluate(scene=>{
      const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:rb.stageNames.indexOf(scene==="inverted"?"Flip Chamber":"High Perch"),characterKeys:["kite","chungus"],seed:91});
      const [f,c]=d.fighters;Object.assign(f,{x:400,y:scene==="charged-drift"?-400:400,prevX:400,prevY:400,onGround:false,vx:0,vy:0,health:10000,hasLiveAim:true,aim:{x:0,y:-1}});
      Object.assign(c,{x:860,y:scene==="charged-drift"?-400:400,prevX:860,prevY:400,onGround:false,vx:0,vy:0,health:10000});
      if(scene==="tap-burst"){d.gravity.dash(0,{x:0,y:-1},0);for(let n=0;n<20;n++)d.gravity.physics(0);}
      if(scene==="charged-drift"){f.aim={x:1,y:0};d.gravity.dash(0,f.aim,f.data.dashChargeTime);for(let n=0;n<60;n++)d.gravity.physics(0);}
      if(scene==="chungus-launch"){
        Object.assign(f,{x:640,y:500,prevX:640,prevY:500,hasLiveAim:false});Object.assign(c,{x:640,y:350,aim:{x:0,y:1}});
        c.attack={id:999,age:.2,startup:0,active:5,recovery:.2,total:5.2,charge:1,dir:{x:0,y:1},hitTargets:new Set(),grounded:true};d.resolveHit(1,0);
        let bounced=false;for(let n=0;n<60;n++){d.gravity.physics(0);if(f.vy< -200){bounced=true;for(let j=0;j<12;j++)d.gravity.physics(0);break;}}if(!bounced)throw Error("Chungus launch lost its bounce");
      }
      if(scene==="inverted"){d.gravity.setDirection("y",-1);f.hasLiveAim=false;for(let n=0;n<50;n++)d.gravity.physics(0);}
      d.camera.update(1);const hash=rb.hash();d.stagePresentation.draw();
      return {scene,x:f.x,y:f.y,vx:f.vx,vy:f.vy,source:f.floatMotion,airDashes:f.airDashes,pure:hash===rb.hash(),camera:d.camera.state};
    },scene);assert(result.pure);if(scene==="charged-drift")assert(result.x>600&&result.x<750&&result.vx<=110.001);if(scene==="chungus-launch"){assert.equal(result.source,"external");assert(result.vy<0);}
    for(let i=0;i<3;i++){await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await page.waitForTimeout(70);}
    await page.locator("#game").screenshot({path:`artifacts/kite-movement/${scene}.png`});scenes.push(result);
  }
  await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["kite","rain"],ai:true});window.filmFreeze=false;});
  await page.waitForTimeout(1800);
  const timing=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,players:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),kites:d.fighters.filter(f=>f.data.name==="Kite").length});}requestAnimationFrame(tick);}));
  assert.equal(timing.players,10);assert.equal(timing.kites,5);assert(timing.finite);await page.locator("#game").screenshot({path:"artifacts/kite-movement/sports-ten-ai.png"});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const result={passed:true,root,scenes,timing,errors,missing};fs.writeFileSync("artifacts/kite-movement/browser-results.json",JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
