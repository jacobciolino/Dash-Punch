"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),D=require("../dashball"),T=require("../target-charge"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(arena="standard",overrides){const g=createGame(process.cwd(),{sourceOverrides:overrides});g.debug.dashball.setup({arena,ruleset:"battle",teamSize:1},{characters:["anchor","spike"],ai:false,seed:214});g.debug.dashball.state.phase="playing";return g;}
function hit(g,speed=1200,normal={x:1,y:0},ball=g.debug.dashball.state.ball){g.debug.ballImpact.emit(ball,speed,normal);return g.debug.ballImpact.pose(ball);}
test("every current ball sport supports the flare except Quidditch/Golden Rush, Total Rush balls and boulders",()=>{
  for(const{ id:arena }of D.ARENAS){const g=setup(arena),s=g.debug.dashball.state;for(const b of D.balls(s)){const p=hit(g,1200,{x:1,y:0},b),excluded=Boolean(s.golden||D.isBoulderBall(s,b));assert.equal(Boolean(p),!excluded,arena);}}
});
test("harder impacts hold longer, squish more, stretch along launch and settle exactly back to round",()=>{
  const rows=[];for(const speed of[150,900,2200,90000]){const g=setup(),d=g.debug,b=d.dashball.state.ball,r=b.r,p=hit(g,speed),e=d.ballImpact.effects[0];assert.equal(p.phase,"hold");assert(p.scaleX<1&&p.scaleY>1);near(p.scaleX*p.scaleY,1);const hold=e.hold,squish=1-p.scaleX;d.presentationEffects.step(hold+d.ballImpact.tuning.launchTime+1/60);const stretched=d.ballImpact.pose(b);assert.equal(stretched.phase,"settle");assert(stretched.scaleX>1&&stretched.scaleY<1);near(stretched.scaleX*stretched.scaleY,1);rows.push({hold,squish,stretch:stretched.scaleX});d.presentationEffects.step(.3);assert.equal(d.ballImpact.pose(b),null);assert.equal(d.ballImpact.effects.length,0);assert.equal(b.r,r);}
  for(let i=1;i<3;i++){assert(rows[i].hold>rows[i-1].hold);assert(rows[i].squish>rows[i-1].squish);assert(rows[i].stretch>rows[i-1].stretch);}assert.deepEqual(rows[3],rows[2]);near(rows[2].hold,3/60);
});
test("real punches, projectiles and Kickoffs trigger the shared visual without extra contacts",()=>{
  for(const type of["punch","projectile","kick"]){const g=setup(),d=g.debug,b=d.dashball.state.ball,a={id:818,charge:.7,dir:{x:.8,y:-.6},grounded:false,hitTargets:new Set(),...(type==="projectile"?{projectile:{damage:6,knockback:900,radius:12}}:{})};assert(d.dashball.shot(0,a,type==="kick"));assert(d.ballImpact.pose(b));const count=d.ballImpact.effects.length;assert(!d.dashball.shot(0,a,type==="kick"));assert.equal(d.ballImpact.effects.length,count);}
});
test("wall rebounds, shield deflections, targets and ball-ball impacts report real contact, not resting corrections",()=>{
  const g=setup("dash-pong"),d=g.debug,b=d.dashball.state.ball,s=d.dashball.arena;d.fighters.forEach(f=>f.x=-2000);Object.assign(b,{x:s.width-24-b.r-1,y:200,vx:1100,vy:0,pongSpeed:1100,pongHits:1});d.dashball.ballStep();assert(d.ballImpact.pose(b));assert(b.vx<0);
  const shield=setup(),w=shield.debug.dashball.world(0),f=shield.debug.fighters[0],ball=shield.debug.dashball.state.ball;Object.assign(f,{x:800,y:600,prevX:800,prevY:600,invulnerable:0,chargingPunch:true,punchInputHeld:true,punchAim:{x:1,y:0},punchHoldTimer:.3,punchPending:true});Object.assign(ball,{x:f.x+45,y:f.y,vx:-800,vy:0});shield.debug.dashball.ballStep();assert(shield.debug.ballImpact.pose(ball));
  const c=setup("target-charge-stationary"),target=c.debug.dashball.state.targetCharge.target,cb=c.debug.dashball.state.ball,r=target.r+cb.r;Object.assign(cb,{x:target.x-r+.5,y:target.y,vx:1000,vy:0});T.collide(c.debug.dashball.state,cb,{x:target.x-r-2,y:target.y},{x:target.x,y:target.y},c.debug.dashball.world(0));assert(c.debug.ballImpact.pose(cb));assert(cb.vx<0);
  const pair=setup("target-charge-stationary"),[a,z]=D.balls(pair.debug.dashball.state),notify=pair.debug.dashball.world(0).onBallImpact;Object.assign(a,{x:1000,y:500,vx:700,vy:0});Object.assign(z,{x:1040,y:500,vx:-700,vy:0});T.collideBalls(a,z,.73,notify);assert(pair.debug.ballImpact.pose(a)&&pair.debug.ballImpact.pose(z));pair.debug.presentationEffects.step(.4);Object.assign(a,{vx:0,vy:0});Object.assign(z,{x:a.x+40,vx:0,vy:0});T.collideBalls(a,z,.73,notify);assert.equal(pair.debug.ballImpact.effects.length,0);
});
test("persistent contacts deduplicate, genuine subsequent impacts restart, and reset/possession cannot leave stale squish",()=>{
  const g=setup(),d=g.debug,b=d.dashball.state.ball;hit(g,1600);const e=d.ballImpact.effects[0];for(let n=0;n<30;n++)hit(g,200);assert.equal(d.ballImpact.effects.length,1);assert.equal(d.ballImpact.effects[0],e);d.dashball.state.time+=1/60;hit(g,200);assert.notEqual(d.ballImpact.effects[0],e);assert.equal(d.ballImpact.effects.length,1);b.carrier=d.fighters[0].id;assert.equal(d.ballImpact.pose(b),null);b.carrier=null;b.resetFrame=99;assert.equal(d.ballImpact.pose(b),null);delete b.resetFrame;d.dashball.state.goalSerial++;assert.equal(d.ballImpact.pose(b),null);d.dashball.setup({arena:"standard"});assert.equal(d.ballImpact.effects.length,0);
});
test("visual hold stays near the true ball, chooses the short seam, and never changes physical size or velocity",()=>{
  const g=setup("tri-ball-wrap"),d=g.debug,b=d.dashball.state.ball,s=d.dashball.arena;Object.assign(b,{x:3,y:400,vx:-1800,vy:0});hit(g,1800);b.x=s.width-4;const before=JSON.stringify(b),p=d.ballImpact.pose(b);assert(Math.abs(p.x-b.x)<=b.r*.65+1);assert.equal(JSON.stringify(b),before);Object.assign(b,{x:200,y:300});const far=d.ballImpact.pose(b);assert(Math.hypot(far.x-b.x,far.y-b.y)<=b.r*.65+1);
});
test("drawing, effect expiry and snapshots keep the authoritative state hash unchanged",()=>{
  const g=setup("dash-pong"),d=g.debug,b=d.dashball.state.ball,hash=g.rb.hash();hit(g);const saved=g.rb.save(),pose=plain(d.ballImpact.pose(b));for(let n=0;n<20;n++)d.ballImpact.draw(b);assert.equal(g.rb.hash(),hash);assert.equal(JSON.stringify(g.rb.save().core).includes("ballImpact"),false);d.presentationEffects.step(.04);g.rb.restore(saved);assert.equal(g.rb.hash(),hash);assert.deepEqual(plain(d.ballImpact.pose(d.dashball.state.ball)),pose);
});
test("wrapped visual copies squash around their own centers without changing seam spacing",()=>{
  for(const[arena,axis]of[["standard-open","x"],["tri-ball-wrap","y"]]){const g=setup(arena),d=g.debug,b=d.dashball.state.ball,s=d.dashball.arena,paint=g.elements.get("game").getContext("2d"),centers=[];hit(g,2200);paint.translate=(x,y)=>centers.push([x,y]);d.ballImpact.draw(b);const starts=centers.filter((_,n)=>n%2===0);assert.equal(starts.length,3);for(let n=1;n<3;n++)near(starts[n][axis==="x"?0:1]-starts[n-1][axis==="x"?0:1],axis==="x"?s.width:s.height);}
});
function contactFixture(g){const d=g.debug;d.matchFlow.begin({countdown:false});d.fighters.forEach((f,i)=>Object.assign(f,{x:700+i*500,y:500,prevX:700+i*500,prevY:500,onGround:false,invulnerable:0,vx:0,vy:0}));const b=d.dashball.state.ball;Object.assign(b,{x:780,y:500,vx:0,vy:0});d.booster.punch(0,.8);const a=d.fighters[0].attack;a.age=a.startup-.001;}
test("replay and delayed-input rollback restore impact presentation without duplicating ball contacts",()=>{
  for(const arena of["standard","dash-pong","target-charge-stationary"]){const a=setup(arena),b=setup(arena);for(const g of[a,b])contactFixture(g);const start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
    for(let n=0;n<100;n++){const row=[R.neutral(),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(n*.13),dashHeld:n%29<3})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(rows[n]);assert.equal(new Set(b.debug.ballImpact.effects.map(e=>e.ballImpact)).size,b.debug.ballImpact.effects.length);}
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());const hash=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
  }
});
test("30/60/120 Hz keep identical collisions and gameplay after visual impacts",()=>{
  for(const arena of["standard","volleyball","dash-pong"]){const hashes=[];for(const hz of[30,60,120]){const g=setup(arena);contactFixture(g);for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1,arena);}
});
test("every existing sport matches the actual pre-change simulation, including excluded modes",()=>{
  const sourceOverrides=Object.fromEntries(["game.js","dashball.js","target-charge.js"].map(file=>[file,execFileSync("git",["show",`81fdacf:${file}`],{encoding:"utf8",maxBuffer:8*1024*1024})]));
  for(const{id:arena}of D.ARENAS){const a=setup(arena,sourceOverrides),b=setup(arena);for(let n=0;n<45;n++){const row=[{hasAim:true,aimX:1,aimY:-.3,dashHeld:n%27<3,punchHeld:n%19<4},{}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}}
});
