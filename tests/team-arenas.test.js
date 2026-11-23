"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const R=require("../rollback");
const forest="Enchanted Forest",dungeon="Castle Dungeon";
const a=createGame(),b=createGame();
const F=a.debug.arena.setup(forest),D=b.debug.arena.setup(dungeon);
assert.equal(F.width,3456);assert.equal(F.height,1740);assert.equal(F.cameraZoom,1/3);
assert.deepEqual(JSON.parse(JSON.stringify(F.terrain)),JSON.parse(JSON.stringify(D.terrain.slice(0,6))));
assert.equal(F.terrain.filter(t=>t.kind==="platform").length,5);
assert.equal(F.terrain.filter(t=>t.move).length,1);assert(F.wrap);assert.equal(D.wrap,false);
assert.equal(F.terrain.some(t=>t.kind==="wall"),false);assert.equal(D.terrain.filter(t=>t.kind==="wall").length,3);
for(const game of [a,b]) {
  const fighters=game.debug.fighters;
  assert.equal(fighters.length,10);
  for(let i=0;i<10;i++) {
    const f=fighters[i];assert.equal(f.team,i%2);
    assert(f.x-f.data.width/2>256&&f.x+f.data.width/2<F.width-256);
    for(let j=i+1;j<10;j++)assert(Math.abs(f.x-fighters[j].x)>(f.data.width+fighters[j].data.width)/2);
  }
  for(let i=0;i<5;i++)assert.equal(fighters[i*2].x+fighters[i*2+1].x,F.width);
  const camera=game.debug.camera.state;assert.equal(camera.x,0);assert.equal(camera.y,0);assert.equal(camera.zoom,1/3);
  assert(camera.offset.y>=120);assert(camera.offset.y+F.height*camera.zoom<=720);
}
// Carried rider follows the existing deterministic sine mover, including reversal.
a.debug.arena.setup(forest,{ai:false});
let f=a.debug.fighters[0];const platform=F.terrain[5];
Object.assign(f,{x:platform.x+platform.w/2,y:platform.y-f.data.height/2,vx:0,vy:0,onGround:true});
const start=f.x;
for(let frame=0;frame<480;frame++){a.debug.advancePlatforms(1/60);a.debug.gravity.physics(0);}
const current=a.debug.terrainArt.rects[5];
assert(f.onGround,"rider lost platform");assert(Math.abs(f.x-(current.x+platform.w/2))<3,`moving platform failed to carry rider through reversal: rider ${f.x}, platform ${current.x}, y ${f.y}`);assert(f.x>start);
// Full-height wall cling, slide, dash refill and normal launched-wall bounce.
b.debug.arena.setup(dungeon,{ai:false});f=b.debug.fighters[0];
function wallPose(extra={}) {Object.assign(f,{x:256+f.data.width/2-2,y:650,prevX:256+f.data.width/2+20,prevY:650,vx:-1200,vy:0,onGround:false,hitstun:0,wallClinging:false,wallSliding:false,airDashes:0,hasLiveAim:true,aim:{x:-1,y:0},dashDir:{x:-1,y:0},dashCarryTimer:.3,...extra});}
wallPose();b.debug.resolveTerrain(0);assert(f.wallClinging);assert.equal(f.airDashes,f.data.maxAirDashes);
assert(f.wallClingPauseTimer>2.4);f.wallClingPauseTimer=0;f.vy=200;b.debug.resolveTerrain(0);
assert(f.wallSliding&&f.vy<=f.data.wallSlideSpeed,"dungeon wall slide ignored character tuning");
Object.assign(f.controls,{hasAim:true,aim:{x:1,y:-.2}});Object.assign(f.controls.actions,{dashHeld:true,punchHeld:false});f.controls.buffers.dashPressed=.1;b.debug.updateHumanInput(0);
f.controls.actions.dashHeld=false;f.controls.buffers.dashReleased=.1;b.debug.updateHumanInput(0);assert(f.vx>0,"wall launch did not leave toward arena interior");
wallPose({hitstun:.5,surfaceBounceSource:"punch",surfaceBounceCount:0});b.debug.resolveTerrain(0);assert(f.vx>0,"horizontal knockback did not bounce off dungeon wall");
// Ordinary maximum-speed travel cannot cross a wall or the closed ceiling cap.
for(const side of [-1,1]) {
  Object.assign(f,{x:side<0?288:3168,y:450,vx:side*6000,vy:0,hitstun:0,wallClinging:false,onGround:false});
  b.debug.gravity.physics(0);assert(f.x>=256+f.data.width/2&&f.x<=3200-f.data.width/2);
}
Object.assign(f,{x:1700,y:310,vx:0,vy:-2860,hitstun:0,onGround:false,tippyJumpTimer:.4,tippyJumpSpeedCap:3000});
for(let i=0;i<20;i++)b.debug.gravity.physics(0);assert(f.y>=256+f.data.height/2,"super jump escaped above ceiling");
// Forest retains the game's horizontal warp and can return to the same floor.
a.debug.arena.setup(forest,{ai:false});f=a.debug.fighters[0];
Object.assign(f,{x:-60,y:1400,prevX:-60,prevY:1400,vx:0,vy:0,onGround:false});a.debug.gravity.physics(0);
assert(f.x>3300,"open forest lost horizontal wrap");
for(let i=0;i<180;i++)a.debug.gravity.physics(0);assert(f.onGround,"forest edge recovery missed continuous floor");
// Uneven team configurations still keep the largest bodies inside the walls.
b.debug.arena.setup(dungeon,{ai:false,characters:["chungus"],teams:[0,0,0,0,0,0,0,0,0,1]});
for(let i=0;i<9;i++) {
  const fighter=b.debug.fighters[i];assert(fighter.x-fighter.data.width/2>256);
  if(i>0)assert(fighter.x-b.debug.fighters[i-1].x>=fighter.data.width,"crowded team spawns overlap");
}
// Independent ten-input simulations and snapshot replay, on both boundary variants.
for(const stage of [forest,dungeon]) {
  a.debug.arena.setup(stage,{ai:false,seed:514});b.debug.arena.setup(stage,{ai:false,seed:514});
  let saved;const frames=[];
  for(let frame=0;frame<180;frame++) {
    const inputs=Array.from({length:10},(_,i)=>{const t=frame+i*7;return R.decode(R.encode({hasAim:true,aimX:Math.cos(t*.19),aimY:Math.sin(t*.19),dashHeld:t%31<12,punchHeld:t%23<9}));});frames.push(inputs);
    assert.equal(a.rb.step(inputs),b.rb.step(inputs),`${stage}: ten-fighter simulation diverged`);
    if(frame===79)saved=a.rb.save();
  }
  const final=a.rb.hash();a.rb.restore(saved);for(let frame=80;frame<180;frame++)a.rb.step(frames[frame]);assert.equal(a.rb.hash(),final,"ten-fighter replay drifted");
}
console.log("Team arenas: shared five platforms, ten symmetric team spawns, carry/reversal, cling/refill/sling, wall knockback, ceiling containment, forest recovery, fixed camera and ten-input replay passed.");
