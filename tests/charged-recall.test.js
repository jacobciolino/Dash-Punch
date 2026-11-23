"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),B=require("../boomerang"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let groups=0;
const check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);};
function setup(arena=null){const g=createGame();if(arena)g.debug.dashball.setup({arena,ruleset:"battle"},{characters:["boomerangus","orbit"],seed:117});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["boomerangus","orbit"],seed:117});for(const [i,f] of g.debug.fighters.entries())Object.assign(f,{x:500+i*1000,y:arena?600:-5000,prevX:500+i*1000,prevY:arena?600:-5000,onGround:false,vx:0,vy:0,health:10000,invulnerable:0});return g;}
function input(g,held,index=0,edge=true){const f=g.debug.fighters[index];Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.punchHeld=held;if(edge)f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;g.debug.updateHumanInput(index);}
function fire(g){const f=g.debug.fighters[0];f.whiffLag=f.punchLockout=f.hitstop=0;input(g,true);input(g,false);assert(f.attack);const a=f.attack;g.debug.updateAttack(0,a.startup+1e-8);return a;}
function place(a,x,y,vx,vy=0){const s=a.projectile;Object.assign(s,{x,y,vx,vy,speed:Math.hypot(vx,vy)});a.dir={x:vx/s.speed,y:vy/s.speed};s.boomerang.heading=Math.atan2(vy,vx);s.boomerang.launchSpeed=s.speed;}
function shot(){return {speed:1050,vx:1050,vy:0,boomerang:B.create(1050,{x:1,y:0},"p1")};}
check("exact recall anchors, continuous interpolation, proportional acceleration and smooth release",()=>{
  for(const [time,speed] of [[0,1100],[.3,1300],[.6,1550],[.9,1800],[1.2,2000]])near(B.recallSpeed(time),speed);
  near(B.recallSpeed(.45),1425);const s=shot();B.returning(s,{x:-1000,y:0});
  for(let i=0;i<72;i++){B.chargeRecall(s,dt,true,"p1");B.steer(s,dt,{x:-10000,y:0});}near(s.boomerang.recallCharge,1.2);near(s.speed,2000);
  const before=s.speed;B.chargeRecall(s,dt,false,"p1");B.steer(s,dt,{x:-10000,y:0});assert(s.speed<before&&s.speed>1900);
  for(let i=0;i<60;i++){B.chargeRecall(s,dt,false,"p1");B.steer(s,dt,{x:-10000,y:0});}near(s.speed,1100);near(s.boomerang.recallCharge,0);
  const normal=shot(),charged=shot();B.returning(normal,{x:-1000,y:0});B.returning(charged,{x:-1000,y:0});charged.boomerang.recallCharge=1.2;B.steer(normal,dt,{x:-1000,y:0});B.steer(charged,dt,{x:-1000,y:0});near(charged.speed/normal.speed,2000/1100);
});
check("outbound remains exactly 0.8 seconds regardless of stored charge, with faster baked spin",()=>{
  const normal=shot(),charged=shot();let a=0,b=0;
  for(let i=0;i<48;i++){B.chargeRecall(charged,dt,true,"p1");B.steer(normal,dt,{x:-1000,y:0});B.steer(charged,dt,{x:-1000,y:0});near(normal.speed,charged.speed);a+=normal.vx*dt;b+=charged.vx*dt;if(i<47)assert.equal(charged.boomerang.phase,"outbound");}
  near(a,b);near(charged.boomerang.phaseTime,0);assert.equal(charged.boomerang.phase,"return");assert(charged.boomerang.recallCharge>.79);assert(charged.boomerang.spinTime>normal.boomerang.spinTime);
});
check("shield and recall coexist without new costs, release queues or auto-throw after a high-speed catch",()=>{
  const g=setup(),f=g.debug.fighters[0],a=fire(g),s=a.projectile,shield=f.shieldHealth;
  input(g,true);for(let i=0;i<20;i++){input(g,true,0,false);g.debug.updateProjectiles(dt);}assert(g.debug.isShielding(0));assert(s.boomerang.recallCharge>.3);near(f.shieldHealth,shield);
  s.boomerang.phase="return";s.boomerang.recallCharge=1.2;place(a,f.x+180,f.y,-2000);g.debug.updateProjectiles(.1);assert.equal(f.projectiles.length,0);near(s.boomerang.recallCharge,0);
  for(let i=0;i<10;i++)input(g,true,0,false);assert(!f.attack);input(g,false);assert(!f.attack);assert(!f.punchReleaseQueued);
  f.punchLockout=f.whiffLag=f.shieldReleaseParry=0;input(g,true);input(g,false);assert(f.attack);
  const h=setup(),b=fire(h),owner=h.debug.fighters[0];input(h,true);input(h,false);assert(!owner.punchReleaseQueued);b.projectile.remainingLife=.001;h.debug.updateProjectiles(dt);owner.punchLockout=owner.whiffLag=0;input(h,false,0,false);assert(!owner.attack);
});
check("multiple distinct fighters in one sweep take ordinary damage without early recall or overlap farming",()=>{
  const g=setup("standard"),d=g.debug;d.dashball.setup({arena:"standard",teamSize:3},{characters:["boomerangus","orbit"]});const f=d.fighters[0];Object.assign(f,{x:500,y:600,invulnerable:0});for(const [i,t] of d.fighters.entries())if(i)Object.assign(t,{x:i<3?800+i*15:2000,y:i<3?600:300,prevX:i<3?800+i*15:2000,prevY:600,invulnerable:0,team:1,health:10000});
  const a=fire(g);place(a,730,600,1100);d.updateProjectiles(.09);for(const t of d.fighters.slice(1,3))assert(t.health<10000);assert.equal(a.projectile.boomerang.phase,"outbound");assert(a.dir.x>0);
  const once=d.fighters.slice(1,3).map(t=>t.health);for(let i=0;i<4;i++)d.updateProjectiles(0);assert.deepEqual(d.fighters.slice(1,3).map(t=>t.health),once);
  place(a,1100,600,-1100);B.returning(a.projectile,{x:-500,y:0});place(a,1100,600,-1100);a.hitTargets=new Set();for(const t of d.fighters.slice(1,3))t.invulnerable=t.hitstop=0;d.updateProjectiles(.23);for(let i=1;i<3;i++)assert(d.fighters[i].health<once[i-1]);
});
check("one flight can hit multiple sports balls while preserving permanent team ownership",()=>{
  for(const arena of ["total-rush","target-charge-stationary"]){const g=setup(arena),d=g.debug,s=d.dashball.state,a=fire(g),balls=D.balls(s);for(const [i,b] of balls.entries())Object.assign(b,{x:790+i*5,y:600,vx:0,vy:0,carrier:null});const teams=balls.map(b=>b.scoringTeam);place(a,740,600,1100);d.updateProjectiles(.08);for(const b of balls)assert(Math.hypot(b.vx,b.vy)>0);assert.deepEqual(balls.map(b=>b.scoringTeam),teams);assert.equal(a.projectile.boomerang.phase,"outbound");assert(d.fighters[0].projectiles.includes(a));}
});
check("solid walls separate and brake into early return without an instantaneous reversal or wall jitter",()=>{
  const g=setup("standard"),f=g.debug.fighters[0],a=fire(g),s=a.projectile;f.x=2100;place(a,2470,600,1100);f.punchInputHeld=true;g.debug.updateProjectiles(.05);assert.equal(s.boomerang.phase,"return");near(s.speed,0);assert(s.x+s.radius<2536);const charge=s.boomerang.recallCharge;g.debug.updateProjectiles(.03);near(s.speed,0);assert(s.boomerang.recallCharge>charge);
  for(let i=0;i<20;i++)g.debug.updateProjectiles(dt);assert(s.vx<0);assert(s.x<2490);assert(f.projectiles.includes(a));
});
check("wrap seams preserve outbound flight and current-controller shortest-route homing",()=>{
  const g=setup("standard-open"),d=g.debug,f=d.fighters[0],a=fire(g),s=a.projectile,w=d.dashball.arena.width;place(a,w+s.radius+1,600,1100);d.updateProjectiles(dt);assert(s.x<150);assert.equal(s.boomerang.phase,"outbound");assert(s.vx>0);const id=a.id;
  f.x=30;place(a,w-150,600,1100);s.boomerang.phase="return";d.updateProjectiles(dt);assert(s.vx>0);assert.equal(a.id,id);
});
check("gravity-switch consumption remains established and clears stored recall",()=>{
  const g=setup("gravity-soccer"),d=g.debug,a=fire(g),s=a.projectile,c=d.dashball.arena.gravitySwitch;place(a,c.x-110,c.y,1100);s.boomerang.recallCharge=1.2;const sign=d.gravity.direction;d.updateProjectiles(.08);assert.equal(d.fighters[0].projectiles.length,0);assert.equal(d.gravity.direction,-sign);near(s.boomerang.recallCharge,0);
});
check("ownership transfer resets charge immediately; return deflection keeps finite subsequent homing",()=>{
  const g=setup(),d=g.debug,a=fire(g),s=a.projectile;s.boomerang.recallCharge=1.2;d.projectileMagazine.reflect(a,1,{x:-1,y:0});near(s.boomerang.recallCharge,0);assert.equal(s.boomerang.recallOwnerId,d.fighters[1].id);const life=s.remainingLife;d.updateProjectiles(dt);near(s.remainingLife,life-dt);
  const h=setup(),[f,t]=h.debug.fighters,b=fire(h);Object.assign(t,{x:850,y:-5000,chargingPunch:true,punchInputHeld:true,punchPending:true,punchAim:{x:-1,y:0},shieldHealth:1000});B.returning(b.projectile,{x:-1000,y:0});place(b,730,t.y,1100);h.debug.updateProjectiles(.09);assert(t.punchBlockstun>0);assert.equal(b.projectile.boomerang.phase,"return");const heading=b.projectile.boomerang.heading;h.debug.updateProjectiles(dt);const delta=Math.atan2(Math.sin(b.projectile.boomerang.heading-heading),Math.cos(b.projectile.boomerang.heading-heading));assert(Math.abs(delta)<=B.TUNING.turnRate*dt+1e-8);assert(f.projectiles.includes(b));
});
check("recall alters neither fighter damage, stun, knockback nor any sports-object impulse",()=>{
  const impacts=[];for(const speed of [1100,2000]){const g=setup(),[f,t]=g.debug.fighters,a=fire(g);Object.assign(t,{x:850,y:-5000});place(a,850,t.y,speed);a.projectile.boomerang.phase="return";a.projectile.boomerang.recallCharge=speed===2000?1.2:0;const health=t.health;g.debug.updateProjectiles(0);impacts.push([health-t.health,t.hitstun,t.vx,t.vy,a.projectile.knockback]);}assert.deepEqual(impacts[0],impacts[1]);
  for(const arena of D.ARENAS){const results=[];for(const speed of [1100,2000]){const g=setup(arena.id),d=g.debug,a=fire(g),ball=d.dashball.state.ball;Object.assign(ball,{x:900,y:600,vx:0,vy:0,carrier:null});place(a,900,600,speed);a.projectile.boomerang.phase="return";a.projectile.boomerang.recallCharge=speed===2000?1.2:0;d.updateProjectiles(0);results.push([ball.vx,ball.vy,ball.scoringTeam,d.dashball.state.scores]);}assert.deepEqual(plain(results[0]),plain(results[1]),arena.id);}
});
check("catch, expiry, KO and rematch clear projectile recall with no weapon duplication",()=>{
  for(const reason of ["catch","expiry","ko","rematch"]){const g=setup(),f=g.debug.fighters[0],a=fire(g),s=a.projectile;s.boomerang.recallCharge=1.2;if(reason==="catch"){s.boomerang.phase="return";place(a,f.x,f.y,-2000);}if(reason==="expiry")s.remainingLife=.001;if(reason==="ko")f.koScored=true;if(reason==="rematch")g.rb.setup({characterKeys:["boomerangus","orbit"]});g.debug.updateProjectiles(dt);if(reason!=="rematch")near(s.boomerang.recallCharge,0);else assert.equal(g.debug.fighters[0].boomerangRecallRelease,false);assert(g.debug.boomerang.ready(0));assert.equal(g.debug.fighters[0].projectiles.length,0);}
});
check("charged flight survives snapshots, replay and delayed-input rollback in combat and sports",()=>{
  for(const arena of [null,"standard","gravity-soccer-open","boulder-control","total-rush","target-charge-roaming"]){const a=setup(arena),b=setup(arena);for(const g of [a,b])fire(g);const saved=a.rb.save(),manager=b.rb.manager(0,8),rows=[],pending=[];for(let i=0;i<180;i++){const row=[0,1].map(n=>R.encode({aimX:n?-1:1,aimY:-.1,punchHeld:n?i%60<6:i<105,dashHeld:i%70<5}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),arena);assert(manager.rollbacks>0);const end=a.rb.hash();b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());a.rb.restore(saved);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);}
});
check("30/60/120 Hz render rates produce identical charged-recall fixed steps",()=>{
  const hashes=[];for(const hz of [30,60,120]){const g=setup();fire(g);input(g,true);for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
});
check("AI uses ordinary Punch holds for recall and defense without hidden charge",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard",teamSize:3},{characters:["boomerangus"],ai:true,seed:311});let heldCharge=false,normalReturn=false;
  for(let i=0;i<360;i++){d.dashball.step();for(const f of d.fighters)for(const a of f.projectiles){const b=a.projectile.boomerang;assert(b.recallCharge<=1.2);if(b.recallCharge>0&&f.punchInputHeld)heldCharge=true;if(b.phase==="return"&&b.recallCharge===0)normalReturn=true;}}
  assert(heldCharge);assert(normalReturn);
});
check("all 14 fighter definitions, sprite assets and previous non-Boomerangus sports remain unchanged",()=>{
  const oldRoot=path.resolve("exports/Dash-Punch-Sports-Update-2026-11-13"),a=createGame(),b=createGame(oldRoot);for(const key of [...Object.keys(require("./boomerangus-before.json").characters),"boomerangus"]){for(const g of [a,b])g.rb.setup({characterKeys:[key,"orbit"]});assert.deepEqual(plain(a.debug.fighters[0].data),plain(b.debug.fighters[0].data));}
  const {hashes}=require("./total-rush-regression");for(const name of ["standard:battle","standard:court","gravity-soccer:battle","field-goal:battle","boulder-control:battle","gravity-boulder:battle","total-rush:battle","golden-rush:battle","target-charge-roaming:battle","scramble","versus"])assert.deepEqual(hashes(name,60),hashes(name,60,oldRoot),name);
});
console.log(`${groups} Charged Recall groups passed`);
