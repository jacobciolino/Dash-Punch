"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process"),{createGame}=require("./simulation-harness");
function setup(){const g=createGame();g.rb.setup({characterKeys:["anchor","rain"],seed:118});return g;}
function capture(g,kind,time=.2){
  const calls=[],stack=[],paint={globalAlpha:1,fillStyle:"",save(){stack.push([this.globalAlpha,this.fillStyle]);},restore(){[this.globalAlpha,this.fillStyle]=stack.pop();},translate(x,y){calls.push({translate:[x,y]});},rotate(angle){calls.push({rotate:angle});},fillRect(...rect){calls.push({rect,color:this.fillStyle,alpha:this.globalAlpha});}};
  g.debug.statusAuras.draw(0,kind,time,paint);assert.equal(paint.globalAlpha,1);return calls;
}
test("Boosted streaks rise; Lamed purple streaks fall on a crisp three-unit grid",()=>{
  const g=setup();g.debug.booster.apply(0,1);g.debug.lamer.apply(0);
  for(const[kind,color,sign]of[["boosted","#efffb7",-1],["lamed","#d8a6ff",1]]){
    const a=capture(g,kind),b=capture(g,kind,.25),core=a.filter(x=>x.color===color),next=b.filter(x=>x.color===color);
    assert.equal(core.length,8);assert(Math.sign(next[0].rect[1]-core[0].rect[1])===sign);
    for(const c of a.filter(x=>x.rect)){assert(c.rect.every(n=>Number.isInteger(n/3)));assert(c.alpha>=0&&c.alpha<=1);}
    assert(core.every(c=>c.rect[2]===3));assert.deepEqual(a,capture(g,kind));
  }
});
test("auras independently follow active effects and disappear for expired effects, KO and death",()=>{
  const g=setup(),f=g.debug.fighters[0];assert.equal(capture(g,"boosted").length,0);assert.equal(capture(g,"lamed").length,0);
  g.debug.booster.apply(0,.5);assert(capture(g,"boosted").length);assert.equal(capture(g,"lamed").length,0);
  g.debug.lamer.apply(0);assert(capture(g,"lamed").length);g.debug.booster.tick(0,9);assert.equal(capture(g,"boosted").length,0);assert(capture(g,"lamed").length);
  g.debug.lamer.tick(0,5);assert.equal(capture(g,"lamed").length,0);
  g.debug.booster.apply(0,1);g.debug.lamer.apply(0);for(const state of[{koScored:true},{koScored:false,health:0}]){Object.assign(f,state);assert.equal(capture(g,"boosted").length,0);assert.equal(capture(g,"lamed").length,0);}
});
test("gravity-relative effects preserve state, RNG, resources and snapshot hashes",()=>{
  const g=setup();g.debug.booster.apply(0,.7);for(let n=0;n<3;n++)g.debug.lamer.apply(0);
  for(const[axis,sign]of[["y",1],["y",-1],["x",1],["x",-1]]){
    g.debug.gravity.setDirection(axis,sign);const before=g.rb.hash(),snapshot=JSON.stringify(g.rb.save());
    for(let n=0;n<200;n++){for(const kind of["boosted","lamed"]){const calls=capture(g,kind,n/60);assert.equal(calls[1].rotate,g.debug.gravity.renderFrame().rotation);}}
    assert.equal(g.rb.hash(),before);assert.equal(JSON.stringify(g.rb.save()),snapshot);
  }
});
test("active combined statuses and their expiration simulate exactly like the pre-change version",()=>{
  const previous=execFileSync("git",["show","1969940:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024});
  const a=createGame(process.cwd(),{sourceOverrides:{"game.js":previous}}),b=createGame();
  for(const arena of[null,"dash-pong"]){for(const g of[a,b]){if(arena)g.debug.dashball.setup({arena,teamSize:1,ruleset:"battle"},{characters:["booster","lamer"],ai:false,seed:118});else g.rb.setup({characterKeys:["booster","lamer"],seed:118});g.debug.matchFlow.begin({countdown:false});g.debug.booster.apply(0,.3);g.debug.lamer.apply(0);g.debug.lamer.apply(0);}
    for(let n=0;n<240;n++){const row=[{hasAim:true,aimX:1,aimY:-.2,punchHeld:n%53<3,dashHeld:n%79<4},{}];a.rb.step(row);b.rb.step(row);capture(b,"boosted",n/60);capture(b,"lamed",n/60);assert.equal(a.rb.hash(),b.rb.hash(),`${arena}/${n}`);}
    const saved=b.rb.save(),hash=b.rb.hash();b.rb.restore(saved);assert.equal(b.rb.hash(),hash);
  }
});
