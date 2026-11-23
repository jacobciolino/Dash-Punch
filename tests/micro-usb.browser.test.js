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
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug;
      const image=new Image();image.src=d.spriteAssets.seekerproelectric.clips.attack1.src;await image.decode();
      d.online.rollback.setup({characterKeys:["microusb","orbit"],seed:42});
      const [a,b]=d.fighters;
      a.attack={id:1,age:.1,startup:0,active:1,recovery:.2,total:1.2,charge:.5,dir:{x:1,y:0},hitTargets:new Set()};
      d.resolveHit(0,1);
      a.attack={id:2,age:.1,startup:0,active:1,recovery:.2,total:1.2,charge:.5,dir:{x:1,y:0},hitTargets:new Set()};
      d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,100));
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,fill=proto.fillRect;
      let cast=false,pixels=0,prongs=0;
      proto.drawImage=function(image,...args){if(d.getAssetAnimation(0).clip==="attack1"&&image.width>0)cast=true;return draw.call(this,image,...args);};
      proto.fillRect=function(x,y,w,h){if(["#268ab8","#a5ffff"].includes(this.fillStyle)&&[4,8].includes(w)&&w===h)pixels++;if(this.fillStyle==="#e7cc80"&&w===12&&h===4)prongs++;return fill.call(this,x,y,w,h);};
      const hash=d.online.rollback.hash();d.gravity.draw(0);d.gravity.draw(1);
      proto.drawImage=draw;proto.fillRect=fill;
      return {cast,pixels,prongs,pure:hash===d.online.rollback.hash()};
    });
    assert(result.cast,JSON.stringify(result));assert(result.pixels>=100);assert.equal(result.prongs,2,"American plug needs two flat blades");assert(result.pure);assert.deepEqual(errors,[]);
    await page.screenshot({path:"/tmp/micro-usb-electricity.png"});
    console.log("Micro USB browser: casting sheet, square-pixel electricity and render-only state verified.");
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
