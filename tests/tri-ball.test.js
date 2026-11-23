"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),D=require("../dashball"),O=require("../team-objectives"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
function setup(config={},ai=false){const g=createGame();g.debug.dashball.setup({arena:"tri-ball",...config},{characters:["anchor","lancer","reflektor","orbit","boomerangus"],ai,seed:901});return g;}
function award(g,team,kind){const s=g.debug.dashball.state,w=g.debug.dashball.world(0);s.time+=dt;s.ball.resetFrame=-1;return O.triAward(s,team,kind,s.ball,w,b=>D.triBall.spawn(s,w.stage,w,b));}
function resolve(g){const s=g.debug.dashball.state,w=g.debug.dashball.world(0);O.triResolve(s,dt,()=>D.triBall.spawn(s,w.stage,w),D.finish);}
test("Tri-Ball defaults, all bounded settings, registry IDs and single-ball automatic profile",()=>{
  for(const id of["tri-ball","tri-ball-wrap"]){let c=D.options({arena:id});assert.equal(c.winningScore,33);assert.equal(c.duration,300);assert.equal(c.timedSpawn,90);assert.equal(c.startingBalls,1);assert.equal(c.ruleset,"battle");assert.equal(D.options({arena:id,ruleset:"court"}).ruleset,"court");
    for(const[key,values]of Object.entries(O.TRI_CHOICES))for(const value of values){const next=D.options({...c,[key]:value,...(key==="winningScore"?{winningScoreCustom:true}:{})});assert.equal(next[key],value,key);}
    c=D.options({...c,timedSpawn:0,scoreSpawn:0});assert(c.triSingleBall);near(c.ballRadius,18.4);near(c.ballMass,1.5);near(c.gravity,900);near(c.maxSpeed,2050);assert.equal(c.winningScore,10);
    let multi=D.options({...c,timedSpawn:90});assert(!multi.triSingleBall);assert.equal(multi.winningScore,33);near(multi.ballRadius,16);
    c=D.options({...c,winningScore:47,winningScoreCustom:true});assert.equal(D.options({...c,timedSpawn:90}).winningScore,47);
    const a=D.arena(id,154);assert.equal(a.width,4480);assert.equal(a.height,1800);assert.equal(a.goals.length,6);assert(!a.terrain.some(t=>t.kind==="ceiling"));
    const lift=a.terrain.find(t=>t.triMover);near(lift.y-lift.move.amplitude,154*1.18);near(lift.y+lift.move.amplitude,1160);near(lift.move.speed,Math.PI/7);assert.equal(lift.w,560);
  }
});
test("all pre-Tri-Ball replay stage indices are unchanged",()=>{
  const {execFileSync}=require("node:child_process"),sourceOverrides={};for(const file of["game.js","dashball.js","team-objectives.js","arena-variants.js"])sourceOverrides[file]=execFileSync("git",["show",`c52af42:${file}`],{encoding:"utf8"});
  const old=createGame(process.cwd(),{sourceOverrides}),now=createGame();for(const[name,index]of old.rb.stageNames.map((name,index)=>[name,index]))assert.equal(now.rb.stageNames[index],name);assert(now.rb.stageNames.includes("Ball Hell: Wraparound"));
});
test("5/3/1 scoring, individual safe recycle, no pauses or duplicate awards",()=>{
  for(const[kind,points]of[["basket",5],["soccer",3],["field",1]]){const g=setup({startingBalls:2}),s=g.debug.dashball.state,other=s.extraBalls[0],before=plain(other),fighter=plain({x:g.debug.fighters[0].x,y:g.debug.fighters[0].y});
    assert(award(g,0,kind));assert(!O.triAward(s,0,kind,s.ball,g.debug.dashball.world(0),()=>assert.fail("duplicate recycle")));resolve(g);assert.equal(s.scores[0],points);assert.equal(s.phase,"playing");assert.equal(s.pause,0);assert.deepEqual(plain(other),before);assert.deepEqual(plain({x:g.debug.fighters[0].x,y:g.debug.fighters[0].y}),fighter);assert(s.ball.y<300);
  }
});
test("swept goal crossings score from the field, reject backs, misses and correction-only overlap",()=>{
  for(const kind of["soccer","basket","field"]){const g=setup({scoreSpawn:0,timedSpawn:0}),s=g.debug.dashball.state,a=g.debug.dashball.arena,b=s.ball,goal=a.goals.find(x=>x.kind===kind&&x.team===1);s.time=1;b.resetFrame=-1;
    const from=kind==="basket"?{x:(goal.left+goal.right)/2,y:goal.top-100}:{x:goal.line-200,y:kind==="field"?400:1400};
    const to=kind==="basket"?{x:from.x,y:goal.top+50}:{x:goal.line+100,y:from.y};Object.assign(b,to);assert(D.triBall.crossings(s,a,from,b,g.debug.dashball.world(0)));resolve(g);assert.equal(s.scores[0],{soccer:3,basket:5,field:1}[kind]);
    s.time+=dt;b.resetFrame=-1;Object.assign(b,from);assert(!D.triBall.crossings(s,a,to,b,g.debug.dashball.world(0)));assert(!D.triBall.crossings(s,a,from,b,g.debug.dashball.world(0)));
  }
  const g=setup(),s=g.debug.dashball.state,a=g.debug.dashball.arena,b=s.ball;s.time=1;b.resetFrame=-1;Object.assign(b,{x:a.width-300,y:570});assert(!D.triBall.crossings(s,a,{x:a.width-400,y:570},b,g.debug.dashball.world(0)));
});
test("native high-speed ball physics registers all three openings without resetting fighters",()=>{
  for(const kind of["soccer","basket","field"]){const g=setup({timedSpawn:0,scoreSpawn:0}),s=g.debug.dashball.state,a=g.debug.dashball.arena,b=s.ball,goal=a.goals.find(x=>x.kind===kind&&x.team===1);
    s.time=1;b.resetFrame=-1;Object.assign(b,kind==="basket"?{x:(goal.left+goal.right)/2,y:goal.top-5,vx:0,vy:1500}:{x:goal.line-5,y:kind==="field"?400:1400,vx:1500,vy:0});g.debug.dashball.ballStep();assert.equal(s.scores[0],{soccer:3,basket:5,field:1}[kind]);assert.equal(s.phase,"playing");
  }
});
test("combined-score thresholds, independent timed spawns, cap suppression is never queued",()=>{
  const g=setup({timedSpawn:90,maxBalls:5}),s=g.debug.dashball.state;s.scores=[2,0];award(g,1,"basket");s.time=90;resolve(g);assert.equal(D.balls(s).length,4);assert.equal(s.tri.scoreThreshold,2);assert.equal(s.tri.nextTimed,180);
  award(g,0,"basket");resolve(g);assert.equal(D.balls(s).length,5);assert.equal(s.tri.suppressed,1);s.extraBalls.pop();resolve(g);assert.equal(D.balls(s).length,4);
  for(const t of[30,60,90,120,150,180]){const q=setup({timedSpawn:t,scoreSpawn:0}),state=q.debug.dashball.state;state.time=t;resolve(q);assert.equal(D.balls(state).length,2);resolve(q);assert.equal(D.balls(state).length,2);}
});
test("simultaneous threshold crossing is batched, exact ties enter overtime, No Limit uses the clock",()=>{
  for(const tie of[false,true]){const g=setup({startingBalls:2}),s=g.debug.dashball.state;s.scores=[32,32];award(g,0,"soccer");award(g,1,tie?"soccer":"field");resolve(g);assert.equal(s.scores[0],35);assert.equal(s.scores[1],tie?35:33);if(tie){assert(s.overtime);assert.equal(s.phase,"playing");award(g,1,"field");resolve(g);assert.equal(s.winner,1);}else assert.equal(s.winner,0);const score=plain(s.scores);assert(!award(g,0,"basket"));assert.deepEqual(plain(s.scores),score);}
  const g=setup({winningScore:0,winningScoreCustom:true}),s=g.debug.dashball.state;s.scores=[100,99];resolve(g);assert.equal(s.phase,"playing");s.remaining=.001;D.clock(s,dt,g.debug.dashball.arena);assert.equal(s.winner,0);
});
test("one-way floor supports standing, pass-through jumping and drop-through; wrapping preserves resources",()=>{
  const g=setup({arena:"tri-ball-wrap",ruleset:"battle"}),d=g.debug,a=d.dashball.arena,f=d.fighters[0];assert.equal(a.terrain[0].kind,"oneway");assert.equal(a.terrain[0].w,a.width);
  Object.assign(f,{x:900,y:a.floorY-f.data.height/2,prevX:900,prevY:a.floorY-f.data.height/2,vx:0,vy:0,onGround:true});for(let n=0;n<30;n++)d.dashball.step();assert(f.onGround);near(f.y,a.floorY-f.data.height/2,.1);
  Object.assign(f,{y:a.floorY+80,prevY:a.floorY+100,vy:-800,onGround:false});d.resolveTerrain(0);assert(f.y>a.floorY);
  Object.assign(f,{y:a.floorY-f.data.height/2,prevY:a.floorY-f.data.height/2,vy:0,onGround:true,platformPassHeld:true});for(let n=0;n<80;n++)d.gravity.physics(0);assert(f.y<a.floorY-f.data.height/2-100||f.y>a.floorY+50);assert(!f.koScored);
  Object.assign(f,{y:a.height+5,prevY:a.height-2,vx:350,vy:800,airDashes:1,hitstun:.5,ammo:1});const before={...f};D.constrain(d.dashball.state,f,a);near(f.y,5);for(const k of["vx","vy","airDashes","hitstun","ammo"])assert.equal(f[k],before[k]);near(f.y-f.prevY,7);
  const b=d.dashball.state.ball;Object.assign(b,{y:-5,prevY:3,vx:100,vy:-1000,spin:2});O.wrapVertical(b,a);near(b.y,a.height-5);near(b.vy,-1000);near(b.spin,2);
  const paths=O.verticalPaths({x:200,y:1790},{x:220,y:1810},a.height);assert.equal(paths.length,2);assert(paths.every(p=>Math.abs(p.y2-p.y1)<=10));
});
test("vertical seam melee and ball contacts resolve once; no phantom seam goal",()=>{
  const g=setup({arena:"tri-ball-wrap",ruleset:"battle"}),d=g.debug,[f,t]=d.fighters,a=d.dashball.arena,s=d.dashball.state;
  Object.assign(f,{x:1000,y:30,onGround:false,invulnerable:0});Object.assign(t,{x:1000,y:a.height-20,onGround:false,invulnerable:0});d.booster.punch(0,0,{x:0,y:-1});f.attack.age=f.attack.startup+.01;const hp=t.health;d.handleHits();assert(t.health<hp);const once=t.health;d.handleHits();assert.equal(t.health,once);
  s.time=1;s.ball.resetFrame=-1;Object.assign(s.ball,{x:a.width-340,y:2,vx:0,vy:500});d.dashball.ballStep();assert.deepEqual(plain(s.scores),[0,0]);
});
test("single-ball mass reduces impulse, gravity is identical and physics is not compounded on reconfiguration",()=>{
  const results=[];for(const single of[false,true]){const g=setup(single?{timedSpawn:0,scoreSpawn:0}:{}),s=g.debug.dashball.state,f=g.debug.fighters[0];Object.assign(s.ball,{x:2000,y:900,vx:0,vy:0,resetFrame:-1});Object.assign(f,{x:1940,y:900,onGround:false});const attack={id:921,charge:0,grounded:false,dir:{x:1,y:0},hitTargets:new Set()};assert(g.debug.dashball.shot(0,attack));results.push(s.ball.vx);const c=D.options(s.config);near(c.ballRadius,s.config.ballRadius);near(c.ballMass,s.config.ballMass);}near(results[1]/results[0],2/3);
});
test("vertical seam shields, carried balls, projectiles and moving platform riders keep native contacts",()=>{
  const g=setup({arena:"tri-ball-wrap",ruleset:"battle"}),d=g.debug,a=d.dashball.arena,s=d.dashball.state;d.dashball.setup({arena:"tri-ball-wrap",ruleset:"battle"},{characters:["spike","gunman"],seed:901});const[f,t]=d.fighters,state=d.dashball.state;
  Object.assign(f,{x:216,y:1790,prevX:216,prevY:1785,onGround:false,invulnerable:0,chargingPunch:true,punchInputHeld:true,punchExhausted:false,punchAim:{x:0,y:1}});Object.assign(state.ball,{carrier:f.id,x:216,y:10,resetFrame:-1});d.dashball.ballStep();assert.deepEqual(plain(state.scores),[0,0]);assert.equal(state.ball.carrier,f.id);
  state.ball.carrier=null;Object.assign(state.ball,{x:2000,y:900});Object.assign(f,{x:1000,y:1790,prevX:1000,prevY:1790,chargingPunch:false,invulnerable:0});Object.assign(t,{x:1000,y:100,prevX:1000,prevY:100,onGround:false,invulnerable:0});d.booster.punch(1,0,{x:0,y:-1});d.updateAttack(1,t.attack.startup+.001);const shot=t.projectiles[0]?.projectile;assert(shot);const hp=f.health;d.updateProjectiles(.08);assert(f.health<hp);assert(f.health>0);
  const m=setup(),md=m.debug,p=md.advancePlatforms(0).find(t=>t.triMover),r=md.fighters[0];Object.assign(r,{x:p.x+p.w/2,y:p.y-r.data.height/2,prevX:p.x+p.w/2,prevY:p.y-r.data.height/2,onGround:true,groundTerrainId:p.id});const y=r.y,next=md.advancePlatforms(.1).find(t=>t.triMover);near(r.y-y,next.y-p.y);assert(next.y<p.y);
});
test("native ten-CPU role selection, moving platform and deterministic snapshot/replay",()=>{
  const route=setup({arena:"tri-ball-wrap",ruleset:"battle"},true),rd=route.debug,rf=rd.fighters[0],ra=rd.dashball.arena;Object.assign(rf,{x:1000,y:ra.floorY-rf.data.height/2,prevX:1000,prevY:ra.floorY-rf.data.height/2,onGround:true,vx:0,vy:0});Object.assign(rd.dashball.state.ball,{x:1000,y:100,vx:0,vy:0,resetFrame:-1});rd.dashball.step();assert.equal(rf.ai.triDropAt,0);assert(rf.platformPassHeld);assert.equal(rf.ai.triDropCooldown,8);
  for(const arena of["tri-ball","tri-ball-wrap"]){const a=setup({arena,teamSize:5,startingBalls:3},true),b=setup({arena,teamSize:5,startingBalls:3},true);for(let n=0;n<120;n++){a.debug.dashball.step();b.debug.dashball.step();}assert.equal(a.rb.hash(),b.rb.hash());assert(new Set(a.debug.fighters.map(f=>f.ai.triBallId).filter(Boolean)).size>=2);assert(a.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));const saved=a.rb.save(),rows=Array.from({length:90},(_,n)=>a.debug.fighters.map((f,i)=>({aimX:Math.cos(n*.1+i),aimY:Math.sin(n*.1+i),dashHeld:n%40<5,punchHeld:n%31<8})));for(const row of rows)a.rb.step(row);const hash=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.deepEqual(plain(b.debug.dashball.state),plain(a.debug.dashball.state));}
});
test("delayed-input rollback and 30/60/120 Hz reproduce Tri-Ball state",()=>{
  for(const arena of["tri-ball","tri-ball-wrap"]){const a=setup({arena}),b=setup({arena}),manager=b.rb.manager(0,8),pending=[];for(let n=0;n<120;n++){const row=[R.encode({hasAim:true,aimX:1,dashHeld:n%40<5}),R.encode({hasAim:true,aimX:-1,punchHeld:n%31<8})];pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());
    const hashes=[];for(const hz of[30,60,120]){const g=setup({arena});for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
  }
});
