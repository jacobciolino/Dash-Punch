"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const DT=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(key="anchor",arena){const g=createGame();if(arena)g.debug.dashball.setup({arena},{characters:[key,"anchor"],ai:false,seed:618});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,"anchor"],seed:618});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:450+i*75,y:-5000,prevX:450+i*75,prevY:-5000,vx:0,vy:0,onGround:false,invulnerable:0,hitstop:0,hitstun:0}));return g;}
function guard(f){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchReleaseQueued:false,punchAim:{x:1,y:0},shieldActiveTime:0});}
function hold(g,pressed=true){const f=g.debug.fighters[0];Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.punchHeld=pressed;f.controls.buffers[pressed?"punchPressed":"punchReleased"]=.09;g.debug.updateHumanInput(0);}
test("every core fighter retains durability on native release and reactivation",()=>{
  const keys=setup().rb.characterKeys.slice(0,18);for(const key of keys){const g=setup(key),f=g.debug.fighters[0];hold(g);for(let n=0;n<12;n++)g.debug.updateHumanInput(0);assert(g.debug.isShielding(0),key);f.shieldHealth=f.data.shieldMax*.4;hold(g,false);near(f.shieldHealth,f.data.shieldMax*.4);Object.assign(f,{attack:null,punchLockout:0,whiffLag:0,punchBlockstun:0,shieldPressureRearm:false,shieldReleaseParry:0});hold(g);for(let n=0;n<12;n++)g.debug.updateHumanInput(0);assert(g.debug.isShielding(0),key);near(f.shieldHealth,f.data.shieldMax*.4);near(f.shieldActiveTime,0);}
});
test("inactive regeneration restores only elapsed recovery, active shields do not regenerate",()=>{
  for(const key of["anchor","spike","booster","boomerangus","gunman"]){const g=setup(key),f=g.debug.fighters[0],max=f.data.shieldMax;f.shieldHealth=max*.4;g.debug.shields.tick(0,.5);near(f.shieldHealth,max*(.4+.5/g.debug.shields.recoverySeconds(0)));const hp=f.shieldHealth;guard(f);g.debug.shields.tick(0,.5);near(f.shieldHealth,hp);f.chargingPunch=false;f.shieldRegenDelay=.1;g.debug.shields.tick(0,.05);near(f.shieldHealth,hp);}
});
test("recovery derives from hold duration, not durability; long shields recover more slowly",()=>{
  const a=setup(),s=setup("spike");near(a.debug.shields.duration(0),4.24);near(s.debug.shields.duration(0),8);near(a.debug.shields.recoverySeconds(0),6.36);near(s.debug.shields.recoverySeconds(0),12);assert(s.debug.shields.recoverySeconds(0)>a.debug.shields.recoverySeconds(0));
  const f=a.debug.fighters[0];f.data={...f.data,shieldDuration:10,shieldMax:36};f.shieldHealth=0;near(a.debug.shields.recoverySeconds(0),15);a.debug.shields.tick(0,1);near(f.shieldHealth,2.4);a.debug.shields.tick(0,14);near(f.shieldHealth,36);
});
test("normal timeout preserves durability and causes no shield-break stun",()=>{
  for(const key of["anchor","spike","gunman","archer","boomerangus","booster","lamer"]){const g=setup(key),f=g.debug.fighters[0];guard(f);f.shieldHealth=f.data.shieldMax*.3;const duration=g.debug.shields.duration(0);g.debug.shields.tick(0,duration-.001);assert(g.debug.isShielding(0),key);g.debug.shields.tick(0,.001);assert(!g.debug.isShielding(0),key);assert(f.punchExhausted);near(f.shieldHealth,f.data.shieldMax*.3);near(f.hitstun,0);assert.notEqual(f.stunType,"shieldBreak");near(f.shieldRegenDelay,0);}
});
test("continuous overhold cannot reactivate, while inactive timeout can recover gradually",()=>{
  const g=setup(),f=g.debug.fighters[0];hold(g);for(let n=0;n<12;n++)g.debug.updateHumanInput(0);f.shieldHealth=f.data.shieldMax*.25;g.debug.shields.tick(0,g.debug.shields.duration(0));const time=f.shieldActiveTime;for(let n=0;n<30;n++){g.debug.updateHumanInput(0);g.debug.shields.tick(0,DT);}assert(!g.debug.isShielding(0));assert(f.punchExhausted);near(f.shieldActiveTime,time);assert(f.shieldHealth>f.data.shieldMax*.25&&f.shieldHealth<f.data.shieldMax*.4);near(f.hitstun,0);
});
test("fresh hold has its normal duration but only the recovered durability",()=>{
  const g=setup(),f=g.debug.fighters[0];guard(f);f.shieldHealth=f.data.shieldMax*.2;g.debug.shields.tick(0,g.debug.shields.duration(0));hold(g,false);f.attack=null;f.whiffLag=f.punchLockout=0;hold(g);for(let n=0;n<12;n++)g.debug.updateHumanInput(0);assert(g.debug.isShielding(0));near(f.shieldActiveTime,0);near(f.shieldHealth,f.data.shieldMax*.2);g.debug.shields.tick(0,1);assert(g.debug.isShielding(0));near(f.shieldHealth,f.data.shieldMax*.2);
});
test("punch and projectile depletion cause genuine shield break with zero durability",()=>{
  for(const projectile of[false,true]){const g=setup(),[f,a]=g.debug.fighters;guard(f);f.shieldHealth=1;g.debug.booster.punch(1,1,{x:-1,y:0});if(projectile)a.attack.projectile={x:a.x,y:a.y,radius:8,damage:18,knockback:930,hitstun:.3};g.debug.resolveHit(1,0);assert.equal(f.stunType,"shieldBreak");assert(f.hitstun>0);near(f.shieldHealth,0);near(f.shieldRegenDelay,2.4);assert(!g.debug.isShielding(0));}
});
test("broken shield recovers from zero after existing lockout, never gets a free full refill",()=>{
  const g=setup("spike"),[f,a]=g.debug.fighters;guard(f);f.shieldHealth=1;g.debug.booster.punch(1,1,{x:-1,y:0});g.debug.resolveHit(1,0);a.attack=null;a.x=1200;for(let n=0;n<120;n++)g.debug.gravity.physics(0);near(f.shieldHealth,0);assert(!g.debug.isShielding(0));for(let n=0;n<36;n++)g.debug.gravity.physics(0);assert(f.shieldHealth>0&&f.shieldHealth<f.data.shieldMax*.05);const hp=f.shieldHealth;guard(f);assert(g.debug.isShielding(0));near(f.shieldHealth,hp);
});
test("dash-from-shield keeps persistent durability and existing reactivation rules",()=>{
  const g=setup(),f=g.debug.fighters[0];guard(f);f.shieldHealth=f.data.shieldMax*.4;f.shieldActiveTime=.7;g.debug.gravity.dash(0,{x:1,y:0});assert(!g.debug.isShielding(0));near(f.shieldHealth,f.data.shieldMax*.4);near(f.shieldActiveTime,.7);assert(f.shieldDashLockout);
});
test("Spike releases a captured soccer ball on normal hold timeout without breaking",()=>{
  const g=setup("spike","standard"),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;Object.assign(f,{x:1000,y:600,prevX:1000,prevY:600});g.debug.fighters[1].x=2100;guard(f);f.shieldHealth=60;Object.assign(b,{carrier:f.id,x:1087,y:600,vx:0,vy:0});g.debug.dashball.ballStep();assert.equal(b.carrier,f.id);g.debug.shields.tick(0,g.debug.shields.duration(0));g.debug.dashball.ballStep();assert.equal(b.carrier,null);near(f.shieldHealth,60);near(f.hitstun,0);
});
test("shield resources restore exactly in rollback snapshots and replay",()=>{
  const a=setup("spike"),b=setup("spike");for(const g of[a,b]){const f=g.debug.fighters[0];guard(f);f.shieldHealth=38;f.shieldActiveTime=3.25;}const state=a.rb.save();b.rb.restore(state);assert.equal(a.rb.hash(),b.rb.hash());near(b.debug.fighters[0].shieldActiveTime,3.25);near(b.debug.fighters[0].shieldHealth,38);
  const rows=Array.from({length:180},(_,n)=>[{hasAim:true,aimX:1,punchHeld:n%70<40},{hasAim:true,aimX:-1,punchHeld:n%31<9}]);for(const row of rows)a.rb.step(row);const hash=a.rb.hash();a.rb.restore(state);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
});
test("delayed inputs reproduce shield activation, durability damage, timeout and regeneration",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[];for(let n=0;n<360;n++){const row=[R.encode({hasAim:true,aimX:1,punchHeld:n%130<90}),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(n*.17)*.2,punchHeld:n%43<10})];pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());assert.deepEqual(plain(a.debug.fighters.map(f=>[f.shieldHealth,f.shieldActiveTime,f.punchExhausted])),plain(b.debug.fighters.map(f=>[f.shieldHealth,f.shieldActiveTime,f.punchExhausted])));
});
test("30/60/120 Hz share the same fixed-step shield timeout and durability",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.matchFlow.step();const f=g.debug.fighters[0];f.shieldHealth=30;g.listeners.get("keydown")({code:"KeyF",repeat:false,preventDefault(){},target:{tagName:"BODY"}});for(let n=1;n<=hz*6;n++)g.render(1000+n*1000/hz+.001);assert(f.punchExhausted);assert(f.shieldHealth>=30);assert.notEqual(f.stunType,"shieldBreak");hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
