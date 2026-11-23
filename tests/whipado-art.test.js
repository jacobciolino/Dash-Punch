"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb}=createGame();
rb.setup({characterKeys:["whipado","anchor"],seed:42});
const f=debug.fighters[0];
assert.equal(f.data.pixelModel,null);
assert.equal(f.data.spriteSet,"seekerprowhip");
assert.equal(f.data.maxAirDashes,8);
assert.equal(f.data.punchActive,2.2);
for(const [axis,sign] of [["y",1],["y",-1],["x",1],["x",-1]]) {
  debug.gravity.setDirection(axis,sign);
  for(const dir of [{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:1},{x:0.6,y:-0.8}]) {
    const coil=debug.getHairSnakePose(0,dir,0,0);
    const strike=debug.getHairSnakePose(0,dir,1,1);
    const dx=strike.end.x-f.x,dy=strike.end.y-f.y;
    assert(Math.abs(dx*dir.y-dy*dir.x)<1e-8,"snake strike must follow aim");
    assert(Math.hypot(dx,dy)>Math.hypot(coil.end.x-f.x,coil.end.y-f.y));
    for(const pose of [coil,strike])for(const point of [pose.root,pose.end])assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
    f.chargingPunch=true;f.punchPending=true;f.punchCharge=f.data.punchChargeTime;f.punchAim=dir;
    debug.gravity.draw(0);
    f.chargingPunch=false;f.punchPending=false;f.punchCharge=0;f.punchAim={x:1,y:0};
    const stable=rb.hash();debug.getHairSnakePose(0,dir,1,1);debug.gravity.draw(0);
    assert.equal(rb.hash(),stable,"art must not change simulation");
  }
}
console.log("Whipado art: distinct model, 360-degree snake aim, four gravities and render-only state passed.");
