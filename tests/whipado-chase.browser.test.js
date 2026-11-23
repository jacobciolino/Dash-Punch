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
      const image=new Image();image.src=d.spriteAssets.seekerprocast.clips.attack1.src;await image.decode();
      d.online.rollback.setup({characterKeys:['whipado','anchor'],seed:42});
      const [a,b]=d.fighters;
      Object.assign(a,{x:430,y:300,onGround:false,vx:0,vy:0});Object.assign(b,{x:480,y:300,onGround:false});
      a.attack={id:999,age:.1,startup:0,active:.2,recovery:.2,total:.4,charge:0,dir:{x:1,y:0},hitTargets:new Set(),grounded:false};
      d.resolveHit(0,1);
      d.gravity.draw(0); // Request lazy casting sheet.
      await new Promise(resolve=>setTimeout(resolve,120));
      let casting=0,curves=0;
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,curve=proto.quadraticCurveTo;
      proto.drawImage=function(image,...args){if(image.src?.includes('Seeker_Dream_Cast_'))casting++;return draw.call(this,image,...args);};
      proto.quadraticCurveTo=function(...args){curves++;return curve.apply(this,args);};
      a.punchVisual.age=.05;
      const before=d.online.rollback.hash();
      document.querySelector('#game').getContext('2d').clearRect(0,0,1280,720);
      for(const [axis,sign] of [['y',1],['y',-1],['x',1],['x',-1]]) {d.gravity.setDirection(axis,sign);const stable=d.online.rollback.hash();d.gravity.draw(0);if(stable!==d.online.rollback.hash())throw Error('render mutated simulation');}
      proto.drawImage=draw;proto.quadraticCurveTo=curve;
      return {casting,curves,target:a.punchVisual.chaseTargetId,image:document.querySelector('#game').toDataURL(),before};
    });
    assert(result.casting>0,'Hooded Seeker casting sheet was not drawn');assert(result.curves>=12,'spell whip was not drawn');
    assert.equal(result.target,'p2');assert.deepEqual(errors,[]);
    fs.writeFileSync('/tmp/whipado-chase.png',Buffer.from(result.image.split(',')[1],'base64'));
    console.log('Whipado Chase visual: Hooded Seeker casting frames, magical whip, four gravity orientations and render-only state passed.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
