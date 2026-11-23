"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),R=require("../rollback"),O=require("../team-objectives");
const dt=1/60,near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
function setup(key="anchor",arena="standard-wide",source){
  const g=createGame(process.cwd(),source?{sourceOverrides:{"game.js":source}}:{});
  g.debug.dashball.setup({arena,ruleset:"battle",duration:300},{characters:[key,"anchor"],seed:919,ai:false});
  g.debug.matchFlow.begin({countdown:false});g.debug.dashball.state.phase="playing";
  for(const[i,f]of g.debug.fighters.entries())Object.assign(f,{x:i?3600:600,y:g.debug.dashball.arena.floorY-f.data.height/2,onGround:true,vx:0,vy:0,hitstop:0,invulnerable:0});
  return g;
}
function step(g,n=1,input={hasAim:true,aimX:1}){for(let i=0;i<n;i++)g.rb.step([R.decode(R.encode(input)),R.decode(R.neutral())]);}
function run(g){step(g,210);assert(g.debug.groundMovement.running(0));return g.debug.fighters[0];}
test("walking lasts 2.8s, then accelerates for .7s to the capped run speed",()=>{
  const g=setup(),f=g.debug.fighters[0];step(g,167);near(f.groundRun.time,167/60);near(f.vx,132);assert(!g.debug.groundMovement.running(0));
  step(g);near(f.groundRun.time,2.8);near(f.vx,132);assert(g.debug.groundMovement.running(0));assert.equal(f.animationState,"run");assert.equal(g.debug.getAssetAnimation(0).clip,"walk");
  step(g,21);near(f.vx,132*1.325);step(g,21);near(f.groundRun.time,3.5);near(f.vx,132*1.65);step(g,30);near(f.vx,132*1.65);assert(f.vx<g.debug.groundMovement.speed(0).dash);
});
test("all registered fighters retain their walk differences and run below their own ground dash",()=>{
  const g=setup();for(const key of g.rb.characterKeys){const s=setup(key),f=s.debug.fighters[0];Object.assign(f,{hasLiveAim:true,aim:{x:1,y:0}});for(let n=0;n<210;n++)s.debug.groundMovement.walk(0);const speed=s.debug.groundMovement.speed(0);near(f.vx,speed.run);assert(speed.run<speed.dash,key);assert(speed.run>132*(f.data.walkSpeedScale??1),key);}
});
test("release, reversal, crouch, attacks, dash and hitstun reset run preparation",()=>{
  for(const kind of["release","reverse","crouch","attack","dash","stun"]){const g=setup(),f=run(g);
    if(kind==="attack")g.debug.booster.punch(0,0);
    if(kind==="dash")g.debug.gravity.dash(0,{x:1,y:0});
    if(kind==="stun")Object.assign(f,{hitstun:.5,hitstop:.05});
    step(g,1,kind==="release"?{}:kind==="reverse"?{hasAim:true,aimX:-1}:kind==="crouch"?{hasAim:true,aimY:1,downHeld:true}:{hasAim:true,aimX:1});
    assert(!g.debug.groundMovement.running(0),kind);assert((f.groundRun?.time||0)<=dt,kind);
  }
});
test("ordinary and charged super jumps preserve actual running takeoff momentum",()=>{
  for(const superJump of[false,true]){const g=setup(),f=run(g),side=f.vx;Object.assign(f,{tippyToes:superJump,tippyDashQueued:superJump,hasLiveAim:true,aim:{x:0,y:-1}});
    g.debug.gravity.dash(0,{x:0,y:-1},superJump?f.data.dashChargeTime:0);near(f.vx,side);assert(f.vy<0);assert(!f.groundRun);assert(!f.runJumpCarry);
    const before=f.vx;step(g,1,{hasAim:true,aimX:1});assert(!f.groundRun);assert(f.vx<before+40);assert(!f.onGround);
  }
});
test("walking off a ledge retains momentum without accumulating airborne run time",()=>{
  const g=setup(),f=run(g);f.y=500;f.onGround=false;const side=f.vx;step(g,12,{hasAim:true,aimX:1});assert(!f.groundRun);assert(f.vx>side*.6);assert(!f.onGround);
  f.y=g.debug.dashball.arena.floorY-f.data.height/2;f.vy=20;step(g,2);assert((f.groundRun?.time||0)<=dt+1e-8);assert(f.vx<=132);
});
test("crouch instantly brakes walking, running and ground dashes, preserving commitment timers",()=>{
  for(const mode of["walk","run","dash"]){const g=setup(),f=g.debug.fighters[0];if(mode==="run")run(g);else if(mode==="walk")step(g,20);else{g.debug.gravity.dash(0,{x:1,y:0});step(g);}
    const skid=f.groundSkidTimer,parry=f.dashParry,resources=f.airDashes;step(g,1,{hasAim:true,aimY:1,downHeld:true});assert(f.crouching,mode);near(f.vx,0);assert(!f.groundRun);assert.equal(f.airDashes,resources);near(f.groundSkidTimer,Math.max(0,skid-dt));near(f.dashParry,Math.max(0,parry-dt));
  }
});
test("held crouch waits for a committed attack/whiff recovery rather than canceling either",()=>{
  const g=setup(),f=g.debug.fighters[0];step(g,1,{});g.debug.booster.punch(0,1);const attack=f.attack;Object.assign(f,{vx:300,groundSkidTimer:.5});
  step(g,1,{hasAim:true,aimY:1,downHeld:true});assert.equal(f.attack,attack);assert(!f.crouching);assert(attack.age>0);assert(f.vx>0);
  for(let n=0;n<120&&!f.crouching;n++)step(g,1,{hasAim:true,aimY:1,downHeld:true});assert(f.crouching);near(f.vx,0);assert(!f.attack);assert(f.whiffLag<=0);
});
test("crouch braking is gravity-relative and does not erase airborne knockback",()=>{
  const g=setup(),f=g.debug.fighters[0];for(const[axis,sign]of[["x",1],["x",-1],["y",1],["y",-1]]){g.debug.gravity.setDirection(axis,sign);Object.assign(f,{onGround:true,crouching:true,vx:290,vy:-180});g.debug.groundMovement.brake(0);near(axis==="x"?f.vy:f.vx,0);near(axis==="x"?f.vx:f.vy,axis==="x"?290:-180);}
  Object.assign(f,{onGround:false,crouching:true,vx:300,vy:400});g.debug.groundMovement.brake(0);near(f.vx,300);near(f.vy,400);
});
test("gravity changes restart the run timer and grounded vertical inputs never build it",()=>{
  const g=setup(),f=run(g);g.debug.gravity.setDirection("x",1);Object.assign(f,{onGround:true,hasLiveAim:true,aim:{x:0,y:1}});g.debug.groundMovement.walk(0);near(f.groundRun.time,dt);assert.equal(f.groundRun.axis,"x");
  for(const aim of[{x:1,y:0},{x:-1,y:0}]){Object.assign(f,{hasLiveAim:true,aim});g.debug.groundMovement.walk(0);assert(!f.groundRun);}
});
test("Sticky Ball carrier running retains the existing half-speed walk penalty",()=>{
  const g=setup("anchor","sticky-ball"),f=g.debug.fighters[0],s=g.debug.dashball.state;assert(O.attach(s,f,g.debug.dashball.world(0)));step(g,210);near(f.vx,132*1.65*.5);assert.equal(s.ball.carrier,f.id);assert(g.debug.groundMovement.running(0));
});
test("Boomerangus's dash windup and recovery cannot accumulate another run-up",()=>{
  const g=setup("boomerangus"),f=run(g);g.debug.gravity.dash(0,{x:1,y:0});assert(f.heavyDashWindup);assert(!f.groundRun&&!f.runJumpCarry);Object.assign(f,{hasLiveAim:true,aim:{x:1,y:0}});g.debug.groundMovement.walk(0);assert(!f.groundRun);delete f.heavyDashWindup;f.heavyDashRecovery=.2;g.debug.groundMovement.walk(0);assert(!f.groundRun);
});
test("walking and preexisting fighter definitions match the immediate checkpoint before run activation",()=>{
  const source=execFileSync("git",["show","9bf9aa8:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),old=setup("anchor","standard-wide",source),now=setup();
  for(let n=0;n<167;n++){step(old);step(now);for(const key of["x","y","vx","vy","health","airDashes"])near(now.debug.fighters[0][key],old.debug.fighters[0][key]);}
  for(const key of old.rb.characterKeys.filter(key=>now.rb.characterKeys.includes(key))){for(const g of[old,now])g.debug.dashball.setup({arena:"standard-wide"},{characters:[key,"anchor"],ai:false});assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));}
});
test("run state survives snapshot/replay, resets on respawn, and is deterministic with six-frame rollback",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[],rows=[];let saved;
  for(let n=0;n<300;n++){const row=[R.encode({hasAim:true,aimX:1,downHeld:n>=255&&n<260,aimY:n>=255&&n<260?1:0}),R.encode({hasAim:true,aimX:-1,dashHeld:n>=230&&n<235})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);if(n===200){saved=a.rb.save();assert(a.debug.fighters[0].groundRun.time>3);}}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());const end=a.rb.hash();a.rb.restore(saved);for(const row of rows.slice(201))a.rb.step(row);assert.equal(a.rb.hash(),end);a.debug.fighters[0].reset(true);assert(!a.debug.fighters[0].groundRun&&!a.debug.fighters[0].runJumpCarry);
});
test("30/60/120 Hz rendering uses identical fixed-step running state",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.listeners.get("keydown")({code:"KeyD",repeat:false,preventDefault(){}});for(let n=1;n<=hz*4;n++)g.render(1000+n*1000/hz+.001);assert(g.debug.fighters[0].groundRun?.time>=3.5);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
