"use strict";
const path=require("node:path"),{writePixels}=require("./pixel-png.cjs");
// Code-native 32px bullseyes on 64px frames. Every cluster uses opaque pixels.
const size=64,frames=8,width=size*frames,pixels=Buffer.alloc(width*size*2*4);
const ink=[18,27,34,255],white=[232,242,230,255],gold=[255,216,101,255];
const colors=[[[245,100,113,255],[158,49,74,255]],[[71,202,239,255],[36,101,150,255]]];
for(let team=0;team<2;team++){
  const [bright,shade]=colors[team],base=Array.from({length:32},()=>Array(32).fill(null));
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const r=Math.hypot(x-15.5,y-15.5);if(r>15.5)continue;
    base[y][x]=r>14?ink:r>11?(x+y>33?shade:bright):r>9?ink:r>6?white:r>3?bright:r>1?gold:white;
  }
  for(let frame=0;frame<frames;frame++)for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    let color=base[y][x];if(!color)continue;
    if(frame===1&&Math.hypot(x-15.5,y-15.5)<13)color=(x+y)%3?white:gold;
    const crackX=15+[0,0,-1,-1,0,1,1,0,0,-1,0,1,2,1,1,0][y%16];
    if(frame>=2&&(Math.abs(x-crackX)<1.2||y===10&&x>crackX&&x<crackX+6||y===22&&x<crackX&&x>crackX-6))color=ink;
    const t=frame<3?0:(frame-2)/5,tileX=Math.floor(x/8)*8+4,tileY=Math.floor(y/8)*8+4;
    const dx=Math.round((tileX-16)*t*1.1),dy=Math.round((tileY-16)*t*.8+8*t*t);
    const px=16+x+dx,py=16+y+dy;if(px<0||px>=size||py<0||py>=size)continue;
    Buffer.from(color).copy(pixels,((team*size+py)*width+frame*size+px)*4);
  }
}
const output=path.resolve(__dirname,"../assets/dashball/targets.png");writePixels(output,width,size*2,pixels);console.log(output);
