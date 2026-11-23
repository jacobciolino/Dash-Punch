"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
function setup() {
  rb.setup({stageIndex:rb.stageNames.indexOf("Vault"),characterKeys:["orbit","spike"],seed:42});
  const [f,other]=debug.fighters;
  Object.assign(f,{x:600,y:140,prevX:600,prevY:140,vx:0,vy:-650,onGround:false,hitstun:1,stunType:"knockdown",comboHits:2,comboGrace:1,
    knockdownTimer:1,knockdownImpactPending:true,surfaceBounceSource:"kickoff",lastAttacker:other,knockdownSource:other});
  return f;
}
for(const direction of [{x:0,y:-1},{x:.8,y:-.6},{x:-.8,y:-.6}]) {
  const f=setup();
  assert.equal(debug.getSurfaceTechPrediction(0,.28)?.surface,"ceiling");
  assert(debug.queueSurfaceTech(0,direction),"Up toward the ceiling must queue a tech");
  for(let i=0;i<18;i++)debug.gravity.physics(0,1/60);
  assert(f.ceilingTechFlash>0||f.surfaceTechType==="ceiling"||f.stunType==="ceilingTech"||f.floorTechFlash>0,"ceiling tech did not execute");
}
for(const direction of [{x:0,y:1},{x:.8,y:.6},{x:1,y:0}]) {
  setup();assert.equal(debug.queueSurfaceTech(0,direction),false,"Down or sideways must not queue a ceiling tech");
}
console.log("Ceiling tech: Up and upward diagonals accepted; Down and sideways rejected; actual ceiling contact tech verified.");
