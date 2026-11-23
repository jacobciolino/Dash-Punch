"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),V=require("../arena-variants"),D=require("../dashball"),R=require("../rollback"),G=require("../sports-guide"),{createGame}=require("./simulation-harness");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),prior=path.resolve("exports/Dash-Punch-Four-Way-Golden-Rush-Release-2026-11-15"),plain=x=>JSON.parse(JSON.stringify(x)),dt=1/60;let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function versus(characters=["orbit","spike"]){const g=createGame(root);g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Whirlwell"),characterKeys:characters,seed:447});return g;}
function sport(arena,options={}){const stage=D.arena(arena,154,options),state=D.create({arena,...options},stage),world={stage,fighters:[],gravity:{x:0,y:1},terrain:()=>stage.terrain.concat(stage.ballOnly),attacks:()=>[],attackTouches:()=>false};return {stage,state,world,tick(n=1){for(let i=0;i<n;i++)D.step(state,dt,world);}};}
check("two closed courts are exactly 1.75x wide without resizing goals, platforms, height or physics",()=>{
  for(const [id,{base}]of Object.entries(V.WIDE)){
    const a=D.arena(base),b=D.arena(id),delta=b.width-a.width;assert.equal(b.width,4480);assert.equal(b.width/a.width,1.75);assert.equal(b.height,a.height);assert.equal(b.floorY,a.floorY);assert.equal(b.wrap,false);
    assert.deepEqual(b.goals[0],a.goals[0]);assert.equal(b.goals[1].line,a.goals[1].line+delta);assert.equal(b.goals[1].top,a.goals[1].top);assert.equal(b.goals[1].bottom,a.goals[1].bottom);assert.equal(b.goals[0].line+b.goals[1].line,b.width);
    assert(b.terrain.some(t=>t.x===b.width-24&&t.w===24));assert(b.terrain.some(t=>t.y===0&&t.w===b.width-48));
    const c=D.options({arena:id}),old=D.options({arena:base});delete c.arena;delete old.arena;assert.deepEqual(c,old);
    assert.match(G.scene("dashball",{arena:id}).guide.twist,/1.75x/);assert(b.cameraZoom*b.width<=1248.001);
    if(base==="field-goal"){assert.equal(b.goalFrames.length,8);assert(!b.terrain.some(t=>t.fieldGoalPart));assert.equal(b.terrain.find(t=>t.fieldGoalPerch===1).x-a.terrain.find(t=>t.fieldGoalPerch===1).x,delta);}
  }
});
check("wide Soccer scores normal/own goals on both ends in Court and Battle, then resets at new midfield",()=>{
  for(const ruleset of ["court","battle"])for(const team of [0,1])for(const ownerTeam of [0,1]){
    const t=sport("standard-wide",{ruleset}),b=t.state.ball,g=t.stage.goals[team],sign=team?1:-1;
    Object.assign(b,{x:g.line-sign*40,y:g.bottom-b.r-.01,vx:sign*1500,vy:0,ownerTeam});t.tick(4);assert.equal(t.state.scores[1-team],1);assert.equal(t.state.goalSerial,1);t.tick(10);assert.equal(t.state.goalSerial,1);
    assert(D.clock(t.state,1.3,t.stage).reset);assert.equal(t.state.ball.x,2240);
  }
});
check("wide Field Goal stays continuous, retains visual-only posts and drops only the scored ball",()=>{
  for(const team of [0,1])for(const ruleset of ["court","battle"]){const t=sport("field-goal-wide",{ruleset}),b=t.state.ball,g=t.stage.goals[team],sign=team?1:-1;
    Object.assign(b,{x:g.line-sign*30,y:g.bottom-b.r-5,vx:sign*1700,vy:0});t.tick(4);assert.equal(t.state.scores[1-team],1);assert.equal(t.state.phase,"playing");assert.notEqual(t.state.ball,b);assert.equal(t.state.ball.x,2240);assert(t.state.ball.y<150);
    const bad=sport("field-goal-wide"),bb=bad.state.ball;Object.assign(bb,{x:g.line-sign*30,y:g.bottom+bb.r+30,vx:sign*1700,vy:0});bad.tick(4);assert.deepEqual(bad.state.scores,[0,0]);
  }
});
check("wide courts spawn ten fighters symmetrically and Court still constrains only the fighters",()=>{
  for(const arena of Object.keys(V.WIDE))for(const ruleset of ["court","battle"]){const g=createGame(root),d=g.debug;d.dashball.setup({arena,ruleset,teamSize:5},{characters:["chungus","boomerangus","orbit","spike"]});assert.equal(d.fighters.length,10);
    for(let i=0;i<5;i++)assert.equal(d.fighters[i*2].x+d.fighters[i*2+1].x,4480);
    for(const f of d.fighters){assert(f.x>24+f.data.width/2&&f.x<4480-24-f.data.width/2);Object.assign(f,{x:f.team?1700:2700,vx:f.team?-200:200});D.constrain(d.dashball.state,f,d.dashball.arena);if(ruleset==="court")assert(f.team?f.x-f.data.width/2>2240:f.x+f.data.width/2<2240);}
  }
});
check("Whirlwell has an open sky, wrapping sides, level split floor and a Chungus-size return pit",()=>{
  const s=V.rotorArena(118),floors=s.terrain.filter(t=>t.kind==="floor");assert(s.wrap);assert(s.cameraOpenTop);assert(!s.verticalWrap);assert.equal(s.hole.width,160);assert.equal(floors.length,2);assert(floors.every(t=>t.y===s.floorY));assert.equal(floors[0].w,s.hole.x);assert.equal(floors[1].x,s.hole.x+s.hole.width);assert(!s.terrain.some(t=>t.y<=0));assert.equal(s.rotor.radius*2,320);assert(s.floorY-(s.rotor.y+s.rotor.radius)>176);
  const faces=s.terrain.filter(t=>t.rotorSurface);assert(faces.length>20);assert.equal(new Set(faces.map(t=>t.surfaceId)).size,1);
});
check("all fourteen fighters fit through the pit and keep velocity, hitstun, attack and resources",()=>{
  const keys=createGame(prior).rb.characterKeys;
  for(const key of keys){const g=versus([key,"spike"]),reference=versus([key,"spike"]),d=g.debug,f=d.fighters[0],s=d.arena.definition;
    const pose={x:s.width/2,y:s.height+f.data.height/2+60,prevX:s.width/2,prevY:s.height+f.data.height/2+60,vx:130,vy:420,onGround:false,hitstun:.3,stunType:"knockdown",airDashes:0};Object.assign(f,pose);Object.assign(reference.debug.fighters[0],pose,{x:100,prevX:100});const hp=f.health;
    d.gravity.physics(0,0);reference.debug.gravity.physics(0,0);assert(f.y<0,key);assert.equal(f.vx,reference.debug.fighters[0].vx);assert.equal(f.vy,reference.debug.fighters[0].vy);assert.equal(f.hitstun,.3);assert.equal(f.health,hp);assert.equal(f.airDashes,0);assert(Math.abs(f.prevY-f.y)<.01);
    Object.assign(f,{x:s.width/2,y:-f.data.height-100,prevY:-f.data.height-100,vy:-100,onGround:false,hitstun:0});d.gravity.physics(0,0);assert(f.y<0,"open ceiling must not warp downward");
  }
});
check("falling through the pit returns fighters onto the wheel and sides wrap without bouncing",()=>{
  const g=versus(["chungus","spike"]),d=g.debug,f=d.fighters[0],s=d.arena.definition;Object.assign(f,{x:800,y:s.height+f.data.height/2+60,vx:0,vy:500,onGround:false});d.gravity.physics(0,0);assert(f.y<0);
  for(let i=0;i<60;i++){d.advancePlatforms(dt);d.gravity.physics(0);}assert(f.onGround);assert.equal(f.groundTerrainId,s.rotor.surfaceId);
  Object.assign(f,{x:s.width+30,prevX:s.width+30,y:700,vx:400,vy:0,onGround:false});d.gravity.physics(0,0);assert(f.x<0);assert(f.vx>350);assert.equal(f.prevX,f.x);
});
check("wheel rotation carries standing fighters once per step without adding velocity or trapping jumps",()=>{
  for(const key of ["orbit","chungus","boomerangus"]){const g=versus([key,"spike"]),d=g.debug,f=d.fighters[0],s=d.arena.definition;Object.assign(f,{x:800,y:s.rotor.y-s.rotor.radius-f.data.height/2-5,prevX:800,prevY:s.rotor.y-s.rotor.radius-f.data.height/2-5,vx:0,vy:100,onGround:false,hasLiveAim:false});
    for(let i=0;i<10;i++){d.advancePlatforms(dt);d.gravity.physics(0);}assert(f.onGround,key);assert.equal(f.groundTerrainId,s.rotor.surfaceId);const x=f.x;
    for(let i=0;i<45;i++){d.advancePlatforms(dt);d.gravity.physics(0);}assert(f.x>x+40&&f.x<x+100,key);assert.equal(f.hitstun,0);assert(Math.abs(f.vx)<1);
    Object.assign(f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-1}});d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);for(let i=0;i<12;i++){d.advancePlatforms(dt);d.gravity.physics(0);}assert(!f.onGround);assert(f.y<s.rotor.y-s.rotor.radius,key);
  }
});
check("wheel uses curved stepped solids, not an invisible bounding square, with stable wall identity",()=>{
  const g=versus(),d=g.debug,s=d.arena.definition,f=d.fighters[0];Object.assign(f,{x:640,y:320,prevX:640,prevY:320,vx:0,vy:0,onGround:false});d.gravity.physics(0,0);assert.equal(f.x,640);assert.equal(f.y,320);
  const edge=Math.max(...s.terrain.filter(t=>t.rotorSurface).map(t=>t.x+t.w));Object.assign(f,{x:edge+f.data.width/2-2,y:s.rotor.y,prevX:edge+f.data.width/2+5,prevY:s.rotor.y,vx:-100,vy:0,onGround:false,hasLiveAim:true,aim:{x:-1,y:0},airDashes:0});d.resolveTerrain(0);assert(f.wallSliding);assert.equal(f.currentWallId,s.rotor.surfaceId);assert.equal(f.lastResourceWallId,s.rotor.surfaceId);
});
check("snapshots, replay, 30/60/120 Hz and delayed rollback include rotor motion and both wide courts",()=>{
  for(const arena of ["Whirlwell",...Object.keys(V.WIDE)]){
    const games=[createGame(root),createGame(root)];for(const g of games)if(arena==="Whirlwell")g.rb.setup({stageIndex:g.rb.stageNames.indexOf(arena),characterKeys:["orbit","chungus"],seed:66});else g.debug.dashball.setup({arena},{characters:["orbit","chungus"],seed:66});
    const [a,b]=games,start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
    for(let i=0;i<150;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:i%80<30?-.4:0,dashHeld:(i+n*7)%43<8,punchHeld:(i+n*9)%31<7}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),arena);const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());
    const hashes=[];for(const hz of [30,60,120]){const g=createGame(root);if(arena==="Whirlwell")g.rb.setup({stageIndex:g.rb.stageNames.indexOf(arena),characterKeys:["orbit","chungus"],seed:76});else g.debug.dashball.setup({arena},{characters:["orbit","chungus"],seed:76});g.debug.matchFlow.begin({countdown:false});for(let i=1;i<=hz;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
  }
});
check("all three levels support ten native CPUs without nonfinite state or spawn overlap",()=>{
  for(const name of ["Whirlwell",...Object.keys(V.WIDE)]){const games=[createGame(root),createGame(root)];for(const g of games){if(name==="Whirlwell"){g.debug.ai.configure({stageName:name,teamModeId:"teams2",teams:Array.from({length:10},(_,i)=>i%2),characters:["chungus","boomerangus","orbit","spike","rain","edgebert","gunman","archer","kite","whipado"]});g.debug.matchFlow.begin({countdown:false});}else g.debug.dashball.setup({arena:name,teamSize:5},{characters:["chungus","boomerangus","orbit","spike"],ai:true,seed:88});}
    const first=games[0].debug;assert.equal(first.fighters.length,10);if(name==="Whirlwell")for(const f of first.fighters)assert(!first.arena.definition.terrain.some(t=>f.x+f.data.width/2>t.x&&f.x-f.data.width/2<t.x+t.w&&f.y+f.data.height/2>t.y&&f.y-f.data.height/2<t.y+t.h));
    for(let i=0;i<240;i++){for(const g of games)g.debug.arena.stepAI();
      // Versus keeps its existing local randomized CPU decisions. Captured
      // inputs and rotor physics have deterministic replay coverage above.
      if(name!=="Whirlwell")assert.equal(games[0].rb.hash(),games[1].rb.hash(),`${name}/${i}`);
      for(const g of games)assert(g.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));
    }
  }
});
check("existing stage IDs, fourteen fighters and previous sports retain their prior release behavior",()=>{
  const old=createGame(prior),now=createGame(root),oldNames=[...old.rb.stageNames];assert.deepEqual([...now.rb.stageNames].filter(n=>oldNames.includes(n)),oldNames);
  const canonical=g=>{const s=plain(g.rb.save().core);s.stageIndex=0;for(const f of s.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(s);};
  for(const key of old.rb.characterKeys){for(const g of [old,now])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:11});assert.deepEqual(plain(old.debug.fighters[0].data),plain(now.debug.fighters[0].data));for(let i=0;i<60;i++){const row=[{aimX:1,punchHeld:i%31<9,dashHeld:i%43<8},{aimX:-1}];old.rb.step(row);now.rb.step(row);assert.equal(canonical(old),canonical(now),key);}}
  // Requested floatier sports balls have dedicated tuning/replay coverage.
  for(const {id}of old.sandbox.Dashball.ARENAS.filter(({id})=>!D.isFloatBallArena(id)&&id!=="total-rush")){for(const g of [old,now])g.debug.dashball.setup({arena:id,teamSize:3},{characters:["chungus","orbit","boomerangus"],ai:true,seed:83});for(let i=0;i<90;i++){old.debug.dashball.step();now.debug.dashball.step();assert.equal(canonical(old),canonical(now),`${id}/${i}`);}}
});
console.log(`${groups} wide-court / Whirlwell groups passed`);
