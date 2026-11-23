"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {createGame}=require("./simulation-harness");
const {debug,rb,sandbox}=createGame();
assert.equal(rb.characterKeys[12],"defiplate","DefiPlate must join the core roster after the existing twelve");
rb.setup({characterKeys:["defiplate","orbit"],seed:42});
const f=debug.fighters[0],set=sandbox.window.DASH_PUNCH_ART.spriteSets.defiplate;
assert.equal(f.data.width,86);assert.equal(f.data.height,48);assert.equal(f.data.spriteSet,"defiplate");
assert.equal(f.data.punchStartup,.075);assert.equal(f.data.punchActive,.13);assert.equal(f.data.punchRecovery,.22);assert.equal(f.data.punchWhiffLag,.34);
assert.equal(f.data.punchDamage,20);assert.equal(f.data.punchKnockback,1020);assert.equal(f.data.punchHitstun,.6);
for(const [file,w,h] of [[set.clips.idle.src,29,16],[set.barbell.src,64,8]]) {
  const png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);
}
for(const state of ["idle","dash","punchCharge","shield","hitstun","wallCling","floorTech","tippyToes"]) {
  f.animationState=state;const pose=debug.presentationEffects.pose(0);
  assert.equal(pose.scaleX,1);assert.equal(pose.scaleY,1);assert.equal(pose.rotation,0);
  assert.equal(debug.getBarbellPose(0,{x:1,y:0}),null,"non-attacking plate acquired a barbell");
}
f.attack={dir:{x:1,y:0},charge:0,age:.1,startup:.075,active:.13,recovery:.22,total:.425};
const right=debug.getBarbellPose(0,{x:1,y:0}),left=debug.getBarbellPose(0,{x:-1,y:0});
assert(right&&left);assert.equal(right.reach,left.reach);assert.equal(right.dir.x,1);assert.equal(left.dir.x,-1);
assert(debug.getBarbellPose(0,{x:1,y:0},1).reach>right.reach);
assert(debug.getBarbellPose(0,{x:1,y:0},0,0).reach<right.reach);
f.chargingPunch=true;assert(debug.getBarbellPose(0,{x:1,y:0}),"preparing a follow-up must not hide an ongoing attack");f.chargingPunch=false;
for(const extra of [{hitstun:1},{juked:1},{koScored:true}]) {
  Object.assign(f,extra);assert.equal(debug.getBarbellPose(0,{x:1,y:0}),null);
  Object.assign(f,{chargingPunch:false,hitstun:0,juked:0,koScored:false});
}
f.attack=null;f.punchVisual={dir:{x:1,y:0},charge:0,age:.05};
assert(debug.getBarbellPose(0,{x:1,y:0}),"clean-hit follow-through lost its visual retraction");
f.chargingPunch=true;assert.equal(debug.getBarbellPose(0,{x:1,y:0}),null,"shield state retained the old attack's barbell");f.chargingPunch=false;
f.punchVisual.age=.16;assert.equal(debug.getBarbellPose(0,{x:1,y:0}),null);
f.punchVisual=null;assert.equal(debug.getBarbellPose(0,{x:1,y:0}),null);
const hash=rb.hash();debug.gravity.draw(0);assert.equal(rb.hash(),hash);
console.log("DefiPlate art: core promotion, preserved body/frame data, native sprites, rigid states, attack-only barbell, directional mirroring and render purity passed.");
