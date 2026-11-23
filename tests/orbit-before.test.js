"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {dashFixture}=require("./orbit-fixture"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const file=path.join(__dirname,"orbit-before.json"),result={ground:{},air:{},others:{}};
for(const charge of [0,1])for(const side of [-1,1])result.ground[`${charge}:${side}`]=dashFixture({ground:true,charge,side}).points;
for(const charge of [0,1]){const {initial,range,averageSpeed,seconds}=dashFixture({charge});result.air[charge]={initial,range,averageSpeed,seconds};}
for(const key of ["anchor","spike","rain","whipado","reverso","chungus","paul","defiplate"]) {
  const {rb}=createGame();rb.setup({characterKeys:[key,"anchor"],seed:720});const hashes=[];
  for(let frame=0;frame<120;frame++)hashes.push(rb.step([0,1].map(player=>{const t=frame+player*17;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.17),aimY:Math.sin(t*.17),dashHeld:t%37<10,punchHeld:t%29<9}));})));
  result.others[key]=hashes;
}
if(process.argv.includes("--record-before")){assert(!fs.existsSync(file),"do not replace the pre-tuning fixture");fs.writeFileSync(file,JSON.stringify(result));console.log(JSON.stringify(result.air,null,2));}
else {const before=JSON.parse(fs.readFileSync(file,"utf8"));assert.deepEqual(result.ground,before.ground,"Orbit grounded dash changed");assert.deepEqual(result.others,before.others,"another fighter changed");console.log("Orbit: four grounded dash fixtures and 960 other-fighter frames match pre-tuning behavior exactly.");}
