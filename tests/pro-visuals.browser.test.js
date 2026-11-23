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
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug,art=window.DASH_PUNCH_ART;
      const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus"];
      const poses=[
        ["Idle",{}],["Dash",{vx:900,dashCarryTimer:.3}],
        ["Cling",{wallClinging:true}],["Crouch",{crouching:true}],
        ["Cast / Punch",{attack:{age:.12,startup:.075,active:.2,recovery:.2,total:.5,charge:0,dir:{x:1,y:0},hitTargets:new Set()}}],
        ["Knockback",{hitstun:1,vx:500,angle:1.2}],
      ];
      const sources=new Set(Object.values(art.effects).map(effect=>effect.src));
      for(const key of core)for(const clip of Object.values(art.spriteSets[art.assignments[key].spriteSet].clips))sources.add(clip.src);
      for(const src of sources){const image=new Image();image.src=src;await image.decode();}
      for(const key of core){d.online.rollback.setup({characterKeys:[key,"orbit"]});for(const [,pose] of poses){Object.assign(d.fighters[0],{attack:null,vx:0,hitstun:0,wallClinging:false,crouching:false,onGround:true},pose);d.gravity.draw(0);}}
      for(const name of Object.keys(art.effects))d.presentationEffects.sprite(name,100,100,.1);
      await new Promise(resolve=>setTimeout(resolve,150));
      const proto=CanvasRenderingContext2D.prototype,scale=proto.scale,transform=proto.transform,draw=proto.drawImage;
      let distortions=0,transforms=0,authenticEffects=0;
      proto.scale=function(x,y){if(Math.abs(x)!==Math.abs(y))distortions++;return scale.call(this,x,y);};
      proto.transform=function(...args){transforms++;return transform.apply(this,args);};
      proto.drawImage=function(image,...args){if(image.src?.includes("Seeker_PRO/VFX/"))authenticEffects++;return draw.call(this,image,...args);};
      const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
      const gallery=document.createElement("canvas");gallery.width=1440;gallery.height=core.length*170;
      const g=gallery.getContext("2d");g.fillStyle="#172126";g.fillRect(0,0,gallery.width,gallery.height);
      let visible=0;
      for(let row=0;row<core.length;row++)for(let col=0;col<poses.length;col++){
        d.online.rollback.setup({characterKeys:[core[row],"orbit"]});
        Object.assign(d.fighters[0],{x:110,y:90,onGround:true},poses[col][1]);
        ctx.clearRect(0,0,1280,720);const hash=d.online.rollback.hash();d.gravity.draw(0);
        if(d.online.rollback.hash()!==hash)throw Error("render changed simulation");
        const pixels=ctx.getImageData(0,0,240,155).data;
        if(pixels.some((v,i)=>i%4===3&&v>0))visible++;
        g.drawImage(canvas,0,0,240,155,col*240,row*170,240,155);
        g.fillStyle="#f4f6f7";g.font="12px sans-serif";g.fillText(`${core[row]}: ${poses[col][0]}`,col*240+8,row*170+164);
      }
      const vfx=document.createElement("canvas");vfx.width=1000;vfx.height=400;
      const vg=vfx.getContext("2d");vg.fillStyle="#172126";vg.fillRect(0,0,1000,400);
      let effectIndex=0;
      for(const name of Object.keys(art.effects)){
        ctx.clearRect(0,0,1280,720);d.presentationEffects.sprite(name,80,90,.15,2);
        const x=effectIndex%5*200,y=Math.floor(effectIndex/5)*200;
        vg.drawImage(canvas,0,0,200,170,x,y,200,170);vg.fillStyle="#fff";vg.font="14px sans-serif";vg.fillText(name,x+10,y+184);effectIndex++;
      }
      proto.scale=scale;proto.transform=transform;proto.drawImage=draw;
      return {distortions,transforms,authenticEffects,visible,gallery:gallery.toDataURL(),vfx:vfx.toDataURL()};
    });
    assert.equal(result.distortions,0);assert.equal(result.transforms,0);assert.equal(result.visible,72);assert(result.authenticEffects>=10);assert.deepEqual(errors,[]);
    fs.writeFileSync("/tmp/dash-pro-core-cleanup.png",Buffer.from(result.gallery.split(",")[1],"base64"));
    fs.writeFileSync("/tmp/dash-pro-effects.png",Buffer.from(result.vfx.split(",")[1],"base64"));
    console.log("PRO browser: 72 visible core poses, no squash/shear, authentic effects decoded/drawn and unchanged simulation passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
