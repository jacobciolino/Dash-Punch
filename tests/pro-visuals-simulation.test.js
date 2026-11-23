"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGame}=require("./simulation-harness");
const R=require("../rollback");
const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus"];
const results={};
for(const character of core) {
  const {rb,debug}=createGame();rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:[character,"orbit"],seed:4231});
  require("./legacy-orbit-fixture")(debug.fighters);
  const hashes=[];
  for(let frame=0;frame<120;frame++) {
    const inputs=[0,1].map(player=>{const t=frame+player*17;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.17),aimY:Math.sin(t*.17),dashHeld:t%37<10,punchHeld:t%29<9,downHeld:t%80<3,upHeld:t%120>100,downPressed:t%80===0}));});
    hashes.push(rb.step(inputs));
  }
  results[character]=hashes;
}
const file=path.join(__dirname,"pro-visuals-simulation-baseline.json");
if(process.argv.includes("--record"))fs.writeFileSync(file,JSON.stringify(results));
else {
  const baseline=JSON.parse(fs.readFileSync(file,"utf8"));
  // Intentional balance changes have dedicated fighter/projectile tests.
  // Keep the historical baseline on disk; do not record over it.
  for(const key of core.filter(key=>!["edgebert","kite","rain","gunman","archer"].includes(key)))assert.deepEqual(results[key],baseline[key],`${key} changed outside the documented fighter tuning`);
  console.log("PRO visual cleanup: 840 unchanged-fighter frames match the historical baseline; intentional fighter reworks have dedicated combat coverage.");
}
