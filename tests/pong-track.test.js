"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),Guide=require("../sports-guide"),{createGame}=require("./simulation-harness");
const DT=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),neutral=()=>R.decode(R.neutral());
function fixture(time=0){const stage=D.arena("dash-pong-track"),state=D.create({arena:stage.dashballArena},stage);state.pongTrack={time,previous:time};const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:a=>D.pong.terrain(state,stage,a)};return {stage,state,world,tick(){D.step(state,DT,world);}};}
function shot(f,team,speed=1500,offset=0){const g=D.goalTransforms(f.state,f.stage).find(g=>g.team===team),p=D.pong.point(g),b=f.state.ball;Object.assign(b,{x:p.x-p.nx*1+p.ny*offset,y:p.y-p.ny*1-p.nx*offset,vx:p.nx*speed,vy:p.ny*speed,pongSpeed:0,carrier:null});return b;}
function setup(size=1,ai=false){const g=createGame();g.debug.dashball.setup({arena:"dash-pong-track",ruleset:"battle",teamSize:size},{characters:["anchor","rain","boomerangus","spike","ember"],ai,seed:217});g.debug.matchFlow.begin({countdown:false});g.debug.dashball.state.phase="playing";return g;}
test("separate appended stage preserves original Pong and reuses authoritative Battle settings",()=>{
  const stage=D.arena("dash-pong-track"),s=D.create({arena:stage.dashballArena,ruleset:"court"},stage),g=setup();assert(stage.pong&&stage.pongTrack&&stage.fixedCamera);assert.equal(stage.width,2240);assert.equal(stage.height,1280);assert.equal(stage.cameraZoom,.5);assert.equal(stage.terrain.length,6);assert.equal(stage.terrain.filter(t=>t.pongPerch!==undefined).length,2);assert(!stage.gravitySwitch&&!stage.wrap);assert.equal(s.config.ruleset,"battle");assert.equal(s.config.gravity,0);assert.equal(s.config.winningScore,10);assert.equal(s.config.duration,300);assert.equal(D.ARENAS.at(-1).id,stage.dashballArena);assert.equal(g.rb.stageNames.at(-1),stage.name);
  const c=Guide.dashballConfig(D.options({arena:"dash-pong",duration:180,winningScore:7,pongMaxSpeed:1700}),stage.dashballArena);assert.equal(c.duration,180);assert.equal(c.winningScore,7);assert.equal(c.maxSpeed,1700);assert.match(Guide.scene("dashball",c).guide.twist,/72-second/);
});
test("72-second track stays mirrored inside each half, continuous at corners, with two-second pauses",()=>{
  const f=fixture();let previous;for(let n=0;n<=4320;n++){const time=n*DT;f.state.pongTrack={time,previous:time};const[a,b]=D.goalTransforms(f.state,f.stage);near(a.x+b.x,f.stage.width);near(a.y,b.y);assert(a.x<f.stage.width/2&&b.x>f.stage.width/2);for(const g of[a,b]){near(g.segments.reduce((n,s)=>n+s.high-s.low,0),440);for(const s of g.segments){assert(s.high>s.low);if(s.axis==="y")assert(g.team===1?s.high<=1076:s.low>=1164);}}if(previous)assert(Math.hypot(a.x-previous.x,a.y-previous.y)<2.3);previous=a;}
  for(const[time,edge]of[[0,"wall"],[18,"ceiling"],[36,"wall"],[54,"floor"]]){const a=fixture(time),b=fixture(time+1.99);assert.deepEqual(D.goalTransforms(a.state,a.stage),D.goalTransforms(b.state,b.stage));assert.equal(D.goalTransforms(a.state,a.stage)[0].segments[0].edge,edge);}
  const a=fixture(0),b=fixture(72);assert.deepEqual(D.goalTransforms(a.state,a.stage),D.goalTransforms(b.state,b.stage));
});
test("moving openings cut the exact ball boundaries while fighters retain a continuous solid floor",()=>{
  for(const time of[0,9,18,36,45,54,63]){const f=fixture(time),terrain=D.pong.terrain(f.state,f.stage);for(const g of D.goalTransforms(f.state,f.stage))for(const s of g.segments){const p={x:s.axis==="x"?s.line:(s.low+s.high)/2,y:s.axis==="y"?s.line:(s.low+s.high)/2,r:1};assert(!terrain.some(r=>D.circleRect(p,r)),`${time}/${s.edge}`);}assert(f.stage.terrain.some(r=>r.kind==="floor"&&r.x===0&&r.w===f.stage.width));}
});
test("inactive/finished rounds freeze the track; fresh rounds restore its wall start",()=>{
  const f=fixture(18),saved=plain(f.state.pongTrack);f.state.phase="finished";for(let n=0;n<120;n++)f.tick();assert.deepEqual(f.state.pongTrack,saved);const fresh=D.create(f.state.config,f.stage);assert.deepEqual(fresh.pongTrack,{time:0,previous:0});assert.equal(D.goalTransforms(fresh,f.stage)[0].segments[0].edge,"wall");
});
test("future core manifest includes each sport once and preserves the appended Pong stage order",()=>{
  const fs=require("node:fs"),vm=require("node:vm"),builder=fs.readFileSync("tools/build-core-release.cjs","utf8"),expression=builder.match(/manifest\.stageOrder=(\[.*\]);/)[1];const names=vm.runInNewContext(expression,{initialCoreStages:[{name:"core"}],arenas:D.ARENAS,manifest:{sandbagArenas:[]},variants:require("../arena-variants"),sport:D,deferredStage:{name:"rotor"}});assert.deepEqual([...names.slice(-2)],["Dash Pong","Dash Pong - Moving Goals"]);for(const arena of D.ARENAS)assert.equal(names.filter(n=>n===arena.name).length,1,arena.id);
});
test("both teams score through wall, ceiling and floor with slow/fast shots; reset is stationary and exactly once",()=>{
  for(const time of[0,9,18,27,36,45,54,63])for(const team of[0,1])for(const speed of[40,1600,1e6]){const f=fixture(time),old=shot(f,team,speed),events=[];f.world.onGoal=t=>events.push(t);for(let n=0;n<3;n++)f.tick();assert.equal(f.state.goalSerial,1,`${time}/${team}/${speed}`);assert.equal(f.state.scores[1-team],1);assert.deepEqual(events,[1-team]);assert.notEqual(f.state.ball,old);near(f.state.ball.x,f.stage.width/2);near(f.state.ball.y,f.stage.height/2);near(f.state.ball.vx,0);near(f.state.ball.vy,0);f.tick();assert.equal(f.state.goalSerial,1);}
});
test("misses and rim grazes ricochet; approach from outside, stationary overlap and moving aperture do not score",()=>{
  for(const time of[0,18,54])for(const team of[0,1]){
    const f=fixture(time),b=shot(f,team,1500,235),p=D.pong.point(D.goalTransforms(f.state,f.stage).find(g=>g.team===team));b.x-=p.nx*(b.r+4);b.y-=p.ny*(b.r+4);for(let n=0;n<5;n++)f.tick();assert.equal(f.state.goalSerial,0);assert(b.vx*p.nx+b.vy*p.ny<=0);
    const behind=fixture(time),z=shot(behind,team,300);z.x+=p.nx*3;z.y+=p.ny*3;z.vx*=-1;z.vy*=-1;behind.tick();assert.equal(behind.state.goalSerial,0);
  }
  const still=fixture(3),p=D.pong.point(D.goalTransforms(still.state,still.stage)[0]);Object.assign(still.state.ball,{x:p.x,y:p.y,vx:0,vy:0});for(let n=0;n<120;n++)still.tick();assert.equal(still.state.goalSerial,0);
});
test("native world floor/ceiling goals preserve every fighter state and do not restart the moving track",()=>{
  for(const time of[18,54]){const g=setup(3),d=g.debug,s=d.dashball.state;s.pongTrack={time,previous:time};d.fighters.forEach((f,i)=>Object.assign(f,{x:500+i*200,y:600,health:f.health-i,airDashes:0,shieldHealth:3}));const before=plain(g.rb.save().core.fighters);shot({state:s,stage:d.dashball.arena},0);d.dashball.ballStep();assert.equal(s.goalSerial,1);assert.deepEqual(plain(g.rb.save().core.fighters),before);assert(s.pongTrack.time>=time&&s.pongTrack.time<time+.1);assert.equal(s.phase,"playing");}
});
test("closed areas keep full Pong momentum with no floor loss or escape throughout a moving cycle",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{vx:350,vy:-470});for(let n=0;n<4320;n++){f.tick();if(f.state.ball===b)near(Math.hypot(b.vx,b.vy),Math.hypot(350,470));assert(f.state.ball.x>=0&&f.state.ball.x<=f.stage.width);assert(f.state.ball.y>=0&&f.state.ball.y<=f.stage.height);}assert(f.state.pongTrack.time>71.99);
});
test("goal prediction follows floor/ceiling targets and team defenders use ordinary bounded positions",()=>{
  const g=setup(5),d=g.debug,s=d.dashball.state;for(const[time,sign]of[[18,-1],[54,1]]){s.pongTrack={time,previous:time};const hash=g.rb.hash(),plans=d.fighters.map(f=>D.pong.plan(s,d.dashball.arena,f,d.dashball.world(0)));assert.equal(g.rb.hash(),hash);assert(plans.every(p=>p.aim.y*sign>0));assert(new Set(plans.map(p=>`${Math.round(p.target.x)}/${Math.round(p.target.y)}`)).size>=5);assert(plans.every(p=>Number.isFinite(p.target.x)&&Number.isFinite(p.target.y)));}
});
test("snapshot installation, replay and delayed rollback reproduce moving goals and scoring",()=>{
  for(const time of[9,18,54]){const a=setup(),b=setup();for(const g of[a,b]){g.debug.dashball.state.pongTrack={time,previous:time};shot({state:g.debug.dashball.state,stage:g.debug.dashball.arena},0);}const start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
    for(let n=0;n<120;n++){const row=[R.encode({hasAim:true,aimX:1,dashHeld:n%41<3}),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(n*.13),punchHeld:n%29<3})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());assert(a.debug.dashball.state.goalSerial>0);const hash=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.deepEqual(plain(a.debug.dashball.state),plain(b.debug.dashball.state));}
});
test("30/60/120Hz give identical movement, timers and scoring through a track stop",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.dashball.state.pongTrack={time:17,previous:17};Object.assign(g.debug.dashball.state.ball,{vx:500,vy:-200});for(let n=1;n<=hz*3;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("round score limit, timed overtime, next round and rematch reuse best-of-three resets",()=>{
  const g=setup(),d=g.debug;for(let round=0;round<2;round++){const s=d.dashball.state;s.pongTrack={time:54,previous:54};s.scores[1]=9;shot({state:s,stage:d.dashball.arena},0);g.rb.step(d.fighters.map(neutral));assert.equal(d.matchFlow.state.phase,"roundEnd");while(d.matchFlow.state.phase==="roundEnd")g.rb.step(d.fighters.map(neutral));if(d.matchFlow.state.phase!=="finished"){assert.equal(d.dashball.state.pongTrack.time,0);assert.deepEqual(plain(d.dashball.state.scores),[0,0]);while(d.matchFlow.state.phase==="countdown")g.rb.step(d.fighters.map(neutral));}}
  assert.equal(d.matchFlow.state.wins[1],2);d.dashball.setup({arena:"dash-pong-track"});assert.deepEqual(plain(d.dashball.state.pongTrack),{time:0,previous:0});
  d.matchFlow.begin({countdown:false});d.matchFlow.state.remainingTicks=1;g.rb.step(d.fighters.map(neutral));assert(d.matchFlow.state.overtime);shot({state:d.dashball.state,stage:d.dashball.arena},1);g.rb.step(d.fighters.map(neutral));assert.equal(d.matchFlow.state.roundWinner,0);
});
for(const size of[1,3,5])test(`${size}v${size} native teams, CPUs and moving-stage rendering stay deterministic`,()=>{
  const a=setup(size,true),b=setup(size,true);for(const g of[a,b])g.debug.dashball.state.pongTrack={time:17,previous:17};for(let n=0;n<90;n++){a.debug.dashball.step();b.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash());}const hash=a.rb.hash();a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),hash);assert(a.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));
});
