"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
const names=["Enchanted Forest","Castle Dungeon"];
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.testPad={index:0,id:"Arena Test Pad",connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,"getGamepads",{value:()=>[window.testPad]});
    });
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const click=name=>page.getByRole("button",{name,exact:true}).click();
    await page.getByRole("switch",{name:"Experimental Content",exact:true}).click();
    await click("Play");await click("Local");await page.waitForTimeout(250);
    await page.evaluate(()=>window.testPad.buttons[9]={pressed:true,value:1});await page.waitForTimeout(150);
    await page.evaluate(()=>window.testPad.buttons[9]={pressed:false,value:0});await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].device),0,"test controller did not join P1");
    await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();
    // The default second seat is a CPU; both seats must be ready to select a stage.
    if(!await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[1].cpu))await page.locator('[data-player-slot="1"] [data-field="kind"]').click();
    await click("Choose Stage");
    const index=await page.evaluate(()=>window.__dashPunchDebug.stageNames.indexOf("Castle Dungeon"));
    await page.locator(`[data-menu-action="chooseStage"][data-stage="${index}"]`).click();
    assert.equal(await page.locator(".stage-tile .tile-name").filter({hasText:/^Castle Dungeon$/}).count(),1);
    assert.equal(await page.locator(".stage-tile .tile-name").filter({hasText:/^Enchanted Forest$/}).count(),1);
    assert((await page.locator(".stage-tile .tile-name").allTextContents()).some(name=>name.endsWith("*")));
    await click("Set Up 5v5");
    const slots=await page.evaluate(()=>window.__dashPunchDebug.lobby.slots);
    assert.equal(slots.filter(s=>!s.empty).length,10);assert.equal(slots[0].device,0);
    assert(slots.slice(1).every(s=>s.cpu));assert.equal(slots.filter(s=>s.team===0).length,5);assert.equal(slots.filter(s=>s.team===1).length,5);
    await page.locator('[data-menu-action="slotReady"][data-slot="0"]').click();
    await click("Choose Stage");await click("Fight");
    await page.locator("#menuLayer").waitFor({state:"hidden",timeout:30000});
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.fighters.length),10);
    await page.keyboard.press("Escape");
    fs.mkdirSync("artifacts/team-arenas",{recursive:true});
    const visuals=[],performanceResults=[];
    for(const name of names) {
      const result=await page.evaluate(async name=>{
        const d=window.__dashPunchDebug;d.arena.setup(name,{ai:false});d.stagePresentation.setQuality("enhanced");
        for(let i=0;i<12;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,60));}
        const hash=d.online.rollback.hash(),warm=d.stagePresentation.stats;
        for(let i=0;i<10;i++)d.stagePresentation.draw();
        const pure=hash===d.online.rollback.hash(),cached=d.stagePresentation.stats,canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
        const image=canvas.toDataURL(),pixels=ctx.getImageData(64,128,1152,580).data,colors=new Set();
        for(let i=0;i<pixels.length;i+=128)colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
        const labels=[],fill=ctx.fillText;
        ctx.fillText=function(text,...args){labels.push(String(text));return fill.call(this,text,...args);};
        d.fighters[0].y=-500;d.stagePresentation.draw();ctx.fillText=fill;
        const camera=d.camera.state;d.arena.setup(name,{ai:false});
        return {image,colors:colors.size,pure,cached:warm.filterPasses===cached.filterPasses&&warm.builds===cached.builds&&warm.composites===cached.composites,
          marker:labels.includes("↑ P1"),camera,profile:d.stagePresentation.snapshot().profile.id};
      },name);
      assert(result.pure,"drawing changed the initial simulation");assert(result.cached);assert(result.marker);assert(result.colors>60);
      assert.equal(result.camera.zoom,1/3);assert.equal(result.camera.x,0);assert.equal(result.camera.y,0);
      fs.writeFileSync(`artifacts/team-arenas/${name.toLowerCase().replaceAll(" ","-")}-full-stage.png`,Buffer.from(result.image.split(",")[1],"base64"));
      delete result.image;visuals.push({name,...result});
      // Render-only cost: identical frozen ten-fighter setup, no live AI competing.
      for(const quality of ["classic","enhanced"]) {
        const render=await page.evaluate(async ({name,quality})=>{
          const d=window.__dashPunchDebug;d.arena.setup(name,{ai:false});d.stagePresentation.setQuality(quality);
          for(let i=0;i<10;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,40));}
          const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),samples=[];
          for(let i=0;i<90;i++){
            const start=performance.now();d.stagePresentation.draw();ctx.getImageData(640,400,1,1);samples.push(performance.now()-start);
            if(i%10===0)await new Promise(requestAnimationFrame);
          }
          samples.sort((a,b)=>a-b);return {median:samples[45],p95:samples[85],cache:d.stagePresentation.stats};
        },{name,quality});
        performanceResults.push({name,quality,render});
      }
    }
    // Normal live RAF loop: ten CPU fighters, actual AI, attacks and effects.
    await click("Resume Match");
    for(const name of names)for(const quality of ["classic","enhanced"]) {
      await page.evaluate(({name,quality})=>{const d=window.__dashPunchDebug;d.arena.setup(name);d.stagePresentation.setQuality(quality);}, {name,quality});
      await page.waitForTimeout(1200);
      const live=await page.evaluate(()=>new Promise(resolve=>{
        const d=window.__dashPunchDebug,start=d.fighters.map(f=>[f.x,f.y]),samples=[];let last;
        function tick(now){if(last!==undefined)samples.push(now-last);last=now;
          if(samples.length<180)return requestAnimationFrame(tick);
          samples.sort((a,b)=>a-b);resolve({median:samples[90],p95:samples[171],over25:samples.filter(x=>x>25).length,
            finite:d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)),count:d.fighters.length,
            moving:d.fighters.filter((f,i)=>Math.hypot(f.x-start[i][0],f.y-start[i][1])>20).length});}
        requestAnimationFrame(tick);
      }));
      assert(live.finite);assert.equal(live.count,10);assert(live.moving>2,"ten CPUs did not fight");
      performanceResults.find(result=>result.name===name&&result.quality===quality).live=live;
      console.log(`${name} / ${quality}: RAF median ${live.median.toFixed(1)} ms, p95 ${live.p95.toFixed(1)} ms, ${live.over25}/180 over 25 ms`);
      if(quality==="enhanced") {
        const image=await page.locator("#game").evaluate(canvas=>canvas.toDataURL());
        fs.writeFileSync(`artifacts/team-arenas/${name.toLowerCase().replaceAll(" ","-")}-ten-ai.png`,Buffer.from(image.split(",")[1],"base64"));
      }
    }
    await page.keyboard.press("Escape");
    await page.evaluate(()=>{document.body.classList.remove("menu-active");document.querySelector("#menuLayer").style.display="none";});
    for(const [width,height] of [[960,640],[1920,1080]]) {
      await page.setViewportSize({width,height});await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());
      const rect=await page.locator("#game").boundingBox();assert(rect.width>500&&rect.x>=0&&rect.x+rect.width<=width+1);
      await page.locator("#game").screenshot({path:`artifacts/team-arenas/viewport-${width}.png`});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync("artifacts/team-arenas/verification.json",JSON.stringify({visuals,performanceResults,viewports:[[960,640],[1440,1000],[1920,1080]],notes:"Headless Chrome on this machine; cached render includes synchronous one-pixel readback. Live samples are RAF intervals, not a console/hardware guarantee."},null,2));
    console.log(JSON.stringify({tests:"passed",visuals,performanceResults},null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
