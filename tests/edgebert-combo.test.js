"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`),neutral=R.decode(R.neutral());
function setup(arena){const g=createGame();if(arena)g.debug.dashball.setup({arena,ruleset:"battle"},{characters:["edgebert","anchor"],seed:44});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["edgebert","anchor"],seed:44});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:600+i*500,y:-5000,prevX:600+i*500,prevY:-5000,invulnerable:0,onGround:false,vx:0,vy:0}));return g;}
function start(g,charge=0){g.debug.booster.punch(0,charge,{x:1,y:0});return g.debug.fighters[0].attack;}
function next(g){const f=g.debug.fighters[0],a=f.attack;g.debug.updateAttack(0,a.total-a.age+1e-8);return f.attack;}
test("one press/release automatically executes exactly three distinct strikes, even after misses",()=>{
  const g=setup(),seen=new Map();g.rb.step([{punchHeld:true,hasAim:true,aimX:1},neutral]);for(let n=0;n<110;n++){g.rb.step([neutral,neutral]);const a=g.debug.fighters[0].attack;if(a)seen.set(a.sequenceStage,a.id);}assert.deepEqual([...seen.keys()],[0,1,2]);assert.equal(new Set(seen.values()).size,3);assert.equal(g.debug.fighters[0].attack,null);
});
test("licensed Attack1/2/3 frame windows and single charge remain synchronized",()=>{
  for(const charge of[0,.5,1]){const g=setup(),f=g.debug.fighters[0],anchor=g.debug.fighters[1].data,reference=anchor.punchStartup+anchor.punchActive+anchor.punchRecovery;let total=0;start(g,charge);for(let stage=0;stage<3;stage++){const a=f.attack,expected=[[.105,.075,.135],[.045,.075,.09],[.18,.075,.18]][stage];for(const[k,i]of["startup","active","recovery"].entries())near(a[i],expected[k]*f.data.sequenceTimeScale/.75);total+=a.total;near(a.charge,charge);const p=f.data.punchSequence[stage];for(const t of[a.startup-.001,a.startup+.001,a.startup+a.active-.001,a.startup+a.active+.001]){a.age=t;const anim=g.debug.getAssetAnimation(0);assert.equal(anim.clip,`attack${stage+1}`);assert.equal(anim.frame>=p.strike[0]&&anim.frame<=p.strike[1],t>=a.startup&&t<a.startup+a.active);}if(stage<2)next(g);}near(total,reference);near(total,.425);}
});
test("each strike has its own target set, visible impact and a stronger finisher",()=>{
  for(const charge of[0,1]){const g=setup(),[f,t]=g.debug.fighters,damage=[],launch=[];start(g,charge);for(let stage=0;stage<3;stage++){const a=f.attack;a.age=a.startup+.001;const box=g.debug.getPunchHitbox(0,a.dir,charge);Object.assign(t,{x:box.cx,y:box.cy,invulnerable:0,hitstun:0,hitstop:0,vx:0,vy:0,comboHits:0,comboGrace:0});const hp=t.health;g.debug.handleHits();damage.push(hp-t.health);launch.push(Math.hypot(t.vx,t.vy));assert.equal(f.attack,a);assert(a.hitTargets.has(t.id));assert(t.hitstun>0);if(stage<2)assert(t.hitstun<.2);g.debug.handleHits();near(t.health,hp-damage[stage]);if(stage<2)next(g);}assert.deepEqual(damage,charge?[2,2,27]:[1,1,15]);assert(launch[2]>launch[1]*10);assert(launch[0]<100&&launch[1]<100);}
});
test("first two charged launch coefficients stay modest instead of inheriting finisher scaling",()=>{
  const g=setup(),f=g.debug.fighters[0];assert.equal(f.data.punchSequence[0].punchKnockback,35);assert.equal(f.data.punchSequence[1].punchKnockback,45);assert.equal(f.data.punchSequence[2].punchKnockback,820);near(f.data.punchSequence[0].punchKnockbackCharge,.2);near(f.data.punchSequence[1].punchKnockbackCharge,.2);
});
test("partial combos can hit only the second or third strike without tracking targets",()=>{
  for(const chosen of[1,2]){const g=setup(),[f,t]=g.debug.fighters;start(g);for(let stage=0;stage<3;stage++){const a=f.attack;a.age=a.startup+.001;t.x=stage===chosen?f.x+90:1500;t.y=f.y;const hp=t.health;g.debug.handleHits();assert.equal(t.health<hp,stage===chosen);near(f.x,600);if(stage<2)next(g);}}
});
test("incoming damage and shield blocks interrupt the sequence normally",()=>{
  const g=setup(),[f,t]=g.debug.fighters;start(g);t.x=f.x-65;t.y=f.y;g.debug.booster.punch(1,0,{x:1,y:0});t.attack.age=t.attack.startup+.001;g.debug.handleHits();assert.equal(f.attack,null);assert.equal(f.edgebertChain,null);
  const h=setup(),[a,b]=h.debug.fighters;start(h);a.attack.age=a.attack.startup+.001;Object.assign(b,{x:a.x+90,y:a.y,chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0},shieldReleaseParry:0});h.debug.handleHits();assert(!a.attack||a.attack.selfCancelled);for(let n=0;n<60;n++)h.debug.updateAttack(0);assert.equal(a.edgebertChain,null);
});
test("native charge is shared by all stages, and normal grounded spacing supports followups",()=>{
  const g=setup();for(let n=0;n<50;n++)g.rb.step([{hasAim:true,aimX:1,punchHeld:true},neutral]);g.rb.step([neutral,neutral]);const f=g.debug.fighters[0];assert(f.attack.charge>.95);const charge=f.attack.charge;for(let stage=0;stage<2;stage++){next(g);near(f.attack.charge,charge);}
  for(const charge of[0,1])for(const speed of[-40,0,40]){const h=setup("standard"),[a,b]=h.debug.fighters,floor=h.debug.dashball.arena.floorY;for(const[f,x]of[[a,600],[b,685]])Object.assign(f,{x,y:floor-f.data.height/2,prevX:x,prevY:floor-f.data.height/2,vx:0,vy:0,onGround:true,invulnerable:0});b.vx=speed;start(h,charge);let peak=0;for(let n=0;n<90;n++){h.rb.step([neutral,neutral]);peak=Math.max(peak,b.comboHits);}assert.equal(peak,3,`charge ${charge}, velocity ${speed}`);}
});
test("each sports contact is separately confirmed once without canceling later strikes",()=>{
  for(const arena of["standard","basketball","golden-rush","boulder-control","target-charge-stationary","volleyball"]){const g=setup(arena),f=g.debug.fighters[0],b=g.debug.dashball.state.ball,speeds=[];start(g);for(let stage=0;stage<3;stage++){const a=f.attack;a.age=a.startup+.001;Object.assign(b,{vx:0,vy:0,carrier:null});assert(g.debug.dashball.shot(0,a));speeds.push(Math.hypot(b.vx,b.vy));assert(!g.debug.dashball.shot(0,a));assert.equal(f.attack,a);if(stage<2)next(g);}assert(speeds[2]>speeds[0]*5,arena);}
});
test("snapshot replay and delayed inputs retain automatic phase and per-strike contacts",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[],rows=[],saved=a.rb.save();for(let n=0;n<160;n++){const row=[R.encode({hasAim:true,aimX:1,punchHeld:n===0}),R.encode({hasAim:true,aimX:-1,dashHeld:n%31<5})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);const end=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),end);
});
test("30/60/120 Hz preserve the same full automatic combo",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();start(g);for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("only Edgebert's punch data changes; other fighters and his movement, health, shield and charge stay intact",()=>{
  const source=require("node:child_process").execFileSync("git",["show","a7861a8:game.js"],{encoding:"utf8"});
  const old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),now=createGame(),plain=x=>JSON.parse(JSON.stringify(x));
  for(const key of old.rb.characterKeys){for(const g of[old,now])g.rb.setup({characterKeys:[key,"anchor"],seed:44});
    const before=plain(old.debug.fighters[0].data),after=plain(now.debug.fighters[0].data);
    if(key==="edgebert")for(const field of["punchSequence","sequenceTimeScale","punchStartup","punchActive","punchRecovery","punchDamage","punchKnockback","punchHitstun"]){delete before[field];delete after[field];}
    assert.deepEqual(after,before,key);
  }
});
