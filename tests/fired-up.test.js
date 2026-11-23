"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
function arm(f,dir=1) {f.attack={id:999,age:0.1,startup:0,active:0.2,recovery:0.2,total:0.4,charge:0,dir:{x:dir,y:0},hitTargets:new Set(),grounded:false};}
function setup() {rb.setup({characterKeys:["anchor","anchor"],seed:42});Object.assign(debug.fighters[0],{x:448,y:300});Object.assign(debug.fighters[1],{x:470,y:300});return debug.fighters;}
let [a,b]=setup();b.x=a.x+120;arm(a);arm(b,-1);assert(debug.firedUp.clash());assert.equal(a.firedUpHealth,8);assert.equal(b.firedUpHealth,8);
[a,b]=setup();Object.assign(a,{prevX:418,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:0.3});assert(debug.tryDashRebound(0,1));assert.equal(a.firedUpHealth,6);
[a,b]=setup();arm(a);let initial=b.health;debug.resolveHit(0,1);const baseDamage=initial-b.health;
[a,b]=setup();debug.firedUp.build(0,40);arm(a);initial=b.health;debug.resolveHit(0,1);assert(initial-b.health>baseDamage,"fired-up damage bonus was not applied to a real Punch");
rb.setup({characterKeys:["paul","spike"],seed:42});
let f=debug.fighters[0];const health=f.health;
debug.firedUp.build(0,8);assert.equal(f.firedUpHealth,8);assert.equal(f.firedUpTimer,6);
debug.firedUp.damage(0,5);assert.equal(f.firedUpHealth,3);assert.equal(f.health,health);
debug.firedUp.damage(0,8);assert.equal(f.firedUpHealth,0);assert.equal(f.health,health-5);
debug.firedUp.build(0,100);assert.equal(f.firedUpHealth,40);assert.equal(debug.firedUp.scale(0),1.25);
for(let i=0;i<300;i++)debug.gravity.physics(0,1/60);
assert.equal(f.firedUpHealth,40,"reserve faded during grace");
debug.firedUp.build(0,1);assert.equal(f.firedUpTimer,6,"interaction must refresh grace");
for(let i=0;i<421;i++)debug.gravity.physics(0,1/60);
assert(f.firedUpHealth<1e-7,"idle reserve did not fade");
debug.firedUp.build(0,16);const saved=rb.save(),hash=rb.hash();debug.firedUp.damage(0,10);rb.restore(saved);assert.equal(rb.hash(),hash);
assert.equal(debug.showcase,undefined);
console.log("Fired Up clash, Kickoff, temporary health, damage, decay and rollback passed; Showcase removed.");
