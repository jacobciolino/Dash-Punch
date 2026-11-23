"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {createGame}=require("./simulation-harness");
const {create}=require("../stage-renderer");
const R=require("../rollback");
const enhanced=createGame(),classic=createGame();
const art=enhanced.sandbox.window.DASH_PUNCH_ART;
const stages=["Crosswire","Flip Chamber","Uplift","Perch","High Perch","High Perch Drift","Battlefield","Smash Vile","Corners"];
for(const stage of stages) {
  const theme=art.stageThemes[art.backdrops[stage].hd2d];assert(theme);
  for(const src of theme.layers.flatMap(layer=>layer.sources).concat((theme.objects||[]).map(object=>object.src)))assert(fs.existsSync(src),src);
  for(const game of [enhanced,classic])game.rb.setup({stageIndex:game.rb.stageNames.indexOf(stage),characterKeys:["microusb","spike"],seed:2451});
  enhanced.debug.stagePresentation.setQuality("enhanced");classic.debug.stagePresentation.setQuality("classic");
  for(let frame=0;frame<90;frame++) {
    const inputs=[0,1].map(player=>{const t=frame+player*9;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.2),aimY:Math.sin(t*.2),dashHeld:t%29<10,punchHeld:t%19<6}));});
    assert.equal(enhanced.rb.step(inputs),classic.rb.step(inputs),`${stage} graphics changed gameplay`);
  }
}
const paintCalls=[];
const makeCanvas=()=>{
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage(...args){paintCalls.push(args);}}, {get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});
  return {width:0,height:0,getContext:()=>context};
};
const images=new Map();const getImage=src=>{if(!images.has(src))images.set(src,{src,complete:true,naturalWidth:960,naturalHeight:540});return images.get(src);};
const renderer=create({getImage,makeCanvas}),ctx=makeCanvas().getContext("2d");
const state={profile:art.stageThemes["deep-forest"],quality:"enhanced",view:{x:0,y:0,w:1280,h:720},focus:{x:0,y:0},camera:{x:0,y:0},lights:[]};
assert(renderer.draw(ctx,state));const warm=renderer.stats;
for(let i=0;i<20;i++)renderer.draw(ctx,state);
assert.equal(renderer.stats.builds,warm.builds);assert.equal(renderer.stats.filterPasses,warm.filterPasses);assert.equal(renderer.stats.composites,warm.composites);
state.focus.x=1;renderer.draw(ctx,state);assert.notDeepEqual(renderer.stats.lastOffsets,warm.lastOffsets);
assert.equal(renderer.stats.builds,warm.builds);assert.equal(renderer.stats.filterPasses,warm.filterPasses);
const composites=renderer.stats.composites;renderer.illuminate(ctx,{...state,lights:[{x:100,y:100,radius:200,strength:.2}]});assert.equal(renderer.stats.composites,composites);
assert.equal(renderer.draw(ctx,{...state,quality:"classic"}),false);
for(const profile of Object.values(art.stageThemes))renderer.draw(ctx,{...state,profile});
assert(renderer.stats.entries<=4);assert(renderer.stats.pixels<16_000_000);
assert(create({getImage:()=>null,makeCanvas}).draw(ctx,state)===false,"missing images need a safe legacy fallback");
renderer.clear();assert.equal(renderer.stats.entries,0);
console.log("HD-2D: nine stage profiles, 810 identical simulation frames across quality settings, bounded caches, parallax, one-time blur, illumination and fallback passed.");
