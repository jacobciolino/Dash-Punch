"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
const stages=["Crosswire","Flip Chamber","Uplift","Perch","High Perch","High Perch Drift","Battlefield","Smash Vile","Corners"];
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{window.pad={index:0,id:"Test Controller",mapping:"standard",connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{value:()=>[window.pad]});});
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    const url=`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`;
    await page.goto(url);
    await page.getByRole("button",{name:"Settings",exact:true}).click();
    await page.getByRole("button",{name:"Graphics: Enhanced",exact:true}).focus();
    await page.waitForTimeout(180);
    await page.evaluate(()=>window.pad.buttons[0]={pressed:true,value:1});await page.waitForTimeout(180);
    await page.evaluate(()=>window.pad.buttons[0]={pressed:false,value:0});await page.waitForTimeout(180);
    assert.equal(await page.evaluate(()=>localStorage.getItem("dashPunch.graphics.v1")),"classic");
    await page.reload();await page.getByRole("button",{name:"Settings",exact:true}).click();
    await page.getByRole("button",{name:"Graphics: Classic",exact:true}).focus();await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.quality),"enhanced");
    fs.mkdirSync("artifacts/hd2d",{recursive:true});
    const results=[];
    for(const stage of stages) {
      const result=await page.evaluate(async stage=>{
        const d=window.__dashPunchDebug,art=window.DASH_PUNCH_ART;
        d.online.rollback.setup({stageIndex:d.online.rollback.stageNames.indexOf(stage),characterKeys:["orbit","edgebert"],seed:42});
        d.fighters.forEach(f=>f.onGround=true);
        const profile=art.stageThemes[art.backdrops[stage].hd2d];
        const sources=[...new Set(profile.layers.flatMap(layer=>layer.sources).concat((profile.objects||[]).map(object=>object.src)))];
        for(const src of sources){const image=new Image();image.src=src;await image.decode();}
        for(const object of profile.objects||[])if(object.luminous) {
          const image=new Image();image.src=object.src;await image.decode();
          const probe=document.createElement("canvas");probe.width=object.crop[2];probe.height=object.crop[3];
          const paint=probe.getContext("2d");paint.drawImage(image,...object.crop,0,0,probe.width,probe.height);
          const rgba=paint.getImageData(0,0,probe.width,probe.height).data;
          let bright=0;for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>200&&Math.max(rgba[i],rgba[i+1],rgba[i+2])>160)bright++;
          if(!bright)throw Error("bloom source has no authored luminous pixels");
        }
        for(let i=0;i<8;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,40));}
        const hash=d.online.rollback.hash(),warm=d.stagePresentation.stats;
        for(let i=0;i<10;i++)d.stagePresentation.draw();
        const cached=d.stagePresentation.stats;
        if(hash!==d.online.rollback.hash())throw Error("render changed simulation");
        if(cached.filterPasses!==warm.filterPasses||cached.builds!==warm.builds||cached.composites!==warm.composites)throw Error("static layers rebuilt each frame");
        d.fighters.forEach(f=>f.x+=200);d.stagePresentation.draw();
        const parallax=d.stagePresentation.stats.lastOffsets;
        d.fighters.forEach(f=>f.x-=200);d.stagePresentation.draw();
        const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
        const image=canvas.toDataURL();
        const rgba=ctx.getImageData(0,0,1280,720).data;
        const colors=new Set();for(let i=0;i<rgba.length;i+=256)colors.add(`${rgba[i]},${rgba[i+1]},${rgba[i+2]}`);
        // Body art must be identical across qualities, including alpha and edges.
        ctx.clearRect(0,0,1280,720);d.gravity.draw(0);const spriteA=canvas.toDataURL();
        d.stagePresentation.setQuality("classic");ctx.clearRect(0,0,1280,720);d.gravity.draw(0);const spriteB=canvas.toDataURL();
        d.stagePresentation.setQuality("enhanced");d.stagePresentation.draw();
        Object.assign(d.fighters[0],{chargingPunch:true,punchCharge:d.fighters[0].data.punchChargeTime});
        const lit=d.stagePresentation.snapshot().lights.length;
        d.stagePresentation.draw();if(d.online.rollback.hash()===hash)throw Error("test charge was not installed");
        const chargedHash=d.online.rollback.hash();d.stagePresentation.draw();if(chargedHash!==d.online.rollback.hash())throw Error("illumination changed simulation");
        d.fighters[0].chargingPunch=false;
        if(stage==="High Perch"||stage==="High Perch Drift"){
          d.fighters[0].y=-600;d.fighters[1].y=-800;d.camera.update(1);d.stagePresentation.draw();
          const data=ctx.getImageData(640,300,1,1).data;if(data[3]!==255)throw Error("open-top scenery is blank");
        }
        document.body.classList.remove("menu-active");document.getElementById("menuLayer").style.display="none";
        return {image,colors:colors.size,spriteIdentical:spriteA===spriteB,parallaxChanged:JSON.stringify(parallax)!==JSON.stringify(warm.lastOffsets),lit,profile:profile.id};
      },stage);
      assert(result.colors>40);assert(result.spriteIdentical);assert(result.parallaxChanged);assert(result.lit>0);
      fs.writeFileSync(`artifacts/hd2d/${stage.toLowerCase().replaceAll(" ","-")}-enhanced.png`,Buffer.from(result.image.split(",")[1],"base64"));delete result.image;results.push({stage,...result});
    }
    const sizes=[];
    for(const [width,height] of [[960,640],[1280,900],[1920,1080]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>window.__dashPunchDebug.stagePresentation.draw());
      const rect=await page.locator("#game").boundingBox();assert(rect.width>300&&rect.x>=0&&rect.x+rect.width<=width+1);
      await page.screenshot({path:`artifacts/hd2d/viewport-${width}.png`});sizes.push([width,height]);
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync("artifacts/hd2d/verification.json",JSON.stringify({results,sizes,dpr:2},null,2));
    console.log("HD-2D browser: nine readable stages, cached parallax, no repeat blur, identical fighter pixels, illumination purity, open-top camera, saved controller/keyboard toggle and three DPR-2 resolutions passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
