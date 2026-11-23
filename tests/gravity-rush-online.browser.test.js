"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),arena="gravity-golden-rush",out="artifacts/gravity-rush";
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const host=await browser.newContext({viewport:{width:1280,height:900}}),guest=await browser.newContext({viewport:{width:1280,height:900}}),h=await host.newPage(),g=await guest.newPage(),errors=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
  for(const p of [h,g]){
    p.on("pageerror",e=>errors.push(e.stack));
    await p.route("**/game.js",async route=>{const r=await route.fetch(),source=await r.text(),fixture=`
      if(config.dashball?.arena==="gravity-golden-rush"&&!window.gravityRushFixtureUsed){
        window.gravityRushFixtureUsed=true;const f=fighters[0],c=currentStage().gravitySwitch;
        Object.assign(f,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false,invulnerable:0});
        f.attack={id:999,dir:{x:1,y:0},charge:0,age:.1,startup:0,active:1,recovery:.2,total:1.2,hitTargets:new Set()};
      }`;
      assert(source.includes("    initializeSimulation(config.seed);"));await route.fulfill({response:r,body:source.replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);${fixture}`)});
    });
    await p.goto(url);await p.addStyleTag({content:".network-debug{pointer-events:none}"});
  }
  await click(h,"Play");await click(h,"Dashball");await click(h,"Online 1v1");const name=await h.evaluate(id=>window.Dashball.ARENAS.find(a=>a.id===id).name,arena);await click(h,name);await click(h,"Online 1v1");await click(h,"Host Match");
  await h.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await h.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
  await click(g,"Play");await click(g,"Online 1v1");await g.locator("#onlineRoomCode").fill(code);await click(g,"Join Match");
  for(const [i,p] of [h,g].entries()){
    await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await click(p,"Choose Fighter");await p.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${i?"boomerangus":"orbit"}"]`).click();
    await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");
  }
  await click(h,"Start Fight");for(const p of [h,g])await p.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
  for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state.time>3,{},{timeout:30000});
  await h.bringToFront();await h.keyboard.down("s");await h.waitForTimeout(300);await h.keyboard.up("s");
  for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.stats.hashStatus.includes("matched frame"));
  const peers=[];for(const p of [h,g])peers.push(await p.evaluate(()=>{const d=window.__dashPunchDebug;return {config:d.dashball.state.config,stats:d.online.rollback.stats,network:d.online.rollback.networkState,transport:d.online.state.transport,gravity:d.gravity.vector,balls:window.Dashball.balls(d.dashball.state).length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))};}));
  for(const peer of peers){assert.equal(peer.config.arena,arena);assert.equal(peer.config.ruleset,"battle");assert.equal(peer.transport,"webrtc");assert(!peer.network.paused);assert.equal(peer.balls,10);assert(peer.finite);assert.deepEqual(peer.gravity,{x:-1,y:0});assert.match(peer.stats.hashStatus,/matched frame/);}
  assert.deepEqual(peers[0].config,peers[1].config);assert(peers[0].stats.rollbacks+peers[1].stats.rollbacks>0);
  const id=peers[0].network.id;await h.bringToFront();await h.keyboard.press("Escape");for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);await click(h,"Rematch");
  for(const p of [h,g]){await p.waitForFunction(id=>window.__dashPunchDebug.online.rollback.networkState.id!==id&&window.__dashPunchDebug.online.rollback.frame>5,id);const state=await p.evaluate(()=>({config:window.__dashPunchDebug.dashball.state.config,gravity:window.__dashPunchDebug.gravity.vector,scores:window.__dashPunchDebug.dashball.state.scores}));assert.equal(state.config.arena,arena);assert.deepEqual(state.gravity,{x:0,y:1});assert.deepEqual(state.scores,[0,0]);}
  assert.deepEqual(errors,[]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/online-results.json`,JSON.stringify({passed:true,root,transport:"real WebRTC",delayMs:50,jitterMs:15,packetLoss:.05,peers,rematch:true,errors},null,2));console.log(JSON.stringify({passed:true,arena,transport:"WebRTC",peers:peers.map(p=>p.stats),rematch:true,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
