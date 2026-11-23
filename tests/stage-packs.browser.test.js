"use strict";
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
const stages={Crosswire:"castle-prison","Flip Chamber":"castle-prison",Uplift:"snowy-mountains","High Perch":"snowy-mountains","High Perch Drift":"strange-world","Smash Vile":"strange-world",Perch:"deep-forest",Battlefield:"deep-forest",Corners:"deep-forest"};
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.getByRole("button",{name:"Extras",exact:true}).click();
    await page.getByRole("button",{name:"Quick Playtest",exact:true}).click();
    const captures=new Set();
    for(const [stage,theme] of Object.entries(stages)) {
      const data=await page.evaluate(async({stage,theme})=>{
        const d=window.__dashPunchDebug;
        const art=window.DASH_PUNCH_ART.backdrops[stage];
        for(const src of [art.src,art.groundSrc,art.edgeSrc]){const image=new Image();image.src=src;await image.decode();}
        d.ai.configure({characters:["orbit","spike"],stageName:stage});
        return {src:art.src,pixelArt:art.pixelArt};
      },{stage,theme});
      assert(data.src.includes(theme));assert(data.pixelArt);
      await page.waitForTimeout(250);
      const pixels=await page.locator("#game").evaluate(canvas=>{
        const data=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
        const colors=new Set();for(let i=0;i<data.length;i+=256)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
        return colors.size;
      });
      assert(pixels>30,"stage is blank");
      if(!captures.has(theme)){await page.screenshot({path:`/tmp/dash-stage-${theme}.png`});captures.add(theme);}
    }
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Local",exact:true}).click();
    for(const slot of [0,1]){const ready=page.locator(`[data-menu-action="slotReady"][data-slot="${slot}"]`);if(await ready.isEnabled())await ready.click();}
    await page.getByRole("button",{name:"Choose Stage",exact:true}).click();
    await page.screenshot({path:"/tmp/dash-stage-pack-select.png"});
    assert(await page.locator('.stage-backdrop-preview image[href*="assets/stages/"]').count()>=8);
    assert.deepEqual(errors,[]);
    console.log("Stage packs: all nine assignments, decoded art/textures, nonblank arena and stage previews passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
