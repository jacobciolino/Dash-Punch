"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/shared-menus";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],results=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
  async function open(indices){
    const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.stack));
    await page.addInitScript(indices=>{window.menuNow=10000;Object.defineProperty(performance,"now",{value:()=>window.menuNow});window.menuTestFreeze=true;window.makeMenuPad=index=>({index,id:`Couch Controller ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});window.menuPads=indices.map(window.makeMenuPad);Object.defineProperty(navigator,"getGamepads",{value:()=>window.menuPads});},indices);
    await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("  function frame(now) {","  function frame(now) {if(window.menuTestFreeze){lastTime=now;requestAnimationFrame(frame);return;}")});});
    await page.goto(url);await tick(page,.2);return page;
  }
  async function tick(page,dt=1/60){await page.evaluate(dt=>{window.menuNow+=Math.round(dt*1000);const d=window.__dashPunchDebug;d.sharedMenu.poll(dt);d.radialMenu?.draw(performance.now());},dt);}
  async function buttons(page,changes){await page.evaluate(rows=>{for(const[index,button,value]of rows)window.menuPads.find(p=>p.index===index).buttons[button]={pressed:value===1,value};},changes);await tick(page);}
  async function press(page,index,button=0){await buttons(page,[[index,button,1]]);if(button===1)await tick(page,1.6);await buttons(page,[[index,button,0]]);await tick(page,.2);if(await page.evaluate(()=>window.__dashPunchDebug.radialMenu?.active.length)){await tick(page,.3);await tick(page,.2);}if(button===0&&await page.locator('.is-controller-focus').filter({hasText:"Confirm Return"}).count()){await buttons(page,[[index,button,1]]);await buttons(page,[[index,button,0]]);await tick(page,.2);}}
  async function move(page,index,x,y){await page.evaluate(([index,x,y])=>window.menuPads.find(p=>p.index===index).axes=[x,y,0,0],[index,x,y]);await tick(page);await page.evaluate(index=>window.menuPads.find(p=>p.index===index).axes=[0,0,0,0],index);await tick(page);}
  async function focus(page,index,selector){
    const radial=await page.locator(selector).evaluate(button=>{const host=button.closest('[data-radial="main"]');if(!host)return null;const a=host.getBoundingClientRect(),b=button.getBoundingClientRect(),x=b.left+b.width/2-a.left-a.width/2,y=b.top+b.height/2-a.top-a.height/2,length=Math.hypot(x,y);return {x:x/length,y:y/length};});
    if(radial){await move(page,index,radial.x,radial.y);assert(await page.locator(selector).evaluate(b=>b.classList.contains("is-controller-focus")),selector);return;}
    // Navigate the real shared highlight, without .focus(), mouse clicks or test setters.
    const route=await page.evaluate(selector=>{
      const buttons=[...document.querySelectorAll('#menuLayer [data-menu-action]')].filter(b=>!b.disabled&&!b.dataset.cardPrivate),target=document.querySelector(selector),start=buttons.findIndex(b=>b.classList.contains("is-controller-focus")),goal=buttons.indexOf(target);if(goal<0)throw Error(`No enabled target ${selector}`);
      const directions=[[-1,0],[1,0],[0,-1],[0,1]],rects=buttons.map(b=>b.getBoundingClientRect()),seen=new Set([start]),queue=[[start,[]]];
      while(queue.length){const[i,steps]=queue.shift();if(i===goal)return steps;const a=rects[i];for(const[x,y]of directions){let next=-1,score=Infinity;for(let n=0;n<buttons.length;n++){if(n===i)continue;const b=rects[n],dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2,primary=x?dx*x:dy*y;if(primary<=4)continue;const secondary=x?Math.abs(dy):Math.abs(dx),s=primary+secondary*2.4+Math.hypot(dx,dy)*.04;if(s<score){score=s;next=n;}}if(next<0)next=(i+(x||y)+buttons.length)%buttons.length;if(!seen.has(next)){seen.add(next);queue.push([next,[...steps,[x,y]]]);}}}throw Error(`Unreachable target ${selector}`);
    },selector);
    for(const[x,y]of route)await move(page,index,x,y);
    assert(await page.locator(selector).evaluate(b=>b.classList.contains("is-controller-focus")),`${selector}: ${JSON.stringify({route,focus:await page.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus)})}`);
  }
  const action=(name,extra="")=>`[data-menu-action="${name}"]${extra}`;
  const screen=(page,name)=>page.locator(`[data-menu-screen="${name}"]`).waitFor();
  // Single-controller and two-controller paths, including reverse browser indices.
  for(const indices of[[8],[9,3]]){const p=await open(indices),driver=indices.at(-1);await press(p,driver);await screen(p,"mode");await press(p,driver,9);await press(p,driver,8);await press(p,driver,1);await screen(p,"mode");await focus(p,driver,action("goSettings"));await press(p,driver);await screen(p,"settings");await focus(p,driver,action("teamModeNext"));await press(p,driver);await press(p,driver,1);await screen(p,"mode");await focus(p,driver,action("goDashballSetup"));await press(p,driver);await screen(p,"dashballSetup");await focus(p,driver,action("dashballScoreUp"));await press(p,driver);await press(p,driver,1);await screen(p,"mode");results.push({controllers:indices.length,driver,globalModesAndSettings:true});await p.close();}
  const p=await open([7,2,11,5]);await press(p,2);await focus(p,2,action("localPlay"));await press(p,2);await screen(p,"characters");
  // Join in a different order from both slot order and browser gamepad order.
  for(const index of[7,2,5,11])await press(p,index,9);
  const slots=()=>p.evaluate(()=>window.__dashPunchDebug.lobby.slots);
  assert.deepEqual((await slots()).slice(0,4).map(s=>s.device),[7,2,5,11]);assert((await slots()).slice(0,4).every(s=>!s.ready));
  for(const index of[7,2,5,11]){await press(p,index);await press(p,index);} // Confirm, then explicitly Ready.
  assert(await p.evaluate(()=>window.__dashPunchDebug.lobby.valid));
  await focus(p,11,action("goStages"));await press(p,11);await screen(p,"stages"); // P4 advances with P1 untouched.
  const saved=(await slots()).slice(0,4);
  // A connected but unjoined controller cannot commandeer a local stage menu.
  await p.evaluate(()=>window.menuPads.push(window.makeMenuPad(25)));await tick(p);const beforeStranger=await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus);await press(p,25,0);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),beforeStranger);assert.equal(await p.locator('[data-menu-screen="stages"]').count(),1);
  // D-pad and a remapped action use the same normalized input path as the stick.
  await press(p,5,15);assert.notEqual(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),beforeStranger);
  const mapping=await p.evaluate(()=>{const profile=window.__dashPunchDebug.fighters[1].controls,old=[...profile.gamepad.dash];profile.gamepad.dash=[10];return old;});
  const mappedTile=p.locator('.stage-tile').nth(2),mappedStage=await mappedTile.getAttribute("data-stage");await focus(p,2,`[data-menu-action="chooseStage"][data-stage="${mappedStage}"]`);await press(p,2,10);assert(await mappedTile.evaluate(b=>b.classList.contains("is-selected")));await p.evaluate(mapping=>window.__dashPunchDebug.fighters[1].controls.gamepad.dash=mapping,mapping);
  // Every later seat can independently browse/select a stage, including Start.
  for(const index of[2,5,11]){const before=await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus);await move(p,index,1,0);assert.notEqual(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),before);const tile=p.locator('.stage-tile').nth(index===2?1:index===5?2:3),selector=`[data-menu-action="chooseStage"][data-stage="${await tile.getAttribute("data-stage")}"]`;await focus(p,index,selector);await press(p,index);assert(await p.locator(selector).evaluate(b=>b.classList.contains("is-selected")));}
  // Two confirms select once, without confirming the newly focused Fight command.
  const tile=p.locator('.stage-tile').nth(4),stage=await tile.getAttribute("data-stage");await focus(p,2,`[data-menu-action="chooseStage"][data-stage="${stage}"]`);
  await buttons(p,[[2,0,1],[11,0,1]]);assert.equal(await p.locator('[data-menu-screen="stages"]').count(),1);assert(await p.locator(`[data-stage="${stage}"]`).evaluate(b=>b.classList.contains("is-selected")));await buttons(p,[[2,0,0],[11,0,0]]);
  // A held confirm on P2 does not block a fresh P4 confirm on the same screen.
  await focus(p,5,`[data-menu-action="chooseStage"][data-stage="${stage}"]`);await buttons(p,[[2,0,1]]);await focus(p,11,`[data-menu-action="chooseStage"][data-stage="${await p.locator('.stage-tile').nth(5).getAttribute("data-stage")}"]`);await buttons(p,[[11,0,1]]);assert.equal(await p.locator('[data-menu-screen="stages"]').count(),1);await buttons(p,[[2,0,0],[11,0,0]]);
  // Simultaneous opposing navigation cancels, independent of pad array order.
  const signature=await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus);await p.evaluate(()=>{window.menuPads.reverse();window.menuPads.find(p=>p.index===2).axes[0]=-1;window.menuPads.find(p=>p.index===11).axes[0]=1;});await tick(p);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),signature);await p.evaluate(()=>window.menuPads.forEach(p=>p.axes=[0,0,0,0]));await tick(p);
  // Disconnect reserves the seat; reconnect with a held button cannot start a match.
  await p.evaluate(()=>{window.savedMenuPad=window.menuPads.find(p=>p.index===11);window.menuPads=window.menuPads.filter(p=>p.index!==11);});await tick(p);assert((await slots())[3].disconnected);assert(await p.locator(action("startMatch")).isDisabled());await p.evaluate(()=>{window.savedMenuPad.buttons[0]={pressed:true,value:1};window.menuPads.push(window.savedMenuPad);});await tick(p);assert.equal(await p.locator('[data-menu-screen="stages"]').count(),1);assert(!(await slots())[3].disconnected);await buttons(p,[[11,0,0]]);assert((await slots())[3].ready);assert(await p.evaluate(()=>window.__dashPunchDebug.lobby.valid));
  // Mixed keyboard/controller global navigation and held keyboard confirm protection.
  await p.keyboard.press("ArrowLeft");const kb=await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus);await move(p,11,0,-1);assert.notEqual(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),kb);
  await press(p,2,1);await screen(p,"characters");await p.keyboard.down("Escape");await tick(p,1.6);await p.keyboard.up("Escape");await screen(p,"mode");await tick(p,.2);
  await focus(p,11,action("goSettings"));await press(p,11);await focus(p,11,action("toggleGraphics"));await press(p,11);await focus(p,11,action("settingsBack"));await press(p,11);await screen(p,"mode");
  // Dashball settings and stage-specific return: P3 does the whole global path.
  await focus(p,5,action("goDashballSetup"));await press(p,5);await focus(p,5,action("dashballSizeUp"));await press(p,5);await focus(p,5,action("dashballLocal"));await press(p,5);await screen(p,"characters");
  // Existing sports size defaults may close extra seats. Existing per-owner selection is unchanged.
  for(const slot of await slots())if(!slot.empty&&!slot.cpu&&!slot.ready)await press(p,slot.device);
  await focus(p,2,action("goStages"));await press(p,2);await screen(p,"stages");const field=await p.getByRole('button',{name:"Field Goal",exact:true}).getAttribute("data-stage");await focus(p,2,`[data-menu-action="chooseStage"][data-stage="${field}"]`);await press(p,2);await focus(p,2,action("goDashballSetup"));await press(p,2);await screen(p,"dashballSetup");await focus(p,2,action("dashballTimeUp"));await press(p,2);await press(p,2,1);await screen(p,"stages");assert(await p.locator(`[data-stage="${field}"]`).evaluate(b=>b.classList.contains("is-selected")));
  await p.screenshot({path:`${out}/shared-stage-1280.png`});
  // Start remains readiness-gated; actual countdown/assets and gameplay use the normal path.
  await focus(p,2,action("startMatch"));await press(p,2);await screen(p,"countdown");await p.waitForFunction(()=>document.querySelector('.countdown-number')?.textContent==="3");for(let n=0;n<35;n++)await tick(p,.1);assert(await p.locator("#menuLayer").isHidden());assert.equal(await p.evaluate(()=>window.__dashPunchDebug.fighters.length),4);
  // Start pauses/resumes once, without bouncing into an extra menu action.
  await press(p,2,9);await screen(p,"mode");await press(p,2,9);assert(await p.locator("#menuLayer").isHidden());
  await p.keyboard.press("Escape");await tick(p,.2);await focus(p,2,action("localPlay"));await press(p,2);await screen(p,"characters");assert.deepEqual((await slots()).slice(0,2).map(s=>s.device),saved.slice(0,2).map(s=>s.device));
  for(const slot of await slots())if(!slot.empty&&!slot.cpu&&!slot.ready)await press(p,slot.device);
  assert(await p.getByRole("button",{name:"Choose Stage",exact:true}).isEnabled());
  results.push({controllers:4,joinOrder:[7,2,5,11],independentSeats:[2,3,4],simultaneousInputs:true,heldHandoff:true,reconnect:true,mixedKeyboard:true,settingsReturn:true,startAndReturn:true});await p.close();
  // Offline HTML still loads the same global input code and accepts an additional pad.
  const offline=await browser.newPage();offline.on("pageerror",e=>errors.push(e.stack));await offline.addInitScript(()=>{window.pads=[{index:6,id:"Offline Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}];Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});});if(!fs.existsSync(path.join(root,"build-manifest.json")))await offline.route("**/presentation-assets.js",r=>r.fulfill({contentType:"application/javascript",body:fs.readFileSync("exports/Dash-Punch-Soccer-Grass-2026-11-16/presentation-assets.js","utf8")}));await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");await offline.waitForTimeout(250);await offline.evaluate(()=>window.pads[0].buttons[0]={pressed:true,value:1});await screen(offline,"mode");await offline.evaluate(()=>window.pads[0].buttons[0]={pressed:false,value:0});await offline.close();
  assert.deepEqual(errors,[]);const report={passed:true,root,results,offline:true,errors,physicalControllersTested:false};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
