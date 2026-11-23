"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),fs=require("node:fs"),{createGame}=require("./simulation-harness");
const previous=execFileSync("git",["show","c313b1d:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),plain=x=>JSON.parse(JSON.stringify(x));
test("flames reuse native one-pixel art and one cached bounded eight-frame atlas",()=>{
  const g=createGame(),d=g.debug,paint=g.elements.get("game").getContext("2d"),cells=[];paint.fillRect=(...rect)=>cells.push({rect,color:paint.fillStyle});const t=d.characterPresentation.flameAuraTuning,art=d.characterPresentation.flameAuraArt;assert.deepEqual(plain(t),{width:34,height:36,frames:8,fps:10});assert.equal(art.width,272);assert.equal(art.height,36);assert(cells.length>800&&cells.length<1400);assert(cells.every(c=>c.rect.every(Number.isInteger)&&c.rect[2]===1&&c.rect[3]===1&&["#e56836","#ffc552","#fff0b0"].includes(c.color)));assert.equal(art,d.characterPresentation.flameAuraArt);
  const count=cells.length,frames=[];paint.drawImage=(_,x)=>frames.push(x);for(let n=0;n<8;n++)d.characterPresentation.flameAura(paint,100,100,3,n/10+.001);assert.deepEqual(frames,[0,34,68,102,136,170,204,238]);assert.equal(cells.length,count);
});
test("aura rendering in normal, inverted and sideways gravity never changes gameplay or hazards",()=>{
  const g=createGame();g.rb.setup({characterKeys:["ember","icer"],seed:216});const d=g.debug,paint=g.elements.get("game").getContext("2d");for(const[axis,sign]of[["y",1],["y",-1],["x",1]]){d.gravity.setDirection(axis,sign);const hash=g.rb.hash(),snapshot=plain(g.rb.save());for(let n=0;n<100;n++){d.characterPresentation.flameAura(paint,100,100,3,n/60);d.gravity.draw(0);}assert.equal(g.rb.hash(),hash);assert.deepEqual(plain(g.rb.save()),snapshot);assert.equal(d.fighters[0].ember.flames.length,0);}
});
test("Ember combat, sports, snapshots and fire hazards match the actual pre-change version",()=>{
  const a=createGame(process.cwd(),{sourceOverrides:{"game.js":previous}}),b=createGame();for(const arena of[null,"standard","target-charge-stationary","dash-pong"]){for(const g of[a,b]){if(arena){g.debug.dashball.setup({arena,ruleset:"battle",teamSize:1},{characters:["ember","anchor"],ai:false,seed:216});g.debug.dashball.state.phase="playing";}else g.rb.setup({characterKeys:["ember","anchor"],seed:216});g.debug.matchFlow.begin({countdown:false});}assert.deepEqual(plain(a.debug.fighters[0].data),plain(b.debug.fighters[0].data));for(let n=0;n<60;n++){const row=[{hasAim:true,aimX:1,aimY:-.3,punchHeld:n%29<3,dashHeld:n%23<4},{}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}const saved=b.rb.save(),hash=b.rb.hash();b.rb.restore(saved);assert.equal(b.rb.hash(),hash);}
});
test("existing sprites, other auras, licensed art definitions and physics files are untouched",()=>{
  for(const file of["fighter-presentation.js","presentation-assets.js","ember.js","ice.js","dashball.js","target-charge.js","rollback.js"])assert.equal(fs.readFileSync(file,"utf8"),execFileSync("git",["show",`c313b1d:${file}`],{encoding:"utf8",maxBuffer:8*1024*1024}),file);
});
