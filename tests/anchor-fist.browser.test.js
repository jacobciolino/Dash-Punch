"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {server}=require('../server');
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.getByRole('button',{name:'Play',exact:true}).click();await page.getByRole('button',{name:'Local',exact:true}).click();
    assert.equal(await page.locator('.character-tile').first().getAttribute('aria-label'),'Anchor');
    assert.equal(await page.locator('.character-tile').first().locator('.tile-name').innerText(),'Anchor');
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug;
      const spell=new Image();spell.src='assets/optional/seeker-pro/anchor-fist-spell.png';await spell.decode();
      const probe=document.createElement('canvas');probe.width=spell.naturalWidth;probe.height=spell.naturalHeight;
      const p=probe.getContext('2d');p.drawImage(spell,0,0);const alpha=p.getImageData(0,0,1,1).data[3];
      const cast=new Image();cast.src=d.spriteAssets.seekerprofist.clips.attack1.src;await cast.decode();
      d.online.rollback.setup({characterKeys:['anchor','orbit'],seed:42});
      const f=d.fighters[0];Object.assign(f,{x:450,y:320,onGround:true,attack:{age:.13,startup:.075,active:.13,recovery:.22,total:.425,charge:1,dir:{x:1,y:0},hitTargets:new Set()}});
      d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,120));
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;let fistDraws=0;
      proto.drawImage=function(image,...args){if(image.src?.includes('anchor-fist-spell'))fistDraws++;return draw.call(this,image,...args);};
      const canvas=document.querySelector('#game');canvas.getContext('2d').clearRect(0,0,1280,720);
      for(const [axis,sign] of [['y',1],['y',-1],['x',1],['x',-1]]){d.gravity.setDirection(axis,sign);const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error('fist changed gameplay');}
      if(fistDraws!==4)throw Error('Anchor fist missing');
      d.online.rollback.setup({characterKeys:['chungus','orbit'],seed:42});
      const chungus=d.fighters[0];
      Object.assign(chungus,{x:450,y:320,onGround:true,attack:{age:1,startup:.26,active:5,recovery:.55,total:5.81,charge:1,dir:{x:1,y:0},hitTargets:new Set()}});
      d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,120));
      fistDraws=0;
      for(const [axis,sign] of [['y',1],['y',-1],['x',1],['x',-1]]){d.gravity.setDirection(axis,sign);const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error('Chungus fist changed gameplay');}
      proto.drawImage=draw;
      return {alpha,fistDraws,projectiles:chungus.projectiles.length,image:canvas.toDataURL()};
    });
    assert.equal(result.alpha,0,'fist background must be transparent');assert.equal(result.fistDraws,4);assert.equal(result.projectiles,0);assert.deepEqual(errors,[]);
    fs.writeFileSync('/tmp/anchor-fist-spell.png',Buffer.from(result.image.split(',')[1],'base64'));
    console.log('Anchor/Chungus fist browser: transparent spell drawn in four gravities, no new projectile and unchanged simulation passed.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
