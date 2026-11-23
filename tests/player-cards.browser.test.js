"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),manifest=fs.existsSync(path.join(root,"build-manifest.json"))?JSON.parse(fs.readFileSync(path.join(root,"build-manifest.json"),"utf8")):{fighters:JSON.parse(fs.readFileSync(path.join(root,"game.js"),"utf8").match(/const CORE_CHARACTERS = new Set\((\[[^;]+?\])\);/)[1])},out="artifacts/player-cards";
assert.equal(manifest.fighters.length,19);assert.equal(manifest.fighters.at(-1),"lancer");
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],results=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
  async function open(indices,viewport={width:1280,height:720},offline=false){
    const page=await browser.newPage({viewport});page.on("pageerror",e=>errors.push(e.stack));
    await page.addInitScript(indices=>{window.menuNow=10000;Object.defineProperty(performance,"now",{value:()=>window.menuNow});window.cardsFreeze=true;window.makePad=index=>({index,id:`Couch Pad ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});window.pads=indices.map(window.makePad);Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});},indices);
    await page.route("**/game.js",async route=>{const r=offline?null:await route.fetch();const source=offline?fs.readFileSync(path.join(root,"game.js"),"utf8"):await r.text();await route.fulfill({...(r?{response:r}:{}),contentType:"application/javascript",body:source.replace("  function frame(now) {","  function frame(now) {if(window.cardsFreeze){lastTime=now;requestAnimationFrame(frame);return;}")});});
    if(offline&&!fs.existsSync(path.join(root,"build-manifest.json")))await page.route("**/presentation-assets.js",r=>r.fulfill({contentType:"application/javascript",body:fs.readFileSync("exports/Dash-Punch-Soccer-Grass-2026-11-16/presentation-assets.js","utf8")}));
    await page.goto(offline?pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1":url);await tick(page,.2);return page;
  }
  async function tick(p,dt=1/60){await p.evaluate(dt=>{window.menuNow+=dt*1000;const d=window.__dashPunchDebug;d.sharedMenu.poll(dt);d.radialMenu?.draw(performance.now());},dt);}
  async function buttons(p,rows){await p.evaluate(rows=>{for(const[i,b,v]of rows)window.pads.find(p=>p.index===i).buttons[b]={pressed:!!v,value:v};},rows);await tick(p);}
  async function press(p,i,b=0){await buttons(p,[[i,b,1]]);await buttons(p,[[i,b,0]]);await tick(p,.2);if(await p.evaluate(()=>window.__dashPunchDebug.radialMenu?.active.length)){await tick(p,.3);await tick(p,.2);}if(b===0&&await p.locator('.is-controller-focus').filter({hasText:"Confirm Return"}).count()){await buttons(p,[[i,b,1]]);await buttons(p,[[i,b,0]]);await tick(p,.2);}}
  async function move(p,i,x,y){await p.evaluate(([i,x,y])=>window.pads.find(p=>p.index===i).axes=[x,y,0,0],[i,x,y]);await tick(p);await p.evaluate(i=>window.pads.find(p=>p.index===i).axes=[0,0,0,0],i);await tick(p);}
  const slots=p=>p.evaluate(()=>window.__dashPunchDebug.lobby.slots),cards=p=>p.evaluate(()=>window.__dashPunchDebug.lobby.cards);
  async function cardCommand(p,i,command){
    const index=(await slots(p)).find(s=>s.device===i).index;
    const radial=p.locator(`[data-player-slot="${index}"] .card-radial [data-field="${command}"]`);
    if(await radial.count()){const aim=await radial.evaluate(button=>{const host=button.closest('.card-radial'),angle=window.DashRadialMenu.angle(Number(button.dataset.radialIndex),host.querySelectorAll('[data-radial-index]').length);return {x:Math.cos(angle),y:Math.sin(angle)};});await move(p,i,aim.x,aim.y);await press(p,i);return;}
    for(let n=0;n<9;n++){const c=(await cards(p)).find(c=>c.index===index);if(c.focus===command){await press(p,i);return;}await move(p,i,0,1);}throw Error(`No card command ${command}`);
  }
  async function globalFocus(p,i,selector){
    const radial=await p.locator(selector).evaluate(button=>{const host=button.closest('[data-radial="main"]');if(!host)return null;const angle=window.DashRadialMenu.angle(Number(button.dataset.radialIndex),host.querySelectorAll('[data-radial-index]').length);return {x:Math.cos(angle),y:Math.sin(angle)};});
    if(radial){await move(p,i,radial.x,radial.y);assert(await p.locator(selector).evaluate(b=>b.classList.contains("is-controller-focus")),selector);return;}
    const steps=await p.evaluate(selector=>{
      const b=[...document.querySelectorAll('#menuLayer [data-menu-action]')].filter(b=>!b.disabled&&!b.dataset.cardPrivate),goal=b.indexOf(document.querySelector(selector));let start=b.findIndex(b=>b.classList.contains("is-controller-focus"));if(start<0)start=0;if(goal<0)throw Error(`Disabled or missing ${selector}`);
      const r=b.map(b=>b.getBoundingClientRect()),queue=[[start,[]]],seen=new Set([start]);
      while(queue.length){const[i,s]=queue.shift();if(i===goal)return s;for(const[x,y]of[[-1,0],[1,0],[0,-1],[0,1]]){let next=-1,score=Infinity;for(let j=0;j<b.length;j++){if(j===i)continue;const dx=r[j].x+r[j].width/2-r[i].x-r[i].width/2,dy=r[j].y+r[j].height/2-r[i].y-r[i].height/2,a=x?dx*x:dy*y;if(a<=4)continue;const v=a+(x?Math.abs(dy):Math.abs(dx))*2.4+Math.hypot(dx,dy)*.04;if(v<score){score=v;next=j;}}if(next<0)next=(i+(x||y)+b.length)%b.length;if(!seen.has(next)){seen.add(next);queue.push([next,[...s,[x,y]]]);}}}throw Error(`Unreachable ${selector}`);
    },selector);for(const[x,y]of steps)await move(p,i,x,y);
    assert(await p.locator(selector).evaluate(b=>b.classList.contains("is-controller-focus")),selector);
  }
  async function act(p,i,name){await globalFocus(p,i,`[data-menu-action="${name}"]`);await press(p,i);}
  async function layout(p,count,label){
    const issues=await p.evaluate(()=>{const cards=[...document.querySelectorAll('.player-card-grid>.player-card')],issues=[];for(const card of cards){const a=card.getBoundingClientRect();if(a.left<0||a.top<0||a.right>innerWidth||a.bottom>innerHeight)issues.push({card:card.dataset.playerSlot,offscreen:a.toJSON()});for(const child of card.querySelectorAll('button,h3,.card-status,header')){if(!child.getClientRects().length)continue;const b=child.getBoundingClientRect();if(b.right>a.right+1||b.bottom>a.bottom+1||b.left<a.left-1)issues.push({card:card.dataset.playerSlot,clipped:child.textContent,rect:b.toJSON()});}for(const other of cards){if(other===card)continue;const b=other.getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)issues.push({overlap:true});}}return issues;});
    assert.deepEqual(issues,[],label);assert.equal(await p.locator('.player-card-grid>.player-card').count(),count);await p.screenshot({path:`${out}/${label}.png`});
  }
  const p=await open([7,2,11,5]);await press(p,7,9);
  assert.equal(await p.locator('[data-menu-screen="characters"]').count(),1);
  for(const i of[2,5,11])await press(p,i,9);
  assert.deepEqual((await slots(p)).slice(0,4).map(s=>s.device),[7,2,5,11]);
  const before=await cards(p),shared=await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus);
  await p.evaluate(()=>{window.pads.find(p=>p.index===7).axes[0]=1;window.pads.find(p=>p.index===2).axes[0]=-1;});await tick(p);await p.evaluate(()=>window.pads.forEach(p=>p.axes=[0,0,0,0]));await tick(p);
  const after=await cards(p);assert.notEqual(after[0].cursor,before[0].cursor);assert.notEqual(after[1].cursor,before[1].cursor);assert.equal(after[2].cursor,before[2].cursor);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),shared);
  await press(p,7);assert.equal((await cards(p))[0].view,"review");assert(!(await slots(p))[0].ready);assert((await cards(p))[0].open);
  await press(p,7,1);assert.equal((await cards(p))[0].view,"browse");await press(p,7);
  await press(p,2,8);assert(!(await cards(p)).find(c=>c.index===1).open);assert((await cards(p)).find(c=>c.index===0).open);await press(p,2,9);assert((await cards(p)).find(c=>c.index===1).open);
  for(const i of[2,5,11])await press(p,i);
  await layout(p,4,"four-review-1280");
  await buttons(p,[7,2,5,11].map(i=>[i,0,1]));await buttons(p,[7,2,5,11].map(i=>[i,0,0]));await tick(p,.2);
  assert((await slots(p)).slice(0,4).every(s=>s.ready));assert((await cards(p)).every(c=>!c.open));
  await press(p,2,9);assert((await slots(p))[1].ready);await move(p,2,1,0);assert((await slots(p))[1].ready);await cardCommand(p,2,"unready");assert(!(await slots(p))[1].ready);assert((await slots(p))[0].ready);await cardCommand(p,2,"ready");
  // Ready players can reach the entire shared menu using a later controller.
  await act(p,11,"goStages");await act(p,11,"goSettings");
  await press(p,2,9);assert.equal(await p.locator('.player-card-dock [data-player-slot="1"]').count(),1);
  await globalFocus(p,11,'[data-menu-action="settingsBack"]');await press(p,11);assert.equal(await p.locator('[data-menu-screen="stages"]').count(),1);assert((await cards(p)).find(c=>c.index===1).open);
  await press(p,2,8);assert((await slots(p))[1].ready);await act(p,11,"startMatch");assert.equal(await p.locator('[data-menu-screen="countdown"]').count(),1);
  await p.waitForFunction(()=>document.querySelector('.countdown-number')?.textContent==="3");for(let n=0;n<35;n++)await tick(p,.1);
  assert(await p.locator('#menuLayer').isHidden());assert.deepEqual(await p.evaluate(()=>window.__dashPunchDebug.fighters.map(f=>f.controls.gamepadIndex)),[7,2,5,11]);
  await p.evaluate(()=>window.pads.push(window.makePad(25)));await tick(p);await press(p,25,9);assert(await p.locator('#menuLayer').isHidden());assert.equal((await slots(p)).filter(s=>!s.empty).length,4);
  await p.evaluate(()=>{window.savedPad=window.pads.find(p=>p.index===2);window.pads=window.pads.filter(p=>p.index!==2);});await tick(p);assert.equal(await p.locator('[data-menu-screen="controllerReconnect"]').count(),1);assert((await slots(p))[1].ready);
  const clock=await p.evaluate(()=>window.__dashPunchDebug.matchFlow.state.remainingTicks);await p.evaluate(()=>window.cardsFreeze=false);await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.matchFlow.state.remainingTicks),clock);await p.evaluate(()=>window.cardsFreeze=true);
  await p.evaluate(()=>{window.savedPad.index=30;window.pads.push(window.savedPad);});await tick(p);await press(p,30,9);assert.equal((await slots(p))[1].device,30);assert((await slots(p))[1].ready);await act(p,11,"reconnectResume");assert(await p.locator('#menuLayer').isHidden());
  // Finish a real best-of-three, preserving ownership and rematch state.
  await p.evaluate(()=>{const d=window.__dashPunchDebug;for(let round=0;round<2;round++){d.matchFlow.knockout(1);d.matchFlow.knockout(2);d.matchFlow.knockout(3);for(let n=0;n<301;n++)d.matchFlow.step();}});await tick(p,.2);
  assert.equal(await p.locator('[data-menu-screen="victory"]').count(),1);await act(p,11,"matchRematch");assert(await p.locator('#menuLayer').isHidden());assert.deepEqual(await p.evaluate(()=>window.__dashPunchDebug.matchFlow.state.wins),[0,0,0,0]);
  await p.keyboard.press("Escape");await tick(p,.2);await act(p,11,"localPlay");assert.equal(await p.locator('[data-menu-screen="characters"]').count(),1);
  await press(p,30,9);await cardCommand(p,30,"leave");assert((await slots(p))[1].empty);assert.equal((await slots(p))[0].device,7);assert((await slots(p))[0].ready);
  results.push({fourIndependentOwners:true,reviewReadySeparate:true,sharedSettings:true,reconnectPreservesReady:true,deferredJoin:true,bestOfThreeRematch:true,ownerLeave:true});await p.close();
  // Screen fit, every preview, teams, full capacity and CPU takeover.
  for(const width of[1280,1920])for(const count of[2,4,6,10]){
    const q=await open(Array.from({length:count},(_,i)=>i+10),{width,height:width===1280?720:1080});
    for(let i=0;i<count;i++)await press(q,i+10,9);
    if(count===10){const previews=[];for(let j=0;j<manifest.fighters.length;j++){
      await move(q,10,1,0);assert.equal(await q.locator('[data-player-slot="0"] .asset-sprite-preview').count(),1);
      const fits=await q.evaluate(()=>{const d=window.__dashPunchDebug,c=d.lobby.cards.find(c=>c.index===0),key=d.online.rollback.characterKeys[c.cursor],set=window.DASH_PUNCH_ART.spriteSets[window.DASH_PUNCH_ART.assignments[key].spriteSet],node=document.querySelector('[data-player-slot="0"] .asset-sprite-preview'),r=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect(),scale=new DOMMatrix(getComputedStyle(node).transform).a;return {key,top:r.top+(set.foot-set.bodyHeight)*scale,bottom:r.top+set.foot*scale,portraitTop:p.top,portraitBottom:p.bottom};});
      assert(fits.top>=fits.portraitTop-1&&fits.bottom<=fits.portraitBottom+1,`Full preview body: ${JSON.stringify(fits)}`);
      previews.push(fits.key);
      if(width===1280&&["chungus","boomerangus"].includes(fits.key))await q.screenshot({path:`${out}/preview-${fits.key}-1280.png`});
    }assert.deepEqual([...new Set(previews)].sort(),[...manifest.fighters].sort(),"Every core fighter preview must be visited");}
    await layout(q,count,`${count}-cards-${width}`);
    for(let i=0;i<count;i++)await press(q,i+10);await layout(q,count,`${count}-review-${width}`);
    if(count===10&&width===1280){
      await press(q,10,8);await act(q,10,"goSettings");
      assert.equal(await q.locator('.player-card-dock .player-card').count(),9);
      const dockFits=await q.locator('.player-card-dock .player-card').evaluateAll(cards=>cards.every(card=>{const a=card.getBoundingClientRect();return a.top>=0&&a.bottom<=innerHeight&&[...card.querySelectorAll('button')].every(b=>b.getBoundingClientRect().bottom<=a.bottom+1);}));assert(dockFits,"nine private editors fit beside shared settings");
      await q.screenshot({path:`${out}/nine-editors-settings-1280.png`});await act(q,10,"settingsBack");await press(q,10,9);
      const saved=await slots(q);await q.evaluate(()=>window.pads.push(window.makePad(99)));await tick(q);await press(q,99,9);assert.deepEqual(await slots(q),saved);
      await cardCommand(q,19,"leave");assert((await slots(q))[9].empty);assert.deepEqual((await slots(q)).slice(0,9),saved.slice(0,9));
      await press(q,99,9);assert.equal((await slots(q))[9].device,99);assert.equal((await slots(q)).filter(s=>!s.empty).length,10);
    }
    await q.close();
  }
  const team=await open(Array.from({length:10},(_,i)=>40+i));await team.getByRole("button",{name:"Play",exact:true}).click();await team.getByRole("button",{name:"Dashball",exact:true}).click();
  await tick(team,.4);await tick(team,.2);
  for(let i=0;i<4;i++)await team.locator('[data-menu-action="dashballSizeUp"]').click();await team.locator('[data-menu-action="dashballLocal"]').click();await tick(team,.2);
  assert.equal((await slots(team)).filter(s=>!s.empty).length,10);assert.equal((await slots(team)).filter(s=>!s.empty&&s.cpu).length,8);
  for(let i=0;i<10;i++)await press(team,40+i,9);assert((await slots(team)).filter(s=>!s.empty).every(s=>!s.cpu));
  for(let i=0;i<10;i++)await press(team,40+i);await layout(team,10,"ten-team-review-1280");
  for(let i=0;i<10;i++)await cardCommand(team,40+i,"ready");assert(await team.evaluate(()=>window.__dashPunchDebug.lobby.valid));
  assert.deepEqual((await slots(team)).filter(s=>!s.empty).reduce((a,s)=>(a[s.team]++,a),[0,0]),[5,5]);
  await act(team,49,"goStages");await act(team,49,"startMatch");await team.waitForFunction(()=>document.querySelector('.countdown-number')?.textContent==="3");for(let n=0;n<35;n++)await tick(team,.1);
  assert.deepEqual(await team.evaluate(()=>window.__dashPunchDebug.matchFlow.state.sides.map(s=>s.members.length)),[5,5]);await team.close();
  const r=await open([1,2]);await r.evaluate(()=>window.pads.forEach(p=>p.id="Identical Controller"));await tick(r);await press(r,1,9);await press(r,2,9);await r.evaluate(()=>{window.pads=[];});await tick(r);
  await r.evaluate(()=>{const p=window.makePad(50);p.id="Identical Controller";window.pads=[p];});await tick(r);await press(r,50,9);assert.equal(await r.locator('.controller-recovery').count(),1);await move(r,50,0,1);await press(r,50);assert.equal((await slots(r))[1].device,50);assert((await slots(r))[0].disconnected);await r.close();
  const k=await open([4]);await press(k,4,9);await k.keyboard.press("KeyO");assert.equal((await slots(k)).filter(s=>!s.empty&&!s.cpu).length,2);await k.keyboard.press("Enter");assert(!(await slots(k)).find(s=>s.device===null&&!s.empty&&!s.cpu).ready);await k.keyboard.press("Enter");await tick(k,.25);assert((await slots(k)).find(s=>s.device===null&&!s.empty&&!s.cpu).ready);await k.close();
  const offline=await open([8],{width:1280,height:720},true);await press(offline,8,9);assert.equal(await offline.locator('.player-card.is-open').count(),1);await offline.close();
  assert.deepEqual(errors,[]);const report={passed:true,root,results,layouts:[2,4,6,10],resolutions:["1280x720","1920x1080"],teams5v5:true,cpuTakeover:true,ambiguousReconnect:true,fullCapacity:true,offline:true,physicalControllersTested:false,errors};fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
