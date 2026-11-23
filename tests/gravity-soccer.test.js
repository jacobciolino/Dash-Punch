"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),D=require("../dashball"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
let passed=0;
function check(label,test){test();passed++;console.log(`ok ${label}`);}
function fixture(config={}){
  const stage=D.arena("gravity-soccer",154,config),state=D.create({...config,arena:"gravity-soccer"},stage);
  const world={stage,gravity:{x:0,y:1},fighters:[],attacks:()=>[],attackTouches:()=>false,
    terrain:a=>stage.terrain.map(t=>t.flipGoalTeam===undefined?t:D.goalTerrain(state,stage,t,a))};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.advanceGoals(state,stage,dt,world.gravity);D.step(state,dt,world);}}};
}
function attack(g,id,dir={x:1,y:0},projectile=false){return {id,age:.1,startup:0,active:5,recovery:.2,total:5.2,charge:0,dir,
  hitTargets:new (vm.runInContext("Set",g.sandbox))(),...(projectile?{projectile:{persistent:true}}:{})};}
function switchHit(g,id=100){
  const d=g.debug,f=d.fighters[0],s=d.dashball.arena.gravitySwitch;
  Object.assign(f,{x:s.x-65,y:s.y,prevX:s.x-65,prevY:s.y,vx:0,vy:0,onGround:false});f.attack=attack(g,id);
  d.gravity.hitSwitch();return f.attack;
}
check("arena registered; both rulesets, 75% goals, upright fixed camera and physical switch",()=>{
  assert.equal(D.ARENAS.find(a=>a.id==="gravity-soccer").name,"Gravity Flip Soccer");
  for(const ruleset of ["court","battle"]){const f=fixture({ruleset}),regular=D.arena();assert.equal(f.state.config.ruleset,ruleset);
    near(f.stage.goals[0].bottom-f.stage.goals[0].top,(regular.goals[0].bottom-regular.goals[0].top)*.75);
    assert(f.stage.height>regular.height);assert(f.stage.cameraHeader+f.stage.height*f.stage.cameraZoom<=720);assert(f.stage.fixedCamera);
    assert(f.stage.gravitySwitch.noCooldown);assert(!f.stage.gravitySwitch.fourWay);
  }
  const custom=fixture({goalHeightScale:.6});near(custom.stage.goals[0].bottom-custom.stage.goals[0].top,432*.6);
});
check("goal travel, mid-flight reversal preserves velocity, synchronized parts and settling",()=>{
  const f=fixture(),body=f.state.movingGoals[0],start=body.y;f.world.gravity.y=-1;f.tick(40);
  assert(body.y<start-100);assert(body.vy<0);const vy=body.vy,y=body.y;f.world.gravity.y=1;
  D.advanceGoals(f.state,f.stage,dt,f.world.gravity);near(body.vy,vy+720*dt);assert(body.y<y);
  const half=(f.stage.goals[0].bottom-f.stage.goals[0].top)/2;
  for(const alpha of [0,.3,1]){
    const goal=D.goalTransforms(f.state,f.stage,alpha)[0];near(goal.top,body.prevY+(body.y-body.prevY)*alpha-half);
    for(const t of f.stage.terrain.filter(t=>t.flipGoalTeam===0)){
      const r=D.goalTerrain(f.state,f.stage,t,alpha);near(r.vy,(body.y-body.prevY)/dt);
      near(r.y,t.goalPart==="top"?goal.top-24:t.goalPart==="bottom"?goal.bottom:goal.top);
    }
  }
  f.world.gravity.y=-1;f.tick(240);near(body.y,24+half);near(body.vy,0);
  f.world.gravity.y=1;f.tick(240);near(body.y,start);near(body.vy,0);
});
check("ball acceleration reverses while its momentum survives",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{x:1280,y:700,vx:340,vy:-400});f.world.gravity.y=1;f.tick();
  near(b.vx,340);near(b.vy,-400+1050*dt);const vy=b.vy,y=b.y;f.world.gravity.y=-1;f.tick();
  near(b.vy,vy-1050*dt);assert(b.y<y);
});
check("moving and ceiling goals score from field, both teams; one score per entry",()=>{
  for(const team of [0,1])for(const position of ["floor","transit","ceiling"]){
    const f=fixture(),g=f.stage.goals[team],sign=team?1:-1,body=f.state.movingGoals[team];
    if(position!=="floor"){
      f.world.gravity.y=-1;for(const b of f.state.movingGoals)Object.assign(b,{y:position==="transit"?800:24+(g.bottom-g.top)/2,prevY:position==="transit"?800:24+(g.bottom-g.top)/2,vy:position==="transit"?-240:0});
    }
    Object.assign(f.state.ball,{x:g.line-sign*90,y:body.y,vx:sign*1800,vy:0});
    f.tick(10);assert.equal(f.state.scores[1-team],1,position);f.tick(30);assert.equal(f.state.goalSerial,1);
  }
});
check("rear, initial overlap, stationary sweep and physical rails cannot score",()=>{
  for(const scenario of ["rear","overlap","sweep","top","bottom"]){
    const f=fixture(),g=f.stage.goals[1],b=f.state.ball;
    for(const body of f.state.movingGoals)Object.assign(body,{y:800,prevY:800,vy:-400});f.world.gravity.y=-1;
    Object.assign(b,{x:scenario==="rear"?2460:scenario==="overlap"||scenario==="sweep"?g.line+30:g.line-90,
      y:scenario==="sweep"?550:scenario==="top"?800-162-12:scenario==="bottom"?800+162+12:800,
      vx:scenario==="rear"?-1300:scenario==="top"||scenario==="bottom"?1800:0,vy:scenario==="top"||scenario==="bottom"?-400:0});
    f.tick(12);assert.equal(f.state.goalSerial,0,scenario);
    if(scenario==="top"||scenario==="bottom")assert(b.x<g.line+24,"rail must stop a shot");
  }
});
check("moving rails impart physical momentum, without phantom scores or traps",()=>{
  const f=fixture(),body=f.state.movingGoals[0];body.y=body.prevY=800;body.vy=-500;f.world.gravity.y=-1;
  Object.assign(f.state.ball,{x:100,y:800-162-24-25,vx:0,vy:0});f.tick(4);
  assert(f.state.ball.vy< -400);assert.equal(f.state.goalSerial,0);
  f.tick(240);assert([f.state.ball.x,f.state.ball.y,f.state.ball.vx,f.state.ball.vy].every(Number.isFinite));
  assert(f.state.ball.y>=24+f.state.ball.r-1e-6);
});
check("real switch: distinct hits flip immediately; continuous persistent hit deduplicates",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer"});
  switchHit(g,10);assert.equal(d.gravity.direction,-1);switchHit(g,11);assert.equal(d.gravity.direction,1);
  const f=d.fighters[0];f.attack=attack(g,12,{x:1,y:0},true);Object.assign(f.attack.projectile,{x:d.dashball.arena.gravitySwitch.x,y:f.y,radius:12,spawned:true});const lingering=f.attack;
  d.gravity.hitSwitch();assert.equal(d.gravity.direction,-1);f.attack=lingering;
  for(let i=0;i<20;i++)d.gravity.hitSwitch();assert.equal(d.gravity.direction,-1);
  lingering.contactId=13;d.gravity.hitSwitch();assert.equal(d.gravity.direction,1);
});
check("flip changes neither fighter/ball velocities nor bystander dash resources",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer"});const f=d.fighters[1],b=d.dashball.state.ball;
  Object.assign(f,{x:1800,y:700,vx:200,vy:-350,onGround:false,airDashes:0,hitstun:.4});Object.assign(b,{x:1500,y:700,vx:700,vy:-100});
  switchHit(g);assert.deepEqual([f.vx,f.vy,b.vx,b.vy],[200,-350,700,-100]);assert.equal(f.airDashes,0);assert.equal(f.hitstun,.4);
  d.gravity.physics(1);assert(f.vy< -350);d.dashball.ballStep();assert(b.vy< -100);
});
check("real projectile switch hits flip immediately, keep straight flight and consume each shot once",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer"},{characters:["gunman","archer"]});
  const f=d.fighters[0],c=d.dashball.arena.gravitySwitch;
  for(const id of [901,902]){
    const a=attack(g,id);a.projectile={x:c.x-50,y:c.y,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.07};
    f.projectiles=[a];d.updateProjectiles(.02);assert.equal(f.projectiles.length,0);assert.equal(d.gravity.direction,id===901?-1:1);
  }
  const a=attack(g,903);a.projectile={x:600,y:300,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.07};f.projectiles=[a];
  d.gravity.setDirection("y",-1);d.updateProjectiles(.02);near(a.projectile.y,300);assert(a.projectile.x>600);
});
check("inverted ceiling landing, dash/superjump, wall cling and safe Battle respawn",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer",respawn:10});d.gravity.setDirection("y",-1);
  const f=d.fighters[0];Object.assign(f,{x:700,y:24+f.data.height/2+1,prevX:700,prevY:100,vx:0,vy:-200,onGround:false,airDashes:0});
  d.gravity.physics(0);assert(f.onGround);assert.equal(f.airDashes,f.data.maxAirDashes);
  f.tippyToes=true;f.tippyToesHold=2;d.gravity.dash(0,{x:0,y:1},0);assert(f.vy>0);assert(!f.onGround);
  Object.assign(f,{x:24+f.data.width/2-1,y:650,prevX:24+f.data.width/2+5,prevY:650,onGround:false,hasLiveAim:true,aim:{x:-1,y:0},vx:-80,vy:-80});
  d.gravity.physics(0);assert(f.wallClinging);assert.equal(f.vy,0);
  d.dashball.knockout(1);d.dashball.state.respawns.p2=.001;d.dashball.step();const r=d.fighters[1];assert(!r.koScored);
  assert(r.y<150);assert(r.invulnerable>1.9);near(r.health,Math.round(r.data.maxHealth*.5));
});
check("Court prevents PvP and crossing after flips; Battle retains combat and midfield freedom",()=>{
  for(const ruleset of ["court","battle"]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer",ruleset});switchHit(g);
    const [a,b]=d.fighters;a.attack=attack(g,300);const health=b.health;d.resolveHit(0,1);assert.equal(b.health<health,ruleset==="battle");
    a.x=1800;a.y=700;a.vx=100;d.dashball.step();assert.equal(a.x<1280,ruleset==="court");
  }
});
check("goal reset, rematch and leaving restore down gravity with no mode leakage",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer"});switchHit(g);d.dashball.step();
  const state=d.dashball.state;D.goal(state,1);state.pause=.001;d.dashball.step();assert.equal(d.gravity.direction,1);
  assert.equal(state.phase,"countdown");for(const b of state.movingGoals)near(b.vy,0);
  near(state.movingGoals[0].y,(d.dashball.arena.goals[0].top+d.dashball.arena.goals[0].bottom)/2);
  d.dashball.setup({arena:"gravity-soccer"});assert.equal(d.gravity.direction,1);
  switchHit(g);d.dashball.setup({arena:"standard"});assert.equal(d.gravity.direction,1);assert(!d.dashball.state.movingGoals);assert(!d.dashball.arena.gravitySwitch);
  d.dashball.standard();assert.equal(d.gravity.direction,1);
});
check("serializable moving goals, host snapshots, independent replay and render purity",()=>{
  for(const teamSize of [1,5])for(const ruleset of ["court","battle"]){
    const a=createGame(),b=createGame(),config={arena:"gravity-soccer",teamSize,ruleset};a.debug.dashball.setup(config);b.debug.dashball.setup(config);
    switchHit(a);switchHit(b);const start=a.rb.save(),inputs=[];
    for(let i=0;i<150;i++){
      const row=a.debug.fighters.map((f,n)=>({aimX:n%2?-1:1,aimY:i%70<35?-1:1,dashHeld:i%40<10,punchHeld:i%29<7}));inputs.push(row);
      assert.equal(a.rb.step(row),b.rb.step(row));
    }
    const expected=a.rb.hash();a.rb.restore(start);for(const row of inputs)a.rb.step(row);assert.equal(a.rb.hash(),expected);
    const hash=a.rb.hash();a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),hash);
    const snap=a.debug.online.createSnapshot();b.debug.online.installSnapshot(snap);
    assert.equal(JSON.stringify(a.debug.dashball.state.movingGoals),JSON.stringify(b.debug.dashball.state.movingGoals));assert.equal(b.debug.gravity.direction,a.debug.gravity.direction);
  }
});
check("AI uses normal inputs, chases/shoots and can contest switch under either gravity",()=>{
  for(const sign of [1,-1]){
    const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-soccer",teamSize:5},{ai:true});d.gravity.setDirection("y",sign);
    const s=d.dashball.state;s.time=4;const f=d.fighters[0],control=d.dashball.arena.gravitySwitch;
    Object.assign(f,{x:control.x-65,y:control.y,prevX:control.x-65,prevY:control.y,onGround:false});
    Object.assign(s.ball,{x:1900,y:sign>0?1500:150,vx:0,vy:0});
    let flipped=false,shot=false;
    for(let i=0;i<900;i++){d.dashball.step();flipped ||= d.gravity.direction!==sign;shot ||= s.ball.ownerId!==null;assert(d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));}
    assert(flipped,"AI should activate a reachable switch");assert(shot,"AI should attack the ball");
  }
});
check("six-frame late inputs roll back goal transit, gravity, goals, possession and respawns",()=>{
  const R=require("../rollback");for(const scenario of ["switch","goal","possession","respawn"]){
    const reference=createGame(),late=createGame();for(const g of [reference,late]){
      g.debug.dashball.setup({arena:"gravity-soccer",ruleset:"battle"},{characters:["spike","anchor"]});
      if(scenario==="switch"){
        const f=g.debug.fighters[1],c=g.debug.dashball.arena.gravitySwitch;Object.assign(f,{x:c.x+65,y:c.y,prevX:c.x+65,prevY:c.y,onGround:false});f.attack=attack(g,1000,{x:-1,y:0});
      }else switchHit(g);
      if(scenario==="goal"){
        for(const b of g.debug.dashball.state.movingGoals)Object.assign(b,{y:800,prevY:800,vy:-200});
        Object.assign(g.debug.dashball.state.ball,{x:2200,y:800,vx:1800,vy:0});
      }
      if(scenario==="possession"){
        const f=g.debug.fighters[0];Object.assign(f,{chargingPunch:true,punchInputHeld:true,punchAim:{x:1,y:0}});g.debug.dashball.state.ball.carrier=f.id;
      }
      if(scenario==="respawn"){g.debug.dashball.knockout(1);g.debug.dashball.state.respawns.p2=.5;}
    }
    const manager=late.rb.manager(0,8),pending=[];
    for(let frame=0;frame<180;frame++){
      const l=R.encode({aimX:1,aimY:-.6,punchHeld:frame<20,dashHeld:frame%40<8}),r=R.encode({aimX:-1,aimY:frame%30<15?-.6:.6,punchHeld:frame%29<9,dashHeld:frame%31<7});
      pending.push({frame,input:r});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}
      assert(manager.advance(l));reference.rb.step([l,r].map(R.decode));
    }
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(late.rb.hash(),reference.rb.hash(),scenario);assert(manager.rollbacks>0);
  }
});
check("30/60/120Hz rendering preserves fixed-step ball and moving-goal state",()=>{
  const hashes=[];for(const hz of [30,60,120]){
    const g=createGame();g.debug.dashball.setup({arena:"gravity-soccer"});switchHit(g);
    for(let i=1;i<=hz*3;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());
  }
  assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
});
check("ten CPUs remain deterministic while switching and playing under inverted gravity",()=>{
  const games=[createGame(),createGame()];for(const g of games){g.debug.dashball.setup({arena:"gravity-soccer",ruleset:"court",teamSize:5},{ai:true,seed:814});
    const c=g.debug.dashball.arena.gravitySwitch,f=g.debug.fighters[0];Object.assign(f,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false});g.debug.dashball.state.time=4;
  }
  let flipped=false;for(let i=0;i<600;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());flipped ||= games[0].debug.gravity.direction<0;}
  assert(flipped);assert(games[0].debug.dashball.state.ball.ownerId);
});
check("unchanged Soccer Court/Battle and original Flip match 720 recorded frame hashes",()=>{
  const baseline=require("./gravity-soccer-before.json");for(const ruleset of ["court","battle"]){const g=createGame();g.debug.dashball.setup({ruleset});
    for(let i=0;i<240;i++)assert.equal(g.rb.step(g.debug.fighters.map((f,n)=>({aimX:n?-1:1,aimY:-.3,dashHeld:i%40<12,punchHeld:i%27<8}))),baseline[ruleset][i]);
  }
  const g=createGame();g.rb.setup({stageIndex:g.debug.stageNames.indexOf("Flip Chamber"),characterKeys:["orbit","spike"],seed:42});
  for(let i=0;i<240;i++)assert.equal(g.rb.step([{aimX:1,aimY:-.4,dashHeld:i%50<10,punchHeld:i%25<10},{aimX:-1,aimY:.1,punchHeld:i%31<9}]),baseline.flip[i]);
});
console.log(`${passed} Gravity Flip Soccer groups passed`);
