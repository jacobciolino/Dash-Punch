"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/local-hitstop";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const errors=[],results=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`,click=async(p,name)=>{
    await p.waitForFunction(()=>{const menu=window.__dashPunchDebug?.radialMenu;return !menu?.wipe&&!menu?.active.length;});
    await p.getByRole("button",{name,exact:true}).click();
  };
  for(const character of["edgebert","boomerangus"]){
    const hc=await browser.newContext({viewport:{width:1280,height:900}}),gc=await browser.newContext({viewport:{width:1280,height:900}}),host=await hc.newPage(),guest=await gc.newPage();
    for(const page of[host,guest]){
      page.on("pageerror",e=>errors.push(e.stack));
      // The same pre-start positioning fixture goes to both peers. Inputs,
      // contact detection, pauses and replay still run through real WebRTC rollback.
      await page.route("**/game.js",async route=>{const response=await route.fetch(),source=await response.text(),fixture=`fighters.forEach((f,i)=>{const x=500+i*${character==="edgebert"?85:650},y=currentStage().floorY-f.data.height/2;Object.assign(f,{x,y,prevX:x,prevY:y,onGround:true,vx:0,vy:0,invulnerable:0});});`;
        assert(source.includes("    beginMatchSession();\n    rollbackManager"));await route.fulfill({response,body:source.replace("    beginMatchSession();\n    rollbackManager",`    beginMatchSession();${fixture}\n    rollbackManager`)});});
      await page.goto(url);await page.addStyleTag({content:".network-debug {pointer-events:none;}"});await click(page,"Play");await click(page,"Online 1v1");
    }
    await click(host,"Host Match");await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
    for(const[i,page]of[host,guest].entries()){
      await page.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.online.state.transport),"webrtc");await click(page,"Choose Fighter");await page.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${i&&character==="edgebert"?"anchor":character}"]`).click();
      for(const[key,value]of[["delay","50"],["jitter","15"],["loss","0.05"]])await page.locator(`[data-net="${key}"]`).selectOption(value);await click(page,"Ready");
    }
    await click(host,"Start Fight");
    for(const page of[host,guest]){
      await page.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state?.phase==="playing");
      await page.evaluate(()=>{window.impactProbe={maxCombo:0,maxStop:0,contacts:false,maxCharge:0,maxWeapons:0,weaponIds:[]};function sample(){const d=window.__dashPunchDebug,p=window.impactProbe;p.maxCombo=Math.max(p.maxCombo,...d.fighters.map(f=>f.comboHits));p.maxStop=Math.max(p.maxStop,...d.fighters.map(f=>f.hitstop));p.contacts||=d.impactFeedback.effects.some(e=>e.combatImpact);const shots=d.fighters.flatMap(f=>f.projectiles);p.maxWeapons=Math.max(p.maxWeapons,shots.length);for(const a of shots){p.maxCharge=Math.max(p.maxCharge,a.projectile.boomerang?.recallCharge||0);if(!p.weaponIds.includes(a.id))p.weaponIds.push(a.id);}requestAnimationFrame(sample);}requestAnimationFrame(sample);});
    }
    await host.waitForTimeout(100);await host.bringToFront();await host.keyboard.down("f");await host.waitForTimeout(80);await host.keyboard.up("f");
    if(character==="edgebert")await host.waitForFunction(()=>window.impactProbe.maxCombo===3,{},{timeout:5000});
    else {await host.waitForFunction(()=>window.__dashPunchDebug.fighters[0].projectiles.length===1,{},{timeout:5000});await host.keyboard.down("f");await host.waitForTimeout(1100);await host.keyboard.up("f");}
    await host.waitForTimeout(1300);const peers=[];
    for(const page of[host,guest])peers.push(await page.evaluate(()=>{const d=window.__dashPunchDebug;return {stats:d.online.rollback.stats,network:d.online.rollback.networkState,probe:window.impactProbe};}));
    for(const peer of peers){assert(!peer.network.paused,peer.network.status);assert.match(peer.stats.hashStatus,/matched frame/);if(character==="edgebert"){assert.equal(peer.probe.maxCombo,3);assert(peer.probe.maxStop>0&&peer.probe.contacts);}else{assert(peer.probe.maxCharge>0);assert.equal(peer.probe.maxWeapons,1);assert.equal(peer.probe.weaponIds.length,1);}}
    assert(peers[0].stats.rollbacks+peers[1].stats.rollbacks>0);const session=peers[0].network.id;
    await host.bringToFront();await host.keyboard.press("Escape");for(const page of[host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);await click(host,"Rematch");
    for(const page of[host,guest])await page.waitForFunction(id=>window.__dashPunchDebug.online.rollback.networkState.id!==id&&window.__dashPunchDebug.online.rollback.frame>5,session);
    results.push({character,peers,rematch:true});await hc.close();await gc.close();
  }
  assert.deepEqual(errors,[]);const report={passed:true,transport:"real WebRTC 1v1",delay:50,jitter:15,loss:.05,results,errors};fs.writeFileSync(`${out}/online-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
