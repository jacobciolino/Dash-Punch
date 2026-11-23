"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{createGame}=require("./simulation-harness");
const source=require("node:fs").readFileSync("game.js","utf8").replaceAll("get arena(){return cloneOnlineValue(currentStage());}","get arena(){return currentStage();}");
// Only the debug arena getter is mutable here, so fixtures can install solid obstacles.
function setup(dir={x:1,y:0},size=1){const g=createGame(process.cwd(),{sourceOverrides:{"game.js":source}});g.debug.dashball.setup({arena:"standard",ruleset:"battle",teamSize:size},{characters:["lancer","anchor"],seed:73});for(const[i,f]of g.debug.fighters.entries())Object.assign(f,{x:i?1500+i*90:500,y:600,prevX:i?1500+i*90:500,prevY:600,vx:0,vy:0,onGround:false,invulnerable:0});g.debug.booster.punch(0,0,dir);const a=g.debug.fighters[0].attack;a.age=a.startup+g.debug.lancer.pose().thrust+.3;return g;}
function place(g,index,x,y,previous={x,y}){const f=g.debug.fighters[index];Object.assign(f,{x,y,prevX:previous.x,prevY:previous.y,vx:0,vy:0,onGround:false,hitstun:0,hitstop:0,health:1000,wallContactGrace:0});return f;}
const body=f=>({x:f.x-f.data.width/2,y:f.y-f.data.height/2,w:f.data.width,h:f.data.height});
function overlap(a,b){return Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+.1&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+.1;}
test("open-space contacts separate to their entry side for horizontal, vertical and diagonal lances",()=>{
  for(const dir of[{x:1,y:0},{x:0,y:-1},{x:.6,y:-.8}])for(const side of[-1,1]){const g=setup(dir),d=g.debug,p=d.lancer.pose(),n={x:-p.dir.y,y:p.dir.x};const t=place(g,1,p.x+p.dir.x*220+n.x*side*10,p.y+p.dir.y*220+n.y*side*10);d.resolveTerrain(1,0);const across=(t.x-p.x)*n.x+(t.y-p.y)*n.y;assert.equal(Math.sign(across),side);const extent=(Math.abs(n.x)*t.data.width+Math.abs(n.y)*t.data.height)/2;assert(across*side>=extent+p.halfWidth-.02);assert.equal(t.health,1000);}
});
test("a blocked preferred side uses the clear opposite side instead of pushing through a ceiling",()=>{
  const g=setup(),d=g.debug,p=d.lancer.pose(),ceiling={x:p.x+100,y:500,w:250,h:80,kind:"platform"};d.dashball.arena.terrain.push(ceiling);
  const t=place(g,1,p.x+220,p.y-20,{x:p.x+220,y:p.y-30});d.resolveTerrain(1,0);assert(t.y>p.y);assert(!overlap(body(t),ceiling));assert.equal(t.health,1000);
});
test("a vertical lance deflects away from a nearby wall rather than embedding a fighter in it",()=>{
  const g=setup({x:0,y:-1}),d=g.debug,p=d.lancer.pose(),wall={x:p.x+20,y:p.y-350,w:24,h:300,kind:"wall"};d.dashball.arena.terrain.push(wall);
  const t=place(g,1,p.x+15,p.y-200);d.resolveTerrain(1,0);assert(t.x<p.x);assert(!overlap(body(t),wall));
});
test("separation does not force through another fighter",()=>{
  const g=setup(undefined,2),d=g.debug,p=d.lancer.pose(),blocker=place(g,2,p.x+220,p.y-65),before=[blocker.x,blocker.y];
  const t=place(g,1,p.x+220,p.y-10);d.resolveTerrain(1,0);assert(t.y>p.y);assert(!overlap(body(t),body(blocker)));assert.deepEqual([blocker.x,blocker.y],before);
});
test("a genuine floor/ceiling pin is stable, causes no repeated damage and releases when the lance retracts",()=>{
  const g=setup(),d=g.debug,p=d.lancer.pose(),floor={x:p.x+70,y:650,w:320,h:30,kind:"floor"},roof={x:p.x+70,y:520,w:320,h:40,kind:"platform"};d.dashball.arena.terrain.push(floor,roof);
  const t=place(g,1,p.x+220,610),positions=[];for(let n=0;n<60;n++){d.gravity.physics(1);d.handleHits();positions.push(t.y);assert(!overlap(body(t),floor));assert(!overlap(body(t),roof));assert.equal(t.health,1000);assert([t.x,t.y,t.vx,t.vy].every(Number.isFinite));}
  const settled=positions.slice(5);assert(Math.max(...settled)-Math.min(...settled)<.1);d.fighters[0].attack=null;d.resolveTerrain(1,0);assert.equal(d.lancer.surfaces(1).length,0);t.vx=100;const x=t.x;d.gravity.physics(1);assert(t.x>x);
});
test("tip, shaft and haft each damage a fighter at most once per attack, regardless of repeated entry",()=>{
  for(const along of[40,220,null]){const g=setup(),d=g.debug,f=d.fighters[0],a=f.attack;a.age=a.startup+d.lancer.pose().thrust+.05;const p=d.lancer.pose(),t=place(g,1,p.x+(along??p.length-5),p.y);d.handleHits();const hp=t.health;assert(hp<1000);for(let n=0;n<15;n++){t.y+=150;d.updateAttack(0,0);Object.assign(t,{y:p.y,hitstun:0,hitstop:0});d.handleHits();assert.equal(t.health,hp);}assert(a.hitTargets.has(t.id));}
});
test("simultaneous contacts retain distinct per-fighter hit records without physical contact damage",()=>{
  const g=setup(undefined,2),d=g.debug,f=d.fighters[0],a=f.attack;a.age=a.startup+d.lancer.pose().thrust+.05;const p=d.lancer.pose();
  for(const[i,t]of d.fighters.entries())if(i)place(g,i,p.x+100*i,p.y);d.handleHits();assert.equal(a.hitTargets.size,3);const hp=d.fighters.map(t=>t.health);
  for(let n=0;n<20;n++){for(let i=1;i<4;i++)d.resolveTerrain(i,0);d.handleHits();}assert.deepEqual(d.fighters.map(t=>t.health),hp);
});
test("blocked-side separation, pins and per-attack records restore to exactly the same state",()=>{
  const g=setup(),d=g.debug,p=d.lancer.pose();d.dashball.arena.terrain.push({x:p.x+100,y:500,w:250,h:80,kind:"platform"});place(g,1,p.x+220,p.y-20);const saved=g.rb.save();
  function run(){for(let n=0;n<20;n++)d.gravity.physics(1);return g.rb.hash();}const hash=run();g.rb.restore(saved);assert.equal(run(),hash);
});
