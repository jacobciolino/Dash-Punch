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
    await page.getByRole('button',{name:'Play',exact:true}).click();await page.getByRole('button',{name:'Local',exact:true}).click();
    await page.screenshot({path:'/tmp/core-sprite-roster.png'});
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug;
      for(const set of ['seekerpro','seekerprocast','chungusseeker','seekerproarcher','seekerprogun'])for(const clip of Object.values(d.spriteAssets[set].clips)) {
        const image=new Image();image.src=clip.src;await image.decode();
      }
      d.online.rollback.setup({characterKeys:['orbit','spike'],seed:42});
      const f=d.fighters[0],canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
      const poses=[['Idle',{}],['Ground Dash',{vx:900,dashCarryTimer:.3}],['Air Dash',{onGround:false,vx:900,dashCarryTimer:.3}],['Wall Cling',{wallClinging:true}],['Crouch',{crouching:true}],['Punch',{attack:{dir:{x:1,y:0}}}],['Up Punch',{onGround:false,attack:{dir:{x:0,y:-1}}}],['Down Punch',{onGround:false,attack:{dir:{x:0,y:1}}}],['Charged Punch',{attack:{charge:1,dir:{x:1,y:0}}}],['Hurt',{hitstun:1}],['KO',{health:0}]];
      // Prime the shared lazy sheets before rendering the fixture atlas.
      for(const [,pose] of poses){Object.assign(f,{health:f.data.maxHealth,attack:null,onGround:true,vx:0,vy:0,dashCarryTimer:0,wallClinging:false,crouching:false,hitstun:0},pose);d.gravity.draw(0);}
      await new Promise(resolve=>setTimeout(resolve,150));
      const gallery=document.createElement('canvas');gallery.width=1600;gallery.height=600;
      const g=gallery.getContext('2d');g.fillStyle='#182027';g.fillRect(0,0,1600,600);
      let visible=0;
      poses.forEach(([name,pose],index)=>{
        Object.assign(f,{x:120,y:110,face:{x:1,y:0},health:f.data.maxHealth,attack:null,onGround:true,vx:0,vy:0,dashCarryTimer:0,wallClinging:false,crouching:false,hitstun:0,flash:0},pose);
        if(f.attack)f.attack={age:.12,startup:.075,active:.2,total:.5,charge:0,...f.attack};
        ctx.clearRect(0,0,1280,720);const hash=d.online.rollback.hash();d.gravity.draw(0);
        if(hash!==d.online.rollback.hash())throw Error('sprite rendering changed combat');
        const pixels=ctx.getImageData(0,0,400,200).data;
        if(pixels.filter((v,i)=>i%4===3&&v>0).length>100)visible++;
        const x=index%4*400,y=Math.floor(index/4)*200;
        g.drawImage(canvas,0,0,400,200,x,y,400,200);g.fillStyle='#fff';g.font='16px sans-serif';g.fillText(name,x+14,y+186);
      });
      const core=['anchor','orbit','spike','rain','edgebert','reverso','whipado','microusb','gunman','archer','kite','chungus'];
      for(const key of core){d.online.rollback.setup({characterKeys:[key,'anchor']});d.fighters[0].onGround=true;d.gravity.draw(0);}
      await new Promise(resolve=>setTimeout(resolve,200));
      const roster=document.createElement('canvas');roster.width=1200;roster.height=720;
      const paint=roster.getContext('2d');paint.fillStyle='#182027';paint.fillRect(0,0,1200,720);
      const palettes=[];
      core.forEach((key,index)=>{
        d.online.rollback.setup({characterKeys:[key,'anchor']});
        const character=d.fighters[0];Object.assign(character,{x:140,y:118,onGround:true});
        ctx.clearRect(0,0,1280,720);d.gravity.draw(0);
        const pixels=ctx.getImageData(0,0,300,240).data,totals=[0,0,0];
        for(let p=0;p<pixels.length;p+=4)if(pixels[p+3]>100)for(let c=0;c<3;c++)totals[c]+=pixels[p+c];
        palettes.push(totals.join(','));
        const x=index%4*300,y=Math.floor(index/4)*240;
        paint.drawImage(canvas,0,0,300,240,x,y,300,240);paint.fillStyle='#fff';paint.font='16px sans-serif';paint.fillText(character.data.name,x+14,y+224);
      });
      const chungusStates=document.createElement('canvas');chungusStates.width=1600;chungusStates.height=600;
      const cg=chungusStates.getContext('2d');cg.fillStyle='#182027';cg.fillRect(0,0,1600,600);
      let chungusVisible=0;
      poses.forEach(([name,pose],index)=>{
        const character=d.fighters[0];
        Object.assign(character,{x:130,y:110,health:character.data.maxHealth,attack:null,onGround:true,vx:0,vy:0,dashCarryTimer:0,wallClinging:false,crouching:false,hitstun:0},pose);
        if(character.attack)character.attack={age:.4,startup:.26,active:5,total:5.8,charge:0,...character.attack};
        ctx.clearRect(0,0,1280,720);d.gravity.draw(0);
        const pixels=ctx.getImageData(0,0,400,200).data;
        if(pixels.filter((v,i)=>i%4===3&&v>0).length>100)chungusVisible++;
        const x=index%4*400,y=Math.floor(index/4)*200;
        cg.drawImage(canvas,0,0,400,200,x,y,400,200);cg.fillStyle='#fff';cg.font='16px sans-serif';cg.fillText(name,x+14,y+186);
      });
      return {visible,image:gallery.toDataURL(),roster:roster.toDataURL(),palettes,chungusVisible,chungus:chungusStates.toDataURL()};
    });
    assert.equal(result.visible,11);assert.deepEqual(errors,[]);
    fs.writeFileSync('/tmp/seeker-pro-states.png',Buffer.from(result.image.split(',')[1],'base64'));
    fs.writeFileSync('/tmp/seeker-core-roster.png',Buffer.from(result.roster.split(',')[1],'base64'));
    assert.equal(new Set(result.palettes).size,12,'core sprites are not visually distinct');
    assert.equal(result.chungusVisible,11,'missing Chungus pose');
    fs.writeFileSync('/tmp/chungus-seeker-states.png',Buffer.from(result.chungus.split(',')[1],'base64'));
    console.log('PRO sprites: sheets decode, eleven nonblank animation fixtures, unchanged render-state hash and roster screenshot passed.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
