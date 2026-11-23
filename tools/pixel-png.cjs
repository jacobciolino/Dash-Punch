"use strict";
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib");
function crc(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([t,data])),out.length-4);return out;}
function writePixels(file,width,height,rgba){
  if(rgba.length!==width*height*4)throw Error("Invalid pixel buffer dimensions");
  const raw=Buffer.alloc((width*4+1)*height);
  for(let y=0;y<height;y++)Buffer.from(rgba).copy(raw,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]));
}
module.exports={writePixels};
