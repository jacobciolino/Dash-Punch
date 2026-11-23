"use strict";
const path=require("node:path"),sharp=require(process.env.SHARP_MODULE||"sharp");
(async()=>{
  const root=path.resolve(__dirname,"..");
  const {data,info}=await sharp(path.join(root,"artifacts/sports-polish/chungus-arm-source.png")).trim().resize(96,32,{fit:"fill",kernel:"nearest"}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=3;i<data.length;i+=4)data[i]=data[i]>=128?255:0;
  await sharp(data,{raw:info}).png({palette:true,colours:16,dither:0}).toFile(path.join(root,"assets/optional/seeker-pro/chungus-arm.png"));
  await sharp("/Users/jacobciolino/Downloads/ball.png").resize(16,16,{kernel:"nearest"}).png().toFile(path.join(root,"assets/dashball/basketball.png"));
  console.log(JSON.stringify({arm:[96,32],basketball:[16,16]}));
})().catch(e=>{console.error(e);process.exitCode=1;});
