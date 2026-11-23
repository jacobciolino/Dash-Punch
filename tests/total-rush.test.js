"use strict";
const assert=require("node:assert/strict"),D=require("../dashball"),R=require("../rollback"),{createGame}=require("./simulation-harness"),{hashes}=require("./total-rush-regression");
const dt=1/60,near=(a,b,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function fixture(options={}){
  const stage=D.arena("total-rush",154,options),state=D.create({...options,arena:"total-rush"},stage);
  const world={stage,gravity:{x:0,y:1},fighters:[],terrain:()=>stage.terrain.concat(stage.ballOnly),attacks:()=>[],attackTouches:()=>false,body:f=>({x:f.x-23,y:f.y-33,w:46,h:66}),shielding:f=>!!f.shield,shieldAim:f=>f.aim,shieldCovers:()=>true,shieldPadding:()=>20,kicking:()=>false};
  return {stage,state,world,tick(n=1){for(let i=0;i<n;i++){D.clock(state,dt,stage);D.step(state,dt,world);}}};
}
const fighter=(id="p1",team=0)=>({id,team,x:1400,y:1600,prevX:1400,prevY:1600,vx:0,vy:0,invulnerable:0,dashReboundLockout:0,aim:{x:1,y:0},data:{width:46,height:66,punchKnockback:800,punchDamage:12,dashBase:800,dashMax:600,maxAirDashes:4}});
const attack=(id,dir={x:1,y:0},charge=0)=>({id,dir,charge,hitTargets:new Set()});
function ringShot(f,team,row,index=0){const r=f.stage.rings.find(r=>r.team===team&&r.row===row),b=f.state.extraBalls[index],sign=r.direction;Object.assign(b,{x:r.line-sign*80,y:(r.top+r.bottom)/2,vx:sign*1800,vy:0});return b;}
check("distinct Battle-only mode, 300 target, four rings, three small balls, giant and triple-HP snitch",()=>{
  const f=fixture({ruleset:"court"}),s=f.state;assert.equal(D.ARENAS.find(a=>a.id==="total-rush").name,"Total Rush");assert.equal(s.config.ruleset,"battle");assert.equal(s.config.winningScore,300);assert.equal(s.config.respawn,15);
  assert.equal(D.balls(s).length,4);assert.equal(s.ball.r,270);assert(s.extraBalls.every(b=>b.r===16));assert.equal(s.golden.health,144);assert.equal(s.config.goldenRespawn,45);assert.equal(s.config.goldenReward,30);
  assert.equal(f.stage.rings.length,4);assert.deepEqual(f.stage.rings.map(r=>r.points),[5,10,5,10]);assert(f.stage.rings.every(r=>r.row>0));assert(!f.stage.gravitySwitch);
  assert.deepEqual(D.options(JSON.parse(JSON.stringify(s.config))),s.config);assert.equal(fixture({ballCount:5}).state.extraBalls.length,5);
});
check("neutral spawns clear each other and physical platforms; fixed camera fits full arena",()=>{
  const f=fixture();for(const b of D.balls(f.state))for(const t of f.world.terrain())assert(!D.circleRect(b,t));
  for(const b of f.state.extraBalls)assert(Math.hypot(b.x-f.state.ball.x,b.y-f.state.ball.y)>b.r+f.state.ball.r);
  assert(f.stage.fixedCamera);assert(f.stage.height*f.stage.cameraZoom<=560);assert(f.stage.width*f.stage.cameraZoom<=1240);
});
check("ordinary and bonus boulder income use one shared ledger without double-counting",()=>{
  for(const [y,rate] of [[1900,.5],[1000,1]]){const f=fixture();Object.assign(f.state.ball,{x:738,y});for(let i=0;i<60;i++)D.boulderControl.score(f.state,f.stage,dt);D.totalRush.resolveScore(f.state);near(f.state.scores[1],rate);near(f.state.boulder.scoreUnits[1]/60000,rate);}
  const f=fixture();f.state.ball.x=1800;D.boulderControl.score(f.state,f.stage,1);D.totalRush.resolveScore(f.state);near(f.state.scores[0]+f.state.scores[1],0);
});
check("middle/high rings award 5/10 on the opponent's side and reset only that small ball",()=>{
  for(const team of [0,1])for(const row of [1,2]){const f=fixture(),big=f.state.ball,b=ringShot(f,team,row),other=f.state.extraBalls[1];const x=big.x,otherX=other.x;f.tick(8);near(f.state.scores[1-team],row===1?5:10);assert.equal(b.vx,0);near(big.x,x);near(other.x,otherX);assert.equal(f.state.golden.health,144);assert.equal(f.state.rushSerial,1);}
});
check("backward, initial overlap and rim shots cannot score; one score per crossing",()=>{
  for(const kind of ["backward","overlap","rim"]){const f=fixture(),r=f.stage.rings[0],b=f.state.extraBalls[0];Object.assign(b,{x:r.line+(kind==="backward"?-60:kind==="overlap"?-5:80),y:kind==="rim"?r.top:(r.top+r.bottom)/2,vx:kind==="backward"?1800:-1800,vy:0});f.tick(15);near(f.state.scores[0]+f.state.scores[1],0);}
  const f=fixture();ringShot(f,1,2);f.tick(20);assert.equal(f.state.rushSerial,1);
});
check("snitch final valid hit awards 30 once; passively touching balls never damages it",()=>{
  const f=fixture(),p=fighter();f.state.golden.health=1;assert(D.goldenRush.hit(f.state,p,attack(1),f.world));assert(!D.goldenRush.hit(f.state,p,attack(1),f.world));D.totalRush.resolveScore(f.state);near(f.state.scores[0],30);assert.equal(f.state.captures[0],1);assert(!f.state.golden.active);
  const g=fixture();Object.assign(g.state.golden,{x:g.state.ball.x,y:g.state.ball.y});g.tick(3);assert.equal(g.state.golden.health,144);
});
check("snitch respawns after 45 simulation seconds with 144 HP",()=>{
  const f=fixture(),p=fighter();f.state.golden.health=1;D.goldenRush.hit(f.state,p,attack(1),f.world);f.tick(2699);assert(!f.state.golden.active);f.tick(2);assert(f.state.golden.active);assert.equal(f.state.golden.health,144);near(f.state.scores[0],30);
});
check("same-frame mixed scores and simultaneous victory do not depend on ball iteration order",()=>{
  for(const reverse of [false,true]){const f=fixture();f.state.totalRush.scoreUnits=[295*60000,295*60000];f.state.scores=[295,295];ringShot(f,1,1,0);ringShot(f,0,2,1);if(reverse)f.state.extraBalls.reverse();f.tick(8);assert.equal(f.state.winner,1);near(f.state.scores[0],300);near(f.state.scores[1],305);}
  const f=fixture();f.state.totalRush.scoreUnits=[295*60000,295*60000];f.state.scores=[295,295];ringShot(f,1,1,0);ringShot(f,0,1,1);f.tick(8);assert(f.state.overtime);assert.equal(f.state.phase,"playing");f.state.totalRush.pendingUnits[0]=1000;D.totalRush.resolveScore(f.state);assert.equal(f.state.winner,0);
  const g=fixture();Object.assign(g.state.ball,{x:738,y:1900});D.boulderControl.score(g.state,g.stage,dt);g.state.golden.health=1;D.goldenRush.hit(g.state,fighter("p2",1),attack(4),g.world);ringShot(g,0,1);g.tick(8);assert(g.state.scores[1]>35);
});
check("victory freezes scoring, snitch, fighters, clocks and objective physics",()=>{
  const f=fixture();f.state.totalRush.scoreUnits[0]=300*60000;D.totalRush.resolveScore(f.state);const before=JSON.stringify(f.state);f.tick(120);assert.equal(JSON.stringify(f.state),before);assert(!D.goldenRush.hit(f.state,fighter(),attack(1),f.world));
});
check("boulder impulses remain additive while ordinary small-ball shots retain Golden Rush strength",()=>{
  const f=fixture(),p=fighter(),b=f.state.ball,small=f.state.extraBalls[0];D.shot(f.state,p,attack(1),f.world,false,b);const v=b.vx;D.shot(f.state,p,attack(2),f.world,false,b);assert(b.vx>v&&b.vx<v*2,"requested high-speed boulder resistance");D.shot(f.state,p,attack(3),f.world,false,small);assert(small.vx>b.vx);assert(!("health" in b));
});
check("large/small collisions exchange bounded momentum with a heavy mass ratio",()=>{
  const f=fixture(),b=f.state.ball,s=f.state.extraBalls[0];Object.assign(b,{x:1800,y:1700,vx:0,vy:0});Object.assign(s,{x:2080,y:1700,vx:-1500,vy:0});D.totalRush.collide(f.state,f.world);assert(s.vx>0);assert(Math.abs(b.vx)<35);assert(Math.hypot(s.x-b.x,s.y-b.y)>=b.r+s.r-.1);
  const vx=b.vx,sv=s.vx;D.totalRush.collide(f.state,f.world);near(b.vx,vx);near(s.vx,sv);
});
check("floor pins, high-speed pair collisions and wrap stay finite without trapping",()=>{
  const f=fixture(),b=f.state.ball,s=f.state.extraBalls[0];Object.assign(b,{x:1800,y:f.stage.floorY-b.r,vx:700,vy:0});Object.assign(s,{x:1800,y:f.stage.floorY-s.r,vx:0,vy:0});D.totalRush.collide(f.state,f.world);assert(Math.hypot(s.x-b.x,s.y-b.y)>=b.r+s.r-.1);
  Object.assign(b,{x:3598,y:1800,vx:1100,vy:-100});f.tick();assert(b.x<100);assert(b.vx>1000);
  for(let i=0;i<900;i++){f.tick();for(const ball of D.balls(f.state)){assert([ball.x,ball.y,ball.vx,ball.vy].every(Number.isFinite));assert(Math.hypot(ball.vx,ball.vy)<=D.ballConfig(f.state,ball).maxSpeed+.001);assert(ball.y>=24+ball.r-.1&&ball.y<=f.stage.floorY-ball.r+.1);}}
});
check("small shields/Spike capture and giant deflection remain distinct; contacts cannot farm refills",()=>{
  const f=fixture(),p=fighter();p.shield=true;p.data.shieldThornsDamage=8;p.x=1000;p.prevX=1000;p.y=1700;p.prevY=1700;f.world.fighters=[p];Object.assign(f.state.extraBalls[0],{x:1040,y:1700,vx:0,vy:0});f.tick();assert.equal(f.state.extraBalls[0].carrier,p.id);assert.equal(f.state.ball.carrier,null);p.shield=false;f.tick();assert.equal(f.state.extraBalls[0].carrier,null);
  let rewards=0;f.world.onShot=(_f,_a,_k,reward)=>rewards+=Number(reward);const a=attack(5);for(const b of D.balls(f.state))D.shot(f.state,p,a,f.world,false,b);assert.equal(rewards,1);for(const b of D.balls(f.state))assert(!D.shot(f.state,p,a,f.world,false,b));
});
check("dynamic roles spread teams and recognize threatened territory, low snitch HP and winning shots",()=>{
  const f=fixture();f.world.fighters=Array.from({length:10},(_,i)=>({...fighter(`p${i}`,i%2),x:900+i*170,y:1500,data:{...fighter().data,maxAirDashes:i+1}}));
  let roles=D.totalRush.assign(f.state,f.world);for(const team of [0,1]){const kinds=f.world.fighters.filter(p=>p.team===team).map(p=>roles[p.id].kind);assert(kinds.includes("boulder"));assert(kinds.includes("ring"));assert(kinds.includes("golden"));}
  f.state.golden.health=1;const p=f.world.fighters[0];Object.assign(p,{x:f.state.golden.x,y:f.state.golden.y});roles=D.totalRush.assign(f.state,f.world);assert.equal(roles[p.id].kind,"golden");
  f.state.golden.active=false;f.state.scores[0]=295;const b=f.state.extraBalls[0],r=f.stage.rings.find(r=>r.team===1&&r.points===5);Object.assign(b,{x:r.line+100,y:(r.top+r.bottom)/2});Object.assign(p,{x:b.x+100,y:b.y});roles=D.totalRush.assign(f.state,f.world);assert.equal(roles[p.id].kind,"ring");assert.equal(roles[p.id].ballId,b.id);
});
check("Battle health, mandatory friendly fire and independent KOs do not reset or award sports points",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"total-rush",teamSize:2});assert.equal(d.fighters[0].health,Math.round(d.fighters[0].data.maxHealth*.5));const ball=d.dashball.state.ball,small=d.dashball.state.extraBalls;d.dashball.knockout(0);assert.equal(d.dashball.state.respawns.p1,15);near(d.dashball.state.scores[0]+d.dashball.state.scores[1],0);d.dashball.state.respawns.p1=.001;d.dashball.step();assert(!d.fighters[0].koScored);assert(d.fighters[0].invulnerable>1.9);assert.equal(d.dashball.state.ball,ball);assert.equal(d.dashball.state.extraBalls,small);
});
check("all core fighters reach ring heights through existing platform/superjump routes",()=>{
  const g=createGame(),d=g.debug;for(const key of ["orbit","anchor","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate"]){
    d.dashball.setup({arena:"total-rush"},{characters:[key,"orbit"]});const f=d.fighters[0];Object.assign(f,{x:1200,y:1340-f.data.height/2,onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:0,y:-1},vx:0,vy:0});d.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);let top=f.y;for(let i=0;i<120;i++){d.gravity.physics(0);top=Math.min(top,f.y);}assert(top<600+145,key);
  }
});
check("native bullets and arrows hit both object types, consume ammo and keep clean-hit rewards",()=>{
  for(const key of ["gunman","archer"])for(const giant of [false,true]){
    const g=createGame(),d=g.debug;d.dashball.setup({arena:"total-rush"},{characters:[key,"orbit"]});const f=d.fighters[0],target=giant?d.dashball.state.ball:d.dashball.state.extraBalls[0];
    Object.assign(f,{x:target.x-400,y:target.y,prevX:target.x-400,prevY:target.y,onGround:false,airDashes:0});
    for(const held of [true,false]){Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.punchHeld=held;f.controls.buffers[held?"punchPressed":"punchReleased"]=.09;d.updateHumanInput(0);}
    assert(f.attack?.projectile);const a=f.attack;d.updateAttack(0,a.startup+.000001);for(let i=0;i<40&&target.ownerId!==f.id;i++)d.updateProjectiles(.02);
    assert.equal(target.ownerId,f.id,`${key} ${giant}`);assert.equal(f.ammo,key==="gunman"?2:4);assert.equal(f.airDashes,f.data.maxAirDashes);
  }
});
check("native Battle attacks retain full friendly fire even with the ordinary setting off",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"total-rush",teamSize:2});const snapshot=g.rb.save();snapshot.core.teamAttackEnabled=false;g.rb.restore(snapshot);assert(d.sandbag.canAffect(0,2));
});
check("1v1/3v3/5v5 replays, authoritative snapshots and render purity retain every objective",()=>{
  for(const size of [1,3,5]){const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:"total-rush",teamSize:size},{seed:733});const start=a.rb.save(),rows=[];
    for(let i=0;i<120;i++){const row=a.debug.fighters.map((p,n)=>({aimX:Math.cos(i*.1+n),aimY:Math.sin(i*.1+n),dashHeld:i%37<8,punchHeld:i%29<9}));rows.push(row);assert.equal(a.rb.step(row),b.rb.step(row));}
    const end=a.rb.hash();a.rb.restore(start);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),end);a.debug.stagePresentation.draw();assert.equal(a.rb.hash(),end);b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(JSON.stringify(a.debug.dashball.state),JSON.stringify(b.debug.dashball.state));
  }
});
check("six-frame delayed inputs roll back shared scores, possession, snitch and respawns",()=>{
  const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:"total-rush"});const manager=b.rb.manager(0,8),pending=[];
  for(let i=0;i<180;i++){const l=R.encode({aimX:1,aimY:-.3,dashHeld:i%41<10,punchHeld:i%29<9}),r=R.encode({aimX:-1,aimY:-.6,dashHeld:i%31<8,punchHeld:i%23<10});pending.push({frame:i,input:r});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(l));a.rb.step([l,r].map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);
});
check("30/60/120Hz rendering preserves fixed-step scoring and all-object physics",()=>{
  const result=[];for(const hz of [30,60,120]){const g=createGame();g.debug.dashball.setup({arena:"total-rush"});Object.assign(g.debug.dashball.state.ball,{x:738,y:1900});for(let i=1;i<=hz*2;i++)g.render(1000+i*1000/hz+.001);result.push(g.rb.hash());}assert.equal(result[0],result[1]);assert.equal(result[0],result[2]);
});
check("ten CPUs make deterministic multi-objective progress without privileged movement",()=>{
  const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena:"total-rush",teamSize:5},{ai:true,seed:733});const tasks=new Set();
  for(let i=0;i<1800;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());for(const f of games[0].debug.fighters)tasks.add(f.ai.totalRushTask?.kind);}
  assert(tasks.has("ring")&&tasks.has("golden")&&tasks.has("boulder"));assert(games[0].debug.dashball.state.scores.some(n=>n>0));
});
check("rematch restores objects, scores, resources and down gravity; other modes stay isolated",()=>{
  const g=createGame(),d=g.debug;d.dashball.setup({arena:"total-rush"});d.dashball.state.golden.health=1;d.dashball.state.scores=[100,50];d.gravity.setDirection("y",-1);d.dashball.setup({arena:"total-rush"});assert.equal(d.gravity.direction,1);assert.equal(d.dashball.state.golden.health,144);assert.deepEqual([...d.dashball.state.scores],[0,0]);d.dashball.setup({arena:"golden-rush"});assert.equal(d.dashball.state.golden.health,48);assert.equal(d.dashball.state.config.goldenRespawn,20);assert(!d.dashball.state.totalRush);d.dashball.setup({arena:"boulder-control"});assert(!d.dashball.state.extraBalls);assert(!d.dashball.state.golden);
});
check("unchanged prior sports, Versus and strategic AIs match immutable pre-change frames",()=>{for(const [name,rows] of Object.entries(require("./total-rush-before.json")).filter(([name])=>require("./total-rush-regression").unchangedSportsFixture(name)))assert.deepEqual(hashes(name,rows.length),rows,name);});
console.log(`${groups} Total Rush groups passed`);
