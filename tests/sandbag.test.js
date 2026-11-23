"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),S=require("../sandbag"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,neutral=R.decode(R.neutral());let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function setup(config={},characters=["orbit","spike"]){const g=createGame();g.debug.sandbag.setup(config,{characters});return g;}
function attack(g,i=0,charge=0,dir={x:1,y:0}){
  const SetType=vm.runInContext("Set",g.sandbox),id=10000+g.debug.sandbag.state.eventSerial;
  return {id,dir,charge,grounded:true,age:.1,startup:0,active:1,recovery:.1,total:1.2,hitTargets:new SetType(),clashed:false};
}
function place(g,i,bagIndex=0){const f=g.debug.fighters[i],b=g.debug.sandbag.state.bags[bagIndex];Object.assign(f,{x:b.x-100,y:b.y,prevX:b.x-100,prevY:b.y,onGround:false,vx:0,vy:0,hitstop:0});return f;}
check("options, symmetric arenas, 90-second default and bounded settings",()=>{
  assert.equal(S.options().duration,90);assert.equal(S.options({teamSize:99}).teamSize,5);assert.equal(S.options({ruleset:"bad"}).ruleset,"brawl");
  for(const ruleset of ["race","brawl","scramble"]){const a=S.arena(ruleset==="scramble"),s=S.create({ruleset},a);assert.equal(s.bags.length,ruleset==="scramble"?1:2);assert(s.bags.every(b=>b.y+b.h/2===a.floorY));assert.equal(s.scores[0],0);}
});
check("assigned team damage, exact native charge/ground/Fired Up modifiers, no combo staling",()=>{
  const g=setup(),[f,t]=g.debug.fighters,s=g.debug.sandbag.state,hp=t.health;f.firedUpHealth=40;f.comboHits=30;
  const a=attack(g,0,1),expected=Math.max(1,Math.round(f.data.punchDamage*1.8*f.data.groundPunchDamageMult*1.25));
  f.attack=a;assert(g.debug.sandbag.hit(0,a));assert.equal(s.scores[0],expected);assert.equal(s.bags[0].damage,expected);assert.equal(f.attack,null);assert.equal(t.health,hp);
  assert(!g.debug.sandbag.hit(1,attack(g,1),0));assert(g.debug.sandbag.hit(1,attack(g,1),1));assert(s.scores[1]>0);
  assert.deepEqual(Object.keys(s.events[0]).sort(),["serial","tick","attacker","team","damage","bag","kick","electric"].sort());
});
check("active hit volumes self-cancel once, refill, and never repeatedly score",()=>{
  const g=setup(),f=place(g,0),a=attack(g);f.airDashes=0;f.punchLockout=.5;f.attack=a;
  g.debug.sandbag.bagStep();const points=g.debug.sandbag.state.scores[0];assert(points>0);assert.equal(f.attack,null);assert.equal(f.airDashes,f.data.maxAirDashes);assert.equal(f.punchLockout,0);
  for(let n=0;n<30;n++)g.debug.sandbag.bagStep();assert.equal(g.debug.sandbag.state.scores[0],points);assert(!g.debug.sandbag.hit(0,a));
});
check("Race forbids all fighter interactions, constrains whole bodies and prevents eliminations",()=>{
  const g=setup({ruleset:"race"}),[a,b]=g.debug.fighters,s=g.debug.sandbag.state;
  assert(!g.debug.sandbag.canAffect(0,1));a.x=1600;b.x=800;S.constrain(s,a,g.debug.sandbag.arena);S.constrain(s,b,g.debug.sandbag.arena);
  assert(a.x+a.data.width/2<=1200);assert(b.x-b.data.width/2>=1200);
  const hp=a.health;g.debug.firedUp.damage(0,7);assert.equal(a.health,hp-7);g.debug.sandbag.knockout(0);assert(!a.koScored);assert(a.health>0);assert.equal(Object.keys(s.respawns).length,0);
});
check("Brawl PvP, friendly fire, reduced health and protected respawns retain scores",()=>{
  const g=setup({ruleset:"brawl",teamSize:2,respawn:10,friendlyFire:false}),s=g.debug.sandbag.state,[a,b]=g.debug.fighters;
  assert(g.debug.sandbag.canAffect(0,1));assert(!g.debug.sandbag.canAffect(0,2));s.config.friendlyFire=true;assert(g.debug.sandbag.canAffect(0,2));
  assert.equal(a.health,Math.round(a.data.maxHealth*.5));s.scores[0]=123;g.debug.sandbag.knockout(0);assert(a.koScored);assert.equal(s.respawns[a.id],10);
  for(let n=0;n<601;n++)g.debug.sandbag.step();assert(!a.koScored);assert(a.invulnerable>0);assert(a.dashballSpawnProtected);assert(!g.debug.sandbag.canAffect(0,1));assert.equal(s.scores[0],123);
  assert.equal(a.health,Math.round(a.data.maxHealth*.5));assert(a.x<1200);assert(!b.koScored);
});
check("all bags are heavy but movable; Scramble shares damage and attributes each team",()=>{
  for(const ruleset of ["race","brawl"]){const g=setup({ruleset}),b=g.debug.sandbag.state.bags[0],initial=b.x;assert(!b.anchored);g.debug.sandbag.hit(0,attack(g,0,1));for(let n=0;n<30;n++)g.debug.sandbag.bagStep();assert(b.x>initial);assert(Math.abs(b.y+b.h/2-1160)<.01);}
  const g=setup({ruleset:"scramble"}),s=g.debug.sandbag.state,b=s.bags[0];g.debug.sandbag.hit(0,attack(g));g.debug.sandbag.hit(1,attack(g,1));assert.equal(b.damage,s.scores[0]+s.scores[1]);assert(s.scores.every(n=>n>0));assert(Math.hypot(b.vx,b.vy)>0);
});
check("damage and launch force are independent and velocity is bounded",()=>{
  const samples=[];
  for(const damage of [1,100]){const g=setup({ruleset:"scramble"}),f=g.debug.fighters[0],a=attack(g);a.projectile={damage,knockback:700,radius:10};g.debug.sandbag.hit(0,a);samples.push({points:g.debug.sandbag.state.scores[0],vx:g.debug.sandbag.state.bags[0].vx,vy:g.debug.sandbag.state.bags[0].vy});}
  assert(samples[1].points>samples[0].points*50);assert.equal(samples[0].vx,samples[1].vx);assert.equal(samples[0].vy,samples[1].vy);
  const g=setup({ruleset:"scramble"}),s=g.debug.sandbag.state,b=s.bags[0];Object.assign(b,{vx:1e9,vy:-1e9});
  for(let n=0;n<900;n++){g.debug.sandbag.bagStep();assert(Number.isFinite(b.x));assert(b.x>=24+b.w/2&&b.x<=2400-24-b.w/2);assert(b.y>=24+b.h/2&&b.y<=1160-b.h/2);assert(Math.hypot(b.vx,b.vy)<=s.config.maxSpeed+.01);}
});
check("projectile sweep catches fast shots and respects per-attack registration",()=>{
  const g=setup({},["gunman","archer"]),s=g.debug.sandbag.state,b=s.bags[0],a=attack(g);a.projectile={damage:9,knockback:900,radius:12};
  const paths=[{x1:b.x-500,y1:b.y,x2:b.x+500,y2:b.y}];assert(g.debug.sandbag.projectile(0,a,paths));const points=s.scores[0];assert(points>0);assert(!g.debug.sandbag.projectile(0,a,paths));assert.equal(s.scores[0],points);
});
check("production projectile processing consumes shots on bags and native Kickoffs restore one air dash",()=>{
  const g=setup({},["gunman","orbit"]),f=g.debug.fighters[0],b=g.debug.sandbag.state.bags[0],a=attack(g);
  a.projectile={x:b.x-150,y:b.y,radius:12,speed:20000,damage:9,knockback:700,spawned:true};f.projectiles=[a];
  g.debug.sandbag.step();assert(g.debug.sandbag.state.scores[0]>0);assert.equal(f.projectiles.length,0);
  const k=setup(),p=k.debug.fighters[0],bag=k.debug.sandbag.state.bags[0];Object.assign(p,{x:bag.x-90,y:bag.y,prevX:bag.x-90,prevY:bag.y,onGround:false});
  const full=p.airDashes;k.debug.gravity.dash(0,{x:1,y:0},0);assert.equal(p.airDashes,full-1);for(let n=0;n<8;n++)k.debug.sandbag.step();
  assert.equal(k.debug.sandbag.state.events.length,1);assert(k.debug.sandbag.state.events[0].kick);assert.equal(p.airDashes,full);assert(p.dashReboundLockout>0);
});
check("Micro USB delivers exactly initial hit plus three native quarter-damage pulses",()=>{
  const g=setup({},["microusb","orbit"]),f=g.debug.fighters[0],s=g.debug.sandbag.state,a=attack(g);g.debug.sandbag.hit(0,a);
  const base=s.scores[0],expected=g.debug.sandbag.world(0).attackDamage(f,{...a,electricTick:true},false);f.hitstop=0;
  for(let n=0;n<90;n++){f.hitstop=0;g.debug.sandbag.bagStep();}
  assert.equal(s.events.length,4);assert.equal(s.scores[0],base+expected*3);assert.equal(s.bags[0].electricLatch,null);assert(s.events.slice(1).every(e=>e.electric));
});
check("automatic sword follow-up and each Edgebert input stage retain separate hit IDs",()=>{
  const sword=setup({},["swordkun","orbit"]),f=place(sword,0);f.attack=attack(sword);sword.debug.sandbag.bagStep();assert(f.attack?.swordPhase);f.attack.age=f.attack.startup+.001;sword.debug.sandbag.bagStep();assert.equal(sword.debug.sandbag.state.events.length,2);
  const g=setup({},["edgebert","orbit"]),p=place(g,0);
  for(let stage=0;stage<3;stage++){const a=attack(g);a.sequenceStage=stage;p.attack=a;assert(g.debug.sandbag.hit(0,a));}
  assert.equal(g.debug.sandbag.state.events.length,3);assert(g.debug.sandbag.state.events[2].damage>g.debug.sandbag.state.events[0].damage);
});
check("deterioration thresholds, unbounded damage, relative meters and visuals are simulation-independent",()=>{
  const g=setup(),s=g.debug.sandbag.state,b=s.bags[0];
  for(const [damage,condition] of [[0,0],[120,1],[450,2],[1000,3],[2200,4],[100000,4]]){b.damage=damage;assert.equal(S.condition(b,s.config),condition);}
  s.scores=[12000,8000];assert.deepEqual(S.shares(s),[.6,.4]);assert(g.debug.sandbag.hit(0,attack(g)));assert(b.damage>100000);
  const hash=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),hash);
});
check("loaded countdown freezes play, timer declares leader, tie next-hit overtime and rematch resets",()=>{
  const g=setup(),s=g.debug.sandbag.state;s.phase="countdown";s.pause=3;const x=g.debug.fighters[0].x;
  for(let n=0;n<179;n++)g.debug.sandbag.step();assert.equal(s.remaining,90);assert.equal(g.debug.fighters[0].x,x);assert(!g.debug.sandbag.hit(0,attack(g)));
  g.debug.sandbag.step();s.remaining=.001;s.scores=[12,11];g.debug.sandbag.step();assert.equal(s.phase,"finished");assert.equal(s.winner,0);
  g.debug.sandbag.setup({});const next=g.debug.sandbag.state;next.remaining=.001;next.scores=[7,7];g.debug.sandbag.step();assert(next.overtime);assert.equal(next.phase,"playing");assert(g.debug.sandbag.hit(1,attack(g,1),1));assert.equal(next.winner,1);assert(next.scores[1]>7);
  g.debug.sandbag.setup({});assert(g.debug.sandbag.state.scores.every(n=>n===0));assert(g.debug.sandbag.state.bags.every(b=>S.condition(b)===0));
});
check("seeded replay, save/restore and 6-frame rollback restore scores, bag motion, pulses and attack IDs",()=>{
  for(const ruleset of ["race","brawl","scramble"]){
    const a=setup({ruleset}),b=setup({ruleset});for(const g of [a,b]){
      const bags=g.debug.sandbag.state.bags;
      g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:(bags[i]||bags[0]).x+(i?100:-100),y:1076,prevX:(bags[i]||bags[0]).x+(i?100:-100),prevY:1076,onGround:false}));
    }
    const initial=a.rb.save(),manager=b.rb.manager(0,8),pending=[],frames=[];
    for(let i=0;i<400;i++){
      const local=R.encode({hasAim:true,aimX:1,aimY:-.2,punchHeld:i%24<4}),remote=R.encode({hasAim:true,aimX:-1,aimY:-.2,punchHeld:i%31<5});
      const input=[local,remote].map(R.decode);frames.push(input);pending.push({frame:i,input:remote});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(local));a.rb.step(input);
    }
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),ruleset);assert(manager.rollbacks>0);
    assert(a.debug.sandbag.state.eventSerial>0);const final=a.rb.hash();a.rb.restore(initial);for(const input of frames)a.rb.step(input);assert.equal(a.rb.hash(),final);
  }
});
check("authoritative snapshots restore bag scoring/physics/latches, team rules and respawn state",()=>{
  const host=setup({ruleset:"scramble",teamSize:2,friendlyFire:false},["microusb","orbit"]),s=host.debug.sandbag.state;
  host.debug.sandbag.hit(0,attack(host));host.debug.sandbag.knockout(1);const snapshot=host.debug.online.createSnapshot(),guest=createGame();
  guest.debug.online.installSnapshot(snapshot);assert.deepEqual(JSON.parse(JSON.stringify(guest.debug.sandbag.state)),JSON.parse(JSON.stringify(s)));
  assert(!guest.debug.sandbag.canAffect(0,2));assert.equal(guest.debug.fighters.length,4);assert(guest.debug.fighters[1].koScored);
});
check("all three rulesets support ten CPUs and both teams score",()=>{
  for(const ruleset of ["race","brawl","scramble"]){const g=setup({ruleset,teamSize:5});g.debug.sandbag.setup({ruleset,teamSize:5},{ai:true,characters:["orbit","spike","edgebert","microusb","gunman","chungus","rain","archer","anchor","whipado"]});
    for(let n=0;n<1800;n++)g.debug.sandbag.step();const s=g.debug.sandbag.state;assert.equal(g.debug.fighters.length,10);assert(s.scores.every(n=>n>0),`${ruleset}: ${s.scores}`);assert(g.debug.fighters.every(f=>Number.isFinite(f.x)&&Number.isFinite(f.y)));console.log(JSON.stringify({ruleset,ai30sScores:s.scores,events:s.eventSerial}));}
});
console.log(`${groups} Sandbag Showdown groups passed`);
