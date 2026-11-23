"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try{
    await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||"chrome",args:["--disable-gpu"]});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/game.js",async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);fs.mkdirSync("artifacts/edgebert",{recursive:true});
    await page.evaluate(()=>window.__dashPunchDebug.dashball.setup({arena:"standard"},{characters:["edgebert","orbit"]}));await page.waitForTimeout(600);
    const stages=[];
    await page.keyboard.down("f");await page.waitForTimeout(35);await page.keyboard.up("f");
    for(let stage=0;stage<3;stage++){
      await page.waitForFunction(stage=>window.__dashPunchDebug.fighters[0].attack?.sequenceStage===stage,stage,{timeout:1500});
      stages.push(await page.evaluate(()=>{const a=window.__dashPunchDebug.fighters[0].attack;return {id:a.id,stage:a.sequenceStage};}));
    }
    assert.equal(new Set(stages.map(a=>a.id)).size,3);
    await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.fighters[0].attack),null);
    await page.keyboard.press("Escape");
    await page.evaluate(()=>window.__dashPunchDebug.dashball.standard());
    const art=await page.evaluate(async()=>{
      const set=window.DASH_PUNCH_ART.spriteSets.seekerproedgebert,out=[];
      for(const name of ["attack1","attack2","attack3"]){const clip=set.clips[name],i=new Image();i.src=clip.src;await i.decode();out.push([name,i.width,i.height]);}
      return out;
    });assert.deepEqual(art,[["attack1",720,50],["attack2",450,50],["attack3",2000,50]]);
    for(const side of [1,-1])for(let stage=0;stage<3;stage++){
      const sample=await page.evaluate(async({side,stage})=>{
        const d=window.__dashPunchDebug,rb=d.online.rollback;rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:["edgebert","orbit"],seed:42});
        const f=d.fighters[0];Object.assign(f,{x:640,y:480,onGround:true,face:{x:side,y:0}});
        const profile=f.data.punchSequence[stage],sum=(a,b)=>profile.durations.slice(a,b).reduce((x,y)=>x+y,0)*f.data.sequenceTimeScale/1000;
        const startup=sum(0,profile.strike[0]),active=sum(profile.strike[0],profile.strike[1]+1),recovery=sum(profile.strike[1]+1),timing={startup,active,recovery,total:startup+active+recovery};
        f.attack={id:44,age:startup+.012,...timing,sequenceStage:stage,dir:{x:side,y:0},charge:0,hitTargets:new Set(),selfCancelled:false};f.edgebertChain={...timing,stage,age:f.attack.age,dir:f.attack.dir};
        for(let i=0;i<4;i++){d.stagePresentation.draw();await new Promise(r=>setTimeout(r,40));}
        const animation=d.getAssetAnimation(0),anchor=d.getAssetFrameAnchor(0),before=rb.hash();d.stagePresentation.draw();if(before!==rb.hash())throw Error("drawing changed combat");
        const c=document.querySelector("#game"),pixels=c.getContext("2d").getImageData(550,390,180,120).data;let white=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>150&&Math.abs(pixels[i]-pixels[i+1])<30&&Math.abs(pixels[i+1]-pixels[i+2])<30)white++;
        return {animation,anchor,white,image:c.toDataURL()};
      },{side,stage});
      assert.equal(sample.animation.clip,`attack${stage+1}`);assert.equal(sample.animation.flip,side<0);assert(sample.white>15,"white Seeker body did not render");assert.deepEqual(sample.anchor,{pivotX:[16,18,102][stage],foot:[38,43,43][stage]});
      fs.writeFileSync(`artifacts/edgebert/hit-${stage+1}-${side>0?"right":"left"}.png`,Buffer.from(sample.image.split(",")[1],"base64"));
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({tests:"passed",nativeKeyboardStages:stages,art,mirroredPoses:6,renderPure:true,errors}));
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
