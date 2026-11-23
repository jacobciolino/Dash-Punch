"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
const balance=process.env.TOTAL_RUSH_TEST_BALANCE?JSON.parse(process.env.TOTAL_RUSH_TEST_BALANCE):null,output=balance?"artifacts/total-balance":"artifacts/total-rush";
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,errors=[],results=[];
  for(const scenario of ["live","victory"]){
    const hc=await browser.newContext({viewport:{width:1440,height:1000}}),gc=await browser.newContext({viewport:{width:1440,height:1000}}),host=await hc.newPage(),guest=await gc.newPage();
    for(const page of [host,guest]){
      page.on("pageerror",e=>errors.push(e.message));
      await page.route("**/game.js",async route=>{const response=await route.fetch(),fixture='Object.assign(dashballState.ball,{x:738,y:1900,vx:0,vy:0});'+(scenario==="victory"?'dashballState.totalRush.scoreUnits[1]=17997000;dashballState.scores[1]=299.95;':'');
        await route.fulfill({response,body:(await response.text()).replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);if(config.dashball?.arena==="total-rush"&&!window.totalFixtureUsed){window.totalFixtureUsed=true;${fixture}}`)});});
      await page.goto(url);await page.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug {pointer-events:none;}"});
    }
    const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();await click(host,"Play");await click(host,"Dashball");await click(host,"Online 1v1");await click(host,"Total Rush");
    if(balance){await click(host,"Total Rush Settings");for(const [key,target] of Object.entries(balance)){const value=()=>host.locator(`.setting-row:has([data-field="${key}"]) .setting-value`).innerText();let current=parseFloat(await value());while(current!==target){await host.locator(`[data-menu-action="totalBalance${current<target?"Up":"Down"}"][data-field="${key}"]`).click();current=parseFloat(await value());}}await click(host,"Online 1v1");}
    await click(host,"Online 1v1");await click(host,"Host Match");
    await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
    for(const p of [host,guest]){await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");}await click(host,"Start Fight");
    await host.evaluate(()=>window.__dashPunchDebug.teamVisuals.set({outlines:false,glow:false}));
    if(scenario==="live"){
      for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state.time>.3);
      await host.keyboard.down("d");await host.keyboard.down("Shift");await guest.keyboard.down("a");await guest.keyboard.down("f");await host.waitForTimeout(180);await host.keyboard.up("Shift");await guest.keyboard.up("f");await host.waitForTimeout(250);await host.keyboard.up("d");await guest.keyboard.up("a");
      for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state.time>3.6);
    }else for(const p of [host,guest])await p.locator('[data-menu-screen="dashballResult"]').waitFor({timeout:25000});
    await host.waitForTimeout(400);const stats=[];for(const p of [host,guest])stats.push(await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;return {stats:d.online.rollback.stats,network:d.online.rollback.networkState,phase:s.phase,winner:s.winner,scores:[...s.scores],snitch:s.golden.health,ballCount:s.extraBalls.length,config:s.config,visuals:d.teamVisuals.settings};}));
    for(const s of stats){assert(!s.network.paused,s.network.status);assert.match(s.stats.hashStatus,/matched frame/);assert.equal(s.config.arena,"total-rush");assert.equal(s.config.ruleset,"battle");assert.equal(s.ballCount,balance?.ballCount||3);assert.equal(s.config.winningScore,300);for(const [key,value] of Object.entries(balance||{}))assert.equal(s.config[key],value,key);}
    assert.deepEqual(stats[0].config,stats[1].config,"host settings must be identical on both peers");
    assert.notDeepEqual(stats[0].visuals,stats[1].visuals,"local visual preferences should differ without desync");
    if(scenario==="live")assert(stats[0].stats.rollbacks+stats[1].stats.rollbacks>0);
    else {for(const s of stats){assert.equal(s.winner,1);assert(s.scores[1]>=300);}const old=stats[0].network.id;await click(host,"Rematch");for(const p of [host,guest])await p.waitForFunction(id=>window.__dashPunchDebug.online.rollback.networkState.id!==id&&window.__dashPunchDebug.online.rollback.frame>5,old);for(const p of [host,guest]){const s=await p.evaluate(()=>window.__dashPunchDebug.dashball.state);assert.deepEqual(s.scores,[0,0]);assert.equal(s.golden.health,balance?.goldenHealth||144);assert.equal(s.extraBalls.length,balance?.ballCount||3);assert.deepEqual(s.config,stats[0].config);}}
    results.push({scenario,stats});await hc.close();await gc.close();
  }
  assert.deepEqual(errors,[]);fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+"/online-results.json",JSON.stringify({passed:true,transport:"real WebRTC",delay:50,jitter:15,loss:.05,results,errors},null,2));console.log(JSON.stringify({passed:true,results,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
