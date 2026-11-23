"use strict";
const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
    const results=[],errors=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`;
    for(const ruleset of ["court","battle"]){
      const hc=await browser.newContext({viewport:{width:1600,height:1000}}),gc=await browser.newContext({viewport:{width:1600,height:1000}}),host=await hc.newPage(),guest=await gc.newPage();
      for(const p of [host,guest]){
        p.on("pageerror",e=>errors.push(e.message));
        // Identical initial ball fixtures; all movement, target collision and scoring
        // after frame zero run through the real, unmodified rollback simulation.
        await p.route("**/game.js",async route=>{const r=await route.fetch();const source=(await r.text()).replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);
          if(config.dashball?.arena==="target-break"){
            if(config.dashball.ruleset==="court")Object.assign(dashballState.ball,{x:100,y:50,vx:0,vy:1800});
            else {const target=dashballState.targets[4];Object.assign(dashballState.ball,{x:600,y:target.y,vx:-1600,vy:-100});fighters[1].health=0;scoreKnockout(fighters[0],fighters[1]);}
          }`);await route.fulfill({response:r,body:source});});
        await p.goto(url);await p.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug {pointer-events:none;}"});
      }
      const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
      await click(host,"Play");await click(host,"Dashball");
      if(ruleset==="battle"){
        await host.locator('[data-menu-action="dashballRules"]').click();
        for(let i=0;i<4;i++)await host.locator('[data-menu-action="dashballRespawnDown"]').click();
        for(let i=0;i<6;i++)await host.locator('[data-menu-action="dashballTimeDown"]').click();
      }
      await click(host,"Online 1v1");await click(host,"Target Break");await click(host,"Online 1v1");await click(host,"Host Match");
      await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);
      const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
      await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
      for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);
      for(const p of [host,guest]){
        await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");
        await click(p,"Ready");
      }
      await click(host,"Start Fight");
      for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state?.phase==="playing",{},{timeout:15000});
      // Small differing holds force prediction corrections while the ball hits targets.
      await host.keyboard.down("f");await guest.keyboard.down("Shift");await guest.waitForTimeout(100);await host.keyboard.up("f");await guest.keyboard.up("Shift");
      if(ruleset==="battle"){
        for(const p of [host,guest])await p.waitForFunction(()=>!window.__dashPunchDebug.fighters[1].koScored,{},{timeout:5000});
      }
      for(const p of [host,guest])await p.locator('[data-menu-screen="dashballResult"]').waitFor({timeout:25000});
      const states=[];for(const p of [host,guest])states.push(await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;return {scores:[...s.scores],winner:s.winner,remaining:s.targets.filter(t=>!t.destroyed).map(t=>t.id),events:s.targetEvents.map(t=>t.id),stats:d.online.rollback.stats,network:d.online.rollback.networkState};}));
      assert.deepEqual(states[0].scores,states[1].scores);assert.equal(states[0].winner,states[1].winner);assert.deepEqual(states[0].events,states[1].events);assert.equal(new Set(states[0].events).size,states[0].events.length);
      if(ruleset==="court")assert.deepEqual(states[0].scores,[0,6]);else assert(states[0].events.length>0);
      for(const state of states){assert(!state.network.paused,state.network.status);assert.match(state.stats.hashStatus,/matched frame/);}
      const id=states[0].network.id;await click(host,"Rematch");
      for(const p of [host,guest])await p.waitForFunction(id=>{const d=window.__dashPunchDebug;return d.online.rollback.networkState.id!==id&&d.online.rollback.frame>2&&d.dashball.state.targets.every(t=>!t.destroyed);},id);
      results.push({ruleset,...states[0]});await hc.close();await gc.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",transport:"real WebRTC",delay:50,jitter:15,loss:.05,results,errors}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
