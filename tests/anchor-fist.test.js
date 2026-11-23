"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {createGame}=require("./simulation-harness");
const {debug,rb,sandbox,elements}=createGame();
assert.equal(rb.characterKeys[0],"anchor");
rb.setup({characterKeys:["anchor","orbit"],seed:42});
const f=debug.fighters[0],set=sandbox.window.DASH_PUNCH_ART.spriteSets[f.data.spriteSet];
assert.equal(f.data.width,48);assert.equal(f.data.height,78);
assert.equal(f.data.punchDamage,18);assert.equal(f.data.punchStartup,.075);
assert.equal(f.data.punchActive,.13);assert.equal(f.data.punchRecovery,.22);
assert(!f.data.projectilePunch);assert(!f.data.punchFollowThrough);
assert(fs.existsSync(set.magicFist));
for(const onGround of [true,false])for(const charge of [0,1])for(const y of [-1,0,1]) {
  Object.assign(f,{onGround,attack:{age:.1,startup:.075,active:.13,total:.425,charge,dir:{x:1,y},hitTargets:new Set()}});
  const animation=debug.getAssetAnimation(0);
  assert(set.clips[animation.clip].src.includes('_Cast_'));
  const before=rb.hash();debug.gravity.draw(0);assert.equal(rb.hash(),before);
}
assert(!elements.get('menuLayer').innerHTML.includes('Anchor*'));
console.log('Anchor core/fist: front-of-roster membership, preserved dimensions and attack data, slash-free casting, spell asset and render-only state passed.');
