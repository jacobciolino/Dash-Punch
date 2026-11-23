"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),neutral=R.decode(R.neutral());let groups=0;
const check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);};
function fixture(arena="standard",options={}){const stage=D.arena(arena,154,options),s=D.create({arena,...options},stage),w={stage,gravity:{x:0,y:1},fighters:[],terrain:()=>stage.terrain.concat(stage.ballOnly||[]),attacks:()=>[],attackTouches:()=>false,shielding:()=>false,kicking:()=>false,body:f=>({x:f.x-23,y:f.y-33,w:46,h:66})};return {s,w,stage,tick(n=1){for(let i=0;i<n;i++)D.step(s,dt,w);}};}
check("Soccer floor shots, fast shots and shallow entries score on either end without precision latches",()=>{
  for(const arena of ["standard","standard-open","gravity-soccer","gravity-soccer-open"])for(const team of [0,1])for(const speed of [180,2050]){const f=fixture(arena),g=f.stage.goals[team],b=f.s.ball,sign=team?1:-1;Object.assign(b,{x:g.line-sign*35,y:g.bottom-b.r-.01,vx:sign*speed,vy:0});f.tick(20);assert.equal(f.s.scores[1-team],1,`${arena}/${team}/${speed}`);assert.equal(f.s.goalSerial,1);}
});
check("Basketball registers a legitimate shallow top entry before the ball later reaches a side wall",()=>{
  for(const arena of ["elevated","elevated-open"]){const f=fixture(arena),g=f.stage.goals[0],b=f.s.ball;Object.assign(b,{x:g.right-51,y:g.top-25,vx:1500,vy:1500});f.tick(3);assert.equal(f.s.scores[1],1,arena);assert.equal(f.s.goalSerial,1);}
});
check("outside/rear/below-bar entries and mere overlap never score; valid Field Goal stays continuous",()=>{
  for(const arena of ["standard","elevated","field-goal"]){const f=fixture(arena),g=f.stage.goals[1],b=f.s.ball;f.s.config.gravity=0;
    if(arena==="elevated")Object.assign(b,{x:g.left-40,y:g.top-5,vx:0,vy:1200});else Object.assign(b,{x:g.line+35,y:arena==="field-goal"?g.bottom-100:(g.top+g.bottom)/2,vx:-1400,vy:0});f.tick(8);assert.deepEqual(f.s.scores,[0,0],arena);
  }
  const f=fixture("field-goal"),g=f.stage.goals[1],b=f.s.ball;Object.assign(b,{x:g.line-20,y:g.bottom-b.r-2,vx:1500,vy:-80});f.tick(3);assert.equal(f.s.scores[0],1);assert.equal(f.s.phase,"playing");assert.notEqual(f.s.ball,b);
});
check("all Golden Rush ring heights use swept field-side entry and retain their awards",()=>{
  for(const team of [0,1])for(const row of [0,1,2]){const f=fixture("golden-rush"),g=f.stage.rings.find(r=>r.team===team&&r.row===row),b=f.s.ball,sign=team?1:-1;Object.assign(b,{x:g.line-sign*30,y:(g.top+g.bottom)/2,vx:sign*2050,vy:250});f.tick(4);assert.equal(f.s.scores[1-team],g.points);assert.equal(f.s.ringPoints[1-team],g.points);f.tick(4);assert.equal(f.s.scores[1-team],g.points);}
});
check("native Edgebert opener hits an actual floor ball and moves it with meaningful force",()=>{
  for(const arena of ["standard","elevated","golden-rush","target-charge-stationary","boulder-control"]){const g=createGame(),d=g.debug;d.dashball.setup({arena},{characters:["edgebert","orbit"]});const f=d.fighters[0],s=d.dashball.state,b=s.ball,floor=d.dashball.arena.floorY;
    const y=s.boulder?floor-b.r:floor-f.data.height/2;Object.assign(f,{x:800,y,prevX:800,prevY:y,onGround:!s.boulder,vx:0,vy:0,invulnerable:0});Object.assign(d.fighters[1],{x:2000,y:400});Object.assign(b,{x:800+35+b.r,y:floor-b.r-.01,vx:0,vy:0});let peak=0;
    for(let i=0;i<20;i++){g.rb.step([R.decode(R.encode({hasAim:true,aimX:1,punchHeld:i===0})),neutral]);peak=Math.max(peak,b.vx);}assert(peak>(s.boulder?130:600),`${arena}: ${peak}`);assert(Object.keys(b.attacks).length>0);
  }
});
check("snitch takes native impacts, retains momentum through hitstun, allows combos and rejects repeat callbacks",()=>{
  for(const arena of ["golden-rush","total-rush"]){const f=fixture(arena),g=f.s.golden,p={id:"p1",team:0,onGround:false,koScored:false,data:{punchDamage:8,punchKnockback:900}},a={id:701,charge:0,grounded:false,dir:{x:1,y:-.5},hitTargets:new Set()};
    Object.assign(g,{x:f.stage.width/2,y:1000,health:10000});const health=g.health;assert(D.goldenRush.hit(f.s,p,a,f.w));assert(g.hitstun>=.35&&g.hitstun<=.55);assert(g.vx>400);assert(g.vy<0);const vx=g.vx,x=g.x;assert(!D.goldenRush.hit(f.s,p,a,f.w));assert.equal(g.health,health-8);f.tick(12);assert(g.x>x+60);assert(g.hitstun>0);assert(g.vx>vx*.65);assert(D.goldenRush.hit(f.s,p,{...a,id:702},f.w));assert.equal(g.comboHits,2);assert(g.health<health-8);
    for(let i=0;i<4;i++)D.goldenRush.hit(f.s,p,{...a,id:703+i},f.w);assert(g.stunGrace>0);near(g.hitstun,0);const before=g.vx;f.tick();assert(Math.abs(g.vx-before)<20,"flight steering snapped away from launch velocity");
  }
});
check("Golden Rush has ten safe, distributed balls by default, 1-12 choices and larger 1/3/5 hoops",()=>{
  for(const count of [1,2,3,8,10,12]){const f=fixture("golden-rush",{ballCount:count}),balls=D.balls(f.s);assert.equal(balls.length,count);for(const b of balls)for(const r of f.stage.terrain)assert(!D.circleRect(b,r));for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)assert(Math.hypot(balls[i].x-balls[j].x,balls[i].y-balls[j].y)>balls[i].r+balls[j].r);}
  const f=fixture("golden-rush");assert.equal(D.balls(f.s).length,10);for(const t of f.stage.terrain.filter(t=>t.kind==="oneway"))assert(D.balls(f.s).some(b=>Math.abs(b.x-t.x-t.w/2)<1&&Math.abs(b.y+b.r-t.y)<10));assert(f.stage.rings.every(r=>r.bottom-r.top>=380));assert.deepEqual([...new Set(f.stage.rings.map(r=>r.points))],[1,3,5]);assert.equal(D.balls(fixture("total-rush").s).length,4);assert.equal(D.options({arena:"total-rush",ballCount:12}).ballCount,5);
});
check("boulder Kickoffs transfer 45%, diminish at speed, preserve counter-hits and never gain body-push velocity",()=>{
  const f=fixture("boulder-control"),b=f.s.ball,c=f.s.config,raw={x:1500,y:0};const first=D.boulderControl.impulse(b,raw,c,true);near(first.x,1500/c.boulderMass*.45);b.vx=900;const fast=D.boulderControl.impulse(b,raw,c,true),brake=D.boulderControl.impulse(b,{x:-1500,y:0},c,true);assert(fast.x<first.x*.4);near(brake.x,-first.x);
  const p={id:"p1",team:0,koScored:false,data:{dashBase:900,dashMax:1800,punchDamage:12,punchKnockback:900}};for(let i=0;i<100;i++)D.shot(f.s,p,{id:i,dir:{x:1,y:0},charge:0,grounded:false,hitTargets:new Set()},f.w,true);assert(Math.hypot(b.vx,b.vy)<=c.maxSpeed+.01);
});
check("boulder rolls coherently, loses ground energy and keeps bounded airborne angular momentum",()=>{
  for(const arena of ["boulder-control","gravity-boulder","total-rush"]){const f=fixture(arena),b=f.s.ball;Object.assign(b,{x:f.stage.width/2,y:f.stage.floorY-b.r-.01,vx:500,vy:0});f.tick(60);assert(b.vx<350&&b.vx>150,`${arena} resistance ${b.vx}`);assert(b.spin>0);assert(Math.abs(b.angularVelocity-b.vx/b.r)<.15);const spin=b.angularVelocity;Object.assign(b,{y:700,vy:-100});f.tick(6);assert(Math.abs(b.angularVelocity)<=Math.abs(spin)+.01);assert(Math.abs(b.angularVelocity)>.8*Math.abs(spin));assert(Math.hypot(b.vx,b.vy)<=f.s.config.maxSpeed+.01);}
});
function rider(arena="boulder-control",sign=1){const g=createGame(),d=g.debug;d.dashball.setup({arena},{characters:["orbit","spike"]});d.gravity.setDirection("y",sign);const f=d.fighters[0],b=d.dashball.state.ball,stage=d.dashball.arena;Object.assign(b,{x:stage.width/2,y:sign>0?stage.floorY-b.r-.01:24+b.r+.01,vx:100,vy:0});const y=b.y-sign*(b.r+f.data.height/2+15);Object.assign(f,{x:b.x,y,prevX:b.x,prevY:y,onGround:false,vx:0,vy:sign*150,invulnerable:0});Object.assign(d.fighters[1],{x:stage.width-100,y:600});return {g,d,f,b};}
check("fighters land on the curved boulder, ride it, walk and jump off under either gravity",()=>{
  for(const arena of ["boulder-control","gravity-boulder","total-rush"])for(const sign of arena==="gravity-boulder"?[1,-1]:[1]){const t=rider(arena,sign);for(let i=0;i<30;i++)t.d.dashball.step();assert(t.f.onGround,`${arena}/${sign}`);assert.equal(t.f.groundTerrainId,"boulder:top");const relative=t.f.x-t.b.x;for(let i=0;i<30;i++)t.d.dashball.step();near(t.f.x-t.b.x,relative,.1);assert.equal(t.f.hitstun,0);Object.assign(t.f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-sign}});t.d.gravity.dash(0,{x:0,y:-sign},t.f.data.dashChargeTime);for(let i=0;i<4;i++)t.d.dashball.step();assert(!t.f.onGround);assert.notEqual(t.f.groundTerrainId,"boulder:top");}
});
check("curved sides use ordinary wall cling/refill and stable wall identity while the boulder moves",()=>{
  const t=rider();Object.assign(t.f,{x:t.b.x-t.b.r-t.f.data.width/2,y:t.b.y-30,prevX:t.b.x-t.b.r-t.f.data.width/2,prevY:t.b.y-30,vx:30,vy:0,onGround:false,airDashes:0,hasLiveAim:true,aim:{x:1,y:0}});Object.assign(t.f.controls,{hasAim:true,aim:{x:1,y:0}});t.b.vx=-60;let cling=false;
  for(let i=0;i<90;i++){t.d.dashball.step();cling||=t.f.wallClinging;if(t.f.wallClinging){assert.equal(t.f.currentWallId,"boulder:side:-1");assert.equal(t.f.lastResourceWallId,"boulder:side:-1");}}assert(cling);assert.equal(t.f.airDashes,t.f.data.maxAirDashes);assert(t.f.sameWallReuses<3);t.d.gravity.dash(0,{x:-.5,y:-1},.2);for(let i=0;i<8;i++)t.d.dashball.step();assert(t.f.x<t.b.x-t.b.r-t.f.data.width/2+3);
});
check("native walking on the curved top changes fighter position without pushing the boulder",()=>{
  const t=rider();t.b.vx=0;for(let i=0;i<30;i++)t.d.dashball.step();const x=t.f.x,hp=t.f.health;
  for(let i=0;i<12;i++)t.g.rb.step([R.decode(R.encode({hasAim:true,aimX:1})),neutral]);
  assert(t.f.x>x+15);assert(t.f.onGround);assert.equal(t.f.groundTerrainId,"boulder:top");assert.equal(t.f.health,hp);near(t.b.vx,0);
});
check("dangerous moving side contacts still flatten grounded fighters and damage airborne fighters",()=>{
  for(const ground of [true,false]){const t=rider(),hp=t.f.health;Object.assign(t.b,{x:ground?860:730,y:ground?t.d.dashball.arena.floorY-t.b.r:900,vx:700,vy:0,ownerTeam:-1});Object.assign(t.f,{x:1000,y:ground?t.d.dashball.arena.floorY-t.f.data.height/2:900,prevX:1000,prevY:900,vx:0,vy:0,onGround:ground,invulnerable:0});t.d.dashball.ballStep(0);assert(t.f.hitstun>0);assert.equal(t.f.stunType,ground?"boulderFlatten":"knockdown");assert.equal(t.f.health<hp,!ground);}
});
check("sports overlays and rotating artwork are presentation-only",()=>{const t=rider();t.d.dashball.debug(true);const hash=t.g.rb.hash();t.d.stagePresentation.draw();assert.equal(t.g.rb.hash(),hash);t.d.dashball.debug(false);assert.equal(t.g.rb.hash(),hash);});
check("riders wrap with the boulder and crushing under a roof detaches without trapping or repeated damage",()=>{
  const t=rider(),width=t.d.dashball.arena.width;Object.assign(t.b,{x:width-2,y:t.d.dashball.arena.floorY-t.b.r-.01,vx:200,vy:0});const y=t.b.y-t.b.r-t.f.data.height/2-1;Object.assign(t.f,{x:width-2,y,prevX:width-2,prevY:y,onGround:true,groundTerrainId:"boulder:top",vx:0,vy:0});for(let i=0;i<30;i++)t.d.dashball.step();assert(t.b.x<200);assert(t.f.onGround);assert(Math.abs(D.relativeBall(t.b,t.f.x,t.d.dashball.arena).x-t.f.x)<25);
  Object.assign(t.b,{x:2200,y:430,vx:0,vy:-1000,ownerId:null,ownerTeam:-1});const top=t.b.y-t.b.r-t.f.data.height/2-1;Object.assign(t.f,{x:2200,y:top,prevX:2200,prevY:top,onGround:true,groundTerrainId:"boulder:top",vx:0,vy:0,invulnerable:0});let flattened=false;const health=t.f.health;
  for(let i=0;i<60;i++){t.d.dashball.step();flattened||=t.f.stunType==="boulderFlatten";assert([t.f.x,t.f.y,t.f.vx,t.f.vy].every(Number.isFinite));assert(t.f.y>=24+t.f.data.height/2-.1);}assert(flattened);assert.equal(t.f.health,health);assert(!D.circleRect(D.relativeBall(t.b,t.f.x,t.d.dashball.arena),{x:t.f.x-t.f.data.width/2,y:t.f.y-t.f.data.height/2,w:t.f.data.width,h:t.f.data.height}));
});
check("all three Edgebert stages use native contact and genuine attack generations on sports balls",()=>{
  for(const direction of [1,-1]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"standard"},{characters:["edgebert","orbit"]});const f=d.fighters[0],b=d.dashball.state.ball;Object.assign(f,{x:900,y:1247,prevX:900,prevY:1247,onGround:true,invulnerable:0});d.fighters[1].x=2000;Object.assign(b,{x:900+direction*60,y:1255.99,vx:0,vy:0});const seen=new Set(),hits=[];
    for(let i=0;i<55;i++){g.rb.step([R.decode(R.encode({hasAim:true,aimX:direction,punchHeld:[0,14,24].includes(i)})),neutral]);for(const id of Object.keys(b.attacks))if(!seen.has(id)){seen.add(id);hits.push(Math.abs(b.vx));Object.assign(b,{x:f.x+direction*60,y:1255.99,vx:0,vy:0});}}
    assert.equal(hits.length,3,`${direction}: ${hits}`);assert(hits[1]>hits[0]);assert(hits[2]>hits[1]);
  }
});
check("new scoring and physics survive snapshots, live rider restoration, delayed rollback and rematches",()=>{
  for(const arena of ["standard","elevated","field-goal","gravity-soccer-open","golden-rush","boulder-control","gravity-boulder","total-rush","target-charge-roaming"]){const games=[createGame(),createGame()];for(const g of games){g.debug.dashball.setup({arena},{characters:["boomerangus","edgebert"],seed:891});if(D.isBoulderArena(arena)){const d=g.debug,b=d.dashball.state.ball,f=d.fighters[0];Object.assign(b,{x:1500,y:d.dashball.arena.floorY-b.r-.01,vx:90,vy:0});const y=b.y-b.r-f.data.height/2-1;Object.assign(f,{x:1500,y,prevX:1500,prevY:y,onGround:true,groundTerrainId:"boulder:top",invulnerable:0});}}
    const [a,b]=games,start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];for(let i=0;i<180;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:i>85?-.5:0,punchHeld:(i+n*11)%53<12,dashHeld:i>60&&(i+n*7)%71<8}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),arena);const end=a.rb.hash();b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);a.debug.dashball.setup({arena},{characters:["boomerangus","edgebert"],seed:891});assert.deepEqual([...a.debug.dashball.state.scores],[0,0]);assert.equal(a.debug.gravity.direction,1);assert.equal(a.debug.fighters[0].projectiles.length,0);}
});
check("fixed-step sports remain equivalent at 30/60/120 Hz",()=>{
  for(const arena of ["standard","elevated","golden-rush","boulder-control","gravity-boulder","total-rush"]){const results=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena},{characters:["boomerangus","edgebert"],seed:992});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push(g.rb.hash());}assert.equal(results[0],results[1],arena);assert.equal(results[0],results[2],arena);}
});
check("ten native-input CPUs stay finite and deterministic with all objectives and gravity switches",()=>{
  for(const arena of ["golden-rush","gravity-boulder","total-rush"]){const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena,teamSize:5},{characters:["boomerangus","edgebert","chungus","kite","spike"],ai:true,seed:333});for(let i=0;i<420;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash(),`${arena}:${i}`);const d=games[0].debug;assert(d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));for(const b of D.balls(d.dashball.state))assert([b.x,b.y,b.vx,b.vy].every(Number.isFinite));}}
});
check("all fourteen fighter definitions and unrelated Versus simulation retain prior behavior",()=>{
  const oldRoot=require("node:path").resolve("exports/Dash-Punch-Charged-Recall-Release-2026-11-13"),old=createGame(oldRoot),now=createGame(),plain=x=>JSON.parse(JSON.stringify(x));
  const canonical=g=>{const state=plain(g.rb.save().core);state.stageIndex=0;for(const f of state.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(state);};
  for(const key of [...Object.keys(require("./boomerangus-before.json").characters),"boomerangus"]){for(const g of [old,now])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:244});assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data),key);for(let i=0;i<90;i++){const row=[0,1].map(n=>R.decode(R.encode({hasAim:true,aimX:n?-1:1,aimY:-.1,punchHeld:(i+n*4)%31<6,dashHeld:i%43<9})));old.rb.step(row);now.rb.step(row);assert.equal(canonical(old),canonical(now),`${key}:${i}`);}}
});
check("original Flip Chamber retains its historical 240-frame simulation fixture",()=>{const g=createGame(),baseline=require("./gravity-soccer-before.json").flip;g.rb.setup({stageIndex:g.debug.stageNames.indexOf("Flip Chamber"),characterKeys:["orbit","spike"],seed:42});for(let i=0;i<240;i++)assert.equal(g.rb.step([{aimX:1,aimY:-.4,dashHeld:i%50<10,punchHeld:i%25<10},{aimX:-1,aimY:.1,punchHeld:i%31<9}]),baseline[i]);});
console.log(`${groups} gameplay repair groups passed`);
