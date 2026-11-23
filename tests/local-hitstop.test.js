"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const dt=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(key="anchor",old){const g=createGame(process.cwd(),old?{sourceOverrides:{"game.js":old}}:{});g.debug.dashball.setup({arena:"standard",ruleset:"battle",teamSize:2},{characters:[key,"anchor","rain"],seed:55});g.debug.dashball.state.phase="playing";g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:400+i*75,y:400,prevX:400+i*75,prevY:400,onGround:false,health:f.data.maxHealth*2,invulnerable:0,vx:0,vy:0}));return g;}
function punch(g,charge=0){g.debug.booster.punch(0,charge,{x:1,y:0});const a=g.debug.fighters[0].attack;a.age=a.startup+.001;return a;}
function guard(f){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:-1,y:0},hitstun:0,hitstop:0,juked:0,shieldReactivationTimer:0,shieldActiveTime:.1});}
test("hitstop categories are fixed ticks, rapid setup hits stay at one tick and finishers cap at eight",()=>{
  const g=setup(),d=g.debug,f=d.fighters[0],frames=d.impactFeedback.frames;
  for(const[damage,speed,want]of[[5,100,2],[20,500,4],[40,1600,6],[70,100,8],[4,2600,8]])assert.equal(frames(f,{charge:0},damage,speed),want);
  assert.equal(frames(f,{electricTick:true},100,3000),1);
  const e=setup("edgebert").debug.fighters[0];for(const stage of[0,1])assert.equal(frames(e,{sequenceStage:stage,charge:1},50,3000),1);assert.equal(frames(e,{sequenceStage:2,charge:0},15,820),5);assert.equal(frames(e,{sequenceStage:2,charge:1},27,1558),6);
});
test("hits preserve exact instant damage, knockback, hitstun and resource outcomes while removing global slow motion",()=>{
  const oldSource=execFileSync("git",["show","4fe0a31:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  for(const key of["anchor","spike","rain","booster","lamer","phantom","edgebert"]){for(const charge of[0,1]){
    const old=setup(key,oldSource),now=setup(key);for(const g of[old,now]){punch(g,charge);g.debug.resolveHit(0,1);}
    for(const field of["health","vx","vy","hitstun","airDashes","comboHits","comboDamage","lastHitDir"])assert.deepEqual(plain(now.debug.fighters[1][field]),plain(old.debug.fighters[1][field]),`${key}/${charge}/${field}`);
    assert.equal(now.rb.save().core.slowMo,0);assert.equal(now.rb.save().presentation.screenShake,0);assert(now.debug.impactFeedback.effects.some(p=>p.combatImpact==="hitImpact"));
  }}
});
test("only involved fighters freeze, keep their launch velocity, pause melee progression and move after hitstop",()=>{
  const g=setup("edgebert"),d=g.debug,[a,b,c]=d.fighters;const attack=punch(g);d.resolveHit(0,1);const position=[a.x,a.y,b.x,b.y],velocity=[b.vx,b.vy],age=attack.age,frame=plain(d.getAssetAnimation(0));
  assert(a.hitstop>0&&b.hitstop>0);assert.deepEqual(plain(d.impactFeedback.shake(2)),{x:0,y:0});
  const ticks=Math.round(a.hitstop*60);for(let n=0;n<ticks;n++){d.gravity.physics(0);d.gravity.physics(1);d.gravity.physics(2);assert.deepEqual([a.x,a.y,b.x,b.y],position);near(attack.age,age);assert.deepEqual([b.vx,b.vy],velocity);d.presentationEffects.step(dt);if(a.hitstop>0)assert.deepEqual(plain(d.getAssetAnimation(0)),frame);}
  assert(c.y>400);d.gravity.physics(0);d.gravity.physics(1);assert.notEqual(b.x,position[2]);assert(attack.age>age);assert.equal(a.hitstop,0);
});
test("Lancer tip and initial shaft contacts retain their original damage and launch values",()=>{
  const oldSource=execFileSync("git",["show","4fe0a31:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  for(const charge of[0,1])for(const zone of["tip","shaft"]){const old=setup("lancer",oldSource),now=setup("lancer");
    for(const g of[old,now]){const d=g.debug,a=punch(g,charge),f=d.fighters[0],t=d.fighters[1],s=f.data.spear;a.age=a.startup+s.extension[0]+(s.extension[1]-s.extension[0])*charge+.01;const p=d.lancer.pose(0);t.x=p.x+(zone==="tip"?p.length-p.tip*.2:p.length*.4);t.y=p.y;d.resolveHit(0,1);assert(a.hitTargets.has(t.id));assert.equal(a.spearZone,zone);}
    for(const field of["health","vx","vy","hitstun"])assert.equal(now.debug.fighters[1][field],old.debug.fighters[1][field],`${zone}/${charge}/${field}`);
  }
});
test("confirmed contact is deduplicated and creates bounded sharp yellow impact pixels outside gameplay hashes",()=>{
  const g=setup(),d=g.debug;const a=punch(g),box=d.getPunchHitbox(0,a.dir,0);Object.assign(d.fighters[1],{x:box.cx,y:box.cy});d.fighters[2].x=1000;d.handleHits();const hp=d.fighters[1].health,count=d.impactFeedback.effects.filter(p=>p.combatImpact).length;
  for(let n=0;n<10;n++)d.handleHits();near(d.fighters[1].health,hp);assert.equal(d.impactFeedback.effects.filter(p=>p.combatImpact).length,count);assert(count<=16);
  const colors=new Set(d.impactFeedback.effects.filter(p=>p.combatImpact).map(p=>p.color));assert(colors.has("#ffd75e")&&colors.has("#ff973f"));
  const rects=[],paint=g.elements.get("game").getContext("2d");paint.fillRect=(...args)=>rects.push(args);const hash=g.rb.hash();d.presentationEffects.draw();assert.equal(g.rb.hash(),hash);assert(rects.length);assert(rects.every(row=>row.every(Number.isInteger)));assert(!JSON.stringify(g.rb.save().core).includes("impactFreeze"));
});
function clash(g){const d=g.debug,[a,b]=d.fighters;for(const[f,dir]of[[a,1],[b,-1]]){d.booster.punch(f.playerIndex,0,{x:dir,y:0});f.attack.age=f.attack.startup+(f.data.spear?f.data.spear.extension[0]+.01:.001);}return d.firedUp.clash();}
test("clashes use cyan perpendicular sparks, local pauses and cosmetic Lancer withdrawal, without damage or whole-match slowdown",()=>{
  for(const key of["anchor","lancer"]){const g=setup(key),d=g.debug,[a,b]=d.fighters;if(key==="lancer")b.x=560;assert(clash(g));assert.equal(a.attack,null);assert.equal(b.attack,null);
    assert(a.hitstop>=3/60&&a.hitstop<=5/60);assert(b.hitstop>=3/60&&b.hitstop<=5/60);assert.equal(a.health,a.data.maxHealth*2);assert.equal(b.health,b.data.maxHealth*2);assert.equal(g.rb.save().core.slowMo,0);
    const particles=d.impactFeedback.effects.filter(p=>p.combatImpact);assert(particles.some(p=>p.color==="#9eeeff"));assert(particles.filter(p=>!p.flash).every(p=>Math.abs(p.vy)>Math.abs(p.vx)));
    assert.equal(d.impactFeedback.effects.some(p=>p.spearWithdraw),key==="lancer");const hash=g.rb.hash();d.presentationEffects.draw();assert.equal(g.rb.hash(),hash);d.presentationEffects.step(.2);assert.equal(d.impactFeedback.effects.length,0);
  }
});
test("shield blocks keep durability, chip, recoil, pressure rules and reflections, with two to four tick emphasis",()=>{
  const oldSource=execFileSync("git",["show","4fe0a31:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  for(const charge of[0,1]){const old=setup("anchor",oldSource),now=setup();for(const g of[old,now]){guard(g.debug.fighters[1]);punch(g,charge);g.debug.resolveHit(0,1);}
    for(const field of["health","shieldHealth","vx","vy","punchBlockstun","shieldRegenDelay"])assert.equal(now.debug.fighters[1][field],old.debug.fighters[1][field],field);
    near(now.debug.fighters[1].hitstop,(charge?4:2)/60);assert(now.debug.presentationEffects.shields.some(p=>p.shieldBlock));assert(!now.debug.impactFeedback.effects.some(p=>p.combatImpact));assert.equal(now.rb.save().core.slowMo,0);
  }
});
test("visual contact uses overlapping convex silhouettes instead of a remote hitbox center",()=>{
  const d=setup().debug,point=d.impactFeedback.contact({x:0,y:0,w:100,h:20,points:[{x:0,y:0},{x:100,y:8},{x:100,y:12},{x:0,y:20}]},{x:90,y:5,w:20,h:10});assert(point.x>=90&&point.x<=100&&point.y>=5&&point.y<=15);
});
test("snapshot replay and delayed rollback restore local pauses without duplicating cosmetic contacts",()=>{
  const a=setup(),b=setup();for(const g of[a,b])punch(g,.5);const saved=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
  for(let n=0;n<130;n++){const row=[R.encode({hasAim:true,aimX:1,dashHeld:n%43<3}),R.encode({hasAim:true,aimX:-1,punchHeld:n%39<10})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(rows[n]);}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);
  const final=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),final);
  const eventCounts=new Map();for(const p of b.debug.impactFeedback.effects)if(p.impactEvent)eventCounts.set(p.impactEvent,(eventCounts.get(p.impactEvent)||0)+1);assert([...eventCounts.values()].every(n=>n===1));
});
test("30/60/120 Hz reproduce the same contact, hitstop, launch and score state",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup("edgebert");punch(g,.5);for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
