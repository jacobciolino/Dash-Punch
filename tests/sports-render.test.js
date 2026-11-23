"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),{createCanvas,Image}=require(process.env.CANVAS_MODULE||"@napi-rs/canvas"),{createGame}=require("./simulation-harness");
const pending=[];
const sharp=require(process.env.SHARP_MODULE||"sharp");
class LocalImage extends Image{
  set src(value){this.url=value;const data=String(value).startsWith("data:")?Buffer.from(String(value).split(",")[1],"base64"):fs.readFileSync(path.resolve(value));
    // Normalize metadata in memory for this native test decoder; source art is unchanged.
    pending.push(sharp(data).png().toBuffer().then(buffer=>{super.src=buffer;return super.decode();}));}
  get src(){return this.url;}
  addEventListener(){}
}
(async()=>{
const g=createGame(process.cwd(),{makeCanvas:()=>createCanvas(1280,720),Image:LocalImage});
const warm=async()=>{for(let pass=0;pass<4;pass++){g.debug.stagePresentation.draw();await Promise.all(pending.splice(0));}};
fs.mkdirSync("artifacts/sports-polish",{recursive:true});
for(const arena of ["elevated","target-break","golden-rush","target-charge-stationary","target-charge-vertical","target-charge-roaming"]){
  g.debug.dashball.setup({arena},{characters:["edgebert","chungus"]});await warm();const hash=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),hash);const canvas=g.elements.get("game");
  fs.writeFileSync(`artifacts/sports-polish/${arena}.png`,canvas.toBuffer("image/png"));assert(canvas.getContext("2d").getImageData(300,300,1,1).data[3]>0);
}
g.debug.sandbag.setup({ruleset:"scramble"},{characters:["chungus","anchor"]});const f=g.debug.fighters[0];Object.assign(f,{x:650,y:600,onGround:false});
for(const direction of [1,-1]){
  f.attack={id:1,age:1,startup:0,active:5,recovery:.5,total:5.5,charge:1,dir:{x:direction,y:0},hitTargets:new Set()};
  await warm();const hash=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),hash);fs.writeFileSync(`artifacts/sports-polish/chungus-${direction===1?"right":"left"}.png`,g.elements.get("game").toBuffer("image/png"));
}
console.log("Sports CPU Canvas render: basketball, both arena backdrops, Chungus left/right and render-only hashes passed. Browser UI QA remains separate.");
})().catch(e=>{console.error(e);process.exitCode=1;});
