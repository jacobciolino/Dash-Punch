"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const {server}=require("../server");
(async()=>{
  let browser;
  try {
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||undefined});
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debugHitboxes=1`);
    await page.getByRole("button",{name:"Play",exact:true}).click();await page.getByRole("button",{name:"Local",exact:true}).click();
    const tile=page.locator('.character-tile[aria-label="DefiPlate"]');assert.equal(await tile.count(),1);
    assert.equal(await page.locator(".character-tile").nth(12).getAttribute("aria-label"),"DefiPlate");
    assert.equal(await tile.locator(".tile-name").innerText(),"DefiPlate");
    const result=await page.evaluate(async()=>{
      const d=window.__dashPunchDebug;d.online.rollback.setup({characterKeys:["defiplate","orbit"],seed:42});
      const f=d.fighters[0],canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");
      const a=(age=.12,dir={x:1,y:0})=>({id:900,age,startup:.075,active:.13,recovery:.22,total:.425,charge:0,dir,hitTargets:new Set()});
      Object.assign(f,{attack:a(),x:220,y:130,onGround:true});
      for(let i=0;i<5;i++){d.gravity.draw(0);await new Promise(resolve=>setTimeout(resolve,80));}
      const fixtures=[
        ["Idle",{},0],["Dash",{vx:900,dashCarryTimer:.3},0],["Airborne",{onGround:false,vy:-300},0],
        ["Shield / charge",{chargingPunch:true,punchInputHeld:true,punchCharge:.5},0],
        ["Startup",{attack:a(.04)},1],["Strike right",{attack:a()},1],
        ["Strike left",{face:{x:-1,y:0},attack:a(.12,{x:-1,y:0})},1],
        ["Strike up",{face:{x:0,y:-1},attack:a(.12,{x:0,y:-1})},1],
        ["Strike down",{face:{x:0,y:1},attack:a(.12,{x:0,y:1})},1],
        ["Recovery",{attack:a(.35)},1],["Clean-hit retract",{punchVisual:{dir:{x:1,y:0},charge:0,age:.08}},1],
        ["Finished",{},0],["Preparing next Punch",{attack:a(),chargingPunch:true,punchInputHeld:true,punchCharge:.1},1],
        ["Interrupted",{hitstun:.2,attack:a()},0],["Expired follow-through",{punchVisual:{dir:{x:1,y:0},charge:0,age:.16}},0],
      ];
      const gallery=document.createElement("canvas");gallery.width=1320;gallery.height=Math.ceil(fixtures.length/3)*280;
      const g=gallery.getContext("2d");g.fillStyle="#1b2730";g.fillRect(0,0,gallery.width,gallery.height);g.imageSmoothingEnabled=false;
      const original=ctx.drawImage,results=[];let barDraws=0,barScaledWrong=false;
      ctx.drawImage=function(image,...args){if(image.src?.includes("defiplate/barbell.png")){barDraws++;if(args.length===8&&(args[6]/args[2]!==3||args[7]/args[3]!==3))barScaledWrong=true;}return original.call(this,image,...args);};
      for(let index=0;index<fixtures.length;index++) {
        const [name,pose,expected]=fixtures[index];
        Object.assign(f,{attack:null,punchVisual:null,chargingPunch:false,punchInputHeld:false,punchCharge:0,hitstun:0,juked:0,koScored:false,
          vx:0,vy:0,dashCarryTimer:0,onGround:true,face:{x:1,y:0}},pose);
        ctx.clearRect(0,0,1280,720);barDraws=0;const hash=d.online.rollback.hash();d.gravity.draw(0);
        if(hash!==d.online.rollback.hash())throw Error("render changed combat");
        if(Boolean(barDraws)!==Boolean(expected))throw Error(`${name}: unexpected barbell visibility (${barDraws})`);
        g.drawImage(canvas,0,0,440,260,index%3*440,Math.floor(index/3)*280,440,260);
        g.fillStyle="#f3f7f8";g.font="14px sans-serif";g.fillText(name,index%3*440+12,Math.floor(index/3)*280+270);
        results.push({name,barDraws});
      }
      for(const [axis,sign] of [["y",1],["y",-1],["x",1],["x",-1]]) {
        d.gravity.setDirection(axis,sign);f.attack=a();const hash=d.online.rollback.hash();d.gravity.draw(0);
        if(hash!==d.online.rollback.hash())throw Error("gravity-aligned barbell changed combat");
      }
      ctx.drawImage=original;
      const sprite=await d.spriteArt(0),image=new Image();image.src=sprite.src;await image.decode();
      const probe=document.createElement("canvas");probe.width=image.naturalWidth;probe.height=image.naturalHeight;
      const p=probe.getContext("2d");p.drawImage(image,0,0);const pixels=p.getImageData(0,0,probe.width,probe.height).data;
      const alphas=new Set();for(let i=3;i<pixels.length;i+=4)alphas.add(pixels[i]);
      return {results,barScaledWrong,alphas:[...alphas],gallery:gallery.toDataURL()};
    });
    assert(!result.barScaledWrong);assert.deepEqual(result.alphas.sort((a,b)=>a-b),[0,255]);assert.deepEqual(errors,[]);
    fs.mkdirSync("artifacts/defiplate",{recursive:true});
    fs.writeFileSync("artifacts/defiplate/attack-states.png",Buffer.from(result.gallery.split(",")[1],"base64"));delete result.gallery;
    fs.writeFileSync("artifacts/defiplate/verification.json",JSON.stringify(result,null,2));
    console.log("DefiPlate browser: core tile, standalone non-attack states, attack extension/retraction, both facings, vertical aim, four gravities, native 3x pixels and pure rendering passed.");
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
