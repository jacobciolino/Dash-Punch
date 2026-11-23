"use strict";
const assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.addInitScript(()=>Object.defineProperty(navigator,"getGamepads",{value:()=>[]}));
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.getByRole("button",{name:"Play",exact:true}).click();
    await page.getByRole("button",{name:"Local",exact:true}).click();
    const key=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.characterKeys.indexOf("spike"));
    const portrait=page.locator(`[data-character="${key}"] .asset-sprite-preview`);
    await page.waitForFunction(index=>document.querySelector(`[data-character="${index}"] .asset-sprite-preview`)?.style.backgroundImage.includes("data:image/png"),key);
    assert.equal(await page.locator('.spike-armor-preview').count(),0,"old rigid armor overlay remains");
    for(const clip of ["idle","walk","jump","attack1","hurt","death"]) {
      await page.waitForFunction(name=>Boolean(window.__dashPunchDebug.spikeArt(name)),clip);
      const color=await page.evaluate(async name=>{
        const d=window.__dashPunchDebug,art=d.spikeArt(name);
        const original=new Image();original.src=d.spriteAssets.seekerpro.clips[name].src;await original.decode();
        const modified=new Image();modified.src=art.src;await modified.decode();
        const canvas=document.createElement('canvas');canvas.width=art.width;canvas.height=art.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(original,0,0);const old=ctx.getImageData(0,0,art.width,art.height).data;
        ctx.clearRect(0,0,art.width,art.height);ctx.drawImage(modified,0,0);const data=ctx.getImageData(0,0,art.width,art.height).data;
        let green=0,purple=0,newSpinePixels=0;
        for(let i=0;i<data.length;i+=4)if(data[i+3]>100){if(data[i+1]>data[i]*1.3&&data[i+1]>data[i+2]*1.2)green++;if(data[i+2]>data[i+1]*1.15&&data[i]>data[i+1]*1.1)purple++;if(!old[i+3])newSpinePixels++;}
        return {green,purple,newSpinePixels,width:art.width,height:art.height,originalWidth:original.naturalWidth};
      },clip);
      assert(color.green>color.purple*3,`${clip} is not predominantly green`);
      assert(color.newSpinePixels>0,`${clip} has no integrated spines`);
      assert.equal(color.width,color.originalWidth,"sprite layout changed");
    }
    await page.screenshot({path:"/tmp/spike-green-select.png"});
    await page.keyboard.press("Escape");await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Extras",exact:true}).click();await page.getByRole("button",{name:"Quick Playtest",exact:true}).click();
    await page.evaluate(()=>{const d=window.__dashPunchDebug;d.ai.configure({stageName:"Flat",characters:["spike","orbit"],positions:[{x:500,y:500},{x:800,y:500}]});d.updateHumanInput(0);d.updateHumanInput(1);});
    await page.waitForTimeout(500);
    await page.screenshot({path:"/tmp/spike-green-match.png"});
    assert.deepEqual(errors,[]);
    console.log("Spike green art: six animation sheets recolored, silhouette spines, shared previews, Orbit source preserved and match rendering passed.");
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
