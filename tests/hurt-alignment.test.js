"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug:d,rb,sandbox}=createGame(),sets=sandbox.window.DASH_PUNCH_ART.spriteSets;
const characters=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite"];
let samples=0;
for(const key of characters)for(const clipName of ["hurt","knockback"]) {
  rb.setup({characterKeys:[key,"anchor"],seed:42});const f=d.fighters[0],clip=sets.seekerpro.clips[clipName];
  Object.assign(f,{hitstun:2,vx:clipName==="knockback"?500:0,onGround:false});d.gravity.draw(0);
  for(let frame=0;frame<9;frame++) {
    const animation=d.getAssetAnimation(0),anchor=d.getAssetFrameAnchor(0);
    assert.equal(animation.clip,clipName);assert.equal(animation.frame,frame);
    assert.equal(anchor.pivotX,clip.frameAnchors[frame][0]);assert.equal(anchor.foot,clip.frameAnchors[frame][1]+12);
    const hash=rb.hash();d.gravity.draw(0);assert.equal(rb.hash(),hash);
    d.advancePlatforms((clip.durations[frame]+.01)/1000);samples++;
  }
  f.hitstun=0;f.vx=0;f.onGround=true;
  assert.equal(d.getAssetAnimation(0).clip,"idle");assert.equal(d.getAssetFrameAnchor(0).pivotX,15);
}
rb.setup({characterKeys:["orbit","anchor"]});const f=d.fighters[0];
Object.assign(f,{onGround:true,attack:{age:.1,startup:.075,active:.13,recovery:.2,total:.405,charge:0,dir:{x:1,y:0}}});
assert.equal(d.getAssetAnimation(0).clip,"attack1");assert.equal(d.getAssetFrameAnchor(0).pivotX,16);assert.equal(d.getAssetFrameAnchor(0).foot,38);
assert.equal(sets.seeker.clips.hurt.frameAnchors.length,9);assert.equal(sets.seekerpro.clips.knockback.frames,9);
assert.deepEqual(Array.from(sets.seekerpro.clips.knockback.durations),[40,60,50,50,50,60,60,80,100]);
console.log(`Hurt alignment: ${samples} core poses anchored, recovery/attack pivots preserved, authored timing and pure rendering passed.`);
