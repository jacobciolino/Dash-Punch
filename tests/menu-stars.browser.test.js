"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  fs.mkdirSync("artifacts/menu-stars",{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});const errors=[],results=[];
  for(const width of[1280,1920]){
    const page=await browser.newPage({viewport:{width,height:width*9/16}});page.on("pageerror",e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.waitForFunction(()=>window.__dashPunchDebug?.sharedMenu.stars?.frames>10);
    const click=async(action,screen)=>{
      await page.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});
      await page.locator(`[data-menu-action="${action}"]`).click();
      if(screen)await page.locator(`[data-menu-screen="${screen}"]`).waitFor();
      await page.waitForFunction(()=>{const r=window.__dashPunchDebug.radialMenu;return !r.wipe&&!r.active.length;});
    };
    async function capture(screen){
      assert.equal(await page.locator(`[data-menu-screen="${screen}"]`).count(),1,"verify the actual destination, not its pending transition");
      assert(await page.locator("#menuStars").isVisible());await page.waitForTimeout(150);
      const before=await page.locator("#menuStars").evaluate(c=>c.toDataURL());await page.waitForTimeout(150);
      const sample=await page.evaluate(()=>{
        const c=document.querySelector("#menuStars"),pixels=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let colored=0;
        for(let i=0;i<pixels.length;i+=4)if(pixels[i]||pixels[i+1]||pixels[i+2])colored++;
        return {stats:window.__dashPunchDebug.sharedMenu.stars,colored,pointerEvents:getComputedStyle(c).pointerEvents,image:c.toDataURL(),black:getComputedStyle(c).backgroundColor};
      });assert.notEqual(before,sample.image);assert(sample.colored>5&&sample.colored<sample.stats.width*sample.stats.height*.02);assert.equal(sample.pointerEvents,"none");assert.equal(sample.black,"rgb(0, 0, 0)");
      await page.screenshot({path:`artifacts/menu-stars/${screen}-${width}.png`});delete sample.image;results.push({screen,width,...sample});
    }
    await capture("start");await click("goMode","mode");await capture("mode");
    await click("goSettings","settings");await capture("settings");
    await click("goControls","controls");await capture("controls");
    await click("controlsBack");await page.getByRole("button",{name:"Confirm Return",exact:true}).click();await page.locator('[data-menu-screen="settings"]').waitFor();
    await click("settingsBack");await page.getByRole("button",{name:"Confirm Return",exact:true}).click();await page.locator('[data-menu-screen="mode"]').waitFor();
    await click("goDashballSetup","dashballSetup");await capture("dashballSetup");
    await click("dashballOnline","stages");await capture("stages");
    await page.emulateMedia({reducedMotion:"reduce"});await page.waitForTimeout(100);const reduced=await page.locator("#menuStars").evaluate(c=>c.toDataURL());const frames=await page.evaluate(()=>window.__dashPunchDebug.sharedMenu.stars.frames);
    await page.waitForTimeout(200);assert.equal(await page.locator("#menuStars").evaluate(c=>c.toDataURL()),reduced);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.sharedMenu.stars.frames),frames);
    await page.evaluate(()=>window.__dashPunchDebug.dashball.setup({arena:"standard"},{characters:["anchor","rain"]}));await page.waitForTimeout(100);assert(await page.locator("#menuStars").isHidden());
    const hash=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash());assert(hash);await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync("artifacts/menu-stars/results.json",JSON.stringify({passed:true,results,errors,simulatedBrowser:true},null,2));console.log(JSON.stringify({passed:true,results,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
