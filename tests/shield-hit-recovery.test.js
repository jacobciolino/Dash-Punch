"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(key="anchor",court=false,teamSize=2){const g=createGame();g.debug.dashball.setup({arena:"standard",ruleset:court?"court":"battle",teamSize},{characters:[key,"anchor"],ai:false,seed:44});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:700+i*200,y:500,prevX:700+i*200,prevY:500,vx:0,vy:0,onGround:false,invulnerable:0}));return g;}
test("shield recovery is damage times .25, capped, deduplicated per target and never bypasses a break",()=>{
  const g=setup(),f=g.debug.fighters[0],s=g.debug.shields,a={id:1};f.shieldHealth=10;near(s.hitRecovery,.25);near(s.recover(0,a,"ball",18),4.5);near(s.recover(0,a,"ball",18),0);near(s.recover(0,a,"other",18),4.5);
  f.shieldHealth=f.data.shieldMax-1;near(s.recover(0,{id:2},"ball",18),1);f.shieldHealth=0;f.shieldRegenDelay=2;near(s.recover(0,{id:3},"ball",18),0);f.shieldHealth=1;f.hitstun=1;f.stunType="shieldBreak";near(s.recover(0,{id:4},"ball",18),0);
});
test("native fighter hits, Court contacts and status punches recover without requiring HP loss",()=>{
  for(const key of["anchor","booster","lamer"])for(const court of[false,true]){const g=setup(key,court),[f,t]=g.debug.fighters;f.shieldHealth=10;t.x=f.x+55;const hp=t.health;g.debug.booster.punch(0,0,{x:1,y:0});f.attack.age=f.attack.startup+.001;g.debug.handleHits();assert(f.shieldHealth>10,`${key} ${court}`);assert.equal(t.health===hp,court);const after=f.shieldHealth;g.debug.handleHits();near(f.shieldHealth,after);}
});
test("sports punch recovery deduplicates persistent contact; misses and Kickoffs restore nothing",()=>{
  const g=setup(),f=g.debug.fighters[0],s=g.debug.dashball.state;f.shieldHealth=10;Object.assign(s.ball,{x:800,y:500,vx:0,vy:0});Object.assign(f,{x:740,y:500});const a={id:77,charge:0,grounded:false,dir:{x:1,y:0},hitTargets:new Set()};assert(g.debug.dashball.shot(0,a));near(f.shieldHealth,14.5);assert(!g.debug.dashball.shot(0,a));near(f.shieldHealth,14.5);
});
test("actual recovery contacts and their deduplication reproduce after snapshot and delayed rollback",()=>{
  const a=setup("anchor",false,1),b=setup("anchor",false,1);for(const g of[a,b]){const[f,t]=g.debug.fighters;f.shieldHealth=10;t.x=t.prevX=f.x+55;g.debug.booster.punch(0,0,{x:1,y:0});}
  const initial=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];let recovered=false;
  for(let n=0;n<100;n++){const row=[{hasAim:true,aimX:1},{hasAim:true,aimX:-1,dashHeld:n>40&&n<45}].map(x=>R.decode(R.encode(x)));rows.push(row);pending.push({frame:n,input:R.encode(row[1])});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(R.encode(row[0]));a.rb.step(row);const f=a.debug.fighters[0];recovered ||= f.shieldHealth>10+(n+1)/60*f.data.shieldMax/a.debug.shields.recoverySeconds(0)+.5;}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(recovered);assert.equal(a.rb.hash(),b.rb.hash());const end=a.rb.hash();a.rb.restore(initial);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),end);
});
test("Booster and Lamer are 145 HP, Lamer is 7/11 damage and 1000/12000 nominal knockback",()=>{
  for(const key of["booster","lamer"]){const g=setup(key),f=g.debug.fighters[0];assert.equal(f.data.maxHealth,145);if(key==="lamer"){assert.equal(f.data.punchDamage,7);assert.equal(Math.round(f.data.punchDamage*(1+f.data.punchDamageCharge)),11);assert.equal(f.data.punchKnockback,1000);assert.equal(f.data.punchKnockback*(1+f.data.punchKnockbackCharge),12000);}}
});
test("gravity boulder neutral perch is centered, horizontal, bounded and separate from scoring platforms",()=>{
  const g=createGame();g.debug.dashball.setup({arena:"gravity-boulder"});const a=g.debug.dashball.arena,p=a.terrain.find(t=>t.boulderPerch);near(p.x+p.w/2,a.width/2);assert.equal(p.move.axis,"x");assert.equal(p.gravityPlatform,undefined);assert.equal(a.gravityPlatforms.length,2);assert(p.x-p.move.amplitude>0&&p.x+p.w+p.move.amplitude<a.width);near(p.move.speed,Math.PI/5);
  const before=g.debug.advancePlatforms(0).find(t=>t.boulderPerch),f=g.debug.fighters[0];Object.assign(f,{x:before.x+before.w/2,y:before.y-f.data.height/2,prevX:before.x+before.w/2,prevY:before.y-f.data.height/2,onGround:true,groundTerrainId:before.id});
  const x=f.x,y=f.y,next=g.debug.advancePlatforms(1/60).find(t=>t.boulderPerch);near(f.x-x,next.x-before.x);near(f.y,y);assert(f.x>x);
});
