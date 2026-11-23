"use strict";
const fs=require("node:fs"),path=require("node:path"),sharp=require(process.env.SHARP_MODULE||"sharp"),{writePixels}=require("./pixel-png.cjs");
const output=path.resolve(__dirname,"../assets/boomerangus"),sources=process.argv.slice(2);
if(sources.length!==3)throw Error("Usage: node tools/prepare-boomerangus-art.cjs ARMED_ATLAS UNARMED_ATLAS WEAPON");
async function atlas(file,name){
  const meta=await sharp(file).metadata(),rgba=Buffer.alloc(208*208*4);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const left=Math.floor(col*meta.width/4),top=Math.floor(row*meta.height/4),width=Math.floor((col+1)*meta.width/4)-left,height=Math.floor((row+1)*meta.height/4)-top;
    const data=await sharp(file).extract({left,top,width,height}).resize(52,52,{kernel:"nearest"}).ensureAlpha().raw().toBuffer();let foot=0;
    for(let y=0;y<52;y++)for(let x=0;x<52;x++)if(data[(y*52+x)*4+3]>=128)foot=y;
    const shift=(row===0&&col===3?46:48)-foot;
    for(let y=0;y<52;y++)for(let x=0;x<52;x++){
      const yy=y+shift,i=(y*52+x)*4;if(yy<0||yy>=52||data[i+3]<128)continue;
      const dest=((row*52+yy)*208+col*52+x)*4;data.copy(rgba,dest,i,i+3);rgba[dest+3]=255;
    }
  }
  const buffer=await sharp(rgba,{raw:{width:208,height:208,channels:4}}).png({palette:true,colours:24,dither:0}).toBuffer();
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,name),buffer);
}
async function weapon(file){
  const data=await sharp(file).trim().resize(26,26,{fit:"contain",background:{r:0,g:0,b:0,alpha:0},kernel:"nearest"}).ensureAlpha().raw().toBuffer();
  let radius=1;for(let y=0;y<26;y++)for(let x=0;x<26;x++)if(data[(y*26+x)*4+3]>=128)radius=Math.max(radius,Math.hypot(x-12.5,y-12.5));
  const sheet=Buffer.alloc(512*32*4),scale=radius/12;
  for(let frame=0;frame<16;frame++){
    const angle=frame*Math.PI/8,c=Math.cos(angle),s=Math.sin(angle);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){
      const xx=x-15.5,yy=y-15.5,sx=Math.round((xx*c+yy*s)*scale+12.5),sy=Math.round((-xx*s+yy*c)*scale+12.5);
      if(sx<0||sy<0||sx>=26||sy>=26)continue;const i=(sy*26+sx)*4;if(data[i+3]<128)continue;
      const dest=(y*512+frame*32+x)*4;data.copy(sheet,dest,i,i+3);sheet[dest+3]=255;
    }
  }
  writePixels(path.join(output,"boomerang-spin.png"),512,32,sheet);
}
(async()=>{await atlas(sources[0],"armed.png");await atlas(sources[1],"unarmed.png");await weapon(sources[2]);console.log(output);})().catch(e=>{console.error(e);process.exitCode=1;});
