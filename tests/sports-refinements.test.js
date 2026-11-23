"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness"),{hashes}=require("./total-rush-regression");
const oldRoot=require("node:path").resolve("exports/Dash-Punch-Boomerangus-Release-2026-11-13"),plain=x=>JSON.parse(JSON.stringify(x));let groups=0;
const check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);};
function contactFixture(){const stage=D.arena("boulder-control"),s=D.create({arena:"boulder-control"},stage),f={id:"p1",team:0,x:1200,y:1000,vx:500,vy:0,invulnerable:0,data:{punchKnockback:760,punchDamage:12},onGround:true},b=s.ball;Object.assign(b,{x:950,y:1000,vx:500,vy:0});const impacts=[],w={stage,friendlyFire:true,fighters:[f],body:()=>({x:1177,y:967,w:46,h:66}),shielding:()=>false,kicking:()=>false,dashing:()=>false,onBoulderImpact:(fighter,impact)=>impacts.push(impact),onBoulderBody:()=>{}};return {s,f,b,w,impacts,touch(){D.boulderControl.contact(s,f,w.body(f),{x:-1,y:0,depth:20},w,b);}};}
check("walking cannot move a stationary or moving boulder; momentum belongs to the boulder",()=>{
  for(const speed of [0,500]){const t=contactFixture();t.f.vx=3000;t.b.vx=speed;t.touch();assert.equal(t.b.vx,speed);assert.equal(t.b.vy,0);assert.equal(t.impacts.length,Number(speed>0));}
});
check("impact uses inward boulder speed, not walking speed, tangent motion or a launch-only flag",()=>{
  for(const [vx,vy,expected] of [[500,0,1],[0,1000,0],[-500,0,0],[90,0,0]]){const t=contactFixture();Object.assign(t.b,{vx,vy,launched:0});t.touch();assert.equal(t.impacts.length,expected);if(expected)assert(t.impacts[0].grounded);}
});
check("one sustained contact cannot repeatedly stun; a separated new inward contact can",()=>{
  const t=contactFixture();t.touch();t.s.time=1;t.touch();assert.equal(t.impacts.length,1);delete t.s.boulder.stunContacts[t.f.id];t.touch();assert.equal(t.impacts.length,2);
});
check("active dash, directional shield and friendly-fire settings prevent boulder injury",()=>{
  const dash=contactFixture();dash.w.dashing=()=>true;dash.touch();assert.equal(dash.impacts.length,0);assert.equal(dash.b.vx,500);
  const shield=contactFixture();Object.assign(shield.w,{shielding:()=>true,shieldCovers:()=>true,shieldAim:()=>({x:-1,y:0})});shield.touch();assert.equal(shield.impacts.length,0);assert(shield.b.vx<0);
  const friendly=contactFixture();friendly.b.ownerTeam=0;friendly.w.friendlyFire=false;friendly.touch();assert.equal(friendly.impacts.length,0);
});
check("grounded hits flatten without damage; airborne hits deal damage and launch using shared stun",()=>{
  for(const ground of [true,false]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control"});const f=d.fighters[0],b=d.dashball.state.ball,health=f.health;
    Object.assign(f,{x:1000,y:ground?d.dashball.arena.floorY-f.data.height/2:900,prevX:1000,prevY:900,onGround:ground,invulnerable:0,vx:0,vy:0});Object.assign(b,{x:ground?860:730,y:ground?d.dashball.arena.floorY-b.r:900,vx:700,vy:0,ownerTeam:-1,ownerId:null});d.dashball.ballStep(0);
    assert(f.hitstun>0);assert(f.knockdownTimer>0);assert.equal(f.stunType,ground?"boulderFlatten":"knockdown");assert.equal(f.health<health,!ground);if(ground){assert.equal(d.getAssetAnimation(0).clip,"death");assert.equal(f.health,health);}else assert(f.vx>300);
    assert(!d.dashball.state.ball.carrier);assert.equal(f.data.width,46);assert.equal(f.data.height,66);const after=f.health;d.dashball.ballStep(0);assert.equal(f.health,after);
    if(ground){assert.equal(d.getAssetAnimation(0).frame,12);b.x=1800;b.vx=0;const y=f.y;for(let i=0;i<45;i++){d.gravity.physics(0);assert(Math.abs(f.y-y)<.01);assert(f.onGround);assert.equal(d.getAssetAnimation(0).clip,"death");}}
  }
});
check("successful native Punch contacts protect the striker, preserve resources and add normal impulse",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"boulder-control"});const f=d.fighters[0],b=d.dashball.state.ball;Object.assign(f,{x:1000,y:900,onGround:false,invulnerable:0,airDashes:0});Object.assign(b,{x:730,y:900,vx:700,vy:0});const health=f.health;
  assert(d.dashball.shot(0,{id:901,dir:{x:-1,y:0},charge:1,grounded:false,hitTargets:new Set()}));d.dashball.ballStep(0);assert.equal(f.health,health);assert.equal(f.hitstun,0);assert.equal(f.airDashes,f.data.maxAirDashes);
});
check("KO markers stay inside each character footprint, upright under gravity and disappear at respawn",()=>{
  for(const key of ["orbit","chungus","boomerangus","defiplate"]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"gravity-boulder"},{characters:[key,"spike"]});const f=d.fighters[0];Object.assign(f,{x:800,y:700});d.dashball.knockout(0);for(const sign of [-1,1]){d.gravity.setDirection("y",sign);const m=d.sportsPresentation.marker(0);assert(m.w<=f.data.width&&m.h<=f.data.height);assert.equal(m.x+m.w/2,800);assert.equal(m.y+m.h/2,700);const hash=g.rb.hash();d.stagePresentation.draw();assert.equal(g.rb.hash(),hash);}d.dashball.state.respawns[f.id]=.001;d.dashball.step();assert.equal(d.sportsPresentation.marker(0),null);}
});
check("heavyweight pixel treatment leaves design sheets, frame anchors/timing and fighter statistics unchanged",()=>{
  const now=createGame(),old=createGame(oldRoot),a=now.sandbox.window.DASH_PUNCH_ART.spriteSets,b=old.sandbox.window.DASH_PUNCH_ART.spriteSets;
  const clips=set=>Object.fromEntries(Object.entries(set.clips).map(([k,v])=>[k,Object.fromEntries(Object.entries(plain(v)).filter(([key])=>!["src","unarmedSrc","image"].includes(key)))]));
  for(const key of ["chungus","boomerangus"]){for(const g of [now,old])g.rb.setup({characterKeys:[key,"orbit"]});assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));const name=now.debug.fighters[0].data.spriteSet;assert.deepEqual(clips(a[name]),clips(b[name]));assert.equal(a[name].pixelGrid,46);assert.equal(a[name].scaleGrid,52);for(const field of ["width","height","foot","pivotX","bodyHeight"])assert.equal(a[name][field],b[name][field]);}
  const s=a.boomerangus.boomerangSprite;assert.equal(s.pixelGrid,28);for(const field of ["src","width","height","frames","fps","scale"])assert.equal(s[field],b.boomerangus.boomerangSprite[field]);
});
check("continuous Field Goal scores replace only the ball and leave players, resources and respawns intact",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal",teamSize:3,winningScore:1});const s=d.dashball.state;d.dashball.knockout(2);const f=d.fighters[0];Object.assign(f,{x:900,y:800,vx:123,vy:-50,airDashes:2});const before=[f.x,f.y,f.vx,f.vy,f.airDashes,s.respawns.p3],old=s.ball,goal=d.dashball.arena.goals[1];Object.assign(old,{x:goal.line-50,y:goal.bottom-100,vx:2000,vy:-100});for(let i=0;i<4;i++)d.dashball.ballStep();assert.deepEqual([f.x,f.y,f.vx,f.vy,f.airDashes,s.respawns.p3],before);assert.notEqual(s.ball,old);assert(s.ball.y<150);assert.equal(s.scores[0],1);assert.equal(s.phase,"playing");assert.equal(s.winner,null);
});
check("goal frames are decorative only: fighters, balls and projectiles pass through every frame part",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal"},{characters:["gunman","spike"]});const stage=d.dashball.arena,goal=stage.goals[0],f=d.fighters[0],other=d.fighters[1];assert.equal(stage.goalFrames.length,8);assert(!d.terrainArt.rects.some(r=>r.fieldGoalPart));
  for(const part of stage.goalFrames){Object.assign(other,{x:part.x+part.w/2,y:part.y+part.h/2,prevX:part.x+part.w/2,prevY:part.y+part.h/2,vx:0,vy:0,onGround:false});const p=[other.x,other.y];d.resolveTerrain(1);assert.deepEqual([other.x,other.y],p);}
  Object.assign(other,{x:1500,y:500,prevX:1500,prevY:500});Object.assign(f,{x:800,y:500,invulnerable:0,onGround:false});Object.assign(d.dashball.state.ball,{x:goal.line-50,y:goal.bottom+30,vx:1500,vy:0});for(let i=0;i<6;i++)d.dashball.ballStep();assert(d.dashball.state.ball.x>goal.line);assert.deepEqual(plain(d.dashball.state.scores),[0,0]);
  Object.assign(d.dashball.state.ball,{x:1300,y:400});for(const held of [true,false]){Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(0);}const a=f.attack;d.updateAttack(0,a.startup+1e-9);Object.assign(a.projectile,{x:goal.line-80,y:goal.bottom+30,vx:2000,vy:0,speed:2000});for(let i=0;i<6;i++)d.updateProjectiles(.02);assert(a.projectile.x>goal.line+100);assert(a.projectile.vx>0);
});
check("new boulder impacts and continuous goal drops survive snapshot, replay and delayed rollback",()=>{
  for(const arena of ["field-goal","boulder-control","gravity-boulder","total-rush"]){const a=createGame(),b=createGame();for(const g of [a,b]){g.debug.dashball.setup({arena},{seed:942});if(arena==="field-goal"){const s=g.debug.dashball.state,goal=g.debug.dashball.arena.goals[1];Object.assign(s.ball,{x:goal.line-120,y:goal.bottom-100,vx:1500,vy:0});}else{const f=g.debug.fighters[0],ball=g.debug.dashball.state.ball;Object.assign(f,{x:1000,y:900,prevX:1000,prevY:900,invulnerable:0});Object.assign(ball,{x:730,y:900,vx:700,vy:0});}}
    const start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];for(let i=0;i<120;i++){const row=[0,1].map(n=>R.encode({aimX:n?-1:1,aimY:-.2,punchHeld:(i+n*7)%41<5,dashHeld:i%51<5}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());
  }
});
check("unmodified sports and Versus retain pre-change simulation hashes without changing baselines",()=>{
  for(const name of ["standard:battle","standard:court","standard-open:battle","elevated:battle","elevated-open:battle","gravity-soccer:battle","gravity-soccer-open:battle","golden-rush:battle","target-break:battle","target-charge-roaming:battle","race","brawl","scramble","versus"])assert.deepEqual(hashes(name,90),hashes(name,90,oldRoot),name);
});
console.log(`${groups} sports refinement groups passed`);
