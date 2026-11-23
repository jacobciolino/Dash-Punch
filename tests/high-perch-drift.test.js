"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
const stageIndex=rb.stageNames.indexOf("High Perch Drift");
assert(stageIndex>=0);
assert.equal(stageIndex,rb.stageNames.indexOf("High Perch")+1);
rb.setup({stageIndex,characterKeys:["anchor","anchor"],seed:42});
const initial=debug.advancePlatforms(0),moved=debug.advancePlatforms(1);
assert.equal(initial.length,5);
assert.equal(initial.filter(r=>r.kind==="oneway").length,2);
for(let i=1;i<=2;i++) {assert.notEqual(initial[i].x,moved[i].x);assert.equal(initial[i].y,moved[i].y);}
for(let i=3;i<=4;i++) {assert.equal(initial[i].x,moved[i].x);assert.equal(initial[i].y,moved[i].y);assert.equal(initial[i].kind,"wall");assert.equal(initial[i].h,84);}
const f=debug.fighters[0],wall=initial[3];
Object.assign(f,{x:wall.x+wall.w+f.data.width/2-2,y:wall.y+wall.h/2,prevX:wall.x+wall.w+f.data.width/2+12,
  prevY:wall.y+wall.h/2,vx:-900,vy:0,onGround:false,airDashes:0,hasLiveAim:true,aim:{x:-1,y:0},dashDir:{x:-1,y:0},dashCarryTimer:0.3});
debug.resolveTerrain(0);
assert(f.wallClinging,"corner wall does not support intentional cling");
assert.equal(f.airDashes,f.data.maxAirDashes,"fresh corner cling did not refill dashes");
Object.assign(f,{x:wall.x+wall.w+f.data.width/2-2,y:wall.y+wall.h/2,prevX:wall.x+wall.w+f.data.width/2+12,
  prevY:wall.y+wall.h/2,vx:-1000,vy:0,onGround:false,wallSliding:false,wallClinging:false,
  hitstun:0.5,surfaceBounceSource:"punch",surfaceBounceCount:0});
debug.resolveTerrain(0);assert(f.vx>0,"corner wall failed to bounce a launched fighter");
f.y=-500;debug.fighters[1].y=-300;debug.camera.update();assert(debug.camera.state.y<0,"variant lost open-top camera");
rb.setup({stageIndex:rb.stageNames.indexOf("High Perch"),characterKeys:["anchor","anchor"]});
const original=debug.advancePlatforms(0),later=debug.advancePlatforms(1);
assert.equal(original.length,3);assert.equal(original[1].x,later[1].x,"original stage changed");
const peer=createGame();
for(const game of [rb,peer.rb])game.setup({stageIndex,characterKeys:["anchor","anchor"],seed:42});
for(let i=0;i<120;i++) {
  const inputs=[{hasAim:true,aimX:1,aimY:-0.5,dashHeld:i%30<10},{hasAim:true,aimX:-1,aimY:0,punchHeld:i%25<8}];
  assert.equal(rb.step(inputs),peer.rb.step(inputs),"moving stage diverged between peers");
}
console.log("High Perch Drift: moving one-way platforms, solid corner cling/refill walls, open camera and original stage preservation passed.");
