"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    fs.mkdirSync("artifacts/orbit",{recursive:true});
    for(const [name,aim] of [["high-arc",{x:0,y:-1}],["neutral-arc",null],["low-arc",{x:0,y:1}]]) {
      const result=await page.evaluate(async({name,aim})=>{
        const d=window.__dashPunchDebug;d.online.rollback.setup({stageIndex:d.online.rollback.stageNames.indexOf("Flat"),characterKeys:["orbit","defiplate"],seed:42});
        const f=d.fighters[0];Object.assign(f,{x:220,y:475,vx:0,vy:0,onGround:false,hasLiveAim:false});
        for(let i=0;i<8;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,50));}
        d.gravity.dash(0,{x:1,y:0});f.hasLiveAim=Boolean(aim);if(aim)f.aim=aim;
        d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,120));
        for(let i=0;i<30;i++)d.gravity.physics(0);
        const hash=d.online.rollback.hash(),pose=d.presentationEffects.pose(0);d.stagePresentation.draw();
        if(hash!==d.online.rollback.hash())throw Error("render changed arc simulation");
        if(pose.scaleX!==1||pose.scaleY!==1||pose.rotation!==0)throw Error("Orbit sprite deformed");
        const canvas=document.querySelector("#game"),pixels=canvas.getContext("2d").getImageData(0,0,1280,720).data;
        let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])opaque++;
        const body=canvas.getContext("2d").getImageData(Math.floor(f.x)-60,Math.floor(f.y)-50,120,100).data;
        let violet=0;for(let i=0;i<body.length;i+=4)if(body[i+3]>100&&body[i]>body[i+1]*1.1&&body[i+2]>body[i+1]*1.2&&body[i+2]>45)violet++;
        return {image:canvas.toDataURL(),clip:d.getAssetAnimation(0).clip,opaque,violet,x:f.x,y:f.y};
      },{name,aim});
      assert.equal(result.clip,"dash");assert(result.opaque>500000);assert(result.violet>20,"authored Orbit sprite did not render");
      fs.writeFileSync(`artifacts/orbit/${name}.png`,Buffer.from(result.image.split(",")[1],"base64"));
    }
    assert.deepEqual(errors,[]);
    console.log("Orbit browser: three live arc poses, authored rigid dash animation, nonblank arena and render/simulation separation passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
