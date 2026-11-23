"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const game=createGame(),{debug,rb}=game;
function setup(stage="Flat") {
  rb.setup({stageIndex:rb.stageNames.indexOf(stage),characterKeys:["gunman","goodergunman"],seed:42});
  Object.assign(debug.fighters[0],{x:200,y:300});Object.assign(debug.fighters[1],{x:1000,y:300});
  return debug.fighters;
}
function bullet(x,dir,id) {
  return {id,age:0.1,startup:0,active:10,recovery:0,total:10,charge:0,dir:{x:dir,y:0},hitTargets:new Set(),
    projectile:{x,y:300,radius:8,speed:600,spawned:true,damage:10,knockback:600,hitstun:0.4}};
}
{
  const [a,b]=setup();
  const left=bullet(620,1,100),right=bullet(660,-1,101);
  a.projectiles=[left];b.projectiles=[right];
  debug.updateProjectiles(0.05);
  assert.equal(left.dir.x,-1);assert.equal(right.dir.x,1);
  assert.equal(left.reflectedOwnerId,b.id);assert.equal(right.reflectedOwnerId,a.id);
  assert(left.doubleReflect&&right.doubleReflect);
  assert(left.projectile.remainingLife>3.2&&left.projectile.remainingLife<=3.35);
  const hash=rb.hash(),snapshot=rb.save();
  left.dir.x=1;rb.restore(snapshot);assert.equal(rb.hash(),hash);
  // Let both reflected shots reach and damage their original shooters.
  const initial=debug.fighters.map(f=>f.health);
  for(let i=0;i<60;i++)debug.updateProjectiles(1/60);
  assert(debug.fighters[0].health<initial[0]);assert(debug.fighters[1].health<initial[1]);
}
{
  const [a,b]=setup();a.projectiles=[bullet(500,1,100)];b.projectiles=[bullet(510,1,101)];
  // Same-direction overlapping shots must not flip repeatedly on subsequent ticks.
  debug.updateProjectiles(0);const dirs=[a.projectiles[0].dir.x,b.projectiles[0].dir.x];
  debug.updateProjectiles(1/60);
  assert.deepEqual([a.projectiles[0].dir.x,b.projectiles[0].dir.x],dirs);
}
{
  const [a,b]=setup();a.projectiles=[bullet(1290,1,100)];b.projectiles=[bullet(-10,-1,101)];
  debug.updateProjectiles(1/60);assert(a.projectiles[0].doubleReflect&&b.projectiles[0].doubleReflect,"wrap-edge clash missed");
}
{
  setup("High Perch");
  for(const [upper,lower] of [[-500,-300],[-2200,950]]) {
    debug.fighters[0].y=upper;debug.fighters[1].y=lower;debug.camera.update();
    const c=debug.camera.state;assert(c.y<0,"camera still clamps to ceiling");
    for(const f of debug.fighters) {
      const y=(f.y-c.y)*c.zoom+c.offset.y;
      assert(y>=0&&y<=720,`fighter not framed: ${y}`);
    }
  }
  setup("Flat");debug.fighters.forEach(f=>f.y=-600);debug.camera.update();assert.equal(debug.camera.state.y,0,"other stage camera changed");
}
console.log("Projectile double reflection, shooter damage, cooldown, warp clash, rollback state and open-top High Perch camera passed.");
