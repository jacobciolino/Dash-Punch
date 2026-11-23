"use strict";
const fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    fs.mkdirSync("artifacts/team-arenas",{recursive:true});
    for(const name of ["Enchanted Forest","Castle Dungeon"]) {
      const image=await page.evaluate(async name=>{
        const d=window.__dashPunchDebug;d.arena.setup(name);
        for(let i=0;i<12;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,60));}
        return document.querySelector("#game").toDataURL();
      },name);
      fs.writeFileSync(`artifacts/team-arenas/${name.toLowerCase().replaceAll(" ","-")}-${process.argv[2]||"before"}.png`,Buffer.from(image.split(",")[1],"base64"));
    }
    console.log("Ten-player arena captures saved.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
