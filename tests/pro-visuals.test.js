"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {createGame}=require("./simulation-harness");
const {debug,rb,sandbox}=createGame();
const art=sandbox.window.DASH_PUNCH_ART;
const states=["idle","walk","mutualDashRebound","dashReboundSuccess","dashReboundMiss","crouch","tippyToes","dash","dashFromShield","dashCharge","punch","shieldReleaseWhiff","shieldParrySuccess","punchCharge","shield","shieldReactivation","spotDodge","spotDodgeSuccess","spotDodgeMiss","juked","hitstun","stun","shieldParried","shieldBreak","knockdown","knockdownTech","parrySuccess","parryMiss","dashEscapeSuccess","dashEscapeMiss","comboEscape","floorTech","floorTechRoll","wallTech","ceilingTech","floorTechMiss","wallCling","vulnerable","koLaunch"];
const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus"];
for(const key of core) {
  rb.setup({characterKeys:[key,"orbit"],seed:42});
  const fighter=debug.fighters[0];
  for(const state of states) {
    fighter.animationState=state;
    const pose=debug.presentationEffects.pose(0);
    assert.equal(pose.scaleX,1,`${key}/${state} horizontal distortion`);
    assert.equal(pose.scaleY,1,`${key}/${state} vertical distortion`);
    assert.equal(pose.rotation,0,`${key}/${state} artificial tilt`);
    const hash=rb.hash();debug.presentationEffects.state(0);assert.equal(rb.hash(),hash);
  }
  if(key!=="chungus")assert(art.spriteSets[fighter.data.spriteSet].clips.knockback.src.includes("HurtKnockback"));
}
for(const effect of Object.values(art.effects)) {
  const png=fs.readFileSync(effect.src);
  assert.equal(png.readUInt32BE(16),effect.width*effect.frames);
  assert.equal(png.readUInt32BE(20),effect.height);
  assert(effect.src.includes("Seeker_PRO/VFX/"));
}
rb.setup({characterKeys:["orbit","spike"]});
const f=debug.fighters[0];Object.assign(f,{hitstun:1,vx:500});
assert.equal(debug.getAssetAnimation(0).clip,"knockback");
Object.assign(f,{hitstun:0,vx:0,wallClinging:false,wallSliding:true});
assert.equal(debug.getAssetAnimation(0).clip,"cling");
console.log("PRO visuals: twelve core fighters, 39 undistorted states, authentic VFX dimensions, knockback/wall animations and pure rendering passed.");
