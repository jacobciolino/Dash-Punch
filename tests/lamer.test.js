"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const DT=1/60,plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function pose(f,x=450,y=-5000){Object.assign(f,{x,y,prevX:x,prevY:y,vx:0,vy:0,onGround:false,hitstop:0,hitstun:0,invulnerable:0,spotDodgeInvuln:0,comboHits:0,comboGrace:0,dashParry:0,shieldReleaseParry:0});}
function setup({key="lamer",target="anchor",arena,ruleset="battle",teamSize=1,ff=true,teams}={}){
  const g=createGame();
  if(arena)g.debug.dashball.setup({arena,ruleset,teamSize},{characters:[key,target,"orbit","rain"],ai:false,seed:501});
  else g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,target],seed:501});
  if(teams)g.debug.ai.configure({stageName:"High Perch",teamModeId:"teams2",teams,characters:[key,target]});
  const s=g.rb.save();s.core.teamAttackEnabled=ff;g.rb.restore(s);g.debug.fighters.forEach((f,i)=>pose(f,i?1500+i*300:450));return g;
}
function hit(g,charge=0,index=1){const f=g.debug.fighters[0],t=g.debug.fighters[index];pose(t,f.x+75,f.y);f.attack=null;f.hitstop=0;g.debug.booster.punch(0,charge);const a=f.attack;a.age=a.startup+.01;g.debug.handleHits();return a;}
test("core fighter 17, exact Booster mobility, original Anchor dash and two air charges",()=>{
  const g=setup({target:"booster"}),[f,b]=g.debug.fighters;
  assert.equal(g.rb.characterKeys.indexOf("lamer"),16);assert.equal(f.data.name,"Lamer");assert.equal(f.data.maxAirDashes,2);assert.equal(f.data.maxHealth,145);
  for(const k of["walkSpeedScale","walkAccelScale","dashBase","dashMax","airDashScale","dashChargeTime","gravity","width","height","punchReach","punchRadius"])assert.equal(f.data[k],b.data[k],k);
});
test("both have responsive taps, smooth three-second charge and 50ms active hitboxes",()=>{
  for(const key of["lamer","booster"]){const g=setup({key}),f=g.debug.fighters[0];
    for(const charge of[0,.25,.5,.75,1]){g.debug.booster.punch(0,charge);near(f.attack.startup,.045+.075*charge);near(f.attack.active,.05);near(f.attack.recovery,.14+.41*charge*charge);}
    f.attack=null;Object.assign(f.controls,{hasAim:true,aim:{x:1,y:0}});f.controls.actions.punchHeld=true;f.controls.buffers.punchPressed=.09;g.debug.updateHumanInput(0);
    for(let i=0;i<210;i++)g.debug.updateHumanInput(0);near(f.punchCharge,3);
    f.controls.actions.punchHeld=false;f.controls.buffers.punchReleased=.09;g.debug.updateHumanInput(0);near(f.attack.charge,1);near(f.attack.startup,.175);
  }
});
test("tap misses recover quickly, charged whiffs wait for active resolution and punish commitment",()=>{
  for(const key of["lamer","booster"])for(const charge of[0,1]){const g=setup({key}),f=g.debug.fighters[0];g.debug.booster.punch(0,charge);const a=f.attack;
    a.age=a.startup+.02;g.debug.gravity.physics(0);assert.equal(f.whiffLag,0);assert(f.attack);
    a.age=a.total-DT/2;g.debug.gravity.physics(0);assert(!f.attack);near(f.whiffLag,.08+.82*charge*charge+charge*.16);
  }
});
test("Booster hits hard with very low directional knockback; Lamer damage stays low",()=>{
  for(const key of["booster","lamer"])for(const charge of[0,.5,1]){
    const g=setup({key}),[f,t]=g.debug.fighters,health=t.health;f.vx=1500;f.vy=-1000;hit(g,charge);
    assert.equal(health-t.health,Math.round((key==="booster"?30:7)*(1+charge*(key==="booster"?.8:.5))));
    near(t.vy,0);near(t.vx,(key==="booster"?70*(1+charge*.25):988*(1+.9*charge))*.88);
  }
});
test("each distinct punch adds one stack, refreshes five seconds, never exceeds three",()=>{
  const g=setup(),t=g.debug.fighters[1];for(let n=1;n<=5;n++){hit(g,n%2);assert.equal(t.lamerSuppression.stacks,Math.min(n,3));near(t.lamerSuppression.remaining,5);
    for(let i=0;i<8;i++)g.debug.handleHits();assert.equal(t.lamerSuppression.stacks,Math.min(n,3));g.debug.lamer.tick(1,.25);
  }
});
test("exact stack modifiers and all-at-once expiry never mutate fighter definitions",()=>{
  const g=setup(),t=g.debug.fighters[1],base=JSON.stringify(t.data);
  for(let n=1;n<=3;n++){g.debug.lamer.apply(1);const s=g.debug.booster.scales(1);near(s.movement,1-.1*n);near(s.action,1-.08*n);near(s.power,1-.12*n);}
  g.debug.lamer.tick(1,4.99);assert.equal(t.lamerSuppression.stacks,3);g.debug.lamer.tick(1,.01);assert(!t.lamerSuppression);assert.deepEqual(plain(g.debug.booster.scales(1)),{movement:1,action:1,power:1});assert.equal(JSON.stringify(t.data),base);
});
test("buff and debuff coexist multiplicatively and expire independently",()=>{
  const g=setup(),f=g.debug.fighters[1];g.debug.booster.apply(1,1);for(let i=0;i<3;i++)g.debug.lamer.apply(1);
  const s=g.debug.booster.scales(1);near(s.movement,1.45*.7);near(s.action,1.3*.76);near(s.power,1.5*.64);
  g.debug.lamer.tick(1,5);assert(!f.lamerSuppression);assert(f.boosterEnhancement);near(g.debug.booster.scales(1).power,1.5);
  g.debug.lamer.apply(1);g.debug.booster.tick(1,9);assert(!f.boosterEnhancement);assert(f.lamerSuppression);near(g.debug.booster.scales(1).power,.88);
});
test("Court permits both statuses on allies and opponents, never damage, stun or displacement",()=>{
  for(const key of["lamer","booster"])for(const index of[1,2]){const g=setup({key,arena:"standard",ruleset:"court",teamSize:2}),t=g.debug.fighters[index],hp=t.health,shield=t.shieldHealth;
    hit(g,1,index);assert(key==="lamer"?t.lamerSuppression:t.boosterEnhancement);assert.equal(t.health,hp);near(t.vx,0);near(t.vy,0);near(t.hitstun,0);near(t.shieldHealth,shield);
  }
});
test("Battle and Versus friendly-damage rules are not broadened by status exceptions",()=>{
  for(const arena of[undefined,"standard"])for(const ff of[false,true]){const g=setup({arena,teamSize:2,teams:arena?undefined:[0,0],ff}),index=arena?2:1,t=g.debug.fighters[index],hp=t.health;
    hit(g,1,index);assert(t.lamerSuppression);assert.equal(t.health<hp,ff);assert.equal(Math.hypot(t.vx,t.vy)>0,ff);assert.equal(g.rb.save().core.teamAttackEnabled,ff);
  }
  const g=setup({key:"anchor",teams:[0,0],ff:false});hit(g,1);assert(!g.debug.fighters[1].lamerSuppression);assert.equal(g.debug.fighters[1].health,165);
});
test("FFA, other Lamers and Booster receive debuffs; lethal or protected contacts do not",()=>{
  for(const target of["anchor","lamer","booster"]){const g=setup({target});hit(g,.25);assert.equal(g.debug.fighters[1].lamerSuppression.stacks,1);}
  for(const protection of["invulnerable","spotDodgeInvuln"]){const g=setup(),t=g.debug.fighters[1];g.debug.booster.punch();t[protection]=1;g.debug.resolveHit(0,1);assert(!t.lamerSuppression);}
  const g=setup(),t=g.debug.fighters[1];t.health=1;g.debug.booster.punch();g.debug.resolveHit(0,1);assert(!t.lamerSuppression);
  const p=setup({target:"phantom"});p.debug.gravity.dash(1,{x:1,y:0});hit(p,1);assert(!p.debug.fighters[1].lamerSuppression);
});
test("shields block debuff and preserve ordinary combat shield behavior",()=>{
  const g=setup(),t=g.debug.fighters[1];Object.assign(t,{chargingPunch:true,punchInputHeld:true,punchHoldTimer:.2,punchAim:{x:-1,y:0}});hit(g,1);assert(!t.lamerSuppression);assert(t.shieldHealth<t.data.shieldMax);
});
test("action timing slows at creation across distinctive fighters and remains stable at expiry",()=>{
  for(const target of["anchor","edgebert","gunman","archer","whipado","boomerangus","phantom","booster","lamer"]){const g=setup({target}),t=g.debug.fighters[1];g.debug.booster.punch(1,.4);const base=plain(t.attack);t.attack=null;
    for(let i=0;i<3;i++)g.debug.lamer.apply(1);g.debug.booster.punch(1,.4);const attack=t.attack;for(const k of["startup","active","recovery","total"])near(attack[k],base[k]/.76);
    g.debug.lamer.tick(1,5);assert.equal(t.attack,attack);for(const k of["startup","active","recovery","total"])near(attack[k],base[k]/.76);
  }
});
test("slower ground and aerial mobility is derived, never a per-frame velocity multiplier",()=>{
  const g=setup(),f=g.debug.fighters[1];Object.assign(f,{onGround:true,hasLiveAim:true,aim:{x:1,y:0}});g.debug.booster.walk(1,1);near(f.vx,132);
  for(let i=0;i<3;i++)g.debug.lamer.apply(1);f.vx=0;g.debug.booster.walk(1,1);near(f.vx,132*.7);f.vx=2000;g.debug.lamer.apply(1);near(f.vx,2000);
});
test("both fighters consume two air dashes and reset resources on normal landing",()=>{
  for(const key of["booster","lamer"]){const g=setup({key}),f=g.debug.fighters[0];assert.equal(f.airDashes,2);g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,1);f.dashTimer=0;f.dashReboundLockout=0;g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,0);
    g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,0);
    pose(f,640,1040-f.data.height/2-1);f.airDashes=0;f.vy=120;g.debug.gravity.physics(0);assert(f.onGround);assert.equal(f.airDashes,2);g.debug.gravity.dash(0,{x:1,y:0});assert.equal(f.airDashes,2);
  }
});
test("sports impulse is modest for Booster and strongly charge-dependent for Lamer",()=>{
  for(const arena of["standard","elevated","golden-rush","target-charge-stationary","boulder-control","gravity-boulder","total-rush","volleyball"]){const speeds={};
    for(const key of["booster","lamer"])for(const charge of[0,1]){const g=setup({key,arena}),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;g.debug.booster.punch(0,charge);const a=f.attack;a.age=a.startup+.01;b.x=f.x+80;b.y=f.y;b.vx=b.vy=0;assert(g.debug.dashball.shot(0,a),arena);assert(!b.boosterEnhancement&&!b.lamerSuppression);speeds[key+charge]=Math.hypot(b.vx,b.vy);}
    assert(speeds.lamer1>speeds.lamer0*1.3,arena);assert(speeds.lamer1>speeds.booster1*1.3,arena);
  }
});
test("debuffed attacks lose sports impact without changing neutral ball tuning or ownership",()=>{
  for(const arena of["standard","target-charge-stationary","boulder-control","total-rush"]){const values=[];for(const suppressed of[false,true]){const g=setup({key:"anchor",arena}),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;if(suppressed)for(let i=0;i<3;i++)g.debug.lamer.apply(0);g.debug.booster.punch(0,.1);b.x=f.x+80;b.y=f.y;g.debug.dashball.shot(0,f.attack);values.push({speed:Math.hypot(b.vx,b.vy),owner:b.scoringTeam});}assert(values[1].speed<values[0].speed*.8,arena);assert.equal(values[0].owner,values[1].owner);}
});
test("all existing Dashball objectives and sandbags accept Lamer, never receive fighter statuses",()=>{
  for(const {id:arena}of require("../dashball").ARENAS){const g=setup({arena}),f=g.debug.fighters[0],b=g.debug.dashball.state.ball;g.debug.booster.punch(0,.5);b.x=f.x+80;b.y=f.y;assert(g.debug.dashball.shot(0,f.attack),arena);assert(!b.lamerSuppression&&!b.boosterEnhancement);}
  const g=createGame();g.debug.sandbag.setup({ruleset:"brawl"},{characters:["lamer","booster"],seed:501});g.debug.booster.punch(0,1);assert(g.debug.sandbag.hit(0,g.debug.fighters[0].attack));assert(!g.debug.sandbag.state.bags[0].lamerSuppression);
});
test("KO, respawn and rematch clear suppression and enhancement",()=>{
  const g=setup({arena:"standard"});g.debug.booster.apply(1,1);g.debug.lamer.apply(1);g.debug.dashball.knockout(1);assert(!g.debug.fighters[1].lamerSuppression&&!g.debug.fighters[1].boosterEnhancement);
  g.debug.lamer.apply(0);g.debug.booster.apply(0,1);g.debug.fighters[0].reset(true);assert(!g.debug.fighters[0].lamerSuppression&&!g.debug.fighters[0].boosterEnhancement);
});
test("projection geometry follows aim on the native three-unit grid without new hitboxes",()=>{
  for(const key of["booster","lamer"])for(const charge of[0,.5,1])for(const dir of[{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:.7,y:.7}]){
    const g=setup({key}),hash=g.rb.hash(),pose=g.debug.lamer.projection(0,dir,charge);assert.equal(pose.pixel,3);assert.equal(pose.kind,key==="booster"?"needle":"frown");assert(Number.isInteger(pose.width)&&Number.isInteger(pose.height));assert.equal(g.rb.hash(),hash);assert.equal(g.debug.fighters[0].attack,null);
  }
});
test("peer snapshot and rollback restore independent statuses and captured attack timing",()=>{
  const a=setup({target:"edgebert"}),b=setup({target:"edgebert"});for(let i=0;i<3;i++)a.debug.lamer.apply(1);a.debug.booster.apply(1,.6);a.debug.booster.punch(1,.5);
  b.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.deepEqual(plain(b.debug.fighters[1].lamerSuppression),plain(a.debug.fighters[1].lamerSuppression));assert.deepEqual(plain(b.debug.booster.scales(1)),plain(a.debug.booster.scales(1)));
  const state=a.rb.save(),rows=Array.from({length:180},(_,n)=>[{hasAim:true,aimX:1,punchHeld:n%67<14},{hasAim:true,aimX:-1,dashHeld:n%31<5}]);for(const row of rows)a.rb.step(row);const hash=a.rb.hash();a.rb.restore(state);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),hash);
});
test("delayed-input rollback crosses real Lamer hit, stacks and combined expiry",()=>{
  const games=[setup(),setup()];for(const g of games){pose(g.debug.fighters[1],525,-5000);g.debug.booster.apply(1,1);g.debug.lamer.apply(1);g.debug.booster.punch(0,.75);}
  const[a,b]=games,manager=b.rb.manager(0,8),pending=[];let contacted=false;
  for(let frame=0;frame<360;frame++){const inputs=[R.neutral(),R.encode({hasAim:true,aimX:-1,aimY:Math.sin(frame*.31)*.3})];a.rb.step(inputs.map(R.decode));contacted||=a.debug.fighters[1].lamerSuppression?.stacks===2;pending.push({frame,input:inputs[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(inputs[0]));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(contacted);assert(manager.rollbacks>10);assert.equal(a.rb.hash(),b.rb.hash());assert(!a.debug.fighters[1].lamerSuppression);assert(a.debug.fighters[1].boosterEnhancement);
});
test("30/60/120 Hz produce identical status and expiry simulation",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.booster.apply(1,1);for(let i=0;i<3;i++)g.debug.lamer.apply(1);for(let n=1;n<=hz*6;n++)g.render(1000+n*1000/hz+.001);assert(!g.debug.fighters[1].lamerSuppression);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
test("ten-CPU mixed status-fighter play is deterministic and finite",()=>{
  const games=[createGame(),createGame()];for(const g of games)g.debug.dashball.setup({arena:"standard",teamSize:5},{characters:["lamer","booster","lamer","edgebert","booster","kite","lamer","chungus","booster","phantom"],ai:true,seed:501});let attacks=0;
  for(let n=0;n<360;n++){for(const g of games)g.debug.dashball.step();assert.equal(games[0].rb.hash(),games[1].rb.hash());if(games[0].debug.fighters.some(f=>(f.data.lamer||f.data.booster)&&(f.chargingPunch||f.attack)))attacks++;}assert(attacks>0);assert(games[0].debug.fighters.every(f=>[f.x,f.y,f.vx,f.vy].every(Number.isFinite)));
});
