"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const DT=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`),neutral=()=>R.decode(R.neutral());
function pose(f,x=450,y=-5000){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,hitstop:0,hitstun:0,invulnerable:0,spotDodgeInvuln:0,comboHits:0,comboGrace:0,dashParry:0,shieldReleaseParry:0});}
function setup({key="booster",target="anchor",arena,ruleset="battle",teamSize=1,teams,ff=true}={}){
  const g=createGame();
  if(arena)g.debug.dashball.setup({arena,ruleset,teamSize},{characters:[key,target,"orbit","rain"],ai:false,seed:196});
  else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,target],seed:196});
  if(teams){g.debug.ai.configure({stageName:"High Perch",teamModeId:"teams2",teams,characters:[key,target]});}
  const s=g.rb.save();s.core.teamAttackEnabled=ff;g.rb.restore(s);
  g.debug.fighters.forEach((f,i)=>pose(f,i?1500+i*300:450));return g;
}
function hit(g,charge=0,target=1){const a=g.debug.fighters[0],t=g.debug.fighters[target];pose(t,a.x+75,a.y);g.debug.booster.punch(0,charge);const attack=a.attack;attack.age=attack.startup+.01;g.debug.handleHits();return attack;}
test("Booster is core fighter 16; Anchor dash values, slower walking and two charges",()=>{
  const g=setup(),b=g.debug.fighters[0].data,a=g.debug.fighters[1].data;
  assert.equal(g.rb.characterKeys.indexOf("booster"),15);assert.equal(b.maxAirDashes,2);assert.equal(b.punchChargeTime,3);assert.equal(b.punchDamage,30);assert.equal(b.maxHealth,145);
  for(const k of["dashBase","dashMax","airDashScale","dashChargeTime","gravity"])assert.equal(b[k],a[k],k);
  assert.equal(b.walkSpeedScale,.86);assert(b.punchDamage>a.punchDamage);assert(b.punchWhiffLag+b.punchWhiffCharge>a.punchWhiffLag*2);
});
test("native hold/release caps at three seconds and every charge has a 50ms active window",()=>{
  const g=setup(),f=g.debug.fighters[0];Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});
  f.controls.actions.punchHeld=true;f.controls.buffers.punchPressed=.09;g.debug.updateHumanInput(0);
  for(let i=0;i<210;i++)g.debug.updateHumanInput(0);near(f.punchCharge,3);
  f.controls.actions.punchHeld=false;f.controls.buffers.punchReleased=.09;g.debug.updateHumanInput(0);near(f.attack.charge,1);near(f.attack.active,.05);near(f.attack.startup,.175);
  for(const charge of[0,.25,.5,1]){f.attack=null;g.debug.booster.punch(0,charge);near(f.attack.active,.05);near(f.attack.recovery,.14+.41*charge*charge);}
});
test("a miss is not classified during active frames and receives long post-whiff recovery",()=>{
  const g=setup(),f=g.debug.fighters[0];g.debug.fighters[1].x=1000;g.debug.booster.punch(0,1);
  for(let i=0;i<12;i++)g.debug.gravity.physics(0);assert.equal(f.whiffLag,0);assert(f.attack);
  for(let i=0;i<50;i++)g.debug.gravity.physics(0);assert(!f.attack);assert(f.whiffLag>.5);assert(!g.debug.fighters[1].boosterEnhancement);
});
test("enemy and FFA hits apply normal damage/knockback before enhancing survivors",()=>{
  for(const charge of[0,.5,1]){const g=setup(),t=g.debug.fighters[1],health=t.health;hit(g,charge);assert.equal(health-t.health,Math.round(30*(1+charge*.8)));assert(Math.hypot(t.vx,t.vy)>0&&Math.hypot(t.vx,t.vy)<100);near(t.boosterEnhancement.charge,charge);near(t.boosterEnhancement.remaining,2+charge*7);}
  const g=setup({target:"booster"});hit(g,1);assert(g.debug.fighters[1].boosterEnhancement);
});
test("a lethal punch never grants enhancement",()=>{const g=setup(),t=g.debug.fighters[1];t.health=1;g.debug.booster.punch();const a=g.debug.fighters[0].attack;a.age=a.startup+.01;g.debug.resolveHit(0,1);assert.equal(t.health,0);assert(!t.boosterEnhancement);});
test("same-team support works with friendly damage disabled and never changes global FF",()=>{
  for(const ff of[false,true]){const g=setup({teams:[0,0],ff}),t=g.debug.fighters[1],health=t.health;hit(g,.5);assert(t.boosterEnhancement);assert.equal(t.health<health,ff);assert.equal(Math.hypot(t.vx,t.vy)>0,ff);assert.equal(g.rb.save().core.teamAttackEnabled,ff);}
  const g=setup({key:"anchor",teams:[0,0],ff:false}),t=g.debug.fighters[1],health=t.health;hit(g,1);assert.equal(t.health,health);assert(!t.boosterEnhancement);
});
test("Court teammate gets support without HP, knockback, hitstun, shield or parry damage",()=>{
  const g=setup({arena:"standard",ruleset:"court",teamSize:2}),t=g.debug.fighters[2],health=t.health;pose(t,525,-5000);const shield=t.shieldHealth;
  hit(g,1,2);assert(t.boosterEnhancement);assert.equal(t.health,health);near(t.vx,0);near(t.vy,0);near(t.hitstun,0);near(t.shieldHealth,shield);
  const enemy=g.debug.fighters[1];hit(g,1,1);assert(enemy.boosterEnhancement);assert.equal(enemy.health,enemy.data.maxHealth);near(enemy.vx,0);near(enemy.vy,0);
});
test("Battle friendly damage setting is honored while support remains available",()=>{
  for(const ff of[false,true]){const g=setup({arena:"standard",teamSize:2,ff}),t=g.debug.fighters[2],health=t.health;hit(g,.25,2);assert(t.boosterEnhancement);assert.equal(t.health<health,ff);}
});
test("invulnerability, intangibility and shields still prevent a clean enhancement hit",()=>{
  const g=setup();g.debug.fighters[1].invulnerable=1;g.debug.booster.punch();g.debug.resolveHit(0,1);assert(!g.debug.fighters[1].boosterEnhancement);
  const p=setup({target:"phantom"});p.debug.gravity.dash(1,{x:1,y:0});hit(p,1);assert(!p.debug.fighters[1].boosterEnhancement);
  const s=setup(),target=s.debug.fighters[1];Object.assign(target,{chargingPunch:true,punchInputHeld:true,punchHoldTimer:.2,punchAim:{x:-1,y:0}});const health=target.health;hit(s,.5);assert(!target.boosterEnhancement);assert.equal(health-target.health,9,"preserve ordinary 22% shield chip");assert(target.shieldHealth<target.data.shieldMax);
});
test("nonstacking interpolation, stronger replacement, weaker rejection and equal refresh",()=>{
  const g=setup(),f=g.debug.fighters[1],base=JSON.stringify(f.data);
  for(const charge of[0,.25,.5,.75,1]){delete f.boosterEnhancement;assert(g.debug.booster.apply(1,charge));const s=g.debug.booster.scales(1);near(s.movement,1.1+.35*charge);near(s.action,1.05+.25*charge);near(s.power,1.1+.4*charge);near(f.boosterEnhancement.remaining,2+7*charge);}
  g.debug.booster.tick(1,2);assert(!g.debug.booster.apply(1,.5));near(f.boosterEnhancement.remaining,7);assert(g.debug.booster.apply(1,1));near(f.boosterEnhancement.remaining,9);near(g.debug.booster.scales(1).power,1.5);assert.equal(JSON.stringify(f.data),base);
});
test("expiry restores effective stats without restarting or canceling an active attack",()=>{
  const g=setup({target:"edgebert"}),f=g.debug.fighters[1];g.debug.booster.apply(1,1);g.debug.booster.punch(1,.5);const a=f.attack;
  g.debug.booster.tick(1,9);assert(!f.boosterEnhancement);assert.equal(f.attack,a);assert.deepEqual(plain(g.debug.booster.scales(1)),{movement:1,action:1,power:1});
});
test("startup, active, recovery and combo cancel timing scale once on every recipient",()=>{
  for(const key of["anchor","edgebert","gunman","archer","whipado","boomerangus","phantom"]){const g=setup({target:key}),f=g.debug.fighters[1];g.debug.booster.punch(1,.4);const base=plain(f.attack);f.attack=null;g.debug.booster.apply(1,1);g.debug.booster.punch(1,.4);for(const k of["startup","active","recovery","total"])near(f.attack[k],base[k]/1.3);assert.equal(f.data.punchChargeTime,key==="boomerangus"?1.15:key==="anchor"?.74:f.data.punchChargeTime);}
});
test("movement enhancement affects voluntary walking/dashing, never global velocity or gravity",()=>{
  const g=setup(),f=g.debug.fighters[1];Object.assign(f,{onGround:true,hasLiveAim:true,aim:{x:1,y:0}});g.debug.booster.walk(1,1);near(f.vx,132);f.vx=0;g.debug.booster.apply(1,1);g.debug.booster.walk(1,1);near(f.vx,132*1.45);f.vx=0;f.vy=0;g.debug.gravity.dash(1,{x:1,y:0});const speed=f.vx;delete f.boosterEnhancement;f.vx=f.vy=0;f.onGround=true;g.debug.gravity.dash(1,{x:1,y:0});near(speed/f.vx,1.45);f.vx=4000;g.debug.booster.apply(1,1);near(f.vx,4000);
});
test("two ordinary air dashes, third blocked, ground dash free, landing restores both",()=>{
  const g=setup(),f=g.debug.fighters[0];for(let n=0;n<2;n++){g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,1-n);}const x=f.vx;g.debug.gravity.dash(0,{x:1,y:0});near(f.vx,x);assert.equal(f.airDashes,0);assert(!f.phantomDash);
  const floor=1040;pose(f,640,floor-f.data.height/2-1);f.airDashes=0;f.vy=120;g.debug.gravity.physics(0);assert(f.onGround);assert.equal(f.airDashes,2);g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,2);
});
test("all sports balls accept Booster punches and never acquire fighter buffs",()=>{
  const D=require("../dashball");for(const {id:arena} of D.ARENAS){const g=setup({arena}),f=g.debug.fighters[0],s=g.debug.dashball.state,b=s.ball;g.debug.booster.punch(0,.5);const a=f.attack;a.age=a.startup+.01;b.x=f.x+80;b.y=f.y;assert(g.debug.dashball.shot(0,a));assert(!f.attack,"sports hit must confirm instead of whiff");assert(!b.boosterEnhancement);assert(Math.hypot(b.vx,b.vy)>1,arena);}
});
test("enhanced compatible ball and boulder impulses scale without changing objective ownership",()=>{
  for(const arena of["standard","elevated","golden-rush","target-charge-stationary","boulder-control","gravity-boulder","total-rush"]){const values=[];for(const boosted of[false,true]){const g=setup({key:"anchor",arena}),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;if(boosted)g.debug.booster.apply(0,1);g.debug.booster.punch(0,.1);const a=f.attack;b.vx=b.vy=0;b.x=f.x+80;b.y=f.y;g.debug.dashball.shot(0,a);values.push({speed:Math.hypot(b.vx,b.vy),team:b.scoringTeam});}assert(values[1].speed>values[0].speed*1.1,arena);assert.equal(values[1].team,values[0].team);}
});
test("sandbag damage and impulse use the enhancement, not fighter buffs on the bag",()=>{
  const values=[];for(const enhanced of[false,true]){const g=createGame();g.debug.sandbag.setup({ruleset:"brawl"},{characters:["booster","anchor"],seed:196});if(enhanced)g.debug.booster.apply(0,1);g.debug.booster.punch(0,.2);assert(g.debug.sandbag.hit(0,g.debug.fighters[0].attack));const bag=g.debug.sandbag.state.bags[0];assert(!bag.boosterEnhancement);values.push({damage:bag.damage,speed:Math.hypot(bag.vx,bag.vy)});}assert(values[1].damage>values[0].damage);assert(values[1].speed>values[0].speed);
});
test("KO, respawn and reset clear enhancement",()=>{const g=setup({arena:"standard"});g.debug.booster.apply(1,1);g.debug.dashball.knockout(1);assert(!g.debug.fighters[1].boosterEnhancement);g.debug.booster.apply(0,1);g.debug.fighters[0].reset(true);assert(!g.debug.fighters[0].boosterEnhancement);});
test("legacy peer snapshots preserve Booster identity and enhancement state",()=>{const a=setup(),b=setup();hit(a,.75);const snapshot=a.debug.online.createSnapshot();assert.equal(snapshot.fighters[0].characterKey,"booster");b.debug.online.installSnapshot(snapshot);assert.deepEqual(plain(b.debug.fighters[1].boosterEnhancement),plain(a.debug.fighters[1].boosterEnhancement));assert.deepEqual(plain(b.debug.booster.scales(1)),plain(a.debug.booster.scales(1)));});
test("snapshots/replay and delayed rollback reproduce real applied buffs without duplication",()=>{
  for(const arena of[undefined,"standard","target-charge-stationary"]){const a=setup({arena}),b=setup({arena});for(const g of[a,b]){hit(g,1);assert(g.debug.fighters[1].boosterEnhancement);}
    const snapshot=a.rb.save(),manager=b.rb.manager(0,8),queue=[],inputs=[];
    for(let frame=0;frame<120;frame++){const row=[R.neutral(),R.encode({hasAim:true,aimX:-1,aimY:-.3,dashHeld:frame%27<4,punchHeld:frame%19<3})];inputs.push(row);queue.push({frame,input:row[1]});if(queue.length>6){const p=queue.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(row.map(R.decode));}
    for(const p of queue)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(b.rb.hash(),a.rb.hash());const hash=a.rb.hash();a.rb.restore(snapshot);for(const row of inputs)a.rb.step(row.map(R.decode));assert.equal(a.rb.hash(),hash);assert(a.debug.fighters[1].boosterEnhancement);
  }
});
test("rollback across the actual punch contact grants one enhancement and one damage event",()=>{
  const games=[setup(),setup()];for(const g of games){pose(g.debug.fighters[1],525,-5000);g.debug.booster.punch(0,.75);}
  const [a,b]=games,health=a.debug.fighters[1].health,manager=b.rb.manager(0,8),pending=[];
  for(let frame=0;frame<90;frame++){const row=[R.neutral(),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(frame*.31)*.3})];pending.push({frame,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(row.map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>10);assert.equal(a.rb.hash(),b.rb.hash());assert.equal(health-a.debug.fighters[1].health,48);near(a.debug.fighters[1].boosterEnhancement.charge,.75);
});
test("30/60/120Hz render schedules give identical fixed-step buff expiration",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.booster.apply(1,0);for(let n=1;n<=hz*3;n++)g.render(1000+n*1000/hz+.001);assert(!g.debug.fighters[1].boosterEnhancement);near(g.rb.save().core.stageTime,3);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("ten-CPU sports decisions remain deterministic and use native attacks",()=>{
  const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena:"standard",teamSize:5},{characters:["booster","anchor","booster","edgebert","booster","kite","booster","chungus","booster","phantom"],ai:true,seed:438});
  let attacks=0;for(let n=0;n<360;n++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());if(games[0].debug.fighters.some(f=>f.data.booster&&(f.chargingPunch||f.attack)))attacks++;}assert(attacks>0);assert(games[0].debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));
});
