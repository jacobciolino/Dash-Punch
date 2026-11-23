"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),D=require("../dashball"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let passed=0;
function check(label,fn){fn();passed++;console.log(`ok ${label}`);}
function fixture(config={}){
  const stage=D.arena("boulder-control",154,config),state=D.create({...config,arena:"boulder-control"},stage);
  const world={stage,gravity:{x:0,y:1},fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:()=>stage.terrain,
    body:f=>({x:f.x-23,y:f.y-33,w:46,h:66}),shielding:f=>!!f.shielding,shieldAim:f=>f.aim||{x:1,y:0},shieldCovers:()=>true,shieldPadding:()=>24,kicking:()=>false};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++)D.step(state,dt,world);}};
}
function fighter(id="p1",team=0){return {id,team,x:1000,y:700,prevX:1000,prevY:700,vx:0,vy:0,invulnerable:0,airDashes:0,
  data:{width:46,height:66,punchKnockback:800,punchDamage:12,punchReach:70,dashBase:600,dashMax:1000,groundPunchLaunchMult:1.08},dashReboundLockout:0};}
function attack(id,dir={x:1,y:0},charge=0){return {id,dir,charge,age:.12,startup:.1,active:12,recovery:.2,total:12.3,hitTargets:new Set()};}
function realAttack(g,id,dir={x:1,y:0},charge=0){return {...attack(id,dir,charge),hitTargets:new (vm.runInContext("Set",g.sandbox))()};}
check("registry, Battle-only rules, defaults, bounded options and clean round-trip",()=>{
  assert.equal(D.ARENAS.find(a=>a.id==="boulder-control").name,"Boulder Control");const c=D.options({arena:"boulder-control",ruleset:"court"});
  assert.equal(c.ruleset,"battle");assert.equal(c.winningScore,100);assert.equal(c.duration,0);assert.equal(c.ballRadius,270);assert.equal(c.respawn,15);assert.equal(c.healthMult,.5);
  assert.deepEqual(D.options(JSON.parse(JSON.stringify(c))),c);
  const bad=D.options({...c,boulderDiameter:99999,boulderMass:-1,boulderBounce:100,zoneWidth:1,bonusHeight:0});
  assert(bad.boulderDiameter<=616&&bad.boulderDiameter>=462);assert(bad.boulderMass>=2.5);assert(bad.boulderBounce<=.8);assert(bad.zoneWidth<=.27);assert(bad.bonusHeight>bad.boulderDiameter+28);
});
check("Blue-left/Red-right five regions, boulder clearance, three solid perches and full camera",()=>{
  for(const config of [{},{boulderDiameter:612,zoneWidth:.2},{boulderDiameter:462,zoneWidth:.27,bonusHeight:800}]){
    const f=fixture(config),s=f.stage,[blue,red]=s.zones;assert.equal(blue.team,1);assert.equal(red.team,0);
    near(blue.left/s.width,.09,1/s.width);near(blue.right/s.width,.09+f.state.config.zoneWidth,1/s.width);near(red.right/s.width,.91,1/s.width);
    assert(blue.right-blue.left>=f.state.ball.r*2*1.22-1);assert(s.goals.length===0&&s.ballOnly.length===0);
    assert(s.floorY-blue.top-28>f.state.ball.r*2);assert.equal(s.terrain.filter(t=>t.kind==="platform").length,3);
    assert(s.terrain.filter(t=>t.kind==="platform").every(t=>t.w<f.state.ball.r));assert(s.cameraHeader+s.height*s.cameraZoom<=720);
  }
});
check("light nudges accumulate, charged/heavy hits scale, mass resists without replacing velocity",()=>{
  const f=fixture(),p=fighter(),b=f.state.ball;Object.assign(b,{vx:120,vy:-80});
  D.shot(f.state,p,attack(1),f.world);const impulse=b.vx-120;assert(impulse>150&&impulse<350);near(b.vy,-80);
  D.shot(f.state,p,attack(2),f.world);assert(b.vx>120+impulse&&b.vx<120+2*impulse,"same-direction momentum adds with the requested diminishing transfer");
  b.vx=0;D.shot(f.state,p,attack(3,{x:1,y:0},1),f.world);assert(b.vx>impulse*1.6);
  const charged=b.vx;b.vx=0;p.data.punchKnockback=1400;p.data.punchDamage=30;D.shot(f.state,p,attack(4,{x:1,y:0},1),f.world);assert(b.vx>charged*1.5);
  const heavy=fixture({boulderMass:7});D.shot(heavy.state,fighter(),attack(1),heavy.world);assert(heavy.state.ball.vx<impulse*.7);
});
check("one live attack generation hits once beyond eight seconds; combo/multiplayer hits remain distinct",()=>{
  const f=fixture(),p=fighter(),a=attack(15);p.attack=a;f.world.fighters=[p];let rewards=0;f.world.onShot=(_f,_a,_k,r)=>rewards+=Number(r);
  assert(D.shot(f.state,p,a,f.world));const vx=f.state.ball.vx;assert(!D.shot(f.state,p,a,f.world));near(f.state.ball.vx,vx);assert.equal(rewards,1);
  f.state.time=10;Object.assign(f.state.ball,{x:1500,y:700,vx:0,vy:0});f.tick();assert(!D.shot(f.state,p,a,f.world));
  a.contactId=16;assert(D.shot(f.state,p,a,f.world));const before=f.state.ball.vx;assert(D.shot(f.state,fighter("p2",1),attack(16),f.world));assert(f.state.ball.vx>before);
  const normal=fixture(),electric=fixture();D.shot(normal.state,p,attack(20),normal.world);D.shot(electric.state,p,{...attack(20),electricTick:true},electric.world);near(electric.state.ball.vx,normal.state.ball.vx*.22);
});
check("circular contact rejects invisible square corners and accepts real polygon/edge hits",()=>{
  const b={x:0,y:0,r:270};assert(!D.boulderControl.circleAttackContact({x:250,y:250,w:20,h:20},b));
  assert(D.boulderControl.circleAttackContact({points:[{x:260,y:-10},{x:300,y:-10},{x:300,y:10},{x:260,y:10}]},b));
  assert(D.boulderControl.circleAttackContact({points:[{x:-300,y:-300},{x:300,y:-300},{x:300,y:300},{x:-300,y:300}]},b));
});
check("floor, roof, thin platform and edge collisions retain bounded physical bounces",()=>{
  for(const place of ["floor","roof","platform","edge"]){
    const f=fixture(),b=f.state.ball,p=f.stage.terrain.find(t=>t.boulderBonus===1);
    Object.assign(b,{x:place==="platform"||place==="edge"?p.x+p.w/2+(place==="edge"?p.w/2+100:0):1500,
      y:place==="roof"?b.r+27:place==="floor"?f.stage.floorY-b.r-5:p.y-b.r-5,vx:0,vy:place==="roof"?-1700:1700});
    f.tick(place==="edge"?2:1);assert.equal(Math.sign(b.vy),place==="roof"?1:-1,place);assert(Math.hypot(b.vx,b.vy)<=f.state.config.maxSpeed+.001);
    assert(b.y>=24+b.r-1e-5&&b.y<=f.stage.floorY-b.r+1e-5);if(place==="edge")assert(Math.abs(b.vx)>50);
  }
});
check("large fast boulder cannot tunnel or remain embedded through prolonged platform contact",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{x:615,y:320,vx:900,vy:90000});
  for(let i=0;i<1500;i++){
    f.tick();assert([b.x,b.y,b.vx,b.vy].every(Number.isFinite));assert(Math.hypot(b.vx,b.vy)<1700.01);
    for(const rect of f.stage.terrain){const n=D.circleRect(D.relativeBall(b,rect.x+rect.w/2,f.stage),rect);assert(!n||n.depth<.1,JSON.stringify({i,n,rect}));}
  }
});
check("wrap preserves all momentum, spin and attack history; no seam impulse or duplicate contact",()=>{
  const f=fixture(),b=f.state.ball;Object.assign(b,{x:f.stage.width-2,y:700,vx:900,vy:200,spin:1,angularVelocity:2,attacks:{"p1:99":0}});f.tick();
  near(b.x,13);near(b.vx,900);near(b.vy,200+760*dt);near(b.angularVelocity,2*Math.exp(-D.boulderControl.physics.airSpinDrag*dt));assert(b.spin>=1+b.angularVelocity*dt&&b.spin<=1+2*dt);assert.equal(b.attacks["p1:99"],0);assert(Math.abs(b.x-b.prevX)<20);
  Object.assign(b,{x:2,y:f.stage.floorY-b.r,vx:-900,vy:0});f.tick();assert(b.x>f.stage.width-20);assert(b.vx<0);
});
check("center boundaries, aerial 2x without support, and dead/neutral/outside regions",()=>{
  const f=fixture(),b=f.state.ball,[blue,red]=f.stage.zones;
  for(const zone of [blue,red]){
    for(const [x,team,m] of [[zone.left-1,null,0],[zone.left,zone.team,1],[zone.right-.01,zone.team,1],[zone.right,null,0]]){
      Object.assign(b,{x,y:zone.top+100});assert.deepEqual(D.boulderControl.region(f.stage,b),{team,multiplier:m});
    }
    b.x=(zone.left+zone.right)/2;b.y=zone.top-1;assert.equal(D.boulderControl.region(f.stage,b).multiplier,2);
    b.y=zone.top;assert.equal(D.boulderControl.region(f.stage,b).multiplier,1);
  }
  for(const x of [-1,0,100,1500,2900,3000]){b.x=x;assert.equal(D.boulderControl.region(f.stage,b).team,null);}
});
check("1x/2x accrual, stable fractional units and first-to-100 victory",()=>{
  const totals=[];for(const hz of [30,60,120]){const f=fixture(),b=f.state.ball;b.x=615;b.y=1000;
    for(let i=0;i<hz*7;i++)D.boulderControl.score(f.state,f.stage,1/hz);near(f.state.scores[1],7);
    b.y=500;for(let i=0;i<hz*3;i++)D.boulderControl.score(f.state,f.stage,1/hz);near(f.state.scores[1],13);totals.push(f.state.boulder.scoreUnits[1]);
  }assert.deepEqual(totals,[780000,780000,780000]);
  const f=fixture();f.state.ball.x=615;f.state.ball.y=500;f.state.boulder.scoreUnits[1]=5999000;f.state.scores[1]=5999000/60000;
  D.boulderControl.score(f.state,f.stage,dt);assert.equal(f.state.scores[1],100);assert.equal(f.state.winner,1);assert.equal(f.state.phase,"finished");
  D.boulderControl.score(f.state,f.stage,10);assert.equal(f.state.scores[1],100);assert(!D.goal(f.state,0));
});
check("collision substeps count elapsed time once and held/stopped physics cannot farm points",()=>{
  const f=fixture();Object.assign(f.state.ball,{x:615,y:1400,vx:50,vy:0});f.tick(60);near(f.state.scores[1],1);
  f.state.phase="countdown";const score=f.state.scores[1];f.tick(60);near(f.state.scores[1],score);
  f.state.phase="playing";Object.assign(f.state.ball,{x:1500,y:1400,vx:0,vy:0});f.tick(60);near(f.state.scores[1],score);
});
check("no time limit by default; optional leader/tie-overtime and ordinary rematch flow",()=>{
  const f=fixture();assert(D.clock(f.state,500,f.stage).play);assert.equal(f.state.remaining,0);
  const timed=fixture({duration:15});timed.state.remaining=.001;D.clock(timed.state,dt,timed.stage);assert(timed.state.overtime);
  timed.state.ball.x=615;timed.state.ball.y=1000;D.boulderControl.score(timed.state,timed.stage,dt);assert.equal(timed.state.winner,1);
});
check("shield safely deflects but cannot pocket a giant boulder or farm resources",()=>{
  const f=fixture(),p=fighter();p.x=p.prevX=1000;p.y=p.prevY=1300;p.shielding=true;p.aim={x:1,y:0};p.data.shieldThornsDamage=5;f.world.fighters=[p];
  Object.assign(f.state.ball,{x:1300,y:1300,vx:-900,vy:0,launched:2,ownerId:"p2",ownerTeam:1});let shields=0,hits=0;f.world.onShield=()=>shields++;f.world.onKnockdown=()=>hits++;
  f.tick(4);assert.equal(f.state.ball.carrier,null);assert(f.state.ball.vx>0);assert.equal(hits,0);assert.equal(shields,1);assert.deepEqual(f.state.rewardUntil,{});
});
check("actual hits confirm/cancel/refill; Kickoffs restore one dash, not unlimited overlap",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control"},{characters:["orbit","spike"]});const f=d.fighters[0],b=d.dashball.state.ball;
  Object.assign(f,{x:1100,y:1300,prevX:1100,prevY:1300,airDashes:0,whiffLag:.3,punchLockout:.3});f.attack=realAttack(g,301);Object.assign(b,{x:1400,y:1300,vx:0,vy:0});d.dashball.ballStep();
  assert.equal(f.attack,null);assert.equal(f.whiffLag,0);assert.equal(f.punchLockout,0);assert.equal(f.airDashes,f.data.maxAirDashes);assert.equal(b.ownerId,f.id);
  d.dashball.state.time+=.3;
  Object.assign(f,{x:1100,y:1300,prevX:1100,prevY:1300,vx:800,vy:0,dashDir:{x:1,y:0},dashCarryTimer:.3,onGround:false,wallSliding:false,hitstop:0,airDashes:0,dashReboundLockout:0,punchInputHeld:false});
  Object.assign(b,{x:1390,y:1300,vx:0,vy:0,contacts:{}});d.dashball.ballStep();assert.equal(f.airDashes,1);assert(f.dashReboundLockout>0);const n=d.dashball.state.boulder.launchSerial;d.dashball.ballStep();assert.equal(d.dashball.state.boulder.launchSerial,n);
});
check("body contact displaces fighters, not boulder teleports; no HP or repeated launch stun",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control"});const f=d.fighters[0],b=d.dashball.state.ball;
  Object.assign(f,{x:1500,y:1600,prevX:1500,prevY:1600,vx:0,vy:0,onGround:false});Object.assign(b,{x:1500,y:1550,vx:0,vy:0});
  d.dashball.ballStep();near(b.x,1500);assert(Math.abs(f.x-b.x)>140);assert(!D.circleRect(b,{x:f.x-f.data.width/2,y:f.y-f.data.height/2,w:f.data.width,h:f.data.height}));assert(f.y<=d.dashball.arena.floorY-f.data.height/2);assert(f.health>0);
});
check("Bullet/Arrow hit and reflect rules, independent magazines and objective gravity remain",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control"},{characters:["gunman","archer"]});const f=d.fighters[0],b=d.dashball.state.ball,ammo=f.ammo;
  const a=realAttack(g,401);a.projectile={x:1100,y:700,radius:8,speed:1800,spawned:true,damage:10,knockback:620,hitstun:.07};f.projectiles=[a];Object.assign(b,{x:1390,y:700,vx:100,vy:0});d.updateProjectiles(.02);
  assert.equal(f.projectiles.length,0);assert.equal(b.ownerId,f.id);assert(Math.hypot(b.vx-100,b.vy)>50);assert.equal(f.ammo,ammo);
  Object.assign(b,{x:1800,y:1200,vx:0,vy:0});d.gravity.setDirection("y",-1);d.dashball.ballStep();assert(b.vy<0);
});
check("native magazine shots can be reflected into the boulder without restoring ammo or repeated impulse",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control"},{characters:["gunman","archer"]});const [gun,archer]=d.fighters,b=d.dashball.state.ball;
  Object.assign(gun,{x:1000,y:1300,prevX:1000,prevY:1300,onGround:false});
  for(const held of [true,false]){Object.assign(gun.controls,{hasAim:true,aim:{x:1,y:0}});gun.controls.actions.punchHeld=held;gun.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(0);}
  const a=gun.attack;assert(a.projectile);d.updateAttack(0,a.startup+1e-8);assert(a.projectile.persistent);assert.equal(gun.ammo,2);
  d.projectileMagazine.reflect(a,1,{x:1,y:0});assert.equal(archer.ammo,5);
  Object.assign(a.projectile,{x:1100,y:1300,vx:1800,vy:0,speed:1800});Object.assign(b,{x:1390,y:1300,vx:0,vy:0});d.updateProjectiles(.02);
  assert.equal(b.ownerId,archer.id);assert(b.vx>0);const serial=d.dashball.state.boulder.launchSerial;d.updateProjectiles(.02);assert.equal(d.dashball.state.boulder.launchSerial,serial);assert.equal(gun.ammo,2);assert.equal(archer.ammo,5);
});
check("ten team-side spawns, fighter wraps, Battle KOs and individual respawns preserve objective",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control",teamSize:5,respawn:10});
  assert.equal(d.fighters.length,10);for(const f of d.fighters)assert.equal(f.x<1500,f.team===1);
  const f=d.fighters[0];Object.assign(f,{x:3001,y:1300,prevX:3001,prevY:1300,vx:500,vy:-100,onGround:false,hitstun:.2});d.gravity.physics(0);assert(f.x<100);assert(f.vx>0);assert(f.hitstun>0);
  const s=d.dashball.state;Object.assign(s.ball,{x:1800,y:1200,vx:100,vy:-300});s.scores=[8,11];const before={...s.ball};d.dashball.knockout(1);assert.equal(s.scores[0],8);assert.equal(s.scores[1],11);assert.equal(s.ball.x,before.x);
  s.respawns.p2=.001;d.dashball.step();const p=d.fighters[1];assert(!p.koScored);assert(p.x<1500);assert(p.invulnerable>1.9);near(p.health,Math.round(p.data.maxHealth*.5));
});
check("heavy/core fighters reach bonus platforms, then the neutral perch with existing movement",()=>{
  const g=createGame(),d=g.debug;for(const key of ["chungus","orbit","kite","edgebert","whipado","anchor"]){d.dashball.setup({arena:"boulder-control"},{characters:[key,"spike"]});const f=d.fighters[0],s=d.dashball.arena;
    Object.assign(f,{x:1200,y:s.floorY-f.data.height/2,prevX:1200,prevY:s.floorY-f.data.height/2,onGround:true,tippyToes:true,tippyToesHold:2,tippyDashQueued:true,aim:{x:0,y:-1},hasLiveAim:true});
    d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let feet=f.y+f.data.height/2;
    for(let i=0;i<150;i++){if(!f.onGround&&f.vy>=0&&f.airDashes>0)d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);d.gravity.physics(0);feet=Math.min(feet,f.y+f.data.height/2);}
    assert(feet<s.zones[0].top,`${key} cannot reach the bonus ledge: ${feet}`);
    Object.assign(f,{x:1200,y:s.zones[0].top-f.data.height/2,prevX:1200,prevY:s.zones[0].top-f.data.height/2,vx:0,vy:0,onGround:true,tippyToes:true,tippyDashQueued:true,airDashes:f.data.maxAirDashes});
    d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let highest=f.y+f.data.height/2;
    for(let i=0;i<100;i++){d.gravity.physics(0);highest=Math.min(highest,f.y+f.data.height/2);}
    assert(highest<s.terrain.find(t=>t.boulderPerch).y,`${key} cannot reach the neutral perch from the bonus platform: ${highest}`);
  }
});
check("AI holds secure territory, can plan braking/bonus, and ten CPUs make deterministic progress",()=>{
  const f=fixture(),p=fighter(),zone=f.stage.zones.find(z=>z.team===0);Object.assign(f.state.ball,{x:(zone.left+zone.right)/2,y:500,vx:0,vy:0});
  const plan=D.boulderControl.plan(f.state,p,f.world);assert(plan.secure&&!plan.lift);
  Object.assign(f.state.ball,{x:2600,y:1500,vx:1100});const braking=D.boulderControl.plan(f.state,p,f.world);assert(braking.aim.x<0||braking.kick);
  const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena:"boulder-control",teamSize:5},{characters:["orbit","spike","rain","whipado","chungus","gunman","archer","kite","anchor","edgebert"],ai:true,seed:733});
  for(let i=0;i<900;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());assert(games[0].debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));}
  const s=games[0].debug.dashball.state;assert(s.ball.ownerId);assert(s.scores[0]+s.scores[1]>0);console.log({aiScores:s.scores,contacts:Object.keys(s.ball.attacks).length});
});
check("1v1/3v3/5v5 replay, host snapshot and render purity preserve fractional score/ball state",()=>{
  for(const size of [1,3,5]){
    const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:"boulder-control",teamSize:size},{seed:30});const start=a.rb.save(),inputs=[];
    for(let i=0;i<150;i++){const row=a.debug.fighters.map((f,n)=>({aimX:n%2?1:-1,aimY:-.4,punchHeld:i%29<8,dashHeld:i%40<9}));inputs.push(row);assert.equal(a.rb.step(row),b.rb.step(row));}
    const hash=a.rb.hash();a.rb.restore(start);for(const row of inputs)a.rb.step(row);assert.equal(a.rb.hash(),hash);a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),hash);
    b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(JSON.stringify(a.debug.dashball.state.boulder),JSON.stringify(b.debug.dashball.state.boulder));
  }
});
check("late-input rollback restores wrap, scoring, collisions and respawns without duplicate points",()=>{
  for(const scenario of ["scoring","wrap","respawn"]){const a=createGame(),b=createGame();for(const g of [a,b]){
    g.debug.dashball.setup({arena:"boulder-control"});Object.assign(g.debug.dashball.state.ball,{x:scenario==="wrap"?2990:615,y:1300,vx:scenario==="wrap"?1000:80,vy:-100});
    if(scenario==="respawn"){g.debug.dashball.knockout(1);g.debug.dashball.state.respawns.p2=.4;}
  }
  const manager=b.rb.manager(0,8),pending=[];for(let frame=0;frame<180;frame++){
    const l=R.encode({aimX:-1,aimY:-.7,dashHeld:frame%37<8,punchHeld:frame%31<10}),r=R.encode({aimX:1,aimY:frame%20<10?-.5:.5,dashHeld:frame%29<8,punchHeld:frame%23<7});
    pending.push({frame,input:r});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(l));a.rb.step([l,r].map(R.decode));
  }for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),scenario);assert(manager.rollbacks>0);}
});
check("30/60/120Hz rendering advances identical objective/scoring/fighter simulation",()=>{
  const hashes=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"boulder-control"});Object.assign(g.debug.dashball.state.ball,{x:615,y:1300,vx:20,vy:0});
    for(let i=1;i<=hz*3;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());
  }assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
});
check("all prior sports/Versus match 1,920 pre-change frame hashes without baseline replacement",()=>{
  const baseline=require("./boulder-control-before.json");for(const key of Object.keys(baseline)){
    const g=createGame();if(key==="versus")g.rb.setup({stageIndex:g.debug.stageNames.indexOf("Crosswire"),characterKeys:["orbit","spike"],seed:42});
    else if(["race","brawl","scramble"].includes(key))g.debug.sandbag.setup({ruleset:key});else{const [arena,ruleset]=key.split(":");g.debug.dashball.setup({arena,ruleset});if(arena==="gravity-soccer")g.debug.gravity.setDirection("y",-1);}
    for(let i=0;i<120;i++){
      let hash=g.rb.step(g.debug.fighters.map((f,n)=>({aimX:n?-1:1,aimY:-.3,dashHeld:i%37<8,punchHeld:i%29<10})));
      const captured=["standard","elevated","elevated-open","target-break","golden-rush","gravity-soccer"],id=key.split(":")[0];
      const shift=["race","brawl","scramble"].includes(key)?D.ARENAS.length-captured.length:captured.includes(id)?D.ARENAS.findIndex(a=>a.id===id)-captured.indexOf(id):0;
      if(shift){
        // Arena insertions shift IDs only. Preserve every gameplay field and
        // historical fixture, including terrain-contact identity suffixes.
        const core=JSON.parse(JSON.stringify(g.rb.save().core)),old=core.stageIndex-shift;core.stageIndex=old;
        for(const f of core.fighters)for(const field of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])
          if(typeof f[field]==="string")f[field]=f[field].replace(/^\d+:/,`${old}:`);
        hash=R.hash(core);
      }
      assert.equal(hash,baseline[key][i],`${key}:${i}`);
    }
  }
});
console.log(`${passed} Boulder Control groups passed`);
