"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const keys=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"];
(async()=>{let browser;try{
  const out="artifacts/card-flourish";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],samples=[],layouts=[];
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{window.freeze=true;window.pads=Array.from({length:10},(_,index)=>({index,id:`Couch ${index}`,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));Object.defineProperty(navigator,"getGamepads",{value:()=>window.pads});});
  const source=fs.readFileSync("game.js","utf8").replace("  function frame(now) {","  function frame(now) {if(window.freeze){lastTime=now;requestAnimationFrame(frame);return;}");
  await page.route("**/game.js",r=>r.fulfill({contentType:"application/javascript",body:source}));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.DashTypography.status==="ready");
  async function press(i,b=0){await page.evaluate(([i,b])=>{const d=window.__dashPunchDebug;d.sharedMenu.poll(.2);window.pads[i].buttons[b]={pressed:true,value:1};d.sharedMenu.poll(1/60);window.pads[i].buttons[b]={pressed:false,value:0};d.sharedMenu.poll(.2);},[i,b]);}
  await press(0,9);await press(1,9);
  async function choose(key,index=0){
    await page.locator(`[data-menu-action="selectRosterPlayer"][data-slot="${index}"]`).click();
    const number=await page.evaluate(key=>window.__dashPunchDebug.online.rollback.characterKeys.indexOf(key),key);
    await page.locator(`[data-menu-action="chooseCharacter"][data-character="${number}"]`).click();
  }
  async function sample(index,elapsed){
    let result;for(let retry=0;retry<30;retry++){
      result=await page.evaluate(({index,elapsed})=>{
        const d=window.__dashPunchDebug,state=d.cardFlourish.active.find(s=>s.index===index);if(!state)throw Error("Missing flourish");
        const before=d.online.rollback.hash();d.cardFlourish.draw(state.startedAt+elapsed*1000);const c=document.querySelector(`[data-flourish-slot="${index}"]`);if(!c)return {ended:true,pure:before===d.online.rollback.hash()};
        const p=c.getContext("2d"),data=p.getImageData(0,0,c.width,c.height).data;let pixels=0;for(let n=3;n<data.length;n+=4)if(data[n])pixels++;
        const a=c.getBoundingClientRect(),card=c.closest(".player-card").getBoundingClientRect();
        return {pixels,pure:before===d.online.rollback.hash(),width:c.width,height:c.height,smoothing:p.imageSmoothingEnabled,inside:a.left>=card.left&&a.right<=card.right&&a.top>=card.top&&a.bottom<=card.bottom,image:c.toDataURL(),pose:d.cardFlourish.sample(state.character,elapsed)};
      },{index,elapsed});if(result.ended||result.pixels>10)break;await page.waitForTimeout(30);
    }return result;
  }
  for(const key of keys){
    await choose(key);const plan=await page.evaluate(key=>window.__dashPunchDebug.cardFlourish.plan(key),key);
    const elapsed=plan.kind==="attack"?plan.stages[0].startup+plan.stages[0].active*.37:.25,first=await sample(0,elapsed);
    assert(first.pixels>10,`${key} must render`);assert(first.pure&&first.inside&&!first.smoothing,JSON.stringify({key,pure:first.pure,inside:first.inside,smoothing:first.smoothing,width:first.width,height:first.height}));
    if(plan.kind==="attack"){const second=await sample(0,plan.cycle+elapsed);assert.equal(second.pose.loop,1);assert(second.pixels>10);assert.deepEqual(first.pose.animation,second.pose.animation,`${key} repeats its native pose`);}
    if(["anchor","rain","booster","lamer","phantom","spike","reflektor","lancer","boomerangus"].includes(key))await page.screenshot({path:`${out}/${key}-1280.png`});
    const end=await sample(0,plan.duration+.001);assert(end.ended&&end.pure);assert.equal(await page.locator('[data-player-slot="0"] .is-flourishing').count(),0);
    assert.equal(await page.locator('[data-player-slot="0"] .asset-sprite-preview').evaluate(e=>getComputedStyle(e).visibility),"visible");
    assert.equal((await page.evaluate(()=>window.__dashPunchDebug.lobby.slots))[0].ready,false);samples.push({key,kind:plan.kind,duration:plan.duration,pixels:first.pixels});
  }
  // Separate controllers lock in together, keep their own focus, and cannot retrigger by holding confirm.
  for(let i=2;i<10;i++)await press(i,9);
  await page.evaluate(()=>{const d=window.__dashPunchDebug;for(let i=0;i<10;i++){d.cardFlourish.action(i,"back");}d.sharedMenu.poll(.2);for(const p of window.pads)p.buttons[0]={pressed:true,value:1};d.sharedMenu.poll(1/60);});
  assert.equal((await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active)).length,10);
  const initial=await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active);await page.evaluate(()=>window.__dashPunchDebug.sharedMenu.poll(1));assert.deepEqual(await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active),initial);
  await page.evaluate(()=>{for(const p of window.pads)p.buttons[0]={pressed:false,value:0};window.__dashPunchDebug.sharedMenu.poll(.2);});
  for(const width of[1280,1920]){
    await page.setViewportSize({width,height:width*9/16});
    const data=await page.evaluate(()=>{const d=window.__dashPunchDebug;d.cardFlourish.draw(Math.max(...d.cardFlourish.active.map(s=>s.startedAt))+100);return [...document.querySelectorAll('.card-flourish')].map(c=>{const a=c.getBoundingClientRect(),p=c.closest('.player-card').getBoundingClientRect();return {width:a.width,height:a.height,inside:a.left>=p.left&&a.right<=p.right&&a.top>=p.top&&a.bottom<=p.bottom};});});
    assert.equal(data.length,10);assert(data.every(r=>r.inside));await page.screenshot({path:`${out}/ten-${width}.png`});layouts.push({width,cards:data.length});
  }
  await press(1,8);assert.equal((await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active)).length,9);await press(1,9);
  assert.equal((await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active)).length,9,"reopening never repeats lock-in");
  await press(0,1);assert.equal((await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active)).length,8);
  await press(0);assert.equal((await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active)).length,9);
  // Keyboard confirms retain review and explicit Ready, then normal RAF finishes a flourish without another input.
  await page.evaluate(()=>{window.pads[0].buttons[8]={pressed:true,value:1};window.__dashPunchDebug.sharedMenu.poll(1/60);window.pads[0].buttons[8]={pressed:false,value:0};window.__dashPunchDebug.sharedMenu.poll(1/60);});
  await page.keyboard.press("KeyO");await page.keyboard.press("Enter");
  const count=await page.evaluate(()=>window.__dashPunchDebug.cardFlourish.active.length);assert(count>0);await page.evaluate(()=>window.freeze=false);await page.waitForTimeout(2300);assert.equal(await page.locator('.card-flourish').count(),0);
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({passed:true,samples,layouts,independentOwners:true,heldConfirmDedup:true,keyboard:true,physicalControllersTested:false,errors},null,2));console.log(JSON.stringify({passed:true,samples,layouts,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
