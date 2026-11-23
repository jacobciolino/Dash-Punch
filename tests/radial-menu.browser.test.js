"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/radial-menu";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{window.freeze=true;window.pads=Array.from({length:10},(_,index)=>({index,id:`Couch ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});});
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {if(window.freeze){lastTime=now;requestAnimationFrame(frame);return;}");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  async function draw(){await page.evaluate(()=>window.__dashPunchDebug.radialMenu.draw(performance.now()));}
  async function finish(){await page.evaluate(()=>{const d=window.__dashPunchDebug;for(const state of d.radialMenu.active)d.radialMenu.draw(state.startedAt+400);if(d.radialMenu.wipe)d.radialMenu.draw(d.radialMenu.wipe.startedAt+400);});}
  async function press(i,b=0){await page.evaluate(([i,b])=>{const d=window.__dashPunchDebug;d.sharedMenu.poll(.2);window.pads[i].buttons[b]={pressed:true,value:1};d.sharedMenu.poll(1/60);window.pads[i].buttons[b]={pressed:false,value:0};d.sharedMenu.poll(.2);},[i,b]);}
  await page.getByRole("button",{name:"Play",exact:true}).click();assert.equal(await page.locator('[data-radial="main"] [data-radial-index]').count(),6);
  await page.waitForFunction(()=>{window.__dashPunchDebug.radialMenu.draw(performance.now());const c=document.querySelector('[data-radial="main"] .radial-fighter');return c&&c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((value,index)=>index%4===3&&value>0);});const main=[];
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});await draw();
    const layout=await page.locator('[data-radial="main"] [data-radial-index]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {name:n.textContent,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,width:r.width,height:r.height};}));
    assert(layout.every(r=>r.inside));main.push({width,layout});await page.screenshot({path:`${out}/play-${width}.png`});
  }
  // Shared analog sector selection: any controller, neutral retains focus, conflicts cancel.
  await page.evaluate(()=>{const d=window.__dashPunchDebug;d.sharedMenu.poll(.2);window.pads[3].axes=[.86,.5,0,0];d.sharedMenu.poll(.02);});
  assert.equal(await page.evaluate(()=>window.__dashPunchDebug.radialMenu.selection),2);
  await page.evaluate(()=>{window.pads[3].axes=[0,0,0,0];window.__dashPunchDebug.sharedMenu.poll(.2);});
  assert.equal(await page.evaluate(()=>window.__dashPunchDebug.radialMenu.selection),2);
  await page.evaluate(()=>{window.pads[0].axes=[0,-1,0,0];window.pads[3].axes=[0,1,0,0];window.__dashPunchDebug.sharedMenu.poll(.02);});
  assert.equal(await page.evaluate(()=>window.__dashPunchDebug.radialMenu.selection),2);
  await page.evaluate(()=>{for(const p of window.pads)p.axes=[0,0,0,0];window.__dashPunchDebug.sharedMenu.poll(.2);});
  // A diagonal option locks its actual screen-space direction. Repeated confirmation cannot retarget it.
  await page.locator('[data-menu-action="goDashballSetup"]').click();
  const state=await page.evaluate(()=>window.__dashPunchDebug.radialMenu.active[0]);assert(state.x>0&&state.y>0);
  await page.evaluate(start=>window.__dashPunchDebug.radialMenu.draw(start+110),state.startedAt);await page.screenshot({path:`${out}/directional-impact.png`});
  const opaque=await page.evaluate(start=>{window.__dashPunchDebug.radialMenu.draw(start+245);const c=document.getElementById("radialWipe");return c.getContext("2d").getImageData(0,0,c.width,c.height).data.every((value,index)=>index%4!==3||value===255);},state.startedAt);assert(opaque,"diagonal wipe conceals every corner before navigation");
  await page.keyboard.press("ArrowUp");await page.keyboard.press("Enter");assert.equal((await page.evaluate(()=>window.__dashPunchDebug.radialMenu.active)).length,1);
  assert.equal(await page.locator('[data-menu-screen="mode"]').count(),1);await finish();assert.equal(await page.locator('[data-menu-screen="dashballSetup"]').count(),1);
  // Keep the sports roster and per-owner selection; ten simultaneous lock-ins stay independent.
  for(let i=0;i<10;i++)await press(i,9);
  for(let i=0;i<10;i++)await press(i);
  assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.cards.filter(c=>c.open&&c.view==="review"))).length,10);
  const flourishing=await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active);
  await page.evaluate(states=>{const d=window.__dashPunchDebug;for(const state of states)d.cardFlourish.draw(state.startedAt+state.duration*1000+1);},flourishing);
  const layouts=[];
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});await draw();
    const layout=await page.locator('.card-radial').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),p=n.closest('.player-card').getBoundingClientRect();return {inside:r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom,viewport:p.bottom<=innerHeight,options:[...n.querySelectorAll('[data-radial-index]')].map(b=>{const a=b.getBoundingClientRect();return {inside:a.left>=p.left&&a.right<=p.right&&a.top>=p.top&&a.bottom<=p.bottom,w:a.width,h:a.height};})};}));
    assert.equal(layout.length,10);assert(layout.every(r=>r.inside&&r.viewport&&r.options.every(b=>b.inside)),JSON.stringify(layout));layouts.push({width,layout});await page.screenshot({path:`${out}/ten-cards-${width}.png`});
  }
  const pacing=await page.evaluate(()=>{const d=window.__dashPunchDebug,before=d.online.rollback.hash(),count=document.querySelectorAll('[data-radial] canvas').length,costs=[];for(let i=0;i<300;i++){const start=performance.now();d.radialMenu.draw(start);if(i>=60)costs.push(performance.now()-start);}costs.sort((a,b)=>a-b);return {samples:costs.length,p95:costs[Math.floor(costs.length*.95)],max:costs.at(-1),canvases:count,bounded:count===document.querySelectorAll('[data-radial] canvas').length,pure:before===d.online.rollback.hash()};});assert(pacing.bounded&&pacing.pure);
  const before=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash());
  await page.locator('[data-player-slot="0"] [data-field="costume"]').click();await page.locator('[data-player-slot="1"] [data-field="costume"]').click();
  assert.equal((await page.evaluate(()=>window.__dashPunchDebug.radialMenu.active)).length,2);await draw();await finish();
  let slots=await page.evaluate(()=>window.__dashPunchDebug.lobby.slots);assert.equal(slots[0].costume,1);assert.equal(slots[1].costume,1);assert.equal(slots[2].costume,0);
  assert.equal(await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),before,"cosmetic card feedback never steps combat");
  // Every fresh input adjusts once. Team effects are private, Ready remains explicit.
  await page.locator('[data-player-slot="0"] [data-field="costume"]').click();await finish();assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots))[0].costume,2);
  await page.evaluate(()=>{const button=document.querySelector('[data-player-slot="0"] [data-field="costume"]');button.click();document.querySelector('[data-player-slot="0"] [data-field="costume"]').click();});await finish();assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots))[0].costume,0,"two rapid fresh clicks each change color once");
  await page.locator('[data-player-slot="0"] [data-field="costume"]').click();await page.locator('[data-menu-action="goSettings"]').click();await finish();assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots))[0].costume,1,"another player's shared navigation does not lose a private setting press");
  await page.locator('[data-menu-action="settingsBack"]').click();await page.getByRole("button",{name:"Confirm Return",exact:true}).click();
  await page.locator('[data-player-slot="1"] [data-field="ready"]').click();await finish();assert((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots))[1].ready);
  await press(0,1);assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.cards)).find(c=>c.index===0).view,"browse");
  await press(2,8);assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.cards)).find(c=>c.index===2).open,false);await press(2,9);assert((await page.evaluate(()=>window.__dashPunchDebug.lobby.cards)).find(c=>c.index===2).open);
  const poses=[];
  for(const key of["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"]){
    await page.locator('[data-menu-action="selectRosterPlayer"][data-slot="0"]').click();
    const number=await page.evaluate(key=>window.__dashPunchDebug.online.rollback.characterKeys.indexOf(key),key);
    await page.locator(`[data-menu-action="chooseCharacter"][data-character="${number}"]`).click();
    await page.evaluate(()=>{const d=window.__dashPunchDebug;for(const s of d.cardFlourish.active)d.cardFlourish.draw(s.startedAt+s.duration*1000+1);});
    await page.locator('[data-player-slot="0"] [data-field="costume"]').click();
    const handle=await page.waitForFunction(()=>{const d=window.__dashPunchDebug,state=d.radialMenu.active.find(s=>s.key==="card:0"),before=d.online.rollback.hash();d.radialMenu.draw(state.startedAt+110);const c=document.querySelector('[data-radial="card:0"] .radial-fighter'),pixels=c.getContext("2d").getImageData(0,0,c.width,c.height).data.filter((v,n)=>n%4===3&&v>0).length;return pixels?{character:state.character,pixels,pure:before===d.online.rollback.hash()}:false;});const sample=await handle.jsonValue();await handle.dispose();
    assert.equal(sample.character,key);assert(sample.pixels>0&&sample.pure,key);poses.push(sample);await finish();
  }
  const destinations=[];
  for(const [action,screen]of[["localPlay","characters"],["goOnline","online"],["goDashballSetup","dashballSetup"],["goSandbagSetup","sandbagSetup"],["goSettings","settings"],["openStageBuilderMain",null]]){
    await page.reload();await page.waitForFunction(()=>window.__dashPunchDebug);await page.getByRole("button",{name:"Play",exact:true}).click();
    await page.locator(`[data-radial="main"] [data-menu-action="${action}"]`).click();await finish();
    if(screen)assert.equal(await page.locator(`[data-menu-screen="${screen}"]`).count(),1,action);else assert.equal(await page.locator('#stageBuilderLayer').evaluate(e=>e.hidden),false);
    destinations.push(action);
  }
  // Actual RAF completes a keyboard confirmation without test-driven time.
  await page.reload();await page.getByRole("button",{name:"Play",exact:true}).click();
  await page.keyboard.press("ArrowRight");await page.keyboard.press("ArrowRight");
  await page.evaluate(()=>window.freeze=false);await page.keyboard.press("Enter");await page.waitForSelector('[data-menu-screen="dashballSetup"]');await page.waitForTimeout(450);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,main,layouts,poses,destinations,pacing,opaqueDiagonal:true,independentOwners:true,rapidSettings:true,analogSectors:true,confirmDedup:true,physicalControllersTested:false,errors},null,2));console.log(JSON.stringify({passed:true,mainLayouts:main.length,tenPlayerLayouts:layouts.length,poses:poses.length,destinations:destinations.length,pacing,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
