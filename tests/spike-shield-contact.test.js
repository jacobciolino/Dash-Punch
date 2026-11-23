"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
function guard(f,dir={x:1,y:0}){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:dir,punchExhausted:false,shieldReactivationTimer:0,shieldDashLockout:false});}
function setup(ruleset=null,key="anchor"){
  const g=createGame();if(ruleset)g.debug.dashball.setup({arena:"standard",ruleset},{characters:["spike",key],seed:723});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:["spike",key],seed:723});
  g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:500+i*70,y:300,prevX:500+i*70,prevY:300,vx:0,vy:0,onGround:false,invulnerable:0,hitstun:0,hitstop:0}));guard(g.debug.fighters[0]);return g;
}
test("ordinary frontal shield contact deals seven health damage with low push, .18s stun and a four-durability cost",()=>{
  const g=setup(),d=g.debug,[s,t]=d.fighters,hp=t.health,shield=s.shieldHealth;s.airDashes=0;d.shields.fighterContacts();near(t.health,hp-7);near(s.shieldHealth,shield-4);near(Math.hypot(t.vx,t.vy),130);near(t.hitstun,.18);assert.equal(t.lastAttacker,s);assert.equal(t.stunType,"stun");assert.equal(s.airDashes,0);assert.deepEqual(plain(s.spikeShieldContacts),[t.id]);
});
test("persistent overlap and release/rehold do not farm damage, but genuine separation allows another touch",()=>{
  const g=setup(),d=g.debug,[s,t]=d.fighters,hp=t.health,shield=s.shieldHealth;d.shields.fighterContacts();for(let n=0;n<60;n++)d.shields.fighterContacts();near(t.health,hp-7);near(s.shieldHealth,shield-4);
  s.chargingPunch=false;s.punchPending=false;s.punchInputHeld=false;d.shields.fighterContacts();guard(s);t.x=570;d.shields.fighterContacts();near(t.health,hp-7);
  t.x=850;d.shields.fighterContacts();assert.equal(s.spikeShieldContacts.length,0);t.x=570;d.shields.fighterContacts();near(t.health,hp-14);near(s.shieldHealth,shield-8);
});
test("direction, Court, friendly fire, invulnerability and Phantom ghost rules remain intact",()=>{
  const rear=setup(),[s,t]=rear.debug.fighters;t.x=430;const hp=t.health;rear.debug.shields.fighterContacts();near(t.health,hp);t.x=500;t.y=230;guard(s,{x:0,y:-1});rear.debug.shields.fighterContacts();near(t.health,hp-7);
  const court=setup("court"),[a,b]=court.debug.fighters,h=b.health,sh=a.shieldHealth;court.debug.shields.fighterContacts();near(b.health,h);near(a.shieldHealth,sh);
  for(const enabled of[false,true]){const g=setup("battle"),saved=g.rb.save();saved.core.teamAttackEnabled=enabled;saved.core.fighters[1].team=saved.core.fighters[0].team;g.rb.restore(saved);const [owner,target]=g.debug.fighters,health=target.health;g.debug.shields.fighterContacts();near(target.health,health-(enabled?7:0));}
  const protectedGame=setup(),target=protectedGame.debug.fighters[1];target.invulnerable=1;const health=target.health;protectedGame.debug.shields.fighterContacts();near(target.health,health);
  const ghost=setup(null,"phantom"),p=ghost.debug.fighters[1],old=p.health;ghost.debug.gravity.dash(1,{x:1,y:0});assert(ghost.debug.phantom.ghost(1));ghost.debug.shields.fighterContacts();near(p.health,old);
});
test("blocked Kickoffs use the same damage and low launch without duplicate contact damage",()=>{
  const g=setup(),d=g.debug,[s,t]=d.fighters;guard(s,{x:-1,y:0});Object.assign(t,{x:478,prevX:448,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:.3,airDashes:2});const hp=t.health;assert(d.tryDashRebound(1,0));near(t.health,hp-7);near(t.hitstun,.18);near(Math.hypot(t.vx,t.vy),130);d.shields.fighterContacts();near(t.health,hp-7);
});
test("contact durability depletion genuinely breaks the shield and KO/reset cleanup clears contact state",()=>{
  const g=setup(),d=g.debug,[s,t]=d.fighters;s.shieldHealth=3;t.health=6;d.shields.fighterContacts();assert.equal(s.shieldHealth,0);assert.equal(s.stunType,"shieldBreak");assert(t.koScored);s.reset(true);assert.deepEqual(plain(s.spikeShieldContacts),[]);
});
test("snapshot restore and replay retain contact generations without duplicate hits",()=>{
  const g=setup(),d=g.debug;const before=g.rb.save();d.shields.fighterContacts();const hit=g.rb.save(),hash=g.rb.hash(),hp=d.fighters[1].health;g.rb.restore(hit);d.shields.fighterContacts();near(d.fighters[1].health,hp);assert.equal(g.rb.hash(),hash);g.rb.restore(before);d.shields.fighterContacts();assert.equal(g.rb.hash(),hash);
});
test("held shield contact, stun, durability and separation reproduce under delayed rollback and 30/60/120Hz",()=>{
  const a=setup("battle"),b=setup("battle"),manager=b.rb.manager(0,8),pending=[],rows=[];for(let n=0;n<90;n++){const row=[R.encode({hasAim:true,aimX:1,punchHeld:true}),R.encode({hasAim:true,aimX:-1,dashHeld:n%35<5})];rows.push(row.map(R.decode));pending.push({n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.n,p.input);}assert(manager.advance(row[0]));a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.n,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);
  const hashes=[];for(const hz of[30,60,120]){const g=setup("battle");g.debug.shields.fighterContacts();for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
