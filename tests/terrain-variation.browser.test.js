"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright"),{server}=require("../server");
const stages=["High Perch","Uplift","Castle Dungeon","Flip Chamber","Crosswire"];
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/game.js",async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("drawDebugHitboxes();","")});});
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    const before=process.argv.includes("--before"),label=before?"before":"after",results=[];
    fs.mkdirSync("artifacts/terrain-variation",{recursive:true});
    if(before) {
      const probe=await page.evaluate(async()=>{
        const panels=[
          ["Snow ledges","snowy-mountains/mainlevbuild1.png",[128,304,480,176]],
          ["Snow rock fill","snowy-mountains/mainlevbuild1.png",[256,80,208,112]],
          ["Castle masonry","castle-prison/mainlevbuildB.png",[32,112,384,176]],
          ["Castle floor ledge","castle-prison/mainlevbuild.png",[128,656,432,64]],
        ],c=document.createElement("canvas");c.width=1100;c.height=1250;const p=c.getContext("2d");
        p.fillStyle="#20313b";p.fillRect(0,0,c.width,c.height);p.imageSmoothingEnabled=false;
        let y=20;
        for(const [name,file,crop] of panels) {
          const image=new Image();image.src="assets/stages/"+file;await image.decode();
          p.fillStyle="#fff";p.font="15px sans-serif";p.fillText(`${name}: x=${crop[0]}, y=${crop[1]}, native 16px grid`,10,y);
          y+=12;p.drawImage(image,...crop,32,y,crop[2]*2,crop[3]*2);
          p.strokeStyle="rgba(255,75,100,.35)";p.lineWidth=1;
          for(let x=0;x<=crop[2];x+=16){p.beginPath();p.moveTo(32+x*2,y);p.lineTo(32+x*2,y+crop[3]*2);p.stroke();}
          for(let row=0;row<=crop[3];row+=16){p.beginPath();p.moveTo(32,y+row*2);p.lineTo(32+crop[2]*2,y+row*2);p.stroke();}
          y+=crop[3]*2+38;
        }
        return c.toDataURL();
      });
      fs.writeFileSync("artifacts/terrain-variation/source-inspection.png",Buffer.from(probe.split(",")[1],"base64"));
    }
    for(const stage of stages) {
      const result=await page.evaluate(async({stage,before})=>{
        const d=window.__dashPunchDebug;
        if(stage==="Castle Dungeon")d.arena.setup(stage,{ai:false});
        else d.online.rollback.setup({stageIndex:d.stageNames.indexOf(stage),characterKeys:["orbit","spike"],seed:42});
        const art=window.DASH_PUNCH_ART.backdrops[stage];
        for(let i=0;i<10;i++){d.stagePresentation.draw();await new Promise(resolve=>setTimeout(resolve,50));}
        const hash=d.online.rollback.hash(),geometry=JSON.stringify(d.terrainArt.rects);
        const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
        const enhanced=canvas.toDataURL();d.stagePresentation.setQuality("classic");d.stagePresentation.draw();const classic=canvas.toDataURL();d.stagePresentation.setQuality("enhanced");
        for(let i=0;i<10;i++)d.terrainArt.draw();
        if(hash!==d.online.rollback.hash()||geometry!==JSON.stringify(d.terrainArt.rects))throw Error("terrain art changed simulation/geometry");
        const texture=new Image();texture.src=art.groundSrc;await texture.decode();
        const probe=document.createElement("canvas");probe.width=texture.naturalWidth;probe.height=texture.naturalHeight;
        const p=probe.getContext("2d");p.drawImage(texture,0,0);const pixels=p.getImageData(0,0,probe.width,probe.height).data;
        let pairs=0,different=0;
        for(let y=0;y<probe.height;y+=2)for(let x=0;x<probe.width-64;x+=2){const a=(y*probe.width+x)*4,b=a+64*4;pairs++;if(Math.abs(pixels[a]-pixels[b])+Math.abs(pixels[a+1]-pixels[b+1])+Math.abs(pixels[a+2]-pixels[b+2])>12)different++;}
        if(!before&&(!art.terrainVariation||probe.width<512||different/pairs<.12))throw Error("small repeated patch remains");
        let movingPhaseStable=null;
        if(!before&&stage==="Castle Dungeon") {
          const saved=d.online.rollback.save();
          const translations=()=>{
            const calls=[],translate=ctx.translate;
            try {ctx.translate=function(x,y){calls.push([x,y]);return translate.call(this,x,y);};d.terrainArt.draw();}
            finally {ctx.translate=translate;}
            return calls;
          };
          const first=translations();d.advancePlatforms(.75);const moved=translations();
          if(first.length!==moved.length||first.length!==d.terrainArt.rects.length*3)throw Error("missing cached terrain patterns");
          if(new Set(first.filter((_,i)=>i%3===1).map(call=>JSON.stringify(call))).size<2)throw Error("all platforms repeat the same texture origin");
          if(!first.some((call,i)=>i%3===0&&JSON.stringify(call)!==JSON.stringify(moved[i])))throw Error("moving platform did not move");
          if(first.some((call,i)=>i%3!==0&&JSON.stringify(call)!==JSON.stringify(moved[i])))throw Error("moving platform texture swims");
          d.online.rollback.restore(saved);
          if(JSON.stringify(first)!==JSON.stringify(translations())||hash!==d.online.rollback.hash())throw Error("replay changed terrain pattern phase");
          movingPhaseStable=true;
        }
        return {enhanced,classic,textureSize:[probe.width,probe.height],differentAt64:different/Math.max(1,pairs),movingPhaseStable};
      },{stage,before});
      for(const quality of ["enhanced","classic"])fs.writeFileSync(`artifacts/terrain-variation/${stage.toLowerCase().replaceAll(" ","-")}-${label}-${quality}.png`,Buffer.from(result[quality].split(",")[1],"base64"));
      delete result.enhanced;delete result.classic;results.push({stage,...result});
    }
    if(!before) {
      await page.getByRole("button",{name:"Play",exact:true}).click();await page.getByRole("button",{name:"Local",exact:true}).click();
      for(const slot of [0,1])await page.locator(`[data-menu-action="slotReady"][data-slot="${slot}"]`).click();
      await page.getByRole("button",{name:"Choose Stage",exact:true}).click();
      for(const stage of stages) {
        const index=await page.evaluate(stage=>window.__dashPunchDebug.stageNames.indexOf(stage),stage);
        const sizes=await page.locator(`[data-menu-action="chooseStage"][data-stage="${index}"] .stage-part`).evaluateAll(parts=>parts.map(part=>getComputedStyle(part).backgroundSize));
        assert(sizes.length&&sizes.every(size=>size==="512px 8px, 512px 256px"),`${stage} preview shrinks atlas into a tiny repeated patch`);
      }
      await page.screenshot({path:"artifacts/terrain-variation/stage-select-after.png"});
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(`artifacts/terrain-variation/${label}.json`,JSON.stringify(results,null,2));
    console.log(JSON.stringify({tests:"passed",label,results},null,2));
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
