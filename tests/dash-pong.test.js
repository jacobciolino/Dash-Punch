"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),{test}=require("node:test");
const {createGame}=require("./simulation-harness"),D=require("../dashball"),R=require("../rollback"),Guide=require("../sports-guide");
const ROOT=path.resolve(__dirname,".."),DT=1/60,T=D.pong.tuning;
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const input=(frame=0,i=0)=>R.decode(R.encode({aimX:frame%120<60?1:-1,aimY:-.3,hasAim:true,
  punchHeld:(frame+i*7)%50<12,dashHeld:(frame+i*5)%90<9}));
function fixture(config={}){
  const stage=D.arena("dash-pong"),state=D.create({arena:"dash-pong",...config},stage);
  const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:()=>stage.terrain,
    body:f=>({x:f.x-20,y:f.y-33,w:40,h:66}),shielding:()=>false,shieldCovers:()=>true,shieldPadding:()=>24,kicking:()=>false};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++)D.step(state,DT,world);}};
}
function setup(size=1,characters=["anchor","orbit"],ai=false){const g=createGame(ROOT);
  g.debug.dashball.setup({arena:"dash-pong",teamSize:size},{characters,ai,seed:8123});return g;}
function launch(f,side,speed=1600,y=f.stage.height/2){const b=f.state.ball,g=f.stage.goals[side];
  Object.assign(b,{x:g.line-g.sign*8,y,vx:g.sign*speed,vy:0,pongSpeed:0,carrier:null});return b;}
function pose(f,x,y,more={}){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,invulnerable:0,
  hitstop:0,hitstun:0,punchInputHeld:false,wallSliding:false,wallClinging:false,...more});}

