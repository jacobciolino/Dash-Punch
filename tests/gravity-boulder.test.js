"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let passed=0;
function check(name,fn){fn();passed++;console.log(`ok ${name}`);}
function fixture(config={}){
  const stage=D.arena("gravity-boulder",154,config),state=D.create({...config,arena:"gravity-boulder"},stage);
  const world={stage,gravity:{x:0,y:1},fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:alpha=>stage.terrain.map(t=>t.gravityPlatform===undefined?t:D.platformTerrain(state,stage,t,alpha))};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.advancePlatforms(state,stage,dt,world.gravity);D.step(state,dt,world);}}};
}
function hitSwitch(g,id=100,index=0,persistent=false){
  const d=g.debug,f=d.fighters[index],c=d.dashball.arena.gravitySwitch;
  Object.assign(f,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,vx:0,vy:0,onGround:false});
  const a={id,dir:{x:1,y:0},charge:0,age:.1,startup:0,active:5,recovery:.2,total:5.2,hitTargets:new (vm.runInContext("Set",g.sandbox))()};
  if(persistent)a.projectile={x:c.x,y:c.y,radius:12,persistent:true,spawned:true};f.attack=a;d.gravity.hitSwitch();return a;
}
check("separate Battle-only arena, normal boulder tuning and unchanged horizontal scoring bounds",()=>{
  const f=fixture({ruleset:"court"}),normal=D.create({arena:"boulder-control"},D.arena("boulder-control"));
  assert.equal(D.ARENAS.find(a=>a.id==="gravity-boulder").name,"Gravity Flip Boulder Control");assert.equal(f.state.config.ruleset,"battle");assert(f.stage.gravitySwitch.noCooldown);assert(!f.stage.gravitySwitch.fourWay);
  for(const k of ["boulderDiameter","boulderMass","bounce","gravity","maxSpeed","winningScore","healthMult","respawn"])assert.equal(f.state.config[k],normal.config[k]);
  assert.deepEqual(f.stage.zones.map(z=>[z.team,z.left,z.right]),D.arena("boulder-control").zones.map(z=>[z.team,z.left,z.right]));
  assert.deepEqual(D.options(JSON.parse(JSON.stringify(f.state.config))),f.state.config);
});
check("bounded options, safe local windows and perch clears the switch at every transit position",()=>{
  for(const options of [{},{boulderDiameter:612,scoringWindowHeight:1280,bonusHeight:620},{scoringWindowHeight:800,bonusHeight:780,zoneAcceleration:99999,zoneMaxSpeed:-1}]){
    const f=fixture(options);assert(f.state.config.zoneAcceleration<=1400);assert(f.state.config.zoneMaxSpeed>=200);
    for(const sign of [1,-1]){
      f.world.gravity.y=sign;f.tick(300);for(const z of D.boulderControl.zones(f.state,f.stage,f.world.gravity)){assert(z.top>=24-1e-7);assert(z.bottom<=f.stage.floorY+1e-7);near(z.bottom-z.top,f.state.config.scoringWindowHeight);}
    }
    const perch=f.stage.terrain.find(t=>t.boulderPerch),s=f.stage.gravitySwitch;assert(perch.y>s.y+s.radius||perch.y+perch.h<s.y-s.radius);assert.equal(perch.move.axis,"x");near(perch.x+perch.w/2,f.stage.width/2);
    assert(f.stage.floorY-f.stage.terrain.find(t=>t.boulderBonus===0).y-28>f.state.ball.r*2);
  }
});
check("720 acceleration / 620 speed, both scoring bodies travel and reverse without resets",()=>{
  const f=fixture(),initial=f.state.movingPlatforms.map(p=>p.y);f.world.gravity.y=-1;
  D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);for(const p of f.state.movingPlatforms)near(p.vy,-12);
  for(let i=0;i<70;i++)D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);
  f.state.movingPlatforms.forEach((p,i)=>{assert(p.y<initial[i]);assert(Math.abs(p.vy)<=620);});
  const p=f.state.movingPlatforms[0],before={...p};f.world.gravity.y=1;D.setPlatformTargets(f.state,f.stage,f.world.gravity);near(p.y,before.y);near(p.vy,before.vy);assert(p.targetY>p.y);
  D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);near(p.vy,before.vy+12);assert(p.y<before.y);
  for(let i=0;i<300;i++)D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);f.state.movingPlatforms.forEach((p,i)=>{near(p.y,initial[i]);near(p.vy,0);});
});
check("zone position and collision/render thresholds share the actual interpolated platform transform",()=>{
  const f=fixture();f.world.gravity.y=-1;f.tick(50);
  for(const alpha of [0,.25,.75,1])for(const sign of [1,-1]){
    const zones=D.boulderControl.zones(f.state,f.stage,{x:0,y:sign},alpha);
    for(const [i,z] of zones.entries()){
      const terrain=f.stage.terrain.find(t=>t.gravityPlatform===i),r=D.platformTerrain(f.state,f.stage,terrain,alpha),body=f.state.movingPlatforms[i];
      near(z.top+(z.bottom-z.top)/2,r.y+r.h/2);near(z.threshold,sign>0?r.y:r.y+r.h);near(r.vy,(body.y-body.prevY)/dt);
    }
  }
});
check("flip does not teleport a window; only gravity-facing bonus orientation changes",()=>{
  const f=fixture(),before=D.boulderControl.zones(f.state,f.stage,{x:0,y:1});D.setPlatformTargets(f.state,f.stage,{x:0,y:-1});
  const after=D.boulderControl.zones(f.state,f.stage,{x:0,y:-1});for(let i=0;i<2;i++){near(before[i].top,after[i].top);near(before[i].bottom,after[i].bottom);near(after[i].threshold-before[i].threshold,28);}
});
check("1x/2x thresholds, exact window edges, midfield and dead zones under both gravities",()=>{
  const f=fixture(),b=f.state.ball;
  for(const sign of [1,-1]){
    f.world.gravity.y=sign;for(let i=0;i<300;i++)D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);
    for(const z of D.boulderControl.zones(f.state,f.stage,f.world.gravity)){
      b.x=(z.left+z.right)/2;
      for(const [y,multiplier] of [[z.threshold+sign*50,1],[z.threshold-sign*50,2],[z.threshold,1],[z.top-1,0],[z.bottom,0]]){
        b.y=y;const r=D.boulderControl.region(f.stage,b,f.state,f.world.gravity);assert.equal(r.multiplier,multiplier);assert.equal(r.team,multiplier?z.team:null);
      }
    }
    for(const x of [0,100,f.stage.width/2,f.stage.width-100,f.stage.width]){b.x=x;b.y=900;assert.equal(D.boulderControl.region(f.stage,b,f.state,f.world.gravity).multiplier,0);}
  }
});
check("a zone sweeping over a stationary center starts and stops scoring without an entry event",()=>{
  const f=fixture(),b=f.state.ball;b.x=615;b.y=500;D.boulderControl.score(f.state,f.stage,dt,f.world.gravity);assert.equal(f.state.scores[1],0);
  f.world.gravity.y=-1;let earned=false;for(let i=0;i<80;i++){D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);D.boulderControl.score(f.state,f.stage,dt,f.world.gravity);earned ||= f.state.scores[1]>0;}
  assert(earned);near(b.y,500);const points=f.state.scores[1];b.y=1600;for(let i=0;i<240;i++){D.advancePlatforms(f.state,f.stage,dt,f.world.gravity);D.boulderControl.score(f.state,f.stage,dt,f.world.gravity);}
  assert(f.state.scores[1]>=points);const stopped=f.state.scores[1];for(let i=0;i<60;i++)D.boulderControl.score(f.state,f.stage,dt,f.world.gravity);near(f.state.scores[1],stopped);
});
check("real switch hits are immediate/deduplicated and preserve fighter, ball and body velocity",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder"});hitSwitch(g,1);assert.equal(d.gravity.direction,-1);hitSwitch(g,2);assert.equal(d.gravity.direction,1);
  const a=hitSwitch(g,3,0,true);assert.equal(d.gravity.direction,-1);d.fighters[0].attack=a;for(let i=0;i<20;i++)d.gravity.hitSwitch();assert.equal(d.gravity.direction,-1);
  a.contactId=4;d.gravity.hitSwitch();assert.equal(d.gravity.direction,1);
  const f=d.fighters[1],b=d.dashball.state.ball;Object.assign(f,{vx:200,vy:-350,airDashes:0});Object.assign(b,{vx:600,vy:-200});d.dashball.state.movingPlatforms.forEach(p=>p.vy=-250);
  const prior=d.dashball.state.movingPlatforms.map(p=>[p.y,p.vy]);hitSwitch(g,5);assert.deepEqual([f.vx,f.vy,b.vx,b.vy,f.airDashes],[200,-350,600,-200,0]);
  d.dashball.state.movingPlatforms.forEach((p,i)=>assert.deepEqual([p.y,p.vy],prior[i]));assert(d.dashball.state.movingPlatforms.every(p=>p.targetY<p.y));
});
check("boulder acceleration flips in flight; additive native attack impulses remain",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{x:1800,y:1300,vx:200,vy:-300});f.tick();near(b.vy,-300+760*dt);
  f.world.gravity.y=-1;const vy=b.vy;f.tick();near(b.vy,vy-760*dt);near(b.vx,200);
  const p={id:"p1",team:0,data:{punchKnockback:800,punchDamage:12,dashBase:600,dashMax:1000}};
  const a=id=>({id,dir:{x:1,y:0},charge:0,hitTargets:new Set()});const start=b.vx;D.shot(f.state,p,a(1),f.world);const impulse=b.vx-start;D.shot(f.state,p,a(2),f.world);assert(b.vx>start+impulse&&b.vx<start+impulse*2,"high-speed transfer now diminishes");assert(!D.shot(f.state,p,a(2),f.world));assert(!("health" in b));
});
check("original Flip Chamber retains its half-second cooldown between legitimate hits",()=>{
  const g=createGame(),d=g.debug;g.rb.setup({stageIndex:d.stageNames.indexOf("Flip Chamber"),characterKeys:["orbit","spike"],seed:42});
  const f=d.fighters[0];Object.assign(f,{x:575,y:360,prevX:575,prevY:360});
  function hit(id){f.attack={id,dir:{x:1,y:0},charge:0,age:.1,startup:0,active:1,recovery:.2,total:1.2,hitTargets:new (vm.runInContext("Set",g.sandbox))()};d.gravity.hitSwitch();}
  hit(1);assert.equal(d.gravity.direction,-1);hit(2);assert.equal(d.gravity.direction,-1);
  d.gravity.advanceSwitchCooldown(.499);hit(3);assert.equal(d.gravity.direction,-1);
  d.gravity.advanceSwitchCooldown(.002);hit(4);assert.equal(d.gravity.direction,1);
});
check("platforms transfer relative momentum without tunneling, trapping or unbounded speeds",()=>{
  for(const sign of [1,-1]){
    const f=fixture(),b=f.state.ball;f.world.gravity.y=sign;
    if(sign<0){Object.assign(b,{x:615,y:850,vx:0,vy:0});}else {for(const p of f.state.movingPlatforms){p.y=p.prevY=f.stage.gravityPlatforms[0].upY;p.vy=0;}Object.assign(b,{x:615,y:1050,vx:0,vy:0});}
    let displaced=false;
    for(let i=0;i<420;i++){
      f.tick();assert([b.x,b.y,b.vx,b.vy].every(Number.isFinite));assert(Math.hypot(b.vx,b.vy)<=1700.001);assert(b.y>=24+b.r-1e-5&&b.y<=f.stage.floorY-b.r+1e-5);
      for(const r of f.world.terrain(1)){const n=D.circleRect(D.relativeBall(b,r.x+r.w/2,f.stage),r);assert(!n||n.depth<.1,JSON.stringify({i,sign,n,r}));}
      displaced ||= Math.abs(b.vy)>400;
    }assert(displaced);
  }
});
check("moving-platform riders carry once; inverted landing and safe KO respawn retain match state",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder",respawn:10});const f=d.fighters[0],r=d.advancePlatforms(0).find(t=>t.gravityPlatform===0);
  Object.assign(f,{x:r.x+r.w/2,y:r.y-f.data.height/2,prevX:r.x+r.w/2,prevY:r.y-f.data.height/2,onGround:true,groundTerrainId:r.id,hitstun:0});
  d.dashball.state.movingPlatforms[0].vy=-100;const y=f.y;d.advancePlatforms(dt);const next=d.terrainArt.rects.find(t=>t.gravityPlatform===0);near(f.y-y,next.y-r.y);
  d.gravity.setDirection("y",-1);Object.assign(f,{x:800,y:24+f.data.height/2+1,prevX:800,prevY:100,vx:0,vy:-200,onGround:false,airDashes:0});d.gravity.physics(0);assert(f.onGround);assert.equal(f.airDashes,f.data.maxAirDashes);
  const state=d.dashball.state;d.dashball.knockout(1);state.respawns.p2=.001;state.scores=[8,11];const bodies=state.movingPlatforms.map(p=>p.y);d.dashball.step();const returning=d.fighters[1];assert(!returning.koScored);assert(returning.y<160);assert(returning.invulnerable>1.9);assert.equal(d.gravity.direction,-1);assert.deepEqual([...state.scores],[8,11]);assert(state.movingPlatforms.some((p,i)=>p.y!==bodies[i]));
});
check("fighters and boulder wrap with momentum and geometry remains independent of respawns",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{x:2998,y:1300,vx:900,vy:-100});f.tick();near(b.x,13);near(b.vx,900);near(b.vy,-100+760*dt);assert(Math.abs(b.x-b.prevX)<20);
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder"});const p=d.fighters[0];Object.assign(p,{x:3001,y:1300,prevX:3001,prevY:1300,vx:500,vy:-100,onGround:false,hitstun:.2});d.gravity.physics(0);assert(p.x<100);assert(p.vx>0);assert(p.hitstun>0);
});
check("core fighters including Chungus can reach the moving perches using native super jumps",()=>{
  const g=createGame(),d=g.debug;
  for(const key of ["orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","anchor","defiplate"])for(const sign of [1,-1]){
    d.dashball.setup({arena:"gravity-boulder"},{characters:[key,"spike"]});d.gravity.setDirection("y",sign);if(sign<0)for(let i=0;i<200;i++)d.advancePlatforms(dt);
    const f=d.fighters[0],bonus=d.terrainArt.rects.find(t=>t.gravityPlatform===0),perch=d.terrainArt.rects.find(t=>t.boulderPerch),half=f.data.height/2;
    for(const [surface,target] of [[sign>0?d.dashball.arena.floorY:24,sign>0?bonus.y:bonus.y+bonus.h],[sign>0?bonus.y:bonus.y+bonus.h,sign>0?perch.y:perch.y+perch.h]]){
      Object.assign(f,{x:900,y:surface-sign*half,prevX:900,prevY:surface-sign*half,vx:0,vy:0,onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-sign},airDashes:f.data.maxAirDashes});
      d.gravity.dash(0,{x:0,y:-sign},f.data.dashChargeTime);let feet=f.y+sign*half;
      for(let i=0;i<120;i++){d.gravity.physics(0);feet=sign>0?Math.min(feet,f.y+half):Math.max(feet,f.y-half);}
      assert(sign>0?feet<target:feet>target,`${key} gravity ${sign}: ${feet} target ${target}`);
    }
  }
});
check("native projectiles activate the same switch immediately while straight trajectories stay straight",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder"},{characters:["gunman","archer"]});const f=d.fighters[0],c=d.dashball.arena.gravitySwitch;
  function fire(){f.whiffLag=f.punchLockout=f.hitstop=0;for(const held of [true,false]){Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(0);}const a=f.attack;assert(a.projectile);d.updateAttack(0,a.startup+1e-8);assert(a.projectile.persistent);return a;}
  for(const index of [0,1]){
    const a=fire();Object.assign(a.projectile,{x:c.x-50,y:c.y,vx:1800,vy:0,speed:1800});
    d.updateProjectiles(.02);assert.equal(f.projectiles.length,0);assert.equal(d.gravity.direction,index===0?-1:1);
  }
  const a=fire();Object.assign(a.projectile,{x:1000,y:1500,vx:1800,vy:0,speed:1800});d.gravity.setDirection("y",-1);d.updateProjectiles(.02);near(a.projectile.y,1500);assert(a.projectile.x>1000);assert.equal(f.ammo,0);
});
check("AI uses a reachable switch strategically and keeps pursuing/scoring under both gravities",()=>{
  for(const sign of [1,-1]){
    const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder"},{ai:true});d.gravity.setDirection("y",sign);const state=d.dashball.state,c=d.dashball.arena.gravitySwitch,p=d.fighters[1];
    if(sign<0)for(let i=0;i<180;i++)d.advancePlatforms(dt);
    Object.assign(p,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false});state.time=4;
    const zone=g.sandbox.Dashball.boulderControl.zones(state,d.dashball.arena,{x:0,y:sign}).find(z=>z.team===0);Object.assign(state.ball,{x:(zone.left+zone.right)/2,y:sign>0?1400:400,vx:0,vy:0});
    let flipped=false,touched=false;for(let i=0;i<900;i++){d.dashball.step();flipped ||= d.gravity.direction!==sign;touched ||= state.ball.ownerId!==null;assert(d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));}
    assert(flipped);assert(touched);
  }
});
check("Battle friendly-fire preference and team-side protection use existing combat rules",()=>{
  for(const friendly of [false,true]){
    const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder",teamSize:2});const snapshot=g.rb.save();snapshot.core.teamAttackEnabled=friendly;g.rb.restore(snapshot);
    const [a,,ally]=d.fighters;Object.assign(a,{x:1800,y:1300,prevX:1800,prevY:1300});a.attack={id:901,dir:{x:1,y:0},charge:0,age:.1,startup:0,active:1,recovery:.2,total:1.2,hitTargets:new (vm.runInContext("Set",g.sandbox))()};
    const box=d.getPunchHitbox(0,{x:1,y:0},0);Object.assign(ally,{x:box.cx,y:box.cy,invulnerable:0});const health=ally.health;d.handleHits();assert.equal(ally.health<health,friendly);
  }
});
check("ten strategic CPUs remain deterministic while windows, gravity and scoring change",()=>{
  const games=[createGame(),createGame()];for(const g of games){const d=g.debug;d.dashball.setup({arena:"gravity-boulder",teamSize:5},{ai:true,seed:733});const c=d.dashball.arena.gravitySwitch;
    Object.assign(d.fighters[1],{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false});Object.assign(d.fighters[3],{x:1800,y:1300,prevX:1800,prevY:1300,onGround:false});
    Object.assign(d.dashball.state.ball,{x:2385,y:1300,vx:0,vy:0});d.dashball.state.time=4;
  }
  let flipped=false;for(let i=0;i<600;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());flipped ||= games[0].debug.gravity.direction<0;}
  assert(flipped);assert(games[0].debug.dashball.state.scores.some(score=>score>0));
});
check("1v1/3v3/5v5 independent peers, snapshots, replay and render purity",()=>{
  for(const size of [1,3,5]){const a=createGame(),b=createGame();for(const g of [a,b]){g.debug.dashball.setup({arena:"gravity-boulder",teamSize:size});hitSwitch(g);}
    const start=a.rb.save(),rows=[];for(let i=0;i<150;i++){const row=a.debug.fighters.map((p,n)=>({aimX:n%2?1:-1,aimY:i%50<25?-1:1,dashHeld:i%37<8,punchHeld:i%29<9}));rows.push(row);assert.equal(a.rb.step(row),b.rb.step(row));}
    const hash=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),hash);
    b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(JSON.stringify(a.debug.dashball.state.movingPlatforms),JSON.stringify(b.debug.dashball.state.movingPlatforms));assert.equal(a.debug.gravity.direction,b.debug.gravity.direction);
  }
});
check("delayed-input rollback cannot duplicate moving-zone points or lose respawns/transit",()=>{
  for(const scenario of ["transit","scoring","respawn"]){const a=createGame(),b=createGame();for(const g of [a,b]){
    g.debug.dashball.setup({arena:"gravity-boulder"});hitSwitch(g);Object.assign(g.debug.dashball.state.ball,{x:615,y:scenario==="scoring"?900:1300,vx:50,vy:-100});
    if(scenario==="respawn"){g.debug.dashball.knockout(1);g.debug.dashball.state.respawns.p2=.4;}
  }const manager=b.rb.manager(0,8),pending=[];for(let frame=0;frame<180;frame++){
    const l=R.encode({aimX:-1,aimY:-.6,dashHeld:frame%37<8,punchHeld:frame%31<10}),r=R.encode({aimX:1,aimY:frame%20<10?-.5:.5,dashHeld:frame%29<8,punchHeld:frame%23<7});
    pending.push({frame,input:r});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(l));a.rb.step([l,r].map(R.decode));
  }for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),scenario);assert(manager.rollbacks>0);}
});
check("30/60/120Hz rendering remains fixed-step equivalent",()=>{
  const hashes=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"gravity-boulder"});hitSwitch(g);Object.assign(g.debug.dashball.state.ball,{x:615,y:1300,vx:20,vy:0});for(let i=1;i<=hz*3;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
});
check("victory freezes movers; rematch and mode exit reset gravity, scores and moving state",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder"});hitSwitch(g);d.dashball.state.phase="finished";const bodies=JSON.stringify(d.dashball.state.movingPlatforms);d.dashball.step();assert.equal(JSON.stringify(d.dashball.state.movingPlatforms),bodies);
  d.dashball.setup({arena:"gravity-boulder"});assert.equal(d.gravity.direction,1);assert(d.dashball.state.movingPlatforms.every((p,i)=>p.y===d.dashball.arena.gravityPlatforms[i].downY&&p.vy===0));assert.deepEqual([...d.dashball.state.scores],[0,0]);
  hitSwitch(g);d.dashball.setup({arena:"boulder-control"});assert.equal(d.gravity.direction,1);assert(!d.dashball.state.movingPlatforms);assert(!d.dashball.arena.gravitySwitch);d.dashball.setup({arena:"standard"});assert.equal(d.dashball.state.ball.r,24);assert(!d.dashball.state.boulder);
});
check("unchanged previous sports/Versus and original AIs retain pre-change hashes",()=>{
  const baseline=require("./gravity-boulder-before.json");for(const key of Object.keys(baseline).filter(require("./total-rush-regression").unchangedSportsFixture)){
    const g=createGame(),ai=key.endsWith(":ai");if(key==="versus")g.rb.setup({stageIndex:g.debug.stageNames.indexOf("Crosswire"),characterKeys:["orbit","spike"],seed:42});
    else if(["race","brawl","scramble"].includes(key))g.debug.sandbag.setup({ruleset:key});else{const [arena,ruleset]=key.split(":");g.debug.dashball.setup({arena,...(ai?{teamSize:3}:{ruleset})},{ai,seed:ai?733:42});if(arena==="gravity-soccer"&&!ai)g.debug.gravity.setDirection("y",-1);}
    for(let i=0;i<baseline[key].length;i++){
      let hash;if(ai){g.debug.dashball.step();hash=g.rb.hash();}else hash=g.rb.step(g.debug.fighters.map((f,n)=>({aimX:n?-1:1,aimY:-.3,dashHeld:i%37<8,punchHeld:i%29<10})));
      const captured=["standard","elevated","elevated-open","target-break","golden-rush","gravity-soccer","boulder-control"],id=key.split(":")[0];
      const shift=["race","brawl","scramble"].includes(key)?D.ARENAS.length-captured.length:captured.includes(id)?D.ARENAS.findIndex(a=>a.id===id)-captured.indexOf(id):0;
      if(shift){const c=JSON.parse(JSON.stringify(g.rb.save().core)),old=c.stageIndex-shift;c.stageIndex=old;for(const f of c.fighters)for(const field of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[field]==="string")f[field]=f[field].replace(/^\d+:/,`${old}:`);hash=R.hash(c);}
      assert.equal(hash,baseline[key][i],`${key}:${i}`);
    }
  }
});
console.log(`${passed} Gravity Flip Boulder Control groups passed`);
