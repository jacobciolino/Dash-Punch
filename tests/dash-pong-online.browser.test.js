"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const moving=process.env.PONG_TEST_ARENA==="dash-pong-track",arena=moving?"dash-pong-track":"dash-pong",label=moving?"Dash Pong - Moving Goals":"Dash Pong";
  const out=`artifacts/${arena}`;fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const errors=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,hc=await browser.newContext(),gc=await browser.newContext(),host=await hc.newPage(),guest=await gc.newPage();
  const click=async(p,name)=>{await p.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});await p.getByRole("button",{name,exact:true}).click();};
  for(const page of[host,guest]){
    page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/game.js",async route=>{const response=await route.fetch(),source=await response.text(),marker="    beginMatchSession();\n    rollbackManager";assert(source.includes(marker));
      // Identical pre-start shot fixture, not injected scores or network state.
      const shot="if(dashballState?.pong&&(!currentStage().pongTrack||!window.pongMovingFixtureUsed)){if(currentStage().pongTrack){dashballState.pongTrack={time:54,previous:54};window.pongMovingFixtureUsed=true;}const b=dashballState.ball,p=Dashball.pong.point(Dashball.goalTransforms(dashballState,currentStage()).find(g=>g.team===0));Object.assign(b,{x:p.x-p.nx*8,y:p.y-p.ny*8,vx:p.nx*1600,vy:p.ny*1600,pongSpeed:1600,pongHits:20});}";
      await route.fulfill({response,body:source.replace(marker,`    beginMatchSession();${shot}\n    rollbackManager`)});
    });await page.goto(url);await page.addStyleTag({content:".network-debug{pointer-events:none}"});
  }
  await click(host,"Play");await click(host,"Dashball");await click(host,"Online 1v1");await click(host,label);await click(host,"Dash Pong Settings");await host.locator('[data-menu-action="pongSpeedUp"]').click();await click(host,"Back");await click(host,"Confirm Return");await click(host,"Online 1v1");await click(host,"Host Match");
  await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
  await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
  for(const[i,page]of[host,guest].entries()){
    await page.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await click(page,"Choose Fighter");await page.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${i?"boomerangus":"anchor"}"]`).click();
    for(const[key,value]of[["delay","50"],["jitter","15"],["loss","0.05"]])await page.locator(`[data-net="${key}"]`).selectOption(value);await click(page,"Ready");
  }
  await click(host,"Start Fight");for(const page of[host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state?.phase==="playing"&&window.__dashPunchDebug.dashball.state.goalSerial===1);
  await host.bringToFront();await host.keyboard.down("a");await host.keyboard.down("ShiftLeft");await host.waitForTimeout(120);await host.keyboard.up("ShiftLeft");await host.keyboard.down("f");await host.waitForTimeout(250);await host.keyboard.up("f");await host.keyboard.up("a");
  for(const page of[host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.dashball.state.time>2&&window.__dashPunchDebug.online.rollback.stats.hashStatus.includes("matched frame"));
  const peers=[];for(const page of[host,guest])peers.push(await page.evaluate(()=>{const d=window.__dashPunchDebug,b=d.dashball.state.ball;return {config:d.dashball.state.config,scores:d.dashball.state.scores,serial:d.dashball.state.goalSerial,track:d.dashball.state.pongTrack,ball:{x:b.x,y:b.y,vx:b.vx,vy:b.vy,hits:b.pongHits},round:d.matchFlow.state.round,stats:d.online.rollback.stats,network:d.online.rollback.networkState,transport:d.online.state.transport};}));
  for(const p of peers){assert.equal(p.transport,"webrtc");assert.equal(p.config.arena,arena);assert.equal(p.config.maxSpeed,1700);assert.equal(p.config.ruleset,"battle");assert.equal(p.config.teamSize,1);assert.deepEqual(p.scores,[0,1]);assert.equal(p.serial,1);assert.deepEqual(p.ball,{x:1120,y:640,vx:0,vy:0,hits:0});assert(!p.network.paused,p.network.status);assert.match(p.stats.hashStatus,/matched frame/);if(moving)assert(p.track.time>56);}
  assert.deepEqual(peers[0].config,peers[1].config);assert(peers[0].stats.rollbacks+peers[1].stats.rollbacks>0);
  const session=peers[0].network.id;await host.keyboard.press("Escape");for(const page of[host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);await click(host,"Rematch");
  for(const page of[host,guest]){await page.waitForFunction(id=>{const d=window.__dashPunchDebug;return d.online.rollback.networkState.id!==id&&d.online.rollback.frame>5;},session);const round=await page.evaluate(()=>{const d=window.__dashPunchDebug;return {wins:d.matchFlow.state.wins,scores:d.dashball.state.scores,track:d.dashball.state.pongTrack,config:d.dashball.state.config};});assert.deepEqual(round.wins,[0,0]);assert.deepEqual(round.scores,[0,0]);assert.equal(round.config.maxSpeed,1700);if(moving)assert.equal(round.track.time,0);}
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/online-results.json`,JSON.stringify({passed:true,peers,rematch:true,delay:50,jitter:15,loss:.05,errors,limitations:"Identical pre-start moving-shot fixture on both peers; scoring, respawn, timers, input and rematch use production WebRTC rollback."},null,2));console.log(JSON.stringify({passed:true,transport:"WebRTC 1v1",rematch:true,rollbacks:peers.map(p=>p.stats.rollbacks),errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
