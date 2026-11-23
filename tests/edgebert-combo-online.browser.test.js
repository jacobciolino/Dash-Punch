"use strict";
const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
    const hc=await browser.newContext({viewport:{width:1600,height:1000}}),gc=await browser.newContext({viewport:{width:1600,height:1000}}),host=await hc.newPage(),guest=await gc.newPage(),errors=[];
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
    for(const p of [host,guest]){p.on("pageerror",e=>errors.push(e.message));await p.goto(url);await click(p,"Play");await click(p,"Online 1v1");}
    await click(host,"Host Match");await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);
    await click(host,"Choose Fighter");await host.locator('[data-menu-action="chooseOnlineCharacter"][data-character="edgebert"]').click();
    await click(guest,"Choose Fighter");await guest.locator('[data-menu-action="chooseOnlineCharacter"][data-character="orbit"]').click();
    for(const p of [host,guest]){await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");}
    await click(host,"Start Fight");for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>30);
    const stages=[];
    for(let i=0;i<3;i++){
      await host.keyboard.down("f");await host.waitForTimeout(35);await host.keyboard.up("f");
      await host.waitForFunction(stage=>window.__dashPunchDebug.fighters[0].attack?.sequenceStage===stage,i,{timeout:1500});
      stages.push(await host.evaluate(()=>window.__dashPunchDebug.fighters[0].attack.sequenceStage));
      if(i<2)await host.waitForTimeout(i===0?180:130);
    }
    await host.waitForTimeout(700);const stats=[];for(const p of [host,guest])stats.push(await p.evaluate(()=>({stats:window.__dashPunchDebug.online.rollback.stats,network:window.__dashPunchDebug.online.rollback.networkState})));
    for(const s of stats){assert(!s.network.paused,s.network.status);assert.match(s.stats.hashStatus,/matched frame/);}assert(stats[0].stats.rollbacks+stats[1].stats.rollbacks>0);assert.deepEqual(stages,[0,1,2]);
    const old=stats[0].network.id;await host.keyboard.press("Escape");for(const p of [host,guest])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);await click(host,"Rematch");
    for(const p of [host,guest])await p.waitForFunction(id=>{const d=window.__dashPunchDebug;return d.online.rollback.networkState.id!==id&&d.online.rollback.frame>20&&d.fighters[0].data.name==="Edgebert"&&d.fighters[0].edgebertChain===null;},old);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",transport:"real WebRTC",stages,delay:50,jitter:15,loss:.05,rematch:true,stats,errors}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
