"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {pathToFileURL}=require("node:url");
const root=process.env.CORE_RELEASE_DIR;if(!root)throw Error("Set CORE_RELEASE_DIR to the generated core edition");
const {server}=require(path.join(root,"server.js")),manifest=JSON.parse(fs.readFileSync(path.join(root,"build-manifest.json"),"utf8"));
assert.equal(manifest.fighters.length,19);assert.equal(manifest.fighters.at(-1),"lancer");
const onlineCharacters=(process.env.CORE_ONLINE_CHARACTERS||"gunman,whipado").split(",");
assert.equal(onlineCharacters.length,2);assert(onlineCharacters.every(key=>manifest.fighters.includes(key)));
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,timeout:30000,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows",...(process.env.BROWSER_SOFTWARE?["--disable-gpu"]:[])]});
    const hostContext=await browser.newContext({viewport:{width:1280,height:900}}),guestContext=await browser.newContext({viewport:{width:1280,height:900}});
    await hostContext.addInitScript(()=>{
      localStorage.setItem("dashPunch.core.menuPreferences.v1",JSON.stringify({experimentalContent:true,characters:["vesper","swordkun"],stage:"Flat"}));
      window.pad={index:0,id:"Core Edition Test Controller",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,"getGamepads",{value:()=>[window.pad]});
    });
    const host=await hostContext.newPage(),guest=await guestContext.newPage(),errors=[],missing=[];
    for(const page of [host,guest]) {page.on("pageerror",error=>errors.push(error.message));page.on("response",response=>{if(response.status()>=400)missing.push(response.url());});}
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
    const click=(page,name)=>page.getByRole("button",{name,exact:true}).click();
    const press=async button=>{await host.evaluate(b=>window.pad.buttons[b]={pressed:true,value:1},button);await host.waitForTimeout(180);await host.evaluate(b=>window.pad.buttons[b]={pressed:false,value:0},button);await host.waitForTimeout(160);};
    const dir=async x=>{await host.evaluate(x=>window.pad.axes=[x,0,0,0],x);await host.waitForTimeout(80);await host.evaluate(()=>window.pad.axes=[0,0,0,0]);await host.waitForTimeout(100);};
    await host.goto(url);assert.equal(await host.getByRole("switch",{name:"Experimental Content"}).count(),0);
    assert.equal(await host.getByRole("button",{name:"Extras",exact:true}).count(),0);
    assert.equal(await host.locator("#stageBuilderLayer").count(),0);
    await click(host,"Play");
    const cast=await host.locator("[data-mode-character]").evaluateAll(nodes=>nodes.map(node=>node.dataset.modeCharacter));
    assert.deepEqual(cast,["orbit","anchor","spike","rain"]);
    assert.equal(await host.locator('.sports-mode-art canvas[data-sports-preview]').count(),2);
    assert(cast.every(key=>manifest.fighters.includes(key)),"mode artwork must only use core fighters");
    assert.equal(await host.locator(".mode-art .mode-block").count(),0);
    assert.equal(await host.locator(".mode-spell").count(),1);
    // Check every installed runtime bitmap, not only the first two fighters.
    const loaded=await host.evaluate(async assets=>{
      let count=0;
      const sources=new Set(assets.filter(item=>/\.png$/.test(item.file)).map(item=>item.file));
      for(const set of Object.values(window.DASH_PUNCH_ART.spriteSets))for(const clip of Object.values(set.clips))sources.add(clip.src);
      for(const src of sources) {const image=new Image();image.src=src;await image.decode();if(!image.naturalWidth)throw Error("Invalid runtime bitmap");count++;}
      return count;
    },manifest.assets);
    fs.mkdirSync("artifacts/core-release",{recursive:true});
    for(const viewport of [{width:1280,height:900},{width:960,height:720},{width:390,height:844}]) {
      await host.setViewportSize(viewport);await host.waitForTimeout(150);
      const fits=await host.locator(".mode-card").evaluateAll(cards=>cards.every(card=>{const c=card.getBoundingClientRect();return c.left>=0&&c.right<=innerWidth+1&&card.scrollWidth<=card.clientWidth+1;}));assert(fits);
      await host.screenshot({path:`artifacts/core-release/modes-${viewport.width}.png`});
    }
    await host.setViewportSize({width:1280,height:900});await click(host,"Local");
    assert.equal(await host.locator(".player-card").count(),2);assert.equal(await host.locator(".experimental-legend").count(),0);
    assert.equal(await host.locator(".roster-lobby .character-tile").count(),manifest.fighters.length);
    assert.deepEqual(await host.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys),manifest.fighters);
    assert((await host.evaluate(()=>window.__dashPunchDebug.lobby.slots)).every(slot=>manifest.fighters.includes(slot.character)));
    await host.waitForTimeout(220);await press(9);
    assert.equal(await host.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].device),0);
    await dir(-1);assert.equal(await host.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys[window.__dashPunchDebug.lobby.cards.find(c=>c.index===0).cursor]),manifest.fighters.at(-1));
    await dir(1);await press(0);assert.equal(await host.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].character),"anchor");assert(!(await host.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].ready)));
    if(!(await host.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu)))await host.locator('[data-menu-action="waitingCpu"][data-slot="1"]').click();
    assert(await host.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu));
    await host.locator('[data-player-slot="0"] [data-field="ready"]').click();await click(host,"Choose Stage");
    assert.deepEqual(await host.locator(".stage-tile .tile-name").allTextContents(),manifest.stages);
    const dungeon=manifest.stages.indexOf("Castle Dungeon");
    await host.locator(`[data-menu-action="chooseStage"][data-stage="${dungeon}"]`).click();await click(host,"Set Up 5v5");
    await click(host,"Choose Stage");await click(host,"Fight");
    try{await host.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});}catch(error){
      console.error(JSON.stringify({errors,missing,menu:await host.locator("#menuLayer").innerText(),count:await host.evaluate(()=>window.__dashPunchDebug.fighters.length)}));throw error;
    }
    assert.equal(await host.evaluate(()=>window.__dashPunchDebug.fighters.length),10);
    await host.evaluate(()=>window.__dashPunchDebug.arena.setup("Castle Dungeon"));await host.waitForTimeout(1200);
    const timing=await host.evaluate(()=>new Promise(resolve=>{
      const d=window.__dashPunchDebug,start=d.fighters.map(f=>[f.x,f.y]),samples=[];let last;
      function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);
        samples.sort((a,b)=>a-b);resolve({median:samples[90],p95:samples[171],over25:samples.filter(ms=>ms>25).length,count:d.fighters.length,finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),moving:d.fighters.filter((f,i)=>Math.hypot(f.x-start[i][0],f.y-start[i][1])>20).length});}
      requestAnimationFrame(tick);
    }));
    assert(timing.finite&&timing.moving>2&&timing.count===10);await host.screenshot({path:"artifacts/core-release/ten-fighter-dungeon.png"});
    // Start clean online menus; the two copies have the same pruned stage IDs.
    await host.goto(url+"&netDebug=1");await guest.goto(url+"&netDebug=1");
    for(const page of [host,guest]){await click(page,"Play");await click(page,"Online 1v1");}
    await click(host,"Host Match");await host.waitForFunction(()=>window.__dashPunchDebug.online.state.roomCode.length===6);
    const code=await host.evaluate(()=>window.__dashPunchDebug.online.state.roomCode);
    await guest.locator("#onlineRoomCode").fill(code);await click(guest,"Join Match");
    for(const page of [host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.state.connected);
    for(const [index,page] of [host,guest].entries()) {
      const key=onlineCharacters[index];
      await click(page,"Choose Fighter");assert.equal(await page.locator(".character-tile").count(),manifest.fighters.length);
      await page.locator(`[data-menu-action="chooseOnlineCharacter"][data-character="${key}"]`).click();await click(page,"Ready");
    }
    await click(host,"Start Fight");
    let onlineStartWait="rollback frame > 30";
    try {
      for(const page of [host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>30);
      onlineStartWait="match phase playing";
      for(const page of [host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.matchFlow.state.phase==="playing");
    } catch(error) {
      const peers=[];
      for(const [index,page] of [host,guest].entries()) {
        try {
          peers.push(await page.evaluate(peer=>{
            const d=window.__dashPunchDebug,rb=d.online.rollback;
            const state={peer,online:d.online.state,network:rb.networkState,stats:rb.stats,match:d.matchFlow.state,
              countdown:document.querySelector(".countdown-number")?.textContent,
              visibility:document.visibilityState,focused:document.hasFocus(),hidden:document.hidden,
              menu:document.getElementById("menuLayer")?.innerText,metrics:document.getElementById("networkMetrics")?.innerText};
            try {
              const snapshot=rb.save();Object.assign(state,{hash:rb.hash(),stage:rb.stageNames[snapshot.core.stageIndex],characters:snapshot.core.characterKeys,snapshot});
            } catch(snapshotError) {state.snapshotError=snapshotError.message;}
            return state;
          },index===0?"host":"guest"));
        } catch(diagnosticError) {peers.push({peer:index===0?"host":"guest",diagnosticError:diagnosticError.message});}
      }
      const report={root,onlineCharacters,waitingFor:onlineStartWait,error:error.message,errors,missing,peers};
      fs.writeFileSync("artifacts/core-release/online-start-timeout.json",JSON.stringify(report,null,2));
      console.error(JSON.stringify({...report,peers:peers.map(({snapshot,...peer})=>peer)},null,2));
      throw error;
    }
    for(const page of [host,guest]) {
      await page.locator('[data-net="delay"]').selectOption("50");await page.locator('[data-net="jitter"]').selectOption("15");await page.locator('[data-net="loss"]').selectOption("0.05");
    }
    await host.keyboard.down("f");await guest.keyboard.down("f");await host.keyboard.down("Shift");await host.keyboard.down("d");await guest.keyboard.down("a");
    await host.waitForTimeout(200);await host.keyboard.up("Shift");await host.waitForTimeout(220);await host.keyboard.up("f");await guest.keyboard.up("f");
    await host.waitForTimeout(1000);await host.keyboard.up("d");await guest.keyboard.up("a");
    for(const page of [host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.frame>150);
    const stats=[];
    for(const page of [host,guest])stats.push(await page.evaluate(()=>{const d=window.__dashPunchDebug;return {...d.online.rollback.stats,state:d.online.rollback.networkState,transport:d.online.state.transport,stage:d.stageNames[d.online.rollback.save().core.stageIndex],characters:d.online.rollback.save().core.characterKeys};}));
    for(const result of stats){assert.equal(result.transport,"webrtc");assert.equal(result.stage,"Crosswire");assert.deepEqual(result.characters,onlineCharacters);assert.match(result.hashStatus,/matched frame/);assert(!result.state.paused);}
    assert(stats[0].rollbacks+stats[1].rollbacks>0);
    const session=stats[0].state.id;await host.keyboard.press("Escape");
    for(const page of [host,guest])await page.waitForFunction(()=>window.__dashPunchDebug.online.rollback.networkState.paused);
    await click(host,"Rematch");
    for(const page of [host,guest])await page.waitForFunction(previous=>window.__dashPunchDebug.online.rollback.networkState.id!==previous&&window.__dashPunchDebug.online.rollback.frame>30,session);
    await guest.close();await host.waitForFunction(()=>!window.__dashPunchDebug.online.state.connected);
    const offline=await browser.newPage({viewport:{width:1280,height:900}});
    offline.on("pageerror",error=>errors.push(error.message));
    await offline.goto(pathToFileURL(path.join(root,"index.html")).href+"?debugHitboxes=1");
    await click(offline,"Play");await click(offline,"Local");await offline.waitForTimeout(500);
    assert.equal(await offline.locator(".player-card").count(),2);
    for(const slot of await offline.evaluate(()=>window.__dashPunchDebug.lobby.slots.filter(s=>!s.empty&&!s.cpu))){
      await offline.locator(`[data-player-slot="${slot.index}"] [data-field="open"]`).click();await offline.locator(`[data-player-slot="${slot.index}"] [data-field="confirm"]`).click();await offline.locator(`[data-player-slot="${slot.index}"] [data-field="ready"]`).click();
    }
    await click(offline,"Choose Stage");await click(offline,"Fight");
    await offline.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});await offline.waitForTimeout(400);
    assert.equal(await offline.evaluate(()=>window.__dashPunchDebug.fighters.length),2);
    await offline.screenshot({path:"artifacts/core-release/offline-file-play.png"});await offline.close();
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    const report={tests:"passed",root,loadedPngs:loaded,embeddedSheets:manifest.embeddedAssets.length,offlineFilePlay:true,coreFighters:manifest.fighters.length,coreStages:manifest.stages.length,controllerJoin:true,tenFighterTiming:timing,online:stats,pause:true,rematch:true,disconnect:true,missingAssets:missing};
    fs.writeFileSync("artifacts/core-release/verification.json",JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
