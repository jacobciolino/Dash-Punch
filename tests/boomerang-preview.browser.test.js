"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const root=process.env.CORE_RELEASE_DIR||path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),{server}=require(path.join(root,"server.js")),out="artifacts/boomerang-preview";
(async()=>{let browser;try{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));browser=await chromium.launch({headless:true,channel:"chrome",args:["--disable-gpu"]});
  const errors=[],results=[];
  for(const [width,height,offline]of[[1280,720,false],[1920,1080,false],[1280,720,true]]){
    const page=await browser.newPage({viewport:{width,height}});page.on("pageerror",e=>errors.push(e.message));
    await page.goto((offline?pathToFileURL(path.join(root,"index.html")).href:`http://127.0.0.1:${server.address().port}/`)+"?debugHitboxes=1");
    for(const name of["Play","Local"])await page.getByRole("button",{name,exact:true}).click();await page.waitForTimeout(350);
    await page.addStyleTag({content:".asset-sprite-preview { animation:none!important; }"});
    const hash=await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),models=[];
    for(const key of["chungus","boomerangus"]){
      const name=key==="chungus"?"Chungus":"Boomerangus";await page.getByRole("button",{name,exact:true}).hover();await page.waitForTimeout(80);
      models.push(await page.evaluate(async({key,name})=>{
        const set=window.DASH_PUNCH_ART.spriteSets[key==="chungus"?"chungusseeker":"boomerangus"],rows=[];
        for(const [kind,node]of[["tile",document.querySelector(`button[aria-label="${name}"] .asset-sprite-preview`)],["hover",document.querySelector("#lobbyRosterPreview .asset-sprite-preview")]]){
          const css=getComputedStyle(node),image=new Image();image.src=css.backgroundImage.slice(5,-2);await image.decode();
          const w=parseFloat(node.style.width),h=parseFloat(node.style.height),canvas=document.createElement("canvas");canvas.width=Math.ceil(w);canvas.height=Math.ceil(h);
          const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,w,h,0,0,w,h);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
          let minY=h,maxY=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*canvas.width+x)*4+3]>32){minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
          const scale=new DOMMatrix(css.transform).a;rows.push({kind,scale,nativeScale:scale*set.width/set.scaleGrid,inkHeight:(maxY-minY+1)*scale,pixelated:css.imageRendering,processed:image.src.startsWith("data:image/png")});
        }
        return {key,rows,pixelGrid:set.pixelGrid,scaleGrid:set.scaleGrid};
      },{key,name}));
    }
    for(let i=0;i<2;i++){
      const chungus=models[0].rows[i],boom=models[1].rows[i];assert(Math.abs(chungus.nativeScale-boom.nativeScale)<1e-4);
      assert(boom.inkHeight>=chungus.inkHeight*.9&&boom.inkHeight<=chungus.inkHeight*1.15);
      assert.equal(boom.pixelated,"pixelated");assert(boom.processed);
    }
    assert.equal(models[1].pixelGrid,46);assert.equal(models[1].scaleGrid,52);assert.equal(await page.evaluate(()=>window.__dashPunchDebug.online.rollback.hash()),hash);
    const tile=page.getByRole("button",{name:"Boomerangus",exact:true});await tile.click();assert.equal(await page.evaluate(()=>window.__dashPunchDebug.lobby.slots[0].character),"boomerangus");
    await page.screenshot({path:`${out}/${offline?"offline":"roster"}-${width}.png`});results.push({width,height,offline,models});await page.close();
  }
  assert.deepEqual(errors,[]);const report={passed:true,root,results,errors,gameplayChanged:false,originalArtChanged:false};fs.writeFileSync(`${out}/verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
