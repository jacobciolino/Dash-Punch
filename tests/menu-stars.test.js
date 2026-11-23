"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{test}=require("node:test"),Stars=require("../menu-stars"),{createGame}=require("./simulation-harness");
test("the capped pool has varied directions/colors, private reproducible randomness and short fast trails",()=>{
  const a=Stars.create({seed:123}),b=Stars.create({seed:123});for(const field of[a,b])field.resize(960,540);assert.equal(a.stats.count,72);
  assert(new Set(a.snapshot().map(p=>Math.sign(p.dx)+":"+Math.sign(p.dy))).size===4);assert(new Set(a.snapshot().map(p=>p.color)).size>=4);
  for(let i=0;i<120;i++){a.update(1/60);b.update(1/60);}assert.deepEqual(a.snapshot(),b.snapshot());assert(a.snapshot().some(p=>p.age>=p.streakAt));
  for(let i=0;i<3000;i++)a.update(1/60);assert.equal(a.stats.count,72);assert(a.snapshot().every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test("hidden/reduced-motion menus do not advance particles, and a long interruption cannot cause a spawn storm",()=>{
  const field=Stars.create();field.resize(640,360);const before=field.snapshot();field.update(10,{visible:false});field.update(10,{reducedMotion:true});assert.deepEqual(field.snapshot(),before);
  field.update(100);assert(field.snapshot().every(p=>p.age<=.05));assert(field.stats.count<=Stars.LIMIT);field.resize(200,200);assert.equal(field.stats.count,16);
});
test("stars and trails are integer-aligned pixels on black, with explicit text/portrait exclusions",()=>{
  const field=Stars.create();field.resize(640,360);for(let n=0;n<120;n++)field.update(1/60);
  const rects=[],paint={save(){},restore(){},fillRect(...args){rects.push({args,color:this.fillStyle,alpha:this.globalAlpha});}};
  field.draw(paint,[{x:20,y:30,w:70,h:40}]);assert.deepEqual(rects[0].args,[0,0,640,360]);assert.equal(rects[0].color,"#000");assert.deepEqual(rects.at(-1).args,[17,27,76,46]);
  assert(rects.every(r=>r.args.every(Number.isInteger)));assert(rects.some(r=>r.args[2]===1&&r.args[3]===1&&r.alpha<.5));assert.equal(paint.imageSmoothingEnabled,false);
});
test("menu animation never changes combat state, gameplay RNG or historical dash particles",()=>{
  const g=createGame(),before=g.rb.hash(),field=Stars.create();field.resize(640,360);for(let n=0;n<500;n++)field.update(1/60);assert.equal(g.rb.hash(),before);
  const source=fs.readFileSync("game.js","utf8"),old=require("node:child_process").execFileSync("git",["show","89960d5:game.js"],{encoding:"utf8"});
  const burst=s=>s.slice(s.indexOf("  function burst("),s.indexOf("  function sparkText("));assert.equal(burst(source),burst(old));
  assert(fs.readFileSync("index.html","utf8").includes('src="menu-stars.js"'));assert(fs.readFileSync("tools/build-core-release.cjs","utf8").includes('["menu-stars.js"'));
  assert(fs.readFileSync("server.js","utf8").includes('["/menu-stars.js", "menu-stars.js"]'));
});
