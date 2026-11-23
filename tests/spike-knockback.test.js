"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const source=fs.readFileSync("game.js","utf8"),original=source.replace("fighterPunchKnockbackScale:.75,",""),plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function pose(f,x=450,y=-5000){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,hitstop:0,hitstun:0,invulnerable:0,comboHits:0,dashParry:0,shieldReleaseParry:0});}
function setup({before=false,characters=["spike","anchor"],arena}={}){const g=createGame(process.cwd(),{sourceOverrides:{"game.js":before?original:source}});if(arena)g.debug.dashball.setup({arena},{characters,ai:false,seed:602});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:characters,seed:602});g.debug.fighters.forEach((f,i)=>pose(f,450+i*75));return g;}
function punch(g,charge=0,dir={x:1,y:0}){g.debug.booster.punch(0,charge,dir);const a=g.debug.fighters[0].attack;a.age=a.startup+.01;return a;}
function result(g){return plain(g.debug.fighters.map(f=>Object.fromEntries(["x","y","vx","vy","health","hitstun","shieldHealth","punchBlockstun","stunType","airDashes"].map(key=>[key,f[key]]))));}
function guard(f){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchHoldTimer:.3,punchAim:{x:-1,y:0}});}
test("only Spike's fighter-only punch scale changes; shared 760 base and all other configuration stay intact",()=>{
  assert.notEqual(source,original);const a=setup(),b=setup({before:true}),current=plain(a.debug.fighters[0].data),old=plain(b.debug.fighters[0].data);
  assert.equal(current.punchKnockback,760);assert.equal(current.fighterPunchKnockbackScale,.75);delete current.fighterPunchKnockbackScale;assert.deepEqual(current,old);assert.deepEqual(plain(a.debug.fighters[1].data),plain(b.debug.fighters[1].data));
  near(old.punchKnockback*.75,570);near(old.punchKnockback*1.9*.75,1083);
});
test("tap through full charge yields exactly 75% resolved fighter launch, with unchanged damage and hitstun",()=>{
  for(let n=0;n<=10;n++)for(const grounded of[false,true])for(const momentum of[false,true]){
    const results=[];for(const before of[true,false]){const g=setup({before}),[a,t]=g.debug.fighters;if(momentum){a.vx=400;a.vy=-180;}a.onGround=grounded;t.onGround=grounded;punch(g,n/10);g.debug.resolveHit(0,1);results.push(result(g));}
    const[old,now]=results;near(now[1].vx,old[1].vx*.75);near(now[1].vy,old[1].vy*.75);assert.equal(now[1].health,old[1].health);near(now[1].hitstun,old[1].hitstun);assert.deepEqual(now[0],old[0]);
  }
});
test("combo launch modifiers and heavyweight resistance preserve the 25% reduction",()=>{
  for(const target of["anchor","boomerangus"])for(const charge of[0,.5,1]){const rows=[];for(const before of[true,false]){const g=setup({before,characters:["spike",target]}),t=g.debug.fighters[1];t.comboHits=2;t.hitstun=.2;t.comboGrace=.3;punch(g,charge,{x:.8,y:-.6});g.debug.resolveHit(0,1);rows.push({x:t.vx,y:t.vy});}near(rows[1].x,rows[0].x*.75);near(rows[1].y,rows[0].y*.75);}
});
test("Spike's outgoing shield recoil, chip, shield damage and shield-break launches are unchanged",()=>{
  for(const charge of[0,.25,.5,.75,1])for(const broken of[false,true]){const rows=[];for(const before of[true,false]){const g=setup({before}),t=g.debug.fighters[1];guard(t);if(broken)t.shieldHealth=1;punch(g,charge);g.debug.resolveHit(0,1);assert(t.punchBlockstun>0||t.stunType==="shieldBreak");rows.push(result(g));}assert.deepEqual(rows[1],rows[0]);}
});
test("Spike's own shield defense and movement resources are unchanged",()=>{
  for(const charge of[0,.5,1]){const rows=[];for(const before of[true,false]){const g=setup({before,characters:["anchor","spike"]});guard(g.debug.fighters[1]);punch(g,charge);g.debug.resolveHit(0,1);rows.push(result(g));}assert.deepEqual(rows[1],rows[0]);}
});
test("soccer/hoop balls and boulders retain exact punch and Kickoff impulses at every charge",()=>{
  for(const arena of["standard","elevated","golden-rush","boulder-control","gravity-boulder","total-rush"])for(const charge of[0,.5,1])for(const kick of[false,true]){const rows=[];for(const before of[true,false]){const g=setup({before,arena}),a=punch(g,charge),b=g.debug.dashball.state.ball;Object.assign(b,{x:525,y:-5000,vx:100,vy:-30});assert(g.debug.dashball.shot(0,a,kick));rows.push({x:b.vx,y:b.vy,health:g.debug.fighters[0].health,air:g.debug.fighters[0].airDashes});}assert.deepEqual(rows[1],rows[0],`${arena}/${charge}/${kick}`);}
});
test("Spike's shield catch/deflection of soccer balls and boulders is unchanged",()=>{
  for(const arena of["standard","boulder-control"]){const rows=[];for(const before of[true,false]){const g=setup({before,arena}),f=g.debug.fighters[0],s=g.debug.dashball.state,b=s.ball;pose(f,1000,g.debug.dashball.arena.floorY-b.r-30);pose(g.debug.fighters[1],2200,f.y);guard(f);f.punchAim={x:1,y:0};const world=g.debug.dashball.world(1/60),surface=world.body(f).w/2+world.shieldPadding(f);Object.assign(b,{x:f.x+surface+b.r-2,y:f.y,vx:-600,vy:0});for(let n=0;n<3;n++)g.debug.dashball.ballStep();assert(b.carrier===f.id||b.vx>0,"shield must interact with the objective");rows.push({ball:plain(b),fighter:result(g)[0]});}assert.deepEqual(rows[1],rows[0]);}
});
test("other fighters and projectile knockback do not inherit Spike's melee-only scale",()=>{
  for(const characters of[["anchor","spike"],["orbit","anchor"],["spike","anchor"]]){const rows=[];for(const before of[true,false]){const g=setup({before,characters}),a=punch(g,.5);if(characters[0]==="spike")a.projectile={damage:10,knockback:620,hitstun:.2};g.debug.resolveHit(0,1);rows.push(result(g));}assert.deepEqual(rows[1],rows[0]);}
});
test("actual Spike hit remains identical through snapshot replay and delayed rollback",()=>{
  const games=[setup(),setup()];for(const g of games)g.debug.booster.punch(0,.75);const[a,b]=games,saved=a.rb.save(),manager=b.rb.manager(0,8),pending=[],inputs=[];
  for(let n=0;n<180;n++){const row=[R.neutral(),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(n*.23)*.25})];inputs.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(inputs[n]);}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());assert(a.debug.fighters[1].health<a.debug.fighters[1].data.maxHealth);const hash=a.rb.hash();a.rb.restore(saved);for(const row of inputs)a.rb.step(row);assert.equal(a.rb.hash(),hash);
});
test("30/60/120 Hz produce identical fixed-step punch damage and launch",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.booster.punch(0,.75);for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
