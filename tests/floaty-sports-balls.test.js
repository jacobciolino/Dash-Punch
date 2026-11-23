"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),D=require("../dashball"),G=require("../sports-guide"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const root=process.env.CORE_RELEASE_DIR||process.cwd(),prior=path.resolve("exports/Dash-Punch-Wide-Courts-Whirlwell-Final-2026-11-15"),Old=require(path.join(prior,"dashball.js")),plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`),dt=1/60;
const ids=D.ARENAS.map(a=>a.id).filter(D.isFloatBallArena),keys=Object.keys(D.FLOAT_BALL_DEFAULTS);let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(api,id){let seed=42;const stage=api.arena(id),state=api.create({arena:id},stage),world={stage,gravity:{x:0,y:1},fighters:[],terrain:()=>stage.terrain.concat(stage.ballOnly||[]),attacks:()=>[],attackTouches:()=>false,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}};return {stage,state,world,ball:api.balls(state).find(b=>!api.isBoulderBall(state,b)),tick(){api.step(state,dt,world);}};}
function canonical(g){const s=plain(g.rb.save().core);s.stageIndex=0;for(const f of s.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(s);}
check("six target/Quidditch stages use slightly lower gravity and stronger momentum retention",()=>{
  assert.equal(ids.length,6);for(const id of ids){const c=D.options({arena:id}),old=Old.options({arena:id});for(const key of keys)assert.equal(c[key],D.FLOAT_BALL_DEFAULTS[key],`${id}/${key}`);for(const key of ["maxSpeed","ballRadius","knockdownSpeed","targetImpactSpeed","goldenReward","goldenRespawn"])assert.equal(c[key],old[key]);assert.deepEqual(D.arena(id),Old.arena(id));}
  near(900/1050,6/7);assert(.84/.73>1.14&&.84/.73<1.16);
});
check("Total Rush changes only small-ball physics, never the boulder or golden target",()=>{
  const now=fixture(D,"total-rush"),old=fixture(Old,"total-rush");assert.deepEqual(now.state.config,old.state.config);assert.deepEqual(now.state.golden,old.state.golden);
  assert.deepEqual(D.ballConfig(now.state,now.state.ball),Old.ballConfig(old.state,old.state.ball));for(const b of now.state.extraBalls)for(const key of keys)assert.equal(D.ballConfig(now.state,b)[key],D.FLOAT_BALL_DEFAULTS[key]);
  assert.equal(D.ballConfig(now.state,now.ball).maxSpeed,Old.ballConfig(old.state,old.ball).maxSpeed);
});
check("old saved defaults upgrade once while custom physics, score settings and snapshots remain exact",()=>{
  for(const id of ids){const input=Old.options({arena:id,winningScore:75,teamSize:3}),copy=plain(input),up=D.savedOptions(input);assert.deepEqual(input,copy);for(const key of keys)assert.equal(up[key],D.FLOAT_BALL_DEFAULTS[key]);assert.equal(up.winningScore,75);assert.equal(up.teamSize,3);assert.deepEqual(D.savedOptions(up),up);
    const custom={...input,gravity:730,bounce:.81,groundFriction:1.1};for(const key of keys)assert.equal(D.savedOptions(custom)[key],custom[key]);for(const key of keys)assert.equal(D.options(input)[key],input[key],"explicit online/snapshot configuration must not be migrated");
  }
  assert.deepEqual(D.savedOptions(Old.options({arena:"standard"})),Old.options({arena:"standard"}));
});
check("stage switching and rematches retain the proper per-sport values without leaking into Soccer",()=>{
  for(const from of ["standard","total-rush",...ids])for(const to of ["standard","elevated","field-goal","boulder-control",...ids]){const c=G.dashballConfig(D.options({arena:from,duration:300,teamSize:3}),to),expected=D.options({arena:to});for(const key of [...keys,"ballRadius","maxSpeed"])assert.equal(c[key],expected[key],`${from} -> ${to}/${key}`);assert.equal(c.duration,300);assert.equal(c.teamSize,3);const s=D.arena(to),state=D.create(c,s);assert.deepEqual(D.create(state.config,s).config,state.config);}
});
check("an unchanged launch hangs about 17 percent longer, with unchanged horizontal speed and force",()=>{
  const result=[];for(const api of [Old,D]){const f=fixture(api,"golden-rush"),b=f.ball;f.world.terrain=()=>[];Object.assign(b,{x:1400,y:1600,vx:350,vy:-600});let apex=b.y,returned=0;for(let i=1;i<=100;i++){f.tick();apex=Math.min(apex,b.y);if(!returned&&b.y>=1600&&i>3)returned=i;}result.push({apex,returned,vx:b.vx});}
  assert(result[1].apex<result[0].apex-20);assert(result[1].returned/result[0].returned>1.14&&result[1].returned/result[0].returned<1.20);near(result[0].vx,350);near(result[1].vx,350);
  for(const id of ids){const a=fixture(Old,id),b=fixture(D,id),f={id:"p1",team:0,koScored:false,onGround:false,data:{punchKnockback:700,punchDamage:8,width:46,height:66}},attack={id:10,dir:{x:.8,y:-.6},charge:.5};for(const pair of [[Old,a],[D,b]])pair[0].shot(pair[1].state,f,attack,pair[1].world,false,pair[1].ball);near(a.ball.vx,b.ball.vx);near(a.ball.vy,b.ball.vy);}
});
check("wall/ground rebounds preserve moderately more speed without adding energy or raising the cap",()=>{
  for(const id of ids){const results=[];for(const api of [Old,D]){const f=fixture(api,id),b=f.ball;f.world.terrain=()=>[{x:1700,y:24,w:24,h:2100,kind:"wall"}];Object.assign(b,{x:1700-b.r-2,y:900,vx:1000,vy:0});f.tick();assert(b.vx<0);assert(Math.abs(b.vx)<1000);results.push(Math.abs(b.vx));}near(results[1]/results[0],.84/.73);}
  const distances=[];for(const api of [Old,D]){const f=fixture(api,"golden-rush"),b=f.ball;Object.assign(b,{x:1000,y:f.stage.floorY-b.r-.01,vx:500,vy:0});const x=b.x;for(let i=0;i<90;i++)f.tick();distances.push(b.x-x);}assert(distances[1]>distances[0]*1.03);
});
check("target impact charge, permanent ownership, contact deduplication and impulse caps are unchanged",()=>{
  assert.deepEqual(D.targetCharge.ANCHORS,Old.targetCharge.ANCHORS);for(const speed of [0,1,200,300,400,600,800,1000,1400,1800,2200,99999])assert.equal(D.targetCharge.chargeUnits(speed),Old.targetCharge.chargeUnits(speed));
  const f=fixture(D,"target-charge-stationary"),b=f.ball,t=f.state.targetCharge.target,r=t.r+b.r;Object.assign(b,{x:t.x-r+.1,y:t.y,vx:1000,vy:0,ownerTeam:1});D.targetCharge.collide(f.state,b,{x:t.x-r-1,y:t.y},{x:t.x,y:t.y},f.world);assert.equal(f.state.targetCharge.pending[0],14*60000);assert.equal(f.state.targetCharge.pending[1],0);assert.equal(b.scoringTeam,0);assert(b.vx<0);const award=f.state.targetCharge.pending[0];for(let i=0;i<10;i++)D.targetCharge.collide(f.state,b,{x:b.x,y:b.y},{x:t.x,y:t.y},f.world);assert.equal(f.state.targetCharge.pending[0],award);
});
check("snapshot/replay, 30/60/120 Hz and late-input rollback preserve the floatier configuration",()=>{
  for(const id of [...ids,"total-rush"]){const a=createGame(root),b=createGame(root);for(const g of [a,b])g.debug.dashball.setup({arena:id},{characters:["orbit","boomerangus"],seed:137});const start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
    for(let i=0;i<100;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:-.5,dashHeld:(i+n*7)%41<9,punchHeld:(i+n*9)%29<8}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>5){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),id);const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());
    const hashes=[];for(const hz of [30,60,120]){const g=createGame(root);g.debug.dashball.setup({arena:id},{seed:19});g.debug.matchFlow.begin({countdown:false});for(let i=1;i<=hz;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
  }
});
check("ten native CPUs remain finite and deterministic in every affected sport",()=>{
  for(const id of [...ids,"total-rush"]){const games=[createGame(root),createGame(root)];for(const g of games)g.debug.dashball.setup({arena:id,teamSize:5},{characters:["edgebert","boomerangus","gunman","archer","kite"],ai:true,seed:733});for(let i=0;i<120;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());const d=games[0].debug;assert(d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));assert(D.balls(d.dashball.state).every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)));}}
});
check("all fourteen fighters and unrelated sports retain the immediately previous build's exact behavior",()=>{
  const a=createGame(prior),b=createGame(root),oldNames=plain(a.rb.stageNames);assert.deepEqual(plain(b.rb.stageNames).filter(n=>oldNames.includes(n)),oldNames);for(const key of a.rb.characterKeys){for(const g of [a,b])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:5});assert.deepEqual(plain(a.debug.fighters[0].data),plain(b.debug.fighters[0].data));for(let i=0;i<40;i++){const row=[{aimX:1,dashHeld:i%31<7,punchHeld:i%23<5},{aimX:-1}];a.rb.step(row);b.rb.step(row);assert.equal(canonical(a),canonical(b),key);}}
  for(const {id} of D.ARENAS.filter(({id})=>!D.isFloatBallArena(id)&&id!=="total-rush")){for(const g of [a,b])g.debug.dashball.setup({arena:id,teamSize:3},{ai:true,seed:733});for(let i=0;i<90;i++){a.debug.dashball.step();b.debug.dashball.step();assert.equal(canonical(a),canonical(b),id);}}
});
console.log(`${groups} floaty sports-ball groups passed`);
