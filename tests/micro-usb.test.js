"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
function setup() {
  rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:["microusb","anchor"],seed:42});
  const [a,b]=debug.fighters;
  a.attack={id:999,age:.1,startup:0,active:.2,recovery:.2,total:.4,charge:0,dir:{x:1,y:0},hitTargets:new Set(),grounded:false};
  Object.assign(b,{hitstun:1,comboHits:1,lastAttacker:a,invulnerable:0});
  return [a,b];
}
for(const defense of ["punch","dash","shield","dashParry"]) {
  let [a,b]=setup();
  const arm=()=>{
    if(defense==="punch")b.hitstunParryActive=.2;
    if(defense==="shield")b.shieldReleaseParry=.2;
    if(defense==="dashParry") {b.dashParry=.2;b.dashDir={x:-1,y:0};}
    if(defense==="dash") {b.dashEscapeBuffer=.1;b.dashEscapeBufferedDir={x:-1,y:0};}
  };
  const health=b.health;arm();debug.resolveHit(0,1);
  assert.equal(b.health,health,`${defense} must still defend the opening hit`);
  assert.equal(b.electricLatch,null);
  [a,b]=setup();debug.resolveHit(0,1);
  const firstHealth=b.health, firstHits=b.comboHits;
  for(let tick=0;tick<3;tick++) {
    b.hitstop=0;b.invulnerable=0;arm();
    debug.updateElectricLatches(.17);
    assert.equal(b.comboHits,firstHits+tick+1,`${defense} broke electrical pulse ${tick+1}`);
    assert.equal(b.escapeWindow,0);
  }
  assert(b.health<firstHealth);assert.equal(b.electricLatch,null);
  const hash=rb.hash(),snapshot=rb.save();rb.restore(snapshot);assert.equal(rb.hash(),hash);
}
assert.equal(debug.fighters[0].data.spriteSet,"seekerproelectric");
console.log("Micro USB: casting sprite, opening-hit defenses, three unbreakable electrical pulses and state restore passed.");
