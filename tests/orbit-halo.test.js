"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),R=require("../rollback"),D=require("../dashball"),{createGame}=require("./simulation-harness");
const plain=x=>JSON.parse(JSON.stringify(x));let groups=0;
const check=(label,fn)=>{fn();groups++;console.log(`ok ${label}`);};
function setup(){const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:["orbit","kite"],seed:98});return g;}
check("the native halo is a tiny open elliptical ring, restricted to Orbit",()=>{const g=setup(),d=g.debug,rows=d.orbitHalo.pixels;assert.equal(rows.length,5);assert(rows.every(row=>row.length===11&&/^[.#g]+$/.test(row)));assert(rows[2].includes("......."));assert(d.orbitHalo.frame(0));assert.equal(d.orbitHalo.frame(1),null);});
check("every authored clip/frame has a hood anchor, with correct native gaps and root alignment",()=>{
  const g=setup(),d=g.debug,set=g.sandbox.window.DASH_PUNCH_ART.spriteSets.seekerpro,heads=d.orbitHalo.heads;let frames=0;
  for(const [name,clip]of Object.entries(set.clips)){assert.equal(heads[name].length,clip.frames,name);for(let i=0;i<clip.frames;i++){const h=d.orbitHalo.frame(0,name,i,0);if(!heads[name][i]){assert.equal(h,null);assert.equal(name,"death");continue;}assert.equal(h.w,33);assert.equal(h.h,15);assert(h.headY-h.y-h.h>=5.5);assert(h.headY-h.y-h.h<=6.5);assert(Math.abs(h.x+h.w/2-h.headX)<=.5);frames++;}}
  assert(frames>140);assert.notDeepEqual(heads.attack2[0],heads.attack2[7]);assert.notDeepEqual(heads.hurt[0],heads.hurt[3]);
});
check("all animation-facing and gravity transformations preserve the body and halo source pose",()=>{
  const g=setup(),d=g.debug,f=d.fighters[0];for(const[axis,sign]of [["y",1],["y",-1],["x",1],["x",-1]])for(const face of[-1,1]){d.gravity.setDirection(axis,sign);f.face={x:face,y:0};const hash=g.rb.hash();d.gravity.draw(0);assert.equal(g.rb.hash(),hash);const p=d.orbitHalo.frame(0,"hurt",3,0);assert([p.x,p.y,p.w,p.h].every(Number.isFinite));assert(d.gravity.renderFrame().rotation!==undefined);}
});
check("bobbing is subtle, simulation-clock based, and independent of render count",()=>{
  const g=setup(),d=g.debug,p=[];for(let i=0;i<180;i++)p.push(d.orbitHalo.frame(0,"idle",0,i/60).y);assert(Math.max(...p)-Math.min(...p)<=2);assert(Math.max(...p)>Math.min(...p));assert.equal(new Set(d.orbitHalo.heads.idle.map(p=>p.join(","))).size,1);assert.equal(new Set(d.orbitHalo.heads.dash.map(p=>p.join(","))).size,1);const hash=g.rb.hash(),before=plain(d.orbitHalo.frame());for(let i=0;i<30;i++)d.gravity.draw(0);assert.equal(g.rb.hash(),hash);assert.deepEqual(plain(d.orbitHalo.frame()),before);
});
check("menu halos use the same head frames and do not change original preview timing",()=>{
  const g=setup(),d=g.debug,set=g.sandbox.window.DASH_PUNCH_ART.spriteSets.seekerpro;for(const[name,clip]of Object.entries(set.clips)){const html=d.orbitHalo.preview(name);assert(html.includes('class="orbit-halo-preview"'));assert(html.includes(`orbit-halo-${name}`));assert(html.includes(`--sprite-frames:${clip.frames}`));if(clip.fps)assert(html.includes(`animation-duration:${clip.frames/clip.fps}s`));}
});
function canonical(g){const core=plain(g.rb.save().core);core.stageIndex=0;for(const f of core.fighters)for(const key of["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(core);}
check("all sports, Versus, Orbit stats and projectiles exactly match the pre-halo release",()=>{
  const old=createGame(path.resolve("exports/Dash-Punch-Kite-Accessory-Release-2026-11-14")),now=createGame();
  const modes=["versus",...D.ARENAS.map(a=>a.id),"race","brawl","scramble"];
  for(const mode of modes){for(const g of[old,now]){const characters=["orbit","kite"];if(mode==="versus")g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:characters,seed:325});else if(["race","brawl","scramble"].includes(mode))g.debug.sandbag.setup({ruleset:mode},{characters,seed:325});else g.debug.dashball.setup({arena:mode},{characters,seed:325});}assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));for(let i=0;i<90;i++){const input=[0,1].map(n=>R.decode(R.encode({hasAim:true,aimX:n?-1:1,aimY:i%23<10?-.8:.3,punchHeld:i%31<7,dashHeld:i%43<10})));old.rb.step(input);now.rb.step(input);now.debug.stagePresentation.draw();assert.equal(canonical(now),canonical(old),`${mode}:${i}`);}}
});
check("snapshot and late-input rollback reconstruct the same halo without new gameplay state",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[],rows=[],start=a.rb.save();for(let i=0;i<160;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:-.5,punchHeld:(i+n*7)%37<9,dashHeld:i%51<11}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert.deepEqual(plain(a.debug.orbitHalo.frame()),plain(b.debug.orbitHalo.frame()));const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);assert(!JSON.stringify(a.rb.save().core).includes("halo"));
});
check("30/60/120Hz rendering cannot affect physics, and Kite remains unchanged",()=>{const results=[];for(const hz of[30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"gravity-boulder"},{characters:["orbit","kite"],ai:true,seed:433});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push(g.rb.hash());assert(g.debug.kiteAccessory.pose(1));}assert.equal(results[0],results[1]);assert.equal(results[0],results[2]);});
console.log(`${groups} Orbit halo groups passed`);
