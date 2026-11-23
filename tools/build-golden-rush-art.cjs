"use strict";
const path=require("node:path"),{writePixels}=require("./pixel-png.cjs");
const width=128,height=288,pixels=Buffer.alloc(width*height*4);
const ink=[19,26,38,255],gold=[255,204,69,255],light=[255,245,177,255],shade=[171,109,41,255];
function put(x,y,c){if(x>=0&&x<width&&y>=0&&y<height&&c)Buffer.from(c).copy(pixels,(y*width+x)*4);}
// Two authored ring sizes, with intact transparent apertures. Native scale is 3x.
for(let team=0;team<2;team++)for(let high=0;high<2;high++){
  const color=team?[67,204,237,255]:[244,103,115,255],ry=high?42:50;
  for(let y=0;y<112;y++)for(let x=0;x<32;x++){
    const d=((x-15.5)/11.5)**2+((y-55.5)/ry)**2;
    if(d>.78&&d<1.14)put(high*32+x,team*112+y,d>1.04||d<.86?ink:x<15?(high?gold:light):color);
    if(high&&y>=2&&y<=5&&Math.abs(x-15.5)<5-(y%2))put(high*32+x,team*112+y,gold);
  }
}
for(let frame=0;frame<4;frame++){
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const dx=Math.abs(x-15.5),dy=Math.abs(y-15.5);
    let c=null;
    if(dx+dy<10)c=dx+dy>8?ink:x+y<29?light:x+y>34?shade:gold;
    const wingY=frame%2?11:8;
    if(y>=wingY&&y<wingY+5&&dx>=9&&dx<15-(y-wingY))c=y===wingY?light:gold;
    if(dx<2&&dy<3)c=light;
    put(frame*32+x,224+y,c);
    const distance=Math.abs(x-15.5)+Math.abs(y-15.5),ring=4+frame*3;
    if(Math.abs(distance-ring)<1.1&&(x%3===0||y%3===0))put(frame*32+x,256+y,frame%2?gold:light);
  }
}
writePixels(path.resolve(__dirname,"../assets/dashball/golden-rush.png"),width,height,pixels);
