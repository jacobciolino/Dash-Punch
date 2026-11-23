"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),R=require("../rollback"),D=require("../dashball"),{createGame}=require("./simulation-harness");
const plain=x=>JSON.parse(JSON.stringify(x));let groups=0;const check=(label,fn)=>{fn();groups++;console.log(`ok ${label}`);};
function setup(){const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["rain","orbit"],seed:127});return g;}
check("all native frames have sparse, bounded, nonoverlapping cloth descriptors",()=>{
  const g=setup(),d=g.debug,set=g.sandbox.window.DASH_PUNCH_ART.spriteSets.seekerpro,marks=d.rainCloak.marks;let frames=0,textured=0;
  for(const[name,clip]of Object.entries(set.clips)){assert.equal(marks[name].length,clip.frames,name);for(const row of marks[name]){frames++;assert(row.length<=3);if(row.length)textured++;const cells=new Set();for(const mark of row){assert.equal(mark.length,4);assert(mark.every(Number.isInteger));assert(mark[2]>=0&&mark[2]<=3);assert(mark[3]===0||mark[3]===1);const points=d.rainCloak.cells(mark);assert.equal(points.length,mark[3]?2:5);for(const[x,y,shade]of points){assert(x>=0&&x<(clip.width||set.width));assert(y>=0&&y<(clip.height||set.height));assert(shade===1||shade===-1);const k=`${x},${y}`;assert(!cells.has(k));cells.add(k);}}}}
  assert.equal(frames,158);assert.equal(textured,144);
});
check("idle/dash marks stay stable and matching hurt/knockback poses retain cloth coordinates",()=>{
  const g=setup(),m=g.debug.rainCloak.marks;assert.equal(new Set(m.idle.map(r=>JSON.stringify(r))).size,1);assert.equal(new Set(m.dash.map(r=>JSON.stringify(r))).size,1);
  for(let i=0;i<9;i++){const dx=[14,14,9,3,-4,-11,-11,-11,-11][i];assert.deepEqual(plain(m.hurt[i].map(([x,y,t,v])=>[x+dx,y,t,v])),plain(m.knockback[i]));}assert(m.hurt[2].every(r=>r[2]===3));assert(m.hurt[3].every(r=>r[2]===2));assert(m.hurt[4].every(r=>r[2]===1));
});
check("white flashes and disappearing cloth cannot leave floating texture pixels",()=>{const m=setup().debug.rainCloak.marks;assert.equal(m.hurt[1].length,0);assert.equal(m.knockback[1].length,0);assert(m.death.slice(8).every(r=>r.length===0));});
check("rendering remains pure during movement, native punches, hitstun and gravity reversal",()=>{
  const g=setup(),d=g.debug,f=d.fighters[0];for(const[axis,sign]of[["y",1],["y",-1],["x",1],["x",-1]])for(const face of[-1,1]){d.gravity.setDirection(axis,sign);Object.assign(f,{face:{x:face,y:0},vx:face*300,hitstun:.5});const hash=g.rb.hash();d.gravity.draw(0);d.stagePresentation.draw();assert.equal(g.rb.hash(),hash);}
});
function canonical(g){const state=plain(g.rb.save().core);state.stageIndex=0;for(const f of state.fighters)for(const key of["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(state);}
check("all sports and Versus match the pre-texture release, including Rain data and attack state",()=>{
  const old=createGame(path.resolve("exports/Dash-Punch-Orbit-Halo-Release-2026-11-14")),now=createGame();assert.deepEqual(plain(now.sandbox.window.DASH_PUNCH_ART.assignments.rain),plain(old.sandbox.window.DASH_PUNCH_ART.assignments.rain));
  for(const mode of["versus",...D.ARENAS.map(a=>a.id),"race","brawl","scramble"]){for(const g of[old,now]){const characters=["rain","orbit"];if(mode==="versus")g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:characters,seed:489});else if(["race","brawl","scramble"].includes(mode))g.debug.sandbag.setup({ruleset:mode},{characters,seed:489});else g.debug.dashball.setup({arena:mode},{characters,seed:489});}assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));for(let i=0;i<90;i++){const input=[0,1].map(n=>R.decode(R.encode({hasAim:true,aimX:n?-1:1,aimY:-.5,punchHeld:i%31<9,dashHeld:i%47<12})));old.rb.step(input);now.rb.step(input);now.debug.stagePresentation.draw();assert.equal(canonical(now),canonical(old),`${mode}:${i}`);}}
});
check("snapshot, delayed rollback and replay have no cosmetic gameplay fields",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[],rows=[],start=a.rb.save();for(let i=0;i<160;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:-.3,punchHeld:(i+n*11)%39<7,dashHeld:i%53<11}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);assert(!JSON.stringify(a.rb.save().core).includes("rainCloak"));
});
check("fixed-step simulation remains equivalent at 30/60/120Hz rendering",()=>{const hashes=[];for(const hz of[30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"golden-rush"},{characters:["rain","rain"],ai:true,seed:297});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);});
console.log(`${groups} Rain cloak groups passed`);
