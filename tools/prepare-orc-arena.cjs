"use strict";
const fs=require("node:fs"),path=require("node:path"),sharp=require(process.env.SHARP_MODULE||"sharp");
(async()=>{
  const source=process.argv[2]||"/tmp/dash-orc-arena/OrcBungalo_ArenaKit",output=path.resolve(__dirname,"../assets/stages/orc-arena");fs.mkdirSync(output,{recursive:true});
  for(const name of ["sky","islands_far","forest_mid","stands"])fs.copyFileSync(path.join(source,"backdrop",name+".png"),path.join(output,name+".png"));
  for(const name of ["LICENSE.txt","README.txt"])fs.copyFileSync(path.join(source,name),path.join(output,name));
  await sharp(path.join(source,"backdrop/crowd/crowd_cheer_orc.png")).extract({left:0,top:0,width:480,height:270}).png().toFile(path.join(output,"crowd.png"));
  await sharp(path.join(output,"sky.png")).composite(["islands_far","forest_mid","stands","crowd"].map(name=>({input:path.join(output,name+".png")})))
    .modulate({brightness:.5,saturation:.55}).png().toFile(path.join(output,"preview.png"));
  const tiles=path.join(source,"tiles/tileset.png"),tile=async id=>sharp(tiles).extract({left:id%16*16,top:Math.floor(id/16)*16,width:16,height:16}).png().toBuffer();
  const body=[],edge=[],wall=[];
  for(let y=0;y<4;y++)for(let x=0;x<8;x++){
    body.push({input:await tile(4+(x+y*3)%2),left:x*16,top:y*16});
    wall.push({input:await tile(47),left:x*16,top:y*16});
    if(!y)edge.push({input:await tile((x*3)%4),left:x*16,top:0});
  }
  for(const [file,layers,height] of [["ground.png",body,64],["edge.png",edge,16],["wall.png",wall,64]]){
    const tileSheet=await sharp({create:{width:128,height,channels:4,background:"#00000000"}}).composite(layers).png().toBuffer();
    await sharp(tileSheet).resize(384,height*3,{kernel:"nearest"}).png().toFile(path.join(output,file));
  }
  console.log(JSON.stringify({output,files:fs.readdirSync(output),bytes:fs.readdirSync(output).reduce((sum,file)=>sum+fs.statSync(path.join(output,file)).size,0)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
