"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness");
test("Rain water fist follows native attack direction, charge, flow and dissolution without state changes",()=>{
  const g=createGame();g.rb.setup({characterKeys:["rain","anchor"]});const f=g.debug.fighters[0];assert.equal(g.debug.waterFist.pose(0,{x:1,y:0}),null);g.debug.booster.punch(0,.5);const a=f.attack,hash=g.rb.hash();a.age=a.startup+.02;
  const before=g.rb.hash(),right=g.debug.waterFist.pose(0,{x:1,y:0},.5),left=g.debug.waterFist.pose(0,{x:-1,y:0},.5);assert.equal(right.pixel,3);assert(right.x>f.x&&left.x<f.x);assert.notEqual(right.angle,left.angle);assert.equal(right.charge,1);g.debug.gravity.draw(0);assert.equal(g.rb.hash(),before);
  a.age=a.startup+a.active+a.recovery*.8;assert(g.debug.waterFist.pose(0,a.dir).phase>=6);f.attack=null;f.punchVisual={age:.13,dir:{x:1,y:0},charge:1};assert(g.debug.waterFist.pose(0,{x:1,y:0}).phase>=6);assert(hash);
});
test("Rain gameplay and original Anchor assets exactly match the pre-visual checkpoint",()=>{
  const source=execFileSync("git",["show","e573367:game.js"],{encoding:"utf8"}),old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),now=createGame();for(const g of[old,now])g.rb.setup({characterKeys:["rain","anchor"],seed:371});assert.deepEqual(JSON.parse(JSON.stringify(now.debug.fighters.map(f=>f.data))),JSON.parse(JSON.stringify(old.debug.fighters.map(f=>f.data))));
  for(let n=0;n<150;n++){const row=[{hasAim:true,aimX:1,aimY:-.3,punchHeld:n%40<8,dashHeld:n%50<5},{}];old.rb.step(row);now.rb.step(row);now.debug.gravity.draw(0);assert.equal(now.rb.hash(),old.rb.hash());}assert.equal(now.sandbox.window.DASH_PUNCH_ART.spriteSets.seekerprofist.magicFist,old.sandbox.window.DASH_PUNCH_ART.spriteSets.seekerprofist.magicFist);
});
