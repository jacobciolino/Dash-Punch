"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    if(process.argv.includes("--before"))await page.route("**/presentation-assets.js",async route=>{
      const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replaceAll(",frameAnchors:seekerHurtAnchors","").replaceAll(",frameAnchors:seekerKnockbackAnchors","")});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const result=await page.evaluate(async before=>{
      const d=window.__dashPunchDebug,sets=window.DASH_PUNCH_ART.spriteSets,measurements=[];
      for(const [setName,clipName] of [["seekerpro","hurt"],["seekerpro","knockback"],["seeker","hurt"]]) {
        const set=sets[setName],clip=set.clips[clipName],image=new Image();image.src=clip.src;await image.decode();
        const width=clip.width||set.width,height=clip.height||set.height,c=document.createElement("canvas");c.width=image.naturalWidth;c.height=image.naturalHeight;
        const p=c.getContext("2d");p.drawImage(image,0,0);const pixels=p.getImageData(0,0,c.width,c.height).data,anchors=[],centers=[];
        for(let frame=0;frame<clip.frames;frame++) {
          let left=width,right=0,top=height,bottom=0;
          for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*c.width+frame*width+x)*4+3]>128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          anchors.push([Math.round((left+right+1)/2),Math.round((top+bottom+1)/2)]);
          centers.push([(left+right+1)/2,(top+bottom+1)/2]);
        }
        if(!before&&JSON.stringify(anchors)!==JSON.stringify(clip.frameAnchors))throw Error(`${setName}/${clipName}: anchors do not match source poses`);
        measurements.push({set:setName,clip:clipName,anchors,centers});
      }
      const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),gallery=document.createElement("canvas");
      const characters=["orbit","spike"],clips=["hurt","knockback"],cellW=170,cellH=160;
      gallery.width=cellW*10;gallery.height=cellH*characters.length*clips.length;
      const g=gallery.getContext("2d");g.fillStyle="#15252b";g.fillRect(0,0,gallery.width,gallery.height);g.imageSmoothingEnabled=false;
      const samples=[];
      for(let row=0;row<characters.length*clips.length;row++) {
        const key=characters[Math.floor(row/2)],clip=clips[row%2];
        d.online.rollback.setup({characterKeys:[key,"anchor"],seed:42});
        const f=d.fighters[0];Object.assign(f,{x:85,y:80,onGround:false,hitstun:2,comboHits:2,vx:clip==="knockback"?500:0});
        Object.assign(f,{hitstun:0,onGround:true,vx:0});d.gravity.draw(0);
        Object.assign(f,{hitstun:2,onGround:false,vx:clip==="knockback"?500:0});d.gravity.draw(0);
        await new Promise(resolve=>setTimeout(resolve,100));
        const durations=sets.seekerpro.clips[clip].durations;
        for(let frame=0;frame<10;frame++) {
          if(frame===9) {f.hitstun=0;f.comboHits=0;f.vx=0;f.onGround=true;}
          ctx.clearRect(0,0,1280,720);const hash=d.online.rollback.hash();d.gravity.draw(0);
          if(hash!==d.online.rollback.hash())throw Error("hurt rendering changed simulation");
          const animation=d.getAssetAnimation(0);samples.push({key,clip,frame,selected:animation.clip});
          if(frame===9&&!d.spriteArt(0))throw Error("recovery sprite was not loaded");
          if(frame===9) {
            const pixels=ctx.getImageData(0,0,cellW,cellH).data;let left=cellW,right=0,count=0;
            for(let y=0;y<135;y++)for(let x=0;x<cellW;x++){
              const i=(y*cellW+x)*4,r=pixels[i],green=pixels[i+1],b=pixels[i+2];
              if(pixels[i+3]>100&&(key==="spike"?green>r*1.3&&green>b*1.2&&green>45:b>green*1.2&&r>green*1.1&&b>45)){left=Math.min(left,x);right=Math.max(right,x);count++;}
            }
            samples.at(-1).recoveryCenter=(left+right)/2;
            if(!count||Math.abs((left+right)/2-f.x)>6)throw Error(`${key}: recovery sprite is off-center`);
          }
          g.drawImage(canvas,0,0,cellW,cellH,frame*cellW,row*cellH,cellW,cellH);
          g.fillStyle="#f3f7f8";g.font="11px sans-serif";g.fillText(`${key} ${clip} ${frame===9?"recover":frame}`,frame*cellW+4,row*cellH+153);
          if(frame<9)d.advancePlatforms((durations[frame]+.01)/1000);
        }
      }
      const image=gallery.toDataURL(),alignment=[],draw=ctx.drawImage;
      let bodyDraw=null;
      ctx.drawImage=function(sprite,...args){
        if(sprite instanceof HTMLCanvasElement&&sprite.width===173&&sprite.height===248&&args.length===2)
          bodyDraw={matrix:ctx.getTransform(),x:args[0],y:args[1]};
        return draw.call(this,sprite,...args);
      };
      const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite"];
      for(const key of core)for(const clipName of clips) {
        d.online.rollback.setup({characterKeys:[key,"anchor"],seed:42});
        const f=d.fighters[0],clip=sets.seekerpro.clips[clipName],centers=measurements.find(m=>m.set==="seekerpro"&&m.clip===clipName).centers;
        Object.assign(f,{x:300,y:300,onGround:false,hitstun:2,vx:clipName==="knockback"?500:0});
        d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,25));
        for(let frame=0;frame<9;frame++) {
          for(const [axis,sign] of [["y",1],["y",-1],["x",1],["x",-1]])for(const face of [-1,1]) {
            d.gravity.setDirection(axis,sign);f.face={x:face,y:0};bodyDraw=null;
            const hash=d.online.rollback.hash();d.gravity.draw(0);if(hash!==d.online.rollback.hash())throw Error("alignment changed combat");
            if(!bodyDraw)throw Error(`${key}/${clipName}/${frame}: missing rendered body`);
            const actual=d.getAssetAnimation(0);if(actual.frame!==frame)throw Error("wrong test animation frame");
            const center=centers[frame],point=bodyDraw.matrix.transformPoint(new DOMPoint(bodyDraw.x+4+center[0]*3,bodyDraw.y+4+center[1]*3));
            const rotation=d.gravity.renderFrame(0).rotation,offset=f.data.height/2-sets.seekerpro.bodyHeight/2*3;
            const expected={x:f.x-Math.sin(rotation)*offset,y:f.y+Math.cos(rotation)*offset};
            const error=Math.hypot(point.x-expected.x,point.y-expected.y);
            if(!before&&error>3)throw Error(`${key}/${clipName}/${frame}: body drifted ${error.toFixed(1)} pixels`);
            alignment.push({key,clip:clipName,frame,axis,sign,face,error});
          }
          d.advancePlatforms((clip.durations[frame]+.01)/1000);
        }
      }
      ctx.drawImage=draw;
      return {measurements,samples,alignmentChecks:alignment.length,maxDrift:Math.max(...alignment.map(a=>a.error)),image};
    },process.argv.includes("--before"));
    assert.deepEqual(errors,[]);fs.mkdirSync("artifacts/hurt-alignment",{recursive:true});
    const label=process.argv.includes("--before")?"before":"after";
    fs.writeFileSync(`artifacts/hurt-alignment/${label}.png`,Buffer.from(result.image.split(",")[1],"base64"));delete result.image;
    fs.writeFileSync(`artifacts/hurt-alignment/${label}.json`,JSON.stringify(result,null,2));
    console.log(JSON.stringify({tests:"passed",alignmentChecks:result.alignmentChecks,maxDrift:result.maxDrift,sourceAnchors:result.measurements},null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
