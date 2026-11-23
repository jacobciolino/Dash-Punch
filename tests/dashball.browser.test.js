"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding"]});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.testPad={index:0,id:"Dashball Test Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,"getGamepads",{value:()=>[window.testPad]});
    });
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
    await page.goto(url);const click=name=>page.getByRole("button",{name,exact:true}).click();
    const ballArt=await page.evaluate(async()=>{
      const image=new Image();image.src="assets/dashball/ball.png";await image.decode();
      const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,image.width,image.height).data,colors=new Set();
      for(let i=0;i<data.length;i+=4){const alpha=data[i+3];if(alpha!==0&&alpha!==255)throw Error("Antialiased ball art");colors.add([...data.slice(i,i+4)].join(","));}
      return {width:image.width,height:image.height,colors:colors.size};
    });
    assert.deepEqual(ballArt,{width:64,height:16,colors:5});
    await click("Play");await click("Dashball");
    assert.equal(await page.locator('[data-menu-screen="dashballSetup"]').count(),1);
    // Keyboard operates the same focusable two-action menu.
    await page.locator('[data-menu-action="dashballRules"]').focus();await page.keyboard.press("Enter");
    assert.equal(await page.locator('[data-menu-action="dashballRules"]').innerText(),"Battle");
    await click("Battle");
    await click("Choose Fighters");
    await page.waitForTimeout(250);
    await page.evaluate(()=>window.testPad.buttons[9]={pressed:true,value:1});await page.waitForTimeout(120);
    await page.evaluate(()=>window.testPad.buttons[9]={pressed:false,value:0});await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].device),0);
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();
    await click("Choose Stage");
    assert.equal(await page.locator('[data-stage-pool="dashball"]').count(),1);
    assert.deepEqual(await page.locator(".stage-tile .tile-name").allTextContents(),["Soccer","Basketball","Wrap Around Basketball","Target Break","Golden Rush"]);
    await page.waitForTimeout(250);
    await page.evaluate(()=>window.testPad.buttons[15]={pressed:true,value:1});await page.waitForTimeout(120);
    await page.evaluate(()=>window.testPad.buttons[15]={pressed:false,value:0});await page.waitForTimeout(100);
    await page.evaluate(()=>window.testPad.buttons[0]={pressed:true,value:1});await page.waitForTimeout(120);
    await page.evaluate(()=>window.testPad.buttons[0]={pressed:false,value:0});await page.waitForTimeout(150);
    assert.equal(await page.locator(".stage-preview-large h2").textContent(),"Basketball","host controller must select a Dashball level");
    assert.equal(await page.locator('[data-menu-screen="countdown"]').count(),0,"choosing a level must not start it");
    fs.mkdirSync("artifacts/dashball",{recursive:true});
    await page.screenshot({path:"artifacts/dashball/stage-select.png"});
    for(const name of ["Soccer","Basketball","Wrap Around Basketball"]){
      await page.getByRole("button",{name,exact:true}).click();
      assert.equal(await page.locator(".stage-preview-large h2").textContent(),name);
    }
    await page.getByRole("button",{name:"Soccer",exact:true}).click();
    await click("Start Dashball");
    await page.locator('[data-menu-screen="countdown"]').waitFor();
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.fighters.length),2);
    assert(await page.evaluate(()=>Boolean(window.__dashPunchDebug.dashball.state)));
    await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    fs.mkdirSync("artifacts/dashball",{recursive:true});
    const results=[];
    for(const ruleset of ["court","battle"])for(const arena of ["standard","elevated","elevated-open"]){
      await page.evaluate(config=>{const d=window.__dashPunchDebug;d.dashball.setup(config,{characters:["orbit","spike","rain","chungus","archer","anchor","whipado","microusb","gunman","kite"],ai:true});}, {ruleset,arena,teamSize:5});
      await page.waitForTimeout(1800);
      const info=await page.evaluate(()=>{
        const d=window.__dashPunchDebug,s=d.dashball.state,hash=d.online.rollback.hash();d.stagePresentation.draw();
        const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),pixels=ctx.getImageData(160,160,960,540).data,colors=new Set();
        for(let i=0;i<pixels.length;i+=16)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
        return {count:d.fighters.length,camera:d.camera.state,colors:colors.size,pure:hash===d.online.rollback.hash(),
          finite:d.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)),ball:{x:s.ball.x,y:s.ball.y},image:canvas.toDataURL()};
      });
      assert.equal(info.count,10);assert(info.finite);assert(info.pure);assert(info.colors>30);
      assert(info.camera.offset.y+1440*info.camera.zoom<=720);
      fs.writeFileSync(`artifacts/dashball/${ruleset}-${arena}.png`,Buffer.from(info.image.split(",")[1],"base64"));delete info.image;results.push({ruleset,arena,...info});
    }
    const perf=await page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(t){if(last!==undefined)samples.push(t-last);last=t;if(samples.length<180)return requestAnimationFrame(tick);samples.sort((a,b)=>a-b);resolve({median:samples[90],p95:samples[171],over25:samples.filter(t=>t>25).length});}requestAnimationFrame(tick);}));
    const high=await page.evaluate(()=>{
      const d=window.__dashPunchDebug;d.dashball.setup({arena:"elevated-open",ruleset:"battle"},{ai:false});
      d.fighters[0].y=-1500;d.dashball.state.ball.y=-1800;d.camera.update(1);
      const hash=d.online.rollback.hash();d.stagePresentation.draw();
      const camera=d.camera.state,b=d.dashball.state.ball;
      return {pure:hash===d.online.rollback.hash(),camera,ballY:camera.offset.y+(b.y-camera.y)*camera.zoom,image:document.querySelector("#game").toDataURL()};
    });
    assert(high.pure);assert(high.camera.zoom<.38);assert(high.ballY>160&&high.ballY<720);
    fs.writeFileSync("artifacts/dashball/wrap-basketball-high.png",Buffer.from(high.image.split(",")[1],"base64"));
    await page.keyboard.press("Escape");await click("Back");
    await page.setViewportSize({width:960,height:640});await click("Play");await click("Dashball");
    for(const b of await page.locator("#menuLayer button").all()){
      const box=await b.boundingBox();if(box)assert(box.x>=0&&box.x+box.width<=961,"menu button overflows");
    }
    await page.screenshot({path:"artifacts/dashball/setup-small.png"});
    const oldRules=await page.locator('[data-menu-action="dashballRules"]').innerText();
    await page.locator('[data-menu-action="dashballRules"]').focus();await page.waitForTimeout(250);
    await page.evaluate(()=>window.testPad.buttons[0]={pressed:true,value:1});await page.waitForTimeout(120);
    await page.evaluate(()=>window.testPad.buttons[0]={pressed:false,value:0});await page.waitForTimeout(150);
    assert.notEqual(await page.locator('[data-menu-action="dashballRules"]').innerText(),oldRules,"controller Dash must operate setup");
    await page.evaluate(()=>window.testPad.buttons[1]={pressed:true,value:1});await page.waitForTimeout(120);
    await page.evaluate(()=>window.testPad.buttons[1]={pressed:false,value:0});await page.waitForTimeout(120);
    assert.equal(await page.locator('[data-menu-screen="mode"]').count(),1,"controller Punch must go back");
    // The normal game's stage pool never contains Dashball levels.
    await click("Local");
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].ready))await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();
    await click("Choose Stage");assert.equal(await page.locator('[data-stage-pool="standard"]').count(),1);
    assert(!(await page.locator(".stage-tile .tile-name").allTextContents()).some(name=>/Soccer|Basketball/.test(name)));
    assert.deepEqual(errors,[]);console.log(JSON.stringify({results,perf,errors}));
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
