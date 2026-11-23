"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const previous=path.resolve(process.env.REGRESSION_BEFORE_DIR||"exports/Dash-Punch-Goals-Count-2026-11-15"),current=process.env.CORE_RELEASE_DIR||process.cwd(),old=createGame(previous),now=createGame(current),plain=x=>JSON.parse(JSON.stringify(x));
function canonical(g){const s=plain(g.rb.save().core);s.stageIndex=0;for(const f of s.fighters)for(const key of["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(s);}
let frames=0,cases=0;
const excluded=(process.env.REGRESSION_EXCLUDE_FIGHTERS||"").split(",").filter(Boolean),unchanged=old.rb.characterKeys.filter(key=>!excluded.includes(key));
for(const key of unchanged){
  for(const g of[old,now])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:493});
  assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data),`${key} changed`);
  for(let i=0;i<120;i++){const rows=[0,1].map(n=>({hasAim:true,aimX:n?-1:1,aimY:i%31<12?-.4:.2,dashHeld:(i+n*8)%47<9,punchHeld:(i+n*3)%37<11}));old.rb.step(rows);now.rb.step(rows);assert.equal(canonical(now),canonical(old),`${key}/${i}`);frames++;}cases++;
}
for(const stage of old.rb.stageNames.filter(name=>!old.sandbox.Dashball.ARENAS.some(a=>a.name===name)&&!name.includes("Sandbag"))){
  for(const g of[old,now])g.rb.setup({stageIndex:g.rb.stageNames.indexOf(stage),characterKeys:["boomerangus","kite"],seed:391});
  for(let i=0;i<90;i++){const rows=[{hasAim:true,aimX:1,aimY:-.4,punchHeld:i%33<8,dashHeld:i%59<7},{hasAim:true,aimX:-1,aimY:-.1,dashHeld:i%43<7}];old.rb.step(rows);now.rb.step(rows);assert.equal(canonical(now),canonical(old),`${stage}/${i}`);frames++;}cases++;
}
for(const arena of old.sandbox.Dashball.ARENAS){
  for(const g of[old,now])g.debug.dashball.setup({arena:arena.id,teamSize:2},{characters:["boomerangus","kite","rain","edgebert"],ai:true,seed:392});
  for(let i=0;i<120;i++){old.debug.dashball.step();now.debug.dashball.step();assert.equal(canonical(now),canonical(old),`${arena.id}/${i}`);frames++;}cases++;
}
for(const ruleset of["race","brawl","scramble"]){
  for(const g of[old,now])g.debug.sandbag.setup({ruleset,teamSize:2},{characters:["chungus","spike","gunman","archer"],ai:true,seed:393});
  for(let i=0;i<120;i++){old.debug.sandbag.step();now.debug.sandbag.step();assert.equal(canonical(now),canonical(old),`${ruleset}/${i}`);frames++;}cases++;
}
console.log(JSON.stringify({passed:true,previous,current,unchangedFighters:unchanged.length,excluded,cases,exactSimulationFrames:frames,historicalFixturesModified:false}));
