"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),G=require("../sports-guide"),D=require("../dashball"),S=require("../sandbag"),{createGame}=require("./simulation-harness");
let groups=0;const plain=x=>JSON.parse(JSON.stringify(x));function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
check("all registered sports have specific and accurate objective/twist/scoring text",()=>{
 const twists=new Set();for(const {id,name} of D.ARENAS){const scene=G.scene("dashball",{arena:id,duration:300});assert.equal(scene.guide.name,name);for(const field of["mode","rules","objective","twist","scoring"])assert(scene.guide[field]?.length>3,`${id}/${field}`);assert(scene.guide.objective.length<120);assert(scene.guide.twist.length<125);twists.add(scene.guide.twist);}
 assert.equal(twists.size,D.ARENAS.length);
 assert.match(G.scene("dashball",{arena:"boulder-control"}).guide.objective,/own colored/);
 assert.match(G.scene("dashball",{arena:"field-goal"}).guide.twist,/never stops/);
 assert(!/First to 5/.test(G.scene("dashball",{arena:"field-goal"}).guide.scoring));
 for(const {id}of S.RULESETS){const scene=G.scene("sandbag",{ruleset:id});assert.match(scene.guide.scoring,/Damage = points/);assert.equal(scene.state.bags.length,id==="scramble"?1:2);}
});
check("preview scene geometry and objective positions come directly from current factories",()=>{
 for(const {id}of D.ARENAS){const c=D.options({arena:id,duration:300}),scene=G.scene("dashball",c),stage=D.arena(id,154,c),state=D.create(c,stage);assert.deepEqual(scene.stage,stage,id);assert.deepEqual(scene.state,state,id);const frozen=JSON.stringify(scene);for(const r of scene.stage.terrain)G.terrain(scene,r);assert.equal(JSON.stringify(scene),frozen);}
 const a=G.scene("dashball",{arena:"elevated",platformWidth:500}),b=G.scene("dashball",{arena:"elevated",platformWidth:300});assert.notEqual(a.key,b.key);assert.equal(a.stage.terrain.find(r=>r.dashballMover).w,500);
});
check("selected settings drive descriptions without changing stage-selection defaults",()=>{
 const old=(config,arena)=>{const special=id=>D.targetCharge.isArena(id)?D.CHARGE_DEFAULTS:id==="total-rush"?D.TOTAL_DEFAULTS:D.isGoldenArena(id)?D.GOLDEN_DEFAULTS:id==="gravity-boulder"?D.GRAVITY_BOULDER_DEFAULTS:id==="boulder-control"?D.BOULDER_DEFAULTS:null;const same=D.targetCharge.isArena(arena)&&D.targetCharge.isArena(config.arena);const defaults=arena!==config.arena&&!same?special(arena)||(special(config.arena)?D.DEFAULTS:{}):{};return D.options({...config,...defaults,duration:config.duration,teamSize:config.teamSize,arena});};
 for(const a of D.ARENAS)for(const b of D.ARENAS){const c=D.options({arena:a.id,duration:120,teamSize:3,goldenReward:60,boulderTerritoryRate:2});assert.deepEqual(G.dashballConfig(c,b.id),old(c,b.id));}
 const total=G.scene("dashball",{arena:"total-rush",boulderTerritoryRate:.25,boulderBonusRate:3,middleRingPoints:15,highRingPoints:25,goldenReward:60,ballCount:5});assert.match(total.guide.scoring,/0.25 \/ 3/);assert.match(total.guide.scoring,/15 \/ 25/);assert.match(total.guide.scoring,/Golden 60/);assert.match(total.guide.twist,/5 small balls/);
 assert.match(G.scene("dashball",{arena:"target-charge-roaming",winningScore:150}).guide.scoring,/150%/);
});
check("preview cache is bounded and invalidates when geometry/config changes",()=>{
 const context=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)}),cache=G.createCache(()=>({getContext:()=>context}),()=>{},2);
 const a=G.scene("dashball",{arena:"standard"}),b=G.scene("dashball",{arena:"elevated"}),c=G.scene("dashball",{arena:"boulder-control"});cache.get(a);cache.get(a);assert.equal(cache.stats.renders,1);cache.get(b);cache.get(c);assert.equal(cache.stats.entries,2);cache.clear();assert.equal(cache.stats.entries,0);cache.get(a,false);assert.equal(cache.stats.entries,0);
});
check("all stages retain pre-preview gameplay, scores, physics and seeded AI",()=>{
 const root=path.resolve(JSON.parse(fs.readFileSync("playtest-release.json")).directory),a=createGame(root),b=createGame(path.resolve("exports/Dash-Punch-BackOut-Release-2026-11-14"));let frames=0;
 for(const {id}of b.sandbox.Dashball.ARENAS){for(const g of[a,b])g.debug.dashball.setup({arena:id,teamSize:3,duration:300},{characters:["boomerangus","edgebert","kite"],ai:true,seed:36});const before=a.rb.hash();for(const arena of D.ARENAS)a.debug.sportsGuide.scene("dashball",arena.id);assert.equal(a.rb.hash(),before);for(let n=0;n<60;n++){for(const g of[a,b])g.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash(),id);frames++;}}
 for(const {id}of S.RULESETS){for(const g of[a,b])g.debug.sandbag.setup({ruleset:id,teamSize:3},{characters:["rain","chungus"],ai:true,seed:36});for(let n=0;n<60;n++){for(const g of[a,b])g.debug.sandbag.step();assert.equal(a.rb.hash(),b.rb.hash(),id);frames++;}}
 console.log(`${frames} exact pre-preview sports frames`);
});
console.log(`${groups} sports-guide groups passed`);
