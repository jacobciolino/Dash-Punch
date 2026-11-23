"use strict";
const fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.route("**/game.js",async route=>{
      const response=await route.fetch();let body=await response.text();
      body=body.replace("presentationEffects: { step:updateEffects, draw:drawParticles,","presentationEffects: { frame:draw, step:updateEffects, draw:drawParticles,");
      body=body.replace("drawDebugHitboxes();","");
      await route.fulfill({response,body});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=0`);
    // The debug flag must exist for the test API; hide debug lines in captures.
    if(!await page.evaluate(()=>!!window.__dashPunchDebug))await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async({quality,moving})=>{
      const d=window.__dashPunchDebug;
      d.stagePresentation?.setQuality(quality);
      d.online.rollback.setup({stageIndex:d.online.rollback.stageNames.indexOf("Perch"),characterKeys:["orbit","edgebert"],seed:42});
      Object.assign(d.fighters[0],{x:430,y:571,onGround:true,face:{x:1,y:0}});
      Object.assign(d.fighters[1],{x:850,y:571,onGround:true,face:{x:-1,y:0}});
      for(let i=0;i<10;i++){d.presentationEffects.frame();await new Promise(resolve=>setTimeout(resolve,60));}
      const canvas=document.querySelector("#game"),times=[];
      for(let i=0;i<160;i++){if(moving){d.fighters[0].x=430+Math.sin(i/20)*250;d.fighters[1].x=850+Math.cos(i/17)*150;}const start=performance.now();d.presentationEffects.frame();canvas.getContext("2d").getImageData(0,0,1,1);times.push(performance.now()-start);}
      times.sort((a,b)=>a-b);
      return {median:times[80],p95:times[152],stats:d.stagePresentation?.stats,quality:d.stagePresentation?.quality,profile:d.stagePresentation?.snapshot().profile?.id,image:canvas.toDataURL()};
    },{quality:process.argv[3]||"enhanced",moving:process.argv[4]==="moving"});
    const label=process.argv[2]||"before";
    fs.mkdirSync("artifacts/hd2d",{recursive:true});
    fs.writeFileSync(`artifacts/hd2d/perch-${label}.png`,Buffer.from(result.image.split(",")[1],"base64"));
    delete result.image;fs.writeFileSync(`artifacts/hd2d/${label}-benchmark.json`,JSON.stringify(result,null,2));
    console.log(JSON.stringify({label,...result}));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
