"use strict";
const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
    const results=[],errors=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`;
    for(const [ruleset,label] of [["race","Damage Race"],["brawl","Damage Brawl"],["scramble","Sandbag Scramble"]]){
      const hc=await browser.newContext({viewport:{width:1440,height:1000}}),gc=await browser.newContext({viewport:{width:1440,height:1000}}),host=await hc.newPage(),guest=await gc.newPage();
      for(const p of [host,guest]){
        p.on("pageerror",e=>errors.push(e.message));
        // Matching near-expiry fixture; subsequent collision, scoring, delayed input,
        // result confirmation and rematch all run through production paths.
        await p.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);if(config.sandbag){sandbagState.remaining=.12;sandbagState.scores=[7,7];const f=fighters[0],b=sandbagState.bags[0];Object.assign(f,{x:b.x-100,y:b.y,prevX:b.x-100,prevY:b.y});f.attack={id:900001,age:.1,startup:0,active:.7,recovery:.1,total:1,dir:{x:1,y:0},charge:0,grounded:false,hitTargets:new Set()};}`)});});
        await p.goto(url);await p.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug {pointer-events:none;}"});
      }
      const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
      await click(host,"Play");await click(host,"Sandbag Showdown");await click(host,label);await click(host,"Online 1v1");await click(host,"Host Match");
      await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
      await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
      for(const p of [host,guest]){
        await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await p.waitForFunction(()=>/sandbag online/i.test(document.querySelector("#menuLayer").innerText));
        await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");
      }
      await click(host,"Start Fight");for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.state.matchActive);
      await host.keyboard.down("d");await guest.keyboard.down("a");await host.waitForTimeout(130);await host.keyboard.up("d");await guest.keyboard.up("a");
      for(const p of [host,guest])await p.locator('[data-menu-screen="sandbagResult"]').waitFor({timeout:25000});await host.waitForTimeout(500);
      const states=[];for(const p of [host,guest])states.push(await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.sandbag.state;return {ruleset:s.config.ruleset,scores:[...s.scores],winner:s.winner,serial:s.eventSerial,events:s.events,stats:d.online.rollback.stats,network:d.online.rollback.networkState};}));
      assert.deepEqual(states[0].scores,states[1].scores);assert.deepEqual(states[0].events,states[1].events);assert.equal(states[0].ruleset,ruleset);assert.equal(states[0].winner,0);assert.equal(states[0].serial,1);
      for(const s of states){assert(!s.network.paused,s.network.status);assert.match(s.stats.hashStatus,/matched frame/);}assert(states[0].stats.rollbacks+states[1].stats.rollbacks>0);
      const old=states[0].network.id;await click(host,"Rematch");for(const p of [host,guest])await p.waitForFunction(id=>{const d=window.__dashPunchDebug;return d.online.rollback.networkState.id!==id&&d.online.rollback.frame>2&&d.sandbag.state.phase==="countdown";},old);
      results.push(states[0]);await hc.close();await gc.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",transport:"real WebRTC",delay:50,jitter:15,loss:.05,results,errors}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
