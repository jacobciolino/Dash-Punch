"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),tested=process.env.STATUS_TEST_FIGHTER||"booster",out=`artifacts/${tested}`,{server}=require(path.join(root,"server.js"));
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});const errors=[],missing=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1&netDebug=1`;
  const watch=p=>{p.on("pageerror",e=>errors.push(e.stack));p.on("response",r=>{if(r.status()>=400)missing.push(r.url());});};
  const p=await browser.newPage({viewport:{width:1280,height:720}});watch(p);
  const source=fs.readFileSync(path.join(root,"game.js"),"utf8");await p.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {if(window.boosterFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")}));
  await p.goto(url);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");await p.getByRole("button",{name:"Play",exact:true}).click();await p.getByRole("button",{name:"Local",exact:true}).click();
  await p.addStyleTag({content:".network-debug{display:none}"});
  const tile=p.locator(`[data-menu-action="chooseCharacter"][data-character="${tested==="lamer"?16:15}"]`);await tile.hover();await tile.click();assert.equal(await p.locator(".character-tile").count(),19);await p.waitForTimeout(250);
  for(const size of[{width:1280,height:720},{width:1920,height:1080}]){await p.setViewportSize(size);await p.screenshot({path:`${out}/roster-${size.width}.png`});const rect=await tile.boundingBox();assert(rect&&rect.x>=0&&rect.y+rect.height<=size.height);}
  const local=await p.evaluate(async()=>{
    window.boosterFreeze=true;const d=window.__dashPunchDebug;document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");
    d.dashball.setup({arena:"standard",ruleset:"court",teamSize:5},{characters:["booster","lamer","booster","spike","lamer","kite","booster","chungus","lamer","phantom"],ai:false,seed:106});
    const art=window.DASH_PUNCH_ART;for(const key of["booster","lamer","spike","kite","chungus","phantom"]){const set=art.spriteSets[art.assignments[key].spriteSet];await Promise.all(Object.values(set.clips).map(c=>{const i=new Image();i.src=c.src;return i.decode();}));}
    const buffTargets=[2,4,6,8];for(const i of buffTargets)d.booster.apply(i,i/8);for(const i of[1,4,7])for(let n=0;n<3;n++)d.lamer.apply(i);d.camera.update(1);const hash=d.online.rollback.hash();d.stagePresentation.draw();return {pure:hash===d.online.rollback.hash(),players:d.fighters.length,buffTargets,scales:d.booster.scales(8)};
  });assert(local.pure);assert.equal(local.players,10);assert.equal(local.scales.power,1.5);
  for(const size of[{width:1280,height:720},{width:1920,height:1080}]){await p.setViewportSize(size);await p.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await p.locator("#game").screenshot({path:`${out}/court-buffs-${size.width}.png`});}
  await p.evaluate(()=>{const d=window.__dashPunchDebug;d.gravity.setDirection("y",-1);d.stagePresentation.draw();});await p.locator("#game").screenshot({path:`${out}/inverted-buffs.png`});
  const projections=await p.evaluate(()=>{
    const d=window.__dashPunchDebug,rb=d.online.rollback;d.dashball.standard();rb.setup({stageIndex:rb.stageNames.indexOf("Crosswire"),characterKeys:["booster","lamer"],seed:106});
    const hash=rb.hash(),samples=[];for(const index of[0,1])for(const charge of[0,1])for(const dir of[{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:.7,y:.7}]){
      const pose=d.lamer.projection(index,dir,charge),art=d.lamer.art(index,dir,charge),again=d.lamer.art(index,dir,charge),data=art.getContext("2d").getImageData(0,0,art.width,art.height).data;let opaque=0,partial=0;
      for(let i=3;i<data.length;i+=4){if(data[i]===255)opaque++;else if(data[i])partial++;}samples.push({kind:pose.kind,charge,dir,opaque,partial,reused:art===again,pixel:pose.pixel});
    }
    for(let n=0;n<300;n++)d.lamer.art(n%2,{x:Math.cos(n*.17),y:Math.sin(n*.17)},(n%101)/100);
    return {pure:hash===rb.hash(),samples,cacheSize:d.lamer.cacheSize};
  });assert(projections.pure);assert(projections.cacheSize<=128);for(const s of projections.samples){assert(s.opaque>10&&s.partial===0&&s.reused&&s.pixel===3);}
  for(const charge of[0,1])for(const left of[false,true]){
    await p.evaluate(({charge,left})=>{const d=window.__dashPunchDebug;for(const[i,f]of d.fighters.entries()){f.x=480+i*250;f.y=470;f.prevX=f.x;f.prevY=f.y;f.invulnerable=0;d.booster.punch(i,charge,{x:left?-1:1,y:0});f.attack.age=f.attack.startup+.01;}d.camera.update(1);d.stagePresentation.draw();},{charge,left});
    for(const size of[{width:1280,height:720},{width:1920,height:1080}]){await p.setViewportSize(size);await p.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());await p.locator("#game").screenshot({path:`${out}/projections-${charge}-${left?"left":"right"}-${size.width}.png`});}
  }
  const victory=await p.evaluate(async key=>{
    const d=window.__dashPunchDebug,rb=d.online.rollback;d.dashball.standard();rb.setup({stageIndex:rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"anchor"],seed:106});d.matchFlow.begin({countdown:false});
    for(let round=0;round<2;round++){d.matchFlow.knockout(1);for(let i=0;i<301;i++)d.matchFlow.step();}d.matchFlow.present();d.matchFlow.victory(4300);const hash=rb.hash();d.matchFlow.victory(4400);const c=document.getElementById("victoryCanvas"),data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let opaque=0;for(let i=3;i<data.length;i+=4)if(data[i])opaque++;return {winner:d.matchFlow.state.winner,pure:hash===rb.hash(),opaque};
  },tested);assert(victory.pure&&victory.opaque>100);await p.screenshot({path:`${out}/victory.png`});await p.close();
  // Real private WebRTC: normal host/guest selection and native charged Punch.
  const hc=await browser.newContext(),gc=await browser.newContext(),host=await hc.newPage(),guest=await gc.newPage();
  for(const peer of[host,guest]){watch(peer);await peer.route("**/game.js",async r=>{const response=await r.fetch(),js=await response.text();const marker="    beginMatchSession();\n    rollbackManager";assert(js.includes(marker));await r.fulfill({response,body:js.replace(marker,"    beginMatchSession();fighters[0].x=510;fighters[1].x=585;\n    rollbackManager")});});await peer.goto(url);await peer.addStyleTag({content:".network-debug{pointer-events:none}"});}
  const click=(peer,name)=>peer.getByRole("button",{name,exact:true}).click();await click(host,"Play");await click(host,"Online 1v1");await click(host,"Host Match");await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);const room=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
  await click(guest,"Play");await click(guest,"Online 1v1");await guest.locator("#onlineRoomCode").fill(room);await click(guest,"Join Match");
  for(const peer of[host,guest]){await peer.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);await click(peer,"Choose Fighter");await peer.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${peer===host?tested:"booster"}"]`).click();await click(peer,"Ready");}
  await click(host,"Start Fight");for(const peer of[host,guest])await peer.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state?.phase==="playing");
  await host.bringToFront();await host.keyboard.down("f");await host.waitForTimeout(3100);await host.keyboard.up("f");for(const peer of[host,guest])await peer.waitForFunction(key=>{const f=window.__dashPunchDebug.fighters[1];return key==="lamer"?f.lamerSuppression?.stacks===1:f.boosterEnhancement?.charge>.99;},tested,{timeout:10000});
  const peers=[];for(const peer of[host,guest])peers.push(await peer.evaluate(key=>{const d=window.__dashPunchDebug;return {characters:d.fighters.map(f=>f.data.name),buff:key==="lamer"?d.fighters[1].lamerSuppression:d.fighters[1].boosterEnhancement,health:d.fighters[1].health,stats:d.online.rollback.stats,transport:d.online.state.transport};},tested));
  assert.deepEqual(peers[0].characters,[tested==="lamer"?"Lamer":"Booster","Booster"]);assert.equal(peers[0].buff.charge,peers[1].buff.charge);assert.equal(peers[0].buff.stacks,peers[1].buff.stacks);assert.equal(peers[0].health,peers[1].health);assert(Math.abs(peers[0].buff.remaining-peers[1].buff.remaining)<.3);for(const peer of peers){assert.equal(peer.transport,"webrtc");assert.match(peer.stats.hashStatus,/matched frame/);}
  await hc.close();await gc.close();assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={passed:true,roster:19,local,projections,victory,online:peers,errors,missing,physicalControllersTested:false};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
