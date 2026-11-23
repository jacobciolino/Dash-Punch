"use strict";
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
(async()=>{
  const root=path.resolve(__dirname,".."),browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||"chrome",headless:true});
  try{
    const page=await browser.newPage();
    for(const [sourceFile,file,frames,width,height,uniform] of [["generated-source.png","conditions.png",5,30,56,false],["flames-source.png","flames.png",6,40,64,true]]){
    const source=fs.readFileSync(path.join(root,"artifacts/sandbag",sourceFile)).toString("base64");
    const data=await page.evaluate(async({source,frames,width,height,uniform})=>{
      const image=new Image();image.src="data:image/png;base64,"+source;await image.decode();
      const input=document.createElement("canvas");input.width=image.width;input.height=image.height;
      const c=input.getContext("2d");c.drawImage(image,0,0);const pixels=c.getImageData(0,0,input.width,input.height).data;
      const output=document.createElement("canvas");output.width=width*frames;output.height=height;const out=output.getContext("2d");out.imageSmoothingEnabled=false;
      const bounds=[];
      for(let frame=0;frame<frames;frame++){
        let left=image.width,top=image.height,right=0,bottom=0;
        for(let x=Math.floor(frame*image.width/frames);x<Math.floor((frame+1)*image.width/frames);x++)for(let y=0;y<image.height;y++){
          if(pixels[(y*image.width+x)*4+3]<100)continue;
          left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
        }
        if(right<=left||bottom<=top)throw Error("Empty sandbag frame");
        bounds.push({left,top,right,bottom});
      }
      const common=uniform?{left:Math.min(...bounds.map((b,i)=>b.left-i*image.width/frames)),right:Math.max(...bounds.map((b,i)=>b.right-i*image.width/frames)),top:Math.min(...bounds.map(b=>b.top)),bottom:Math.max(...bounds.map(b=>b.bottom))}:null;
      bounds.forEach((b,i)=>{if(common)b={...common,left:common.left+i*image.width/frames,right:common.right+i*image.width/frames};
        out.drawImage(image,b.left,b.top,b.right-b.left+1,b.bottom-b.top+1,i*width,0,width,height);});
      const crisp=out.getImageData(0,0,output.width,output.height);
      for(let i=0;i<crisp.data.length;i+=4)crisp.data[i+3]=crisp.data[i+3]>=128?255:0;
      out.putImageData(crisp,0,0);
      return {png:output.toDataURL("image/png").split(",")[1],bounds,transparent:pixels[3]===0};
    },{source,frames,width,height,uniform});
    if(!data.transparent)throw Error("Generated source must be genuinely transparent");
    fs.writeFileSync(path.join(root,"assets/sandbag",file),Buffer.from(data.png,"base64"));
    console.log(JSON.stringify({file,frames,width:width*frames,height,bounds:data.bounds}));
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
