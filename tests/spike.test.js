"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function setup(a="anchor",b="spike") {
  rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:[a,b],seed:42});
  Object.assign(debug.fighters[0],{x:430,y:300,vx:0,vy:0});
  Object.assign(debug.fighters[1],{x:480,y:300,vx:0,vy:0});
  return debug.fighters;
}
function arm(f,charge=0) {
  f.attack={id:999,age:0.1,startup:0,active:0.2,recovery:0.2,total:0.4,dir:{x:1,y:0},charge,hitTargets:new Set(),grounded:false};
}
function guard(f) {Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0}});}
for(const charge of [0,1]) {
  let [a,b]=setup("anchor","orbit");guard(b);arm(a,charge);const base=b.shieldHealth;debug.resolveHit(0,1);const damage=base-b.shieldHealth;
  [a,b]=setup();guard(b);arm(a,charge);const armored=b.shieldHealth;debug.resolveHit(0,1);
  near(armored-b.shieldHealth,damage*0.55);near(b.punchBlockstun,(10+8*charge)/60*0.6);
  assert.equal(b.data.spriteSet,"seekerpro");assert(b.data.spikeArmor);assert.equal(b.data.shieldMax,140);
}
for(const target of ["spike","orbit"]) {
  const [a,b]=setup("anchor",target);guard(b);
  b.punchAim={x:-Math.cos(70*Math.PI/180),y:Math.sin(70*Math.PI/180)};
  arm(a);debug.resolveHit(0,1);
  assert.equal(b.punchBlockstun>0,target==="spike","wide shield coverage mismatch");
}
for(const target of ["spike","orbit"]) {
  const [a,b]=setup("anchor",target);guard(b);
  Object.assign(a,{x:448,prevX:418,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:0.3,airDashes:2});
  b.x=470;const health=a.health;
  assert(debug.tryDashRebound(0,1));
  if(target==="spike") {assert.equal(a.health,health-7);near(a.hitstun,b.data.shieldThornsHitstun);assert.equal(a.lastAttacker,b);assert.equal(a.stunType,"stun");}
  else {assert.equal(a.health,health);assert.equal(a.hitstun,0);}
  assert.equal(b.punchBlockstun,0,"Kickoff must not give defender blockstun");
}
{
  const [a,b]=setup();guard(b);b.shieldHealth=1;arm(a,1);debug.resolveHit(0,1);
  assert.equal(b.stunType,"shieldBreak");assert.equal(b.punchBlockstun,0);
}
{
  const [a,b]=setup();guard(b);b.punchAim={x:1,y:0};
  Object.assign(a,{x:448,prevX:418,prevY:300,vx:900,dashDir:{x:1,y:0},dashCarryTimer:0.3});b.x=470;
  const health=a.health;assert(debug.tryDashRebound(0,1));assert.equal(a.health,health,"exposed shield back cannot thorn");
}
{
  const [a,b]=setup("spike","anchor");arm(a);debug.resolveHit(0,1);
  assert(b.vy<0,"Spike must launch upward");near(a.vx,0);near(a.vy,0);assert(!a.punchPursuitActive);
  const saved=rb.save(),hash=rb.hash();rb.step([{},{}]);rb.restore(saved);assert.equal(rb.hash(),hash);
  const before=rb.hash();debug.gravity.draw(0);assert.equal(rb.hash(),before);
}
{
  const [a,b]=setup("spike","anchor");guard(b);arm(a);debug.resolveHit(0,1);
  assert.equal(a.vx,0);assert.equal(a.vy,0,"blocked punch must not grant pursuit");
}
console.log("Spike: Orbit model, armor, unchanged shield damage/blockstun and Kickoff thorns, directional counterplay, upward launch and no Chase passed.");
