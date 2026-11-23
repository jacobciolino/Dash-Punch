"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),vm=require("node:vm"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const ref="ff389d2",previous=execFileSync("git",["show",`${ref}:game.js`],{encoding:"utf8",maxBuffer:8*1024*1024}),oldModule={module:{exports:{}}};vm.runInNewContext(execFileSync("git",["show",`${ref}:fighter-presentation.js`],{encoding:"utf8"}),oldModule);const before=oldModule.module.exports,plain=x=>JSON.parse(JSON.stringify(x));
function fixture(name="idle"){
  const pixels=new Uint8ClampedArray(40*40*4);for(let y=3;y<27;y++)for(let x=9;x<25;x++)pixels.set([100,55,130,255],(y*40+x)*4);for(const x of[17,21])pixels.set([0,240,60,255],(8*40+x)*4);
  return {pixels,original:pixels.slice(),frame:{x:0,y:0,w:40,h:40,name,frame:0,head:[15,3],anchor:{pivotX:15,foot:28}}};
}
test("Wizard keeps Gun Man's saved ID, roster position, statistics, magazine and reload",()=>{
  const a=createGame(process.cwd(),{sourceOverrides:{"game.js":previous}}),b=createGame();for(const g of[a,b])g.rb.setup({characterKeys:["gunman","anchor"],seed:93});const old=plain(a.debug.fighters[0].data),now=plain(b.debug.fighters[0].data);assert.equal(now.name,"Wizard");now.name=old.name;assert.deepEqual(now,old);assert.equal(b.rb.characterKeys.indexOf("gunman"),8);assert.equal(now.projectileConfig.magazine,3);assert.equal(now.projectileConfig.reloadTime,1.1);assert.equal(b.rb.characterKeys.length,a.rb.characterKeys.length);
});
test("three differently tipped wands and a diagonal leather strap stay on the opaque chest",()=>{
  const f=fixture(),original=f.original.slice(),legacy=f.pixels.slice();before.derive(legacy,f.original,40,40,"gunman",[f.frame]);P.derive(f.pixels,f.original,40,40,"gunman",[f.frame]);for(const[u,v,c]of[[-3,13,[185,242,237]],[0,15,[244,228,173]],[3,17,[206,186,233]]]){const i=((3+v)*40+15+u)*4;assert.deepEqual([...f.pixels.slice(i,i+3)],c);}assert.deepEqual(f.original,original);for(let i=3;i<f.pixels.length;i+=4)assert.equal(f.pixels[i],legacy[i]);for(const x of[17,21])assert.deepEqual([...f.pixels.slice((8*40+x)*4,(8*40+x)*4+4)],[0,240,60,255]);
});
test("all other fighters keep byte-identical appearance derivatives",()=>{
  for(const key of P.KEYS)if(key!=="gunman")for(const name of["idle","walk","attack1","hurt"]){const f=fixture(name),old=f.pixels.slice(),now=f.pixels.slice();before.derive(old,f.original,40,40,key,[f.frame]);P.derive(now,f.original,40,40,key,[f.frame]);assert.deepEqual(now,old,`${key}/${name}`);}
});
test("bandolier never paints transparent pixels or authored white hit flashes",()=>{
  for(const name of["idle","walk","attack1","dash","hurt","death"]){const f=fixture(name);for(let y=12;y<24;y++)for(let x=9;x<25;x++)if((x+y)%3===0)f.pixels[(y*40+x)*4+3]=0;f.original=f.pixels.slice();const old=f.pixels.slice();before.derive(old,f.original,40,40,"gunman",[f.frame]);P.derive(f.pixels,f.original,40,40,"gunman",[f.frame]);for(let i=3;i<f.pixels.length;i+=4)assert.equal(f.pixels[i],old[i]);}
  const f=fixture("hurt");for(let i=0;i<f.pixels.length;i+=4)if(f.pixels[i+3])f.pixels.set([255,255,255,255],i);f.original=f.pixels.slice();P.derive(f.pixels,f.original,40,40,"gunman",[f.frame]);assert.deepEqual(f.pixels,f.original);
});
test("firing, reloading, rounds, sports and deterministic snapshots match the actual prior version",()=>{
  const a=createGame(process.cwd(),{sourceOverrides:{"game.js":previous}}),b=createGame();for(const arena of[null,"standard","volleyball","target-charge-stationary","dash-pong"]){for(const g of[a,b]){if(arena){g.debug.dashball.setup({arena,ruleset:"battle",teamSize:1},{characters:["gunman","anchor"],ai:false,seed:93});g.debug.dashball.state.phase="playing";}else{g.debug.dashball.standard();g.rb.setup({characterKeys:["gunman","anchor"],stageIndex:0,seed:93});}g.debug.matchFlow.begin({countdown:false});}for(let n=0;n<120;n++){const row=[{hasAim:true,aimX:1,aimY:-.1,punchHeld:n%11<2,dashHeld:n%43<5},{}];a.rb.step(row);b.rb.step(row);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}const saved=b.rb.save(),hash=b.rb.hash();b.debug.gravity.draw(0);b.rb.restore(saved);assert.equal(b.rb.hash(),hash);}
});
