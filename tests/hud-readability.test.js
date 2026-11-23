"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const keys=["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"],plain=x=>JSON.parse(JSON.stringify(x));
function setup(key="anchor",source){const g=createGame(process.cwd(),source?{sourceOverrides:{"game.js":source}}:{});g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:42});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:300+i*500,y:400,prevX:300+i*500,prevY:400,onGround:false,invulnerable:0,vx:0,vy:0}));return g;}
test("all nineteen core health silhouettes are distinct, bounded, pixel-aligned and stay in the compact row",()=>{
  const g=setup(),d=g.debug;for(const width of[80,140,450]){
    const patterns=new Set();for(const key of keys){const profile=plain(d.hudReadability.profile(key,width));assert.equal(profile.reduce((n,r)=>n+r.width,0),width);assert(profile.every(r=>r.top>=0&&r.bottom<=12&&r.top<=r.bottom));assert(profile.every(r=>Object.values(r).every(Number.isInteger)));patterns.add(JSON.stringify(profile));}assert.equal(patterns.size,19);
  }
  d.dashball.setup({arena:"standard",teamSize:5},{characters:keys});const before=g.rb.hash();d.compactHud.draw();assert.equal(g.rb.hash(),before);assert.equal(d.compactHud.layout().height,58);
});
test("on-fighter dash counters use actual dash capacity, update immediately, brighten on refill and snapshot only presentation",()=>{
  for(const key of keys){const g=setup(key),d=g.debug,f=d.fighters[0],before=g.rb.hash();d.hudReadability.indicators();assert.equal(g.rb.hash(),before);
    assert.equal(d.hudReadability.dash(0).capacity,f.data.maxAirDashes);f.airDashes=1;d.presentationEffects.step(1/60);assert.equal(d.hudReadability.dash(0).remaining,1);
    f.airDashes=f.data.maxAirDashes;d.presentationEffects.step(1/60);assert.equal(d.hudReadability.dash(0).flash,f.data.maxAirDashes>1);const saved=g.rb.save();assert(!JSON.stringify(saved.core).includes("fighterReadouts"));assert(JSON.stringify(saved.presentation).includes("fighterReadouts"));
    d.presentationEffects.step(.2);assert(!d.hudReadability.dash(0).flash);g.rb.restore(saved);assert.equal(d.hudReadability.dash(0).flash,f.data.maxAirDashes>1);
  }
});
test("high dash counts wrap compactly without losing banked charges, and gravity/facing do not alter resource values",()=>{
  const g=setup("rain"),d=g.debug,f=d.fighters[0];f.airDashes=2;f.bankedAirDashes=1;
  for(const [axis,sign]of[["y",1],["y",-1],["x",1],["x",-1]]){d.gravity.setDirection(axis,sign);for(const side of[-1,1]){f.face={x:side,y:0};const v=d.hudReadability.dash(0);assert.equal(v.remaining,2);assert.equal(v.banked,1);assert(v.rows<=2);assert(Number.isFinite(v.anchor.top));assert(v.anchor.extra>=0);}}
});
test("critical warning is universal, percentage-based, discrete, and suppressed by damage flashes, spawn protection and KOs",()=>{
  for(const key of keys){const g=setup(key),d=g.debug,f=d.fighters[0],max=d.compactHud.player(0).maximum;
    f.health=max*.25;assert(d.hudReadability.critical(0,.1));assert(!d.hudReadability.critical(0,.3));assert(d.hudReadability.critical(0,.8));f.health=max*.251;assert(!d.hudReadability.critical(0,.1));
    f.health=max*.2;f.flash=.01;assert(!d.hudReadability.critical(0,.1));f.flash=0;f.invulnerable=.1;assert(!d.hudReadability.critical(0,.1));f.invulnerable=0;f.koScored=true;assert(!d.hudReadability.critical(0,.1));
  }
  const g=setup("phantom"),f=g.debug.fighters[0];f.health=g.debug.compactHud.player(0).maximum*.2;g.debug.gravity.dash(0,{x:1,y:0},0);assert(g.debug.phantom.ghost(0));assert(g.debug.phantom.alpha(0)<=.45);assert(g.debug.hudReadability.critical(0,.1));
});
test("vulnerability/status icons and colors are identical across characters and match the HUD's shared definitions",()=>{
  let expected;for(const key of keys){const g=setup(key),f=g.debug.fighters[0];Object.assign(f,{escapeAvailable:false,punchParryAvailable:false,dashEscapeMeter:.3,punchParryMeter:.7});const statuses=plain(g.debug.hudReadability.statuses(0,true));assert.deepEqual(statuses.map(s=>s.key),["exhausted","dash","parry"]);const icons=plain(g.debug.hudReadability.icons);if(expected)assert.deepEqual(icons,expected);else expected=icons;
    f.floorTechVulnerable=.1;assert.equal(g.debug.hudReadability.statuses(0)[0].key,"floor");f.shieldBreakFlash=.1;assert.equal(g.debug.hudReadability.statuses(0)[0].key,"shieldBreak");
  }
});
test("gray stepped aim outlines preserve authoritative vertices at horizontal, vertical and diagonal angles",()=>{
  for(const key of["anchor","rain","whipado","edgebert","booster","lamer","lancer"]){const g=setup(key),d=g.debug;for(const angle of[0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.75]){
    const dir={x:Math.cos(angle),y:Math.sin(angle)},a=d.hudReadability.outline(0,dir,.5),before=g.rb.hash();assert.equal(a.color,"#aab3b8");assert(a.cells.length>3);assert(a.cells.every(p=>p.x%3===0&&p.y%3===0));
    const expected=d.getPunchHitbox(0,dir,.5);assert.deepEqual(plain(a.box),plain(expected));d.fighters[0].punchAim=dir;const state=g.rb.hash();d.hudReadability.preview(0);assert.equal(g.rb.hash(),state);assert(before);
  }}
});
test("rendering, phase, statuses and restored visual history leave fighter mechanics and hashes unchanged",()=>{
  const source=execFileSync("git",["show","ccf9e88:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  for(const key of["rain","orbit","phantom","gunman","spike","lancer"]){const a=setup(key,source),b=setup(key);assert.deepEqual(plain(a.debug.fighters[0].data),plain(b.debug.fighters[0].data));
    for(let n=0;n<90;n++){const row=[{hasAim:true,aimX:1,aimY:n%20<10?-.5:.5,punchHeld:n%37<8,dashHeld:n%49<6},{hasAim:true,aimX:-1}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${key}/${n}`);}
    const hash=b.rb.hash();b.debug.stagePresentation.draw();b.debug.hudReadability.indicators();assert.equal(b.rb.hash(),hash);
  }
});
test("delayed replay/rollback retains correct counters and presentation caches stay bounded",()=>{
  const a=setup("rain"),b=setup("rain"),manager=b.rb.manager(0,8),pending=[],saved=a.rb.save(),rows=[];
  for(let n=0;n<120;n++){const row=[0,1].map(i=>R.encode({hasAim:true,aimX:i?-1:1,punchHeld:n%37<8,dashHeld:(n+i*9)%43<6}));rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);const hash=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
  for(let width=60;width<300;width++)a.debug.hudReadability.profile("rain",width);assert(a.debug.hudReadability.cache.healthProfiles<=96);assert(a.debug.hudReadability.cache.readouts<=2);
});
