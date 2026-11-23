"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60;let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(config={}){
  const c={...config,arena:"golden-rush"},stage=D.arena(c.arena),state=D.create(c,stage);
  const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:()=>stage.terrain.concat(stage.ballOnly),body:f=>({x:f.x-23,y:f.y-33,w:46,h:66}),
    shielding:f=>!!f.shielding,shieldAim:f=>f.aim||{x:1,y:0},shieldCovers:()=>true,shieldPadding:()=>30,kicking:()=>false};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.clock(state,dt,stage);D.step(state,dt,world);}}};
}
function fighter(id="p1",team=0){return {id,team,x:1000,y:1000,prevX:1000,prevY:1000,vx:0,vy:0,invulnerable:0,dashReboundLockout:0,data:{width:46,height:66,punchDamage:12,punchKnockback:800,dashBase:800,dashMax:600,dashReboundDamage:4}};}
function attack(id=1,dir={x:1,y:0}){return {id,dir,charge:0,grounded:false,hitTargets:new Set()};}
function aimAtRing(f,team,row,index=0){const ring=f.stage.rings.find(r=>r.team===team&&r.row===row),b=D.balls(f.state)[index],sign=team?1:-1;Object.assign(b,{x:ring.line-sign*80,y:(ring.top+ring.bottom)/2,vx:sign*1800,vy:0});return b;}
check("sports defaults, settings and symmetric six-ring arena",()=>{
  const f=fixture();assert.equal(f.state.config.winningScore,100);assert.equal(f.state.config.ruleset,"battle");assert.equal(f.state.config.duration,0);assert.equal(f.state.config.healthMult,.5);assert.equal(f.state.config.respawn,15);
  assert.equal(D.balls(f.state).length,10);assert.equal(f.stage.rings.length,6);assert.deepEqual(f.stage.rings.slice(0,3).map(r=>r.points),[1,3,5]);
  assert(f.stage.terrain.filter(r=>r.kind==="oneway").length>=6);
  for(const respawn of [10,15,20])assert.equal(D.options({arena:"golden-rush",respawn}).respawn,respawn);
  assert.equal(D.balls(fixture({ballCount:5}).state).length,5);assert.equal(D.options({arena:"golden-rush",respawn:2}).respawn,15);
});
check("online start countdown freezes all objectives, then enters active play",()=>{
  const f=fixture();f.state.phase="countdown";f.state.pause=3;const ball=JSON.stringify(f.state.ball);for(let i=0;i<179;i++){
    const flow=D.clock(f.state,dt,f.stage);assert(!flow.play);D.step(f.state,dt,f.world);
  }
  assert.equal(JSON.stringify(f.state.ball),ball);assert.equal(f.state.golden.flight,0);assert.equal(f.state.elapsed,0);
  const flow=D.clock(f.state,dt,f.stage);assert(flow.play);assert(flow.go);D.step(f.state,dt,f.world);assert.equal(f.state.phase,"playing");assert(f.state.golden.flight>0);
});
check("low/middle/high rings score 1/3/5 only after a complete valid crossing",()=>{
  for(const team of [0,1])for(const row of [0,1,2]){const f=fixture();aimAtRing(f,team,row);f.tick();assert.equal(f.state.scores[1-team],0);f.tick(8);assert.equal(f.state.scores[1-team],[1,3,5][row]);f.tick(2);assert.equal(f.state.rushSerial,1);}
});
check("own goals use defending team; only the scoring ball resets",()=>{
  const f=fixture(),scored=aimAtRing(f,0,1,1),other=f.state.ball;scored.ownerTeam=0;Object.assign(other,{x:1200,y:300,vx:100,vy:0});
  f.tick(9);assert.deepEqual(f.state.scores,[0,3]);assert.equal(scored.vx,0);assert(other.x>1200);assert.equal(f.state.phase,"playing");assert.equal(other.id,0);assert.equal(scored.id,1);
});
check("behind-ring, rim and incomplete crossings do not score",()=>{
  for(const kind of ["behind","rim","partial"]){const f=fixture(),r=f.stage.rings[0],b=f.state.ball;
    Object.assign(b,kind==="behind"?{x:r.line-60,y:(r.top+r.bottom)/2,vx:1500,vy:0}:kind==="rim"?{x:r.line+80,y:r.top-10,vx:-1800,vy:0}:{x:r.line+10,y:(r.top+r.bottom)/2,vx:-100,vy:0});
    f.tick(kind==="partial"?1:8);assert.deepEqual(f.state.scores,[0,0]);
  }
});
check("carried balls cannot score and one Spike cannot possess several balls",()=>{
  const f=fixture(),spike=fighter();spike.data.shieldThornsDamage=10;spike.shielding=true;spike.aim={x:1,y:0};spike.x=800;spike.y=800;spike.prevX=800;spike.prevY=800;f.world.fighters=[spike];
  for(const b of D.balls(f.state))Object.assign(b,{x:spike.x+40,y:spike.y,vx:0,vy:0});f.tick();assert.equal(D.balls(f.state).filter(b=>b.carrier===spike.id).length,1);
  const b=D.balls(f.state).find(b=>b.carrier),r=f.stage.rings[0];spike.x=r.line-80;spike.prevX=spike.x;spike.y=(r.top+r.bottom)/2;spike.prevY=spike.y;f.tick(4);assert.deepEqual(f.state.scores,[0,0]);
  spike.shielding=false;f.tick();assert.equal(b.carrier,null);
});
check("multiple ball shots use per-ball attack records and one shared reward cooldown",()=>{
  const f=fixture(),p=fighter();let rewards=0;f.world.onShot=(_p,_a,_k,reward)=>{if(reward)rewards++;};
  const a=attack();for(const b of D.balls(f.state))assert(D.shot(f.state,p,a,f.world,false,b));assert.equal(rewards,1);
  for(const b of D.balls(f.state))assert(!D.shot(f.state,p,a,f.world,false,b));
});
check("Spike can charged-launch a non-primary ball with the native possession bonus",()=>{
  const f=fixture(),p=fighter(),b=f.state.extraBalls[1],a={...attack(99),charge:.8,fromShieldRelease:true,startup:.1};
  p.shielding=true;p.data.shieldThornsDamage=4;p.attack=a;f.world.fighters=[p];b.carrier=p.id;D.possession(f.state,f.world,b);
  p.shielding=false;D.possession(f.state,f.world,b);assert.equal(b.carrier,null);assert.equal(b.pendingLaunch.id,99);
  D.shot(f.state,p,a,f.world,false,f.state.ball);const regular=Math.hypot(f.state.ball.vx,f.state.ball.vy);D.shot(f.state,p,a,f.world,false,b);assert(Math.hypot(b.vx,b.vy)>regular);
});
check("golden health is shared; final attacker alone receives reward exactly once",()=>{
  const f=fixture(),red=fighter(),blue=fighter("p2",1);D.goldenRush.hit(f.state,red,attack(1),f.world);assert.equal(f.state.golden.health,36);assert.deepEqual(f.state.scores,[0,0]);
  assert(!D.goldenRush.hit(f.state,red,attack(1),f.world));D.goldenRush.hit(f.state,red,attack(2),f.world);D.goldenRush.hit(f.state,blue,attack(3),f.world);
  assert(f.state.golden.active);assert(D.goldenRush.hit(f.state,blue,attack(4),f.world));
  assert.deepEqual(f.state.scores,[0,15]);assert.deepEqual(f.state.captures,[0,1]);assert(!f.state.golden.active);assert(!D.goldenRush.hit(f.state,red,attack(5),f.world));
  assert.equal(f.state.phase,"playing");assert.equal(f.state.rushNotice.kind,"golden");
});
check("golden target respawns after configured delay, with fresh hit eligibility",()=>{
  const f=fixture({goldenRespawn:5}),p=fighter();f.state.golden.health=1;D.goldenRush.hit(f.state,p,attack(),f.world);f.tick(299);assert(!f.state.golden.active);f.tick(2);assert(f.state.golden.active);assert.equal(f.state.golden.serial,2);assert.equal(f.state.golden.health,48);
  assert(D.goldenRush.hit(f.state,p,attack(),f.world));assert.equal(f.state.scores[0],15);
});
check("golden movement remains airborne, reachable and deterministic without teleporting",()=>{
  const a=fixture(),b=fixture();let minY=Infinity,maxY=-Infinity,last={...a.state.golden};
  for(let i=0;i<2400;i++){a.tick();b.tick();const g=a.state.golden;assert.equal(JSON.stringify(g),JSON.stringify(b.state.golden));assert(Math.hypot(g.x-last.x,g.y-last.y)<22);minY=Math.min(minY,g.y);maxY=Math.max(maxY,g.y);last={...g};}
  assert(maxY-minY>900);assert(minY>=24+a.state.golden.r);assert(maxY<=a.stage.floorY-a.state.golden.r+.01);assert(a.state.golden.active);
});
check("golden projectiles and kick damage do not invoke fighter KOs or ring scoring",()=>{
  const f=fixture(),p=fighter(),g=f.state.golden,a=attack();a.projectile={radius:8,damage:7};
  assert(D.goldenRush.projectile(f.state,p,a,[{x1:g.x-100,y1:g.y,x2:g.x+100,y2:g.y}],f.world));assert.equal(g.health,41);
  D.goldenRush.hit(f.state,p,attack(2),f.world,true);assert.equal(g.health,37);assert.equal(f.state.ringPoints[0],0);assert.equal(g.koScored,undefined);
});
check("a golden target crossing a ring cannot score as a ball",()=>{
  const f=fixture(),r=f.stage.rings[0];Object.assign(f.state.golden,{x:r.line+40,y:(r.top+r.bottom)/2,vx:-700,vy:0});f.tick(10);assert.deepEqual(f.state.scores,[0,0]);assert.equal(f.state.rushSerial,0);
});
check("simultaneous scoring has stable ball-id priority and stops at victory",()=>{
  const f=fixture({winningScore:100});f.state.scores=[99,99];aimAtRing(f,1,0,0);aimAtRing(f,0,0,1);f.tick(8);
  assert.equal(f.state.winner,0);assert.deepEqual(f.state.scores,[100,99]);const scores=[...f.state.scores];f.tick(200);assert.deepEqual(f.state.scores,scores);
  const g=fixture();g.state.scores[1]=90;g.state.golden.health=1;D.goldenRush.hit(g.state,fighter("p2",1),attack(),g.world);assert.equal(g.state.winner,1);assert.equal(g.state.scores[1],105);
});
check("optional timed play selects leader, ties use sudden death, unlimited does not expire",()=>{
  const f=fixture();f.tick(11000);assert.equal(f.state.phase,"playing");
  const timed=fixture({duration:15});timed.state.scores[0]=3;timed.tick(901);assert.equal(timed.state.winner,0);
  const tie=fixture({duration:15});tie.tick(901);assert(tie.state.overtime);aimAtRing(tie,0,0);tie.tick(8);assert.equal(tie.state.winner,1);
});
const game=createGame(),d=game.debug;
check("sports HP, friendly fire and KO/15s respawn reuse combat without awarding points",()=>{
  d.dashball.setup({arena:"golden-rush",teamSize:2});const p=d.fighters[0];assert.equal(p.health,Math.round(p.data.maxHealth*.5));
  d.dashball.knockout(0);assert(p.koScored);assert.equal(d.dashball.state.respawns[p.id],15);assert.deepEqual([...d.dashball.state.scores],[0,0]);
  for(let i=0;i<901;i++)d.dashball.step();assert(!p.koScored);assert(p.invulnerable>1.9);assert.equal(p.health,Math.round(p.data.maxHealth*.5));
  assert(d.dashball.world(0).friendlyFire);
});
check("eliminating a whole team never ends the sports match",()=>{
  d.dashball.setup({arena:"golden-rush",teamSize:2});d.dashball.knockout(0);d.dashball.knockout(2);assert.equal(d.dashball.state.phase,"playing");assert.deepEqual([...d.dashball.state.scores],[0,0]);
});
check("existing fighters climb the tiers; Boomerangus retains his deliberate low-mobility weakness",()=>{
  for(const key of game.rb.characterKeys){
    d.dashball.setup({arena:"golden-rush"},{characters:[key,"anchor"]});const f=d.fighters[0];
    for(const ground of [2240,760]){
      Object.assign(f,{x:690,y:ground-f.data.height/2,vx:0,vy:0,onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-1},airDashes:f.data.maxAirDashes});
      d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let top=f.y-f.data.height/2;
      for(let i=0;i<180;i++){d.gravity.physics(0);top=Math.min(top,f.y-f.data.height/2);}
      if(f.data.boomerang&&ground===2240)assert(top>1700,"Boomerangus must not gain a sports-only movement buff");
      else assert(top<=(ground===2240?1700:620),`${key} cannot reach the next tier/high ring`);
    }
  }
});
check("fresh rematch retains settings and cast, resets balls, target and statistics",()=>{
  const c={arena:"golden-rush",ballCount:5,goldenReward:25,goldenRespawn:10,respawn:20};d.dashball.setup(c,{characters:["chungus","spike"]});
  d.dashball.state.golden.health=1;D.goldenRush.hit(d.dashball.state,d.fighters[0],attack(),d.dashball.world(0));d.dashball.setup(c,{characters:["chungus","spike"]});
  const s=d.dashball.state;assert(s.golden.active);assert.equal(s.golden.health,48);assert.equal(D.balls(s).length,5);assert.deepEqual([...s.scores],[0,0]);assert.deepEqual([...s.captures],[0,0]);assert.equal(d.fighters[0].data.name,"Chungus");assert.equal(s.config.respawn,20);
});
check("native melee damages teammates even with the saved friendly-fire preference off",()=>{
  d.dashball.setup({arena:"golden-rush",teamSize:2});const snapshot=game.rb.save();snapshot.core.teamAttackEnabled=false;game.rb.restore(snapshot);
  const f=d.fighters[0],ally=d.fighters[2],SetType=require("node:vm").runInContext("Set",game.sandbox);
  Object.assign(f,{x:700,y:1000,onGround:false});f.attack={...attack(900),age:.12,startup:0,active:.3,recovery:.2,total:.5,hitTargets:new SetType()};
  const box=d.getPunchHitbox(0,{x:1,y:0});Object.assign(ally,{x:box.cx,y:box.cy,invulnerable:0});const health=ally.health;d.handleHits();assert(ally.health<health);assert(ally.hitstun>0);assert.equal(game.rb.save().core.teamAttackEnabled,false);
});
check("spawn protection ends on an executed Punch or Dash, not an impossible empty Dash",()=>{
  d.dashball.setup({arena:"golden-rush"});const f=d.fighters[0];Object.assign(f,{dashballSpawnProtected:true,invulnerable:2,onGround:false,airDashes:0});
  d.gravity.dash(0,{x:1,y:0});assert.equal(f.invulnerable,2);f.airDashes=1;d.gravity.dash(0,{x:1,y:0});assert.equal(f.invulnerable,0);assert(!f.dashballSpawnProtected);
});
check("native active melee hits and confirms the golden target without fighter state",()=>{
  d.dashball.setup({arena:"golden-rush"});const f=d.fighters[0],g=d.dashball.state.golden,SetType=require("node:vm").runInContext("Set",game.sandbox);
  Object.assign(f,{x:1300,y:1100,prevX:1300,prevY:1100,onGround:false,airDashes:0});f.attack={...attack(901),age:.12,startup:0,active:.3,recovery:.2,total:.5,hitTargets:new SetType()};
  const box=d.getPunchHitbox(0,{x:1,y:0});Object.assign(g,{x:box.cx,y:box.cy});d.dashball.ballStep();assert(g.health<g.maxHealth);assert(f.airDashes>0);assert(!f.attack||f.attack.selfCancelled);assert.equal(f.health,Math.round(f.data.maxHealth*.5));
});
check("native projectiles hit the golden target, expire and grant normal hit confirms",()=>{
  for(const key of ["gunman","archer"]){
    d.dashball.setup({arena:"golden-rush"},{characters:[key,"orbit"]});const f=d.fighters[0],g=d.dashball.state.golden;
    Object.assign(f,{x:900,y:1000,airDashes:0,whiffLag:.3,punchLockout:.3});Object.assign(g,{x:1200,y:1000});
    f.projectiles=[{...attack(990),age:.12,startup:0,active:.3,recovery:0,total:5,projectile:{x:1190,y:1000,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.4}}];
    d.updateProjectiles(0);assert.equal(f.projectiles.length,0);assert(g.health<g.maxHealth);assert.equal(f.airDashes,f.data.maxAirDashes);assert.equal(f.whiffLag,0);
  }
});
check("multiball/target/respawn state survives snapshots, replay and delayed rollback",()=>{
  const ref=createGame(),late=createGame();for(const g of [ref,late]){
    g.debug.dashball.setup({arena:"golden-rush",teamSize:1,respawn:10},{characters:["orbit","spike"]});
    const s=g.debug.dashball.state,r=g.debug.dashball.arena.rings.find(r=>r.team===1&&r.row===0);Object.assign(s.ball,{x:r.line-900,y:(r.top+r.bottom)/2,vx:1800,vy:-220});
    s.golden.health=1;D.goldenRush.hit(s,g.debug.fighters[0],attack(700),g.debug.dashball.world(0));s.golden.respawn=.7;
    g.debug.dashball.knockout(1);s.respawns[g.debug.fighters[1].id]=.8;
  }
  const saved=ref.rb.save(),frames=[],manager=late.rb.manager(0,8),pending=[];
  for(let i=0;i<180;i++){const local=R.encode({hasAim:true,aimX:1,aimY:-.4,punchHeld:i%23<8}),remote=R.encode({hasAim:true,aimX:-1,dashHeld:i%31<8});frames.push([local,remote].map(R.decode));pending.push({frame:i,input:remote});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(local));ref.rb.step(frames[i]);}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(late.rb.hash(),ref.rb.hash());assert(manager.rollbacks>0);
  const final=ref.rb.hash();ref.rb.restore(saved);for(const inputs of frames)ref.rb.step(inputs);assert.equal(ref.rb.hash(),final);
  assert(ref.debug.dashball.state.ringPoints[0]>0);assert(ref.debug.dashball.state.golden.active);assert(!ref.debug.fighters[1].koScored);
  const peer=createGame();peer.debug.online.installSnapshot(JSON.parse(JSON.stringify(ref.debug.online.createSnapshot())));assert.equal(JSON.stringify(peer.debug.dashball.state),JSON.stringify(ref.debug.dashball.state));
});
check("ten-CPU decisions and objective movement match across independent peers",()=>{
  const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["orbit","spike","rain","chungus","anchor","whipado","archer","gunman","microusb","edgebert"],ai:true});
  for(let i=0;i<1200;i++){a.debug.dashball.step();b.debug.dashball.step();if(i%60===0)assert.equal(a.rb.hash(),b.rb.hash());}
  assert.equal(a.rb.hash(),b.rb.hash());assert(a.debug.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));assert(a.debug.dashball.state.golden.flight>0);
});
console.log(`${groups} Golden Rush groups passed`);
