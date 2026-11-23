"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness");
const plain=x=>JSON.parse(JSON.stringify(x));
function guard(f){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchExhausted:false,punchReleaseQueued:false,punchAim:{x:-1,y:0},shieldActiveTime:0,hitstun:0,hitstop:0,juked:0,vx:0,vy:0});}
function setup(key="anchor",old){const g=createGame(process.cwd(),old?{sourceOverrides:old}:{});g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:["anchor",key],seed:42});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:450+i*90,y:400,prevX:450+i*90,prevY:400,onGround:false,invulnerable:0,vx:0,vy:0}));guard(g.debug.fighters[1]);return g;}
function hit(g,charge=0){g.debug.booster.punch(0,charge,{x:1,y:0});const f=g.debug.fighters[0];f.attack.age=f.attack.startup+.001;g.debug.resolveHit(0,1);}
test("active shields use sharp integer pixel segments throughout activation and sustained holding",()=>{
  for(const key of["anchor","spike","reflektor"]){const g=setup(key),ctx=g.elements.get("game").getContext("2d"),rects=[];ctx.fillRect=(...args)=>rects.push(args);
    for(const time of[0,.3,2]){g.debug.fighters[1].shieldActiveTime=time;g.debug.shieldPresentation.draw(1);}assert(rects.length>200);assert(rects.every(r=>r.every(Number.isInteger)));assert.equal(ctx.imageSmoothingEnabled,false);
    const shape=g.debug.shieldPresentation.geometry(1);assert.equal(shape.points.length,25);assert(shape.points.every(p=>p.x<=shape.cx+1));assert(shape.coverage<Math.PI);
  }
});
test("confirmed blocks flash briefly at the shield perimeter rather than the body center",()=>{
  const g=setup(),d=g.debug,shape=d.shieldPresentation.geometry(1);hit(g,.5);
  const block=d.presentationEffects.shields.find(p=>p.shieldBlock);assert(block);assert(block.life>=2/60&&block.life<=4/60);assert(block.x<shape.cx);assert(Math.hypot(block.x-shape.cx,block.y-shape.cy)>d.fighters[1].data.width/2);
  assert(d.presentationEffects.shields.filter(p=>p.shieldShard).length===6);const hp=d.fighters[1].health;d.shieldPresentation.draw(1);d.shieldPresentation.draw(1);assert.equal(d.fighters[1].health,hp);assert.equal(d.presentationEffects.shields.filter(p=>p.shieldBlock).length,1);
  d.presentationEffects.step(.07);assert(!d.presentationEffects.shields.some(p=>p.shieldBlock));
});
test("genuine shield breaks create one shape-based fracture and short fragments without delaying stun",()=>{
  for(const[key,count]of[["anchor",18],["spike",24],["reflektor",20]]){
    const g=setup(key),d=g.debug;d.fighters[1].shieldHealth=1;const shape=d.shieldPresentation.geometry(1);hit(g,1);
    assert.equal(d.fighters[1].shieldHealth,0);assert.equal(d.fighters[1].stunType,"shieldBreak");assert(d.fighters[1].hitstun>1);assert(!d.isShielding(1));
    const shards=d.presentationEffects.shields,fracture=shards.find(p=>p.shieldFracture);assert(fracture);assert.deepEqual(plain(fracture.points),plain(shape.points));assert.equal(shards.filter(p=>p.shieldShard).length,count+6);
    assert(shards.filter(p=>p.shieldShard).every(p=>p.maxLife<=.35));d.handleHits();assert.equal(d.presentationEffects.shields.filter(p=>p.shieldFracture).length,1);
    for(let n=0;n<24;n++)d.presentationEffects.step(1/60);assert.equal(d.presentationEffects.shields.length,0);
  }
});
test("normal release and natural duration expiration do not shatter or create new shield-break stun",()=>{
  for(const key of["anchor","spike","reflektor"]){const g=setup(key),d=g.debug,f=d.fighters[1];f.shieldHealth=f.data.shieldMax*.5;d.shields.tick(1,d.shields.duration(1));assert(f.punchExhausted);assert.equal(f.hitstun,0);assert.equal(d.presentationEffects.shields.length,0);
    f.chargingPunch=false;d.shields.tick(1,1/60);d.shieldPresentation.draw(1);assert.equal(d.presentationEffects.shields.length,0);assert.equal(f.shieldBreakFlash,0);
  }
});
test("mirror and sports-ball contacts share the flash without repeat contact farming",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard",ruleset:"battle"},{characters:["anchor","reflektor"],seed:42});const f=d.fighters[1],b=d.dashball.state.ball;
  Object.assign(f,{x:1000,y:600,invulnerable:0,onGround:false});guard(f);Object.assign(b,{x:920,y:600,vx:700,vy:0,carrier:null});assert(d.shields.mirrorContact(1,b));assert.equal(d.presentationEffects.shields.filter(p=>p.shieldBlock).length,1);
  for(let n=0;n<5;n++)d.shields.mirrorContact(1,b);assert.equal(d.presentationEffects.shields.filter(p=>p.shieldBlock).length,1);
});
test("shield feedback restores without duplication and rendering remains outside authoritative hashes",()=>{
  const g=setup("spike"),d=g.debug;d.fighters[1].shieldHealth=1;hit(g,1);const hash=g.rb.hash(),saved=g.rb.save(),count=d.presentationEffects.shields.length;
  d.shieldPresentation.draw(1);d.presentationEffects.draw();assert.equal(g.rb.hash(),hash);d.presentationEffects.step(.2);g.rb.restore(saved);assert.equal(d.presentationEffects.shields.length,count);assert(!JSON.stringify(saved.core).includes("shieldShard"));
});
test("shield damage, regen, timeout, reflection, combat and sports state match the preceding checkpoint",()=>{
  const old=Object.fromEntries(["game.js","dashball.js"].map(file=>[file,execFileSync("git",["show",`149875d:${file}`],{encoding:"utf8",maxBuffer:8*1024*1024})]));
  for(const key of["anchor","spike","reflektor","boomerangus"]){const a=setup(key,old),b=setup(key);for(let n=0;n<100;n++){const row=[{hasAim:true,aimX:1,punchHeld:n%31<8},{hasAim:true,aimX:-1,punchHeld:n%47<35}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${key}/${n}`);}}
  for(const arena of["standard","boulder-control","golden-rush"]){const a=createGame(process.cwd(),{sourceOverrides:old}),b=createGame();for(const g of[a,b])g.debug.dashball.setup({arena,ruleset:"battle"},{characters:["reflektor","spike"],seed:42});for(let n=0;n<60;n++){const row=[{hasAim:true,aimX:1,punchHeld:n<50},{hasAim:true,aimX:-1,punchHeld:n<45}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}}
});
