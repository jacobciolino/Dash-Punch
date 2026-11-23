"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),vm=require("node:vm"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),prior=path.resolve("exports/Dash-Punch-Title-Fist-2026-11-15"),plain=x=>JSON.parse(JSON.stringify(x));let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function audio(g){const contexts=[];class Param{constructor(){this.events=[];}setValueAtTime(value,time){this.events.push({value,time});}exponentialRampToValueAtTime(value,time){this.events.push({value,time});}}
  class Context{constructor(){this.state="running";this.currentTime=1;this.sampleRate=8000;this.destination={};this.tones=[];this.noises=[];this.gains=[];contexts.push(this);}createOscillator(){const n={frequency:new Param(),connect(){},start(){},stop(){}};this.tones.push(n);return n;}createGain(){const n={gain:new Param(),connect(){}};this.gains.push(n);return n;}createBuffer(channels,size){assert(size>0&&size<8000);return {getChannelData:()=>new Float32Array(size)};}createBufferSource(){const n={connect(){},start(){},stop(){}};this.noises.push(n);return n;}createBiquadFilter(){return {frequency:new Param(),Q:new Param(),connect(){}};}}
  g.sandbox.window.AudioContext=Context;return {get context(){return contexts[0];},get tones(){return contexts.flatMap(c=>c.tones);},get noises(){return contexts.flatMap(c=>c.noises);},clear(){for(const c of contexts){c.tones=[];c.noises=[];c.gains=[];}}};
}
function setup(key="orbit",dir=root){const g=createGame(dir);g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["anchor",key],seed:835});position(g);return g;}
function position(g){g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:430+i*50,y:300,prevX:430+i*50,prevY:300,onGround:false,vx:0,vy:0,invulnerable:0}));}
function guard(f){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0},punchCharge:0,shieldHealth:10000});}
function arm(g,charge=0){g.debug.fighters[0].attack={id:999,age:.1,startup:0,active:.2,recovery:.2,total:.4,dir:{x:1,y:0},charge,hitTargets:new (vm.runInContext("Set",g.sandbox))(),grounded:false};}
function block(g,charge=0){guard(g.debug.fighters[1]);arm(g,charge);g.debug.resolveHit(0,1);}
const pitches=s=>s.tones.map(n=>n.frequency.events[0].value);
function expectShield(s,spike=false){assert.equal(s.tones.length,2,"One two-tone shield cue, no body-hit thud");assert.equal(s.noises.length,1);const [low,high]=pitches(s);assert(low>(spike?330:160)&&low<(spike?390:200));assert(high>(spike?1500:650)&&high<(spike?1850:800));for(const gain of s.context.gains)assert(gain.gain.events.every(e=>e.value>0&&e.value<.12));}
function canonical(g){const state=plain(g.rb.save().core);state.stageIndex=0;for(const f of state.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(state);}
check("ordinary blocks use a clear two-tone shield thump, Spike has a distinct high metallic ring",()=>{
  for(const key of ["orbit","anchor","boomerangus","spike"])for(const charge of [0,.5,1]){const g=setup(key),s=audio(g);block(g,charge);expectShield(s,key==="spike");assert(g.debug.fighters[1].punchBlockstun>0);assert.equal(g.debug.fighters[0].attack,null);}
});
check("holding a shield is silent; uncovered hits retain the normal body impact",()=>{
  const g=setup(),s=audio(g),target=g.debug.fighters[1];guard(target);assert(g.debug.isShielding(1));assert.equal(s.tones.length,0);target.punchAim={x:1,y:0};arm(g);g.debug.resolveHit(0,1);assert(target.hitstun>0);assert.equal(s.tones.length,1);assert(pitches(s)[0]<200);
});
check("blocked Kickoffs use defender-specific audio and preserve Spike thorns",()=>{
  for(const key of ["orbit","spike"]){const g=setup(key),s=audio(g),[a,b]=g.debug.fighters;guard(b);Object.assign(a,{x:448,prevX:418,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:.3,airDashes:2});b.x=470;const hp=a.health;assert(g.debug.tryDashRebound(0,1));expectShield(s,key==="spike");assert.equal(a.health,hp-(key==="spike"?7:0));}
});
check("blocked native bullets and arrows sound once per contact, without overlap replay",()=>{
  for(const weapon of ["gunman","archer"])for(const key of ["orbit","spike"]){const g=setup(key),s=audio(g);g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[weapon,key],seed:835});position(g);const [a,b]=g.debug.fighters;a.x=200;b.x=700;
    Object.assign(a.controls,{hasAim:true,aim:{x:1,y:0}});for(const held of [true,false]){a.controls.actions.punchHeld=held;a.controls.buffers[held?"punchPressed":"punchReleased"]=.09;g.debug.updateHumanInput(0);}const shot=a.attack;g.debug.updateAttack(0,shot.startup+.001);s.clear();guard(b);shot.dir={x:1,y:0};Object.assign(shot.projectile,{x:700,y:300,vx:600,vy:0,speed:600});g.debug.updateProjectiles(0);expectShield(s,key==="spike");const count=s.tones.length;g.debug.updateProjectiles(0);assert.equal(s.tones.length,count);assert(b.punchBlockstun>0);
  }
});
check("sports-ball deflections and Spike catches sound once, possession is silent",()=>{
  for(const key of ["orbit","spike"]){const g=setup(key),s=audio(g);g.debug.dashball.setup({arena:"standard",ruleset:"battle"},{characters:["anchor",key],seed:835});position(g);g.debug.fighters[0].x=200;const f=g.debug.fighters[1];f.x=f.prevX=700;guard(f);Object.assign(g.debug.dashball.state.ball,{x:665,y:300,prevX:665,prevY:300,vx:1400,vy:0,contacts:{},ownerId:"p1",ownerTeam:0,launched:2});g.debug.dashball.ballStep();expectShield(s,key==="spike");assert.equal(g.debug.dashball.state.ball.carrier,key==="spike"?f.id:null);for(let i=0;i<10;i++)g.debug.dashball.ballStep();assert.equal(s.tones.length,2);}
});
check("parries and shield breaks retain their original cues and gameplay",()=>{
  for(const special of ["parry","break"])for(const dir of [prior,root]){const g=setup("spike",dir),s=audio(g),f=g.debug.fighters[1];guard(f);if(special==="parry")Object.assign(f,{shieldReleaseParry:.1,hitstun:.4,comboHits:1,comboGrace:1,lastAttacker:g.debug.fighters[0]});else f.shieldHealth=1;arm(g);g.debug.resolveHit(0,1);const notes=pitches(s);if(special==="parry"){assert(notes.some(n=>n>640&&n<720));assert(!notes.some(n=>n>1500));}else {assert.equal(f.stunType,"shieldBreak");assert(notes.some(n=>n>240&&n<280));assert(notes.some(n=>n>80&&n<100));}}
});
check("shield impact audio deduplicates during replay and stays silent in rollback resimulation",()=>{
  const g=setup("spike"),s=audio(g);guard(g.debug.fighters[1]);arm(g);g.debug.fighters[0].attack.age=.05;const saved=g.rb.save(),row=[R.decode(R.neutral()),{hasAim:true,aimX:-1,aimY:0,punchHeld:true}];g.rb.presentStep(row);const count=s.tones.length;assert(count>=2);g.rb.restore(saved);g.rb.presentStep(row);assert.equal(s.tones.length,count);g.rb.restore(saved);g.rb.step(row);assert.equal(s.tones.length,count);
});
check("blocked combat, sports objects and all fighters retain exact pre-audio gameplay",()=>{
  for(const key of ["orbit","spike"]){const a=setup(key,prior),b=setup(key);block(a,.5);block(b,.5);assert.equal(canonical(a),canonical(b));}
  const a=setup("orbit",prior),b=setup();for(const key of a.rb.characterKeys){for(const g of [a,b])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"spike"],seed:835});for(let i=0;i<90;i++){const row=[{hasAim:true,aimX:1,punchHeld:i%29<15,dashHeld:i%71<30},{hasAim:true,aimX:-1,punchHeld:i%43<30}];a.rb.step(row);b.rb.step(row);assert.equal(canonical(a),canonical(b),`${key}/${i}`);}}
  for(const key of ["orbit","spike"]){for(const g of [a,b]){g.debug.dashball.setup({arena:"standard",ruleset:"battle"},{characters:["anchor",key],seed:835});position(g);g.debug.fighters[0].x=200;const f=g.debug.fighters[1];f.x=f.prevX=700;guard(f);Object.assign(g.debug.dashball.state.ball,{x:665,y:300,prevX:665,prevY:300,vx:1400,vy:0,contacts:{},ownerId:"p1",ownerTeam:0,launched:2});}for(let i=0;i<20;i++){a.debug.dashball.ballStep();b.debug.dashball.ballStep();assert.equal(canonical(a),canonical(b));}}
});
console.log(`${groups} shield audio groups passed`);
