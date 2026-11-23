"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
function arm(f) {
  f.attack={id:999,age:0.1,startup:0,active:0.2,recovery:0.2,total:0.4,charge:0,dir:{x:1,y:0},hitTargets:new Set(),grounded:false};
}
for(const key of ["paul","whipado"]) {
  rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:42});
  const [a,b]=debug.fighters;
  Object.assign(a,{x:430,y:300,onGround:false,vx:0,vy:0});
  Object.assign(b,{x:480,y:300,onGround:false,vx:0,vy:0});
  arm(a);debug.resolveHit(0,1);
  assert.equal(a.punchPursuitActive,true);
  assert(Math.abs(a.vx-b.vx*0.92)<1e-8);assert(Math.abs(a.vy-b.vy*0.92)<1e-8);
  assert.equal(a.attack,null);assert.equal(a.punchLockout,0);
  if(key==="whipado") {
    assert.equal(a.punchVisual.chaseTargetId,b.id);
    const stable=rb.hash();debug.gravity.draw(0);assert.equal(rb.hash(),stable,"Chase art mutated combat");
  }
  const snap=rb.save(),hash=rb.hash();a.punchPursuitActive=false;rb.restore(snap);assert.equal(rb.hash(),hash);
  // Put the pursuing attacker into otherwise-valid Kickoff contact, after hitstop.
  Object.assign(a,{x:448,y:300,prevX:418,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:0.3,hitstop:0});
  Object.assign(b,{x:470,y:300,hitstop:0,invulnerable:0});
  const victimHealth=b.health,comboHits=b.comboHits;
  assert.equal(debug.isDashReboundCandidate(0,1),false,`${key} pursuit is still a Kickoff`);
  assert.equal(debug.tryDashRebound(0,1),false);
  assert.equal(b.health,victimHealth);assert.equal(b.comboHits,comboHits);
  // A new, deliberate Dash release restores ordinary Kickoff eligibility.
  Object.assign(a.controls,{hasAim:true,aim:{x:1,y:0}});
  Object.assign(a.controls.actions,{dashHeld:true,punchHeld:false});a.controls.buffers.dashPressed=0.1;
  debug.updateHumanInput(0);
  Object.assign(a.controls.actions,{dashHeld:false});a.controls.buffers.dashReleased=0.1;
  debug.updateHumanInput(0);
  assert.equal(a.punchPursuitActive,false,`${key} fresh Dash did not restore intent`);
  Object.assign(a,{vx:900,vy:0,prevX:418,prevY:300});
  assert(debug.isDashReboundCandidate(0,1),`${key} cannot intentionally Kickoff after a fresh Dash`);
  // Another real punch starts pursuit again and still permits immediate punches.
  a.dashReboundLockout=0;b.hitstop=0;b.invulnerable=0;arm(a);debug.resolveHit(0,1);
  assert(a.punchPursuitActive);assert.equal(a.attack,null);assert.equal(a.punchLockout,0);
}
rb.setup({characterKeys:["spike","anchor"],seed:42});
const [spike,victim]=debug.fighters;
Object.assign(spike,{x:430,y:300,onGround:false,vx:17,vy:23});
Object.assign(victim,{x:480,y:300,onGround:false});
arm(spike);debug.resolveHit(0,1);
assert.equal(spike.data.punchFollowThrough,undefined);
assert.equal(spike.punchPursuitActive,false);
assert.equal(spike.vx,17);assert.equal(spike.vy,23);
assert.equal(spike.punchVisual.chaseTargetId,undefined);
for (const blocked of [true,false]) {
  rb.setup({characterKeys:["whipado","anchor"],seed:42});
  const [a,b]=debug.fighters;
  if(blocked) {
    Object.assign(b,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0}});
    arm(a);debug.resolveHit(0,1);
  } else {arm(a);debug.updateAttack(0,1);}
  assert(!a.punchPursuitActive);assert(!a.punchVisual?.chaseTargetId,"miss/block must not cast Chase");
}
console.log("Paul/Whipado Chase: unchanged velocity/carry, deliberate Kickoff, render-only spell, rollback; Spike removal and miss/block gating passed.");
