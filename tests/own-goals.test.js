"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,arenas=["standard","standard-open","gravity-soccer","gravity-soccer-open","elevated","elevated-open"];
let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(arena,team,ruleset="battle"){
  const stage=D.arena(arena),state=D.create({arena,ruleset},stage),goal=stage.goals[team],basket=goal.line===undefined,sign=team?1:-1;
  const f={id:"defender",team,x:basket?(goal.left+goal.right)/2:goal.line-sign*45,y:basket?goal.top-45:(goal.top+goal.bottom)/2,
    vx:0,vy:0,invulnerable:0,data:{punchDamage:12,punchKnockback:800},shielding:false};
  f.prevX=f.x;f.prevY=f.y;
  const world={stage,gravity:{x:0,y:1},fighters:[f],terrain:()=>stage.terrain.concat(stage.ballOnly||[]),body:p=>({x:p.x-23,y:p.y-33,w:46,h:66}),
    attacks:()=>[],attackTouches:()=>false,shielding:p=>p.shielding,shieldCovers:()=>true,shieldPadding:()=>24,
    shieldAim:()=>({x:basket?0:sign,y:basket?1:0}),kicking:()=>false};
  return {stage,state,world,f,goal,basket,sign,tick(n=1){for(let i=0;i<n;i++)D.step(state,dt,world);}};
}
check("shield rebounds across the own goal line or basket opening award the opposing team once",()=>{
  for(const arena of arenas)for(const team of [0,1])for(const ruleset of ["court","battle"]){
    const t=fixture(arena,team,ruleset),b=t.state.ball;t.f.shielding=true;
    Object.assign(b,{x:t.basket?t.f.x:t.f.x+t.sign*27,y:t.basket?t.f.y+40:t.f.y,vx:t.basket?0:-t.sign*700,vy:t.basket?-700:0});
    t.tick(30);assert.equal(t.state.scores[1-team],1,`${arena}/${team}/${ruleset}`);assert.equal(t.state.scores[team],0);assert.equal(t.state.goalSerial,1);
  }
});
check("ordinary own shots score regardless of last touch, speed, or friendly fire",()=>{
  for(const arena of arenas)for(const team of [0,1])for(const ownerTeam of [-1,team,1-team])for(const speed of [180,2050]){
    const t=fixture(arena,team),b=t.state.ball;t.world.fighters=[];t.world.friendlyFire=ownerTeam===team;
    Object.assign(b,{x:t.basket?t.f.x:t.goal.line-t.sign*35,y:t.basket?t.goal.top-35:t.goal.bottom-b.r-.01,
      vx:t.basket?0:t.sign*speed,vy:t.basket?speed:0,ownerTeam,ownerId:"last-touch",launched:2});
    t.tick(30);assert.equal(t.state.scores[1-team],1,`${arena}/${team}/${ownerTeam}/${speed}`);assert.equal(t.state.goalSerial,1);
  }
});
check("shield displacement cannot score through solid geometry, from behind, or during possession",()=>{
  for(const arena of ["standard","elevated"])for(const team of [0,1])for(const invalid of ["wall","capture","overlap","rear","body"]){
    const t=fixture(arena,team),b=t.state.ball;t.f.shielding=true;
    Object.assign(b,{x:t.basket?t.f.x:t.f.x+t.sign*27,y:t.basket?t.f.y+40:t.f.y,vx:t.basket?0:-t.sign*700,vy:t.basket?-700:0});
    if(invalid==="wall")t.stage.terrain.push(t.basket?{x:b.x-50,y:t.goal.top-8,w:100,h:12,kind:"wall"}:{x:t.goal.line-6,y:b.y-70,w:12,h:140,kind:"wall"});
    if(invalid==="capture")t.f.data.shieldThornsDamage=5;
    if(invalid==="body")t.f.shielding=false;
    if(invalid==="overlap"){t.world.fighters=[];Object.assign(b,{x:t.basket?t.f.x:t.goal.line+t.sign*30,y:t.basket?t.goal.top+30:t.f.y,vx:0,vy:0});}
    if(invalid==="rear"){
      t.f.x=t.basket?t.goal.left-45:t.goal.line+t.sign*45;t.f.prevX=t.f.x;
      t.f.y=t.basket?t.goal.top+90:t.f.y;t.f.prevY=t.f.y;
      t.world.shieldAim=()=>({x:t.basket?1:-t.sign,y:0});
      Object.assign(b,{x:t.f.x+(t.basket?27:-t.sign*27),y:t.f.y,vx:0,vy:0});
    }
    t.tick(4);assert.deepEqual(t.state.scores,[0,0],`${arena}/${team}/${invalid}`);
  }
});
check("cross-seam shield rebounds do not sweep across the field or create phantom own goals",()=>{
  for(const arena of ["standard-open","gravity-soccer-open","elevated-open"])for(const side of [-1,1]){
    const t=fixture(arena,side<0?0:1),b=t.state.ball;
    t.f.x=side<0?10:t.stage.width-10;t.f.prevX=t.f.x;t.f.shielding=true;
    t.world.shieldAim=()=>({x:side,y:0});
    Object.assign(b,{x:side<0?t.stage.width-15:15,y:t.f.y,vx:-side*300,vy:0});
    t.tick();assert.equal(b.ownerId,t.f.id);assert.deepEqual(t.state.scores,[0,0],`${arena}/${side}`);assert.equal(t.state.goalSerial,0);
  }
});
check("native punches can score own goals and baskets for either side without changing fighter teams",()=>{
  for(const arena of ["standard","elevated"])for(const team of [0,1]){
    const g=createGame(),d=g.debug;d.dashball.setup({arena},{characters:["edgebert","edgebert"],ai:false});
    const f=d.fighters[team],goal=d.dashball.arena.goals[team],b=d.dashball.state.ball,basket=arena==="elevated",sign=team?1:-1;
    const x=basket?(goal.left+goal.right)/2:goal.line-sign*120,y=basket?goal.top-105:d.dashball.arena.floorY-f.data.height/2;
    Object.assign(f,{x,y,prevX:x,prevY:y,onGround:!basket,vx:0,vy:0,invulnerable:0});Object.assign(d.fighters[1-team],{x:1280,y:400});
    Object.assign(b,{x:x+(basket?0:sign*60),y:basket?y+62:d.dashball.arena.floorY-b.r-.01,vx:0,vy:0});
    for(let i=0;i<45;i++){const row=[R.decode(R.neutral()),R.decode(R.neutral())];row[team]=R.decode(R.encode({hasAim:true,aimX:basket?0:sign,aimY:basket?1:0,punchHeld:i===0}));g.rb.step(row);}
    assert.equal(d.dashball.state.scores[1-team],1);assert.equal(b.ownerTeam,team);assert.equal(f.team,team);
  }
});
check("native walking dribbles into either own Soccer goal score under Court and Battle",()=>{
  for(const arena of ["standard","standard-open","gravity-soccer","gravity-soccer-open"])for(const ruleset of ["court","battle"])for(const team of [0,1])for(const distance of [60,90,140]){
    const g=createGame(),d=g.debug;d.dashball.setup({arena,ruleset},{characters:["orbit","orbit"],ai:false});
    const f=d.fighters[team],goal=d.dashball.arena.goals[team],b=d.dashball.state.ball,sign=team?1:-1,x=goal.line-sign*distance,y=d.dashball.arena.floorY-f.data.height/2;
    Object.assign(f,{x,y,prevX:x,prevY:y,onGround:true,vx:0,vy:0,invulnerable:0});Object.assign(d.fighters[1-team],{x:1280,y:400});
    Object.assign(b,{x:x+sign*50,y:d.dashball.arena.floorY-b.r-.01,vx:0,vy:0});
    for(let i=0;i<45;i++){const row=[R.decode(R.neutral()),R.decode(R.neutral())];row[team]=R.decode(R.encode({hasAim:true,aimX:sign}));g.rb.step(row);}
    assert.equal(d.dashball.state.scores[1-team],1,`${arena}/${ruleset}/${team}/${distance}`);assert.equal(d.dashball.state.goalSerial,1);
  }
});
function nativeShield(game,arena,team=1){
  const d=game.debug;d.dashball.setup({arena},{characters:["orbit","orbit"],ai:false,seed:912});
  const f=d.fighters[team],goal=d.dashball.arena.goals[team],b=d.dashball.state.ball,basket=goal.line===undefined,sign=team?1:-1;
  const x=basket?(goal.left+goal.right)/2:goal.line-sign*45,y=basket?goal.top-45:(goal.top+goal.bottom)/2,dir={x:basket?0:sign,y:basket?1:0};
  Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,invulnerable:0,chargingPunch:true,punchInputHeld:true,punchCharge:.3,punchAim:dir,aim:dir});
  Object.assign(d.fighters[1-team],{x:1280,y:400});
  Object.assign(b,{x:basket?x:x+sign*27,y:basket?y+40:y,vx:basket?0:-sign*700,vy:basket?-700:0});
  return R.encode({hasAim:true,aimX:dir.x,aimY:dir.y,punchHeld:true});
}
function nativeDribble(game,arena,team=1){
  const d=game.debug;d.dashball.setup({arena},{characters:["orbit","orbit"],ai:false,seed:912});
  const f=d.fighters[team],goal=d.dashball.arena.goals[team],b=d.dashball.state.ball,sign=team?1:-1,x=goal.line-sign*90,y=d.dashball.arena.floorY-f.data.height/2;
  Object.assign(f,{x,y,prevX:x,prevY:y,onGround:true,vx:0,vy:0,invulnerable:0});Object.assign(d.fighters[1-team],{x:1280,y:400});
  Object.assign(b,{x:x+sign*50,y:d.dashball.arena.floorY-b.r-.01,vx:0,vy:0});
  return R.encode({hasAim:true,aimX:sign});
}
check("native shield and dribble own goals survive snapshots, replay and delayed remote inputs without duplicate awards",()=>{
  for(const arena of arenas)for(const contact of arena.startsWith("elevated")?["shield"]:["shield","dribble"]){
    const games=[createGame(),createGame()];const held=games.map(g=>(contact==="shield"?nativeShield:nativeDribble)(g,arena));
    const [a,b]=games,start=a.rb.save(),manager=b.rb.manager(0,8),pending=[];
    for(let i=0;i<45;i++){
      const remote=contact==="dribble"||i<4?held[0]:R.neutral();pending.push({frame:i,input:remote});
      if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}
      manager.advance(R.neutral());a.rb.step([R.decode(R.neutral()),R.decode(remote)]);
    }
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();
    assert.equal(a.rb.hash(),b.rb.hash(),arena);assert.equal(a.debug.dashball.state.scores[0],1,arena);assert.equal(a.debug.dashball.state.goalSerial,1);assert(manager.rollbacks>0);
    const end=a.rb.hash();b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());
    a.rb.restore(start);for(let i=0;i<45;i++)a.rb.step([R.decode(R.neutral()),R.decode(contact==="dribble"||i<4?held[0]:R.neutral())]);assert.equal(a.rb.hash(),end);
    a.debug.dashball.setup({arena},{characters:["orbit","orbit"]});assert.deepEqual([...a.debug.dashball.state.scores],[0,0]);assert.equal(a.debug.dashball.state.goalSerial,0);
  }
});
check("fixed-step own-goal scoring agrees at 30/60/120 Hz",()=>{
  for(const arena of ["standard","elevated"])for(const contact of arena==="elevated"?["shield"]:["shield","dribble"]){const hashes=[];
    for(const hz of [30,60,120]){
      const g=createGame();(contact==="shield"?nativeShield:nativeDribble)(g,arena,0);g.debug.matchFlow.begin({countdown:false});
      const dir=arena==="standard"?"KeyA":"KeyS";
      for(const code of contact==="shield"?[dir,"KeyF"]:[dir])g.listeners.get("keydown")({code,repeat:false,preventDefault(){}});
      for(let i=1;i<=hz/2;i++)g.render(1000+i*1000/hz+.001);
      assert.equal(g.debug.dashball.state.scores[1],1,`${arena}/${hz}`);hashes.push(g.rb.hash());
    }
    assert.equal(hashes[0],hashes[1],arena);assert.equal(hashes[0],hashes[2],arena);
  }
});
check("all fourteen fighters and other sports preserve the previous release's deterministic behavior",()=>{
  const path=require("node:path"),old=createGame(path.resolve("exports/Dash-Punch-Dash-Controls-2026-11-14")),now=createGame(),plain=x=>JSON.parse(JSON.stringify(x));
  const canonical=g=>{const s=plain(g.rb.save().core);s.stageIndex=0;
    for(const f of s.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])
      if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");
    return R.hash(s);
  };
  for(const key of old.rb.characterKeys){
    for(const g of [old,now]){g.debug.dashball.standard();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:512});}
    assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data),key);
    for(let i=0;i<90;i++){const row=[0,1].map(n=>R.decode(R.encode({hasAim:true,aimX:n?-1:1,aimY:-.2,punchHeld:(i+n*7)%31<8,dashHeld:i%43<9})));old.rb.step(row);now.rb.step(row);assert.equal(canonical(now),canonical(old),`${key}:${i}`);}
  }
  for(const arena of old.sandbox.Dashball.ARENAS.map(a=>a.id)){
    for(const g of [old,now])g.debug.dashball.setup({arena,teamSize:3},{characters:["edgebert","boomerangus","gunman","archer","kite","spike"],ai:true,seed:623});
    for(let i=0;i<120;i++){old.debug.dashball.step();now.debug.dashball.step();assert.equal(canonical(now),canonical(old),`${arena}:${i}`);}
  }
  for(const ruleset of ["race","brawl","scramble"]){
    for(const g of [old,now])g.debug.sandbag.setup({ruleset,teamSize:3},{characters:["orbit","spike","archer"],ai:true,seed:716});
    for(let i=0;i<120;i++){old.debug.sandbag.step();now.debug.sandbag.step();assert.equal(canonical(now),canonical(old),`${ruleset}:${i}`);}
  }
});
console.log(`${groups} own-goal groups passed`);
