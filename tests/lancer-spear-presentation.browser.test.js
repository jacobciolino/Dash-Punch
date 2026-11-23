"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{execFileSync}=require("node:child_process"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{let browser;try{
  const out="artifacts/lancer-carried-spear";fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});
  const errors=[],images=[],source=execFileSync("git",["show","48a1352:fighter-presentation.js"],{encoding:"utf8"});
  for(const before of[true,false]){
    const page=await browser.newPage({viewport:{width:1280,height:720}});page.on("pageerror",e=>errors.push(e.message));if(before)await page.route("**/fighter-presentation.js",r=>r.fulfill({contentType:"application/javascript",body:source}));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);await page.waitForFunction(()=>window.__dashPunchDebug&&window.DashTypography.status==="ready");
    await page.waitForFunction(()=>{const a=window.DASH_PUNCH_ART,set=a.spriteSets[a.assignments.lancer.spriteSet];return Object.keys(set.clips).every(name=>window.__dashPunchDebug.characterPresentation.sheet("lancer",name));});
    const result=await page.evaluate(before=>{
      const d=window.__dashPunchDebug,a=window.DASH_PUNCH_ART,set=a.spriteSets[a.assignments.lancer.spriteSet],hash=d.online.rollback.hash(),samples=[];
      if(!before)for(const name of Object.keys(set.clips)){
        const sheet=d.characterPresentation.sheet("lancer",name);for(const pose of sheet.characterDetail.frames)if(pose?.carriedSpear){const p=pose.carriedSpear;for(const point of[p.tip,p.hand])if(point[0]<0||point[0]>=(set.clips[name].width||set.width)||point[1]<0||point[1]>=(set.clips[name].height||set.height))throw Error(`Clipped spear: ${name}`);samples.push({name,tip:p.tip,hand:p.hand,fit:p.fit});}
      }
      const c=document.createElement("canvas");c.width=320;c.height=320;const p=c.getContext("2d");p.imageSmoothingEnabled=false;p.fillStyle="#10191e";p.fillRect(0,0,320,320);p.fillStyle="#1b2c30";p.fillRect(12,12,296,296);
      const clip=set.clips.idle,sheet=d.characterPresentation.sheet("lancer","idle");p.drawImage(sheet,0,0,30,30,70,45,180,180);p.fillStyle="#e6eee6";p.textAlign="center";p.font=window.DashTypography.canvas(30,700);p.fillText("LANCER",160,270);p.font=window.DashTypography.canvas(17,400);p.fillStyle=before?"#acbabe":"#f3dc91";p.fillText(before?"BEFORE":"UPDATED",160,295);
      return {src:c.toDataURL(),samples,pure:hash===d.online.rollback.hash()};
    },before);assert(result.pure);if(!before){assert(result.samples.length>50);assert(result.samples.filter(s=>s.name==="idle").every(s=>s.tip[0]<s.hand[0]&&s.tip[1]<s.hand[1]));}
    images.push(result.src);fs.writeFileSync(`${out}/${before?"before":"updated"}.png`,Buffer.from(result.src.split(",")[1],"base64"));
    if(!before){
      await page.getByRole("button",{name:"Play",exact:true}).click();await page.waitForFunction(()=>!window.__dashPunchDebug.radialMenu.wipe&&!window.__dashPunchDebug.radialMenu.active.length);await page.getByRole("button",{name:"Local",exact:true}).click();const tile=page.locator('[data-menu-action="chooseCharacter"][data-character="18"]');await tile.hover();
      for(const width of[1280,1920]){await page.setViewportSize({width,height:width*9/16});const box=await tile.boundingBox();assert(box&&box.y>=0&&box.y+box.height<=width*9/16);await page.screenshot({path:`${out}/roster-${width}.png`});}
    }
    await page.close();
  }
  const page=await browser.newPage();const gallery=await page.evaluate(async images=>{const c=document.createElement("canvas");c.width=640;c.height=320;const p=c.getContext("2d");p.imageSmoothingEnabled=false;for(const[i,src]of images.entries()){const image=new Image();image.src=src;await image.decode();p.drawImage(image,i*320,0);}return c.toDataURL();},images);fs.writeFileSync(`${out}/comparison.png`,Buffer.from(gallery.split(",")[1],"base64"));await page.close();assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,nativeFrames:true,rosterSizes:[1280,1920],renderPure:true,errors}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
