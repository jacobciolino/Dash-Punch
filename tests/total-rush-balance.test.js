"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness"),{hashes}=require("./total-rush-regression");
const T=D.totalRush,dt=1/60;let groups=0;const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),plain=value=>JSON.parse(JSON.stringify(value));
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(config={}){const stage=D.arena("total-rush",154,config),state=D.create({...config,arena:"total-rush"},stage),world={stage,gravity:{x:0,y:1},fighters:[],terrain:()=>stage.terrain.concat(stage.ballOnly),attacks:()=>[],attackTouches:()=>false,body:f=>({x:f.x-23,y:f.y-33,w:46,h:66}),shielding:()=>false,kicking:()=>false};return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.clock(state,dt,stage);D.step(state,dt,world);}}};}
const fighter=(id="p1",team=0)=>({id,team,x:1800,y:1500,prevX:1800,prevY:1500,vx:0,vy:0,invulnerable:0,data:{width:46,height:66,punchDamage:12,punchKnockback:800,punchReach:70,maxAirDashes:4}});
function ringShot(f,row=1,index=0,team=0){const r=f.stage.rings.find(r=>r.team===team&&r.row===row);Object.assign(f.state.extraBalls[index],{x:r.line-r.direction*80,y:(r.top+r.bottom)/2,vx:r.direction*1800,vy:0});}
check("Balanced defaults halve only Total Rush boulder income; all exact choice sets and zero survive normalization",()=>{
  const c=D.options({arena:"total-rush"});assert.equal(c.winningScore,300);assert.equal(c.balancePreset,"balanced");for(const [key,value] of Object.entries(T.presets.balanced))assert.equal(c[key],value);
  assert.deepEqual(T.balanceChoices,{boulderTerritoryRate:[0,.25,.5,.75,1,1.5,2],boulderBonusRate:[0,.5,1,1.5,2,3,4],middleRingPoints:[0,1,3,5,10,15],highRingPoints:[0,5,10,15,20,25],goldenReward:[0,10,20,30,40,50,60],goldenHealth:[48,96,144,192,240],goldenRespawn:[10,20,30,45,60,90],ballCount:[1,2,3,4,5]});
  for(const [key,values] of Object.entries(T.balanceChoices))for(const value of values){const s=D.options({...c,[key]:value});assert.equal(s[key],value,key);assert.deepEqual(D.options(plain(s)),s);}
  for(const key of Object.keys(T.balanceChoices))for(const value of [NaN,Infinity,-100,99999,"bad"]){const c=D.options({arena:"total-rush",[key]:value});assert(T.balanceChoices[key].includes(c[key]));}
});
check("named presets restore eight exact values, Custom preserves edits, unrelated match rules never change",()=>{
  let c=D.options({arena:"total-rush",teamSize:4,winningScore:420,duration:600,respawn:20,healthMult:.7});const match=Object.fromEntries(["teamSize","winningScore","duration","respawn","healthMult"].map(k=>[k,c[k]]));
  c=T.preset(c,"original");assert.equal(c.boulderTerritoryRate,1);assert.equal(c.boulderBonusRate,2);c=T.adjust(c,"goldenRespawn",1);assert.equal(c.balancePreset,"custom");assert.equal(c.goldenRespawn,60);const before=plain(c);assert.deepEqual(T.preset(c,"custom"),before);
  c=T.preset(c,"balanced");for(const [key,value] of Object.entries(T.presets.balanced))assert.equal(c[key],value);for(const [key,value] of Object.entries(match))assert.equal(c[key],value);
  assert.equal(T.preset(c,"custom").balancePreset,"custom");assert.equal(D.options({...c,goldenHealth:240}).balancePreset,"custom");
  for(const key of Object.keys(T.balanceChoices)){let p=T.preset(c,"balanced");for(let i=0;i<20;i++)p=T.adjust(p,key,-1);assert.equal(p[key],T.balanceChoices[key][0]);for(let i=0;i<20;i++)p=T.adjust(p,key,1);assert.equal(p[key],T.balanceChoices[key].at(-1));}
});
check("every fractional rate accumulates exact integer-ledger scores at 30/60/120 Hz and collision substeps",()=>{
  for(const [key,y] of [["boulderTerritoryRate",1900],["boulderBonusRate",1000]])for(const rate of T.balanceChoices[key])for(const hz of [30,60,120]){
    const f=fixture({[key]:rate});Object.assign(f.state.ball,{x:738,y});for(let i=0;i<hz*10;i++){for(let n=0;n<13;n++)D.boulderControl.score(f.state,f.stage,1/hz/13);T.resolveScore(f.state);}assert.equal(f.state.totalRush.scoreUnits[1],rate*10*60000);near(f.state.scores[1],rate*10);assert(f.state.boulder.remainders[1]<1e-6);
  }
});
check("bonus is a total rate, including bonus lower than ordinary or independently disabled",()=>{
  const f=fixture({boulderTerritoryRate:2,boulderBonusRate:.5});Object.assign(f.state.ball,{x:738,y:1000});D.boulderControl.score(f.state,f.stage,1);T.resolveScore(f.state);near(f.state.scores[1],.5);f.state.ball.y=1900;D.boulderControl.score(f.state,f.stage,1);T.resolveScore(f.state);near(f.state.scores[1],2.5);
  const z=fixture({boulderTerritoryRate:0,boulderBonusRate:0});Object.assign(z.state.ball,{x:738,y:1900,vx:100});z.tick(30);assert(z.state.ball.x>738);assert.deepEqual(z.state.scores,[0,0]);
});
check("every middle/high award, including zero, uses configured points and resets only the scoring ball",()=>{
  for(const [key,row] of [["middleRingPoints",1],["highRingPoints",2]])for(const points of T.balanceChoices[key]){const f=fixture({[key]:points});ringShot(f,row);f.tick(8);assert.equal(f.state.scores[1],points);assert.equal(f.state.rushSerial,1);assert.equal(f.state.extraBalls[0].vx,0);assert.equal(f.state.extraBalls[1].resetFrame,-1);assert.equal(f.state.golden.health,144);}
});
check("every golden reward and HP, including zero reward, preserves hit detection and one defeat event",()=>{
  for(const goldenReward of T.balanceChoices.goldenReward)for(const goldenHealth of T.balanceChoices.goldenHealth){const f=fixture({goldenReward,goldenHealth});assert.equal(f.state.golden.health,goldenHealth);assert.equal(f.state.golden.maxHealth,goldenHealth);f.state.golden.health=1;assert(D.goldenRush.hit(f.state,fighter(),{id:1,dir:{x:1,y:0}},f.world));assert(!D.goldenRush.hit(f.state,fighter(),{id:1,dir:{x:1,y:0}},f.world));T.resolveScore(f.state);assert.equal(f.state.scores[0],goldenReward);assert.equal(f.state.captures[0],1);assert(!f.state.golden.active);}
});
check("all respawn intervals use simulation seconds and restore selected HP; ball counts stay 1–5",()=>{
  for(const goldenRespawn of T.balanceChoices.goldenRespawn){const f=fixture({goldenRespawn,goldenHealth:240});f.state.golden.health=1;D.goldenRush.hit(f.state,fighter(),{id:1,dir:{x:1,y:0}},f.world);assert.equal(f.state.golden.respawn,goldenRespawn);f.tick(goldenRespawn*60-1);assert(!f.state.golden.active);f.tick(2);assert(f.state.golden.active);assert.equal(f.state.golden.health,240);assert.equal(f.state.golden.serial,2);}
  for(const ballCount of T.balanceChoices.ballCount){const f=fixture({ballCount});assert.equal(f.state.extraBalls.length,ballCount);assert.equal(D.balls(f.state).length,ballCount+1);}
});
check("all-zero scoring is invalid; any one positive source restores validity, including bonus alone",()=>{
  const zeros={arena:"total-rush",boulderTerritoryRate:0,boulderBonusRate:0,middleRingPoints:0,highRingPoints:0,goldenReward:0};assert.match(T.validation(D.options(zeros)),/at least one scoring objective/);
  for(const key of ["boulderTerritoryRate","boulderBonusRate","middleRingPoints","highRingPoints","goldenReward"])assert.equal(T.validation(D.options({...zeros,[key]:T.balanceChoices[key][1]})),"");assert.equal(T.validation(D.options({arena:"golden-rush"})),"");
  const g=createGame(),d=g.debug;d.dashball.setup(zeros);assert.throws(()=>d.online.rollback.getSignature({stageIndex:d.stageNames.indexOf("Total Rush"),characterKeys:["orbit","spike"],seed:42,window:8,dashball:d.dashball.state.config}),/at least one scoring objective/);
});
check("mixed configured awards batch at the end of the step and retain deterministic tie/overtime resolution",()=>{
  for(const reverse of [false,true]){const f=fixture({middleRingPoints:15,highRingPoints:25});f.state.totalRush.scoreUnits=[285*60000,285*60000];f.state.scores=[285,285];ringShot(f,1,0,1);ringShot(f,2,1,0);if(reverse)f.state.extraBalls.reverse();f.tick(8);assert.equal(f.state.winner,1);assert.deepEqual(f.state.scores,[300,310]);}
  const f=fixture({middleRingPoints:15});f.state.totalRush.scoreUnits=[285*60000,285*60000];f.state.scores=[285,285];ringShot(f,1,0,1);ringShot(f,1,1,0);f.tick(8);assert.equal(f.state.phase,"playing");assert(f.state.overtime);f.state.totalRush.pendingUnits[0]=250;T.resolveScore(f.state);assert.equal(f.state.winner,0);const before=JSON.stringify(f.state);f.tick(30);assert.equal(JSON.stringify(f.state),before);
});
check("host signatures include every setting; snapshots restore configuration, ring values and fractional remainders",()=>{
  const a=createGame(),d=a.debug,config={arena:"total-rush",boulderTerritoryRate:.25,boulderBonusRate:3,middleRingPoints:15,highRingPoints:25,goldenReward:60,goldenHealth:240,goldenRespawn:90,ballCount:5};d.dashball.setup(config);const match={stageIndex:d.stageNames.indexOf("Total Rush"),characterKeys:["orbit","spike"],seed:42,window:8,dashball:plain(d.dashball.state.config)},signature=a.rb.getSignature(match);
  for(const [key,values] of Object.entries(T.balanceChoices)){const value=values.find(v=>v!==match.dashball[key]);assert.notEqual(a.rb.getSignature({...match,dashball:{...match.dashball,[key]:value}}),signature,key);}
  const start=a.rb.save();d.dashball.setup({arena:"total-rush"});a.rb.restore(start);assert.deepEqual(plain(d.dashball.state.config),match.dashball);assert.deepEqual(plain(d.dashball.arena.rings.map(r=>r.points)),[15,25,15,25]);
  const b=createGame();b.debug.dashball.setup({arena:"total-rush"});b.debug.online.installSnapshot(d.online.createSnapshot());assert.deepEqual(plain(b.debug.dashball.state.config),match.dashball);assert.deepEqual(plain(b.debug.dashball.arena.rings.map(r=>r.points)),[15,25,15,25]);
});
check("custom scoring/settings survive replay, six-frame delayed rollback and 30/60/120 Hz rendering",()=>{
  const config={arena:"total-rush",boulderTerritoryRate:.25,boulderBonusRate:1.5,middleRingPoints:3,highRingPoints:20,goldenReward:50,goldenHealth:192,goldenRespawn:90,ballCount:5};const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup(config);const start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
  for(let i=0;i<180;i++){const row=[0,1].map(n=>R.encode({aimX:n?-1:1,aimY:-.4,punchHeld:(i+n*7)%29<8,dashHeld:(i+n*5)%41<10}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);
  const results=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup(config);Object.assign(g.debug.dashball.state.ball,{x:738,y:1900});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push(g.rb.hash());}assert.equal(results[0],results[1]);assert.equal(results[0],results[2]);
});
check("AI values configured income, ignores zero-point rings/targets and uses support during downtime",()=>{
  function role(c){const f=fixture(c),p=fighter();f.world.fighters=[p];return T.assign(f.state,f.world)[p.id];}
  assert.equal(role({boulderTerritoryRate:2,boulderBonusRate:4,goldenReward:0,middleRingPoints:1,highRingPoints:5}).kind,"boulder");assert.equal(role({boulderTerritoryRate:0,boulderBonusRate:0,goldenReward:0}).kind,"ring");assert.equal(role({boulderTerritoryRate:0,boulderBonusRate:0,middleRingPoints:0,highRingPoints:0}).kind,"golden");
  assert.equal(role({boulderTerritoryRate:.25,boulderBonusRate:.5,goldenReward:0,middleRingPoints:1,highRingPoints:5}).kind,"ring");
  assert.equal(role({boulderTerritoryRate:0,boulderBonusRate:0,goldenReward:10,goldenHealth:240,goldenRespawn:90}).kind,"ring");assert.equal(role({boulderTerritoryRate:0,boulderBonusRate:0,goldenReward:60,goldenHealth:48,goldenRespawn:10}).kind,"golden");
  const f=fixture({boulderTerritoryRate:0,boulderBonusRate:0,middleRingPoints:0,highRingPoints:0});f.world.fighters=[fighter()];f.state.golden.active=false;assert.equal(T.assign(f.state,f.world).p1.kind,"support");
  const zero=fixture({middleRingPoints:0});assert(zero.stage.rings.some(r=>r.points===0));const plan=D.goldenRush.plan(zero.state,fighter(),zero.world,zero.state.extraBalls[0]);assert(plan);assert(zero.stage.rings.find(r=>r.id===plan.id).points>0);
  const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena:"total-rush",teamSize:5,boulderTerritoryRate:0,boulderBonusRate:0,middleRingPoints:0,highRingPoints:0},{ai:true});for(let i=0;i<120;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());}
});
check("score/zone HUD shows quarter points and actual rates without rounding up an unearned victory",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"total-rush",boulderTerritoryRate:.25,boulderBonusRate:3});d.dashball.state.scores=[299.999,.25];const texts=[],ctx=g.elements.get("game").getContext("2d");ctx.fillText=text=>texts.push(String(text));const before=g.rb.hash();d.stagePresentation.draw();assert.equal(g.rb.hash(),before);assert(texts.includes("299.99"));assert(texts.includes("0.25"));assert(texts.some(t=>t.includes("BLUE 3/s")));assert(texts.some(t=>t.includes("RED 0.25/s")));
});
check("Original preset retains its scoring values; later requested boulder body changes are separate",()=>{const f=fixture({balancePreset:"original"});assert.equal(f.state.config.boulderTerritoryRate,1);assert.equal(f.state.config.boulderBonusRate,2);assert.equal(f.state.config.middleRingPoints,5);assert.equal(f.state.config.highRingPoints,10);assert.equal(f.state.config.goldenReward,30);});
console.log(`${groups} Total Rush balance groups passed`);
