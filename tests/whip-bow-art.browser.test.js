"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug;
      for(const set of ['seekerprowhip','seekerproarcher']){
        const image=new Image();image.src=d.spriteAssets[set].clips.attack1.src;await image.decode();
      }
      d.online.rollback.setup({characterKeys:['whipado','archer'],seed:42});
      const [whip,bow]=d.fighters;
      Object.assign(whip,{x:300,y:320,onGround:true,attack:{id:1,age:1.2,startup:.07,active:2.2,recovery:.26,total:2.53,charge:.5,dir:{x:1,y:0},hitTargets:new Set()}});
      Object.assign(bow,{x:700,y:320,onGround:true,gunRecoil:.12});
      d.gravity.draw(0);d.gravity.draw(1);await new Promise(resolve=>setTimeout(resolve,150));
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,curve=proto.quadraticCurveTo;
      const fill=proto.fillRect;
      const sources=[];let curves=0,pixels=0;
      proto.fillRect=function(x,y,w,h){if(['#6335a6','#965ee8','#dcafff'].includes(this.fillStyle)&&[4,8,12].includes(w)&&w===h)pixels++;return fill.call(this,x,y,w,h);};
      proto.drawImage=function(image,...args){if(image.src)sources.push(image.src);return draw.call(this,image,...args);};
      proto.quadraticCurveTo=function(...args){curves++;return curve.apply(this,args);};
      whip.attack.age=1.4;bow.gunRecoil=.06;
      const canvas=document.querySelector('#game');canvas.getContext('2d').clearRect(0,0,1280,720);
      const hash=d.online.rollback.hash();d.gravity.draw(0);d.gravity.draw(1);
      proto.drawImage=draw;proto.quadraticCurveTo=curve;proto.fillRect=fill;
      if(hash!==d.online.rollback.hash())throw Error('art changed simulation');
      return {sources,curves,pixels,image:canvas.toDataURL(),bowFrame:d.getAssetAnimation(1).frame};
    });
    assert(result.sources.some(src=>src.includes('_Cast_')));
    assert(result.sources.some(src=>src.includes('_Bow_')));
    assert(!result.sources.some(src=>src.includes('_Attack')||src.includes('_HeavyAttack')));
    assert(result.pixels>=12);assert(result.bowFrame>=9);assert.deepEqual(errors,[]);
    fs.writeFileSync('/tmp/whip-bow-art.png',Buffer.from(result.image.split(',')[1],'base64'));
    console.log('Whip/Bow browser: actual casting/bow sheets drawn, no sword/slash sheet, magical whip visible and simulation unchanged.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
