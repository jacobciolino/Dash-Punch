"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const {debug,rb,sandbox}=createGame();
for(const key of ["whipado","archer"]) {
  rb.setup({characterKeys:[key,"anchor"],seed:42});
  const fighter=debug.fighters[0],set=sandbox.window.DASH_PUNCH_ART.spriteSets[fighter.data.spriteSet];
  for(const onGround of [true,false])for(const charge of [0,1])for(const y of [-1,0,1]) {
    Object.assign(fighter,{onGround,crouching:false,attack:{age:.12,startup:.07,active:2.2,total:2.5,charge,dir:{x:1,y}}});
    const animation=debug.getAssetAnimation(0),src=set.clips[animation.clip].src;
    assert(src.includes(key==="whipado"?"_Cast_":"_Bow_"),`${key}: selected slash sheet ${src}`);
    assert(!src.includes("Attack"));
    const before=rb.hash();debug.gravity.draw(0);assert.equal(rb.hash(),before);
  }
  if(key==="whipado") {
    assert(set.magicWhip);assert.equal(fighter.data.punchActive,2.2);assert.equal(fighter.data.punchFollowThrough,.92);
  } else {
    fighter.attack=null;fighter.punchVisual=null;fighter.onGround=true;
    fighter.chargingPunch=true;fighter.punchCharge=fighter.data.punchChargeTime;
    assert.equal(debug.getAssetAnimation(0).frame,8,"full draw must hold bow frame 8");
    fighter.chargingPunch=false;fighter.gunRecoil=.12;
    assert.equal(debug.getAssetAnimation(0).frame,9,"release must start at authored arrow-release pose");
    fighter.gunRecoil=.001;assert.equal(debug.getAssetAnimation(0).frame,21);
    assert(fighter.data.arrowPunch);
  }
}
console.log("Whip/Bow art: slash-free clips at every aim/charge/air state, magical whip, authored bow draw/release and unchanged simulation passed.");
