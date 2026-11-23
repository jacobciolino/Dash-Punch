"use strict";
const assert=require("node:assert/strict");
const {createGame}=require("./simulation-harness");
const game=createGame();
game.rb.setup({characterKeys:["orbit","runway"],seed:1});
const approx=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const [axis,sign,x,y] of [["y",1,0,1],["y",-1,0,-1],["x",1,1,0],["x",-1,-1,0]]) {
  game.debug.gravity.setDirection(axis,sign);
  const fighter=game.debug.fighters[0];
  fighter.face={x:1,y:0};
  fighter.angle=0.43;
  const frame=game.debug.gravity.renderFrame();
  approx(-Math.sin(frame.rotation),x);
  approx(Math.cos(frame.rotation),y);
  // Converting world aim into body space and back must preserve the original aim.
  approx(Math.cos(frame.rotation)*frame.localFace.x-Math.sin(frame.rotation)*frame.localFace.y,1);
  approx(Math.sin(frame.rotation)*frame.localFace.x+Math.cos(frame.rotation)*frame.localFace.y,0);
  const before=game.rb.hash();
  game.debug.gravity.draw(0);
  game.debug.gravity.draw(1);
  assert.equal(game.rb.hash(),before,"drawing changed authoritative combat state");
  assert.equal(fighter.angle,0.43,"gravity overwrote tumble rotation");
}
console.log(JSON.stringify({tests:"passed",fourGravityDirections:true,worldAimPreserved:true,renderDoesNotMutateSimulation:true}));
