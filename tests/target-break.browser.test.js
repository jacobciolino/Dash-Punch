"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.addInitScript(()=>{window.testPad={index:0,id:"Target Test Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{value:()=>[window.testPad]});});
    await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    await click("Play");await click("Dashball");await click("Choose Fighters");await page.waitForTimeout(250);
    async function button(index){await page.evaluate(i=>window.testPad.buttons[i]={pressed:true,value:1},index);await page.waitForTimeout(110);await page.evaluate(i=>window.testPad.buttons[i]={pressed:false,value:0},index);await page.waitForTimeout(120);}
    await button(9);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].device),0);
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();await click("Choose Stage");await page.waitForTimeout(250);
    assert.deepEqual(await page.locator(".stage-tile .tile-name").allTextContents(),["Soccer","Basketball","Wrap Around Basketball","Target Break","Golden Rush"]);
    for(let i=0;i<3;i++)await button(15);await button(0);
    assert.equal(await page.locator(".stage-preview-large h2").textContent(),"Target Break");
    assert.equal(await page.locator(".stage-preview-large .stage-target").count(),12);
    assert.equal(await page.locator('[data-menu-screen="countdown"]').count(),0);
    await click("Start Dashball");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    fs.mkdirSync("artifacts/target-break",{recursive:true});
    const art=await page.evaluate(async()=>{const i=new Image();i.src="assets/dashball/targets.png";await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const ctx=c.getContext("2d");ctx.drawImage(i,0,0);const p=ctx.getImageData(0,0,i.width,i.height).data;for(let n=3;n<p.length;n+=4)if(p[n]!==0&&p[n]!==255)throw Error("Antialiased target art");return [i.width,i.height];});
    assert.deepEqual(art,[512,128]);
    const initial=await page.evaluate(()=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"target-break"},{ai:false});d.stagePresentation.draw();
      const cam=d.camera.state,c=document.querySelector("#game"),ctx=c.getContext("2d");
      const colors=d.dashball.state.targets.map(t=>{const x=Math.round(cam.offset.x+(t.x-cam.x)*cam.zoom),y=Math.round(cam.offset.y+(t.y-cam.y)*cam.zoom);return [...ctx.getImageData(x,y,1,1).data];});
      return {targets:d.dashball.state.targets.length,colors,image:c.toDataURL()};
    });assert.equal(initial.targets,12);assert(initial.colors.every(p=>p[0]>120||p[1]>120));
    fs.writeFileSync("artifacts/target-break/full-arena.png",Buffer.from(initial.image.split(",")[1],"base64"));
    await page.setViewportSize({width:980,height:720});await page.waitForTimeout(100);
    assert(await page.evaluate(()=>{const d=window.__dashPunchDebug;d.stagePresentation.draw();const c=d.camera.state,canvas=document.querySelector("#game");return d.dashball.state.targets.every(t=>{const x=c.offset.x+(t.x-c.x)*c.zoom,y=c.offset.y+(t.y-c.y)*c.zoom,r=t.r*c.zoom;return x-r>=0&&x+r<=canvas.width&&y-r>=0&&y+r<=canvas.height;});}));
    await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(100);
    const broken=await page.evaluate(()=>{
      const d=window.__dashPunchDebug,s=d.dashball.state,t=s.targets[2];Object.assign(s.ball,{x:t.x+t.r+s.ball.r-2,y:t.y,vx:-1000,vy:0});d.dashball.step();
      const snap=d.online.rollback.save(),hash=d.online.rollback.hash();d.presentationEffects.step(.11);d.stagePresentation.draw();
      return {score:[...s.scores],broken:t.destroyed,effects:snap.presentation.effects.filter(e=>e.sprite?.targetBreak).length,pure:hash===d.online.rollback.hash(),image:document.querySelector("#game").toDataURL()};
    });assert(broken.broken);assert.deepEqual(broken.score,[0,1]);assert.equal(broken.effects,1);assert(broken.pure);
    fs.writeFileSync("artifacts/target-break/fracture.png",Buffer.from(broken.image.split(",")[1],"base64"));
    await page.evaluate(()=>{const d=window.__dashPunchDebug,s=d.dashball.state;for(const t of s.targets.filter(t=>t.team===0&&!t.destroyed)){Object.assign(s.ball,{x:t.x+t.r+s.ball.r-1,y:t.y,vx:-1200,vy:0});d.dashball.step();}});
    await page.locator('[data-menu-screen="dashballResult"]').waitFor({timeout:5000});
    const result=await page.locator('[data-menu-screen="dashballResult"]').innerText();assert.match(result,/BLUE WINS/);assert.match(result,/6\/6 broken/);assert.match(result,/Match Duration/);
    await click("Rematch");await page.locator("#menuLayer").waitFor({state:"hidden",timeout:15000});
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.dashball.state.targets.filter(t=>!t.destroyed).length),12);
    const performanceResults=[];
    for(const ruleset of ["court","battle"]){
      await page.evaluate(ruleset=>window.__dashPunchDebug.dashball.setup({arena:"target-break",ruleset,teamSize:5},{characters:["orbit","spike","rain","chungus","anchor","whipado","archer","gunman","microusb","edgebert"],ai:true}),ruleset);
      await page.waitForTimeout(2500);
      const perf=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);const d=window.__dashPunchDebug;resolve({median:samples[90],p95:samples[171],over25:samples.filter(n=>n>25).length,fighters:d.fighters.length,scores:[...d.dashball.state.scores],finite:d.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y))});}requestAnimationFrame(tick);}));
      assert.equal(perf.fighters,10);assert(perf.finite);performanceResults.push({ruleset,...perf});
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",controllerStageSelection:true,targetArt:art,allTargetsVisible:true,smallWindowFraming:true,rematch:true,performanceResults}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
