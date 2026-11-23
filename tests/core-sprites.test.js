"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {createGame}=require("./simulation-harness");
const {debug,rb,sandbox}=createGame();
const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus"];
assert.deepEqual(Array.from(rb.characterKeys.slice(0,core.length)),core,"core fighters must appear first");
assert.equal(new Set(rb.characterKeys).size,rb.characterKeys.length,"roster contains duplicates");
for(const key of core) {
  rb.setup({characterKeys:[key,"anchor"],seed:42});
  const f=debug.fighters[0];
  assert(f.data.spriteSet||f.data.pixelModel,`${key} lacks art`);
  assert(key==="chungus"?f.data.spriteSet==="chungusseeker":f.data.spriteSet.startsWith("seekerpro"));
  assert.equal(f.data.pixelModel,null);
  assert.equal(f.data.width,key==="chungus"?118:key==="anchor"?48:46);
  assert.equal(f.data.height,key==="chungus"?154:key==="anchor"?78:66);
  const before=rb.hash();debug.gravity.draw(0);assert.equal(rb.hash(),before);
}
const sets=sandbox.window.DASH_PUNCH_ART.spriteSets;
for(const key of ["seekerpro","seekerprocast"]) {
  const set=sets[key];
  for(const [name,clip] of Object.entries(set.clips)) {
    const png=fs.readFileSync(path.join(process.cwd(),clip.src));
    assert.equal(png.readUInt32BE(16),(clip.width||set.width)*clip.frames,`${key}/${name} sheet width`);
    assert.equal(png.readUInt32BE(20),clip.height||set.height,`${key}/${name} sheet height`);
  }
}
rb.setup({characterKeys:["orbit","anchor"]});
const orbit=debug.fighters[0];
assert.equal(orbit.data.spriteSet,"seekerpro");
Object.assign(orbit,{onGround:false,dashCarryTimer:.3,vx:900,vy:0});
assert.equal(debug.getAssetAnimation(0).clip,"dash");
orbit.dashCarryTimer=0;orbit.vx=0;orbit.wallClinging=true;
assert.equal(debug.getAssetAnimation(0).clip,"cling");
orbit.wallClinging=false;orbit.onGround=true;orbit.crouching=true;
assert.equal(debug.getAssetAnimation(0).clip,"crouch");assert.equal(debug.getAssetAnimation(0).frame,3);
orbit.crouching=false;orbit.onGround=false;
for(const [y,clip] of [[-1,"attackUp"],[1,"attackDown"],[0,"attackAir"]]) {
  orbit.attack={age:.1,startup:.075,active:.2,total:.5,charge:0,dir:{x:0,y}};
  assert.equal(debug.getAssetAnimation(0).clip,clip);
}
rb.setup({characterKeys:["spike","whipado"]});
assert.equal(debug.fighters[0].data.spriteSet,"seekerpro");assert(debug.fighters[0].data.spikeArmor);
assert.equal(debug.fighters[1].data.pixelModel,null);
assert.equal(debug.fighters[1].data.chaseSpriteSet,"seekerprocast");
console.log("Core sprites: twelve Seekers, preserved Anchor/Chungus body sizes, sheet dimensions, animation clips, abilities and render-only state passed.");
