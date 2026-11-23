"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/volleyball";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu","--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows"]});
  const errors=[],missing=[],page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on("pageerror",e=>errors.push(e.stack));page.on("response",r=>{if(r.status()>=400)missing.push(r.url());});
  await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("  function frame(now) {","  function frame(now) {if(window.volleyFreeze){lastTime=now;requestAnimationFrame(frame);return;}").replace("      drawDebugHitboxes();","")});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
  const click=name=>page.getByRole("button",{name,exact:true}).click();
  await click("Play");await click("Dashball");await click("Choose Fighters");
  for(const slot of await page.evaluate(()=>window.__dashPunchDebug.lobby.slots.filter(s=>!s.empty&&!s.cpu))){
    const c=page.locator(`[data-player-slot="${slot.index}"]`);await c.locator('[data-field="open"]').click();await c.locator('[data-field="confirm"]').click();await c.locator('[data-field="ready"]').click();
  }
  await click("Choose Stage");const tile=page.getByRole("button",{name:"Volleyball",exact:true});await tile.focus();
  await page.waitForFunction(()=>window.__dashPunchDebug.sportsGuide.ready);await page.waitForTimeout(150);
  assert.match(await page.locator("#sportsStageFocus").innerText(),/Keep the ball off your floor/);
  const preview=await page.locator("#sportsStageFocus canvas").evaluate(c=>{const data=c.getContext("2d").getImageData(0,0,c.width,c.height).data;return new Set(Array.from({length:data.length/4},(_,i)=>`${data[i*4]},${data[i*4+1]},${data[i*4+2]}`)).size;});assert(preview>10);
  const layouts=[];
  for(const size of [{width:1280,height:720},{width:1920,height:1080}]){
    await page.setViewportSize(size);await tile.focus();await page.waitForTimeout(100);
    const fits=await page.locator("#sportsStageFocus").evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight&&n.scrollWidth<=n.clientWidth+1;});assert(fits);await page.screenshot({path:`${out}/stage-${size.width}.png`});layouts.push({...size,fits});
  }
  await tile.click();await click("Volleyball Settings");assert.match(await page.locator('[data-menu-screen="dashballSetup"]').innerText(),/Volleyball/i);
  const rules=page.locator('[data-menu-action="dashballRules"]');if(await rules.textContent()!=="Court")await rules.click();assert.equal(await rules.textContent(),"Court");await rules.click();assert.equal(await rules.textContent(),"Battle");await click("Back");await click("Start Dashball");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
  await page.evaluate(()=>{window.volleyFreeze=true;document.body.classList.remove("menu-active");});
  const results=[];
  for(const ruleset of ["court","battle"])for(const teamSize of [1,3,5]){
    const result=await page.evaluate(({ruleset,teamSize})=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"volleyball",ruleset,teamSize},{characters:["phantom","boomerangus","whipado","gunman","spike","archer","kite","orbit","microusb","chungus"],ai:true,seed:910});
      const initial=d.dashball.state.goalSerial;for(let i=0;i<600;i++)d.dashball.step();const s=d.dashball.state,stage=d.dashball.arena,rb=d.online.rollback,hash=rb.hash();d.camera.update(1);d.stagePresentation.draw();
      return {ruleset,teamSize,count:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),halves:d.fighters.every(f=>f.team===(stage.leftTeam??0)?f.x+f.data.width/2<=stage.width/2-10:f.x-f.data.width/2>=stage.width/2+10),rallies:s.goalSerial-initial,scores:s.scores,pure:hash===rb.hash()};
    },{ruleset,teamSize});assert(result.finite&&result.halves&&result.pure);assert.equal(result.count,teamSize*2);assert(result.rallies>0);results.push(result);
  }
  for(const size of [{width:1280,height:720},{width:1920,height:1080}]){
    await page.setViewportSize(size);await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"volleyball",teamSize:5},{characters:["whipado","phantom","spike","boomerangus","kite","gunman","archer","orbit","microusb","chungus"],ai:true,seed:68});for(let i=0;i<60;i++)d.dashball.step();d.camera.update(1);d.stagePresentation.draw();});await page.locator("#game").screenshot({path:`${out}/ten-fighters-${size.width}.png`});
  }
  const high=await page.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;Object.assign(s.ball,{x:1800,y:-1800,vx:0,vy:-600});s.phase="playing";d.camera.update(1);const before={...d.camera.state};d.stagePresentation.draw();for(let i=0;i<300&&s.phase==="playing";i++)d.dashball.step();return {before,after:d.camera.state,returned:s.ball.y>0,scored:s.goalSerial>0};});assert.equal(high.before.y,0);assert.equal(high.before.zoom,.38);assert(high.returned);await page.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"volleyball",teamSize:5},{characters:["kite","orbit","phantom","gunman","spike"],ai:true});Object.assign(d.dashball.state.ball,{x:1700,y:-900,vy:0});d.stagePresentation.draw();});await page.locator("#game").screenshot({path:`${out}/high-ball-indicator.png`});
  await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>{window.__dashPunchDebug.dashball.setup({arena:"volleyball",teamSize:5},{characters:["phantom","boomerangus","gunman","archer","whipado"],ai:true,seed:69});window.volleyFreeze=false;});await page.waitForTimeout(500);
  const timing=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function next(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(next);samples.sort((a,b)=>a-b);resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,count:window.__dashPunchDebug.fighters.length});}requestAnimationFrame(next);}));assert.equal(timing.count,10);
  const offline=await browser.newPage({viewport:{width:1280,height:720}});offline.on("pageerror",e=>errors.push(e.stack));await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");
  const file=await offline.evaluate(()=>{const d=window.__dashPunchDebug;d.dashball.setup({arena:"volleyball",ruleset:"court"},{characters:["phantom","spike"]});document.getElementById("menuLayer").hidden=true;document.body.classList.remove("menu-active");for(const f of d.fighters)f.x=f.team?2400:400;const s=d.dashball.state;Object.assign(s.ball,{x:800,y:d.dashball.arena.floorY-27,vx:0,vy:2000});d.dashball.ballStep();d.stagePresentation.draw();return {scores:s.scores,phase:s.phase,arena:s.config.arena};});assert.deepEqual(file.scores,[0,1]);assert.equal(file.phase,"goal");await offline.locator("#game").screenshot({path:`${out}/offline-score.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={passed:true,root,layouts,previewColors:preview,results,high,timing,offline:file,errors,missing,physicalControllersTested:false,benchmark:"Headless software Chrome; 180 live ten-CPU frame intervals, not a hardware or controller-feel guarantee."};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
