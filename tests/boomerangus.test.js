"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),crypto=require("node:crypto"),B=require("../boomerang"),D=require("../dashball"),R=require("../rollback");
const {createGame}=require("./simulation-harness"),{hashes}=require("./total-rush-regression"),before=require("./boomerangus-before.json");
const plain=x=>JSON.parse(JSON.stringify(x)),dt=1/60,near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function setup(key="boomerangus",other="orbit"){
  const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,other],seed:42});
  for(const [i,f] of g.debug.fighters.entries())Object.assign(f,{x:500+i*1100,y:-5000,prevX:500+i*1100,prevY:-5000,onGround:false,vx:0,vy:0,health:10000,invulnerable:0});return g;
}
function press(g,held,dir={x:1,y:0}){const f=g.debug.fighters[0];Object.assign(f.controls,{hasAim:true,aim:dir});f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;g.debug.updateHumanInput(0);}
function fire(g,dir={x:1,y:0}){const f=g.debug.fighters[0];f.whiffLag=f.punchLockout=f.hitstop=0;press(g,true,dir);press(g,false,dir);assert(f.attack);const a=f.attack;g.debug.updateAttack(0,a.startup+1e-9);assert(f.projectiles.includes(a));return a;}
function place(a,x,y,vx,vy=0){Object.assign(a.projectile,{x,y,vx,vy,speed:Math.hypot(vx,vy)});a.dir={x:vx/a.projectile.speed,y:vy/a.projectile.speed};a.projectile.boomerang.heading=Math.atan2(vy,vx);a.projectile.boomerang.launchSpeed=a.projectile.speed;}
check("14 core fighters, original 13 data and Chungus images remain byte-for-byte unchanged",()=>{
  const g=setup();assert.equal(g.rb.characterKeys.filter(k=>[...Object.keys(before.characters),"boomerangus"].includes(k)).length,14);
  for(const [key,data] of Object.entries(before.characters)){g.rb.setup({characterKeys:[key,"orbit"]});assert.deepEqual(plain(g.debug.fighters[0].data),data,key);}
  for(const [file,hash] of Object.entries(require("../artifacts/boomerangus/checkpoint.json").originalArt))assert.equal(crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),hash);
});
check("slow walking, deliberate committed dashes, low jumps and heavy punch resistance",()=>{
  const g=setup(),f=g.debug.fighters[0],c=before.characters.chungus;
  near(f.data.walkSpeedScale,.7);near(f.data.walkAccelScale,.75);assert(f.data.maxHealth>c.maxHealth);assert.equal(f.data.maxAirDashes,1);
  for(const ground of [true,false]){Object.assign(f,{onGround:ground,vx:0,vy:0,airDashes:1,hasLiveAim:false,heavyDashRecovery:0});g.debug.gravity.dash(0,{x:1,y:0},f.data.dashChargeTime);assert(f.heavyDashWindup);near(f.vx,0);for(let i=0;i<6;i++)g.debug.gravity.physics(0);assert(!f.heavyDashWindup);assert(f.heavyDashRecovery>0);assert(f.vx>0&&f.vx<360);if(!ground)assert.equal(f.airDashes,0);const vx=f.vx;g.debug.gravity.dash(0,{x:-1,y:0},0);near(f.vx,vx);}
  const velocities=[];
  for(const key of ["boomerangus","chungus"]){const t=setup(key,"anchor"),[target,attacker]=t.debug.fighters;attacker.attack={id:9,charge:1,dir:{x:1,y:0},hitTargets:new Set(),grounded:false};t.debug.resolveHit(1,0);velocities.push(Math.hypot(target.vx,target.vy));}
  near(velocities[0]/velocities[1],.58);assert(f.data.tippyJumpScale<.5);assert(f.data.gravity>c.gravity);
});
check("native release waits for throw startup; muzzle mirrors and follows gravity orientation",()=>{
  for(const sign of [1,-1])for(const gravity of [1,-1]){const g=setup(),f=g.debug.fighters[0];g.debug.gravity.setDirection("y",gravity);press(g,true,{x:sign,y:0});press(g,false,{x:sign,y:0});assert.equal(f.projectiles.length,0);assert.equal(g.debug.getAssetAnimation(0).frame,0);g.debug.updateAttack(0,f.attack.startup+1e-9);const a=f.projectiles[0];near(a.projectile.x,f.x+sign*120);near(a.projectile.y,f.y-gravity*20);assert.equal(g.debug.getAssetAnimation(0).frame,1);assert(!g.debug.boomerang.ready(0));}
});
check("actual floor launches retain low jumps and longer grounded dashes through the startup delay",()=>{
  for(const jump of [false,true]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard"},{characters:["boomerangus","orbit"]});const f=d.fighters[0],floor=d.dashball.arena.floorY;Object.assign(f,{x:800,y:floor-f.data.height/2,prevX:800,prevY:floor-f.data.height/2,onGround:true,vx:0,vy:0,hasLiveAim:jump,tippyToes:jump,tippyDashQueued:jump,aim:{x:0,y:-1}});d.gravity.dash(0,jump?f.aim:{x:1,y:0},f.data.dashChargeTime);for(let i=0;i<6;i++)d.gravity.physics(0);if(jump){assert(!f.onGround);assert(f.vy< -1000&&f.vy> -1250);assert(f.tippyJumpTimer>0);}else{assert(f.onGround);assert(f.vx>420&&f.vx<450);}}
});
check("one weapon slot, shielding while away, no queued extra throw and catch restores availability",()=>{
  const g=setup(),f=g.debug.fighters[0],a=fire(g);f.punchLockout=0;press(g,true);for(let i=0;i<8;i++)g.debug.updateHumanInput(0);assert(g.debug.isShielding(0));press(g,false);assert(!f.attack);assert.equal(f.projectiles.length,1);
  let max=a.projectile.x;for(let i=0;i<180&&f.projectiles.length;i++){g.debug.updateProjectiles(dt);if(a.projectile.boomerang.phase==="outbound")max=Math.max(max,a.projectile.x);}assert.equal(f.projectiles.length,0);assert(g.debug.boomerang.ready(0));assert(!f.attack);assert(max-f.x>550&&max-f.x<720);f.shieldReleaseParry=0;fire(g);assert.equal(f.projectiles.length,1);
});
check("outbound deceleration, finite return steering and current-position homing",()=>{
  const shot={speed:1050,boomerang:B.create(1050,{x:1,y:0})};let distance=0,previous=Infinity;
  for(let i=0;i<48;i++){B.steer(shot,dt,{x:-500,y:0});assert(shot.speed<=previous);previous=shot.speed;distance+=shot.vx*dt;}assert.equal(shot.boomerang.phase,"return");near(shot.speed,0);assert(distance>510&&distance<540);
  const heading=shot.boomerang.heading;B.steer(shot,dt,{x:0,y:500});assert(Math.abs(shot.boomerang.heading-heading)<=B.TUNING.turnRate*dt+1e-9);assert(shot.speed>0&&shot.speed<100);
  const g=setup(),f=g.debug.fighters[0],a=fire(g);for(let i=0;i<48;i++)g.debug.updateProjectiles(dt);f.x=850;f.y=-4800;for(let i=0;i<240&&f.projectiles.length;i++)g.debug.updateProjectiles(dt);assert(g.debug.boomerang.ready(0));assert(a.projectile.boomerang.flightTime<4);
});
check("outbound and separated return hit, persistent overlap never damages repeatedly",()=>{
  const g=setup(),[f,t]=g.debug.fighters,a=fire(g);Object.assign(t,{x:850,y:-5020,prevX:850,prevY:-5020});place(a,750,t.y,1000);const health=t.health;g.debug.updateProjectiles(.04);assert(t.health<health);const once=t.health;
  for(let i=0;i<3;i++){a.projectile.x=t.x;a.projectile.y=t.y;g.debug.updateProjectiles(0);}near(t.health,once);
  a.projectile.x=1100;g.debug.updateProjectiles(0);B.returning(a.projectile,{x:-1000,y:0});a.projectile.boomerang.phaseTime=0;Object.assign(a,{id:100,hitTargets:new Set()});Object.assign(t,{invulnerable:0,hitstop:0});place(a,980,t.y,-1000);a.projectile.boomerang.phase="return";g.debug.updateProjectiles(.08);assert(t.health<once);assert(f.projectiles.includes(a));
});
check("directional shields return the weapon without being overwritten by steering",()=>{
  const g=setup(),[f,t]=g.debug.fighters,a=fire(g);Object.assign(t,{x:850,y:-5020,chargingPunch:true,punchInputHeld:true,punchPending:true,punchAim:{x:-1,y:0},shieldHealth:1000});place(a,730,t.y,1000);g.debug.updateProjectiles(.09);assert(t.punchBlockstun>0);assert.equal(a.projectile.boomerang.phase,"return");g.debug.updateProjectiles(dt);assert(a.dir.x<0);assert(f.projectiles.includes(a));
});
check("reflection transfers homing/cap ownership, halves life, preserves original slot and changes no ammo",()=>{
  const g=setup("boomerangus","gunman"),[f,t]=g.debug.fighters,a=fire(g),life=a.projectile.remainingLife;
  g.debug.projectileMagazine.reflect(a,1,{x:-1,y:0});assert.equal(a.reflectedOwnerId,t.id);near(a.projectile.remainingLife,life/2);assert(!g.debug.boomerang.ready(0));assert.equal(t.ammo,3);for(let i=0;i<60;i++)g.debug.updateProjectiles(dt);assert(a.projectile.boomerang.flightTime>0);
  for(let i=0;i<600;i++)g.debug.updateProjectiles(dt);assert(g.debug.boomerang.ready(0));
  const h=setup("boomerangus","boomerangus"),first=fire(h);const second={...first,id:999,hitTargets:new Set(),projectile:{...first.projectile,creatorId:h.debug.fighters[1].id,ownerId:h.debug.fighters[1].id,spawnOrder:999,boomerang:B.create(1000,{x:-1,y:0})}};h.debug.fighters[1].projectiles.push(second);h.debug.projectileMagazine.reflect(second,0,{x:1,y:0});assert(first.projectile.removed);assert(!second.projectile.removed);assert(!h.debug.boomerang.ready(0));
});
check("owned Kickoff refills once, does not duplicate weapon or reset lifetime",()=>{
  const g=setup(),f=g.debug.fighters[0],a=fire(g);Object.assign(f,{x:500,y:-5000,prevX:470,prevY:-5000,vx:900,vy:0,onGround:false,dashDir:{x:1,y:0},dashCarryTimer:.3,airDashes:0,dashReboundLockout:0,hitstun:0,hitstop:0,punchInputHeld:false});place(a,560,-5000,1000);a.projectile.kickoffReady=true;const life=a.projectile.remainingLife;g.debug.updateProjectiles(0);assert.equal(f.airDashes,1);near(a.projectile.remainingLife,life);const serial=a.projectile.generation;g.debug.updateProjectiles(0);assert.equal(a.projectile.generation,serial);assert.equal(f.projectiles.length,1);
});
check("failsafe, creator KO, current-owner KO, respawn and round reset clean up the weapon",()=>{
  for(const reason of ["expiry","creator","owner","reset"]){const g=setup(),[f,t]=g.debug.fighters,a=fire(g);if(reason==="expiry")a.projectile.remainingLife=.001;if(reason==="creator")f.koScored=true;if(reason==="owner"){g.debug.projectileMagazine.reflect(a,1,{x:1,y:0});t.koScored=true;}if(reason==="reset")g.rb.setup({characterKeys:["boomerangus","orbit"]});g.debug.updateProjectiles(dt);assert(g.debug.boomerang.ready(0),reason);assert.equal(g.debug.fighters[0].projectiles.length,0);}
  const g=setup();g.debug.dashball.setup({arena:"standard"},{characters:["boomerangus","orbit"]});fire(g);g.debug.dashball.knockout(0);g.debug.updateProjectiles();assert(g.debug.boomerang.ready(0));for(let i=0;i<910;i++)g.debug.dashball.step();assert(!g.debug.fighters[0].koScored);assert(g.debug.boomerang.ready(0));
});
check("sports balls receive native strong impulses, permanent scoring ownership and boulder mass remain",()=>{
  for(const arena of D.ARENAS){const g=setup();g.debug.dashball.setup({arena:arena.id,ruleset:"battle"},{characters:["boomerangus","orbit"]});const d=g.debug,f=d.fighters[0],state=d.dashball.state,ball=state.ball;Object.assign(f,{x:500,y:600,prevX:500,prevY:600,invulnerable:0});const a=fire(g);Object.assign(ball,{x:750,y:580,vx:0,vy:0,carrier:null});place(a,750,580,1000);const team=ball.scoringTeam;d.updateProjectiles(0);assert(Math.hypot(ball.vx,ball.vy)>0,arena.id);if(team!==undefined)assert.equal(ball.scoringTeam,team);const v=Math.hypot(ball.vx,ball.vy);d.updateProjectiles(0);near(Math.hypot(ball.vx,ball.vy),v);assert(f.projectiles.includes(a));}
  const g=setup();g.debug.sandbag.setup({ruleset:"scramble"},{characters:["boomerangus","orbit"]});const d=g.debug,f=d.fighters[0],bag=d.sandbag.state.bags[0];Object.assign(f,{x:500,y:500,invulnerable:0});const a=fire(g);place(a,bag.x,bag.y,1000);d.updateProjectiles(0);assert(Math.hypot(bag.vx,bag.vy)>0);assert(f.projectiles.includes(a));
});
check("horizontal seams and inverted gravity preserve weapon identity, velocity and lifetime",()=>{
  const g=setup();g.debug.dashball.setup({arena:"gravity-soccer-open"},{characters:["boomerangus","orbit"]});const a=fire(g),s=a.projectile,w=g.debug.dashball.arena.width;g.debug.gravity.setDirection("y",-1);place(a,w+s.radius+1,300,1000);const id=a.id,life=s.remainingLife;g.debug.updateProjectiles(dt);assert(s.x<200);assert(a.dir.x>0);assert.equal(a.id,id);near(s.remainingLife,life-dt);assert.equal(g.debug.gravity.direction,-1);
});
check("snapshots, replay and delayed rollback serialize return/contacts/ownership with no duplicates",()=>{
  for(const arena of ["versus","standard","boulder-control","gravity-boulder","total-rush","target-charge-roaming"]){const a=setup(),b=setup();if(arena!=="versus")for(const g of [a,b])g.debug.dashball.setup({arena},{characters:["boomerangus","orbit"]});const start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
    for(let i=0;i<240;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:-.1,punchHeld:(i+n*7)%65<7,dashHeld:(i+n*3)%89<10}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));assert(a.debug.fighters[0].projectiles.length<=1);}
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),arena);assert(manager.rollbacks>0);const end=a.rb.hash();b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);
  }
});
check("30/60/120Hz presentation yields identical fixed-step boomerang flights",()=>{
  const results=[];for(const hz of [30,60,120]){const g=setup();fire(g);for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push(g.rb.hash());}assert.equal(results[0],results[1]);assert.equal(results[0],results[2]);
});
check("live reflected steering/contact state and heavy dash windup restore exactly",()=>{
  const g=setup(),a=fire(g);for(let i=0;i<15;i++)g.debug.updateProjectiles(dt);g.debug.projectileMagazine.reflect(a,1,{x:-1,y:0});a.projectile.boomerang.contacts["fighter:p1"]=true;g.debug.gravity.dash(0,{x:1,y:0},.3);const saved=g.rb.save(),snapshot=g.debug.online.createSnapshot();const h=setup();h.debug.online.installSnapshot(snapshot);assert.equal(h.rb.hash(),g.rb.hash());
  const rows=[];for(let i=0;i<100;i++){const row=[{aimX:1,aimY:-.1,punchHeld:i<5},{aimX:-1,dashHeld:i<5}];rows.push(row);g.rb.step(row);h.rb.step(row);assert.equal(g.rb.hash(),h.rb.hash());}const end=g.rb.hash();g.rb.restore(saved);for(const row of rows)g.rb.step(row);assert.equal(g.rb.hash(),end);
});
check("ten native-input CPU heavyweights remain deterministic in sports and Versus",()=>{
  for(const arena of ["versus","standard","total-rush","target-charge-roaming"]){const games=[createGame(),createGame()];for(const g of games)if(arena==="versus")g.debug.arena.setup("Castle Dungeon",{characters:["boomerangus"],ai:true,seed:773});else g.debug.dashball.setup({arena,teamSize:5},{characters:["boomerangus"],ai:true,seed:773});
    for(let i=0;i<360;i++){for(const g of games)if(arena==="versus")g.debug.arena.stepAI();else g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());assert(games[0].debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)&&f.projectiles.length<=1));}const end=games[0].rb.hash();games[0].debug.stagePresentation.draw();assert.equal(games[0].rb.hash(),end);
  }
});
check("unchanged sports/Versus retain pre-Boomerangus hashes; later requested sports changes are separate",()=>{let frames=0;for(const [name,rows] of Object.entries(before.sports).filter(([name])=>require("./total-rush-regression").unchangedSportsFixture(name))){assert.deepEqual(hashes(name,rows.length),rows,name);frames+=rows.length;}assert(frames>3000);});
console.log(`${groups} Boomerangus groups passed`);
