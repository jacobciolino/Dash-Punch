"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/lobby-setup";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
  const errors=[],results=[],url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {if(window.freeze){lastTime=now;requestAnimationFrame(frame);return;}");
  async function open(indices,width=1280){
    const p=await browser.newPage({viewport:{width,height:width*9/16}});p.on("pageerror",e=>errors.push(e.message));
    await p.addInitScript(indices=>{window.freeze=true;window.menuNow=10000;Object.defineProperty(performance,"now",{value:()=>window.menuNow});window.pads=indices.map(index=>({index,id:`Couch Pad ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});},indices);
    await p.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await p.goto(url);await p.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");await tick(p,.2);return p;
  }
  async function tick(p,dt=1/60){await p.evaluate(dt=>{window.menuNow+=dt*1000;const d=window.__dashPunchDebug;d.sharedMenu.poll(dt);d.radialMenu.draw(performance.now());d.cardFlourish.draw(performance.now());},dt);}
  async function set(p,i,b,v){await p.evaluate(([i,b,v])=>{window.pads.find(p=>p.index===i).buttons[b]={pressed:!!v,value:v};},[i,b,v]);await tick(p);}
  async function press(p,i,b=0){await set(p,i,b,1);await set(p,i,b,0);await tick(p,.4);await tick(p,.2);}
  async function move(p,i,x,y){await p.evaluate(([i,x,y])=>window.pads.find(p=>p.index===i).axes=[x,y,0,0],[i,x,y]);await tick(p);await p.evaluate(i=>window.pads.find(p=>p.index===i).axes=[0,0,0,0],i);await tick(p);}
  const slots=p=>p.evaluate(()=>window.__dashPunchDebug.lobby.slots),cards=p=>p.evaluate(()=>window.__dashPunchDebug.lobby.cards);
  async function card(p,i,command){
    const index=(await slots(p)).find(s=>s.device===i).index;
    const aim=await p.locator(`[data-radial="card:${index}"] [data-field="${command}"]`).evaluateAll(nodes=>{if(!nodes.length)return null;const b=nodes[0],n=b.closest('[data-radial]').querySelectorAll('[data-radial-index]').length,a=window.DashRadialMenu.angle(Number(b.dataset.radialIndex),n);return {x:Math.cos(a),y:Math.sin(a)};});
    if(aim)await move(p,i,aim.x,aim.y);else{
      for(let n=0;n<10;n++){if((await cards(p)).find(c=>c.index===index).focus===command)break;await move(p,i,0,1);}
    }
    assert.equal((await cards(p)).find(c=>c.index===index).focus,command);await press(p,i);
  }
  async function focus(p,i,selector){
    const radial=await p.locator(selector).evaluate(b=>{const host=b.closest('[data-radial="main"]');if(!host)return null;const a=window.DashRadialMenu.angle(Number(b.dataset.radialIndex),host.querySelectorAll('[data-radial-index]').length);return {x:Math.cos(a),y:Math.sin(a)};});
    if(radial){await move(p,i,radial.x,radial.y);return;}
    const steps=await p.evaluate(selector=>{
      const b=[...document.querySelectorAll('#menuLayer [data-menu-action]')].filter(b=>!b.disabled&&!b.dataset.cardPrivate),goal=b.indexOf(document.querySelector(selector));let start=b.findIndex(b=>b.classList.contains('is-controller-focus'));if(start<0)start=0;if(goal<0)throw Error(`Missing ${selector}`);
      const r=b.map(b=>b.getBoundingClientRect()),queue=[[start,[]]],seen=new Set([start]);
      while(queue.length){const[i,path]=queue.shift();if(i===goal)return path;
        for(const[x,y]of[[-1,0],[1,0],[0,-1],[0,1]]){let next=-1,score=Infinity;
          for(let j=0;j<b.length;j++){if(j===i)continue;const dx=r[j].x+r[j].width/2-r[i].x-r[i].width/2,dy=r[j].y+r[j].height/2-r[i].y-r[i].height/2,a=x?dx*x:dy*y;if(a<=4)continue;const value=a+(x?Math.abs(dy):Math.abs(dx))*2.4+Math.hypot(dx,dy)*.04;if(value<score){score=value;next=j;}}
          if(next<0)next=(i+(x||y)+b.length)%b.length;if(!seen.has(next)){seen.add(next);queue.push([next,[...path,[x,y]]]);}
        }
      }throw Error(`Unreachable ${selector}`);
    },selector);for(const[x,y]of steps)await move(p,i,x,y);assert(await p.locator(selector).evaluate(b=>b.classList.contains('is-controller-focus')),selector);
  }
  async function act(p,i,selector){await focus(p,i,selector);await press(p,i);}
  async function back(p,i){await set(p,i,1,1);await tick(p,1.59);await tick(p,.02);await set(p,i,1,0);await tick(p,.2);}
  async function layout(p,name){
    const issues=await p.locator('.card-radial').evaluateAll(wheels=>wheels.flatMap(w=>{const p=w.closest('.player-card').getBoundingClientRect(),buttons=[...w.querySelectorAll('[data-radial-index]')];return buttons.flatMap((b,i)=>{const r=b.getBoundingClientRect(),bad=[];
      if(r.left<p.left-1||r.right>p.right+1||r.top<p.top-1||r.bottom>p.bottom+1)bad.push(`clipped ${b.textContent}`);
      if(b.scrollWidth>b.clientWidth+1)bad.push(`text clipped ${b.textContent}`);
      for(const other of buttons.slice(i+1)){const a=other.getBoundingClientRect();if(r.left<a.right-1&&r.right>a.left+1&&r.top<a.bottom-1&&r.bottom>a.top+1)bad.push(`overlap ${b.textContent}/${other.textContent}`);}return bad;
    });}));assert.deepEqual(issues,[],name);await p.screenshot({path:`${out}/${name}.png`});
  }
  const p=await open([7,2,11,5]);await press(p,7,9);await press(p,2,9);await press(p,7);await press(p,2);
  const humans=(await slots(p)).slice(0,2);await card(p,2,'addCpu');assert.equal((await slots(p)).filter(s=>!s.empty&&s.cpu).length,1);assert.deepEqual((await slots(p)).slice(0,2),humans);
  // One held confirm adds exactly one bot, without giving up the human seat.
  await set(p,2,0,1);for(let n=0;n<8;n++)await tick(p,.2);await set(p,2,0,0);assert.equal((await slots(p)).filter(s=>!s.empty&&s.cpu).length,2);
  const p1=(await cards(p)).find(c=>c.index===0);await card(p,2,'settings');assert.equal(await p.locator('[data-menu-screen="settings"]').count(),1);assert.deepEqual((await cards(p)).find(c=>c.index===0),p1);
  assert.deepEqual(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.controllerKeys),['2:Couch Pad 2']);
  assert(await p.locator('[data-menu-action="playersUp"]').evaluate(b=>b.classList.contains('is-controller-focus')));await press(p,2);assert.equal((await slots(p)).filter(s=>!s.empty&&s.cpu).length,3);
  const focusBefore=await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus);await move(p,7,1,0);assert.equal(await p.evaluate(()=>window.__dashPunchDebug.sharedMenu.focus),focusBefore);
  await back(p,2);assert.equal(await p.locator('[data-menu-screen="characters"]').count(),1);assert(await p.locator('.card-global-actions [data-menu-action="goSettings"]').evaluate(b=>b.classList.contains('is-controller-focus')));
  const cpu=(await slots(p)).find(s=>!s.empty&&s.cpu);await act(p,2,`[data-player-slot="${cpu.index}"] [data-field="cpuNext"]`);assert.notEqual((await slots(p))[cpu.index].character,cpu.character);
  await act(p,2,`[data-player-slot="${cpu.index}"] [data-field="leave"]`);assert((await slots(p))[cpu.index].empty);assert.deepEqual((await slots(p)).slice(0,2),humans);
  await press(p,7,8);assert(await p.locator('.card-global-actions [data-menu-action="addLobbyCpu"]').evaluate(b=>b.classList.contains('is-controller-focus')));
  await press(p,7,9);await press(p,7,1);assert.equal((await cards(p)).find(c=>c.index===0).view,'browse');await press(p,7);await card(p,7,'ready');
  await press(p,2,9);await card(p,2,'ready');const ready=(await slots(p)).slice(0,2);assert(ready.every(s=>s.ready));
  await press(p,2,9);await card(p,2,'addCpu');assert.deepEqual((await slots(p)).slice(0,2),ready);await card(p,2,'settings');await back(p,2);assert.deepEqual((await slots(p)).slice(0,2),ready);
  await press(p,2,9);await card(p,2,'lobby');assert.equal(await p.locator('[data-menu-screen="characters"]').count(),1);
  const count=(await slots(p)).filter(s=>!s.empty).length;
  for(let n=count;n<10;n++)await act(p,2,'.card-global-actions [data-menu-action="addLobbyCpu"]');assert.equal((await slots(p)).filter(s=>!s.empty).length,10);
  await press(p,2,9);await card(p,2,'lobby');assert(await p.locator('.card-global-actions [data-menu-action="goSettings"]').evaluate(b=>b.classList.contains('is-controller-focus')));
  await press(p,2,9);await card(p,2,'unready');
  // Holding the radial Lobby confirm must not also activate the shared toolbar.
  const aim=await p.locator('[data-radial="card:1"] [data-field="lobby"]').evaluate(b=>{const a=window.DashRadialMenu.angle(Number(b.dataset.radialIndex),b.closest('[data-radial]').querySelectorAll('[data-radial-index]').length);return {x:Math.cos(a),y:Math.sin(a)};});await move(p,2,aim.x,aim.y);await set(p,2,0,1);for(let n=0;n<8;n++)await tick(p,.2);assert.equal(await p.locator('[data-menu-screen="characters"]').count(),1);await set(p,2,0,0);
  results.push({controllerOnlyCpuAddEditRemove:true,ownerPreserved:true,heldConfirmDedup:true,p2SettingsWhileP1Edits:true,readyPreserved:true,capacitySafe:true});await p.close();
  // Multiple small wheels remain readable without overlap, including eight team options.
  for(const width of[1280,1920])for(const count of[2,6,10]){
    const q=await open(Array.from({length:count},(_,i)=>i+20),width);for(let n=0;n<count;n++)await press(q,n+20,9);for(let n=0;n<count;n++)await press(q,n+20);
    await press(q,20,8);await act(q,20,'[data-menu-action="teamModeNext"]');await act(q,20,'[data-menu-action="teamModeNext"]');await press(q,20,9);
    assert.equal(await q.locator('[data-radial="card:0"] [data-radial-index]').count(),8);await layout(q,`${count}-cards-${width}`);results.push({width,count,teamWheel:true});await q.close();
  }
  // Sports rules return through shared settings rather than dumping players into mode selection.
  for(const sport of['dashball','sandbag']){
    const q=await open([3,8]);await press(q,3);
    await act(q,3,`[data-menu-action="${sport==='dashball'?'goDashballSetup':'goSandbagSetup'}"]`);
    await act(q,3,`[data-menu-action="${sport==='dashball'?'dashballLocal':'sandbagLocal'}"]`);
    await press(q,3,9);await press(q,8,9);await press(q,3);await press(q,8);
    const before=(await slots(q)).slice(0,2);await card(q,8,'settings');
    await act(q,8,`[data-menu-action="${sport==='dashball'?'goDashballSetup':'goSandbagSetup'}"]`);
    assert.equal(await q.locator(`[data-menu-screen="${sport==='dashball'?'dashballSetup':'sandbagSetup'}"]`).count(),1);
    await act(q,8,`[data-menu-action="${sport==='dashball'?'dashballTimeUp':'sandbagTimeUp'}"]`);
    await back(q,8);assert.equal(await q.locator('[data-menu-screen="settings"]').count(),1);
    await back(q,8);assert.equal(await q.locator('[data-menu-screen="characters"]').count(),1);assert.deepEqual((await slots(q)).slice(0,2),before);
    assert(await q.locator('.card-global-actions [data-menu-action="goSettings"]').evaluate(b=>b.classList.contains('is-controller-focus')));
    results.push({sport,nestedRulesReturn:true,controllerOnly:true});
    await q.close();
  }
  const keyboard=await open([]);await keyboard.keyboard.press('Enter');await tick(keyboard,.4);await tick(keyboard,.2);await keyboard.keyboard.press('Enter');await tick(keyboard,.4);await tick(keyboard,.2);
  await keyboard.keyboard.press('KeyO');await keyboard.keyboard.press('Enter');await tick(keyboard,.4);
  async function keyboardCard(command){for(let n=0;n<10;n++){if((await cards(keyboard)).find(c=>c.open).focus===command)break;await keyboard.keyboard.press('ArrowDown');}assert.equal((await cards(keyboard)).find(c=>c.open).focus,command);await keyboard.keyboard.press('Enter');await tick(keyboard,.4);await tick(keyboard,.2);}
  const keyOwner=(await slots(keyboard)).find(s=>!s.empty&&!s.cpu&&s.device===null);await keyboardCard('addCpu');assert.deepEqual((await slots(keyboard))[keyOwner.index],keyOwner);
  await keyboardCard('settings');assert.equal(await keyboard.locator('[data-menu-screen="settings"]').count(),1);
  await keyboard.keyboard.down('Escape');await tick(keyboard,.01);await tick(keyboard,1.61);await keyboard.keyboard.up('Escape');await tick(keyboard,.2);assert.equal(await keyboard.locator('[data-menu-screen="characters"]').count(),1);
  assert(await keyboard.locator('.card-global-actions [data-menu-action="goSettings"]').evaluate(b=>b.classList.contains('is-controller-focus')));
  await keyboard.keyboard.press('KeyO');await keyboard.keyboard.press('Backspace');assert(await keyboard.locator('.card-global-actions [data-menu-action="addLobbyCpu"]').evaluate(b=>b.classList.contains('is-controller-focus')));
  assert.equal(await keyboard.locator(`[data-player-slot="${keyOwner.index}"] [data-menu-action="waitingCpu"]`).count(),0);
  const savedKeyboard=(await slots(keyboard))[keyOwner.index];await keyboard.keyboard.press('Enter');await tick(keyboard,.2);assert.deepEqual((await slots(keyboard))[keyOwner.index],savedKeyboard);
  results.push({keyboardHandoff:true,keyboardOwnerPreserved:true});await keyboard.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,results,physicalControllersTested:false,errors},null,2));console.log(JSON.stringify({passed:true,results,errors,physicalControllersTested:false}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
