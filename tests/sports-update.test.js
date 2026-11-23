"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const D=require("../dashball"),B=require("../sandbag"),S=require("../sports"),{createGame}=require("./simulation-harness");
let groups=0;const dt=1/60,check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);};
check("Battle is the default; explicit Court/Race preferences remain available",()=>{
  for(const arena of D.ARENAS)assert.equal(D.options({arena:arena.id}).ruleset,"battle");
  assert.equal(D.options({ruleset:"court"}).ruleset,"court");assert.equal(B.options().ruleset,"brawl");
  for(const ruleset of B.RULESETS)assert.equal(B.options({ruleset:ruleset.id}).ruleset,ruleset.id);
});
check("all sports use death clips and a visual health refill while actual health stays zero",()=>{
  for(const arena of [...D.ARENAS.map(a=>a.id),"brawl","scramble"]){
    const g=createGame(),api=["brawl","scramble"].includes(arena)?g.debug.sandbag:g.debug.dashball;
    api.setup(["brawl","scramble"].includes(arena)?{ruleset:arena}:{arena});
    const s=api.state,f=g.debug.fighters[0];api.knockout(0);
    assert.equal(f.health,0);assert(f.koCorpseGone);assert.equal(g.debug.sportsPresentation.death(0).animation.clip,"death");
    s.respawns[f.id]=s.config.respawn-.6;
    const animation=g.debug.sportsPresentation.death(0).animation;assert(animation.frame>0);
    s.respawns[f.id]=s.config.respawn/2;
    assert.equal(g.debug.sportsPresentation.respawn(0).fraction,.5);assert.equal(g.debug.sportsPresentation.death(0),null);
    const context=g.elements.get("game").getContext("2d"),labels=[],bars=[];
    context.fillText=(text)=>labels.push(text);context.fillRect=(...args)=>bars.push(args);
    const before=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),before);
    assert(labels.includes("RETURNING 8s"));assert(bars.some(([x,y,w,h])=>h===13&&w>40));assert.equal(f.health,0);
    s.respawns[f.id]=1/60;api.step();assert(!f.koScored);assert.equal(f.health,Math.round(f.data.maxHealth*.5));
    assert(f.invulnerable>1.9);assert.equal(g.debug.sportsPresentation.respawn(0),null);
  }
});
check("small individual KO markers replace screen banners without active bodies or sports points",()=>{
  const g=createGame();g.debug.dashball.setup({arena:"golden-rush",teamSize:5});
  const labels=[],ctx=g.elements.get("game").getContext("2d");ctx.fillText=t=>labels.push(t);
  for(let i=0;i<10;i++)g.debug.dashball.knockout(i);
  const hash=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),hash);
  assert.equal(labels.filter(t=>t.endsWith("ELIMINATED")).length,0);assert.equal(labels.filter(t=>t==="KO").length,10);
  for(const [i,f] of g.debug.fighters.entries()){const m=g.debug.sportsPresentation.marker(i);assert(m.w<=f.data.width&&m.h<=f.data.height);assert.equal(m.x+m.w/2,f.x);assert.equal(m.y+m.h/2,f.y);}
  assert(labels.some(t=>t.includes("P10")));assert(g.debug.fighters.every(f=>f.health===0&&f.koCorpseGone));
  const s=g.debug.dashball.state;s.ball.vx=500;const x=s.ball.x;
  for(let n=0;n<60;n++)g.debug.dashball.step();assert(s.elapsed>.9);assert(s.ball.x!==x);assert.equal(s.phase,"playing");assert.deepEqual([...s.scores],[0,0]);
});
check("bags in Race, Brawl and Scramble launch, fall quickly and keep score state",()=>{
  for(const ruleset of ["race","brawl","scramble"]){
    const g=createGame();g.debug.sandbag.setup({ruleset});const s=g.debug.sandbag.state,b=s.bags[0],initial=b.x;
    const a={id:871,dir:{x:1,y:-.6},charge:1,grounded:true,hitTargets:new (vm.runInContext("Set",g.sandbox))()};
    assert(g.debug.sandbag.hit(0,a));assert(!b.anchored);assert(b.vx>0);assert(b.vy<0);const damage=b.damage;
    for(let n=0;n<30;n++)g.debug.sandbag.bagStep();assert(b.x>initial);assert.equal(b.damage,damage);
    assert.equal(s.config.mass,2);assert.equal(s.config.gravity,1800);
    if(ruleset==="race"){Object.assign(b,{x:1199,vx:1000});g.debug.sandbag.bagStep();assert(b.x+b.w/2<=1200);assert(b.vx<=0);}
  }
});
function fixture(arena,platformVelocity=0){
  const stage=D.arena(arena),state=D.create({arena},stage);
  let elapsed=0;
  const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,random:()=>.5,
    terrain:alpha=>[{x:900,y:800+platformVelocity*(elapsed-dt+alpha*dt),w:600,h:24,kind:"oneway",vy:platformVelocity}],body:()=>{},kicking:()=>false};
  return {state,world,tick(n){for(let i=0;i<n;i++){elapsed+=dt;D.step(state,dt,world);}}};
}
check("every ball crosses one-way undersides and lands from above, including moving platforms",()=>{
  for(const arena of D.ARENAS.map(a=>a.id))for(const vy of [-150,0,150]){
    for(const downward of [false,true]){
      if(arena==="total-rush"){
        // Isolate platform filtering from the new intentional ball/giant impacts.
        for(let index=0;index<4;index++){
          const f=fixture(arena,vy),all=D.balls(f.state),b=all[index],large=D.isBoulderBall(f.state,b),steps=large&&!downward?40:5;if(large)f.state.config.maxSpeed=1400;
          all.forEach((other,i)=>Object.assign(other,{x:2200+i*200,y:1500,vx:0,vy:0}));
          Object.assign(b,{x:1050,y:large?(downward?800-b.r-30:800+b.r+55):downward?750:860,vx:0,vy:downward?1500:-1500});f.tick(steps);
          assert(downward?b.vy<0:b.vy<(large?-700:-1300),`${arena} ${index} ${vy} ${downward}: ${b.vy}`);assert(b.y+b.r<800+vy*steps*dt+1);
        }
        continue;
      }
      const f=fixture(arena,vy),balls=D.balls(f.state);
      const large=Boolean(f.state.boulder),steps=large&&!downward?40:5;if(large)f.state.config.maxSpeed=1400;
      // The original small-ball fixture would start a 540-unit boulder already
      // embedded in the platform. Keep every older arena's exact setup intact.
      balls.forEach((b,i)=>Object.assign(b,{x:1000+i*50,y:large?(downward?800-b.r-30:800+b.r+55):downward?750:860,vx:0,vy:downward?1500:-1500}));
      f.tick(steps);
      for(const b of balls){assert(downward?b.vy<0:b.vy<(large?-700:-1300),`${arena} ${vy} ${downward}: ${b.vy}`);assert(b.y+b.r<800+vy*steps*dt+1);}
    }
  }
});
check("Golden Rush wraps at both sides, retains its roof and has 1/3/5 rings and 48HP/15-point target",()=>{
  const stage=D.arena("golden-rush"),s=D.create({arena:"golden-rush"},stage);
  assert(stage.wrap);assert(!stage.terrain.some(t=>t.kind==="wall"&&t.h===stage.height));
  assert(stage.terrain.some(t=>t.y===0&&t.w===stage.width));assert.deepEqual(stage.rings.slice(0,3).map(r=>r.points),[1,3,5]);
  assert.equal(s.golden.maxHealth,48);assert.equal(s.config.goldenReward,15);
  const world={stage,fighters:[],attacks:()=>[],attackTouches:()=>false,terrain:()=>stage.terrain.concat(stage.ballOnly),kicking:()=>false};
  for(const sign of [-1,1]){const b=s.ball;Object.assign(b,{x:sign>0?2799:1,y:400,vx:sign*1500,vy:0});D.step(s,dt,world);assert(sign>0?b.x<40:b.x>2760);}
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,upper=0;
  for(let i=0;i<10800;i++){D.clock(s,dt,stage);D.step(s,dt,world);const g=s.golden;minX=Math.min(minX,g.x);maxX=Math.max(maxX,g.x);minY=Math.min(minY,g.y);maxY=Math.max(maxY,g.y);if(g.y<stage.height/2)upper++;}
  assert(maxX-minX>2200);assert(maxY-minY>1400);assert(upper/10800>.7);console.log({patrolX:maxX-minX,patrolY:maxY-minY,upperFraction:upper/10800});
});
check("no Showcase code remains; red ball is a tiny authored sprite",()=>{
  assert(!/\b(?:startShowcase|readShowcaseInput|SHOWCASE_SCENES)\b|showcase\./.test(fs.readFileSync("game.js","utf8")));
  const png=fs.readFileSync("assets/dashball/rush-ball.png");assert.equal(png.readUInt32BE(16),16);assert.equal(png.readUInt32BE(20),16);assert(png.length<1000);
  assert.equal(S.respawnProgress(null,"p1"),null);
});
console.log(`${groups} sports update groups passed`);
