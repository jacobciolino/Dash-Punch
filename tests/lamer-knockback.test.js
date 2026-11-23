"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const before=execFileSync("git",["show","0325d95:game.js"],{encoding:"utf8"}),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
function setup(old=false,arena,characters=["lamer","anchor"]){const g=createGame(process.cwd(),old?{sourceOverrides:{"game.js":before}}:{});if(arena)g.debug.dashball.setup({arena,ruleset:"battle"},{characters,seed:781,ai:false});else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:characters,seed:781});g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:450+i*75,y:-5000,prevX:450+i*75,prevY:-5000,vx:0,vy:0,onGround:false,invulnerable:0,hitstun:0,hitstop:0,comboHits:0,dashParry:0,shieldReleaseParry:0}));return g;}
function punch(g,charge,dir={x:1,y:0}){g.debug.booster.punch(0,charge,dir);const a=g.debug.fighters[0].attack;a.age=a.startup+.001;return a;}
test("Lamer derives fighter force at 95% of actual Chungus for every charge; other configuration is unchanged",()=>{
  const g=setup(),old=setup(true),chungus=setup(false,undefined,["chungus","anchor"]).debug.fighters[0].data,f=g.debug.fighters[0],data=plain(f.data);delete data.fighterPunchKnockback;assert.deepEqual(data,plain(old.debug.fighters[0].data));assert.deepEqual(plain(g.debug.fighters[1].data),plain(old.debug.fighters[1].data));assert(f.data.directionalLaunch&&f.data.punchNoLift);
  for(let n=0;n<=10;n++){const charge=n/10,game=setup(),target=game.debug.fighters[1];punch(game,charge);game.debug.resolveHit(0,1);const expected=chungus.punchKnockback*(1+(chungus.punchKnockbackCharge??.9)*charge)*.95;near(target.vx,expected*.88);near(target.vy,0);}near(f.data.fighterPunchKnockback.base,988);
});
test("left, right, diagonal and vertical punches launch straight without lift, momentum inheritance or combo pull",()=>{
  for(const dir of[{x:1,y:0},{x:-1,y:0},{x:.8,y:-.6},{x:0,y:1}])for(const combo of[false,true]){const g=setup(),[f,t]=g.debug.fighters;Object.assign(f,{vx:900,vy:-700,aim:{x:-dir.x,y:-dir.y}});if(combo)Object.assign(t,{hitstun:.3,comboHits:2,comboGrace:.5});punch(g,1,dir);g.debug.resolveHit(0,1);near(t.vx*dir.y-t.vy*dir.x,0);assert(t.vx*dir.x+t.vy*dir.y>0);}
});
test("damage, debuffs, sports impulses and shield recoil stay identical to the checkpoint",()=>{
  for(const charge of[0,.5,1]){const results=[];for(const old of[true,false]){const g=setup(old),t=g.debug.fighters[1],hp=t.health;punch(g,charge);g.debug.resolveHit(0,1);results.push({damage:hp-t.health,status:plain(t.lamerSuppression),hitstun:t.hitstun});}assert.deepEqual(results[1],results[0]);}
  for(const arena of["standard","elevated","golden-rush","boulder-control","volleyball"])for(const charge of[0,.5,1]){const rows=[];for(const old of[true,false]){const g=setup(old,arena),b=g.debug.dashball.state.ball,a=punch(g,charge);Object.assign(b,{x:525,y:-5000,vx:0,vy:0});assert(g.debug.dashball.shot(0,a));rows.push({vx:b.vx,vy:b.vy});}assert.deepEqual(rows[1],rows[0],arena);}
  for(const charge of[0,1]){const rows=[];for(const old of[true,false]){const g=setup(old),t=g.debug.fighters[1];Object.assign(t,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchHoldTimer:.3,punchAim:{x:-1,y:0}});punch(g,charge);g.debug.resolveHit(0,1);rows.push({vx:t.vx,vy:t.vy,health:t.health,shield:t.shieldHealth,stun:t.stunType});}assert.deepEqual(rows[1],rows[0]);}
});
test("the adjusted real hit restores and replays identically after delayed inputs",()=>{
  const a=setup(),b=setup();for(const g of[a,b])punch(g,.75);const saved=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
  for(let n=0;n<120;n++){const row=[R.neutral(),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(n*.2)*.25})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(a.debug.fighters[1].health<a.debug.fighters[1].data.maxHealth);const hash=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
});
test("30/60/120 Hz produce identical Lamer launch and debuff simulation",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup(),ctx=g.elements.get("game").getContext("2d");
    // The simulation harness needs inert pixel storage for the cosmetic frown cache.
    ctx.getImageData=(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)});ctx.createImageData=(w,h)=>({data:new Uint8ClampedArray(w*h*4)});
    g.debug.matchFlow.begin({countdown:false});punch(g,.75);for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
