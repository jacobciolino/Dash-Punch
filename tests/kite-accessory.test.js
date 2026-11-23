"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let groups=0;
const check=(label,test)=>{test();groups++;console.log(`ok ${label}`);};
function setup(){const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["kite","orbit"],seed:94});Object.assign(g.debug.fighters[0],{x:700,y:350,prevX:700,prevY:350,onGround:false,vx:0,vy:0,face:{x:1,y:0}});return g;}
const tick=(g,n=1)=>{for(let i=0;i<n;i++)g.debug.presentationEffects.step(dt);};
check("authored diamond uses tiny native pixels and only Kite receives the accessory",()=>{
  const g=setup(),d=g.debug,pixels=d.kiteAccessory.pixels;assert.equal(pixels.length,14);assert(pixels.every(row=>row.length===9&&/^[.#ab]+$/.test(row)));assert(d.kiteAccessory.pose(0));assert.equal(d.kiteAccessory.pose(1),null);tick(g);assert.equal(d.kiteAccessory.count,1);
  const hash=g.rb.hash();d.kiteAccessory.draw();assert.equal(g.rb.hash(),hash);assert.equal(d.kiteAccessory.count,1);
});
check("idle bobs without rendering-dependent updates or changes to the fighter",()=>{
  const g=setup(),f=g.debug.fighters[0],hash=g.rb.hash(),ys=[];for(let i=0;i<180;i++){tick(g);ys.push(g.debug.kiteAccessory.pose().y);}assert(Math.max(...ys)-Math.min(...ys)>3);assert.equal(g.rb.hash(),hash);near(f.x,700);near(f.y,350);
  const pose=plain(g.debug.kiteAccessory.pose());for(let i=0;i<20;i++)g.debug.kiteAccessory.draw();assert.deepEqual(plain(g.debug.kiteAccessory.pose()),pose);
});
check("movement and dash lag are bounded and ease back after stopping",()=>{
  const g=setup(),f=g.debug.fighters[0];tick(g);const initial=g.debug.kiteAccessory.pose();f.x+=100;tick(g);const lag=g.debug.kiteAccessory.pose();assert(lag.x-initial.x<65);assert(f.x-lag.x>55);assert(Math.hypot(lag.x-lag.anchor.x,lag.y-lag.anchor.y)<=86.001);
  tick(g,120);const settled=g.debug.kiteAccessory.pose();assert(f.x-settled.x<42&&f.x-settled.x>28);f.y-=80;tick(g);const rising=g.debug.kiteAccessory.pose();assert(rising.y-settled.y> -60);assert(Math.hypot(rising.x-rising.anchor.x,rising.y-rising.anchor.y)<=86.001);
});
check("facing changes and all four gravity directions use the same soft tether",()=>{
  const g=setup(),d=g.debug,f=d.fighters[0];tick(g);f.face={x:-1,y:0};tick(g);assert(d.kiteAccessory.pose().x<f.x);tick(g,120);assert(d.kiteAccessory.pose().x>f.x);
  for(const [axis,sign,down] of [["y",1,{x:0,y:1}],["y",-1,{x:0,y:-1}],["x",1,{x:1,y:0}],["x",-1,{x:-1,y:0}]]){d.gravity.setDirection(axis,sign);tick(g,120);const p=d.kiteAccessory.pose();assert((p.x-f.x)*down.x+(p.y-f.y)*down.y< -45);assert(Math.hypot(p.x-p.anchor.x,p.y-p.anchor.y)<=86.001);}
});
check("horizontal seams retain a short tether; recovery teleports never stretch across the arena",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard-open"},{characters:["kite","orbit"]});const f=d.fighters[0],w=d.dashball.arena.width;Object.assign(f,{x:w-2,y:500});tick(g);const before=d.kiteAccessory.pose().x-f.x;f.x=2;tick(g);near(d.kiteAccessory.pose().x-f.x,before-4*Math.exp(-7*dt),.2);
  f.y-=5000;tick(g);const p=d.kiteAccessory.pose();assert(Math.hypot(p.x-p.anchor.x,p.y-p.anchor.y)<86);const hash=g.rb.hash();d.kiteAccessory.draw();assert.equal(g.rb.hash(),hash);
});
check("KO, respawn and rematch do not leave orphan accessories or stale tethers",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard",teamSize:5},{characters:["kite"]});tick(g);assert.equal(d.kiteAccessory.count,10);d.dashball.knockout(0);tick(g);assert.equal(d.kiteAccessory.pose(0),null);assert.equal(d.kiteAccessory.count,9);
  Object.assign(d.fighters[0],{koScored:false,koCorpseGone:false,x:400,y:100});tick(g);assert(d.kiteAccessory.pose(0));d.dashball.setup({arena:"standard"},{characters:["orbit","spike"]});assert.equal(d.kiteAccessory.count,0);assert.equal(d.kiteAccessory.pose(0),null);
});
check("presentation snapshots, replay and delayed rollback restore the exact visual tether",()=>{
  const games=[setup(),setup()],[a,b]=games,manager=b.rb.manager(0,8),pending=[],rows=[],initial=a.rb.save();
  for(let i=0;i<180;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:Math.cos(i*.03+n),aimY:Math.sin(i*.03),dashHeld:i%53<12,punchHeld:i%37<7}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert.deepEqual(plain(a.debug.kiteAccessory.pose()),plain(b.debug.kiteAccessory.pose()));const end=plain(a.debug.kiteAccessory.pose()),hash=a.rb.hash();a.rb.restore(initial);for(const row of rows)a.rb.step(row.map(R.decode));assert.deepEqual(plain(a.debug.kiteAccessory.pose()),end);assert.equal(a.rb.hash(),hash);
  const saved=a.rb.save();assert(saved.presentation.kiteTethers);assert(!JSON.stringify(saved.core).includes("kiteTethers"));delete saved.presentation.kiteTethers;a.rb.restore(saved);assert(a.debug.kiteAccessory.pose());
});
check("30/60/120Hz rendering produces identical visual and gameplay state",()=>{
  const results=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"elevated"},{characters:["kite","kite"],ai:true,seed:923});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push({pose:plain(g.debug.kiteAccessory.pose()),hash:g.rb.hash()});}assert.deepEqual(results[0],results[1]);assert.deepEqual(results[0],results[2]);
});
function canonical(g){const core=plain(g.rb.save().core);core.stageIndex=0;for(const f of core.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","currentWallId","wallContactId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(core);}
check("all existing sports and Versus retain exact pre-accessory gameplay and original sprite definitions",()=>{
  const oldRoot=path.resolve("exports/Dash-Punch-Gameplay-Repair-Release-2026-11-14"),old=createGame(oldRoot),now=createGame();assert.deepEqual(plain(now.sandbox.window.DASH_PUNCH_ART.assignments.kite),plain(old.sandbox.window.DASH_PUNCH_ART.assignments.kite));
  const modes=["versus",...D.ARENAS.map(a=>a.id),"race","brawl","scramble"];
  for(const mode of modes){for(const g of [old,now]){const characters=["kite","boomerangus"];if(mode==="versus")g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:characters,seed:283});else if(["race","brawl","scramble"].includes(mode))g.debug.sandbag.setup({ruleset:mode},{characters,seed:283});else g.debug.dashball.setup({arena:mode},{characters,seed:283});}
    assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));for(let i=0;i<90;i++){const input=[0,1].map(n=>R.decode(R.encode({hasAim:true,aimX:n?-1:1,aimY:-.2,punchHeld:i%31<7,dashHeld:i%49<10})));old.rb.step(input);now.rb.step(input);assert.equal(canonical(now),canonical(old),`${mode}:${i}`);}const hash=now.rb.hash();now.debug.stagePresentation.draw();assert.equal(now.rb.hash(),hash);assert(now.debug.kiteAccessory.pose());}
});
console.log(`${groups} Kite accessory groups passed`);
