"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const plain=x=>JSON.parse(JSON.stringify(x)),neutral=R.decode(R.neutral());
function setup(key="gunman",source){const g=createGame(process.cwd(),source?{sourceOverrides:{"game.js":source}}:{});g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:42});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:300+i*900,y:300,prevX:300+i*900,prevY:300,onGround:false,invulnerable:0}));return g;}
function fire(g){g.debug.booster.punch(0,0,{x:1,y:0});g.debug.updateAttack(0,g.debug.fighters[0].attack.startup+.001);return g.debug.fighters[0].projectiles[0];}
test("Gun Man and Archer have distinct stepped-glow palettes and different short trail weights",()=>{
  const gun=setup("gunman").debug.projectileVisuals.style(0),arrow=setup("archer").debug.projectileVisuals.style(0);assert.notEqual(gun.color,arrow.color);assert(arrow.life>gun.life);assert(arrow.pixel>gun.pixel);assert(arrow.count>gun.count);assert.equal(setup("anchor").debug.projectileVisuals.style(0),null);
});
test("trails follow actual motion and reflection without modifying the projectile or duplicating on draws",()=>{
  for(const key of["gunman","archer"]){const g=setup(key),a=fire(g);assert(a);g.debug.presentationEffects.step(1/60);
    for(let n=0;n<4;n++){g.debug.updateProjectiles(1/60);g.debug.presentationEffects.step(1/60);}const trail=g.debug.projectileVisuals.trails;assert(trail.length>=3);assert(trail.every(p=>p.x<a.projectile.x&&Math.abs(p.y-a.projectile.y)<7));
    const before=g.rb.hash(),count=trail.length;g.debug.presentationEffects.draw();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),before);assert.equal(g.debug.projectileVisuals.trails.length,count);
    g.debug.projectileMagazine.reflect(a,1,{x:0,y:-1});const state=plain(a.projectile),x=a.projectile.x;for(let n=0;n<3;n++){g.debug.updateProjectiles(1/60);g.debug.presentationEffects.step(1/60);}assert.equal(a.reflectedOwnerId,g.debug.fighters[1].id);
    assert(g.debug.projectileVisuals.trails.some(p=>Math.abs(p.x-x)<7&&p.y>a.projectile.y));assert.equal(state.damage,a.projectile.damage);
  }
});
test("destroyed projectiles stop emitting while their existing fragments expire, with a bounded pool",()=>{
  const g=setup("archer"),a=fire(g);g.debug.presentationEffects.step(1/60);for(let n=0;n<5;n++){g.debug.updateProjectiles(1/60);g.debug.presentationEffects.step(1/60);}assert(g.debug.projectileVisuals.trails.length);
  a.projectile.removed=true;g.debug.updateProjectiles(0);assert.equal(g.debug.fighters[0].projectiles.length,0);assert(g.debug.projectileVisuals.trails.length);
  for(let n=0;n<20;n++)g.debug.presentationEffects.step(1/60);assert.equal(g.debug.projectileVisuals.trails.length,0);
  const h=setup("archer"),shot=fire(h);h.debug.fighters[0].projectiles=Array.from({length:60},(_,i)=>({...shot,id:i+50,projectile:{...shot.projectile}}));h.debug.presentationEffects.step(1/60);
  for(let n=0;n<10;n++){for(const a of h.debug.fighters[0].projectiles)a.projectile.x+=5;h.debug.presentationEffects.step(1/60);}assert(h.debug.projectileVisuals.trails.length<=192);
});
test("ground shadows choose the nearest actual floor/platform, never a platform above the shot",()=>{
  const g=setup("boomerangus");g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["boomerangus","anchor"],seed:42});
  const rects=g.debug.terrainArt.rects,p=rects.find(r=>r.kind==="oneway"),shot={x:p.x+p.w/2,y:p.y-50,radius:38};assert(p);
  const shadow=g.debug.projectileVisuals.shadow(shot);assert(shadow);assert(shadow.y>=shot.y);assert.equal(shadow.y,Math.min(...rects.filter(r=>shot.x>=r.x&&shot.x<=r.x+r.w&&r.y>=shot.y).map(r=>r.y)));
  shot.y=p.y+p.h+10;const below=g.debug.projectileVisuals.shadow(shot);assert(!below||below.y>=shot.y);assert(!below||below.y!==p.y);
});
test("no shadow is projected into a floor pit, and elevation reduces its width and opacity",()=>{
  const g=setup("boomerangus"),d=g.debug;g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Whirlwell"),characterKeys:["boomerangus","anchor"],seed:42});assert.equal(d.projectileVisuals.shadow({x:800,y:650,radius:38}),null);
  g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:["boomerangus","anchor"],seed:42});const floor=d.terrainArt.rects.find(r=>r.kind==="floor").y;
  const low=d.projectileVisuals.shadow({x:100,y:floor-20,radius:38}),high=d.projectileVisuals.shadow({x:100,y:floor-400,radius:38});assert(low.alpha>high.alpha);assert(low.width>high.width);
});
test("inverted and horizontal gravity project onto the facing side of real geometry",()=>{
  const g=setup("boomerangus"),d=g.debug;g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["boomerangus","anchor"],seed:42});
  d.gravity.setDirection("y",-1);const up=d.projectileVisuals.shadow({x:100,y:300,radius:38});assert.equal(up.y,40);assert.equal(up.x,100);
  d.gravity.setDirection("x",-1);const left=d.projectileVisuals.shadow({x:640,y:100,radius:38});assert.equal(left.x,40);assert.equal(left.y,100);
  d.gravity.setDirection("x",1);const right=d.projectileVisuals.shadow({x:640,y:650,radius:38});assert.equal(right.x,1240);assert.equal(right.y,650);
  const hash=g.rb.hash();d.projectileVisuals.drawShadow({x:640,y:500,radius:38});assert.equal(g.rb.hash(),hash);
});
test("moving platforms are sampled at their current rendered position",()=>{
  const g=setup("boomerangus"),d=g.debug;g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch Drift"),characterKeys:["boomerangus","anchor"],seed:42});d.advancePlatforms(1);
  const rects=d.terrainArt.rects,p=rects.find(r=>r.move),shot={x:p.x+p.w/2,y:p.y-30,radius:38};assert(p);const shadow=d.projectileVisuals.shadow(shot);assert.equal(shadow.y,Math.min(...rects.filter(r=>shot.x>=r.x&&shot.x<=r.x+r.w&&r.y>=shot.y).map(r=>r.y)));
});
test("presentation state restores cleanly and never appears in authoritative snapshots",()=>{
  const g=setup(),a=fire(g);g.debug.presentationEffects.step(1/60);for(let n=0;n<4;n++){g.debug.updateProjectiles(1/60);g.debug.presentationEffects.step(1/60);}const saved=g.rb.save(),count=g.debug.projectileVisuals.trails.length;
  g.debug.presentationEffects.step(.2);g.rb.restore(saved);assert.equal(g.debug.projectileVisuals.trails.length,count);assert(!JSON.stringify(saved.core).includes("magicTrail"));assert(!JSON.stringify(saved.core).includes("magicEmitter"));assert(a.projectile.spawned);
});
test("damage, velocity, ammo, reflection and sports interactions match the immediate prior checkpoint",()=>{
  const source=execFileSync("git",["show","3df686f:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  for(const key of["gunman","archer","boomerangus"]){const a=setup(key,source),b=setup(key);assert.deepEqual(plain(a.debug.fighters[0].data),plain(b.debug.fighters[0].data));
    for(let n=0;n<100;n++){const row=[{hasAim:true,aimX:1,punchHeld:n%31<3,dashHeld:n%49<6},neutral];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${key}/${n}`);}}
});
test("delayed rollback retains identical projectile states without visual-event farming",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[];
  for(let n=0;n<120;n++){const row=[R.encode({hasAim:true,aimX:1,punchHeld:n%29<3}),R.encode({hasAim:true,aimX:-1,dashHeld:n%37<8})];pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());assert(b.debug.projectileVisuals.trails.length<=192);
});
