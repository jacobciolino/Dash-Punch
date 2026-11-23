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
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    fs.mkdirSync("artifacts/terrain-cleanup",{recursive:true});
    for(const stage of stages) {
      const result=await page.evaluate(async stage=>{
        const d=window.__dashPunchDebug;
        d.online.rollback.setup({stageIndex:d.online.rollback.stageNames.indexOf(stage),characterKeys:["orbit","edgebert"],seed:42});
        for(let i=0;i<6;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,40));}
        const before=JSON.stringify(d.terrainArt.rects),hash=d.online.rollback.hash();
        const proto=CanvasRenderingContext2D.prototype,stroke=proto.stroke,rect=proto.strokeRect;
        let outlines=0;proto.stroke=function(...args){outlines++;return stroke.apply(this,args);};proto.strokeRect=function(...args){outlines++;return rect.apply(this,args);};
        d.terrainArt.draw();const normal=outlines;
        d.terrainArt.debug();const debug=outlines;
        proto.stroke=stroke;proto.strokeRect=rect;
        if(before!==JSON.stringify(d.terrainArt.rects)||hash!==d.online.rollback.hash())throw Error("terrain rendering changed collision or simulation");
        d.stagePresentation.draw();const enhanced=document.querySelector("#game").toDataURL();
        d.stagePresentation.setQuality("classic");d.terrainArt.draw();d.stagePresentation.draw();
        const classic=document.querySelector("#game").toDataURL();d.stagePresentation.setQuality("enhanced");
        return {normal,debug,enhanced,classic};
      },stage);
      assert.equal(result.normal,0,`${stage} still draws terrain outlines/guides`);assert(result.debug>0,`${stage} lost debug outlines`);
      for(const quality of ["enhanced","classic"])fs.writeFileSync(`artifacts/terrain-cleanup/${stage.toLowerCase().replaceAll(" ","-")}-${quality}.png`,Buffer.from(result[quality].split(",")[1],"base64"));
    }
    await page.getByRole("button",{name:"Play",exact:true}).click();await page.getByRole("button",{name:"Local",exact:true}).click();
    for(const slot of [0,1])await page.locator(`[data-menu-action="slotReady"][data-slot="${slot}"]`).click();
    await page.getByRole("button",{name:"Choose Stage",exact:true}).click();
    const preview=await page.locator(".stage-part").evaluateAll(parts=>parts.map(part=>{const s=getComputedStyle(part);return {border:s.borderTopWidth,shadow:s.boxShadow,image:s.backgroundImage};}));
    assert(preview.every(part=>part.border==="0px"&&part.shadow==="none"));assert(preview.some(part=>part.image.includes("edge.png")));
    await page.screenshot({path:"artifacts/terrain-cleanup/stage-select.png"});
    await page.reload();await page.getByRole("button",{name:"Extras",exact:true}).click();await page.getByRole("button",{name:"Quick Playtest",exact:true}).click();
    await page.evaluate(()=>window.__dashPunchDebug.ai.configure({stageName:"Battlefield",characters:["orbit","spike","edgebert","chungus"],teams:[0,1,2,3]}));
    await page.waitForTimeout(1500);
    await page.screenshot({path:"artifacts/terrain-cleanup/four-player-combat.png"});
    assert(await page.evaluate(()=>window.__dashPunchDebug.fighters.length===4&&window.__dashPunchDebug.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y))));
    assert.deepEqual(errors,[]);
    console.log("Terrain borders: zero normal outlines across nine stages, debug preserved, unchanged geometry/state, textured previews, both graphics qualities and live four-player combat passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
