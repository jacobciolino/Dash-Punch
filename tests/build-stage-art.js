"use strict";
// Rebuild presentation-only scenery and texture crops from the supplied PF packs.
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=path.resolve(__dirname,"../assets/stages");
const themes={
  "castle-prison":{base:"#171d25",layers:["background_obj.png"],tiles:"mainlevbuildB.png",body:[208,128,96,64],edgeFile:"mainlevbuild.png",edge:[272,672,128,32],variation:{base:"#17151d",seed:731,
    body:[[208,128,96,64],[208,208,96,64]],edge:[[240,672,192,16],[144,672,48,16]]}},
  "snowy-mountains":{base:"#697e89",layers:["background1.png","background2a.png","background3.png","background4.png","background5.png"],tiles:"mainlevbuild1.png",body:[544,912,64,64],edge:[144,320,128,32],variation:{base:"#211d25",seed:419,
    body:[[320,144,96,32],[160,464,416,16]],edge:[[192,440,352,16],[192,328,128,16]]}},
  "deep-forest":{base:"#263d39",layers:["background1.png","background2.png","background3.png","background4.png","background5.png"],tiles:"mainlev_build1.png",body:[384,1136,128,64],edge:[352,272,32,16],edgeTile:true},
  "strange-world":{base:"#4c5552",layers:["background 1.png","background 2.png","background 3.png","background 4.png"],tiles:"mainlevbuildA.png",body:[256,880,48,64],edge:[704,624,128,32]},
};
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
  try {
    const page=await browser.newPage();
    for(const [name,config] of Object.entries(themes)) {
      const only=process.argv.find(arg=>arg.startsWith("--theme="))?.slice(8);
      if(only&&only!==name)continue;
      const files=[...new Set([...config.layers,config.tiles,config.edgeFile].filter(Boolean))];
      const sources=Object.fromEntries(files.map(file=>[file,"data:image/png;base64,"+fs.readFileSync(path.join(root,name,file)).toString("base64")]));
      const outputs=await page.evaluate(async({name,config,sources})=>{
        const images={};for(const [file,src] of Object.entries(sources)){const image=new Image();image.src=src;await image.decode();images[file]=image;}
        const canvas=document.createElement("canvas");canvas.width=960;canvas.height=540;
        const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
        ctx.fillStyle=config.base;ctx.fillRect(0,0,960,540);
        if(name==="castle-prison") {
          const image=images[config.layers[0]];
          for(let y=0;y<540;y+=160)for(let x=0;x<960;x+=256)ctx.drawImage(image,144,16,128,80,x,y,256,160);
          for(let x=-64;x<960;x+=256){ctx.drawImage(image,240,416,96,96,x,180,192,192);ctx.drawImage(image,144,304,64,96,x+164,0,96,180);}
        } else for(const file of config.layers)ctx.drawImage(images[file],0,0,960,540);
        // Keep scenery behind silhouettes; bright fighter outlines remain the foreground.
        ctx.fillStyle=name==="snowy-mountains"?"rgba(20,32,44,0.22)":"rgba(13,23,30,0.12)";ctx.fillRect(0,0,960,540);
        const result={"scene.png":canvas.toDataURL()};
        for(const [kind,crop] of [["ground",config.body],["edge",config.edge]]){
          if(config.variation) {
            const variation=config.variation,tileW=32,tileH=16;
            const source=images[kind==="edge"&&config.edgeFile?config.edgeFile:config.tiles];
            const probe=document.createElement("canvas");probe.width=source.naturalWidth;probe.height=source.naturalHeight;
            const inspect=probe.getContext("2d");inspect.drawImage(source,0,0);
            const pixels=inspect.getImageData(0,0,probe.width,probe.height).data;
            const families=(kind==="ground"?variation.body:variation.edge).map(([sx,sy,w,h])=>{
              const choices=[];
              for(let y=sy;y+tileH<=sy+h;y+=tileH)for(let x=sx;x+tileW<=sx+w;x+=tileW){
                let opaque=0;for(let py=y;py<y+tileH;py++)for(let px=x;px<x+tileW;px++)if(pixels[(py*probe.width+px)*4+3]>128)opaque++;
                if(opaque>=tileW*tileH*(kind==="ground"?.85:.5))choices.push([x,y]);
              }
              return choices;
            }).filter(choices=>choices.length);
            if(!families.length)throw Error(`No authored ${name}/${kind} patches`);
            canvas.width=1024;canvas.height=kind==="ground"?512:16;
            ctx.imageSmoothingEnabled=false;ctx.fillStyle=variation.base;ctx.fillRect(0,0,canvas.width,canvas.height);
            const hash=(x,y,salt)=>{let n=Math.imul(x+variation.seed,374761393)^Math.imul(y+salt,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
            const picks=[];
            // Group compatible authored rock/stone patches into larger courses.
            // The fixed hash only builds art; it never reads gameplay randomness.
            for(let row=0;row<canvas.height/tileH;row++){
              const offset=kind==="ground"&&row%2?16:0;picks[row]=[];
              for(let col=-1;col<=canvas.width/tileW;col++){
                const family=families[hash(Math.floor((col+1)/8),Math.floor(row/4),91)%families.length];
                let pick=hash(col+1,row,kind==="ground"?17:43)%family.length;
                if(family.length>1&&pick===picks[row][col])pick=(pick+1)%family.length;
                picks[row][col+1]=pick;
                ctx.drawImage(source,...family[pick],tileW,tileH,col*tileW-offset,row*tileH,tileW,tileH);
              }
            }
            result[kind+".png"]=canvas.toDataURL();continue;
          }
          canvas.width=64;canvas.height=kind==="ground"?64:16;
          ctx.imageSmoothingEnabled=false;ctx.fillStyle=name==="snowy-mountains"?"#303f47":"#252b2d";ctx.fillRect(0,0,canvas.width,canvas.height);
          const source=images[kind==="edge"&&config.edgeFile?config.edgeFile:config.tiles];
          if(kind==="edge"&&config.edgeTile) {
            for(let x=0;x<canvas.width;x+=crop[2])ctx.drawImage(source,...crop,x,0,crop[2],crop[3]);
          } else ctx.drawImage(source,...crop,0,0,canvas.width,canvas.height);
          result[kind+".png"]=canvas.toDataURL();
        }
        return result;
      },{name,config,sources});
      for(const [file,data] of Object.entries(outputs)) {
        if(file==="scene.png"&&process.argv.includes("--textures-only"))continue;
        fs.writeFileSync(path.join(root,name,file),Buffer.from(data.split(",")[1],"base64"));
      }
      console.log("Built "+name);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
