"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),vm=require("node:vm"),fs=require("node:fs"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const old={module:{exports:{}}};vm.runInNewContext(execFileSync("git",["show","48a1352:fighter-presentation.js"],{encoding:"utf8"}),old);const before=old.module.exports;
function fixture(name="idle",head=[15,3],anchor={pivotX:15,foot:28}){
  const pixels=new Uint8ClampedArray(40*40*4);for(let y=3;y<26;y++)for(let x=9;x<24;x++)pixels.set([100,55,130,255],(y*40+x)*4);for(const x of[17,21])pixels.set([0,240,60,255],(8*40+x)*4);
  return {pixels,original:pixels.slice(),frame:{x:0,y:0,w:40,h:40,name,frame:0,head,anchor}};
}
test("Lancer's carried spear sits above-left of the hand over the old sword position",()=>{
  const f=fixture(),detail=P.derive(f.pixels,f.original,40,40,"lancer",[f.frame]),p=detail.frames[0].carriedSpear;assert(p.tip[0]<p.hand[0]-5);assert(p.tip[1]<p.hand[1]-7);assert(p.fit>0&&p.fit<=1);
  const at=(x,y)=>[...f.pixels.slice((y*40+x)*4,(y*40+x)*4+4)];assert.equal(at(...p.tip)[3],255);assert.deepEqual(at(18,0),[0,0,0,0]);for(const x of[17,21])assert.deepEqual(at(x,8),[0,240,60,255]);
});
test("held and attacking spear states do not receive a second carried weapon",()=>{
  for(const[name,weaponHeld]of[["idle",true],["attack1",false],["attack2",true]]){const f=fixture(name),a=f.pixels.slice(),b=f.pixels.slice();const now=P.derive(a,f.original,40,40,"lancer",[f.frame],{weaponHeld});before.derive(b,f.original,40,40,"lancer",[f.frame],{weaponHeld});assert.deepEqual(a,b);assert.equal(now.frames[0].carriedSpear,null);}
});
test("leaning poses keep the carried spear inside native frame boundaries",()=>{
  for(const head of[[15,3],[9,5],[13,7]])for(const anchor of[{pivotX:15,foot:28},{pivotX:9,foot:25},{pivotX:22,foot:28}]){const f=fixture("walk",head,anchor),d=P.derive(f.pixels,f.original,40,40,"lancer",[f.frame]);for(const p of[d.frames[0].carriedSpear.tip,d.frames[0].carriedSpear.hand])assert(p[0]>=0&&p[0]<40&&p[1]>=0&&p[1]<40);}
});
test("protected fighter derivatives retain the pre-Lancer artwork",()=>{
  // Wizard's later approved bandolier has its own immediate-before comparison.
  for(const key of P.KEYS)if(key!=="lancer"&&key!=="gunman")for(const name of["idle","walk","attack1","hurt"]){const f=fixture(name),a=f.pixels.slice(),b=f.pixels.slice();P.derive(a,f.original,40,40,key,[f.frame]);before.derive(b,f.original,40,40,key,[f.frame]);assert.deepEqual(a,b,`${key}/${name}`);}
});
test("Lancer combat, snapshots and licensed artwork match the original checkpoint independently of neighboring UI edits",()=>{
  const source=execFileSync("git",["show","48a1352:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),g=createGame();
  for(const game of[old,g])game.rb.setup({characterKeys:["lancer","anchor"],seed:37});assert.deepEqual(JSON.parse(JSON.stringify(g.debug.fighters[0].data)),JSON.parse(JSON.stringify(old.debug.fighters[0].data)));
  for(let n=0;n<90;n++){const row=[{hasAim:true,aimX:1,aimY:-.1,punchHeld:n%39<9,dashHeld:n%31<4},{}];old.rb.step(row);g.rb.step(row);assert.equal(g.rb.hash(),old.rb.hash());}
  const hash=g.rb.hash();g.debug.gravity.draw(0);assert.equal(g.rb.hash(),hash);
  const art={window:{}};vm.runInNewContext(execFileSync("git",["show","48a1352:presentation-assets.js"],{encoding:"utf8"}),art);
  const set=art.window.DASH_PUNCH_ART.spriteSets[art.window.DASH_PUNCH_ART.assignments.lancer.spriteSet];
  for(const file of new Set(Object.values(set.clips).map(c=>c.src)))assert(fs.readFileSync(file).equals(execFileSync("git",["show",`48a1352:${file}`],{maxBuffer:8*1024*1024})),file);
});
