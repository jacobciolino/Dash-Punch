"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require(path.join(root,"server.js"));
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>Object.defineProperty(navigator,"getGamepads",{value:()=>[]}));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    fs.mkdirSync("artifacts/title-splash",{recursive:true});
    for(const [width,height] of [[1280,720],[1280,900],[960,720],[960,1080],[1920,1080],[390,844]]) {
      await page.setViewportSize({width,height});
      const result=await page.locator(".title-screen").evaluate(async screen=>{
        const style=getComputedStyle(screen),src=style.backgroundImage.match(/url\("?([^"\)]+)"?\)/)?.[1];
        if(!src?.includes("dash-punch-orbit-anchor-thumb-up.png"))throw Error("old upside-down fist still selected");
        const image=new Image();image.src=src;await image.decode();
        const c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;
        const p=c.getContext("2d");p.drawImage(image,0,0);const data=p.getImageData(0,0,c.width,c.height).data;
        let purple=0,green=0;
        for(let y=0;y<c.height;y+=4)for(let x=0;x<c.width;x+=4){const i=(y*c.width+x)*4,[r,g,b]=data.slice(i,i+3);
          if(x<c.width*.45&&b>r*1.1&&r>g*1.25&&b>65)purple++;
          if(x>c.width*.55&&g>r*1.2&&g>b*1.15&&g>95)green++;
        }
        const r=screen.getBoundingClientRect(),title=screen.querySelector(".title-lockup").getBoundingClientRect(),menu=screen.querySelector(".title-menu").getBoundingClientRect();
        // The complete scene fits instead of cropping Anchor's hood in tall windows.
        const scale=Math.min(r.width/image.naturalWidth,r.height/image.naturalHeight);
        const fit=style.backgroundSize==="contain"||style.backgroundSize==="100% auto"&&r.width/image.naturalWidth<=r.height/image.naturalHeight;
        const controls=[...screen.querySelectorAll("[data-menu-action]")].map(button=>{const b=button.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right+1&&b.bottom<=r.bottom+1&&button.scrollWidth<=button.clientWidth+1;});
        return {size:[image.naturalWidth,image.naturalHeight],purple,green,fit,scale,controls,nonoverlap:title.bottom<menu.top,pixelated:style.imageRendering==="pixelated"};
      });
      assert(result.size[0]>1000&&result.size[1]>500);assert(result.purple>100&&result.green>400,"missing Orbit or green spell-fist");
      assert(result.fit,"splash crops a fighter");assert(result.controls.every(Boolean));assert(result.nonoverlap&&result.pixelated);
      await page.screenshot({path:`artifacts/title-splash/title-${width}x${height}.png`});
    }
    await page.setViewportSize({width:1280,height:900});
    await page.getByRole("button",{name:"Play",exact:true}).click();
    await page.locator('[data-menu-action="localPlay"]').click();
    await page.locator('[data-menu-screen="characters"]').waitFor();
    assert.equal(await page.locator(".character-tile").count(),14);
    await page.goto(pathToFileURL(path.join(root,"index.html")).href);
    await page.locator(".title-screen").waitFor();
    const offlineImage=await page.locator(".title-screen").evaluate(async screen=>{const src=getComputedStyle(screen).backgroundImage.match(/url\("?([^"\)]+)"?\)/)?.[1],image=new Image();image.src=src;await image.decode();return {src,width:image.naturalWidth,height:image.naturalHeight};});
    assert(offlineImage.src.includes("dash-punch-orbit-anchor-thumb-up.png"));assert(offlineImage.width>1000&&offlineImage.height>500);assert.deepEqual(errors,[]);
    console.log("Title splash: thumb-up Orbit/Anchor art loaded, purple dash and green fist visible, full-scene framing, nearest-neighbor display, readable controls at six viewport sizes, fourteen-fighter lobby and offline title loading passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