test("registered compact closed chamber, blue-left mapping and authoritative defaults",()=>{
  const {stage,state}=fixture({ruleset:"court",gravity:900,bounce:.2,groundFriction:4,overtime:false});
  assert.equal(D.ARENAS.filter(a=>a.id==="dash-pong").length,1);
  assert.equal(stage.leftTeam,1);assert.equal(stage.wrap,false);assert.equal(stage.cameraOpenTop,undefined);
  assert.equal(stage.gravitySwitch,undefined);assert.equal(stage.terrain.length,8);assert.equal(stage.terrain.filter(t=>t.pongPerch!==undefined).length,2);
  assert.equal(stage.cameraZoom/D.arena("tri-ball").cameraZoom,T.cameraZoom/.26);
  assert(stage.cameraHeader+stage.height*stage.cameraZoom<=720);
  assert.deepEqual([state.config.ruleset,state.config.duration,state.config.winningScore,state.config.overtime],["battle",300,10,true]);
  assert.deepEqual([state.config.gravity,state.config.bounce,state.config.groundFriction],[0,1,0]);
  assert.equal(state.ball.r,34);assert.equal(state.config.maxSpeed,1600);
  assert.equal(D.options({arena:"dash-pong",pongMaxSpeed:99999}).maxSpeed,2200);
  assert.equal(D.options({arena:"dash-pong",pongMaxSpeed:0}).maxSpeed,800);
  const c=Guide.dashballConfig(D.options({arena:"tri-ball"}),"dash-pong");
  assert.equal(c.duration,300);assert.equal(c.winningScore,10);assert.equal(c.ruleset,"battle");
  const scene=Guide.scene("dashball",c);assert.match(scene.guide.objective,/gravity-free/);assert.match(scene.guide.scoring,/Best of three/);
});
test("stationary exact-center spawn has no passive gravity or drift",()=>{
  const f=fixture(),before=plain(f.state.ball);f.tick(300);
  near(f.state.ball.x,f.stage.width/2);near(f.state.ball.y,f.stage.height/2);
  near(f.state.ball.vx,0);near(f.state.ball.vy,0);assert.equal(f.state.ball.pongHits,0);
  assert.equal(f.state.goalSerial,0);assert.equal(before.ownerId,null);
  f.world.fighters=[{id:"p1",team:1,x:f.state.ball.x,y:f.state.ball.y,prevX:f.state.ball.x,prevY:f.state.ball.y,vx:0,vy:0,data:{}}];
  f.tick(120);near(f.state.ball.x,f.stage.width/2);near(f.state.ball.y,f.stage.height/2);assert.equal(f.state.ball.pongHits,0);
});
test("zero gravity preserves arbitrary momentum in free flight",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{vx:123,vy:-47});f.tick(120);
  near(b.x,f.stage.width/2+246);near(b.y,f.stage.height/2-94);near(b.vx,123);near(b.vy,-47);
});
test("ceiling, floor, side segments and corner ricochets retain speed, including low vertical speeds",()=>{
  for(const axis of ["ceiling","floor","left","right","corner"])for(const speed of [35,1500,2200]){
    const f=fixture({pongMaxSpeed:2200}),b=f.state.ball;let wallEvents=0;f.world.onPongWall=()=>wallEvents++;
    if(axis==="ceiling")Object.assign(b,{y:T.wall+b.r+.1,vx:37,vy:-speed});
    if(axis==="floor")Object.assign(b,{y:f.stage.floorY-b.r-.1,vx:37,vy:speed});
    if(axis==="left")Object.assign(b,{x:T.wall+b.r+.1,y:200,vx:-speed,vy:37});
    if(axis==="right")Object.assign(b,{x:f.stage.width-T.wall-b.r-.1,y:200,vx:speed,vy:37});
    if(axis==="corner")Object.assign(b,{x:T.wall+b.r+.1,y:T.wall+b.r+.1,vx:-speed*.6,vy:-speed*.8});
    const before=Math.min(2200,Math.hypot(b.vx,b.vy));f.tick();near(Math.hypot(b.vx,b.vy),before);
    assert(wallEvents>=1);assert.equal(b.pongHits,0);assert.equal(f.state.goalSerial,0);
    assert(b.x>=T.wall+b.r&&b.x<=f.stage.width-T.wall-b.r);assert(b.y>=T.wall+b.r&&b.y<=f.stage.floorY-b.r);
  }
});
test("slow, fast and shallow-angle goal entries score the opposing team exactly once",()=>{
  for(const side of [0,1])for(const speed of [40,1600,1e6])for(const vy of [0,50,-50]){
    const f=fixture(),events=[];f.world.onGoal=t=>events.push(t);const old=launch(f,side,speed);
    old.vy=vy;old.x=f.stage.goals[side].line-f.stage.goals[side].sign*.1;
    f.tick(2);assert.notEqual(f.state.ball,old);assert.deepEqual(f.state.scores,side===0?[1,0]:[0,1]);
    assert.deepEqual(events,[side===0?0:1]);assert.equal(f.state.goalSerial,1);assert.equal(f.state.phase,"playing");
    f.tick(60);assert.equal(f.state.goalSerial,1);assert.equal(f.state.ball.pongHits,0);
    near(f.state.ball.x,f.stage.width/2);near(f.state.ball.y,f.stage.height/2);near(f.state.ball.vx,0);near(f.state.ball.vy,0);
  }
});
test("goal edges obey the visible solid posts, without invisible precision or overlap-only scoring",()=>{
  for(const side of [0,1])for(const offset of [0,40,80]){
    const f=fixture(),g=f.stage.goals[side],b=launch(f,side,1600,g.top+T.ballRadius-offset);
    b.x=g.line-g.sign*(b.r+2);f.tick(3);assert.equal(f.state.goalSerial,offset===0?1:0);
    if(offset>0)assert(b.vx*g.sign<=0);
  }
  const f=fixture(),g=f.stage.goals[0],b=f.state.ball;Object.assign(b,{x:g.line-2,y:(g.top+g.bottom)/2,vx:100,vy:0});
  f.tick();assert.equal(f.state.goalSerial,0,"motion back into the court is not a goal");
});
test("native attacks launch at starting speed, then accelerate by contacts, preserving direction and dedup",()=>{
  const f=fixture({pongMaxSpeed:800}),b=f.state.ball,fighter={id:"p1",team:1,data:{punchKnockback:800,punchDamage:15}},attack={id:1,dir:{x:.6,y:-.8},charge:1};
  assert(D.shot(f.state,fighter,attack,f.world));near(b.vx,T.startSpeed*.6);near(b.vy,-T.startSpeed*.8);assert.equal(b.pongHits,1);
  assert(!D.shot(f.state,fighter,attack,f.world));assert.equal(b.pongHits,1);
  for(let n=2;n<25;n++){assert(D.shot(f.state,fighter,{...attack,id:n},f.world));near(Math.hypot(b.vx,b.vy),Math.min(800,520+(n-1)*55));}
  assert.equal(b.pongHits,24);near(b.vx/Math.hypot(b.vx,b.vy),.6);
  b.x=T.wall+b.r+1;b.y=200;b.vx=-b.pongSpeed;b.vy=0;f.tick();near(Math.hypot(b.vx,b.vy),800);assert.equal(b.pongHits,24);
});
test("multiple fighters and projectile-style strikes share one ball and contact ledger",()=>{
  const f=fixture(),b=f.state.ball;
  for(const [i,dir]of[{x:1,y:0},{x:0,y:-1},{x:-1,y:0}].entries()){
    const fighter={id:`p${i}`,team:i%2,data:{punchKnockback:400,punchDamage:8}};
    assert(D.shot(f.state,fighter,{id:1,dir,projectile:{knockback:600}},f.world));
    near(Math.hypot(b.vx,b.vy),520+55*i);near(b.vx/(520+55*i),dir.x);assert.equal(b.ownerId,fighter.id);
  }
  assert.equal(b.pongHits,3);
});
test("body and shield contacts preserve rally momentum but persistent overlap does not farm acceleration",()=>{
  for(const shield of [false,true]){
    const f=fixture(),fighter={id:"p1",team:1,x:700,y:600,prevX:700,prevY:600,vx:0,vy:0,data:{}},b=f.state.ball;
    f.world.fighters=[fighter];f.world.shielding=()=>shield;f.world.shieldAim=()=>({x:1,y:0});
    Object.assign(b,{x:750,y:600,vx:-700,vy:0,pongSpeed:700,pongHits:2});f.tick();assert.equal(b.pongHits,3);
    near(Math.hypot(b.vx,b.vy),755);
    for(let n=0;n<60;n++){Object.assign(b,{x:750,y:600,vx:-755,vy:0});f.tick();}
    assert.equal(b.pongHits,3,"one persistent contact generation");
    b.x=1100;f.tick(20);Object.assign(b,{x:750,y:600,vx:-755,vy:0});f.tick();assert.equal(b.pongHits,4);
  }
});
test("goal does not reset any fighter health, attacks, resources, KO timers or positions",()=>{
  const g=setup(2),d=g.debug,s=d.dashball.state,stage=d.dashball.arena;
  for(const [i,f]of d.fighters.entries()){pose(f,500+i*250,1050);f.health-=i+1;f.airDashes=0;f.shieldHealth=3;}
  s.respawns.p1=7;const fighters=d.fighters.map(f=>plain({x:f.x,y:f.y,vx:f.vx,vy:f.vy,health:f.health,airDashes:f.airDashes,shieldHealth:f.shieldHealth}));
  launch({state:s,stage},0);d.dashball.ballStep();
  assert.deepEqual(d.fighters.map(f=>plain({x:f.x,y:f.y,vx:f.vx,vy:f.vy,health:f.health,airDashes:f.airDashes,shieldHealth:f.shieldHealth})),fighters);
  assert.equal(s.respawns.p1,7);assert.equal(s.pause,0);assert.equal(s.phase,"playing");assert.equal(s.goalSerial,1);
});
test("score limit removes the old ball without another active spawn; timeout and tied sudden death",()=>{
  const f=fixture();f.state.scores[1]=9;const old=launch(f,1);f.tick();assert.equal(f.state.winner,1);assert.equal(f.state.phase,"finished");assert.equal(f.state.ball,old);f.tick(60);assert.equal(f.state.goalSerial,1);
  const timed=fixture();timed.state.remaining=DT;timed.state.scores=[3,4];D.clock(timed.state,DT,timed.stage);assert.equal(timed.state.winner,1);
  const tied=fixture();tied.state.remaining=DT;D.clock(tied.state,DT,tied.stage);assert(tied.state.overtime);assert.equal(tied.state.phase,"playing");launch(tied,0);tied.tick();assert.equal(tied.state.winner,0);
});
test("actual best-of-three resets ball, scores and timer between rounds and rematch",()=>{
  for(const winners of [[1,1],[1,0,1]]){
    const g=setup(),d=g.debug;d.matchFlow.begin({countdown:false});
    for(const winner of winners){const s=d.dashball.state;s.scores[winner]=9;launch({state:s,stage:d.dashball.arena},winner===0?0:1);g.rb.step(d.fighters.map(()=>input()));
      assert.equal(d.matchFlow.state.phase,"roundEnd");
      while(d.matchFlow.state.phase==="roundEnd")g.rb.step(d.fighters.map(()=>R.decode(R.neutral())));
      if(d.matchFlow.state.phase!=="finished"){
        assert.deepEqual(plain(d.dashball.state.scores),[0,0]);assert.equal(d.matchFlow.state.remainingTicks,18000);assert.equal(d.dashball.state.ball.pongHits,0);
        while(d.matchFlow.state.phase==="countdown")g.rb.step(d.fighters.map(()=>R.decode(R.neutral())));
      }
    }
    assert.equal(d.matchFlow.state.phase,"finished");assert.equal(d.matchFlow.state.wins[1],2);
    d.dashball.setup({arena:"dash-pong"});d.matchFlow.begin({countdown:false});assert.deepEqual(plain(d.matchFlow.state.wins),[0,0]);assert.equal(d.dashball.state.remaining,300);
  }
});
test("native match clock chooses leader at five minutes, ties continue to the next goal",()=>{
  for(const tie of [false,true]){const g=setup(),d=g.debug;d.matchFlow.begin({countdown:false});d.matchFlow.state.remainingTicks=1;d.dashball.state.scores=[2,tie?2:1];
    g.rb.step(d.fighters.map(()=>R.decode(R.neutral())));
    assert.equal(d.matchFlow.state.phase,tie?"playing":"roundEnd");
    if(tie){assert(d.matchFlow.state.overtime);launch({state:d.dashball.state,stage:d.dashball.arena},1);g.rb.step(d.fighters.map(()=>R.decode(R.neutral())));assert.equal(d.matchFlow.state.roundWinner,1);}
    else assert.equal(d.matchFlow.state.roundWinner,0);
  }
});
for(const size of [1,2,3,4,5])test(`${size}v${size}: native spawns, independent replay, snapshots and draw purity`,()=>{
  const a=setup(size),b=setup(size);assert.equal(a.debug.fighters.length,size*2);
  for(const f of a.debug.fighters)assert.equal(f.x<a.debug.dashball.arena.width/2,f.team===1);
  for(const g of[a,b])launch({state:g.debug.dashball.state,stage:g.debug.dashball.arena},0);
  const saved=a.rb.save(),rows=[];
  for(let n=0;n<150;n++){const inputs=a.debug.fighters.map((_,i)=>input(n,i));rows.push(inputs);assert.equal(a.rb.step(inputs),b.rb.step(inputs));}
  assert(a.debug.dashball.state.goalSerial>0);const hash=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
  b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.deepEqual(plain(a.debug.dashball.state),plain(b.debug.dashball.state));
  a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),hash);
});
test("delayed inputs reconcile through a goal and immediate stationary replacement",()=>{
  const a=setup(),b=setup();for(const g of[a,b]){g.debug.matchFlow.begin({countdown:false});launch({state:g.debug.dashball.state,stage:g.debug.dashball.arena},0);}
  const manager=b.rb.manager(0,8),pending=[];
  for(let n=0;n<240;n++){const row=[input(n,0),input(n,1)],encoded=row.map(R.encode);pending.push({frame:n,input:encoded[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(encoded[0]));a.rb.step(row);}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());assert(a.debug.dashball.state.goalSerial>0);
});
test("30/60/120Hz render schedules advance identical fixed-step rallies",()=>{
  const hashes=[];
  for(const hz of[30,60,120]){const g=setup(),d=g.debug;d.matchFlow.begin({countdown:false});Object.assign(d.dashball.state.ball,{x:1000,y:90,vx:350,vy:-500,pongSpeed:0});
    const ticks=d.matchFlow.state.remainingTicks;for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);
    assert.equal(ticks-d.matchFlow.state.remainingTicks,120);near(d.dashball.state.time,2);hashes.push(g.rb.hash());}
  assert.equal(hashes[0],hashes[1]);assert.equal(hashes[1],hashes[2]);
});
test("ten native CPUs use deterministic distributed plans and make real ball contacts",()=>{
  const a=setup(5,["anchor","orbit","spike","boomerangus","icer"],true),b=setup(5,["anchor","orbit","spike","boomerangus","icer"],true);
  const hash=a.rb.hash(),plans=a.debug.fighters.map(f=>D.pong.plan(a.debug.dashball.state,a.debug.dashball.arena,f,a.debug.dashball.world(0)));
  assert.equal(a.rb.hash(),hash);assert(new Set(plans.map(p=>p.target.x)).size>=4);
  let hits=0;for(let n=0;n<600;n++){a.debug.dashball.step();b.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash());hits=Math.max(hits,a.debug.dashball.state.ball.pongHits);assert(a.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));}
  assert(hits>0);
});
test("existing sports retain their actual pre-change options, geometry, scoring and free-ball trajectories",{skip:!process.env.REGRESSION_BEFORE_DIR},()=>{
  const before=process.env.REGRESSION_BEFORE_DIR;assert(before,"REGRESSION_BEFORE_DIR must point to the pre-change Git export");const Old=require(path.join(before,"dashball.js"));
  for(const {id}of Old.ARENAS){
    const c=Old.options({arena:id}),stage=Old.arena(id,154,c),state=Old.create(c,stage);
    assert.deepEqual(D.options({arena:id}),c,id);assert.deepEqual(D.arena(id,154,c),stage,id);assert.deepEqual(D.create(c,stage),state,id);
    if(state.targetCharge||state.golden||state.boulder||state.tri||state.sticky)continue;
    const current=D.create(c,stage),world={stage,fighters:[],attacks:()=>[],terrain:()=>stage.terrain.concat(stage.ballOnly),attackTouches:()=>false};
    for(const s of[state,current])Object.assign(s.ball,{vx:600,vy:-500});
    for(let n=0;n<120;n++){Old.step(state,DT,world);D.step(current,DT,world);}assert.deepEqual(current,state,id);
  }
});
test("all pre-existing arena IDs and seeded native sports simulations match the pre-change export",{skip:!process.env.REGRESSION_BEFORE_DIR},()=>{
  const a=createGame(ROOT),b=createGame(process.env.REGRESSION_BEFORE_DIR);
  assert.deepEqual(plain(a.rb.stageNames.slice(0,b.rb.stageNames.length)),plain(b.rb.stageNames));
  for(const {id}of b.sandbox.Dashball.ARENAS){
    for(const g of[a,b])g.debug.dashball.setup({arena:id,teamSize:1},{characters:["boomerangus","edgebert"],ai:true,seed:171});
    for(let n=0;n<60;n++){a.debug.dashball.step();b.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash(),`${id}/${n}`);}
  }
});
test("all core melee fighters use their actual active punch; projectiles, ghost and possession stay native",()=>{
  const g=setup(),d=g.debug;
  const core=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","kite","chungus","defiplate","phantom","booster","lamer","reflektor","lancer","icer"];
  for(const key of core){
    d.dashball.setup({arena:"dash-pong"},{characters:[key,"anchor"]});const f=d.fighters[0],b=d.dashball.state.ball;
    pose(f,800,700);pose(d.fighters[1],1800,1100);d.booster.punch(0,.5,{x:1,y:0});f.attack.age=f.attack.startup+.01;
    const box=d.getPunchHitbox(0,f.attack.dir,.5),spear=key==="lancer"?d.lancer.pose():null;
    Object.assign(b,{x:spear?spear.x+spear.length-6:box.cx,y:spear?spear.y:box.cy,vx:0,vy:0});d.dashball.ballStep(0);
    assert(b.pongHits>0,`${key} native punch must contact the ball`);near(Math.hypot(b.vx,b.vy),520);
  }
  for(const key of["gunman","archer","boomerangus"]){
    d.dashball.setup({arena:"dash-pong"},{characters:[key,"anchor"]});const f=d.fighters[0],b=d.dashball.state.ball;
    pose(f,500,700);pose(d.fighters[1],1800,1100);Object.assign(b,{x:740,y:700});d.booster.punch(0,0,{x:1,y:0});
    let placed=false;
    for(let n=0;n<60&&!b.pongHits;n++){
      d.gravity.physics(0);
      const shot=f.projectiles[0]?.projectile;
      if(shot&&!placed){b.x=shot.x+100;b.y=shot.y;placed=true;}
      d.updateProjectiles();
    }
    assert(b.pongHits>0,`${key} native projectile`);
  }
  d.dashball.setup({arena:"dash-pong"},{characters:["phantom","anchor"]});let f=d.fighters[0],b=d.dashball.state.ball;
  pose(f,800,700);d.gravity.dash(0,{x:1,y:0});Object.assign(b,{x:f.x,y:f.y,vx:0,vy:0});d.dashball.ballStep(0);assert.equal(b.pongHits,0);near(b.vx,0);
  d.dashball.setup({arena:"dash-pong"},{characters:["spike","anchor"]});f=d.fighters[0];b=d.dashball.state.ball;pose(f,800,700,{chargingPunch:true,punchInputHeld:true,punchAim:{x:1,y:0}});
  Object.assign(b,{x:860,y:700,vx:-700,vy:0,pongSpeed:700,pongHits:2});d.dashball.ballStep(0);assert.equal(b.carrier,f.id);near(b.vx,0);f.punchExhausted=true;d.dashball.ballStep(0);assert.equal(b.carrier,null);
});
