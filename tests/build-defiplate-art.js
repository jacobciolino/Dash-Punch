"use strict";
// Import the generated component atlas as small, palette-limited game sprites.
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=path.resolve(__dirname,"../assets/defiplate");
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
  try {
    const page=await browser.newPage();
    const result=await page.evaluate(async src=>{
      const image=new Image();image.src=src;await image.decode();
      const probe=document.createElement("canvas");probe.width=image.naturalWidth;probe.height=image.naturalHeight;
      const ctx=probe.getContext("2d");ctx.drawImage(image,0,0);
      const rgba=ctx.getImageData(0,0,probe.width,probe.height).data,outputs={};
      const split=Math.floor(probe.height*.625);
      for(const [file,top,bottom,width,height] of [["plate.png",0,split,29,16],["barbell.png",split,probe.height,64,8]]) {
        let x1=probe.width,y1=bottom,x2=0,y2=top;
        for(let y=top;y<bottom;y++)for(let x=0;x<probe.width;x++)if(rgba[(y*probe.width+x)*4+3]>=192){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}
        if(x2<=x1||y2<=y1)throw Error("Missing atlas component: "+file);
        const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
        const paint=canvas.getContext("2d");paint.imageSmoothingEnabled=false;
        paint.drawImage(image,x1,y1,x2-x1+1,y2-y1+1,0,0,width,height);
        const pixels=paint.getImageData(0,0,width,height);
        for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i+3]>=160?255:0;for(let c=0;c<3;c++)pixels.data[i+c]=Math.min(255,Math.round(pixels.data[i+c]/16)*16);}
        paint.putImageData(pixels,0,0);outputs[file]=canvas.toDataURL();
      }
      return outputs;
    },"data:image/png;base64,"+fs.readFileSync(path.join(root,"source-atlas.png")).toString("base64"));
    for(const [file,data] of Object.entries(result))fs.writeFileSync(path.join(root,file),Buffer.from(data.split(",")[1],"base64"));
    console.log("Imported DefiPlate: standalone 29x16 plate and attack-only 64x8 barbell.");
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
