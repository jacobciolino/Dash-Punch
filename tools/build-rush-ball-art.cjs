"use strict";
const path=require("node:path"),{writePixels}=require("./pixel-png.cjs");
const rows=[
  ".....IIIIII.....",
  "...IIRRRRRRII...",
  "..IRRLLLLRRRRI..",
  ".IRRLWWWLLRRRRI.",
  ".IRLWWWWLLRRRRI.",
  "IRRLWWWLLRRRRRSI",
  "IRRLLLLLRRRRRSSI",
  "IRRRLLLRRRRRRSSI",
  "IRRRRRRRRRRRSSSI",
  "IRRRRRRRRRRSSSSI",
  "IRRRRRRRRRSSSSSI",
  ".IRRRRRRRSSSSSI.",
  ".IRRRRRSSSSSSDI.",
  "..ISSSSSSSSDDI..",
  "...IISSSDDDII...",
  ".....IIIIII.....",
];
const palette={I:[48,13,28,255],D:[100,20,43,255],S:[162,29,49,255],R:[228,45,57,255],L:[255,111,110,255],W:[255,233,213,255]};
const pixels=Buffer.alloc(16*16*4);
rows.forEach((row,y)=>{if(row.length!==16)throw Error("Invalid authored row");[...row].forEach((p,x)=>{if(palette[p])pixels.set(palette[p],(y*16+x)*4);});});
writePixels(path.resolve(__dirname,"../assets/dashball/rush-ball.png"),16,16,pixels);
