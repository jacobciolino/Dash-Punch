"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/match-flow";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});const errors=[],results=[];
  for(const sport of[false,true]){
    const hc=await browser.newContext({viewport:{width:1280,height:900}}),gc=await browser.newContext({viewport:{width:1280,height:900}}),h=await hc.newPage(),g=await gc.newPage();
    for(const p of[h,g]){
      p.on("pageerror",e=>errors.push(e.stack));
      // Identical initial fixtures on both peers shorten the test's round clocks.
      // All round advancement, snapshots and resets still run through real rollback.
      await p.route("**/game.js",async route=>{const r=await route.fetch(),source=await r.text(),fixture='matchSession.limitTicks=60;matchSession.remainingTicks=60;if(dashballState)dashballState.scores[0]=1;else fighters[1].health*=.5;';assert(source.includes("    beginMatchSession();\n    rollbackManager"));await route.fulfill({response:r,body:source.replace("    beginMatchSession();\n    rollbackManager",`    beginMatchSession();${fixture}\n    rollbackManager`).replace("    resetRound(true,true);",`    resetRound(true,true);${fixture}`)});});
      await p.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`);await p.addStyleTag({content:".network-debug {pointer-events:none;}"});
    }
    const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();await click(h,"Play");
    if(sport){await click(h,"Dashball");await click(h,"Online 1v1");await click(h,"Soccer");}
    await click(h,"Online 1v1");await click(h,"Host Match");await h.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await h.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await click(g,"Play");await click(g,"Online 1v1");await g.locator("#onlineRoomCode").fill(code);await click(g,"Join Match");
    for(const[i,p]of[h,g].entries()){await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await click(p,"Choose Fighter");await p.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${i?"kite":"boomerangus"}"]`).click();for(const[key,value]of[["delay","50"],["jitter","15"],["loss","0.05"]])await p.locator(`[data-net="${key}"]`).selectOption(value);await click(p,"Ready");}
    await click(h,"Start Fight");for(const p of[h,g])await p.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state?.phase==="countdown"&&window.__dashPunchDebug.online.rollback.networkState.active&&document.getElementById("menuLayer").hidden);
    await h.bringToFront();await h.keyboard.press("Escape");for(const p of[h,g])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);
    const ticks=await h.evaluate(()=>window.__dashPunchDebug.matchFlow.state.remainingTicks);await h.waitForTimeout(300);assert.equal(await h.evaluate(()=>window.__dashPunchDebug.matchFlow.state.remainingTicks),ticks);await click(h,"Resume");
    await h.bringToFront();await h.keyboard.down("f");await h.waitForTimeout(130);await h.keyboard.up("f");await g.bringToFront();await g.keyboard.down("d");await g.waitForTimeout(130);await g.keyboard.up("d");
    for(const p of[h,g])await p.locator('[data-menu-screen="victory"]').waitFor({timeout:30000});
    const peers=[];for(const p of[h,g])peers.push(await p.evaluate(()=>{const d=window.__dashPunchDebug;return {match:d.matchFlow.state,stats:d.online.rollback.stats,network:d.online.rollback.networkState,characters:d.fighters.map(f=>f.data.name),core:d.online.rollback.save().core.match};}));
    for(const peer of peers){assert.equal(peer.match.phase,"finished");assert.deepEqual(peer.match.wins,[2,0]);assert.equal(peer.match.round,2);assert.equal(peer.match.winner,0);assert.match(peer.stats.hashStatus,/matched frame/);assert(peer.core);assert(!peer.network.paused);}
    assert.deepEqual(peers[0].match,peers[1].match);assert(peers[0].stats.rollbacks+peers[1].stats.rollbacks>0);const id=peers[0].network.id;
    await click(h,"Rematch");for(const p of[h,g])await p.waitForFunction(id=>window.__dashPunchDebug.online.rollback.networkState.id!==id&&window.__dashPunchDebug.matchFlow.state?.phase==="countdown",id);
    for(const p of[h,g]){const s=await p.evaluate(()=>window.__dashPunchDebug.matchFlow.state);assert.deepEqual(s.wins,[0,0]);assert.equal(s.round,1);}
    results.push({mode:sport?"Soccer":"Versus",peers,rematch:true,pauseClock:true});await hc.close();await gc.close();
  }
  assert.deepEqual(errors,[]);const report={passed:true,root,transport:"real WebRTC 1v1",testRoundSeconds:1,delay:50,jitter:15,loss:.05,results,errors};fs.writeFileSync(`${out}/online-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
