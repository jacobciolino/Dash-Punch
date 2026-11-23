"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{execFileSync}=require("node:child_process"),I=require("../ice"),R=require("../rollback"),D=require("../dashball"),P=require("../fighter-presentation"),{createGame}=require("./simulation-harness");
const dt=1/60,near=(a,b,e=1e-7)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
function pose(f,x=300,y=-5000){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,hitstun:0,hitstop:0,invulnerable:0,hasLiveAim:false});}
function setup({target="anchor",arena,ruleset="battle",size=1,source}={}){
  const g=createGame(process.cwd(),source?{sourceOverrides:{"game.js":source}}:{});
  if(arena){g.debug.dashball.setup({arena,ruleset,teamSize:size},{characters:["icer",target],seed:331,ai:false});g.debug.dashball.state.phase="playing";}
  else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["icer",target],seed:331});
  g.debug.fighters.forEach((f,i)=>pose(f,300+i*1000));return g;
}
function emit(g,points,fall=true){g.debug.ice.emit(0,points);if(fall)for(const c of g.debug.fighters[0].ice.icicles){c.age=.4;c.vy=1200;}}
function ground(g,index=0,x=600){const f=g.debug.fighters[index];pose(f,x,g.debug.dashball.arena.floorY-f.data.height/2);f.onGround=true;return f;}
function holdShield(f,up=true){Object.assign(f,{chargingPunch:true,punchPending:true,punchInputHeld:true,punchAim:{x:0,y:up?-1:1},punchExhausted:false,shieldReactivationTimer:0,shieldDashLockout:false});}
test("Icer is core fighter 20 with 102 HP, a fragile 24-point shield and four ordinary air dashes",()=>{
  const g=setup(),[f,a]=g.debug.fighters;assert.equal(g.rb.characterKeys.indexOf("icer"),19);assert.equal(f.data.maxHealth,102);assert(f.data.maxHealth<a.data.maxHealth*.7);assert.equal(f.airDashes,4);assert.equal(f.data.shieldMax,24);assert.equal(f.data.spriteSet,"seekerpro");assert.equal(f.data.spriteTint,"#527496");assert(f.data.walkAccelScale<.25);assert.equal(f.data.groundFriction,.995);
});
test("four-dash tuning changes only Icer's maximum stock, not derived movement or other fighter data",()=>{
  const source=execFileSync("git",["show","5128ad4:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),before=setup({source}),now=setup();
  for(const key of now.rb.characterKeys){for(const g of[before,now])g.rb.setup({stageIndex:0,characterKeys:[key,"anchor"],seed:331});const old=plain(before.debug.fighters[0].data),current=plain(now.debug.fighters[0].data);if(key==="icer"){assert.equal(old.maxAirDashes,2);assert.equal(current.maxAirDashes,4);current.maxAirDashes=old.maxAirDashes;}assert.deepEqual(current,old,key);}
});
test("air launches and neutral travel match Anchor while ground launches remain short and slow",()=>{
  for(const charge of[0,.5,1]){const g=setup();for(const[i,f]of g.debug.fighters.entries()){pose(f);g.debug.gravity.dash(i,{x:1,y:0},f.data.dashChargeTime*charge);}const[f,a]=g.debug.fighters;near(f.vx,a.vx);near(f.dashCarryTimer,a.dashCarryTimer);for(let n=0;n<36;n++)for(const i of[0,1])g.debug.gravity.physics(i);near(f.x,a.x);for(let n=0;n<2;n++)g.debug.gravity.physics(0);assert.equal(f.ice.icicles.length,3);assert.equal(f.airDashes,3);}
  const g=setup();for(const[i,f]of g.debug.fighters.entries()){f.onGround=true;g.debug.gravity.dash(i,{x:1,y:0});}assert(g.debug.fighters[0].vx<g.debug.fighters[1].vx*.6);
});
test("all four air dashes emit three fixed-position icicles; native landing restores four charges",()=>{
  const g=setup(),f=g.debug.fighters[0];for(let dash=0;dash<4;dash++){g.debug.gravity.dash(0,{x:1,y:0});for(let n=0;n<38;n++)g.debug.gravity.physics(0);assert.equal(f.airDashes,3-dash);const saved=g.rb.save();f.airDashes=4;g.rb.restore(saved);assert.equal(f.airDashes,3-dash);}assert.equal(f.airDashes,0);assert.equal(f.ice.icicles.length,12);const positions=f.ice.icicles.map(c=>[c.x,c.y]);f.x+=600;assert.deepEqual(f.ice.icicles.map(c=>[c.x,c.y]),positions);const vx=f.vx;g.debug.gravity.dash(0,{x:-1,y:0});near(f.vx,vx);
  const s=setup({arena:"standard"}),p=s.debug.fighters[0];p.airDashes=0;ground(s);p.onGround=false;p.vy=100;s.debug.gravity.physics(0);assert(p.onGround);assert.equal(p.airDashes,4);
});
test("arc-length resampling spaces the three icicles evenly across the actual path",()=>{
  const s=I.create();I.startAir(s,{x:0,y:0},.6);for(const p of[{x:20,y:0},{x:100,y:0},{x:300,y:0}])I.sampleAir(s,p,.2,(a,b)=>({x:b.x-a.x,y:b.y-a.y}));assert.equal(s.icicles.length,3);for(const[c,x]of s.icicles.map((c,i)=>[c,[50,150,250][i]]))near(c.x,x);assert(s.icicles.every(c=>c.vy===0&&c.age===0));
});
test("icicles telegraph for .4 seconds, then fall vertically without inherited velocity",()=>{
  const g=setup(),f=g.debug.fighters[0];emit(g,[{x:700,y:-5200}],false);const c=f.ice.icicles[0];for(let n=0;n<24;n++)g.debug.ice.tick(dt);near(c.y,-5200);near(c.vy,0);g.debug.ice.tick(dt);assert(c.y>-5200);near(c.x,700);assert(c.vy>0);
});
test("hanging icicles do not damage bodies; one falling dash event damages a target only once",()=>{
  const g=setup(),[f,t]=g.debug.fighters;pose(t,600,-5000);const health=t.health;emit(g,[{x:600,y:-5000}],false);g.debug.ice.tick(.1);assert.equal(t.health,health);f.ice=I.create();emit(g,Array.from({length:3},()=>({x:600,y:-5070})));g.debug.ice.tick(dt);assert.equal(t.health,health-6);assert.equal(f.ice.icicles.length,0);emit(g,[{x:600,y:-5070}]);g.debug.ice.tick(dt);assert.equal(t.health,health-12);
});
test("icicle damage has no hitstun, launch, combo credit or offensive/defensive resource refill",()=>{
  const g=setup(),[f,t]=g.debug.fighters;pose(t,600,-5000);Object.assign(f,{airDashes:0,escapeAvailable:false,punchParryAvailable:false,dashEscapeMeter:.2,punchParryMeter:.3});Object.assign(t,{vx:17,vy:-20,hitstun:0});emit(g,[{x:600,y:-5070}]);g.debug.ice.tick(dt);assert.equal(t.hitstun,0);near(t.vx,17);near(t.vy,-20);assert.equal(t.comboHits,0);assert.equal(f.airDashes,0);assert(!f.escapeAvailable&&!f.punchParryAvailable);near(f.dashEscapeMeter,.2);near(f.punchParryMeter,.3);
});
test("upward shields intercept before the body; uncovered rear approaches still damage",()=>{
  for(const up of[true,false]){const g=setup(),[f,t]=g.debug.fighters;pose(t,600,-5000);holdShield(t,up);const hp=t.health,shield=t.shieldHealth;emit(g,[{x:600,y:-5100}]);g.debug.ice.tick(.06);assert.equal(t.health,hp-(up?0:6));assert.equal(t.shieldHealth<shield,up);assert.equal(f.ice.icicles.length,0);}
});
test("native melee, including an intangible Phantom's rejection, controls icicle destruction",()=>{
  const g=setup(),f=g.debug.fighters[0];g.debug.booster.punch(0,.5);f.attack.age=f.attack.startup+.01;const box=g.debug.getPunchHitbox(0,f.attack.dir,.5);emit(g,[{x:box.cx,y:box.cy}],false);g.debug.ice.tick(dt);assert.equal(f.ice.icicles.length,0);
  const p=setup({target:"phantom"}),t=p.debug.fighters[1];pose(t,600,-5000);p.debug.gravity.dash(1,{x:1,y:0});assert(p.debug.phantom.ghost(1));emit(p,[{x:t.x,y:t.y-30}]);const hp=t.health;p.debug.ice.tick(.06);assert.equal(t.health,hp);assert.equal(p.debug.fighters[0].ice.icicles.length,1);
});
test("projectile sweeps destroy hanging ice and coatings, without changing projectile rules",()=>{
  const g=setup();emit(g,[{x:700,y:-5000}],false);g.debug.ice.projectile([{x1:400,y1:-5000,x2:1000,y2:-5000}],5);assert.equal(g.debug.fighters[0].ice.icicles.length,0);
  const s=setup({arena:"standard"}),f=ground(s);s.debug.ice.coating(0);const surface=s.debug.ice.support(0);s.debug.ice.projectile([{x1:f.x-100,y1:surface.y,x2:f.x+100,y2:surface.y}],4);assert.equal(f.ice.patches.length,0);
});
test("Gun Man's actual moving projectile can break an icicle through the normal lifecycle",()=>{
  const g=setup({target:"gunman",arena:"standard"}),f=ground(g,1,500);ground(g,0,200);emit(g,[{x:740,y:f.y}],false);g.debug.booster.punch(1,0);for(let n=0;n<25&&g.debug.fighters[0].ice.icicles.length;n++){g.debug.gravity.physics(1);g.debug.updateProjectiles();}assert.equal(g.debug.fighters[0].ice.icicles.length,0);assert(f.ammo<f.data.projectileConfig.magazine);
});
test("relative projectile sweeps catch a fast bullet crossing a falling icicle between endpoints",()=>{
  const state=I.create();I.emit(state,[{x:700,y:0}]);state.icicles[0].age=.4;state.icicles[0].vy=1200;
  const world={owner:{id:"owner"},attacks:()=>[],fighters:[],terrain:[],balls:[],projectiles:[{id:1,radius:3,paths:[{x1:500,y1:25,x2:900,y2:25}]}]};
  assert.equal(I.sweep({x:500,y:25},{x:900,y:25},I.rect(state.icicles[0]),3),null);I.step(state,dt,world);assert.equal(state.icicles.length,0);
});
test("balls physically break falling icicles with capped impulses and permanent ownership intact",()=>{
  for(const arena of["standard","elevated","golden-rush","target-charge-stationary","boulder-control","total-rush","volleyball"]){const g=setup({arena}),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;Object.assign(b,{x:800,y:-5000,prevX:800,prevY:-5000,vx:0,vy:0,carrier:null});const team=b.scoringTeam,owner=b.ownerTeam;emit(g,[{x:800,y:-5000-(b.r||24)-55}]);g.debug.ice.tick(.06);assert.equal(f.ice.icicles.length,0,arena);assert(b.vy>0&&b.vy<=160,arena);assert.equal(b.scoringTeam,team);assert.equal(b.ownerTeam,owner);assert.deepEqual(plain(g.debug.dashball.state.scores),[0,0]);}
});
test("fast moving balls use a relative sweep instead of tunneling through suspended icicles",()=>{
  const g=setup({arena:"target-charge-stationary"}),b=g.debug.dashball.state.ball;Object.assign(b,{x:1000,y:-5000,prevX:400,prevY:-5000,vx:6000,vy:0,carrier:null});emit(g,[{x:700,y:-5000}],false);g.debug.ice.tick(dt);assert.equal(g.debug.fighters[0].ice.icicles.length,0);assert(b.vx<6000&&b.vx>=5840);assert.equal(b.scoringTeam,0);
});
test("Court icicles stay physically active without fighter damage or scoring awards",()=>{
  const g=setup({arena:"standard",ruleset:"court"}),t=g.debug.fighters[1];pose(t,600,-5000);const hp=t.health;emit(g,[{x:600,y:-5070}]);g.debug.ice.tick(dt);assert.equal(t.health,hp);assert.deepEqual(plain(g.debug.dashball.state.scores),[0,0]);
});
test("allies obey the existing friendly-fire flag rather than an ice-specific exception",()=>{
  for(const enabled of[false,true]){const g=setup(),[f,t]=g.debug.fighters,snapshot=g.rb.save();snapshot.core.currentTeamModeIndex=1;snapshot.core.teamAttackEnabled=enabled;snapshot.core.fighters[0].team=0;snapshot.core.fighters[1].team=0;g.rb.restore(snapshot);pose(t,600,-5000);const hp=t.health;emit(g,[{x:600,y:-5070}]);g.debug.ice.tick(dt);assert.equal(t.health,hp-(enabled?6:0));}
});
test("solid floors shatter falling icicles and high-speed movement cannot tunnel",()=>{
  const g=setup({arena:"standard"}),f=g.debug.fighters[0],floor=g.debug.dashball.arena.floorY;emit(g,[{x:800,y:floor-150}]);g.debug.ice.tick(.2);assert.equal(f.ice.icicles.length,0);
});
test("ball goal detection and attribution remain native after an ice collision",()=>{
  for(const arena of["standard","elevated"]){const g=setup({arena}),s=g.debug.dashball.state,b=s.ball,goal=g.debug.dashball.arena.goals[0];Object.assign(b,{x:800,y:-5000,prevX:800,prevY:-5000,vx:0,vy:0,carrier:null});emit(g,[{x:800,y:-5080}]);g.debug.ice.tick(.06);assert.equal(g.debug.fighters[0].ice.icicles.length,0);
    Object.assign(b,{x:arena==="standard"?goal.line+35:(goal.left+goal.right)/2,y:arena==="standard"?goal.bottom-b.r-.01:goal.top-35,prevX:800,prevY:-5000,vx:arena==="standard"?-700:0,vy:arena==="standard"?0:700,ownerTeam:0,launched:2});for(const f of g.debug.fighters)pose(f,1500,-5000);for(let n=0;n<30;n++)g.debug.dashball.ballStep();assert.equal(s.scores[1],1,arena);assert.equal(s.goalSerial,1);
  }
});
test("inverted and sideways gravity do not redirect the icicles' vertical fall",()=>{
  for(const[axis,sign]of[["y",-1],["x",1],["x",-1]]){const g=setup(),f=g.debug.fighters[0];g.debug.gravity.setDirection(axis,sign);emit(g,[{x:700,y:-5200}]);g.debug.ice.tick(.1);const c=f.ice.icicles[0];near(c.x,700);assert(c.y>-5200&&c.vy>0);}
});
test("a seam-crossing dash leaves local icicles rather than spanning the full arena",()=>{
  const g=setup({arena:"standard-open"}),f=g.debug.fighters[0],width=g.debug.dashball.arena.width;pose(f,width-80,400);g.debug.gravity.dash(0,{x:1,y:0});for(let n=0;n<38;n++)g.debug.gravity.physics(0);assert.equal(f.ice.icicles.length,3);const xs=f.ice.icicles.map(c=>c.x);assert(xs.every(x=>x>=0&&x<=width));assert(xs.every(x=>x<600||x>width-600));
});
test("snapshot replay and delayed rollback restore a real sliding floor coating",()=>{
  const a=setup({arena:"standard"}),b=setup({arena:"standard"});for(const g of[a,b]){ground(g);g.debug.gravity.dash(0,{x:1,y:0});assert(g.debug.fighters[0].ice.patches.length);}
  const saved=a.rb.save(),manager=b.rb.manager(0,8),pending=[],rows=[];for(let n=0;n<75;n++){const row=[R.encode({hasAim:true,aimX:n<30?1:-1}),R.encode({hasAim:true,aimX:-1,punchHeld:n%23<3})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());const hash=a.rb.hash();a.rb.restore(saved);assert(a.debug.fighters[0].ice.patches.length);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);assert.equal(a.debug.fighters[0].ice.patches.length,0);
});
test("ground dash coats only real contacted surfaces, bounded to a short expiring patch",()=>{
  const g=setup({arena:"standard"}),f=ground(g);g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.ice.patches.length,1);const p=f.ice.patches[0];for(let n=0;n<20;n++)g.debug.gravity.physics(0);assert(p.end-p.start<=180);assert(p.end-p.start>f.data.width);assert(g.debug.ice.support(0));g.debug.ice.tick(.91);assert.equal(f.ice.patches.length,0);
  const air=setup();air.debug.gravity.dash(0,{x:1,y:0});assert.equal(air.debug.fighters[0].ice.patches.length,0);
});
test("coatings reduce friction for allies and opponents, but deliberate crouch still brakes",()=>{
  const g=setup({arena:"standard"}),f=ground(g),t=ground(g,1,f.x);g.debug.ice.coating(0);assert(g.debug.ice.under(1));Object.assign(t,{vx:600,hasLiveAim:false});g.debug.gravity.physics(1);near(t.vx,600*.995);assert(t.vx>600*t.data.groundFriction);t.crouching=true;t.onGround=true;g.debug.groundMovement.brake(1);near(t.vx,0);
});
test("Icer accelerates slowly, retains neutral and forward momentum, and reverses gradually",()=>{
  const g=setup({arena:"standard"}),f=ground(g),a=ground(g,1,1500);for(const p of[f,a])Object.assign(p,{hasLiveAim:true,aim:{x:1,y:0}});g.debug.groundMovement.walk(0);g.debug.groundMovement.walk(1);assert(f.vx<a.vx*.3);
  Object.assign(f,{vx:600,hasLiveAim:false});g.debug.gravity.physics(0);near(f.vx,597);Object.assign(f,{hasLiveAim:true,aim:{x:1,y:0}});g.debug.groundMovement.walk(0);near(f.vx,597);f.aim={x:-1,y:0};g.debug.groundMovement.walk(0);assert(f.vx>580);
});
test("coatings attach to surfaces rather than floating; direction and lifetime are authoritative",()=>{
  const s=I.create(),surface={id:"lift",x:100,y:300,w:160,h:20};I.startGround(s,surface,"y",1,80,20);const world={surface:()=>surface};near(I.patchRect(s.patches[0],world).y,297);surface.y=450;near(I.patchRect(s.patches[0],world).y,447);
  const g=setup({arena:"gravity-soccer"}),f=g.debug.fighters[0];g.debug.gravity.setDirection("y",-1);pose(f,600,24+f.data.height/2);f.onGround=true;g.debug.ice.coating(0);assert.equal(f.ice.patches.length,1);assert(g.debug.ice.under(0));g.debug.gravity.setDirection("y",1);assert(!g.debug.ice.under(0));
});
test("ground ice is destructible by native punches and rapid dashes cannot leak patches",()=>{
  const g=setup({arena:"standard"}),f=ground(g);g.debug.ice.coating(0);g.debug.booster.punch(0,.5,{x:0,y:1});f.attack.age=f.attack.startup+.01;g.debug.ice.tick(dt);assert.equal(f.ice.patches.length,0);f.attack=null;
  for(let n=0;n<100;n++)g.debug.ice.coating(0);assert(f.ice.patches.length<=I.TUNING.maxPatches);g.debug.ice.tick(1);assert.equal(f.ice.patches.length,0);
});
test("genuine shield break creates three icicles without restoring resources or removing stun",()=>{
  const g=setup(),f=g.debug.fighters[0];Object.assign(f,{airDashes:0,escapeAvailable:false,punchParryAvailable:false});g.debug.ice.breakShield(0);assert.equal(f.ice.icicles.length,3);assert(f.ice.icicles.every(c=>c.age===0&&c.vy===0));assert.equal(f.ice.events[0].source,"shield");assert.equal(f.stunType,"shieldBreak");assert(f.hitstun>0&&f.shieldBreakFlash>0);assert.equal(f.shieldHealth,0);assert.equal(f.airDashes,0);assert(!f.escapeAvailable&&!f.punchParryAvailable);assert.equal(f.invulnerable,0);
});
test("normal shield timeout does not spawn icicles; broken shields use standard regeneration",()=>{
  const g=setup(),f=g.debug.fighters[0];holdShield(f);g.debug.shields.tick(0,g.debug.shields.duration(0)+.01);assert(f.punchExhausted);assert.equal(f.ice.icicles.length,0);assert.equal(f.hitstun,0);f.punchExhausted=false;f.chargingPunch=false;g.debug.ice.breakShield(0);f.shieldRegenDelay=0;g.debug.shields.tick(0,1);assert(f.shieldHealth>0&&f.shieldHealth<f.data.shieldMax);
});
test("HUD and native sprite derivatives use snowflakes, spent droplets and a thermometer",()=>{
  const g=setup(),f=g.debug.fighters[0],hud=g.debug.compactHud.player(0);assert.equal(hud.key,"icer");assert.equal(hud.capacity,4);assert.equal(hud.remaining,4);assert.notDeepEqual(plain(g.debug.ice.motifs.available),plain(g.debug.ice.motifs.spent));assert(g.debug.hudReadability.profile("icer",100).some(r=>r.bottom-r.top>4));assert(P.KEYS.has("icer")&&P.CLEAN_SWORD.has("icer"));
  const pixels=new Uint8ClampedArray(30*30*4);for(let y=3;y<26;y++)for(let x=9;x<24;x++)pixels.set([90,50,125,255],(y*30+x)*4);pixels.set([0,240,40,255],(8*30+13)*4);const original=pixels.slice(),result=P.derive(pixels,original,30,30,"icer",[{x:0,y:0,w:30,h:30,name:"idle",frame:0,head:[15,3],anchor:{pivotX:15,foot:28}}]);assert(result.changed>0);assert.deepEqual([...pixels.slice((8*30+13)*4,(8*30+13)*4+4)],[193,250,255,255]);for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],original[i]);
});
test("KO, respawn and round reset remove all owned ice and retained movement state",()=>{
  const g=setup({arena:"standard"}),f=ground(g);emit(g,[{x:800,y:700}],false);g.debug.ice.coating(0);g.debug.dashball.knockout(0);assert.equal(f.ice.icicles.length,0);assert.equal(f.ice.patches.length,0);f.reset(true);assert.equal(f.airDashes,4);assert.deepEqual(plain(f.ice),I.create());
});
test("snapshot installation, replay and delayed-input rollback preserve ice paths, contacts and expiry",()=>{
  const a=setup(),b=setup();for(const g of[a,b]){g.debug.gravity.dash(0,{x:1,y:0});emit(g,[{x:900,y:-5100}],false);}const saved=a.rb.save(),rows=[],pending=[],manager=b.rb.manager(0,8);
  for(let n=0;n<150;n++){const row=[R.encode({hasAim:true,aimX:1,aimY:Math.sin(n*.04)*.3,dashHeld:n>=55&&n<60}),R.encode({hasAim:true,aimX:-1,dashHeld:n%45<4,punchHeld:n%33<5})];rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());const hash=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
  const snapshot=a.debug.online.createSnapshot();b.debug.online.installSnapshot(snapshot);assert.deepEqual(plain(a.debug.fighters[0].ice),plain(b.debug.fighters[0].ice));
});
test("30/60/120 Hz and deterministic ten-CPU sports reproduce the same ice state",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.gravity.dash(0,{x:1,y:-.1});for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
  const runs=[];for(let run=0;run<2;run++){const g=setup({arena:"golden-rush",size:5});g.debug.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["icer"],seed:331,ai:true});for(let n=0;n<180;n++)g.debug.dashball.step();assert(g.debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));assert(g.debug.fighters.every(f=>f.ice.icicles.length<=I.TUNING.maxIcicles&&f.ice.patches.length<=I.TUNING.maxPatches));runs.push(g.rb.hash());}assert.equal(runs[0],runs[1]);
});
test("previous fighters and sports preserve the immediate pre-Icer simulation when no Icer participates",()=>{
  const source=execFileSync("git",["show","654ccf2:game.js"],{encoding:"utf8",maxBuffer:8*1024*1024}),old=createGame(process.cwd(),{sourceOverrides:{"game.js":source}}),now=createGame();
  for(const key of now.rb.characterKeys.slice(0,19)){for(const g of[old,now]){g.debug.dashball.standard();g.rb.setup({stageIndex:0,characterKeys:[key,"anchor"],seed:331});}for(let n=0;n<45;n++){const input=[{hasAim:true,aimX:1,aimY:-.2,dashHeld:n%25<5,punchHeld:n%19<6},{}];old.rb.step(input);now.rb.step(input);assert.equal(old.rb.hash(),now.rb.hash(),`${key}/${n}`);}}
  for(const arena of["standard","gravity-flip-soccer","field-goal","volleyball","total-rush","target-charge-roaming"]){for(const g of[old,now])g.debug.dashball.setup({arena,teamSize:1},{characters:["anchor","boomerangus"],seed:331});for(let n=0;n<60;n++){old.rb.step([]);now.rb.step([]);assert.equal(old.rb.hash(),now.rb.hash(),`${arena}/${n}`);}}
});
test("offline core builder retains Icer and its runtime module without generating a release",()=>{
  const source=fs.readFileSync("game.js","utf8"),start=source.indexOf("  const CHARACTER_DATA = {"),end=source.indexOf("  const ARCHER_SPRITE_ROOT ="),data=vm.runInNewContext(source.slice(start,end)+";CHARACTER_DATA");assert(data.icer.ice);assert(fs.readFileSync("tools/build-core-release.cjs","utf8").includes('write("ice.js",read("ice.js"))'));assert(fs.readFileSync("index.html","utf8").includes('src="ice.js"'));
});
