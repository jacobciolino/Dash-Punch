"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGame}=require("./simulation-harness");
const R=require("../rollback");
const results={};
for(const stage of ["Flat","Crosswire","Castle Dungeon"]) {
  const {rb,debug}=createGame();rb.setup({stageIndex:rb.stageNames.indexOf(stage),characterKeys:["defiplate","orbit"],seed:511});
  require("./legacy-orbit-fixture")(debug.fighters);
  const f=debug.fighters[0];assert.equal(f.data.width,86);assert.equal(f.data.height,48);
  assert.equal(f.data.fixedLaunch.x,0);assert.equal(f.data.fixedLaunch.y,1);
  results[stage]=[];
  for(let frame=0;frame<240;frame++) {
    const inputs=[0,1].map(player=>{const t=frame+player*17;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.17),aimY:Math.sin(t*.17),dashHeld:t%37<10,punchHeld:t%29<9,downHeld:t%80<3,upHeld:t%120>100,downPressed:t%80===0}));});
    results[stage].push(rb.step(inputs));
  }
}
const file=path.join(__dirname,"defiplate-combat-before.json");
if(process.argv.includes("--record-before")) {
  assert(!fs.existsSync(file),"the pre-art baseline must not be overwritten");fs.writeFileSync(file,JSON.stringify(results));
  console.log("Recorded DefiPlate's pre-art combat fixture, 720 simulation frames.");
} else {
  assert.deepEqual(results,JSON.parse(fs.readFileSync(file,"utf8")));console.log("DefiPlate: 720 simulation frames exactly match pre-art behavior; body dimensions and straight-down launch preserved.");
}
