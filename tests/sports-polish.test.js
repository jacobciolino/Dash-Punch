"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{createGame}=require("./simulation-harness"),S=require("../sports"),D=require("../dashball"),B=require("../sandbag"),R=require("../rollback");
const dt=1/60;let groups=0;const check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);};
check("shared Battle defaults validate 50% HP, 10/15/20s and two-second protection",()=>{
  for(const arena of D.ARENAS){const c=D.options({arena:arena.id,ruleset:"battle"});assert.equal(c.healthMult,.5);assert.equal(c.respawn,15);for(const respawn of [10,15,20])assert.equal(D.options({...c,respawn}).respawn,respawn);assert.equal(D.options({...c,respawn:1}).respawn,15);}
  for(const ruleset of ["brawl","scramble"]){const c=B.options({ruleset});assert.equal(c.healthMult,.5);assert.equal(c.respawn,15);}
  assert.equal(S.BATTLE_DEFAULTS.protection,2);assert.equal(S.nextRespawn(15,-1),10);assert.equal(S.nextRespawn(15,1),20);
  const g=createGame();g.debug.dashball.setup({ruleset:"court"});assert(g.debug.fighters.every(f=>f.health===f.data.maxHealth));g.debug.dashball.standard();assert(g.debug.fighters.every(f=>f.health===f.data.maxHealth));
});
check("independent respawns leave objectives/scores/timers running, restore resources and end protection on offense",()=>{
  for(const mode of ["standard","elevated","elevated-open","target-break","golden-rush","brawl","scramble"]){
    const g=createGame(),bag=["brawl","scramble"].includes(mode),sports=bag?g.debug.sandbag:g.debug.dashball;
    sports.setup(bag?{ruleset:mode,respawn:10}:{arena:mode,ruleset:"battle",respawn:10});const s=sports.state,[a,b]=g.debug.fighters;s.scores[0]=12;
    sports.knockout(0);sports.step();sports.knockout(1);assert(s.respawns[a.id]<s.respawns[b.id]);const time=s.time;
    for(let n=0;n<599;n++)sports.step();assert(s.time>time);assert.equal(s.scores[0],12);assert(!a.koScored);assert(b.koScored);sports.step();assert(!b.koScored);
    assert(a.invulnerable>1.9&&a.invulnerable<=2);assert.equal(a.airDashes,a.data.maxAirDashes);assert.equal(a.health,Math.round(a.data.maxHealth*.5));
    g.debug.gravity.dash(0,{x:1,y:0},0);assert.equal(a.invulnerable,0);assert(!a.dashballSpawnProtected);
  }
});
check("Edgebert's three active stages catch a moving basketball without altering strike geometry",()=>{
  for(const arena of ["elevated","elevated-open"])for(let stage=0;stage<3;stage++){
    const g=createGame();g.debug.dashball.setup({arena},{characters:["edgebert","orbit"]});const f=g.debug.fighters[0],b=g.debug.dashball.state.ball,SetType=vm.runInContext("Set",g.sandbox);
    Object.assign(f,{x:800,y:700,prevX:800,prevY:700,onGround:false});f.attack={id:900+stage,sequenceStage:stage,age:.1,startup:0,active:.3,recovery:.1,total:.5,charge:0,grounded:false,dir:{x:1,y:0},hitTargets:new SetType()};
    const box=g.debug.getPunchHitbox(0,{x:1,y:0},0);Object.assign(b,{x:box.x+box.w+b.r+12,y:box.cy,vx:-2050,vy:0});
    g.debug.dashball.ballStep();assert.equal(b.ownerId,f.id,`${arena} stage ${stage}`);assert(f.attack===null);assert(b.vx>0);assert.equal(f.punchLockout,0);
  }
});
check("basketball movers are one-way, pass from below and still carry standing fighters",()=>{
  for(const arena of ["elevated","elevated-open"]){const g=createGame();g.debug.dashball.setup({arena});const stage=g.debug.dashball.arena,index=stage.terrain.findIndex(t=>t.dashballMover),p=g.debug.terrainArt.rects[index],f=g.debug.fighters[0];assert.equal(stage.terrain[index].kind,"oneway");
    Object.assign(f,{x:p.x+p.w/2,y:p.y+10,prevX:p.x+p.w/2,prevY:p.y+100,vy:-500,onGround:false});const y=f.y;g.debug.resolveTerrain(0);assert.equal(f.y,y);assert(!f.onGround);
    Object.assign(f,{x:p.x+p.w/2,y:p.y-f.data.height/2+.5,prevY:p.y-f.data.height/2-1,vy:20,onGround:false});g.debug.resolveTerrain(0);assert(f.onGround);const before=f.y;g.debug.advancePlatforms(dt);assert.notEqual(f.y,before);
  }
});
check("sports changes do not change standard replay and cosmetic state cannot change scoring",()=>{
  const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Perch"),seed:11});const saved=g.rb.save(),inputs=[];
  for(let i=0;i<90;i++){const input=[0,1].map(j=>R.decode(R.encode({hasAim:true,aimX:j?-1:1,punchHeld:i%23<3,dashHeld:i%31<2})));inputs.push(input);g.rb.step(input);}const hash=g.rb.hash();g.rb.restore(saved);for(const input of inputs)g.rb.step(input);assert.equal(g.rb.hash(),hash);
  g.debug.dashball.setup({arena:"golden-rush"});const before=g.rb.hash();g.debug.stagePresentation.draw();assert.equal(g.rb.hash(),before);
});
check("authored sports assets are present, small and distinct; only core builds are default",()=>{
  const g=createGame(),art=g.sandbox.window.DASH_PUNCH_ART;
  assert(art.spriteSets.chungusseeker.streamFist.src.includes("chungus-arm"));assert(!art.spriteSets.chungusseeker.magicFist);assert(art.spriteSets.seekerprofist.magicFist.includes("anchor-fist"));
  for(const file of ["assets/dashball/basketball.png","assets/optional/seeker-pro/chungus-arm.png","assets/audio/soccer/kick.wav","assets/audio/soccer/goal.wav","assets/audio/soccer/start.wav"])assert(fs.statSync(file).size>100);
  for(const name of ["Target Break","Golden Rush"])assert.equal(art.backdrops[name],undefined,"sports courts should use their simple background");
  assert.equal(art.stageThemes["orc-arena"],undefined);
  assert.equal(require("../package.json").scripts.build,"node tools/build-release.cjs");
});
console.log(`${groups} sports polish groups passed`);
