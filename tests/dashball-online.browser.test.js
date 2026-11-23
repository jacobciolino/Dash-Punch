"use strict";
const assert=require("node:assert/strict"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,results=[],errors=[];
    for(const ruleset of ["court","battle"])for(const arena of ["standard","elevated","elevated-open"]){
      const hc=await browser.newContext({viewport:{width:1600,height:1000}}),gc=await browser.newContext({viewport:{width:1600,height:1000}}),h=await hc.newPage(),g=await gc.newPage();
      for(const p of [h,g])p.on("pageerror",e=>errors.push(e.message));
      await h.goto(url);await g.goto(url);
      for(const p of [h,g])await p.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug { pointer-events:none; }"});
      const click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
      await click(h,"Play");await click(h,"Dashball");
      if(ruleset==="battle")await h.locator('[data-menu-action="dashballRules"]').click();
      const finish=ruleset==="court"&&arena==="standard";
      if(finish){for(let i=0;i<6;i++)await h.locator('[data-menu-action="dashballTimeDown"]').click();await h.locator('[data-menu-action="dashballOvertime"]').click();}
      await click(h,"Online 1v1");
      await click(h,{standard:"Soccer",elevated:"Basketball","elevated-open":"Wrap Around Basketball"}[arena]);
      await click(h,"Online 1v1");await click(h,"Host Match");
      await h.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);
      const code=await h.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
      await click(g,"Play");await click(g,"Online 1v1");await g.locator("#onlineRoomCode").fill(code);await click(g,"Join Match");
      for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);
      await g.getByRole("heading",{name:"Dashball Online 1v1",exact:true}).waitFor();
      for(const p of [h,g])await click(p,"Ready");await click(h,"Start Fight");
      for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state?.phase==="playing",{},{timeout:15000});
      for(const p of [h,g]){
        await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");
      }
      await h.keyboard.down("f");await h.keyboard.down("Shift");await h.keyboard.down("d");
      await g.keyboard.down("f");await g.keyboard.down("a");await h.waitForTimeout(220);
      await h.keyboard.up("Shift");await h.waitForTimeout(220);await h.keyboard.up("f");await g.keyboard.up("f");
      await h.waitForTimeout(800);await h.keyboard.up("d");await g.keyboard.up("a");
      for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>270);
      const stats=[];for(const p of [h,g])stats.push(await p.evaluate(()=>({stats:window.__dashPunchDebug.online.rollback.stats,state:window.__dashPunchDebug.online.rollback.networkState,mode:window.__dashPunchDebug.dashball.state.config})));
      for(const s of stats){assert.equal(s.state.paused,false,s.state.status);assert.match(s.stats.hashStatus,/matched frame/);assert.equal(s.mode.ruleset,ruleset);assert.equal(s.mode.arena,arena);}
      assert(stats[0].stats.rollbacks+stats[1].stats.rollbacks>0);
      if(finish){
        for(const p of [h,g])await p.locator('[data-menu-screen="dashballResult"]').waitFor({timeout:25000});
        const old=stats[0].state.id;await click(h,"Rematch");
        for(const p of [h,g])await p.waitForFunction(id=>window.__dashPunchDebug.online.rollback.networkState.id!==id&&window.__dashPunchDebug.online.rollback.frame>5,old);
      }
      results.push({ruleset,arena,finishAndRematch:finish,stats});await hc.close();await gc.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({transport:"real WebRTC",results,errors}));
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
