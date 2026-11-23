"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{execFileSync}=require("node:child_process"),E=require("../ember"),R=require("../rollback"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const dt=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
function pose(f,x=300,y=-5000){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,hitstun:0,hitstop:0,invulnerable:0,hasLiveAim:false});}
function setup({target="rain",arena,ruleset="battle",size=1}={}){
  const g=createGame();if(arena){g.debug.dashball.setup({arena,ruleset,teamSize:size},{characters:["ember",target],ai:false,seed:371});g.debug.dashball.state.phase="playing";}
  else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["ember",target],seed:371});
  g.debug.fighters.forEach((f,i)=>pose(f,300+i*1000));return g;
}
function flame(g,x,y,count=1){const state=g.debug.fighters[0].ember,id=E.emit(state,{x,y});for(let n=1;n<count;n++)E.emit(state,{x,y},{x,y},id);return id;}
function ground(g,index=0,x=600){const f=g.debug.fighters[index];pose(f,x,g.debug.dashball.arena.floorY-f.data.height/2);f.onGround=true;return f;}
function hold(f,dir={x:1,y:0}){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:dir,punchExhausted:false,shieldReactivationTimer:0,shieldDashLockout:false});}
test("Ember is core fighter 21: four short dashes, 132 health, 13 punch damage and fragile shield",()=>{
  const g=setup(),[f,r]=g.debug.fighters;assert.equal(g.rb.characterKeys.indexOf("ember"),20);assert.equal(f.health,132);assert(f.health>r.health&&f.health<r.health*1.1);assert.equal(f.data.punchDamage,13);assert.equal(r.data.punchDamage,12);assert.equal(f.airDashes,4);assert.equal(f.shieldHealth,24);assert(f.shieldHealth<r.shieldHealth);assert.equal(f.data.spriteSet,"seekerpro");assert.equal(f.data.spriteTint,"#342b32");
  for(const i of[0,1]){g.debug.fighters[i].onGround=true;g.debug.fighters[i].hasLiveAim=true;g.debug.fighters[i].aim={x:1,y:0};for(let n=0;n<60;n++)g.debug.groundMovement.walk(i);}assert(g.debug.fighters[0].vx<g.debug.fighters[1].vx*.75);
});
test("four native air dashes consume charges; fifth is empty and each travels much less than Rain",()=>{
  for(const charge of[0,.5,1]){const g=setup();for(const[i,f]of g.debug.fighters.entries()){pose(f,300);g.debug.gravity.dash(i,{x:1,y:0},f.data.dashChargeTime*charge);}const[f,r]=g.debug.fighters;assert(f.vx<r.vx*.5);near(f.dashCarryTimer,.34);for(let n=0;n<21;n++)for(const i of[0,1])g.debug.gravity.physics(i);assert(f.x-300<(r.x-300)*.5);assert.equal(f.ember.trail,null);assert(f.ember.flames.length>0);}
  const g=setup(),f=g.debug.fighters[0];for(let n=0;n<4;n++){g.debug.gravity.dash(0,{x:1,y:0});for(let k=0;k<21;k++)g.debug.gravity.physics(0);}assert.equal(f.airDashes,0);const vx=f.vx;g.debug.gravity.dash(0,{x:-1,y:0});near(f.vx,vx);
});
test("ground dashes coat their actual supporting surface without spending air charges; landing recharges four",()=>{
  const g=setup({arena:"standard"}),f=ground(g);g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,4);assert(f.ember.trail.ground);for(let n=0;n<10;n++)g.debug.gravity.physics(0);assert(f.ember.flames.length>0);assert(f.ember.flames.every(c=>c.ground&&c.y===g.debug.dashball.arena.floorY));
  ground(g);f.airDashes=0;f.onGround=false;f.vy=100;g.debug.gravity.physics(0);assert(f.onGround);assert.equal(f.airDashes,4);
});
test("ground flames persist .65 seconds and deal only one three-damage contact per dash event",()=>{
  const g=setup({arena:"standard"}),f=ground(g),t=ground(g,1,620);g.debug.gravity.dash(0,{x:1,y:0});for(let n=0;n<10;n++)g.debug.gravity.physics(0);const hp=t.health;g.debug.ember.tick(dt);assert.equal(t.health,hp-3);assert.equal(t.hitstun,0);g.debug.ember.tick(.2);assert(f.ember.flames.length>0);assert.equal(t.health,hp-3);g.debug.ember.tick(.65);assert.equal(f.ember.flames.length,0);
});
test("ground flames follow moving surfaces, stop at gaps and disappear when their support is gone",()=>{
  const s=E.create(),surface={id:"lift",x:100,y:600,w:200,h:20},offset=(a,b)=>({x:b.x-a.x,y:b.y-a.y});E.start(s,{x:120,y:600},.38,{id:"lift",axis:"y",sign:1});E.sample(s,{x:170,y:600},dt,offset,false,p=>p,surface);assert(s.flames.length>0);assert(s.flames.every(c=>c.ground.id==="lift"));surface.y=800;const p=E.attached(s.flames[0],{surface:()=>surface});assert.equal(p.y,800);const count=s.flames.length;E.sample(s,{x:400,y:800},dt,offset,false,p=>p,null);assert.equal(s.trail,null);assert.equal(s.flames.length,count);E.projectile(s,[],1,{surface:()=>null});assert.equal(s.flames.length,0);
});
test("longer air dash preserves launch speed and damage tuning exactly",()=>{
  const source=execFileSync("git",["show","1123d8a:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),now=setup();old.rb.setup({stageIndex:old.rb.stageNames.indexOf("High Perch"),characterKeys:["ember","rain"],seed:371});for(const g of[old,now]){pose(g.debug.fighters[0]);g.debug.gravity.dash(0,{x:1,y:0});}const a=old.debug.fighters[0],b=now.debug.fighters[0];near(b.vx,a.vx);assert(b.dashCarryTimer>a.dashCarryTimer);const before=plain(a.data),after=plain(b.data);after.airDashCarryTime=before.airDashCarryTime;after.airSteerDuration=before.airSteerDuration;assert.deepEqual(after,before);near(E.TUNING.life,.14);assert.equal(E.TUNING.damage,3);
});
test("ground coatings attach correctly under all gravity directions",()=>{
  const surface={id:"wall",x:100,y:200,w:300,h:40};
  for(const axis of["x","y"])for(const sign of[-1,1]){const s=E.create(),g={id:surface.id,axis,sign,start:20,end:40};E.emit(s,{x:0,y:0},{x:0,y:0},undefined,g);const p=E.attached(s.flames[0],{surface:()=>surface});if(axis==="y"){near(p.x,120);near(p.endX,140);near(p.y,sign>0?200:240);}else{near(p.y,220);near(p.endY,240);near(p.x,sign>0?100:400);}}
});
test("ground fire, expiration and contacts reproduce after snapshot restore, delayed rollback and 30/60/120Hz",()=>{
  const make=()=>{const g=setup({arena:"standard"});ground(g);g.debug.matchFlow.begin({countdown:false});ground(g);g.debug.gravity.dash(0,{x:1,y:0});for(let n=0;n<6;n++)g.debug.gravity.physics(0);assert(g.debug.fighters[0].ember.flames.some(c=>c.ground));return g;};
  const a=make(),b=make(),saved=a.rb.save(),manager=b.rb.manager(0,8),rows=[],pending=[];
  for(let n=0;n<90;n++){const row=[R.encode({hasAim:true,aimX:1}),R.encode({hasAim:true,aimX:-1,dashHeld:n%31<4})];rows.push(row.map(R.decode));pending.push({n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.n,p.input);}assert(manager.advance(row[0]));a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.n,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);const hash=a.rb.hash();a.rb.restore(saved);assert(a.debug.fighters[0].ember.flames.every(c=>c.ground));for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
  const hashes=[];for(const hz of[30,60,120]){const g=make();for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("one dash event hits a fighter only once across overlapping segments; another dash can hit again",()=>{
  const g=setup(),[f,t]=g.debug.fighters;pose(t,600);const hp=t.health;flame(g,600,-5000,4);g.debug.ember.tick(dt);assert.equal(t.health,hp-3);for(let n=0;n<4;n++)g.debug.ember.tick(dt);assert.equal(t.health,hp-3);flame(g,600,-5000,3);g.debug.ember.tick(dt);assert.equal(t.health,hp-6);assert.equal(f.ember.events.length,2);
});
test("flame hits do not add hitstun, hitstop, combo credit, cancel attacks or refill offensive resources",()=>{
  const g=setup(),[f,t]=g.debug.fighters;pose(t,600);Object.assign(f,{airDashes:0,escapeAvailable:false,punchParryAvailable:false,dashEscapeMeter:.2,punchParryMeter:.3});g.debug.booster.punch(1,0);const attack=t.attack;flame(g,600,-5000);g.debug.ember.tick(dt);assert.equal(t.attack,attack);assert.equal(t.hitstun,0);assert.equal(t.hitstop,0);assert.equal(t.comboHits,0);assert.equal(f.airDashes,0);assert.equal(f.firedUpHealth,0);assert(!f.escapeAvailable&&!f.punchParryAvailable);near(f.dashEscapeMeter,.2);near(f.punchParryMeter,.3);
});
test("grounded flame contact adds a tiny upward bump; airborne contact adds only twelve outward velocity",()=>{
  const g=setup(),t=g.debug.fighters[1];pose(t,600);t.onGround=true;flame(g,600,-5000);g.debug.ember.tick(dt);near(t.y,-5001.5);near(t.vy,-16);near(t.vx,0);assert.equal(t.hitstun,0);
  const a=setup(),p=a.debug.fighters[1];pose(p,606);flame(a,600,-5000);a.debug.ember.tick(dt);near(p.vx,12);near(p.vy,0);assert.equal(p.hitstun,0);
});
test("flames expire within .14 seconds; bounded pools and event ledgers cannot accumulate",()=>{
  const g=setup(),s=g.debug.fighters[0].ember;for(let n=0;n<100;n++)flame(g,700,-5000);assert(s.flames.length<=E.TUNING.maxFlames);g.debug.ember.tick(.14);assert.equal(s.flames.length,0);assert.equal(s.events.length,0);
});
test("native melee extinguishes before body damage in the same step and does not gain bonus resources",()=>{
  const g=setup(),f=g.debug.fighters[1];pose(f,600);g.debug.booster.punch(1,0,{x:1,y:0});f.attack.age=f.attack.startup+.01;const hp=f.health;f.airDashes=0;flame(g,f.x+27,f.y);g.debug.ember.tick(dt);assert.equal(g.debug.fighters[0].ember.flames.length,0);assert.equal(f.health,hp);assert.equal(f.airDashes,0);assert(f.attack);
});
test("projectile sweeps extinguish flames without consuming the projectile or hurting its owner",()=>{
  const g=setup();flame(g,700,-5000);g.debug.ember.projectile([{x1:400,y1:-5000,x2:1000,y2:-5000}],4);assert.equal(g.debug.fighters[0].ember.flames.length,0);
  const live=setup({arena:"standard",target:"gunman"}),f=ground(live,1,500);ground(live,0,200);flame(live,740,f.y);live.debug.booster.punch(1,0);let sawShot=false;for(let n=0;n<25&&live.debug.fighters[0].ember.flames.length;n++){live.debug.gravity.physics(1);live.debug.updateProjectiles();sawShot||=f.projectiles.length>0;}assert(sawShot);assert.equal(live.debug.fighters[0].ember.flames.length,0);assert(f.projectiles.length>0);
});
test("Soccer, Basketball, Golden Rush, Target Charge, Volleyball, Pong and boulder balls extinguish with small deflections",()=>{
  for(const arena of["standard","elevated","golden-rush","target-charge-stationary","boulder-control","total-rush","volleyball","dash-pong"]){const g=setup({arena}),s=g.debug.dashball.state,b=s.ball,team=b.scoringTeam,owner=b.ownerTeam;Object.assign(b,{x:1000,y:-5000,prevX:400,prevY:-5000,vx:1000,vy:0,carrier:null});flame(g,700,-5000);g.debug.ember.tick(dt);assert.equal(g.debug.fighters[0].ember.flames.length,0,arena);assert(b.vx<1000&&b.vx>=920,arena);assert.equal(b.scoringTeam,team);assert.equal(b.ownerTeam,owner);assert.deepEqual(plain(s.scores),[0,0]);}
});
test("stationary ball overlap extinguishes without injecting energy or farming scores",()=>{
  const g=setup({arena:"target-charge-stationary"}),b=g.debug.dashball.state.ball;Object.assign(b,{x:800,y:-5000,prevX:800,prevY:-5000,vx:0,vy:0,carrier:null});flame(g,800,-5000);g.debug.ember.tick(dt);assert.equal(g.debug.fighters[0].ember.flames.length,0);near(b.vx,0);near(b.vy,0);assert.deepEqual(plain(g.debug.dashball.state.scores),[0,0]);
});
test("crossing overlapping segments extinguishes them all but deflects each ball only once per dash",()=>{
  const g=setup({arena:"standard"}),b=g.debug.dashball.state.ball;Object.assign(b,{x:1000,y:-5000,prevX:400,prevY:-5000,vx:1000,vy:0,carrier:null});flame(g,700,-5000,8);g.debug.ember.tick(dt);assert.equal(g.debug.fighters[0].ember.flames.length,0);near(b.vx,920);
});
test("sandbags extinguish flames without changing objective ownership or scores",()=>{
  const g=setup();g.debug.sandbag.setup({teamSize:1},{characters:["ember","anchor"],ai:false,seed:371});g.debug.sandbag.state.phase="playing";const b=g.debug.sandbag.state.bags[0];Object.assign(b,{x:1000,y:-5000,prevX:400,prevY:-5000,vx:800,vy:0});const scores=plain(g.debug.sandbag.state.scores);flame(g,700,-5000);g.debug.ember.tick(dt);assert.equal(g.debug.fighters[0].ember.flames.length,0);assert(b.vx>0&&b.vx<800);assert.deepEqual(plain(g.debug.sandbag.state.scores),scores);
});
test("spawn protection rejects damage and grounded bumps stay gravity-relative",()=>{
  const inv=setup(),t=inv.debug.fighters[1];pose(t,600);t.invulnerable=1;const hp=t.health;flame(inv,600,-5000);inv.debug.ember.tick(dt);assert.equal(t.health,hp);near(t.vx,0);near(t.vy,0);
  for(const[axis,sign]of[["y",-1],["x",1],["x",-1]]){const g=setup(),f=g.debug.fighters[1];g.debug.gravity.setDirection(axis,sign);pose(f,600);f.onGround=true;flame(g,600,-5000);g.debug.ember.tick(dt);near(axis==="x"?f.vx:f.vy,-16*sign);assert.equal(f.hitstun,0);}
});
test("Court, friendly fire, invulnerability and intangible Phantom retain their native protections",()=>{
  const g=setup({arena:"standard",ruleset:"court"}),t=g.debug.fighters[1];pose(t,600);const hp=t.health;flame(g,600,-5000);g.debug.ember.tick(dt);assert.equal(t.health,hp);
  for(const enabled of[false,true]){const a=setup(),s=a.rb.save();s.core.currentTeamModeIndex=1;s.core.teamAttackEnabled=enabled;s.core.fighters[0].team=0;s.core.fighters[1].team=0;a.rb.restore(s);const f=a.debug.fighters[1];pose(f,600);const before=f.health;flame(a,600,-5000);a.debug.ember.tick(dt);assert.equal(f.health,before-(enabled?3:0));}
  const p=setup({target:"phantom"}),f=p.debug.fighters[1];pose(f,600);p.debug.gravity.dash(1,{x:1,y:0});const before=f.health;flame(p,600,-5000);p.debug.ember.tick(dt);assert.equal(f.health,before);assert.equal(p.debug.fighters[0].ember.flames.length,1);
});
test("a directional shield extinguishes flames in front, not uncovered flames behind",()=>{
  for(const front of[true,false]){const g=setup(),t=g.debug.fighters[1];pose(t,600);hold(t,{x:front?-1:1,y:0});const hp=t.health,shield=t.shieldHealth;flame(g,580,-5000);g.debug.ember.tick(dt);assert.equal(t.health,hp-(front?0:3));assert.equal(t.shieldHealth<shield,front);assert.equal(g.debug.fighters[0].ember.flames.length,front?0:1);}
});
test("Ember shield contact is two damage once per entry, with no added stun or launch",()=>{
  const g=setup(),[f,t]=g.debug.fighters;pose(f,500);pose(t,545);hold(f);const hp=t.health;g.debug.ember.tick(dt);assert.equal(t.health,hp-2);for(let n=0;n<10;n++)g.debug.ember.tick(dt);assert.equal(t.health,hp-2);near(t.vx,0);near(t.vy,0);assert.equal(t.hitstun,0);t.x=800;g.debug.ember.tick(dt);t.x=545;g.debug.ember.tick(dt);assert.equal(t.health,hp-4);
});
test("shield timeout is ordinary expiration; genuine break retains universal stun and regeneration",()=>{
  const g=setup(),f=g.debug.fighters[0];hold(f);g.debug.shields.tick(0,4.51);assert(f.punchExhausted);assert.equal(f.hitstun,0);f.punchExhausted=false;f.chargingPunch=false;g.debug.ice.breakShield(0);assert.equal(f.stunType,"shieldBreak");assert.equal(f.shieldHealth,0);f.shieldRegenDelay=0;g.debug.shields.tick(0,1);assert(f.shieldHealth>0&&f.shieldHealth<24);
});
test("HUD marshmallows and on-fighter readouts share the exact four-charge resource and universal warnings",()=>{
  const g=setup(),f=g.debug.fighters[0];for(const remaining of[0,1,2,3,4]){f.airDashes=remaining;const hud=g.debug.compactHud.player(0),over=g.debug.hudReadability.dash(0);assert.equal(hud.capacity,4);assert.equal(hud.remaining,remaining);assert.equal(over.remaining,remaining);assert.deepEqual(plain(hud.motif),plain(over.motif));}f.health=10;assert(g.debug.compactHud.player(0).low);assert(g.debug.hudReadability.critical(0,0)!==false);assert(g.debug.hudReadability.profile("ember",100).some(r=>r.bottom-r.top>=4));
});
test("native sprite derivatives retain alpha, source pixels and frame anchors while adding charcoal embers and flame eyes",()=>{
  assert(P.KEYS.has("ember")&&P.CLEAN_SWORD.has("ember"));const pixels=new Uint8ClampedArray(30*30*4);for(let y=3;y<26;y++)for(let x=9;x<24;x++)pixels.set([90,50,125,255],(y*30+x)*4);pixels.set([0,240,40,255],(8*30+13)*4);const original=pixels.slice();const detail=P.derive(pixels,original,30,30,"ember",[{x:0,y:0,w:30,h:30,name:"idle",frame:0,head:[15,3],anchor:{pivotX:15,foot:28}}]);assert(detail.changed>0);for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],original[i]);assert.notDeepEqual([...pixels.slice((8*30+13)*4,(8*30+13)*4+4)],[0,240,40,255]);
});
test("wrapped dash segments stay local, and distant recovery does not paint a full-arena fire chord",()=>{
  const s=E.create(),offset=(a,b)=>({x:((b.x-a.x+500)%1000+1000)%1000-500,y:b.y-a.y}),normalize=p=>({x:(p.x+1000)%1000,y:p.y});E.start(s,{x:995,y:100},.28);E.sample(s,{x:5,y:100},dt,offset,false,normalize);assert(s.flames.every(c=>Math.abs(c.endX-c.x)<=14));assert(s.flames.every(c=>c.x<20||c.x>980));E.sample(s,{x:5,y:1000},dt,offset,false,normalize);assert.equal(s.trail,null);
});
test("KO, respawn and rematch clear all flame contacts and restore native resources",()=>{
  const g=setup({arena:"standard"}),f=g.debug.fighters[0];flame(g,700,700);g.debug.dashball.knockout(0);assert.equal(f.ember.flames.length,0);f.reset(true);assert.equal(f.airDashes,4);assert.deepEqual(plain(f.ember),E.create());g.debug.matchFlow.begin({countdown:false});assert.equal(g.debug.fighters[0].ember.flames.length,0);
});
test("snapshot installation, replay and delayed rollback preserve trails, contact ledgers, damage and expiry",()=>{
  const a=setup(),b=setup();for(const g of[a,b]){pose(g.debug.fighters[1],350);g.debug.gravity.dash(0,{x:1,y:0});flame(g,350,-5000);}const saved=a.rb.save(),manager=b.rb.manager(0,8),rows=[],pending=[];
  for(let n=0;n<150;n++){const row=[R.encode({hasAim:true,aimX:1,aimY:Math.sin(n*.04)*.2,dashHeld:n%35<4,punchHeld:n%37<5}),R.encode({hasAim:true,aimX:-1,dashHeld:n%45<4,punchHeld:n%33<5})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());const hash=a.rb.hash();a.rb.restore(saved);assert(a.debug.fighters[0].ember.flames.length);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.deepEqual(plain(a.debug.fighters[0].ember),plain(b.debug.fighters[0].ember));
});
test("30/60/120 Hz and ten CPU native-input matches remain deterministic with bounded fire",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.gravity.dash(0,{x:1,y:-.1});for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
  const runs=[];for(let run=0;run<2;run++){const g=setup({arena:"golden-rush",size:5});g.debug.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["ember"],seed:371,ai:true});for(let n=0;n<180;n++)g.debug.dashball.step();assert(g.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));assert(g.debug.fighters.every(f=>f.ember.flames.length<=E.TUNING.maxFlames));runs.push(g.rb.hash());}assert.equal(runs[0],runs[1]);
});
test("all previous core fighters and sports reproduce the actual pre-change Git export when Ember is absent",()=>{
  const before=process.env.REGRESSION_BEFORE_DIR,old=before?createGame(before):createGame(process.cwd(),{sourceOverrides:{"game.js":execFileSync("git",["show","a2f06be:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024})}}),now=createGame();for(const key of now.rb.characterKeys.slice(0,20)){for(const g of[old,now]){g.debug.dashball.standard();g.rb.setup({stageIndex:0,characterKeys:[key,"anchor"],seed:371});}for(let n=0;n<45;n++){const row=[{hasAim:true,aimX:1,aimY:-.2,dashHeld:n%25<5,punchHeld:n%19<6},{}];old.rb.step(row);now.rb.step(row);assert.equal(old.rb.hash(),now.rb.hash(),`${key}/${n}`);}}
  for(const arena of["standard","gravity-flip-soccer","field-goal","volleyball","total-rush","target-charge-roaming","dash-pong"]){for(const g of[old,now])g.debug.dashball.setup({arena,teamSize:1},{characters:["anchor","boomerangus"],seed:371});for(let n=0;n<60;n++){old.rb.step([]);now.rb.step([]);assert.equal(old.rb.hash(),now.rb.hash(),`${arena}/${n}`);}}
});
test("offline registration and builder retain the module without producing a release",()=>{
  const source=fs.readFileSync("game.js","utf8"),data=vm.runInNewContext(source.slice(source.indexOf("  const CHARACTER_DATA = {"),source.indexOf("  const ARCHER_SPRITE_ROOT ="))+";CHARACTER_DATA");assert(data.ember.ember);for(const file of["index.html","server.js","tools/build-core-release.cjs"])assert(fs.readFileSync(file,"utf8").includes("ember.js"),file);
});
