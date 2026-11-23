"use strict";
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {server}=require('../server');
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug,sprite=window.DASH_PUNCH_ART.spriteSets.seekerproarcher.arrowSprite;
      const image=new Image();image.src=sprite.src;await image.decode();
      d.online.rollback.setup({characterKeys:['archer','anchor'],seed:42});
      const archer=d.fighters[0];
      const attack={id:999,age:.1,startup:0,active:100,total:100,charge:.5,dir:{x:1,y:0},hitTargets:new Set(),projectile:{x:600,y:300,radius:4,speed:1000,spawned:true,arrow:true}};
      archer.projectiles=[attack];d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,100));
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
      const frames=[];
      proto.drawImage=function(image,...args){if(image.src?.includes('Shot_Arrow_Projectile'))frames.push(args[0]);return draw.call(this,image,...args);};
      for(let i=0;i<3;i++) {d.advancePlatforms(.05);const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error('arrow animation changed simulation');}
      attack.reflectedOwnerId='p2';attack.dir.x=-1;
      const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error('reflected art changed simulation');
      proto.drawImage=draw;
      return {frames,width:image.naturalWidth,height:image.naturalHeight,count:archer.projectiles.length,speed:attack.projectile.speed,radius:attack.projectile.radius};
    });
    assert.deepEqual([...new Set(result.frames)].sort((a,b)=>a-b),[0,28,56]);
    assert.equal(result.width,84);assert.equal(result.height,8);assert.equal(result.count,1);
    assert.equal(result.speed,1000);assert.equal(result.radius,4);assert.deepEqual(errors,[]);
    console.log('Magic arrow: supplied three-frame sheet animates, reflected arrows retain art, rendering does not change projectile count, speed, radius or simulation.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
