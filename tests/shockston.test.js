"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const previous=execFileSync("git",["show","fc8260c:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),plain=x=>JSON.parse(JSON.stringify(x));
function setup(before=false,arena){const g=createGame(process.cwd(),before?{sourceOverrides:{"game.js":previous}}:{});if(arena){g.debug.dashball.setup({arena,ruleset:"battle",teamSize:1},{characters:["microusb","rain"],ai:false,seed:87});g.debug.dashball.state.phase="playing";}else g.rb.setup({stageIndex:0,characterKeys:["microusb","rain"],seed:87});return g;}
test("Shockston preserves Micro USB's internal ID, roster position, stats, artwork and resources",()=>{
  const a=setup(true),b=setup(),old=plain(a.debug.fighters[0].data),now=plain(b.debug.fighters[0].data);assert.equal(now.name,"Shockston");now.name=old.name;assert.deepEqual(now,old);assert.equal(b.rb.characterKeys.indexOf("microusb"),7);assert.equal(b.rb.characterKeys.length,a.rb.characterKeys.length);assert.equal(b.debug.fighters[0].airDashes,a.debug.fighters[0].airDashes);assert.equal(b.debug.fighters[0].shieldHealth,a.debug.fighters[0].shieldHealth);
});
test("eight deterministic, bounded pixel-electric aura frames remain crisp and never blank",()=>{
  const t=P.ELECTRIC_AURA,hashes=[];assert.deepEqual(t,{width:34,height:36,frames:8,fps:12});for(let n=0;n<t.frames;n++){
    const cells=P.electricAuraCells(n);assert(cells.length>30&&cells.length<100);assert.deepEqual(cells,P.electricAuraCells(n));assert.deepEqual(cells,P.electricAuraCells(n+8));assert(cells.every(c=>Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.x<t.width&&c.y>=0&&c.y<t.height&&/^#[0-9a-f]{6}$/.test(c.color)));hashes.push(JSON.stringify(cells));
  }assert.equal(new Set(hashes).size,8);
});
test("drawing and caching the aura do not consume gameplay RNG or alter snapshots",()=>{
  const g=setup(),d=g.debug,before=g.rb.hash(),saved=plain(g.rb.save());for(let n=0;n<100;n++){d.characterPresentation.electricAura(g.elements.get("game").getContext("2d"),100,100,3,n/60);d.gravity.draw(0);}assert.equal(g.rb.hash(),before);assert.deepEqual(plain(g.rb.save()),saved);assert.equal(d.characterPresentation.electricAuraArt,d.characterPresentation.electricAuraArt);
});
test("the renamed fighter reproduces pre-patch fighting, electric follow-ups and round state",()=>{
  const a=setup(true),b=setup();for(const g of[a,b])g.debug.matchFlow.begin({countdown:false});for(let n=0;n<180;n++){const row=[{hasAim:true,aimX:1,aimY:-.2,punchHeld:n%29<8,dashHeld:n%41<5},{hasAim:true,aimX:-1,punchHeld:n%37<6}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`frame ${n}`);}
});
test("sports interactions remain exactly equal to the immediate pre-change checkpoint",()=>{
  for(const arena of["standard","volleyball","boulder-control","target-charge-stationary","dash-pong"]){const a=setup(true,arena),b=setup(false,arena);for(let n=0;n<60;n++){const row=[{hasAim:true,aimX:1,punchHeld:n%19<6,dashHeld:n%31<5},{}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}}
});
