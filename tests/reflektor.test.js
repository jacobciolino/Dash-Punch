"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const DT=1/60,near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
function pose(f,x=450,y=-5000){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,hitstun:0,hitstop:0,invulnerable:0,spotDodgeInvuln:0});}
function guard(f,aim={x:1,y:0}){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchReleaseQueued:false,punchAim:aim,shieldActiveTime:0});}
function setup(arena,options={}){const g=createGame();if(arena)g.debug.dashball.setup({arena,ruleset:"battle",...options},{characters:["reflektor","anchor"],seed:812,ai:false});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["reflektor","anchor"],seed:812});g.debug.fighters.forEach((f,i)=>pose(f,450+i*400));guard(g.debug.fighters[0]);return g;}
function ball(g,speed=500,side=1){const f=g.debug.fighters[0],b=g.debug.dashball.state.ball;Object.assign(b,{x:f.x+side*80,y:f.y,vx:-side*speed,vy:0,carrier:null});return b;}
test("Reflektor is core fighter 18, with ordinary offense, fragile long shield and slow shield walk",()=>{
  const g=setup(),f=g.debug.fighters[0],a=g.debug.fighters[1];assert.equal(g.rb.characterKeys.indexOf("reflektor"),17);assert.equal(f.data.maxHealth,165);assert.equal(f.data.maxAirDashes,3);assert.equal(f.data.shieldMax,36);near(g.debug.shields.duration(0),10);near(g.debug.shields.recoverySeconds(0),15);
  for(const key of["dashBase","dashMax","airDashScale"])assert.equal(f.data[key],a.data[key]);assert.equal(f.data.punchDamage,16);assert.equal(f.data.punchKnockback,820);near(f.data.shieldPadding,40);near(f.data.shieldCoverageHalfAngle,80*Math.PI/180);
  Object.assign(f,{onGround:true,hasLiveAim:true,aim:{x:1,y:0}});for(let n=0;n<60;n++)g.debug.shields.walk(0);near(f.vx,132*.9*.35);f.chargingPunch=false;for(let n=0;n<60;n++)g.debug.shields.walk(0);near(f.vx,132*.9);
});
test("reflection is relative to shield velocity and follows angled normals, with bounded speed",()=>{
  const g=setup(),f=g.debug.fighters[0],s=g.debug.shields;let r=s.mirrorVelocity(0,{vx:-500,vy:80});near(r.x,425);near(r.y,80);near(r.inward,500);
  f.vx=40;r=s.mirrorVelocity(0,{vx:-500,vy:0});near(r.x,499);near(r.inward,540);f.vx=0;
  r=s.mirrorVelocity(0,{vx:-500,vy:0},"ball",{x:Math.SQRT1_2,y:-Math.SQRT1_2});assert(r.y< -400);assert(r.x> -100);
  for(const[kind,cap]of[["ball",2050],["fighter",1500],["boulder",700]]){r=s.mirrorVelocity(0,{vx:-100000,vy:1000},kind);assert(Math.hypot(r.x,r.y)<=cap+1e-6);}
});
test("front coverage reflects a ball, rear coverage remains vulnerable",()=>{
  const g=setup("standard"),b=ball(g);assert(g.debug.shields.mirrorContact(0,b));assert(b.vx>0);const health=g.debug.fighters[0].shieldHealth;ball(g,500,-1);assert(!g.debug.shields.mirrorContact(0,b));near(g.debug.fighters[0].shieldHealth,health);
});
test("high energy drains more durability; lingering contacts never repeat full impacts",()=>{
  const slow=setup("standard"),fast=setup("standard"),a=ball(slow,20),b=ball(fast,800);slow.debug.shields.mirrorContact(0,a);fast.debug.shields.mirrorContact(0,b);assert(slow.debug.fighters[0].shieldHealth>fast.debug.fighters[0].shieldHealth+8);
  const hp=fast.debug.fighters[0].shieldHealth;for(let n=0;n<100;n++){b.x=530;b.y=-5000;b.vx=-800;fast.debug.shields.mirrorContact(0,b);}near(fast.debug.fighters[0].shieldHealth,hp);
  b.x=1000;fast.debug.shields.tick(0,0);assert.equal(Object.keys(fast.debug.fighters[0].mirrorContacts).length,0);ball(fast,800);fast.debug.shields.mirrorContact(0,b);assert(fast.debug.fighters[0].shieldHealth<hp-8);
});
test("damaging collisions break shields; voluntary release and hold timeout do not",()=>{
  const g=setup("standard"),f=g.debug.fighters[0],b=ball(g,1000);f.shieldHealth=2;g.debug.shields.mirrorContact(0,b);near(f.shieldHealth,0);assert.equal(f.stunType,"shieldBreak");assert(f.hitstun>1);near(f.shieldRegenDelay,2.4);
  const t=setup(),h=t.debug.fighters[0];h.shieldHealth=12;t.debug.shields.tick(0,10);assert(h.punchExhausted);near(h.shieldHealth,12);near(h.hitstun,0);h.chargingPunch=false;t.debug.shields.tick(0,1);assert(h.shieldHealth>12&&h.shieldHealth<15);
});
test("fighter entry causes impact damage once; slow pushing causes none",()=>{
  for(const speed of[15,700]){const g=setup(),[f,t]=g.debug.fighters;pose(t,530,f.y);t.vx=-speed;const hp=t.health;g.debug.shields.fighterContacts();assert(t.vx>0);assert.equal(t.health<hp,speed>140);const after=t.health,shield=f.shieldHealth;pose(t,530,f.y);t.vx=-speed;g.debug.shields.fighterContacts();near(t.health,after);near(f.shieldHealth,shield);}
});
test("fast fighters sweep into the shield rather than tunneling behind it",()=>{
  const g=setup(),[f,t]=g.debug.fighters;pose(t,410,f.y);t.prevX=650;t.vx=-1400;g.debug.shields.fighterContacts();assert(t.x>f.x+60);assert(t.vx>0);assert(t.health<t.data.maxHealth);
});
test("Court and disabled friendly fire never turn reflection into teammate damage",()=>{
  for(const court of[false,true]){const g=setup("standard",{ruleset:court?"court":"battle",teamSize:2}),[f,,t]=g.debug.fighters;pose(t,530,f.y);t.vx=-800;const saved=g.rb.save();saved.core.teamAttackEnabled=false;g.rb.restore(saved);const target=g.debug.fighters[2],hp=target.health;g.debug.shields.fighterContacts();near(target.health,hp);}
  const g=setup("standard",{ruleset:"court"}),b=ball(g);g.debug.shields.mirrorContact(0,b);assert(b.vx>0);
});
test("native ball substeps reflect without scoring or changing permanent Target Charge ownership",()=>{
  for(const arena of["standard","basketball","golden-rush","target-charge-stationary","volleyball"]){const g=setup(arena),f=g.debug.fighters[0],b=ball(g,750);pose(f,1000,600);Object.assign(b,{x:1080,y:600});const owner=b.scoringTeam,score=plain(g.debug.dashball.state.scores),charges=f.airDashes;g.debug.dashball.ballStep();assert(b.vx>0,arena);assert(f.shieldHealth<36,arena);assert.equal(b.scoringTeam,owner);assert.deepEqual(plain(g.debug.dashball.state.scores),score);assert.equal(f.airDashes,charges);}
});
test("boulder and sandbag reflection remain bounded, heavy and non-scoring",()=>{
  const g=setup("boulder-control"),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;pose(f,1000,600);Object.assign(b,{x:1000+b.r+60,y:600,vx:-400,vy:0});g.debug.dashball.ballStep();assert(b.vx>0&&b.vx<=700);assert(f.shieldHealth<36);assert.deepEqual(plain(g.debug.dashball.state.scores),[0,0]);
  const s=createGame();s.debug.sandbag.setup({ruleset:"brawl"},{characters:["reflektor","anchor"],ai:false});const m=s.debug.fighters[0],bag=s.debug.sandbag.state.bags[0];pose(m,450,600);guard(m);Object.assign(bag,{x:530,y:600,vx:-500,vy:0});const damage=bag.damage;s.debug.sandbag.world(DT).mirrorShield(m,bag);assert(bag.vx>0);assert.equal(bag.damage,damage);
});
test("native projectile reflection transfers ownership without duplication or a damage buff",()=>{
  for(const key of["gunman","boomerangus"]){const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,"reflektor"],seed:812});const [a,t]=g.debug.fighters;pose(a,525);pose(t,450);guard(t);g.debug.booster.punch(0,.2,{x:-1,y:0});const attack=a.attack;attack.projectile={x:525,y:-5000,radius:10,speed:900,damage:16,knockback:820,remainingLife:5,persistent:true,ownerId:a.id,ownerTeam:a.team};const p=attack.projectile;
    g.debug.resolveHit(0,1);assert.equal(attack.reflectedOwnerId,t.id);assert.equal(p.ownerTeam,t.team);assert(attack.dir.x>0);near(p.damage,16);near(p.knockback,820);assert(p.remainingLife<=2.5);assert(t.shieldHealth<36);
  }
});
test("a real reflected Boomerang retains one weapon, resets recall and homes to its new controller",()=>{
  const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["boomerangus","reflektor"],seed:812});const [a,f]=g.debug.fighters;pose(a,800);pose(f,450);guard(f);
  g.debug.booster.punch(0,0,{x:-1,y:0});const attack=a.attack;g.debug.updateAttack(0,attack.startup+1e-8);const shot=attack.projectile;assert(shot.boomerang);assert.equal(a.projectiles.length,1);
  Object.assign(shot,{x:550,y:f.y,vx:-900,vy:0,speed:900});Object.assign(shot.boomerang,{heading:Math.PI,launchSpeed:900,recallCharge:1.2});g.debug.updateProjectiles(.04);
  assert.equal(attack.reflectedOwnerId,f.id);assert.equal(shot.boomerang.recallOwnerId,f.id);near(shot.boomerang.recallCharge,0);assert(shot.vx>0);assert.equal(a.projectiles.length,1);assert.equal(f.projectiles.length,0);const damage=shot.damage,knockback=shot.knockback;
  pose(a,1600);for(let n=0;n<240&&a.projectiles.length;n++)g.debug.updateProjectiles();assert.equal(a.projectiles.length,0);assert(g.debug.boomerang.ready(0));near(shot.damage,damage);near(shot.knockback,knockback);
});
test("wrapped shields reflect at the seam without losing permanent ball identity",()=>{
  const g=setup("standard-open"),f=g.debug.fighters[0],b=g.debug.dashball.state.ball,width=g.debug.dashball.arena.width;pose(f,width-30,600);Object.assign(b,{x:45,y:600,vx:-600,vy:0});const id=b.id;g.debug.dashball.ballStep();assert(b.vx>0);assert(f.shieldHealth<36);assert.equal(b.id,id);
});
test("reflection contact generations and resources restore, replay and reset cleanly",()=>{
  const a=setup("standard"),b=setup("standard"),ballA=ball(a,600);a.debug.shields.mirrorContact(0,ballA);const saved=a.rb.save();b.rb.restore(saved);assert.equal(a.rb.hash(),b.rb.hash());assert(b.debug.fighters[0].mirrorContacts);const hp=b.debug.fighters[0].shieldHealth;b.debug.shields.mirrorContact(0,b.debug.dashball.state.ball);near(b.debug.fighters[0].shieldHealth,hp);
  const rows=Array.from({length:120},(_,n)=>[{hasAim:true,aimX:1,punchHeld:n%90<80},{hasAim:true,aimX:-1,dashHeld:n%37<10}]);for(const row of rows)a.rb.step(row);const hash=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);a.debug.fighters[0].reset(true);assert(!a.debug.fighters[0].mirrorContacts);near(a.debug.fighters[0].shieldHealth,36);
});
test("delayed-input rollback agrees after native shield/object impacts",()=>{
  const a=setup("standard"),b=setup("standard");for(const g of[a,b]){const f=g.debug.fighters[0];pose(f,1000,600);ball(g,800);}const manager=b.rb.manager(0,8),pending=[];
  for(let n=0;n<240;n++){const row=[R.encode({hasAim:true,aimX:1,punchHeld:n%120<90}),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(n*.1),punchHeld:n%43<10})];pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());
});
test("30/60/120 Hz have identical fixed-step Reflektor state",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.matchFlow.step();g.listeners.get("keydown")({code:"KeyF",repeat:false,preventDefault(){},target:{tagName:"BODY"}});for(let n=1;n<=hz*4;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("ten native Reflektor CPUs use deterministic inputs and bounded physical state",()=>{
  const hashes=[];let shielding=0;for(let run=0;run<2;run++){const g=createGame();g.debug.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["reflektor"],ai:true,seed:812});for(let n=0;n<180;n++){g.debug.dashball.step();shielding+=g.debug.fighters.filter((f,i)=>g.debug.isShielding(i)).length;assert(g.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));}hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);assert(shielding>0);
});
test("existing fighter/sports simulations match the pre-Reflektor checkpoint",()=>{
  const before=execFileSync("git",["show","207fe55:game.js"],{encoding:"utf8"});for(const arena of[null,"standard","boulder-control"]){const old=createGame(process.cwd(),{sourceOverrides:{"game.js":before}}),now=createGame();for(const g of[old,now]){if(arena)g.debug.dashball.setup({arena},{characters:["anchor","spike"],seed:812});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["anchor","spike"],seed:812});}for(let n=0;n<120;n++){const row=[{hasAim:true,aimX:1,punchHeld:n%40<20},{hasAim:true,aimX:-1,dashHeld:n%50<10}];old.rb.step(row);now.rb.step(row);assert.equal(now.rb.hash(),old.rb.hash());}}
});
