"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,errors=[],results=[];
  for(const ruleset of ["court","battle"]){
    const hc=await browser.newContext({viewport:{width:1440,height:1000}}),gc=await browser.newContext({viewport:{width:1440,height:1000}}),host=await hc.newPage(),guest=await gc.newPage();
    for(const page of [host,guest]){
      page.on("pageerror",e=>errors.push(e.message));
      // Same deterministic switch-contact fixture on both peers, before rollback
      // starts. Subsequent switch, goal physics and transport use production code.
      await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);if(config.dashball?.arena==="gravity-soccer"){const f=fighters[0],c=currentStage().gravitySwitch;Object.assign(f,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false});f.attack={id:999,age:.1,startup:0,active:1,recovery:.2,total:1.2,charge:0,dir:{x:1,y:0},hitTargets:new Set()};Object.assign(dashballState.ball,{x:1400,y:600,vx:0,vy:0});}`)});});
      await page.goto(url);await page.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug {pointer-events:none;}"});
    }
    const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
    await click(host,"Play");await click(host,"Dashball");if(ruleset==="court")await host.locator('[data-menu-action="dashballRules"]').click();
    await click(host,"Online 1v1");await click(host,"Gravity Flip Soccer");await click(host,"Online 1v1");await click(host,"Host Match");
    await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
    for(const p of [host,guest]){
      await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);
      await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");
    }
    await click(host,"Start Fight");for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>25);
    await host.keyboard.down("d");await host.keyboard.down("Shift");await guest.keyboard.down("a");await guest.keyboard.down("f");
    await host.waitForTimeout(180);await host.keyboard.up("Shift");await guest.keyboard.up("f");await host.waitForTimeout(250);await host.keyboard.up("d");await guest.keyboard.up("a");
    for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state.time>3.6);
    const stats=[];for(const p of [host,guest])stats.push(await p.evaluate(()=>{const d=window.__dashPunchDebug;return {stats:d.online.rollback.stats,network:d.online.rollback.networkState,gravity:d.gravity.direction,goals:d.dashball.state.movingGoals,config:d.dashball.state.config};}));
    for(const s of stats){assert(!s.network.paused,s.network.status);assert.match(s.stats.hashStatus,/matched frame/);assert.equal(s.config.ruleset,ruleset);assert.equal(s.gravity,-1);assert(s.goals.every(g=>g.y<600),JSON.stringify(s));}
    assert(stats[0].stats.rollbacks+stats[1].stats.rollbacks>0);results.push({ruleset,stats});await hc.close();await gc.close();
  }
  assert.deepEqual(errors,[]);fs.mkdirSync("artifacts/gravity-soccer",{recursive:true});fs.writeFileSync("artifacts/gravity-soccer/online-results.json",JSON.stringify({transport:"real WebRTC",delay:50,jitter:15,loss:.05,results,errors},null,2));console.log(JSON.stringify({passed:true,results,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
