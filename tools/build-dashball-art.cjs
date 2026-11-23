"use strict";
// Authored 16px ball panels. Quarter turns preserve clusters without resampling.
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib");
const rows=[
  ".....OOOOOO.....",
  "...OOKKKWWWOO...",
  "..OKKKKKWWWWW O..".replace(" ",""),
  ".OKKKKWWWWWWWWO.",
  ".OKKKWWWWWWKKWO.",
  "OKWWWWWKKKKKKWWO",
  "OWWWWWKKKKKKKWWO",
  "OWWWWKKKKKKKWWWO",
  "OWWWWKKKKKKWWWWO",
  "OWWWWWKKKKWWWWWO",
  "OSKKWWWSSWWWWSSO",
  ".OKKKWSSSSWWSSO.",
  ".OKKKSSSSSKKKSO.",
  "..OKSSSSSKKKKO..",
  "...OOSSSKKKOO...",
  ".....OOOOOO.....",
];
const palette={".":[0,0,0,0],O:[27,32,41,255],K:[45,49,60,255],W:[246,249,248,255],S:[176,195,201,255]};
if(rows.some(row=>row.length!==16))throw Error("Ball art must be 16x16");
const frames=[rows.map(row=>[...row])];
for(let n=1;n<4;n++)frames.push(Array.from({length:16},(_,y)=>Array.from({length:16},(_,x)=>frames[n-1][15-x][y])));
const raw=Buffer.alloc((64*4+1)*16);
for(let y=0;y<16;y++)for(let f=0;f<4;f++)for(let x=0;x<16;x++)Buffer.from(palette[frames[f][y][x]]).copy(raw,y*257+1+(f*16+x)*4);
function crc(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([t,data])),out.length-4);return out;}
const header=Buffer.alloc(13);header.writeUInt32BE(64);header.writeUInt32BE(16,4);header[8]=8;header[9]=6;
const target=path.resolve(__dirname,"../assets/dashball/ball.png");fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]));
console.log(target);
