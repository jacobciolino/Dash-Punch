"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const dt=1/60;let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(config={}){
  const stage=D.arena("target-break",154,config),state=D.create({...config,arena:"target-break"},stage);
  const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:()=>stage.terrain,body:f=>({x:f.x-23,y:f.y-33,w:46,h:66}),
    shielding:f=>Boolean(f.shielding),shieldAim:f=>f.aim||{x:1,y:0},shieldCovers:()=>true,shieldPadding:()=>24,kicking:()=>false};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.clock(state,dt,stage);D.step(state,dt,world);}}};
}
function impact(f,target,speed=900){const side=target.team?-1:1;Object.assign(f.state.ball,{x:target.x+side*(target.r+f.state.ball.r-1),y:target.y,vx:-side*speed,vy:0,carrier:null});D.targets.collide(f.state,f.world);}
check("twelve unique, mirrored wall-mounted targets in six widely spaced rows",()=>{
  const f=fixture();assert.equal(f.state.targets.length,12);assert.equal(new Set(f.state.targets.map(t=>t.id)).size,12);
  for(let i=0;i<6;i++){const a=f.state.targets[i],b=f.state.targets[i+6];assert.equal(a.team,0);assert.equal(b.team,1);assert.equal(a.x+b.x,f.stage.width);assert.equal(a.y,b.y);if(i)assert(a.y-f.state.targets[i-1].y>154+32);}
  assert(f.state.targets[0].y<180);assert(f.state.targets[5].y>f.stage.floorY-100);assert.equal(f.stage.goals.length,0);assert.equal(f.stage.terrain.filter(t=>t.move).length,0);
});
check("slow rolling contact rebounds; valid normal-relative impacts destroy once",()=>{
  const f=fixture(),target=f.state.targets[4];impact(f,target,200);assert(!target.destroyed);assert(f.state.ball.vx>0);
  impact(f,target,300);assert(target.destroyed);assert.equal(f.state.scores[1],1);assert.equal(f.state.targetEvents.length,1);
  impact(f,target,2000);assert.equal(f.state.scores[1],1);assert.equal(f.state.targetEvents.length,1);
  assert.equal(f.state.phase,"playing");assert(f.state.ball.vx<0);
});
check("own targets benefit the opponent independent of last touch",()=>{
  const f=fixture();f.state.ball.ownerTeam=0;f.state.ball.ownerId="p1";impact(f,f.state.targets[3]);assert.deepEqual(f.state.scores,[0,1]);
  f.state.ball.ownerTeam=1;impact(f,f.state.targets[9]);assert.deepEqual(f.state.scores,[1,1]);
});
check("speed threshold uses collision approach, not damage or a high-speed graze",()=>{
  const f=fixture(),target=f.state.targets[2],b=f.state.ball;
  Object.assign(b,{x:target.x+target.r+b.r-1,y:target.y,vx:-100,vy:1900});D.targets.collide(f.state,f.world);assert(!target.destroyed);
  const tuned=fixture({targetImpactSpeed:500});impact(tuned,tuned.state.targets[2],400);assert(!tuned.state.targets[2].destroyed);
});
check("all targets can be reached directly by physical ball contact",()=>{
  for(let i=0;i<12;i++){const f=fixture();impact(f,f.state.targets[i]);assert(f.state.targets[i].destroyed);}
});
check("one horizontal trajectory cannot destroy a vertical column",()=>{
  const f=fixture(),target=f.state.targets[3];Object.assign(f.state.ball,{x:700,y:target.y,vx:-1800,vy:0});
  f.tick(30);assert(f.state.targetSerial<=1);
});
check("a real continuous vertical trajectory can chain six distinct targets",()=>{
  const f=fixture();Object.assign(f.state.ball,{x:100,y:50,vx:0,vy:1800});f.tick(80);
  assert.equal(f.state.scores[1],6);assert.equal(f.state.targetEvents.length,6);assert.equal(f.state.phase,"finished");assert.equal(f.state.winner,1);
  const serial=f.state.targetSerial;f.tick(10);assert.equal(f.state.targetSerial,serial);
});
check("captured balls cannot destroy targets",()=>{
  const f=fixture(),t=f.state.targets[0];Object.assign(f.state.ball,{x:t.x,y:t.y,vx:2000,vy:0,carrier:"p1"});D.targets.collide(f.state,f.world);assert(!t.destroyed);
});
check("six breaks wins immediately; time advantage and compulsory overtime retain targets",()=>{
  const f=fixture({winningScore:1,overtime:false});impact(f,f.state.targets[0]);assert.equal(f.state.phase,"playing");f.state.remaining=.001;f.tick();assert.equal(f.state.winner,1);
  const tie=fixture({overtime:false});impact(tie,tie.state.targets[0]);impact(tie,tie.state.targets[6]);tie.state.remaining=.001;tie.tick();assert(tie.state.overtime);assert.equal(tie.state.phase,"playing");
  assert(tie.state.targets[0].destroyed);impact(tie,tie.state.targets[7]);assert.equal(tie.state.winner,0);
});
check("ball recovery preserves scores/targets/fighters and ignores a recoverable stationary ball",()=>{
  const f=fixture();impact(f,f.state.targets[3]);const serial=f.state.targetSerial;f.state.ball.x=NaN;D.step(f.state,dt,f.world);
  assert.equal(f.state.ball.x,f.stage.width/2);assert.equal(f.state.recovery.serial,1);assert.equal(f.state.targetSerial,serial);assert.deepEqual(f.state.scores,[0,1]);
  f.tick(600);assert.equal(f.state.recovery.serial,1);
  const trapped=fixture();Object.assign(trapped.state.ball,{x:400,y:400,vx:0,vy:0});trapped.state.recovery.x=400;trapped.state.recovery.y=400;
  trapped.world.terrain=()=>[{x:380,y:380,w:40,h:40}];for(let i=0;i<250;i++)D.targets.recover(trapped.state,trapped.world,dt);
  assert.equal(trapped.state.recovery.serial,1);
});
check("a low-speed corner contact cannot wedge the ball behind the lowest target",()=>{
  const f=fixture();Object.assign(f.state.ball,{x:48,y:f.stage.floorY-f.state.ball.r,vx:0,vy:0});f.tick(180);
  assert(f.state.ball.x>145);assert.equal(f.state.recovery.serial,0);assert.equal(f.state.targetSerial,0);
});
const game=createGame(),d=game.debug;
check("fighters cannot stand inside targets and destroyed targets stop colliding",()=>{
  d.dashball.setup({arena:"target-break"});const f=d.fighters[0],t=d.dashball.state.targets[5];
  Object.assign(f,{x:70,y:t.y,prevX:70,prevY:t.y,vx:-500,vy:0,hasLiveAim:true,aim:{x:-1,y:0},dashDir:{x:-1,y:0},dashCarryTimer:.3});
  d.resolveTerrain(0);assert(f.x-f.data.width/2>=t.x+t.r-.01);assert(f.wallClinging);
  t.destroyed=true;Object.assign(f,{x:70,y:t.y,vx:0,vy:0});d.resolveTerrain(0);assert(f.x<100);
});
check("Court disables PvP; Battle health, KO/respawn preserve target scores",()=>{
  for(const ruleset of ["court","battle"]){d.dashball.setup({arena:"target-break",ruleset,respawn:10});const f=d.fighters[0];
    const target=d.dashball.state.targets[3];impact({state:d.dashball.state,world:d.dashball.world(0)},target);
    const score=[...d.dashball.state.scores];d.dashball.knockout(0);
    // Keep this respawn assertion isolated from extra legitimate target breaks
    // during the new ten-second minimum delay. Objective motion is tested elsewhere.
    Object.assign(d.dashball.state.ball,{x:1280,y:d.dashball.arena.floorY-d.dashball.state.ball.r,vx:0,vy:0,launched:0});
    if(ruleset==="court"){assert(!f.koScored);assert.equal(f.health,f.data.maxHealth);}
    else {assert(f.koScored);for(let i=0;i<602;i++)d.dashball.step();assert(!f.koScored);assert.equal(f.health,Math.round(f.data.maxHealth*.5));assert(f.invulnerable>0);}
    assert.deepEqual([...d.dashball.state.scores],score);assert(target.destroyed);
  }
});
check("rematch restores all targets, ball, resources and score without altering character data",()=>{
  const config={arena:"target-break",ruleset:"battle",teamSize:5};d.dashball.setup(config,{characters:["chungus","spike"]});
  const data=JSON.stringify(d.fighters.map(f=>f.data));impact({state:d.dashball.state,world:d.dashball.world(0)},d.dashball.state.targets[0]);
  d.dashball.setup(config,{characters:["chungus","spike"]});assert.equal(d.dashball.state.targets.filter(t=>!t.destroyed).length,12);assert.deepEqual([...d.dashball.state.scores],[0,0]);assert.equal(d.dashball.state.remaining,180);assert.equal(data,JSON.stringify(d.fighters.map(f=>f.data)));
});
check("existing fighters reach the upper targets; Boomerangus remains a weak aerial objective pursuer",()=>{
  for(const key of game.rb.characterKeys){
    d.dashball.setup({arena:"target-break"},{characters:[key,"anchor"]});const f=d.fighters[0],stage=d.dashball.arena;
    Object.assign(f,{x:1280,y:stage.floorY-f.data.height/2,onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-1}});
    d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let top=f.y-f.data.height/2;
    for(let i=0;i<180;i++){d.gravity.physics(0);top=Math.min(top,f.y-f.data.height/2);}
    if(f.data.boomerang)assert(top>stage.targets[0].y+d.dashball.state.ball.r,"Boomerangus must retain his low jump");
    else assert(top<=stage.targets[0].y+d.dashball.state.ball.r,`${key} cannot reach the upper target row`);
  }
});
check("shield interception happens before a target hit, including Spike capture",()=>{
  for(const spike of [false,true]){
    const f=fixture(),target=f.state.targets[2],keeper={id:"keeper",team:0,x:190,y:target.y,prevX:190,prevY:target.y,vx:0,vy:0,invulnerable:0,
      data:{width:46,height:66,...(spike?{shieldThornsDamage:7}:{})},shielding:true,aim:{x:1,y:0}};
    f.world.fighters=[keeper];Object.assign(f.state.ball,{x:300,y:target.y,vx:-1800,vy:0,launched:2,ownerTeam:1});f.tick(12);
    assert(!target.destroyed);assert.equal(f.state.targetSerial,0);
    if(spike)assert.equal(f.state.ball.carrier,keeper.id);else assert(f.state.ball.vx>0);
  }
});
check("actual Court attacks cannot damage/stun fighters; Battle attacks can",()=>{
  for(const ruleset of ["court","battle"]){
    d.dashball.setup({arena:"target-break",ruleset},{characters:["orbit","orbit"]});const [a,b]=d.fighters,hp=b.health;
    Object.assign(a,{x:600,y:500,prevX:600,prevY:500,vx:0,vy:0});Object.assign(b,{x:650,y:500,prevX:650,prevY:500,vx:0,vy:0});
    a.attack={id:441,age:.1,startup:0,active:.2,recovery:.2,total:.4,dir:{x:1,y:0},charge:0,hitTargets:new Set()};
    d.dashball.step();if(ruleset==="court"){assert.equal(b.health,hp);assert.equal(b.hitstun,0);}else {assert(b.health<hp);assert(b.hitstun>0);}
    assert.deepEqual([...d.dashball.state.scores],[0,0]);
  }
});
check("destruction art advances/fades without changing the authoritative simulation",()=>{
  d.dashball.setup({arena:"target-break"});const s=d.dashball.state;impact({state:s,world:d.dashball.world(0)},s.targets[2]);
  const before=game.rb.hash(),effects=game.rb.save().presentation.effects;
  assert.equal(effects.filter(e=>e.sprite?.targetBreak).length,1);
  d.presentationEffects.step(.2);d.stagePresentation.draw();assert.equal(game.rb.hash(),before);
  d.presentationEffects.step(.2);assert.equal(game.rb.save().presentation.effects.filter(e=>e.sprite?.targetBreak).length,0);
});
check("AI chooses intact enemy targets and changes plans when targets break",()=>{
  for(const key of ["orbit","spike","rain","chungus","reverso","gunman"]){
    d.dashball.setup({arena:"target-break"},{characters:[key,"anchor"]});const s=d.dashball.state,f=d.fighters[0];
    const first=D.targets.plan(s,f,d.dashball.world(0));assert(first);const target=s.targets.find(t=>t.id===first.id);assert.equal(target.team,1);
    target.destroyed=true;const next=D.targets.plan(s,f,d.dashball.world(0));assert(next);assert.notEqual(next.id,first.id);assert(Number.isFinite(next.aim.x));
    const friendly=s.targets.find(t=>t.team===0&&!t.destroyed);Object.assign(s.ball,{x:600,y:friendly.y,vx:-1200,vy:-100});
    const threat=D.targets.threat(s,0,d.dashball.arena);if(threat)assert.equal(threat.team,0);
  }
});
check("Spike plans a charged Punch rather than a Kickoff while possessing the ball",()=>{
  d.dashball.setup({arena:"target-break"},{characters:["spike","orbit"]});
  const s=d.dashball.state,f=d.fighters[0];s.ball.carrier=f.id;
  const plan=D.targets.plan(s,f,d.dashball.world(0));assert(plan);assert.equal(plan.kick,false);assert(plan.charge>=.4);
});
check("authoritative snapshots preserve targets, possession, timers, recovery and respawns",()=>{
  const host=createGame(),guest=createGame();host.debug.dashball.setup({arena:"target-break",ruleset:"battle",respawn:1},{characters:["spike","orbit"]});
  const s=host.debug.dashball.state;impact({state:s,world:host.debug.dashball.world(0)},s.targets[3]);
  host.debug.dashball.knockout(1);s.ball.carrier=host.debug.fighters[0].id;s.elapsed=24;s.remaining=156;s.recovery.serial=2;
  const snapshot=JSON.parse(JSON.stringify(host.debug.online.createSnapshot()));guest.debug.online.installSnapshot(snapshot);
  assert.equal(JSON.stringify(guest.debug.dashball.state),JSON.stringify(s));assert.equal(guest.debug.dashball.arena.name,"Target Break");
  assert(guest.debug.fighters[1].koScored);assert(guest.debug.dashball.state.ball.carrier);
});
check("1v1 through 5v5 and independent replay retain target events and respawn state",()=>{
  const peer=createGame();
  for(const ruleset of ["court","battle"])for(const teamSize of [1,5]){
    const config={arena:"target-break",ruleset,teamSize,respawn:1};
    for(const g of [game,peer]){g.debug.dashball.setup(config);const s=g.debug.dashball.state;Object.assign(s.ball,{x:100,y:50,vx:0,vy:1500});if(ruleset==="battle")g.debug.dashball.knockout(1);}
    const saved=game.rb.save(),frames=[];
    for(let i=0;i<180;i++){const input=Array.from({length:teamSize*2},(_,p)=>R.decode(R.encode({hasAim:true,aimX:p%2?-1:1,aimY:Math.sin(i*.1),dashHeld:i%31<8,punchHeld:i%29<11})));frames.push(input);assert.equal(game.rb.step(input),peer.rb.step(input));}
    const final=game.rb.hash();game.rb.restore(saved);for(const input of frames)game.rb.step(input);assert.equal(game.rb.hash(),final);
    assert(d.dashball.state.targetSerial>0);assert(d.dashball.state.targetEvents.length<=12);
  }
});
check("rollback with delayed inputs cannot duplicate target scoring or lose destruction",()=>{
  const ref=createGame(),late=createGame();for(const g of [ref,late]){g.debug.dashball.setup({arena:"target-break",ruleset:"battle",respawn:1});Object.assign(g.debug.dashball.state.ball,{x:100,y:50,vx:0,vy:1800});g.debug.dashball.knockout(1);}
  const manager=late.rb.manager(0,8),pending=[];
  for(let i=0;i<180;i++){const local=R.encode({aimX:1,punchHeld:i%23<8}),remote=R.encode({aimX:-1,aimY:-.4,dashHeld:i%31<8,punchHeld:i%29<9});pending.push({frame:i,input:remote});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(local));ref.rb.step([local,remote].map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(late.rb.hash(),ref.rb.hash());assert(manager.rollbacks>0);
  const s=late.debug.dashball.state;assert.equal(new Set(s.targetEvents.map(e=>e.id)).size,s.targetEvents.length);assert.equal(s.scores[0]+s.scores[1],s.targetEvents.length);
});
check("ten target-aware CPUs produce breaks with identical decisions on independent peers",()=>{
  const left=createGame(),right=createGame(),cast=["orbit","spike","rain","anchor","chungus","gunman","archer","whipado","microusb","edgebert"];
  for(const g of [left,right])g.debug.dashball.setup({arena:"target-break",teamSize:5,duration:600},{characters:cast,ai:true,seed:42});
  for(let i=0;i<1800;i++){left.debug.dashball.step();right.debug.dashball.step();if(i%30===0)assert.equal(left.rb.hash(),right.rb.hash());}
  assert.equal(left.rb.hash(),right.rb.hash());assert(left.debug.dashball.state.targetSerial>0,"AI never broke a target");
});
console.log(`${groups} Target Break groups passed`);
