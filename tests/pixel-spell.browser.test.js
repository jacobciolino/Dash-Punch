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
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug,art=window.DASH_PUNCH_ART.spriteSets;
      const load=async src=>{const image=new Image();image.src=src;await image.decode();return image;};
      const original=await load(art.chungusseeker.clips.idle.src);
      await load(art.seekerprogun.spellProjectile.src);await load(art.seekerprogun.spellProjectile.impact.src);
      d.online.rollback.setup({characterKeys:['chungus','orbit']});
      const f=d.fighters[0];Object.assign(f,{x:300,y:300,onGround:true});d.gravity.draw(0);
      await new Promise(resolve=>setTimeout(resolve,150));
      const processed=d.spriteArt(0),same=d.spriteArt(0,'hurt');
      const pixel=await load(processed.src),c=document.createElement('canvas');c.width=1254;c.height=1254;
      const p=c.getContext('2d');
      const colors=image=>{p.clearRect(0,0,1254,1254);p.drawImage(image,0,0);const data=p.getImageData(0,0,1254,1254).data,set=new Set();let soft=0;for(let i=0;i<data.length;i+=4){if(data[i+3]>0&&data[i+3]<255)soft++;if(data[i+3]>160)set.add(`${data[i]},${data[i+1]},${data[i+2]}`);}return {count:set.size,soft};};
      const before=colors(original),after=colors(pixel);
      const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,1280,720);
      const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error('pixel shader changed simulation');
      const chungus=canvas.toDataURL();
      d.online.rollback.setup({characterKeys:['gunman','anchor']});
      const [a,b]=d.fighters;Object.assign(a,{x:400,y:300,onGround:true});Object.assign(b,{x:580,y:300});
      const attack={id:999,age:.1,startup:0,active:10,total:10,charge:.4,dir:{x:1,y:0},hitTargets:new Set(),projectile:{x:555,y:300,radius:8,speed:600,spawned:true,damage:10,knockback:500,hitstun:.4}};
      a.projectiles=[attack];d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,100));
      const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,flight=[],impact=[];
      proto.drawImage=function(image,...args){if(image.src?.includes('Basic_Projectile'))flight.push(args[0]);if(image.src?.includes('Basic_Impact'))impact.push(args[0]);return draw.call(this,image,...args);};
      for(let i=0;i<4;i++){d.advancePlatforms(.051);d.gravity.draw(0);}
      d.updateProjectiles(0);
      const impactState=d.online.rollback.save();d.presentationEffects.draw();
      await new Promise(resolve=>setTimeout(resolve,100));d.online.rollback.restore(impactState);
      for(let i=0;i<7;i++){const stable=d.online.rollback.hash();d.presentationEffects.draw();if(stable!==d.online.rollback.hash())throw Error('spell art changed simulation');d.presentationEffects.step(.051);}
      proto.drawImage=draw;
      return {before,after,cached:processed.src===same.src,width:f.data.width,height:f.data.height,chungus,flight,impact,remaining:a.projectiles.length};
    });
    assert(result.after.count<result.before.count);assert(result.after.count<=729);
    assert.equal(result.after.soft,0,'pixel sheet retains antialiased edges');assert(result.cached);
    assert.equal(result.width,118);assert.equal(result.height,154);
    assert.equal(new Set(result.flight).size,4);assert.equal(new Set(result.impact).size,7);
    assert.equal(result.remaining,0);assert.deepEqual(errors,[]);
    fs.writeFileSync('/tmp/chungus-more-pixelated.png',Buffer.from(result.chungus.split(',')[1],'base64'));
    console.log(JSON.stringify({tests:'passed',chungusPalette:result.after.count,originalPalette:result.before.count,hardAlpha:true,cached:true,spellFrames:4,impactFrames:7,gameplayUnchanged:true}));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
