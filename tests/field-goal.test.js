"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness"),{hashes}=require("./total-rush-regression");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(config={}){const stage=D.arena("field-goal",154,config),state=D.create({...config,arena:"field-goal"},stage),world={stage,gravity:{x:0,y:1},fighters:[],terrain:()=>stage.terrain,attacks:()=>[],attackTouches:()=>false,body:f=>({x:f.x-23,y:f.y-33,w:46,h:66}),shielding:f=>!!f.shield,shieldAim:f=>f.aim,shieldCovers:()=>true,shieldPadding:()=>20,kicking:()=>false};return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.clock(state,dt,stage);D.step(state,dt,world);}}};}
function shot(f,team=1,y=450,speed=1800){const g=f.stage.goals[team],sign=team?1:-1;Object.assign(f.state.ball,{x:g.line-sign*208,y,vx:sign*speed,vy:0});}
check("separate Court/Battle registry with standard Soccer ball, camera, spawns and options",()=>{
  assert.equal(D.ARENAS.find(a=>a.id==="field-goal").name,"Field Goal");
  for(const ruleset of ["court","battle"]){const f=fixture({ruleset}),normal=D.create({arena:"standard",ruleset},D.arena("standard"));assert.equal(f.state.config.ruleset,ruleset);for(const k of ["duration","winningScore","healthMult","respawn","ballRadius","gravity","maxSpeed","bounce","groundFriction","knockdownSpeed"])assert.equal(f.state.config[k],normal.config[k]);assert.deepEqual(f.stage.teamSpawnLanes,D.arena("standard").teamSpawnLanes);assert.equal(f.stage.width,2560);assert.equal(f.stage.height,1440);assert.equal(f.stage.cameraZoom,.38);assert(!f.stage.gravitySwitch);assert.deepEqual(D.options(JSON.parse(JSON.stringify(f.state.config))),f.state.config);}
});
check("raised 524-high crossbars, traditional U visuals and two clear defensive perches",()=>{
  const f=fixture();for(const g of f.stage.goals){near(f.stage.floorY-g.bottom,524);near(g.bottom-g.postTop,264);assert(g.right-g.left>f.state.ball.r*4);const pieces=f.stage.goalFrames.filter(t=>t.goalTeam===g.team);assert.equal(pieces.length,4);assert.equal(pieces.filter(t=>t.fieldGoalPart==="post").length,2);const p=f.stage.terrain.find(t=>t.fieldGoalPerch===g.team);assert.equal(p.w,92);assert(p.y>g.bottom);for(const t of pieces)assert(!(p.x<t.x+t.w&&p.x+p.w>t.x&&p.y<t.y+t.h&&p.y+p.h>t.y));}assert.equal(f.stage.terrain.filter(t=>t.fieldGoalPerch!==undefined).length,2);assert(!f.stage.terrain.some(t=>t.fieldGoalPart));
});
check("legitimate lofted field-side shots score for either attacking team, including own goals",()=>{
  for(const team of [0,1]){const f=fixture();shot(f,team);f.state.ball.ownerTeam=team;f.tick(12);assert.equal(f.state.scores[1-team],1);assert.equal(f.state.goalSerial,1);assert.equal(f.state.phase,"playing");}
});
check("below bar, outside posts, backside, initial overlap and vertical basket drops cannot score",()=>{
  for(const team of [0,1])for(const kind of ["below","outside-front","outside-back","backside","overlap","drop"]){const f=fixture(),g=f.stage.goals[team],sign=team?1:-1,b=f.state.ball;
    if(kind==="below")shot(f,team,g.bottom+70);else if(kind==="outside-front")Object.assign(b,{x:g.line-sign*250,y:450,vx:-sign*900,vy:0});else if(kind==="outside-back"||kind==="backside")Object.assign(b,{x:g.line+sign*100,y:450,vx:kind==="backside"?-sign*1000:sign*1000,vy:0});else if(kind==="overlap")Object.assign(b,{x:g.line,y:450,vx:sign*1000,vy:0});else Object.assign(b,{x:g.line,y:300,vx:0,vy:800});
    f.tick(12);assert.deepEqual(f.state.scores,[0,0],`${team} ${kind}`);
  }
});
check("swept high-speed crossing, no duplicate awards and full radius/inner-window clearance",()=>{
  for(const radius of [12,24,32]){const f=fixture();f.state.ball.r=radius;shot(f,1,350,100000);f.tick(12);assert.deepEqual(f.state.scores,[1,0]);f.tick(30);assert.equal(f.state.goalSerial,1);}
  const f=fixture();f.state.ball.r=100;shot(f,1,350);f.tick(15);assert.deepEqual(f.state.scores,[0,0]);
  for(const clear of [true,false]){const g=fixture(),goal=g.stage.goals[1],b=g.state.ball;g.state.config.gravity=0;Object.assign(b,{x:goal.line-b.r-1,y:goal.bottom-b.r+(clear?-.01:.01),vx:2050,vy:0});g.tick(4);assert.equal(g.state.goalSerial,Number(clear));}
});
check("all posts/crossbars are visual-only; lateral shots above the bar need no basket entry",()=>{
  for(const team of [0,1]){const f=fixture(),g=f.stage.goals[team],sign=team?1:-1;
    Object.assign(f.state.ball,{x:g.line,y:g.bottom-70,vx:0,vy:1500});f.tick(4);assert(f.state.ball.vy>0);assert.equal(f.state.goalSerial,0);
    for(const y of [g.bottom-80,g.postTop-100]){const h=fixture();shot(h,team,y);h.tick(12);assert.equal(h.state.goalSerial,1);assert.equal(h.state.phase,"playing");}
  }
});
check("geometry/body corrections across a scoring plane cannot arm or complete a goal",()=>{
  const f=fixture(),g=f.stage.goals[0],b=f.state.ball,p={id:"p1",team:0,x:g.line+55,y:450,prevX:g.line+55,prevY:450,vx:-500,vy:0,invulnerable:0,data:{width:46,height:66},aim:{x:-1,y:0}};
  f.world.fighters=[p];Object.assign(b,{x:g.line+25,y:450,vx:0,vy:0});f.tick(5);assert.deepEqual(f.state.scores,[0,0]);
});
check("only the scored ball is replaced from above; play continues until time with no score cap",()=>{
  const f=fixture({winningScore:1,duration:15}),old=f.state.ball;f.state.respawns.p1=5;shot(f,1);f.tick(12);assert.equal(f.state.phase,"playing");assert.notEqual(f.state.ball,old);near(f.state.ball.x,f.stage.width/2);assert(f.state.ball.y<200);assert(f.state.ball.vy>0);assert.equal(f.state.respawns.p1,5);assert.equal(f.state.winner,null);assert.deepEqual(f.state.scores,[1,0]);shot(f,1);f.tick(12);assert.equal(f.state.scores[0],2);assert.equal(f.state.fieldGoal.dropSerial,2);f.tick(900);assert.equal(f.state.winner,0);
  const tied=fixture({duration:15});tied.tick(901);assert(tied.state.overtime);shot(tied,1);tied.tick(12);assert.equal(tied.state.winner,0);
});
check("solid keeper platforms bounce balls without trapping them below the goal",()=>{
  const f=fixture(),p=f.stage.terrain.find(t=>t.fieldGoalPerch===0),b=f.state.ball;Object.assign(b,{x:p.x+p.w/2,y:p.y-80,vx:0,vy:1000});f.tick(6);assert(b.vy<0);assert(b.y+b.r<p.y+.1);
  Object.assign(b,{x:p.x+p.w/2,y:p.y+90,vx:100,vy:-1200});f.tick(90);assert([b.x,b.y,b.vx,b.vy].every(Number.isFinite));assert.equal(f.state.goalSerial,0);assert(b.y<=f.stage.floorY-b.r+.1);
});
check("native landing, jumping and all-core perch access including Chungus use existing movement",()=>{
  const g=createGame(),d=g.debug;for(const key of ["orbit","anchor","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate"]){
    d.dashball.setup({arena:"field-goal"},{characters:[key,"spike"]});const f=d.fighters[0],goal=d.dashball.arena.goals[0],p=d.terrainArt.rects.find(t=>t.fieldGoalPerch===0),x=goal.outerRight+f.data.width/2+4;
    Object.assign(f,{x,y:p.y-f.data.height/2-5,prevX:x,prevY:p.y-f.data.height/2-30,vy:300,vx:0,onGround:false});for(let i=0;i<4;i++)d.gravity.physics(0);assert(f.onGround,key);near(f.y+f.data.height/2,p.y,.1);
    Object.assign(f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-1}});d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let top=f.y;for(let i=0;i<120;i++){d.gravity.physics(0);top=Math.min(top,f.y-f.data.height/2);}assert(top<goal.postTop,key);
    Object.assign(f,{x:500,y:d.dashball.arena.floorY-f.data.height/2-2,prevX:500,prevY:d.dashball.arena.floorY-f.data.height/2-2,vx:0,vy:0,onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-1}});d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let feet=f.y+f.data.height/2;for(let i=0;i<120;i++){d.gravity.physics(0);feet=Math.min(feet,f.y+f.data.height/2);}assert(feet<p.y,key);
  }
});
check("ten native spawns and protected team-side respawns avoid all goal/perch geometry",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal",teamSize:5},{characters:["chungus"]});
  for(const f of d.fighters)for(const r of d.terrainArt.rects)assert(!(f.x-f.data.width/2<r.x+r.w&&f.x+f.data.width/2>r.x&&f.y-f.data.height/2<r.y+r.h&&f.y+f.data.height/2>r.y),f.id);
  const s=d.dashball.state,ball=s.ball;s.scores=[2,1];d.dashball.knockout(0);assert.equal(s.respawns.p1,15);assert.deepEqual([...s.scores],[2,1]);s.respawns.p1=.001;d.dashball.step();assert(!d.fighters[0].koScored);assert(d.fighters[0].invulnerable>1.9);assert.equal(s.ball,ball);
});
check("Court disables PvP and clamps full bodies; Battle permits midfield and ordinary combat",()=>{
  for(const ruleset of ["court","battle"]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal",ruleset,teamSize:2});assert.equal(d.sandbag.canAffect(0,1),ruleset==="battle");const f=d.fighters[0];Object.assign(f,{x:1400,y:600,vx:500,vy:0,onGround:false});d.dashball.step();assert.equal(f.x>1280,ruleset==="battle");}
});
check("native bullets bounce and arrows lodge on keeper platforms without changing magazines",()=>{
  for(const key of ["gunman","archer"]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal"},{characters:[key,"spike"]});const f=d.fighters[0],p=d.terrainArt.rects.find(t=>t.fieldGoalPerch===0);
    for(const held of [true,false]){Object.assign(f.controls,{hasAim:true,aim:{x:0,y:1}});f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(0);}const a=f.attack;d.updateAttack(0,a.startup+.000001);Object.assign(a.projectile,{x:p.x+p.w/2,y:p.y-80,vx:0,vy:1800,speed:1800});for(let i=0;i<5;i++)d.updateProjectiles(.02);
    if(key==="gunman")assert(a.projectile.vy<0);else assert(a.projectile.lodged||a.projectile.removed||!f.projectiles.includes(a));assert.equal(f.ammo,key==="gunman"?2:4);
  }
});
check("native shields still deflect safely, Spike captures and carried balls never score",()=>{
  const f=fixture(),p={id:"p1",team:0,x:500,y:500,prevX:500,prevY:500,vx:0,vy:0,invulnerable:0,data:{width:46,height:66,shieldThornsDamage:8},shield:true,aim:{x:1,y:0}};f.world.fighters=[p];Object.assign(f.state.ball,{x:540,y:500,vx:-900,vy:0});f.tick();assert.equal(f.state.ball.carrier,p.id);p.x=f.stage.goals[0].line;p.prevX=p.x;f.tick(8);assert.equal(f.state.goalSerial,0);p.shield=false;f.tick();assert.equal(f.state.ball.carrier,null);
});
check("gravity-aware elevation prediction chooses a real scoring floor-bank using native force",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal"});const f=d.fighters[0],s=d.dashball.state,w={...d.dashball.world(0),fighters:[],onShot:()=>{},attacks:()=>[]};f.onGround=true;const before=JSON.stringify(s),plan=D.fieldGoal.plan(s,f,w);assert.equal(JSON.stringify(s),before);assert.equal(plan.id,1);assert(plan.charge>0);D.shot(s,f,{id:999,dir:plan.aim,charge:plan.charge,grounded:true,hitTargets:new Set()},w,plan.kick);for(let i=0;i<240&&s.phase==="playing";i++)D.step(s,dt,w);assert.equal(s.scores[0],1);
});
check("AI uses keeper roles/perches, elevated planning and interceptions in Court and Battle",()=>{
  for(const ruleset of ["court","battle"]){const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal",ruleset,teamSize:3},{ai:true});const s=d.dashball.state,p=d.terrainArt.rects.find(t=>t.fieldGoalPerch===0),f=d.fighters[0];Object.assign(f,{x:p.x+p.w-10,y:p.y-f.data.height/2-2,prevX:p.x+p.w-10,prevY:p.y-f.data.height/2-10,vy:20,vx:0,onGround:false});Object.assign(s.ball,{x:700,y:450,vx:-1300,vy:0,launched:2,ownerTeam:1});d.dashball.step();assert(D.fieldGoal.threat(s,0,d.dashball.arena));assert.equal(d.fighters.filter(f=>f.team===0&&f.ai.fieldGoalRole==="keeper").length,1);assert(d.fighters.some(f=>f.ai.fieldGoalPlan));
    for(let i=0;i<240;i++)d.dashball.step();assert(d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));
  }
});
check("1v1/3v3/5v5 snapshots, replay and render purity retain both rulesets",()=>{
  for(const ruleset of ["court","battle"])for(const size of [1,3,5]){const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:"field-goal",ruleset,teamSize:size},{seed:733});const start=a.rb.save(),rows=[];
    for(let i=0;i<90;i++){const row=a.debug.fighters.map((p,n)=>({aimX:Math.cos(i*.13+n),aimY:Math.sin(i*.13+n),dashHeld:i%37<8,punchHeld:i%29<9}));rows.push(row);assert.equal(a.rb.step(row),b.rb.step(row));}const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),end);a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),end);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(JSON.stringify(a.debug.dashball.state),JSON.stringify(b.debug.dashball.state));
  }
});
check("late-input rollback preserves field-goal scoring, platform landing and Battle respawns",()=>{
  for(const ruleset of ["court","battle"]){const a=createGame(),b=createGame();for(const g of [a,b]){g.debug.dashball.setup({arena:"field-goal",ruleset});Object.assign(g.debug.dashball.state.ball,{x:2200,y:450,vx:1500,vy:0});}const manager=b.rb.manager(0,8),pending=[];
    for(let i=0;i<180;i++){const l=R.encode({aimX:1,aimY:-.3,dashHeld:i%41<10,punchHeld:i%29<9}),r=R.encode({aimX:-1,aimY:-.6,dashHeld:i%31<8,punchHeld:i%23<10});pending.push({frame:i,input:r});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(l));a.rb.step([l,r].map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);
  }
});
check("30/60/120Hz fixed-step equivalence, deterministic ten-CPU decisions and clean mode reset",()=>{
  const results=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"field-goal"});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);results.push(g.rb.hash());}assert.equal(results[0],results[1]);assert.equal(results[0],results[2]);
  for(const ruleset of ["court","battle"]){const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena:"field-goal",ruleset,teamSize:5},{ai:true,seed:733});for(let i=0;i<480;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());}}
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"field-goal"});d.dashball.state.scores=[3,2];d.gravity.setDirection("y",-1);d.dashball.setup({arena:"field-goal"});assert.equal(d.gravity.direction,1);assert.deepEqual([...d.dashball.state.scores],[0,0]);d.dashball.setup({arena:"standard"});assert(!d.dashball.arena.fieldGoal);assert(!d.terrainArt.rects.some(t=>t.fieldGoalPart));assert.equal(d.dashball.state.ball.r,24);
});
check("unchanged sports retain immutable hashes; requested boulder/Field Goal changes have dedicated tests",()=>{for(const [name,rows] of Object.entries(require("./field-goal-before.json")).filter(([name])=>require("./total-rush-regression").unchangedSportsFixture(name)))assert.deepEqual(hashes(name,rows.length,process.cwd(),{originalTotal:true}),rows,name);});
console.log(`${groups} Field Goal groups passed`);
