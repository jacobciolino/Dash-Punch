"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),T=require("../target-charge"),R=require("../rollback"),{createGame}=require("./simulation-harness"),{hashes}=require("./total-rush-regression");
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),dt=1/60;let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(kind="stationary",config={}){
  const arena=`target-charge-${kind}`,stage=D.arena(arena),state=D.create({...config,arena},stage);let seed=42;
  const world={stage,gravity:{x:0,y:1},fighters:[],terrain:()=>stage.terrain,attacks:()=>[],random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){const result=D.clock(state,dt,stage);if(result.play)D.step(state,dt,world);}}};
}
function impact(f,team=0,speed=1000){const b=D.balls(f.state).find(b=>b.scoringTeam===team),t=f.state.targetCharge.target,sign=team?1:-1;Object.assign(b,{x:t.x+sign*(t.r+b.r+2),y:t.y,vx:-sign*speed,vy:0,carrier:null});delete f.state.targetCharge.contacts[b.id];return b;}
function direct(f,team=0,{closing=1000,tangent=0,targetV=0,oldGap=2}={}){
  const b=D.balls(f.state).find(b=>b.scoringTeam===team),t=f.state.targetCharge.target,r=b.r+t.r;
  Object.assign(t,{vx:targetV,vy:0});Object.assign(b,{x:t.x-r+.5,y:t.y,vx:targetV+closing,vy:tangent});
  T.collide(f.state,b,{x:t.x-r-oldGap,y:t.y},{x:t.x,y:t.y},f.world);return b;
}
check("three adjacent Battle-only stages use one closed Soccer arena and validated charge targets",()=>{
  const first=D.ARENAS.findIndex(a=>a.id===T.STAGES[0].id);assert.deepEqual(D.ARENAS.slice(first,first+3).map(a=>a.id),T.STAGES.map(a=>a.id));
  for(const s of T.STAGES)for(const winningScore of T.TUNING.targets){const f=fixture(s.kind,{ruleset:"court",winningScore});assert.equal(f.state.config.ruleset,"battle");assert.equal(f.state.config.winningScore,winningScore);assert.equal(f.state.config.healthMult,.5);assert.equal(f.state.config.respawn,15);assert.equal(f.stage.width,2560);assert.equal(f.stage.height,1440);assert.equal(f.stage.floorY,1280);assert(!f.stage.wrap&&!f.stage.cameraOpenTop);assert.equal(f.stage.goals.length,0);assert.equal(f.stage.terrain.length,4);assert.equal(D.balls(f.state).length,2);}
  assert.equal(fixture("stationary",{winningScore:1}).state.config.winningScore,100);assert.equal(D.options({arena:"standard",ruleset:"court"}).ruleset,"court");
});
check("all anchors, fractional interpolation, monotonicity and extreme-speed cap",()=>{
  for(const [speed,percent] of T.ANCHORS)assert.equal(T.chargeUnits(speed),percent*60000);
  assert.equal(T.chargeUnits(300),120000);assert.equal(T.chargeUnits(1),300);assert.equal(T.chargeUnits(-500),0);assert.equal(T.chargeUnits(999999),32*60000);
  let previous=0;for(let speed=0;speed<=3000;speed++){const n=T.chargeUnits(speed);assert(Number.isInteger(n)&&n>=previous);previous=n;}
});
check("pre-response normal closing velocity includes target motion, excludes tangential speed and separating contacts",()=>{
  for(const tangent of [0,2000]){const f=fixture();direct(f,0,{closing:600,tangent});assert.equal(f.state.targetCharge.pending[0],6*60000);}
  const moving=fixture();const b=direct(moving,1,{closing:800,targetV:-800});assert.equal(b.vx,0+(1+moving.state.config.bounce)*800*-1);assert.equal(moving.state.targetCharge.pending[1],10*60000);
  for(const closing of [0,-500]){const f=fixture();direct(f,0,{closing});assert.deepEqual(f.state.targetCharge.pending,[0,0]);}
});
check("permanent ownership, not last touch, receives charge and survives redirects",()=>{
  const f=fixture();Object.assign(f.state.ball,{ownerId:"enemy",ownerTeam:1});direct(f);T.resolve(f.state,D.finish);assert.equal(f.state.scores[0],14);assert.equal(f.state.scores[1],0);assert.equal(f.state.ball.scoringTeam,0);
  const g=createGame();g.debug.dashball.setup({arena:"target-charge-stationary"},{characters:["orbit","spike"]});const state=g.debug.dashball.state,ball=state.ball;
  assert(g.debug.dashball.shot(1,{id:234,dir:{x:-1,y:-1},charge:1,grounded:false,hitTargets:new Set()}));assert.equal(ball.scoringTeam,0);assert.equal(ball.ownerTeam,1);
});
check("resting overlap, spawn correction and repeated callbacks never score; true separated rebounds rearm",()=>{
  const f=fixture();direct(f,0,{oldGap:-20});assert.deepEqual(f.state.targetCharge.pending,[0,0]);
  const g=fixture();direct(g);assert.equal(g.state.targetCharge.pending[0],14*60000);for(let i=0;i<10;i++)direct(g);assert.equal(g.state.targetCharge.pending[0],14*60000);
  const b=g.state.ball,t=g.state.targetCharge.target;Object.assign(b,{x:t.x-t.r-b.r-4,y:t.y,vx:-500});T.collide(g.state,b,{x:b.x,y:b.y},{x:t.x,y:t.y},g.world);direct(g);assert.equal(g.state.targetCharge.pending[0],28*60000);
  const before=plain(g.state.targetCharge);const restored=plain(g.state);T.collide(restored,restored.ball,{x:restored.ball.x,y:restored.ball.y},{x:t.x,y:t.y},g.world);assert.deepEqual(restored.targetCharge.pending,before.pending);
});
check("simultaneous awards batch independently of ball order, preserve over-target totals and exact ties enter overtime",()=>{
  for(const order of [[0,1],[1,0]]){const f=fixture("stationary",{winningScore:50});f.state.targetCharge.units=[45*60000,45*60000];for(const team of order)direct(f,team,{closing:team?1000:800});T.resolve(f.state,D.finish);assert.deepEqual(f.state.scores,[55,59]);assert.equal(f.state.winner,1);}
  const f=fixture("stationary",{winningScore:50});f.state.targetCharge.units=[40*60000,40*60000];for(const team of [0,1])direct(f,team,{closing:800});T.resolve(f.state,D.finish);assert(f.state.overtime);assert.equal(f.state.phase,"playing");f.state.targetCharge.pending[0]=1;T.resolve(f.state,D.finish);assert.equal(f.state.winner,0);assert(f.state.scores[0]>50);
});
check("stationary collision rebounds naturally; high-speed balls cannot tunnel through targets or arena walls",()=>{
  for(const speed of [600,2050]){const f=fixture();impact(f,0,speed);f.tick(6);assert(f.state.scores[0]>0);assert(f.state.ball.vx<0);assert.equal(f.state.targetCharge.serial,1);assert.equal(f.state.targetCharge.target.x,1280);f.tick(120);assert(f.state.ball.x>=48&&f.state.ball.x<=2512);assert(f.state.ball.y>=48&&f.state.ball.y<=1256);}
});
check("equal-mass balls collide without changing ownership or creating repeated separating impulses",()=>{
  const f=fixture(),[a,b]=D.balls(f.state);Object.assign(a,{x:1000,y:500,vx:900,vy:0});Object.assign(b,{x:1045,y:500,vx:-600,vy:0});assert(T.collideBalls(a,b,.73));assert(a.vx<0&&b.vx>0);near(a.vx+b.vx,300);assert.equal(a.scoringTeam,0);assert.equal(b.scoringTeam,1);const before=[a.vx,b.vx];b.x=a.x+47;T.collideBalls(a,b,.73);assert.deepEqual([a.vx,b.vx],before);
});
check("vertical movement is continuous, bounded, periodic and contributes actual velocity",()=>{
  const f=fixture("vertical"),t=f.state.targetCharge.target;let low=t.y,high=t.y,last=t.y;
  for(let i=0;i<480;i++){T.advance(f.state,f.stage,dt,f.world.random);assert(Math.abs(t.y-last)<5);near(t.vy,(t.y-last)/dt);low=Math.min(low,t.y);high=Math.max(high,t.y);last=t.y;}near(t.y,700,1e-5);assert(low<351&&high>1019);
  Object.assign(t,{y:700,prevY:702,vy:-400});const b=f.state.ball;Object.assign(b,{x:t.x,y:t.y-t.r-b.r+.5,vx:0,vy:0});T.collide(f.state,b,{x:b.x,y:b.y},{x:t.x,y:702},f.world);assert(f.state.targetCharge.pending[0]>0);assert(b.vy<0);
});
check("roaming uses seeded state, smooth acceleration and safe central bounds with no teleport",()=>{
  const a=fixture("roaming"),b=fixture("roaming");let previous={...a.state.targetCharge.target};
  for(let i=0;i<3600;i++){for(const f of [a,b])T.advance(f.state,f.stage,dt,f.world.random);const t=a.state.targetCharge.target;assert.deepEqual(t,b.state.targetCharge.target);assert(t.x>=384&&t.x<=2176&&t.y>=270&&t.y<=1020);assert(Math.hypot(t.x-previous.x,t.y-previous.y)<6);assert(Math.hypot(t.vx,t.vy)<=341);previous={...t};}
});
check("existing native shots, projectile hits, shields and Spike possession preserve scoring ownership",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"target-charge-stationary"},{characters:["gunman","spike"]});const s=d.dashball.state,w=d.dashball.world(0),ball=s.ball,f=d.fighters[1];
  Object.assign(f,{x:800,y:900,prevX:800,prevY:900,chargingPunch:true,punchInputHeld:true,punchCharge:.3,shieldHealth:100,punchAim:{x:1,y:0},aim:{x:1,y:0},onGround:false});
  // Exercise the same shield contact path as Soccer, not a Target Charge-only catch.
  Object.assign(ball,{x:f.x+35,y:f.y,vx:-800,vy:0,noCapture:{},contacts:{}});d.dashball.ballStep();assert.equal(ball.scoringTeam,0);assert.equal(ball.carrier,f.id);assert.equal(ball.ownerTeam,1);
  f.chargingPunch=false;D.possession(s,w,ball);assert.equal(ball.carrier,null);assert.equal(ball.scoringTeam,0);assert.equal(f.airDashes,f.data.maxAirDashes);
  const attack={id:900,dir:{x:1,y:-.3},charge:1,hitTargets:new Set(),projectile:{damage:3,radius:10}};assert(D.shot(s,d.fighters[0],attack,w,false,ball));assert.equal(ball.scoringTeam,0);assert(Math.hypot(ball.vx,ball.vy)>500);
});
check("target obstacle displaces fighters without damage, free resources, attack cancellation or boundary pins",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"target-charge-roaming"},{characters:["chungus","kite"]});const t=d.dashball.state.targetCharge.target,f=d.fighters[0],before={health:f.health,airDashes:0};Object.assign(f,{x:t.x,y:t.y,prevX:t.x,prevY:t.y,onGround:false,airDashes:0});d.dashball.ballStep();assert.equal(f.health,before.health);assert.equal(f.airDashes,0);assert(!D.circleRect(t,d.dashball.world(0).body(f)));assert(f.x>24&&f.x<2536&&f.y>24&&f.y<1280);
});
check("AI roles pursue own balls, defend away from the target, predict motion and spread five teammates",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"target-charge-vertical",teamSize:5},{ai:true});const s=d.dashball.state,w=d.dashball.world(0),roles=T.assignments(s,w,D.balls(s));
  for(const team of [0,1]){const tasks=d.fighters.filter(f=>f.team===team).map(f=>roles[f.id]);assert(tasks.some(t=>t.kind==="offense"));assert(tasks.some(t=>t.kind==="defense"));assert(tasks.some(t=>t.kind==="support"));for(const task of tasks)assert.equal(D.balls(s).find(b=>b.id===task.ballId).scoringTeam,task.kind==="defense"?1-team:team);}
  const target=s.targetCharge.target;target.vx=100;assert(T.predict(target,d.dashball.arena).x>target.x);for(let i=0;i<120;i++)d.dashball.step();assert(d.fighters.some(f=>f.ai.chargePlan));
});
check("defensive AI clears laterally instead of deliberately floor-banking an opponent ball into the target",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"target-charge-stationary",teamSize:3},{ai:true});const s=d.dashball.state;
  Object.assign(s.ball,{x:1280,y:1200,vx:0,vy:-500});d.dashball.step();
  const defender=d.fighters.find(f=>f.team===1&&f.ai.chargeTask?.kind==="defense");assert(defender);assert(Math.abs(defender.ai.chargePlan.aim.x)>.9);assert(Math.abs(defender.ai.chargePlan.aim.y)<.4);
});
check("1v1, 3v3 and 5v5 simulations remain deterministic, serialize contacts/RNG and render without mutation",()=>{
  for(const stage of T.STAGES)for(const teamSize of [1,3,5]){const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:stage.id,teamSize},{ai:true,seed:981});const start=a.rb.save();
    for(let i=0;i<90;i++){for(const g of [a,b])g.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash());}const end=a.rb.hash(),snapshot=a.debug.online.createSnapshot();b.debug.online.installSnapshot(snapshot);assert.equal(a.rb.hash(),b.rb.hash());a.rb.restore(start);for(let i=0;i<90;i++)a.debug.dashball.step();assert.equal(a.rb.hash(),end);a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),end);
  }
});
check("delayed inputs roll back target motion, contacts and charge exactly; host configuration signs every option",()=>{
  for(const stage of T.STAGES){const a=createGame(),b=createGame();for(const g of [a,b]){g.debug.dashball.setup({arena:stage.id,winningScore:150});impact({state:g.debug.dashball.state},0,1200);impact({state:g.debug.dashball.state},1,900);}const manager=b.rb.manager(0,8),pending=[];
    for(let i=0;i<150;i++){const row=[0,1].map(n=>R.encode({aimX:n?-1:1,aimY:-.7,punchHeld:(i+n*7)%23<8,dashHeld:(i+n*5)%41<10}));pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);
    assert(a.debug.dashball.state.scores.every(n=>n>0));assert(a.debug.dashball.state.targetCharge.serial>=2);
    const config={stageIndex:a.debug.stageNames.indexOf(stage.name),characterKeys:["orbit","spike"],seed:42,window:8,dashball:plain(a.debug.dashball.state.config)},signature=a.rb.getSignature(config);assert.notEqual(signature,a.rb.getSignature({...config,dashball:{...config.dashball,winningScore:200}}));
  }
});
check("30/60/120 Hz presentation consumes identical fixed steps in all variants",()=>{
  for(const s of T.STAGES){const results=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena:s.id});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push(g.rb.hash());}assert.equal(results[0],results[1]);assert.equal(results[0],results[2]);}
});
check("Battle KOs grant no charge, have independent respawns and preserve live objectives",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"target-charge-roaming",teamSize:3});const s=d.dashball.state;impact({state:s},1,1000);d.dashball.knockout(0);assert(d.fighters[0].koScored);assert.deepEqual(plain(s.scores),[0,0]);const ball=s.ball,x=s.targetCharge.target.x;for(let i=0;i<960;i++)d.dashball.step();assert(!d.fighters[0].koScored);assert.equal(d.fighters[0].health,Math.round(d.fighters[0].data.maxHealth*.5));assert.equal(s.ball,ball);assert.notEqual(s.targetCharge.target.x,x);
});
check("victory freezes targets and scoring; rematch and mode exit restore clean state",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"target-charge-roaming",winningScore:75});const s=d.dashball.state;s.targetCharge.pending[1]=76*60000;T.resolve(s,D.finish);assert.equal(s.winner,1);const before=JSON.stringify(s);for(let i=0;i<10;i++)d.dashball.ballStep();assert.equal(JSON.stringify(s),before);d.dashball.setup(s.config);assert.equal(d.dashball.state.config.winningScore,75);assert.deepEqual(plain(d.dashball.state.scores),[0,0]);assert.equal(d.dashball.state.targetCharge.serial,0);assert.equal(d.dashball.state.targetCharge.target.y,700);d.dashball.standard();assert(!d.dashball.state);
});
check("unchanged sports/AI/Sandbag/Versus retain immutable hashes; later requested changes are excluded",()=>{const fixtures=Object.entries(require("./target-charge-before.json")).filter(([name])=>require("./total-rush-regression").unchangedSportsFixture(name));assert(fixtures.length>0);let n=0;for(const [name,rows]of fixtures){assert.deepEqual(hashes(name,rows.length),rows,name);n+=rows.length;}assert.equal(n,fixtures.reduce((sum,[,rows])=>sum+rows.length,0));});
console.log(`${groups} Target Charge groups passed`);
