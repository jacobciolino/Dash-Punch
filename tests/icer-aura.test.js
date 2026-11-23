"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),vm=require("node:vm"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const ref="280d826",previous=execFileSync("git",["show",`${ref}:game.js`],{encoding:"utf8",maxBuffer:8*1024*1024}),old={module:{exports:{}}};vm.runInNewContext(execFileSync("git",["show",`${ref}:fighter-presentation.js`],{encoding:"utf8"}),old);const before=old.module.exports,plain=x=>JSON.parse(JSON.stringify(x));
test("eight frost frames are crisp, bounded, deterministic, distinct and sparse",()=>{
  const t=P.FROST_AURA,frames=[];assert.deepEqual(t,{width:34,height:36,frames:8,fps:8});for(let n=0;n<t.frames;n++){
    const cells=P.frostAuraCells(n);assert(cells.length>=40&&cells.length<80);assert.deepEqual(cells,P.frostAuraCells(n+8));assert.deepEqual(cells,P.frostAuraCells(n-8));
    for(const c of cells){assert(Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.x<t.width&&c.y>=0&&c.y<t.height);assert(["#507c9b","#8bcbdc","#e8ffff"].includes(c.color));assert(Math.abs(c.x-17)>=10,"keep frost off the face/body");}frames.push(JSON.stringify(cells));
  }assert.equal(new Set(frames).size,8);
});
test("native sprite derivatives and Shockston's existing electricity remain unchanged",()=>{
  for(let n=0;n<8;n++)assert.deepEqual(P.electricAuraCells(n),plain(before.electricAuraCells(n)));
  for(const key of P.KEYS){const pixels=new Uint8ClampedArray(40*40*4);for(let y=3;y<27;y++)for(let x=9;x<25;x++)pixels.set([100,55,130,255],(y*40+x)*4);for(const x of[17,21])pixels.set([0,240,60,255],(8*40+x)*4);const original=pixels.slice(),a=pixels.slice(),b=pixels.slice(),frames=[{x:0,y:0,w:40,h:40,name:"idle",frame:0,head:[15,3],anchor:{pivotX:15,foot:28}}];before.derive(a,original,40,40,key,frames);P.derive(b,original,40,40,key,frames);assert.deepEqual(a,b,key);}
});
test("cached frost drawing in any gravity direction preserves snapshots and gameplay RNG",()=>{
  const g=createGame();g.rb.setup({characterKeys:["icer","microusb"],seed:213});const d=g.debug,paint=g.elements.get("game").getContext("2d"),art=d.characterPresentation.frostAuraArt;
  for(const[axis,sign]of[["y",1],["y",-1],["x",1]]){d.gravity.setDirection(axis,sign);const hash=g.rb.hash(),snapshot=plain(g.rb.save());for(let n=0;n<100;n++){d.characterPresentation.frostAura(paint,100,100,3,n/60);d.gravity.draw(0);}assert.equal(g.rb.hash(),hash);assert.deepEqual(plain(g.rb.save()),snapshot);assert.equal(art,d.characterPresentation.frostAuraArt);}
});
test("Icer stats, ice hazards, sports and snapshots match the actual pre-change game",()=>{
  const a=createGame(process.cwd(),{sourceOverrides:{"game.js":previous}}),b=createGame();for(const arena of[null,"standard","dash-pong","target-charge-stationary"]){for(const g of[a,b]){if(arena){g.debug.dashball.setup({arena,ruleset:"battle",teamSize:1},{characters:["icer","anchor"],ai:false,seed:213});g.debug.dashball.state.phase="playing";}else g.rb.setup({characterKeys:["icer","anchor"],seed:213});g.debug.matchFlow.begin({countdown:false});}assert.deepEqual(plain(a.debug.fighters[0].data),plain(b.debug.fighters[0].data));for(let n=0;n<90;n++){const row=[{hasAim:true,aimX:1,aimY:-.2,dashHeld:n%37<4,punchHeld:n%31<3},{}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}const saved=b.rb.save(),hash=b.rb.hash();b.rb.restore(saved);assert.equal(b.rb.hash(),hash);}
});
