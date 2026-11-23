"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(__dirname,".."),{server}=require(path.join(root,"server.js")),out="artifacts/gameplay-repair";
const cases=[
  {arena:"standard",name:"Soccer",score:0},
  {arena:"elevated",name:"Basketball",score:1},
  {arena:"golden-rush",name:"Golden Rush",score:0},
  {arena:"boulder-control",name:"Boulder Control",rider:true},
  {arena:"gravity-boulder",name:"Gravity Flip Boulder Control",rider:true,flip:true},
  {arena:"total-rush",name:"Total Rush",rider:true}
];
(async()=>{let browser;try{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const errors=[],results=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,click=(p,name)=>p.getByRole("button",{name,exact:true}).click();
  for(const test of cases){
    const hc=await browser.newContext({viewport:{width:1440,height:1000}}),gc=await browser.newContext({viewport:{width:1440,height:1000}}),h=await hc.newPage(),g=await gc.newPage();
    for(const p of [h,g]){
      p.on("pageerror",e=>errors.push(e.stack));
      // Both peers receive exactly the same initial fixture before rollback starts.
      // No live network state is mutated to manufacture agreement.
      await p.route("**/game.js",async route=>{const response=await route.fetch(),source=await response.text();const fixture=`
        if(config.dashball&&!window.repairFixtureUsed){window.repairFixtureUsed=true;
          const s=dashballState,stage=currentStage(),b=s.ball;
          if(stage.dashballArena==="standard"){const goal=stage.goals[1];Object.assign(b,{x:goal.line-30,y:goal.bottom-b.r-.01,vx:2050,vy:0});}
          if(stage.dashballArena==="elevated"){const goal=stage.goals[0];Object.assign(b,{x:goal.right-51,y:goal.top-25,vx:1500,vy:1500});}
          if(stage.dashballArena==="golden-rush"){const ring=stage.rings.find(r=>r.team===1&&r.row===1);Object.assign(b,{x:ring.line-30,y:(ring.top+ring.bottom)/2,vx:2050,vy:0});Object.assign(s.golden,{x:stage.width/2,y:1100,hitstun:.45,vx:500,vy:-120});}
          if(s.boulder){const f=fighters[${test.flip?1:0}];Object.assign(b,{x:stage.width/2,y:stage.floorY-b.r-.01,vx:100,vy:0});const y=b.y-b.r-f.data.height/2-1;Object.assign(f,{x:b.x,y,prevX:b.x,prevY:y,onGround:true,groundTerrainId:"boulder:top",vx:0,vy:0,invulnerable:0});}
          ${test.flip?'const f=fighters[0],c=stage.gravitySwitch;Object.assign(f,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false});f.attack={id:999,dir:{x:1,y:0},charge:0,age:.1,startup:0,active:1,recovery:.2,total:1.2,hitTargets:new Set()};':""}
        }`;
        assert(source.includes("    initializeSimulation(config.seed);"));await route.fulfill({response,body:source.replace("    initializeSimulation(config.seed);",`    initializeSimulation(config.seed);${fixture}`)});
      });
      await p.goto(url);await p.addStyleTag({content:".menu-active:not(.countdown-active) .network-debug {pointer-events:none;}"});
      await p.evaluate(()=>{window.repairProbe={maxRiders:0,flipped:false,maxScores:[0,0],maxStun:0};function sample(){const d=window.__dashPunchDebug,s=d?.dashball.state;if(s){const q=window.repairProbe;q.maxRiders=Math.max(q.maxRiders,d.fighters.filter(f=>f.groundTerrainId==="boulder:top").length);q.flipped||=d.gravity.direction===-1;for(let i=0;i<2;i++)q.maxScores[i]=Math.max(q.maxScores[i],s.scores[i]);q.maxStun=Math.max(q.maxStun,s.golden?.hitstun||0);}requestAnimationFrame(sample);}requestAnimationFrame(sample);});
    }
    await click(h,"Play");await click(h,"Dashball");await click(h,"Online 1v1");await click(h,test.name);await click(h,"Online 1v1");await click(h,"Host Match");
    await h.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await h.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await click(g,"Play");await click(g,"Online 1v1");await g.locator("#onlineRoomCode").fill(code);await click(g,"Join Match");
    for(const [i,p] of [h,g].entries()){
      await p.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await click(p,"Choose Fighter");await p.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${(test.flip?i===0:i===1)?"edgebert":"boomerangus"}"]`).click();
      await p.locator('[data-net="delay"]').selectOption("50");await p.locator('[data-net="jitter"]').selectOption("15");await p.locator('[data-net="loss"]').selectOption("0.05");await click(p,"Ready");
    }
    await click(h,"Start Fight");for(const p of [h,g])await p.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state?.time>.3);
    await h.bringToFront();await h.keyboard.down("d");await h.waitForTimeout(180);await h.keyboard.up("d");
    await g.bringToFront();await g.keyboard.down("f");await g.waitForTimeout(100);await g.keyboard.up("f");
    for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.dashball.state.time>4,{},{timeout:20000});
    const peers=[];for(const p of [h,g])peers.push(await p.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;return {stats:d.online.rollback.stats,network:d.online.rollback.networkState,config:s.config,probe:window.repairProbe,ballCount:window.Dashball.balls(s).length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite))};}));
    for(const peer of peers){assert(!peer.network.paused,peer.network.status);assert.match(peer.stats.hashStatus,/matched frame/);assert(peer.finite);assert.equal(peer.config.arena,test.arena);if(test.score!==undefined)assert(peer.probe.maxScores[test.score]>=1,JSON.stringify(peer.probe));if(test.rider)assert(peer.probe.maxRiders>0);if(test.flip)assert(peer.probe.flipped);if(test.arena==="golden-rush"){assert.equal(peer.ballCount,10);assert(peer.probe.maxStun>0);}}
    assert.deepEqual(peers[0].config,peers[1].config);assert(peers[0].stats.rollbacks+peers[1].stats.rollbacks>0);
    const id=peers[0].network.id;await h.bringToFront();await h.keyboard.press("Escape");for(const p of [h,g])await p.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);await click(h,"Rematch");
    for(const p of [h,g]){await p.waitForFunction(id=>window.__dashPunchDebug.online.rollback.networkState.id!==id&&window.__dashPunchDebug.online.rollback.frame>5,id);const reset=await p.evaluate(()=>({scores:window.__dashPunchDebug.dashball.state.scores,gravity:window.__dashPunchDebug.gravity.direction}));assert.deepEqual(reset.scores,[0,0]);assert.equal(reset.gravity,1);}
    results.push({arena:test.arena,peers,rematch:true});console.log(`ok real WebRTC repair: ${test.name}`);await hc.close();await gc.close();
  }
  assert.deepEqual(errors,[]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/online-results.json`,JSON.stringify({passed:true,root,transport:"real WebRTC",delay:50,jitter:15,loss:.05,results,errors},null,2));console.log("6 online gameplay repair scenarios passed");
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
