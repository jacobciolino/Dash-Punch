"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),R=require("../rollback"),D=require("../dashball"),{createGame}=require("./simulation-harness");
const g=createGame(),collect=g.debug.sharedMenu.collect,plain=x=>JSON.parse(JSON.stringify(x));let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
const pad=(key,extra={})=>({key,confirm:false,back:false,start:false,x:0,y:0,...extra});
const poll=(rows,states,dt=1/60,blocked=false)=>plain(collect(rows,states,dt,blocked));
check("one, two and four controllers have independent confirm/back/start edges",()=>{
  for(const count of[1,2,4]){const s=new Map(),rows=Array.from({length:count},(_,i)=>pad(String(i)));poll(rows,s);for(let i=0;i<count;i++)for(const type of["confirm","back","start"]){const pressed=rows.map((r,n)=>n===i?{...r,[type]:true}:r);assert.deepEqual(poll(pressed,s),{type});assert.equal(poll(pressed,s,1),null);poll(rows,s);}}
});
check("another controller can confirm while the first holds confirm",()=>{const s=new Map();poll([pad("p1"),pad("p4")],s);assert.deepEqual(poll([pad("p1",{confirm:true}),pad("p4")],s),{type:"confirm"});assert.deepEqual(poll([pad("p1",{confirm:true}),pad("p4",{confirm:true})],s),{type:"confirm"});});
check("private-card handoff waits for neutral without blocking another controller",()=>{
  const s=new Map();poll([pad("p1"),pad("p4")],s);s.get("p1").waitForNeutral=true;
  assert.equal(poll([pad("p1",{confirm:true,x:1}),pad("p4")],s,1),null);
  assert.deepEqual(poll([pad("p1",{confirm:true,x:1}),pad("p4",{y:-1})],s),{type:"navigate",x:0,y:-1});
  assert.equal(poll([pad("p1",{x:1}),pad("p4")],s,1),null);
  poll([pad("p1"),pad("p4")],s);assert.deepEqual(poll([pad("p1",{confirm:true}),pad("p4")],s),{type:"confirm"});
});
check("simultaneous equivalent confirms/navigation coalesce independent of order",()=>{for(const keys of[["p1","p2","p3","p4"],["p4","p2","p1","p3"]]){const s=new Map();poll(keys.map(k=>pad(k)),s);assert.deepEqual(poll(keys.map(k=>pad(k,{confirm:true})),s),{type:"confirm"});poll(keys.map(k=>pad(k)),s);assert.deepEqual(poll(keys.map(k=>pad(k,{x:1})),s),{type:"navigate",x:1,y:0});}});
check("conflicting fresh directions cancel, with no seat priority",()=>{for(const order of[false,true]){const s=new Map(),rows=[pad("p1"),pad("p4")];if(order)rows.reverse();poll(rows,s);assert.equal(poll(rows.map(r=>({...r,x:r.key==="p1"?-1:1})),s),null);}});
check("fresh navigation overrides held repeats and each pad repeats at 0.18s",()=>{const s=new Map();poll([pad("a"),pad("b")],s);assert.deepEqual(poll([pad("a",{x:1}),pad("b")],s),{type:"navigate",x:1,y:0});assert.equal(poll([pad("a",{x:1}),pad("b")],s,.17),null);assert.deepEqual(poll([pad("a",{x:1}),pad("b",{y:-1})],s,.02),{type:"navigate",x:0,y:-1});assert.equal(poll([pad("a"),pad("b")],s),null);assert.deepEqual(poll([pad("a",{x:-1}),pad("b")],s),{type:"navigate",x:-1,y:0});});
check("Back beats Start/confirm, and Start beats confirm without double activation",()=>{for(const reverse of[false,true]){const s=new Map(),rows=[pad("a"),pad("b"),pad("c")];if(reverse)rows.reverse();poll(rows,s);assert.deepEqual(poll(rows.map(r=>({...r,[{a:"back",b:"start",c:"confirm"}[r.key]]:true})),s),{type:"back"});poll(rows,s);assert.deepEqual(poll(rows.map(r=>({...r,[r.key==="a"?"start":"confirm"]:true})),s),{type:"start"});}});
check("screen locks consume held inputs, reconnects require release and cache stays bounded",()=>{const s=new Map();poll([pad("a")],s);poll([pad("a",{confirm:true})],s,.1,true);assert.equal(poll([pad("a",{confirm:true})],s,1),null);poll([],s);assert.equal(s.size,0);assert.equal(poll([pad("a",{confirm:true})],s),null);poll([pad("a")],s);assert.deepEqual(poll([pad("a",{confirm:true})],s),{type:"confirm"});for(let i=0;i<100;i++)poll([pad(String(i))],s);assert.equal(s.size,1);});
check("shared menu polling has no combat snapshot fields or simulation effects",()=>{const before=g.rb.hash();for(let i=0;i<20;i++)g.debug.sharedMenu.poll();assert.equal(g.rb.hash(),before);assert(!JSON.stringify(g.rb.save()).includes("globalPadInputs"));});
function canonical(game){const core=plain(game.rb.save().core);core.stageIndex=0;for(const f of core.fighters)for(const key of["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(core);}
check("all modes retain exact pre-menu-patch fighter, physics, scoring and input behavior",()=>{
  const old=createGame(path.resolve(process.env.REGRESSION_BEFORE_DIR||"exports/Dash-Punch-Rain-Cloak-Release-2026-11-14")),now=createGame();let frames=0;
  for(const mode of["versus",...D.ARENAS.map(a=>a.id),"race","brawl","scramble"]){for(const game of[old,now]){const characters=["boomerangus","kite","rain","edgebert"];if(mode==="versus")game.rb.setup({stageIndex:game.rb.stageNames.indexOf("Crosswire"),characterKeys:characters,seed:523});else if(["race","brawl","scramble"].includes(mode))game.debug.sandbag.setup({ruleset:mode,teamSize:2},{characters,ai:true,seed:523});else game.debug.dashball.setup({arena:mode,teamSize:2},{characters,ai:true,seed:523});}for(let i=0;i<90;i++){const inputs=Array.from({length:4},(_,n)=>R.decode(R.encode({hasAim:true,aimX:n%2?-1:1,aimY:-.5,punchHeld:(i+n*3)%29<9,dashHeld:i%47<11})));old.rb.step(inputs);now.rb.step(inputs);assert.equal(canonical(now),canonical(old),`${mode}:${i}`);frames++;}}console.log(`${frames} exact pre-change gameplay frames`);
});
console.log(`${groups} Shared menu groups passed`);
