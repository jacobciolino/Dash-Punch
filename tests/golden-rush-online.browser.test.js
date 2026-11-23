"use strict";
const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
    const results=[],errors=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`;
    for(const event of ["ring","golden"]){
      const hc=await browser.newContext({viewport:{width:1600,height:1000}}),gc=await browser.newContext({viewport:{width:1600,height:1000}}),host=await hc.newPage(),guest=await gc.newPage();
      for(const p of [host,guest]){
        p.on("pageerror",e=>errors.push(e.message));
        // Identical near-victory fixture before rollback starts. Physics, attacks,
        // scoring, transport and rematches thereafter use the production paths.
        await p.route("**/game.js",async route=>{const r=await route.fetch();const fixture=event==="ring"?`dashballState.scores[0]=99;dashballState.ringPoints[0]=99;const ring=currentStage().rings.find(r=>r.team===1&&r.row===0);Object.assign(dashballState.ball,{x:ring.line-1000,y:(ring.top+ring.bottom)/2,vx:1800,vy:-220});`:
          `dashballState.scores[0]=90;dashballState.ringPoints[0]=90;dashballState.golden.health=1;const f=fighters[0];Object.assign(f,{x:1300,y:1100,prevX:1300,prevY:1100});f.attack={id:999,age:.1,startup:0,active:.3,recovery:.2,total:.5,dir:{x:1,y:0},charge:0,hitTargets:new Set()};const box=getPunchHitbox(f,{x:1,y:0},0);Object.assign(dashballState.golden,{x:box.cx,y:box.cy});`;
          await route.fulfill({response:r,body:(await r.text()).replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);if(config.dashball?.arena==="golden-rush"){${fixture}}`)});
        });await p.goto(url);await p.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug {pointer-events:none;}"});
      }
      const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
      await click(host,"Play");await click(host,"Dashball");await click(host,"Online 1v1");await click(host,"Golden Rush");await click(host,"Online 1v1");await click(host,"Host Match");
      await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
      await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
      for(const p of [host,guest]){await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");}
      await click(host,"Start Fight");for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.state.matchActive);
      await host.keyboard.down("d");await guest.keyboard.down("a");await host.waitForTimeout(120);await host.keyboard.up("d");await guest.keyboard.up("a");
      for(const p of [host,guest])try{await p.locator('[data-menu-screen="dashballResult"]').waitFor({timeout:25000});}catch(error){
        console.error(JSON.stringify({event,debug:await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;return {network:d.online.rollback.networkState,stats:d.online.rollback.stats,phase:s?.phase,scores:s?.scores,config:s?.config,ball:s?.ball,golden:s?.golden,menu:document.querySelector("#menuLayer")?.innerText};})}));throw error;
      }
      await host.waitForTimeout(600);const states=[];
      for(const p of [host,guest])states.push(await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;return {scores:[...s.scores],rings:[...s.ringPoints],captures:[...s.captures],winner:s.winner,balls:[s.ball,...s.extraBalls].map(b=>b.id),stats:d.online.rollback.stats,network:d.online.rollback.networkState};}));
      assert.deepEqual(states[0].scores,states[1].scores);assert.deepEqual(states[0].captures,states[1].captures);assert.equal(states[0].winner,0);assert.equal(states[0].scores[0],event==="ring"?100:105);assert.equal(states[0].balls.length,3);
      for(const s of states){assert(!s.network.paused,s.network.status);assert.match(s.stats.hashStatus,/matched frame/);}
      assert(states[0].stats.rollbacks+states[1].stats.rollbacks>0);
      const old=states[0].network.id;await click(host,"Rematch");for(const p of [host,guest])await p.waitForFunction(id=>{const d=window.__dashPunchDebug;return d.online.rollback.networkState.id!==id&&d.online.rollback.frame>2&&d.dashball.state.extraBalls.length===2;},old);
      results.push({event,...states[0]});await hc.close();await gc.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",transport:"real WebRTC",delay:50,jitter:15,loss:.05,results,errors}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
