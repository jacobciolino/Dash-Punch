"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
function setup(character="gunman",mode="combo") {
  rb.setup({stageIndex:rb.stageNames.indexOf("Flat"),characterKeys:[character,"orbit"],seed:42});
  const [shooter,guard]=debug.fighters;
  Object.assign(shooter,{x:400,y:300,vx:0,vy:0});
  Object.assign(guard,{x:580,y:300,vx:0,vy:0,hitstun:.7,comboHits:2,comboGrace:1,lastAttacker:shooter,invulnerable:0});
  const attack={id:999,age:.1,startup:0,active:10,recovery:0,total:10,charge:.3,dir:{x:1,y:0},grounded:false,
    hitTargets:new Set(),selfCancelled:false,clashed:false,
    projectile:{x:555,y:300,radius:8,speed:600,spawned:true,damage:10,knockback:500,hitstun:.4,arrow:character==="archer"}};
  shooter.projectiles=[attack];
  if(mode==="combo")Object.assign(guard,{hitstunParryActive:.1,hitstunParryMissPending:true});
  if(mode==="shield") {
    guard.shieldReleaseParry=.1;
    guard.attack={id:1000,age:0,startup:.3,active:.2,recovery:.2,total:.7,charge:.5,dir:{x:-1,y:0},hitTargets:new Set(),fromShieldRelease:true};
  }
  if(mode==="dash")Object.assign(guard,{dashParry:.1,dashDir:{x:-1,y:0}});
  return {shooter,guard,attack};
}
for(const character of ["gunman","goodergunman","archer"])for(const mode of ["combo","shield","dash"]) {
  const {shooter,guard,attack}=setup(character,mode);
  const hp=guard.health,shooterHp=shooter.health,counter=guard.attack;
  debug.updateProjectiles(0);
  assert.equal(shooter.projectiles[0],attack,`${character} ${mode}: parried shot was consumed`);
  assert.equal(attack.reflectedOwnerId,guard.id);
  assert.equal(attack.dir.x,-1);assert(Math.abs(attack.dir.y)<1e-9);
  assert.equal(attack.projectile.remainingLife,3.35);
  assert.equal(attack.selfCancelled,false);assert.equal(attack.hitTargets.size,0);
  assert.equal(guard.health,hp);assert(shooter.hitstun>0,"parry must retain attacker stun");
  if(mode==="shield") {
    assert.equal(guard.attack,counter,"reflection canceled shield-parry counterattack");
    assert(counter.shieldParryTriggered);assert(counter.startup<.3);
  }
  const state=rb.save(),hash=rb.hash();attack.dir.x=1;rb.restore(state);assert.equal(rb.hash(),hash);
  debug.updateProjectiles(.3);
  assert(debug.fighters[0].health<shooterHp,"reflected projectile cannot hurt its original shooter");
  assert.equal(debug.fighters[0].projectiles.length,0,"landed return shot did not disappear");
}
{
  const {shooter,guard,attack}=setup("gunman","shield");
  debug.updateProjectiles(0);
  attack.projectile.x=-20;attack.projectile.y=100;guard.attack=null;
  debug.updateProjectiles(1/60);
  assert(shooter.projectiles.length&&attack.projectile.x>1200,"parry reflection lost screen wrapping");
  attack.projectile.speed=0;
  debug.updateProjectiles(6.71);assert.equal(shooter.projectiles.length,0,"parry reflection did not expire");
}
{
  const {shooter,guard,attack}=setup("gunman","none");
  Object.assign(guard,{hitstun:0,comboHits:0,lastAttacker:null,chargingPunch:true,punchPending:true,punchAim:{x:-1,y:0}});
  debug.updateProjectiles(0);
  assert.equal(shooter.projectiles.length,0,"ordinary shield block should consume the shot");
  assert.equal(attack.reflectedOwnerId,undefined);assert(guard.punchBlockstun>0);
}
{
  const {shooter,guard,attack}=setup("gunman","combo");
  guard.stunType="shieldBreak";
  debug.updateProjectiles(0);
  assert.equal(attack.reflectedOwnerId,undefined,"non-combo stun incorrectly gained a parry reflection");
  assert.equal(shooter.projectiles.length,0);
}
console.log("Projectile parries: combo/shield/dash reflection, bullets/arrows, counterattack preservation, shooter damage, lifetime, wrap, rollback and ordinary-block regressions passed.");
