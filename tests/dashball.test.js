"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
const GOAL_ARENAS=D.ARENAS.filter(arena=>["standard","elevated","elevated-open"].includes(arena.id));
let assertions=0;
function check(label,fn){fn();assertions++;console.log(`ok ${label}`);}
function fixture(config={}) {
  const stage=D.arena(config.arena,154,config),state=D.create(config,stage);
  const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,
    terrain:()=>stage.terrain.concat(stage.ballOnly),body:f=>({x:f.x-32,y:f.y-32,w:64,h:64}),
    shielding:f=>f.shielding,shieldAim:f=>f.aim||{x:1,y:0},shieldCovers:()=>true,shieldPadding:()=>24,kicking:()=>false};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++)D.step(state,dt,world);}};
}
function fighter(id="p1",team=0){return {id,team,x:600,y:700,prevX:600,prevY:700,vx:0,vy:0,invulnerable:0,
  data:{width:64,height:64,dashBase:800,dashMax:500,punchKnockback:800,punchDamage:12},dashReboundLockout:0};}
function shot(id=1,dir={x:1,y:0},charge=0){return {id,dir,charge,startup:.1,active:.2,recovery:.2,total:.5,age:.12,hitTargets:new Set()};}
check("all six combinations; tall goals and deterministic moving platform",()=>{
  for(const ruleset of ["court","battle"])for(const arena of GOAL_ARENAS.map(a=>a.id)){
    const {stage,state}=fixture({ruleset,arena});assert.equal(state.config.ruleset,ruleset);
    if(arena==="standard"){assert(stage.goals[0].bottom-stage.goals[0].top>=154*2.5);assert(!stage.terrain.some(t=>t.move));}
    else {assert.equal(stage.ballOnly.length,2);assert.equal(stage.terrain.filter(t=>t.dashballMover).length,1);}
  }
});
check("standard: low/high shots, full-ball entry, both directions, no duplicate goal",()=>{
  for(const team of [0,1])for(const high of [false,true]){
    const f=fixture(),g=f.stage.goals[team],b=f.state.ball,sign=team?1:-1;
    Object.assign(b,{x:g.line-sign*90,y:high?g.top+65:g.bottom-26,vx:sign*1800,vy:0});
    f.tick();assert.equal(f.state.goalSerial,0);f.tick(8);assert.equal(f.state.scores[1-team],1);f.tick(40);assert.equal(f.state.goalSerial,1);
  }
});
check("standard: crossbar, behind goal, and above opening never score",()=>{
  for(const setup of [{x:2100,y:836,vx:2050},{x:2460,y:1100,vx:-1400},{x:2100,y:700,vx:2050}]){
    const f=fixture();Object.assign(f.state.ball,setup);f.tick(15);assert.equal(f.state.goalSerial,0);
  }
});
check("elevated: downward full entry only; side, rim, bottom and upward shots reject",()=>{
  for(const arena of ["elevated","elevated-open"]){
  for(const team of [0,1]){
    const f=fixture({arena}),g=f.stage.goals[team];
    Object.assign(f.state.ball,{x:(g.left+g.right)/2,y:g.top-70,vx:0,vy:1300});f.tick();assert.equal(f.state.goalSerial,0);
    f.tick(7);assert.equal(f.state.scores[1-team],1);
  }
  for(const setup of [{x:2190,y:700,vx:2050,vy:0},{x:2340,y:870,vx:0,vy:-2050},{x:2230,y:570,vx:0,vy:1500},{x:2340,y:700,vx:0,vy:-1500}]){
    const f=fixture({arena});Object.assign(f.state.ball,setup);f.tick(10);assert.equal(f.state.goalSerial,0);
  }
  }
});
check("high-speed collision and velocity cap",()=>{
  const f=fixture({arena:"elevated"});Object.assign(f.state.ball,{x:2180,y:700,vx:100000,vy:0});
  f.tick(4);assert(f.state.ball.x<2240);assert(Math.hypot(f.state.ball.vx,f.state.ball.vy)<=2050.001);
});
check("ball shots use distinct fighter strengths; rewards are discrete",()=>{
  const f=fixture(),a=fighter(),b=f.state.ball;let rewards=0;
  f.world.onShot=(_f,_a,_k,reward)=>rewards+=Number(reward);
  assert(D.shot(f.state,a,shot(1),f.world));const weak=b.vx;
  assert(!D.shot(f.state,a,shot(1),f.world));assert.equal(rewards,1);
  a.data.punchKnockback=1100;D.shot(f.state,a,shot(2),f.world);assert(b.vx>weak);assert.equal(rewards,1);
  f.state.time=.25;D.shot(f.state,a,shot(3),f.world);assert.equal(rewards,2);
});
check("soft dribble, opposing launched-ball knockdown and slow recoil",()=>{
  const f=fixture(),a=fighter();f.world.fighters=[a];a.vx=4000;
  Object.assign(f.state.ball,{x:650,y:700,vx:0,vy:0});f.tick();assert(Math.abs(f.state.ball.vx)<=280);
  a.vx=0;let hits=0;f.world.onKnockdown=()=>hits++;
  Object.assign(f.state.ball,{x:660,y:700,vx:-1700,vy:0,launched:2,ownerId:"p2",ownerTeam:1,contacts:{}});
  f.tick(6);assert.equal(hits,1);assert(Math.hypot(f.state.ball.vx,f.state.ball.vy)<400);
  Object.assign(f.state.ball,{x:660,y:700,vx:-1700,vy:0,launched:2,ownerId:"ally",ownerTeam:0,contacts:{}});f.tick(6);assert.equal(hits,1);
});
check("shield deflects without knockdown; Spike captures, releases, cannot carry-score",()=>{
  const f=fixture(),a=fighter();a.shielding=true;f.world.fighters=[a];let hits=0,shields=0;
  f.world.onKnockdown=()=>hits++;f.world.onShield=()=>shields++;
  Object.assign(f.state.ball,{x:665,y:700,vx:-1400,vy:0,launched:2,ownerId:"p2",ownerTeam:1});f.tick(2);
  assert.equal(hits,0);assert.equal(shields,1);assert(f.state.ball.vx>0);
  a.data.shieldThornsDamage=5;Object.assign(f.state.ball,{x:665,y:700,contacts:{}});f.tick();assert.equal(f.state.ball.carrier,a.id);
  const rewards=JSON.stringify(f.state.rewardUntil);a.x=2400;a.prevX=a.x;f.tick(90);assert.equal(f.state.goalSerial,0);assert.equal(JSON.stringify(f.state.rewardUntil),rewards);
  a.shielding=false;a.vx=300;f.tick();assert.equal(f.state.ball.carrier,null);assert(f.state.ball.noCapture[a.id]>f.state.time);
});
check("Spike charged release waits for real attack and receives launch bonus",()=>{
  const f=fixture(),a=fighter();f.world.fighters=[a];a.shielding=true;a.data.shieldThornsDamage=5;
  Object.assign(f.state.ball,{x:665,y:700});f.tick();assert.equal(f.state.ball.carrier,a.id);
  a.attack={...shot(15),fromShieldRelease:true,charge:1};a.shielding=false;
  D.possession(f.state,f.world);assert.equal(f.state.ball.vx,0);assert.equal(f.state.ball.pendingLaunch.id,15);
  D.shot(f.state,a,a.attack,f.world);const boosted=f.state.ball.vx;
  D.shot(f.state,a,shot(16,{x:1,y:0},1),f.world);assert(boosted>f.state.ball.vx);
});
check("Court constrains complete bodies and leaves ball unrestricted",()=>{
  const f=fixture({ruleset:"court"});for(const team of [0,1]){const a=fighter("p",team);a.x=team?100:2400;a.vx=team?-2000:2000;D.constrain(f.state,a,f.stage);assert(team?a.x-32>1280:a.x+32<1280);assert.equal(a.vx,0);}
  Object.assign(f.state.ball,{x:1250,y:700,vx:1400});f.tick(4);assert(f.state.ball.x>1280);
});
check("goal pause, reset/countdown, timer, overtime and draw",()=>{
  const f=fixture({duration:15,winningScore:2});D.goal(f.state,1);assert.equal(f.state.scores[0],1);
  assert(!D.clock(f.state,1,f.stage).play);assert(D.clock(f.state,.3,f.stage).reset);assert(D.clock(f.state,2,f.stage).go);
  f.state.remaining=.001;f.state.scores=[1,1];D.clock(f.state,dt,f.stage);assert(f.state.overtime);D.goal(f.state,0);assert.equal(f.state.winner,1);
  const draw=fixture({overtime:false});draw.state.remaining=0;D.clock(draw.state,dt,draw.stage);assert.equal(draw.state.phase,"finished");assert.equal(draw.state.winner,null);
});
const game=createGame(),d=game.debug;
check("integration: Court disables combat, Battle health/individual respawn retains ball/score",()=>{
  d.dashball.setup({ruleset:"court"});const [a,b]=d.fighters;b.health=100;a.attack=shot(17);d.resolveHit(0,1);assert.equal(b.health,100);
  d.dashball.setup({ruleset:"battle",healthMult:.5,respawn:10});const target=d.fighters[1];near(target.health,Math.round(target.data.maxHealth*.5));
  const ball=d.dashball.state.ball;ball.x=1000;d.dashball.state.scores=[2,1];d.dashball.knockout(1);
  assert(target.koScored);assert.equal(d.dashball.state.respawns[target.id],10);assert.equal(ball.x,1000);
  for(let i=0;i<601;i++)d.dashball.step();assert(!target.koScored);assert(target.invulnerable>0);assert.deepEqual([...d.dashball.state.scores],[2,1]);
});
check("integration: basket bottoms/rims cannot support fighters; exterior allows wall contact",()=>{
  d.dashball.setup({arena:"elevated"});const f=d.fighters[0],g=d.dashball.arena.goals[0];
  Object.assign(f,{x:(g.left+g.right)/2,y:g.top-f.data.height/2-4,vx:0,vy:500,onGround:false});
  for(let i=0;i<40;i++)d.dashball.step();assert(f.y>g.bottom+f.data.height/2,"fighter should fall through basket");
  const wall=d.dashball.arena.terrain.find(t=>t.dashballExterior===1);
  Object.assign(f,{prevX:wall.x+wall.w+f.data.width/2+5,x:wall.x+wall.w+f.data.width/2-5,prevY:700,y:700});
  assert(D.exteriorContact(f,wall,{x:f.x-f.data.width/2,y:f.y-f.data.height/2,w:f.data.width,h:f.data.height}));
});
check("integration: vertical platform carries riders with exact displacement",()=>{
  d.dashball.setup({arena:"elevated"});const stage=d.dashball.arena,t=stage.terrain.find(t=>t.dashballMover),f=d.fighters[0];
  const id=d.advancePlatforms(0).find(t=>t.dashballMover).id;
  Object.assign(f,{x:1280,y:t.y-f.data.height/2,vx:0,vy:0,onGround:true,groundTerrainId:id});const y=f.y;
  d.advancePlatforms(dt);near(f.y-y,Math.sin(dt*t.move.speed)*t.move.amplitude,.001);
});
check("1v1 through 5v5; independent peers and save/restore replay all combinations",()=>{
  const peer=createGame();for(const ruleset of ["court","battle"])for(const arena of GOAL_ARENAS.map(a=>a.id))for(const teamSize of [1,5]){
    const config={ruleset,arena,teamSize};d.dashball.setup(config);peer.debug.dashball.setup(config);
    assert.equal(d.fighters.length,teamSize*2);assert.equal(d.fighters.filter(f=>f.team===0).length,teamSize);
    const start=game.rb.save();let hash;
    for(let i=0;i<90;i++){
      const inputs=d.fighters.map((f,n)=>({aimX:n%2?-1:1,aimY:-.2,dashHeld:i%30<8,punchHeld:i%25<10}));
      hash=game.rb.step(inputs);assert.equal(hash,peer.rb.step(inputs));
    }
    game.rb.restore(start);
    for(let i=0;i<90;i++)hash=game.rb.step(d.fighters.map((f,n)=>({aimX:n%2?-1:1,aimY:-.2,dashHeld:i%30<8,punchHeld:i%25<10})));
    assert.equal(hash,peer.rb.hash());
  }
});
check("real melee ball hit self-cancels, refills dashes and intercepts the shot",()=>{
  d.dashball.setup();const a=d.fighters[0],ball=d.dashball.state.ball;
  Object.assign(a,{x:600,y:700,prevX:600,prevY:700,airDashes:0,punchLockout:.4,whiffLag:.3});
  a.attack=shot(123);Object.assign(ball,{x:665,y:700,vx:-1400,vy:0,launched:2,ownerTeam:1,ownerId:"p2"});
  d.dashball.ballStep();assert.equal(a.attack,null);assert.equal(a.punchLockout,0);assert.equal(a.whiffLag,0);
  assert.equal(a.airDashes,a.data.maxAirDashes);assert.equal(a.hitstun,0);assert.equal(ball.ownerId,a.id);
});
check("ball Kickoff uses existing rebound and restores one air dash",()=>{
  d.dashball.setup({},{characters:["rain","orbit"]});const a=d.fighters[0],b=d.dashball.state.ball;
  Object.assign(a,{x:600,y:700,prevX:600,prevY:700,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:.3,airDashes:0,onGround:false,escapeAvailable:false,dashEscapeMeter:0});
  Object.assign(b,{x:645,y:700,vx:0,vy:0});d.dashball.ballStep();
  assert.equal(b.ownerId,a.id);assert.equal(a.airDashes,1);assert(a.vx<0);assert(a.dashReboundLockout>0);assert.equal(a.dashEscapeMeter,0);
});
check("projectile hits launch the ball, consume the shot and confirm the normal reward",()=>{
  for(const key of ["gunman","goodergunman","archer"]){
    d.dashball.setup({},{characters:[key,"anchor"]});const a=d.fighters[0],b=d.dashball.state.ball;
    Object.assign(a,{x:600,y:700,airDashes:0,whiffLag:.3,punchLockout:.3});Object.assign(b,{x:800,y:700});
    a.projectiles=[{...shot(999),projectile:{x:770,y:700,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.4}}];
    d.updateProjectiles(0);assert.equal(a.projectiles.length,0);assert.equal(b.ownerId,a.id);assert(b.vx>0);
    assert.equal(a.airDashes,a.data.maxAirDashes);assert.equal(a.whiffLag,0);
  }
});
check("ball bounces against the oscillating platform with its relative velocity",()=>{
  const f=fixture({arena:"elevated"}),b=f.state.ball;
  f.world.terrain=()=>[{x:1100,y:800,w:360,h:24,vx:0,vy:-150}];
  Object.assign(b,{x:1280,y:772,vx:0,vy:300});f.tick(2);assert(b.vy<-300);assert(b.y+b.r<800.1);
});
check("Spike real shield fizzle releases; same-event recapture is blocked",()=>{
  d.dashball.setup({},{characters:["spike","anchor"]});const a=d.fighters[0],b=d.dashball.state.ball;
  Object.assign(a,{x:600,y:700,prevX:600,prevY:700,chargingPunch:true,punchInputHeld:true,punchAim:{x:1,y:0}});
  Object.assign(b,{x:660,y:700});d.dashball.ballStep();assert.equal(b.carrier,a.id);
  a.punchExhausted=true;d.dashball.ballStep();assert.equal(b.carrier,null);
  a.punchExhausted=false;Object.assign(b,{x:660,y:700,contacts:{}});d.dashball.ballStep();assert.equal(b.carrier,null);
});
check("real basket wall cling and moving platform rider survives reversals",()=>{
  d.dashball.setup({arena:"elevated"});const a=d.fighters[0],stage=d.dashball.arena,wall=stage.terrain.find(t=>t.dashballExterior===1);
  Object.assign(a,{prevX:wall.x+wall.w+a.data.width/2+10,x:wall.x+wall.w+a.data.width/2-2,prevY:700,y:700,vx:-800,vy:0,
    aim:{x:-1,y:0},hasLiveAim:true,dashDir:{x:-1,y:0},dashCarryTimer:.3,airDashes:0});
  d.resolveTerrain(0);assert(a.wallClinging);assert.equal(a.airDashes,a.data.maxAirDashes);
  d.dashball.setup({arena:"elevated"});const rider=d.fighters[0];
  const t=stage.terrain.find(t=>t.dashballMover),id=d.advancePlatforms(0).find(t=>t.dashballMover).id;
  Object.assign(rider,{x:1280,y:t.y-rider.data.height/2,vx:0,vy:0,onGround:true,groundTerrainId:id});
  for(let i=0;i<560;i++){d.advancePlatforms(dt);d.gravity.physics(0);}
  const current=d.terrainArt.rects.find(t=>t.dashballMover);assert(rider.onGround);near(rider.y+rider.data.height/2,current.y,.01);
});
check("late-input rollback recovers ball possession, scoring and respawns",()=>{
  const R=require("../rollback");
  for(const scenario of ["goal","possession","respawn","wrap"]){
    const ref=createGame(),late=createGame(),config={ruleset:"battle",arena:scenario==="wrap"?"elevated-open":scenario==="goal"?"elevated":"standard",respawn:1};
    for(const g of [ref,late]){
      g.debug.dashball.setup(config,{characters:["spike","anchor"]});
      if(scenario==="goal")Object.assign(g.debug.dashball.state.ball,{x:2340,y:560,vx:0,vy:1000});
      if(scenario==="wrap")Object.assign(g.debug.dashball.state.ball,{x:2555,y:-140,vx:1900,vy:-850});
      if(scenario==="possession"){
        const f=g.debug.fighters[0];Object.assign(f,{chargingPunch:true,punchInputHeld:true,punchAim:{x:1,y:0}});
        g.debug.dashball.state.ball.carrier=f.id;D.possession(g.debug.dashball.state,g.debug.dashball.world(0));
      }
      if(scenario==="respawn")g.debug.dashball.knockout(1);
    }
    const manager=late.rb.manager(0,8),pending=[];
    for(let i=0;i<180;i++){
      const local=R.encode({aimX:1,aimY:-.5,punchHeld:i<30,dashHeld:i%40<8});
      const remote=R.encode({aimX:-1,aimY:i%10<5?-.5:.5,punchHeld:i%29<9,dashHeld:i%31<7});
      pending.push({frame:i,input:remote});if(pending.length>6){const packet=pending.shift();manager.receive(packet.frame,packet.input);}
      assert(manager.advance(local));ref.rb.step([local,remote].map(R.decode));
    }
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();
    assert.equal(late.rb.hash(),ref.rb.hash(),scenario);assert(manager.rollbacks>0);
  }
});
check("ten local CPUs make deterministic ball decisions in all six combinations",()=>{
  const left=createGame(),right=createGame();
  for(const ruleset of ["court","battle"])for(const arena of GOAL_ARENAS.map(a=>a.id)){
    const config={ruleset,arena,teamSize:5};
    for(const g of [left,right])g.debug.dashball.setup(config,{characters:["orbit","spike","rain","anchor","chungus","gunman","archer","whipado"],ai:true,seed:814});
    for(let frame=0;frame<240;frame++){
      left.debug.dashball.step();right.debug.dashball.step();assert.equal(left.rb.hash(),right.rb.hash());
    }
    assert(left.debug.dashball.state.ball.ownerId,"CPUs should interact with the ball");
  }
});
check("separate named Dashball stage registry; wrap basketball shares basket/platform layout",()=>{
  assert.deepEqual(D.ARENAS.map(a=>a.name),["Soccer","Soccer \u2014 Open Arena","Basketball","Wrap Around Basketball","Target Break","Golden Rush","Gravity Flip Soccer","Gravity Flip Soccer \u2014 Open Arena","Boulder Control","Gravity Flip Boulder Control","Total Rush","Field Goal",...D.targetCharge.STAGES.map(a=>a.name),"Golden Rush \u2014 Four-Way Gravity",...Object.values(require("../arena-variants").WIDE).map(a=>a.name)]);
  const closed=D.arena("elevated"),open=D.arena("elevated-open");
  assert.equal(open.wrap,true);assert.equal(open.cameraOpenTop,true);assert.equal(open.fixedCamera,false);
  assert.deepEqual(open.goals,closed.goals);assert.deepEqual(open.ballOnly,closed.ballOnly);
  assert.deepEqual(open.terrain,closed.terrain.filter(t=>t.kind==="floor"||t.goalTeam!==undefined||t.dashballMover));
});
check("ball wraps either side, travels above zero and rolls across the floor seam",()=>{
  for(const sign of [-1,1]){
    const f=fixture({arena:"elevated-open"});Object.assign(f.state.ball,{x:sign>0?2559:1,y:1255.99,vx:sign*1000,vy:0});
    f.tick();assert(sign>0?f.state.ball.x<30:f.state.ball.x>2530);assert(f.state.ball.vx*sign>0);
    f.tick(20);assert(f.state.ball.y<1256.1);assert(f.state.ball.y>1254);assert.equal(f.state.goalSerial,0);
  }
  const f=fixture({arena:"elevated-open"});Object.assign(f.state.ball,{x:1280,y:-30,vx:0,vy:-600});f.tick(10);
  assert(f.state.ball.y<-100);assert(f.state.ball.vy<0);
});
check("Battle fighters wrap without cross-field swept contacts; Court remains divided",()=>{
  for(const ruleset of ["court","battle"]){
    d.dashball.setup({arena:"elevated-open",ruleset});const f=d.fighters[1];
    Object.assign(f,{x:2559,y:-200,prevX:2559,prevY:-200,vx:900,vy:-300,onGround:false});
    d.dashball.step();assert(f.y<-200);
    if(ruleset==="battle"){assert(f.x<30);assert(Math.abs(f.x-f.prevX)<30);}
    else {assert(f.x>1280);assert(f.x<=2560-f.data.width/2);}
  }
});
check("shield possession and body/attack contact work across the wrap seam",()=>{
  const f=fixture({arena:"elevated-open",ruleset:"battle"}),a=fighter();a.x=a.prevX=8;a.y=a.prevY=500;a.shielding=true;a.aim={x:-1,y:0};a.data.shieldThornsDamage=5;
  f.world.fighters=[a];Object.assign(f.state.ball,{x:2558,y:500,vx:0,vy:0});f.tick();
  assert.equal(f.state.ball.carrier,a.id);assert(f.state.ball.x>2460);assert.equal(f.state.goalSerial,0);
  a.shielding=false;D.possession(f.state,f.world);assert.equal(f.state.ball.carrier,null);
  const attack=shot(778,{x:-1,y:0});f.world.attacks=()=>[{fighter:a,attack}];
  f.world.attackTouches=(_entry,rect)=>rect.x<0&&rect.x+rect.w> -120;
  f.tick();assert.equal(f.state.ball.ownerId,a.id);assert(f.state.ball.vx<0);
});
check("wrapped projectile path hits the ball without a phantom cross-field ray",()=>{
  d.dashball.setup({arena:"elevated-open",ruleset:"battle"},{characters:["gunman","anchor"]});
  const f=d.fighters[0],b=d.dashball.state.ball;
  Object.assign(b,{x:10,y:400});f.projectiles=[{...shot(897),projectile:{x:2553,y:400,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.4}}];
  d.updateProjectiles(0);assert.equal(f.projectiles.length,0);assert.equal(b.ownerId,f.id);
  Object.assign(b,{x:1280,y:400});f.projectiles=[{...shot(898),projectile:{x:2553,y:400,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.4}}];
  d.updateProjectiles(0);assert.equal(f.projectiles.length,1);assert(!b.attacks[`${f.id}:898`]);
});
check("open camera includes high ball and fighters without changing simulation",()=>{
  d.dashball.setup({arena:"elevated-open"});d.fighters[0].y=-1500;d.dashball.state.ball.y=-1800;
  const hash=game.rb.hash();d.camera.update(1);const camera=d.camera.state,b=d.dashball.state.ball;
  assert(camera.y<0);assert(camera.zoom<.38);assert.equal(game.rb.hash(),hash);
  const ballY=camera.offset.y+(b.y-camera.y)*camera.zoom;
  const floorY=camera.offset.y+(d.dashball.arena.floorY-camera.y)*camera.zoom;
  assert(ballY>160&&ballY<720);assert(floorY>ballY&&floorY<720);
  d.fighters[0].y=-10000;b.y=1256;d.camera.update(1);const low= d.camera.state;
  const stillVisible=low.offset.y+(b.y-low.y)*low.zoom;assert(stillVisible>160&&stillVisible<720,"an outlying flyer hid the ball");
});
console.log(`${assertions} Dashball groups passed`);
