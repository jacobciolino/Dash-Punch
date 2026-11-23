"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
function attack(id,extra={}) {
  return {id,age:.1,startup:0,active:5,recovery:.2,total:5.2,charge:0,dir:{x:1,y:0},hitTargets:new Set(),grounded:false,...extra};
}
for(const victim of ["chungus","whipado","swordkun","microusb"]) {
  rb.setup({characterKeys:["orbit",victim],seed:42});
  const [a,b]=debug.fighters;
  a.attack=attack(100);b.attack=attack(101);
  const shot=attack(102,{projectile:{x:20,y:20,radius:5}});
  b.projectiles.push(shot);
  debug.resolveHit(0,1);
  assert(b.hitstun>0);assert.equal(b.attack,null,`${victim} retained its melee hitbox`);
  assert.equal(b.projectiles[0],shot,"getting hit removed a fired projectile");
  const hash=rb.hash(),snapshot=rb.save();rb.restore(snapshot);assert.equal(rb.hash(),hash);
}
rb.setup({characterKeys:["orbit","gunman"],seed:42});
let [a,b]=debug.fighters;
a.attack=attack(200);const shot=attack(201,{projectile:{x:20,y:20,radius:5}});b.attack=shot;
debug.resolveHit(0,1);assert.equal(b.attack,shot,"temporary projectile attack was cancelled");
rb.setup({characterKeys:["orbit","chungus"],seed:42});
[a,b]=debug.fighters;a.attack=attack(300);const melee=attack(301);b.attack=melee;b.invulnerable=1;
debug.resolveHit(0,1);assert.equal(b.attack,melee,"avoided hits must not cancel melee");
console.log("Hit interrupt: lingering melee cancelled immediately, projectiles preserved, invulnerability and restore passed.");
