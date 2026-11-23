"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),D=require("../dashball"),R=require("../rollback"),G=require("../sports-guide"),{createGame}=require("./simulation-harness");
const arena="gravity-golden-rush",gameRoot=process.env.CORE_RELEASE_DIR||process.cwd(),vectors=[{x:0,y:1},{x:-1,y:0},{x:0,y:-1},{x:1,y:0}],plain=x=>JSON.parse(JSON.stringify(x));let groups=0;
function check(name,fn){fn();groups++;console.log(`ok ${name}`);}
function setup(teamSize=1,ai=false,characters=["orbit","spike"]){const g=createGame(gameRoot);g.debug.dashball.setup({arena,teamSize},{characters,ai,seed:512});return g;}
function fixture(gravity={x:0,y:1}){
  const stage=D.arena(arena),s=D.create({arena,ballCount:1,winningScore:500},stage),w={stage,gravity,fighters:[],terrain:()=>stage.terrain.concat(stage.ballOnly),attacks:()=>[],attackTouches:()=>false};
  return {stage,s,w,tick(n=1){for(let i=0;i<n;i++)D.step(s,1/60,w);}};
}
function armSwitch(g,id){const f=g.debug.fighters[0],c=g.debug.dashball.arena.gravitySwitch;
  Object.assign(f,{x:c.x-65,y:c.y,prevX:c.x-65,prevY:c.y,onGround:false,hitstop:0,hitstun:0});
  const SetType=require("node:vm").runInContext("Set",g.sandbox);
  f.attack={id,dir:{x:1,y:0},age:.1,startup:0,active:1,recovery:.2,total:1.2,charge:0,hitTargets:new SetType()};return f;
}
check("separate Battle arena retains Golden Rush settings, rings, platforms and safe ball spawns",()=>{
  const c=D.options({arena,ruleset:"court"}),stage=D.arena(arena),old=D.arena("golden-rush"),s=D.create(c,stage);
  assert.equal(c.ruleset,"battle");assert.equal(c.ballCount,10);assert.equal(c.goldenReward,15);assert.equal(c.goldenRespawn,20);assert.equal(c.winningScore,100);assert.equal(c.healthMult,.5);assert.equal(c.respawn,15);
  assert.deepEqual(stage.rings,old.rings);assert.deepEqual(stage.ballOnly,old.ballOnly);assert.deepEqual(stage.terrain.filter(t=>t.kind==="oneway"),old.terrain.filter(t=>t.kind==="oneway"));
  assert.equal(stage.wrap,false);assert(stage.fixedCamera);assert(stage.gravitySwitch.fourWay&&stage.gravitySwitch.noCooldown);assert(!old.gravitySwitch);assert(old.wrap);
  for(const b of D.balls(s))for(const rect of stage.terrain.concat(stage.ballOnly))assert(!D.circleRect(b,rect));
  const scene=G.scene("dashball",{arena});assert.match(scene.guide.twist,/walk/);assert.match(scene.guide.twist,/ceiling/);assert.equal(scene.stage.name,stage.name);
});
check("distinct melee hits cycle Down / Left / Up / Right without restarting or repeating a held attack",()=>{
  const g=setup(),d=g.debug,other=d.fighters[1];Object.assign(other,{onGround:false,airDashes:0,vx:87,vy:-43});
  for(let i=0;i<8;i++){
    const f=armSwitch(g,800+i);Object.assign(f,{vx:143,vy:-92});const ball=d.dashball.state.ball;Object.assign(ball,{vx:217,vy:-71});
    d.gravity.hitSwitch();assert.deepEqual(plain(d.gravity.vector),vectors[(i+1)%4]);assert.equal(ball.vx,217);assert.equal(ball.vy,-71);assert.equal(f.vx,143);assert.equal(f.vy,-92);assert.equal(other.airDashes,0);
    d.gravity.hitSwitch();assert.deepEqual(plain(d.gravity.vector),vectors[(i+1)%4]);
  }
});
check("projectile activation uses the shared four-way switch and consumes the projectile",()=>{
  const g=setup(1,false,["gunman","orbit"]),d=g.debug,f=d.fighters[0],c=d.dashball.arena.gravitySwitch;
  Object.assign(f,{x:c.x-110,y:c.y,prevX:c.x-110,prevY:c.y,onGround:false});
  f.projectiles.push({id:555,dir:{x:1,y:0},age:.1,startup:0,active:1,recovery:0,total:1,charge:0,hitTargets:new Set(),projectile:{ownerId:f.id,ownerTeam:f.team,x:c.x-60,y:c.y,radius:8,speed:1400,damage:5,knockback:500,hitstun:.04,spawned:true}});
  for(let i=0;i<10&&f.projectiles.length;i++)d.updateProjectiles(1/60);
  assert.deepEqual(plain(d.gravity.vector),vectors[1]);assert.equal(f.projectiles.length,0);
});
check("original Flip and Crosswire keep their cooldowns while vertical sports remain axis-locked",()=>{
  for(const name of ["Flip Chamber","Crosswire"]){const g=setup(),d=g.debug;d.dashball.standard();g.rb.setup({stageIndex:g.rb.stageNames.indexOf(name),characterKeys:["orbit","spike"],seed:12});
    armSwitch(g,400);d.gravity.hitSwitch();const first=plain(d.gravity.vector);assert.deepEqual(first,name==="Crosswire"?vectors[1]:vectors[2]);armSwitch(g,401);d.gravity.hitSwitch();assert.deepEqual(plain(d.gravity.vector),first);d.gravity.advanceSwitchCooldown(.5);d.gravity.hitSwitch();assert.deepEqual(plain(d.gravity.vector),name==="Crosswire"?vectors[2]:vectors[0]);
  }
  const g=setup();g.debug.dashball.setup({arena:"gravity-soccer"});for(let i=0;i<4;i++){armSwitch(g,500+i);g.debug.gravity.hitSwitch();assert.deepEqual(plain(g.debug.gravity.vector),vectors[i%2?0:2]);}
});
check("balls keep velocity on a flip and accelerate along every shared gravity direction",()=>{
  for(const gravity of vectors){const f=fixture(gravity),b=f.s.ball;Object.assign(b,{x:1400,y:1050,vx:140,vy:-110});const vx=b.vx,vy=b.vy;f.tick();
    assert(Math.abs(b.vx-vx-f.s.config.gravity*gravity.x/60)<1e-6);assert(Math.abs(b.vy-vy-f.s.config.gravity*gravity.y/60)<1e-6);
    assert(Math.hypot(b.vx,b.vy)<=f.s.config.maxSpeed+.01);
  }
});
function surface(g,gravity,index=0){const d=g.debug,stage=d.dashball.arena,f=d.fighters[index];d.gravity.setDirection(gravity.x?"x":"y",gravity.x||gravity.y);
  const x=gravity.x<0?24+f.data.width/2+.1:gravity.x>0?stage.width-24-f.data.width/2-.1:stage.width/2;
  const y=gravity.y<0?24+f.data.height/2+.1:gravity.y>0?stage.floorY-f.data.height/2-.1:stage.floorY/2;
  Object.assign(f,{x,y,prevX:x,prevY:y,onGround:false,vx:gravity.x*60,vy:gravity.y*60,airDashes:0,hasLiveAim:false,invulnerable:0});
  return f;
}
check("every fighter can land and walk both directions along all four solid boundaries",()=>{
  const keys=setup().rb.characterKeys.filter(k=>["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus"].includes(k));assert.equal(keys.length,14);
  for(const key of keys)for(const gravity of vectors)for(const sign of [-1,1]){
    const g=setup(1,false,[key,"orbit"]),d=g.debug,f=surface(g,gravity);for(let i=0;i<3;i++)d.gravity.physics(0);assert(f.onGround,`${key}/${JSON.stringify(gravity)} landing`);assert.equal(f.airDashes,f.data.maxAirDashes);
    const start=gravity.x?f.y:f.x;Object.assign(f,{hasLiveAim:true,aim:gravity.x?{x:0,y:sign}:{x:sign,y:0}});
    for(let i=0;i<30;i++)d.gravity.physics(0);assert(f.onGround);assert(((gravity.x?f.y:f.x)-start)*sign>15,`${key}/${JSON.stringify(gravity)}/${sign} walking`);assert.equal(f.hitstun,0);
  }
});
check("normal charged jumps launch away from the current walking surface without new controls",()=>{
  for(const key of ["orbit","chungus","boomerangus"])for(const gravity of vectors){const g=setup(1,false,[key,"spike"]),d=g.debug,f=surface(g,gravity);for(let i=0;i<3;i++)d.gravity.physics(0);
    const start={x:f.x,y:f.y};Object.assign(f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true,aim:{x:-gravity.x,y:-gravity.y}});d.gravity.dash(0,{x:-gravity.x,y:-gravity.y},f.data.dashChargeTime);
    for(let i=0;i<12;i++)d.gravity.physics(0);assert(!f.onGround);assert((f.x-start.x)*-gravity.x+(f.y-start.y)*-gravity.y>20,`${key}/${JSON.stringify(gravity)}`);
  }
});
check("hoops retain 1/3/5 awards and the golden target retains HP, combo reactions and reward",()=>{
  for(const gravity of vectors)for(const team of [0,1])for(const row of [0,1,2]){
    const f=fixture(gravity),ring=f.stage.rings.find(r=>r.team===team&&r.row===row),b=f.s.ball,sign=team?1:-1;
    Object.assign(b,{x:ring.line-sign*30,y:(ring.top+ring.bottom)/2,vx:sign*1800,vy:0});f.tick(3);assert.equal(f.s.scores[1-team],ring.points);f.tick(3);assert.equal(f.s.scores[1-team],ring.points);
  }
  for(const gravity of vectors){const f=fixture(gravity),p={id:"p1",team:0,onGround:false,data:{punchDamage:12,punchKnockback:800}},a={id:12,dir:{x:1,y:-.2},charge:0,grounded:false};
    assert.equal(f.s.golden.health,48);assert(D.goldenRush.hit(f.s,p,a,f.w));assert(f.s.golden.hitstun>0);const vx=f.s.golden.vx,vy=f.s.golden.vy;f.tick();assert(Math.abs(f.s.golden.vx-vx*Math.exp(-D.goldenRush.tuning.drag/60)-D.goldenRush.tuning.gravity*gravity.x/60)<1e-6);assert(Math.abs(f.s.golden.vy-vy*Math.exp(-D.goldenRush.tuning.drag/60)-D.goldenRush.tuning.gravity*gravity.y/60)<1e-6);
    f.s.golden.health=1;D.goldenRush.hit(f.s,p,{...a,id:13},f.w);assert.equal(f.s.scores[0],15);assert.equal(f.s.golden.respawn,20);
  }
});
check("Battle KOs respawn on separated gravity-facing lanes without resetting objectives or gravity",()=>{
  for(const gravity of vectors){const g=setup(5),d=g.debug;d.gravity.setDirection(gravity.x?"x":"y",gravity.x||gravity.y);const s=d.dashball.state,b=s.ball;s.scores=[4,8];b.x=1200;b.vx=85;
    d.dashball.knockout(0);assert(d.fighters[0].koScored);const pending=s.respawns;pending[d.fighters[0].id]=1/60;d.dashball.step();const f=d.fighters[0];assert(!f.koScored);assert(f.invulnerable>1.9);assert.equal(f.health,Math.round(f.data.maxHealth*.5));assert.deepEqual([...s.scores],[4,8]);assert.equal(s.ball,b);assert.deepEqual(plain(d.gravity.vector),gravity);assert(f.x>=24+f.data.width/2-.1&&f.x<=d.dashball.arena.width-24-f.data.width/2+.1);assert(f.y>=24+f.data.height/2-.1&&f.y<=d.dashball.arena.floorY-f.data.height/2+.1);
  }
});
check("all core fighter shot planners remain finite for vertical and horizontal gravity, including zero-X launches",()=>{
  const keys=setup().rb.characterKeys.filter(k=>["anchor","orbit","spike","rain","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus"].includes(k));
  for(const key of keys)for(const gravity of vectors){const g=setup(1,false,[key,"orbit"]),d=g.debug,s=d.dashball.state,f=d.fighters[0];d.gravity.setDirection(gravity.x?"x":"y",gravity.x||gravity.y);
    for(const x of [1400,386]){Object.assign(s.ball,{x,y:1200,vx:0,vy:0});const plan=D.goldenRush.plan(s,f,d.dashball.world(0),s.ball);assert(plan);assert([plan.aim.x,plan.aim.y,plan.approach.x,plan.approach.y,plan.error,plan.cost].every(Number.isFinite),`${key}/${JSON.stringify(gravity)}/${x}`);}
  }
});
check("snapshots, replay and delayed rollback retain four-way switch, scoring and ammunition state",()=>{
  const games=[setup(1,false,["gunman","boomerangus"]),setup(1,false,["gunman","boomerangus"])];for(const g of games)armSwitch(g,901);
  const [a,b]=games,start=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];
  for(let i=0;i<180;i++){const row=[0,1].map(n=>R.encode({hasAim:true,aimX:n?-1:1,aimY:Math.sin(i*.03+n),punchHeld:(i+n*7)%31<7,dashHeld:i%53<8}));rows.push(row);pending.push({frame:i,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(row.map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);const end=a.rb.hash();b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(a.rb.hash(),b.rb.hash());a.rb.restore(start);for(const row of rows)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),end);
  a.debug.dashball.setup({arena},{characters:["gunman","boomerangus"]});assert.deepEqual(plain(a.debug.gravity.vector),vectors[0]);assert.deepEqual([...a.debug.dashball.state.scores],[0,0]);assert.equal(D.balls(a.debug.dashball.state).length,10);
});
check("30/60/120 Hz agree while ten native CPUs remain finite and deterministic",()=>{
  const hashes=[];for(const hz of [30,60,120]){const g=setup();armSwitch(g,901);g.debug.matchFlow.begin({countdown:false});for(let i=1;i<=hz;i++)g.render(1000+i*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(hashes[0],hashes[1]);assert.equal(hashes[0],hashes[2]);
  const games=[setup(5,true,["chungus","boomerangus","gunman","archer","edgebert","kite","orbit","spike"]),setup(5,true,["chungus","boomerangus","gunman","archer","edgebert","kite","orbit","spike"])];
  for(let i=0;i<360;i++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());const d=games[0].debug;assert(d.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));assert(D.balls(d.dashball.state).every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)));}
});
check("original stages, fighters and all other sports preserve prior release behavior and stage order",()=>{
  const old=createGame(path.resolve("exports/Dash-Punch-Own-Goals-Release-2026-11-14")),now=createGame(gameRoot),oldNames=[...old.rb.stageNames];
  assert.deepEqual([...now.rb.stageNames].filter(name=>oldNames.includes(name)),oldNames);assert.equal(now.rb.stageNames[oldNames.length],D.arena(arena).name);
  const canonical=g=>{const s=plain(g.rb.save().core);s.stageIndex=0;for(const f of s.fighters)for(const key of ["groundTerrainId","platformDropPlatformId","wallContactId","currentWallId","activeClingWallId","lastResourceWallId","surfaceTechTarget"])if(typeof f[key]==="string")f[key]=f[key].replace(/^\d+:/,"stage:");return R.hash(s);};
  for(const key of old.rb.characterKeys){for(const g of [old,now]){g.debug.dashball.standard();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Crosswire"),characterKeys:[key,"orbit"],seed:211});}assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));for(let i=0;i<60;i++){const row=[{aimX:1,punchHeld:i%31<8,dashHeld:i%43<7},{aimX:-1}];old.rb.step(row);now.rb.step(row);assert.equal(canonical(old),canonical(now),`${key}/${i}`);}}
  // Requested floatier sports balls have dedicated tuning/replay coverage.
  for(const id of old.sandbox.Dashball.ARENAS.map(a=>a.id).filter(id=>!D.isFloatBallArena(id)&&id!=="total-rush")){for(const g of [old,now])g.debug.dashball.setup({arena:id,teamSize:3},{characters:["boomerangus","edgebert","kite"],ai:true,seed:623});for(let i=0;i<90;i++){old.debug.dashball.step();now.debug.dashball.step();assert.equal(canonical(old),canonical(now),`${id}/${i}`);}}
  for(const ruleset of ["race","brawl","scramble"]){for(const g of [old,now])g.debug.sandbag.setup({ruleset,teamSize:3},{characters:["rain","chungus"],ai:true,seed:42});for(let i=0;i<60;i++){old.debug.sandbag.step();now.debug.sandbag.step();assert.equal(canonical(old),canonical(now),ruleset);}}
});
console.log(`${groups} four-way Golden Rush groups passed`);
