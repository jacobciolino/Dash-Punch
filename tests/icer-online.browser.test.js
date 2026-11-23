"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/icer";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const errors=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,hc=await browser.newContext(),gc=await browser.newContext(),host=await hc.newPage(),guest=await gc.newPage();
  const click=async(p,name)=>{await p.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});await p.getByRole("button",{name,exact:true}).click();};
  for(const page of[host,guest]){
    page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/game.js",async route=>{const response=await route.fetch(),source=await response.text(),marker="    beginMatchSession();\n    rollbackManager";
      assert(source.includes(marker));const pose="fighters.forEach((f,i)=>{const x=200+i*750,y=currentStage().floorY-f.data.height/2-650;Object.assign(f,{x,y,prevX:x,prevY:y,onGround:false,vx:0,vy:0,invulnerable:0});});";
      await route.fulfill({response,body:source.replace(marker,`    beginMatchSession();${pose}\n    rollbackManager`)});
    });await page.goto(url);await page.addStyleTag({content:".network-debug{pointer-events:none}"});await click(page,"Play");await click(page,"Online 1v1");
  }
  await click(host,"Host Match");await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const room=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);await guest.locator("#onlineRoomCode").fill(room);await click(guest,"Join Match");
  for(const[i,page]of[host,guest].entries()){
    await page.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await click(page,"Choose Fighter");await page.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${i?"anchor":"icer"}"]`).click();
    for(const[key,value]of[["delay","50"],["jitter","15"],["loss","0.05"]])await page.locator(`[data-net="${key}"]`).selectOption(value);await click(page,"Ready");
  }
  await click(host,"Start Fight");for(const page of[host,guest]){
    await page.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state?.phase==="playing");
    await page.evaluate(()=>{window.iceProbe={peak:0,patches:0,finite:true};function probe(){const d=window.__dashPunchDebug,f=d.fighters[0],p=window.iceProbe;p.peak=Math.max(p.peak,f.ice.icicles.length);p.patches=Math.max(p.patches,f.ice.patches.length);p.finite&&=f.ice.icicles.every(c=>[c.x,c.y,c.vy,c.age].every(Number.isFinite));requestAnimationFrame(probe);}requestAnimationFrame(probe);});
  }
  await host.bringToFront();await host.keyboard.down("d");await host.keyboard.down("w");await host.keyboard.down("ShiftLeft");await host.waitForTimeout(65);await host.keyboard.up("ShiftLeft");await host.keyboard.up("w");await host.keyboard.up("d");
  for(const page of[host,guest])await page.waitForFunction(()=>window.iceProbe.peak>=3,null,{timeout:6000});await host.waitForTimeout(600);
  const peers=[];for(const page of[host,guest])peers.push(await page.evaluate(()=>{const d=window.__dashPunchDebug;return {characters:d.fighters.map(f=>f.data.name),probe:window.iceProbe,stats:d.online.rollback.stats,network:d.online.rollback.networkState,transport:d.online.state.transport};}));
  for(const p of peers){assert.deepEqual(p.characters,["Icer","Anchor"]);assert.equal(p.transport,"webrtc");assert(p.probe.peak>=3&&p.probe.finite);assert(!p.network.paused,p.network.status);assert.match(p.stats.hashStatus,/matched frame/);}assert(peers[0].stats.rollbacks+peers[1].stats.rollbacks>0);
  const session=peers[0].network.id;await host.keyboard.press("Escape");for(const page of[host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);await click(host,"Rematch");
  for(const page of[host,guest]){await page.waitForFunction(id=>{const d=window.__dashPunchDebug;return d.online.rollback.networkState.id!==id&&d.online.rollback.frame>5;},session);const empty=await page.evaluate(()=>{const f=window.__dashPunchDebug.fighters[0];return !f.ice.icicles.length&&!f.ice.patches.length&&!f.ice.trail;});assert(empty);}
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/online-results.json`,JSON.stringify({passed:true,peers,rematch:true,delay:50,jitter:15,loss:.05,errors,limitations:"Identical pre-start airborne position fixture on both peers; dash inputs, hazards and synchronization use production WebRTC rollback."},null,2));console.log(JSON.stringify({passed:true,transport:"WebRTC 1v1",rematch:true,peers:peers.map(p=>({peak:p.probe.peak,rollbacks:p.stats.rollbacks,hash:p.stats.hashStatus})),errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
