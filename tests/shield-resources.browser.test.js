"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const out="artifacts/shield-resources";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});
  const p=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[];p.on("pageerror",e=>errors.push(e.stack));p.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  const js=fs.readFileSync("game.js","utf8");await p.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:js.replace("  function frame(now) {","  function frame(now) {if(window.shieldFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")}));
  await p.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
  await p.getByRole("button",{name:"Play",exact:true}).click();await p.getByRole("button",{name:"Local",exact:true}).click();assert.equal(await p.locator(".character-tile").count(),19);
  await p.evaluate(async()=>{
    window.shieldFreeze=true;const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:rb.stageNames.indexOf("Crosswire"),characterKeys:["anchor","spike"],seed:618});d.matchFlow.begin({countdown:false});document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");
    for(const[i,f]of d.fighters.entries())Object.assign(f,{x:480+i*250,y:470,prevX:480+i*250,prevY:470,onGround:false,vx:0,vy:0,invulnerable:0,chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchAim:{x:i?-1:1,y:0},shieldActiveTime:1});
    const art=window.DASH_PUNCH_ART;for(const key of["anchor","spike"]){const set=art.spriteSets[art.assignments[key].spriteSet];for(const c of Object.values(set.clips)){const i=new Image();i.src=c.src;await i.decode();}}
    d.camera.update(1);d.stagePresentation.draw();
  });
  const scenes=[];for(const scene of["active","partial","timeout","broken"]){const state=await p.evaluate(scene=>{
    const d=window.__dashPunchDebug,[a,b]=d.fighters;
    if(scene==="partial"){a.shieldHealth=a.data.shieldMax*.4;b.shieldHealth=b.data.shieldMax*.2;}
    if(scene==="timeout"){d.shields.tick(0,d.shields.duration(0));d.shields.tick(1,d.shields.duration(1));}
    if(scene==="broken"){
      Object.assign(a,{punchExhausted:false,chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:1,y:0},shieldHealth:1,shieldActiveTime:0});b.x=a.x+75;b.prevX=b.x;d.booster.punch(1,1,{x:-1,y:0});d.resolveHit(1,0);
    }
    const hash=d.online.rollback.hash();d.stagePresentation.draw();return {scene,pure:hash===d.online.rollback.hash(),fighters:d.fighters.map((f,i)=>({shield:d.isShielding(i),health:f.shieldHealth,stun:f.stunType,hitstun:f.hitstun,duration:d.shields.duration(i),recovery:d.shields.recoverySeconds(i)}))};
  },scene);assert(state.pure);if(scene==="timeout"){assert(state.fighters.every(f=>!f.shield&&f.hitstun===0&&f.health>0));}if(scene==="broken"){assert.equal(state.fighters[0].stun,"shieldBreak");assert.equal(state.fighters[0].health,0);}scenes.push(state);
    for(const size of[{width:1280,height:720},{width:1920,height:1080}]){await p.setViewportSize(size);await p.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await p.locator("#game").screenshot({path:`${out}/${scene}-${size.width}.png`});}
  }
  await p.evaluate(()=>{window.shieldFreeze=false;const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:rb.stageNames.indexOf("High Perch"),characterKeys:["anchor","spike"],seed:618});d.matchFlow.begin({countdown:false});d.fighters[0].x=200;d.fighters[1].x=1000;d.fighters[0].shieldHealth=30;});
  await p.keyboard.down("f");await p.waitForTimeout(450);const native=await p.evaluate(()=>({shield:window.__dashPunchDebug.isShielding(0),health:window.__dashPunchDebug.fighters[0].shieldHealth}));assert(native.shield);assert(native.health<35);await p.keyboard.up("f");
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={passed:true,scenes,native,errors,missing,physicalControllersTested:false,reflektorArtVerified:false};fs.writeFileSync(path.join(out,"browser-results.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
