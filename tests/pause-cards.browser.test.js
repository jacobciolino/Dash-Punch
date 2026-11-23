"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{execFileSync}=require("node:child_process"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const before=process.env.PAUSE_BEFORE_REF,out=`artifacts/pause-cards/${before?"before":"after"}`;fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[];
  let source=before?execFileSync("git",["show",`${before}:game.js`],{encoding:"utf8",maxBuffer:8*1024*1024}):fs.readFileSync("game.js","utf8");
  // Cover stale open-card flags and legacy matches without a round session.
  source=source.replace("  function frame(now) {","  function frame(now) {lastTime=now;requestAnimationFrame(frame);return;");
  source=source.replace("  const startPresentation=",`  window.pauseCardFixture=legacy=>{resetRound(true);beginMatchSession({countdown:false});if(legacy)matchSession=null;for(const card of localLobby.cards.values())card.open=true;menuState.active=false;menuState.pausedFromMatch=false;syncMenuVisibility();};\n  const startPresentation=`);
  async function tick(p,dt=.2){await p.evaluate(dt=>{const d=window.__dashPunchDebug;d.sharedMenu.poll(dt);for(const s of d.radialMenu.active)d.radialMenu.draw(s.startedAt+400);if(d.radialMenu.wipe)d.radialMenu.draw(d.radialMenu.wipe.startedAt+400);},dt);}
  async function press(p,i,b=0){await p.evaluate(([i,b])=>window.pads[i].buttons[b]={pressed:true,value:1},[i,b]);await tick(p);await p.evaluate(([i,b])=>window.pads[i].buttons[b]={pressed:false,value:0},[i,b]);await tick(p);}
  for(const width of[1280,1920])for(const legacy of[true,false]){
    const p=await browser.newPage({viewport:{width,height:width*9/16}});p.on("pageerror",e=>errors.push(e.message));await p.addInitScript(()=>{window.pads=Array.from({length:7},(_,index)=>({index,id:`Couch ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});});
    await p.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await p.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");await tick(p);
    for(let i=0;i<6;i++)await press(p,i,9);assert.equal(await p.locator('.player-card.is-open').count(),6);
    await p.evaluate(legacy=>window.pauseCardFixture(legacy),legacy);const initial=await p.evaluate(()=>{const d=window.__dashPunchDebug;return {slots:d.lobby.slots,hash:d.online.rollback.hash()};});
    await p.keyboard.press("Escape");await tick(p);assert.equal(await p.locator('[data-menu-screen="mode"]').count(),1);
    assert.equal(await p.locator('.player-card,.player-card-dock').count(),0,"pause must not show cards");assert(await p.evaluate(()=>window.__dashPunchDebug.lobby.cards.every(c=>!c.open)),"stale card flags must be cleared");
    assert.deepEqual(await p.evaluate(()=>window.__dashPunchDebug.lobby.slots),initial.slots);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),initial.hash);
    await p.keyboard.press("KeyO");await press(p,6,9);assert.equal(await p.locator('.player-card').count(),0);assert.deepEqual(await p.evaluate(()=>window.__dashPunchDebug.lobby.slots),initial.slots);
    const angle=await p.locator('[data-radial="main"] [data-menu-action="goSettings"]').evaluate(b=>window.DashRadialMenu.angle(Number(b.dataset.radialIndex),b.closest('[data-radial]').querySelectorAll('[data-radial-index]').length));
    await p.evaluate(a=>window.pads[1].axes=[Math.cos(a),Math.sin(a),0,0],angle);await tick(p);await p.evaluate(()=>window.pads[1].axes=[0,0,0,0]);await tick(p);await press(p,1);
    assert.equal(await p.locator('[data-menu-screen="settings"]').count(),1);assert.equal(await p.locator('.player-card,.player-card-dock').count(),0);await p.screenshot({path:`${out}/${legacy?"legacy":"round"}-settings-${width}.png`});
    assert.equal(await p.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),initial.hash);await press(p,1,9);assert(await p.locator('#menuLayer').isHidden(),"P2 Start resumes instead of opening a card");
    assert.deepEqual(await p.evaluate(()=>window.__dashPunchDebug.lobby.slots),initial.slots);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),initial.hash);
    results.push({width,legacy,cardsAbsent:true,p2SettingsAndResume:true,rosterAndSimulationPreserved:true});await p.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,results,errors,physicalControllersTested:false},null,2));console.log(JSON.stringify({passed:true,results,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
