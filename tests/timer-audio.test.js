"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),vm=require("node:vm"),R=require("../rollback"),D=require("../dashball"),{createGame}=require("./simulation-harness");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),prior=path.resolve("exports/Dash-Punch-Wooden-Basketball-2026-11-15"),neutral=()=>R.decode(R.neutral()),plain=x=>JSON.parse(JSON.stringify(x));let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function audio(g){const contexts=[];class Param{constructor(){this.events=[];}setValueAtTime(value,time){this.events.push({value,time});}exponentialRampToValueAtTime(value,time){this.events.push({value,time});}}
  class Context{constructor(){this.state="running";this.currentTime=1;this.sampleRate=8000;this.destination={};this.tones=[];this.gains=[];contexts.push(this);}createOscillator(){const n={frequency:new Param(),connect(){},start(time){this.startAt=time;},stop(time){this.stopAt=time;}};this.tones.push(n);return n;}createGain(){const n={gain:new Param(),connect(){}};this.gains.push(n);return n;}createBuffer(channels,size){assert(size>0&&size<8000);return {getChannelData:()=>new Float32Array(size)};}createBufferSource(){return {connect(){},start(){},stop(){}};}createBiquadFilter(){return {frequency:new Param(),Q:new Param(),connect(){}};}}
  g.sandbox.window.AudioContext=Context;return {get tones(){return contexts.flatMap(c=>c.tones);},get pitches(){return this.tones.map(n=>n.frequency.events[0].value);},get contexts(){return contexts;}};
}
function setup(seconds=12,dir=root,countdown=false){const g=createGame(dir);g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["orbit","spike"],seed:140});g.debug.matchFlow.begin({seconds,countdown});g.sound=audio(g);return g;}
function step(g,count=1,present=true,row=[neutral(),neutral()]){for(let i=0;i<count;i++)g.rb[present?"presentStep":"step"](row);}
const pitch=(s,n)=>s.tones.filter(t=>Math.abs(t.frequency.events[0].value-n)<n*.06&&(n!==660||Math.abs(t.stopAt-t.startAt-.075)<.001)).length;
function canonical(g){const state=plain(g.rb.save().core);state.stageIndex=0;for(const f of state.fighters)for(const key of["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(state);}
check("ten exact one-second cues, urgent final three, and one two-tone zero buzzer",()=>{
  const g=setup(),events=[];for(let i=0;i<720;i++){const before=g.sound.tones.length;step(g);if(g.sound.tones.length>before)events.push({ticks:g.debug.matchFlow.state.remainingTicks,notes:g.sound.pitches.slice(before)});}
  assert.deepEqual(events.map(e=>e.ticks),[600,540,480,420,360,300,240,180,120,60,0]);assert.equal(pitch(g.sound,660),7);assert.equal(pitch(g.sound,880),3);assert.equal(pitch(g.sound,110),1);assert.equal(pitch(g.sound,148),1);assert.equal(g.sound.tones.length,12);assert(g.debug.matchFlow.state.overtime);const n=g.sound.tones.length;step(g,120);assert.equal(g.sound.tones.length,n);
});
check("opening countdown is silent and short clocks begin at their displayed second",()=>{
  const g=setup(10,root,true);step(g,179);assert.equal(g.sound.tones.length,0);step(g);assert.equal(g.sound.tones.length,1);assert.equal(g.debug.matchFlow.state.remainingTicks,599);assert.equal(pitch(g.sound,660),1);
  const h=setup(2);step(h);assert.equal(pitch(h.sound,880),1);step(h,59);assert.equal(pitch(h.sound,880),2);
});
check("unlimited play, early KOs, round transitions and all-KO resets do not falsely buzz",()=>{
  const g=setup(0);step(g,120);assert.equal(g.sound.tones.length,0);
  const h=setup();h.debug.matchFlow.state.remainingTicks=300;h.debug.matchFlow.knockout(1);const koSounds=h.sound.tones.length;step(h);assert.equal(h.debug.matchFlow.state.phase,"roundEnd");step(h,299);assert.equal(h.sound.tones.length,koSounds);
  const k=setup();k.debug.matchFlow.knockout(0);k.debug.matchFlow.knockout(1);const simultaneousKoSounds=k.sound.tones.length;step(k);assert.equal(k.debug.matchFlow.state.phase,"countdown");assert.equal(k.sound.tones.length,simultaneousKoSounds);
});
check("sports goal resets pause the clock without repeating an already heard second",()=>{
  const g=setup(),d=g.debug;d.dashball.setup({arena:"standard",ruleset:"battle"});d.matchFlow.begin({seconds:12,countdown:false});step(g,1,false);d.matchFlow.state.remainingTicks=601;step(g);assert.equal(pitch(g.sound,660),1);const ticks=d.matchFlow.state.remainingTicks,n=g.sound.tones.length;
  Object.assign(d.dashball.state,{phase:"goal",pause:.8});step(g,150);assert.equal(d.matchFlow.state.remainingTicks,ticks);assert.equal(g.sound.tones.length,n);step(g,90);assert(d.matchFlow.state.remainingTicks<ticks);assert.equal(pitch(g.sound,660),2);
});
check("all current Dashball and Sandbag rounds use the same timeout buzzer",()=>{
  const g=setup(),d=g.debug;for(const [type,id]of [...D.ARENAS.map(a=>["dashball",a.id]),...["race","brawl","scramble"].map(id=>["sandbag",id])]){
    d[type].setup(type==="dashball"?{arena:id}:{ruleset:id});d.matchFlow.begin({seconds:12,countdown:false});step(g,1,false);d.matchFlow.state.remainingTicks=1;const before=pitch(g.sound,110);step(g);assert.equal(pitch(g.sound,110),before+1,`${type}/${id}`);step(g,4);assert.equal(pitch(g.sound,110),before+1);
  }
});
check("new rounds and rematches allow their cues again without adding snapshot fields",()=>{
  const g=setup(1);step(g,60);assert.equal(pitch(g.sound,880),1);assert.equal(pitch(g.sound,110),1);g.sandbox.DashMatchFlow.award(g.debug.matchFlow.state,0,"TEST");step(g,300);assert.equal(g.debug.matchFlow.state.round,2);assert.equal(pitch(g.sound,880),2);step(g,59);assert.equal(pitch(g.sound,110),2);
  g.debug.matchFlow.begin({seconds:1,countdown:false});step(g);assert.equal(pitch(g.sound,880),3);const saved=JSON.stringify(g.rb.save().core);assert(!saved.includes("timerSession")&&!saved.includes("timerTick")&&!saved.includes("timerBuzzer"));
});
check("clock identity survives rollback even when combat audio changes order",()=>{
  const g=setup(),d=g.debug;step(g,1,false);d.matchFlow.state.remainingTicks=601;const saved=g.rb.save();step(g);assert.equal(pitch(g.sound,660),1);g.rb.restore(saved);const [a,b]=d.fighters;Object.assign(a,{x:430,y:300,prevX:430,prevY:300,onGround:false,vx:0,vy:0});Object.assign(b,{x:480,y:300,prevX:480,prevY:300,onGround:false,vx:0,vy:0,chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0},shieldHealth:10000});a.attack={id:999,age:.05,startup:0,active:.2,recovery:.2,total:.4,dir:{x:1,y:0},charge:0,hitTargets:new(vm.runInContext("Set",g.sandbox))(),grounded:false};
  step(g,1,true,[neutral(),{...neutral(),hasAim:true,aimX:-1,punchHeld:true}]);assert.equal(pitch(g.sound,660),1);assert(pitch(g.sound,1680)>0);const count=g.sound.tones.length;g.rb.restore(saved);step(g,1,false);assert.equal(g.sound.tones.length,count);
});
check("30/60/120Hz, pause, muted simulation and previous-build gameplay stay consistent",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.state.remainingTicks=121;for(let i=1;i<=hz*3;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());assert.equal(pitch(g.sound,880),2);assert.equal(pitch(g.sound,110),1);const ticks=g.debug.matchFlow.state.remainingTicks;g.listeners.get("keydown")({code:"Escape",preventDefault(){}});const count=g.sound.tones.length;for(let i=1;i<=hz;i++)g.render(4000+i*1000/hz+.001);assert.equal(g.debug.matchFlow.state.remainingTicks,ticks);assert.equal(g.sound.tones.length,count);}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[1],hashes[2]);
  const a=setup(2,prior),b=setup(2);for(let i=0;i<150;i++){step(a,1,false);step(b,1,false);assert.equal(canonical(a),canonical(b));}assert.equal(b.sound.tones.length,0);
  for(const id of D.ARENAS.map(a=>a.id)){for(const g of[a,b]){g.debug.dashball.setup({arena:id});g.debug.matchFlow.begin({seconds:2,countdown:false});}for(let i=0;i<30;i++){step(a,1,false);step(b,1,false);assert.equal(canonical(a),canonical(b),id);}}
});
console.log(`${groups} timer audio groups passed`);
