"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),{execFileSync}=require("node:child_process");
const {setup}=require("./feedback-harness"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const plain=x=>JSON.parse(JSON.stringify(x)),neutral=R.decode(R.neutral());
const punch=(g,charge=0)=>{g.debug.booster.punch(0,charge,{x:1,y:0});return g.debug.fighters[0].attack;};
test("every melee execution sounds on hits and misses, once rather than again at the whiff boundary",()=>{
  for(const key of["anchor","chungus","rain","orbit","kite","spike","whipado","reverso","booster","lamer","phantom","reflektor"]){
    for(const hit of[false,true]){
      const g=setup(key),a=punch(g,.5);assert(a,key);assert.equal(g.events("punchSwing").length,1,key);
      if(hit){const box=g.debug.getPunchHitbox(0,a.dir,a.charge),t=g.debug.fighters[1];Object.assign(t,{x:box.cx,y:box.cy});a.age=a.startup+.001;g.debug.handleHits();}
      g.debug.updateAttack(0,a.total+.01);assert.equal(g.events("punchSwing").length,1,key);assert.equal(g.events("punchWhiff").length,0,key);
    }
  }
});
test("Edgebert has two understated execution swooshes and one deeper finisher; Lancer keeps his thrust cue",()=>{
  const g=setup("edgebert");punch(g);for(let stage=0;stage<3;stage++){const f=g.debug.fighters[0],a=f.attack;assert.equal(a.sequenceStage,stage);g.debug.updateAttack(0,a.total+.0001);}
  assert.equal(g.events("punchSwing").length,3);assert.deepEqual(plain(g.events("punchSwing").map(e=>e.sequenceStage??0)),[0,1,2]);
  const h=setup("edgebert"),s=[0,1,2].map(sequenceStage=>h.debug.combatAudio.execution(0,{sequenceStage}));
  assert(s[2].frequency<s[0].frequency);assert(s[2].toneGain>s[1].toneGain);assert(s[0].duration<.04);
  const l=setup("lancer"),a=punch(l);l.debug.updateAttack(0,a.startup+.001);assert.equal(l.events("lancerThrust").length,1);assert.equal(l.events("punchSwing").length,0);
});
test("magical firing cues wait for successful projectile creation and do not fire on rejection or reflection",()=>{
  const sounds=[];
  for(const key of["gunman","archer","boomerangus"]){
    const g=setup(key),a=punch(g);assert(a.projectile);assert.equal(g.events("punchSwing").length,0);
    g.debug.updateAttack(0,a.startup+.001);assert.equal(g.events("punchSwing").length,1);assert.equal(g.events("punchSwing")[0].projectileExecuted,true);
    const attack=g.debug.fighters[0].projectiles[0];assert(attack);g.debug.projectileMagazine.reflect(attack,1,{x:-1,y:0});assert.equal(g.events("punchSwing").length,1);
    sounds.push(g.debug.combatAudio.execution(0,{projectileExecuted:true}).frequency);
    if(key!=="boomerangus"){
      const h=setup(key),b=punch(h);h.debug.fighters[0].ammo=0;g.debug.updateAttack(0,.01);h.debug.updateAttack(0,b.startup+.001);assert.equal(h.events("punchSwing").length,0);
    }
  }
  assert.equal(new Set(sounds).size,3);
});
function clash(g){
  const[a,b]=g.debug.fighters;Object.assign(a,{x:448,y:300,hitstun:0,hitstop:0});Object.assign(b,{x:568,y:300,hitstun:0,hitstop:0});
  for(const[f,dir]of[[a,1],[b,-1]])f.attack={id:700+(dir===1?0:1),age:.1,startup:0,active:.2,recovery:.2,total:.4,charge:0,dir:{x:dir,y:0},hitTargets:new Set(),grounded:false};
  assert(g.debug.firedUp.clash());
}
test("Fired Up orchestral hits occur once per real clash, for one or both fighters, with no rapid-clash cooldown",()=>{
  const ordinary=setup();clash(ordinary);assert.equal(ordinary.events("clash").length,1);assert.equal(ordinary.events("firedUpClash").length,0);
  for(const both of[false,true]){const g=setup();g.debug.firedUp.build(0,16);if(both)g.debug.firedUp.build(1,16);for(let i=0;i<5;i++)clash(g);assert.equal(g.events("firedUpClash").length,5);assert.equal(g.events("clash").length,5);}
  const g=setup();g.debug.firedUp.build(0,16);punch(g);assert.equal(g.events("firedUpClash").length,0);
});
test("KO cues and compact player-tagged bursts occur once for each legitimate elimination",()=>{
  for(const arena of[null,"standard","basketball","sticky-ball","golden-rush","target-charge-stationary","total-rush"]){
    const g=setup("anchor",arena),d=g.debug;d.matchFlow.knockout(0);assert.equal(g.events("ko").length,1,arena);
    const effect=d.presentationEffects.feedback.find(p=>p.feedback==="ko");assert.equal(effect.fighterId,d.fighters[0].id);assert.equal(effect.label,"P1");assert(effect.w<=d.fighters[0].data.width);
    d.matchFlow.knockout(0);assert.equal(g.events("ko").length,1);assert.equal(d.presentationEffects.feedback.filter(p=>p.feedback==="ko").length,1);
    d.matchFlow.knockout(1);assert.equal(g.events("ko").length,2);assert.equal(d.presentationEffects.feedback.filter(p=>p.feedback==="ko").length,2);
    for(let n=0;n<40;n++)d.presentationEffects.step(1/60);assert.equal(d.presentationEffects.feedback.filter(p=>p.feedback==="ko").length,0);
    if(arena)assert(d.sportsPresentation.marker(0),"temporary burst removed the gravestone");
  }
  const g=setup();g.debug.dashball.setup({arena:"standard",ruleset:"court"},{characters:["anchor","rain"]});g.debug.matchFlow.knockout(0);assert.equal(g.events("ko").length,0);
});
test("super-jump cue uses actual upward launch velocity; normal ground/air dashes never use it",()=>{
  const samples=[];
  for(const charge of[0,.5,1])for(const gravity of[{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}]){
    const g=setup(),f=g.debug.fighters[0];g.debug.gravity.setDirection(gravity.x?"x":"y",gravity.x||gravity.y);
    Object.assign(f,{tippyToes:true,tippyDashQueued:true,hasLiveAim:true});g.debug.gravity.dash(0,{x:-gravity.x,y:-gravity.y},charge*f.data.dashChargeTime);
    const e=g.events("superJump");assert.equal(e.length,1);assert(Math.abs(e[0].upwardSpeed+f.vx*gravity.x+f.vy*gravity.y)<1e-7);
    if(gravity.y===1)samples.push(g.debug.combatAudio.superJumpStrength(e[0].upwardSpeed));
    assert.equal(g.audio.context.tones.length,2);assert.equal(g.audio.context.noises.length,1);
    assert(g.audio.context.tones[1].frequency.events[1].value>g.audio.context.tones[1].frequency.events[0].value);
  }
  assert(samples[2]>=samples[1]&&samples[1]>=samples[0]);
  for(const air of[false,true]){const g=setup();g.debug.fighters[0].onGround=!air;g.debug.gravity.dash(0,{x:1,y:0},0);assert.equal(g.events("superJump").length,0);}
});
test("ground debris uses the takeoff surface, travels behind the dash, trails sparsely and stops at ledges",()=>{
  for(const gravity of[{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0}]){
    const g=setup(),d=g.debug,f=d.fighters[0],t={x:gravity.y,y:-gravity.x};d.gravity.setDirection(gravity.x?"x":"y",gravity.x||gravity.y);
    d.gravity.dash(0,t,0);let p=d.presentationEffects.feedback.filter(p=>p.feedback==="debris");assert.equal(p.length,8);assert(p.every(p=>p.vx*t.x+p.vy*t.y<0));assert(p.every(p=>p.vx*gravity.x+p.vy*gravity.y<0));
    const offset=gravity.x?f.data.width/2:f.data.height/2;assert(p.every(p=>Math.abs((p.x-f.x)*gravity.x+(p.y-f.y)*gravity.y-(offset-2))<1e-6));
    f.onGround=true;d.presentationEffects.step(.06);assert.equal(d.presentationEffects.feedback.filter(p=>p.feedback==="debris").length,10);
    f.onGround=false;d.presentationEffects.step(.01);assert.equal(d.presentationEffects.feedback.filter(p=>p.feedback==="debris").length,12);d.presentationEffects.step(.01);assert.equal(d.presentationEffects.feedback.filter(p=>p.feedback==="debris").length,12);
  }
  const g=setup();g.debug.fighters[0].onGround=false;g.debug.gravity.dash(0,{x:1,y:0},0);assert.equal(g.debug.presentationEffects.feedback.length,0);
});
test("super-jump dirt is stronger than ground dash debris, bounded during ten-player repeated launches, and expires",()=>{
  const normal=setup();normal.debug.gravity.dash(0,{x:1,y:0},0);const n=normal.debug.presentationEffects.feedback.filter(p=>p.feedback==="debris");
  const g=setup(),f=g.debug.fighters[0];for(let i=0;i<40;i++){Object.assign(f,{onGround:true,tippyToes:true,tippyDashQueued:true,hasLiveAim:true});g.debug.gravity.dash(0,{x:0,y:-1},f.data.dashChargeTime);}
  const p=g.debug.presentationEffects.feedback.filter(p=>p.feedback==="debris");assert(p.length>n.length*3);assert(p.length<=480);assert(p.some(p=>Math.abs(p.vx)>150));
  for(let i=0;i<30;i++)g.debug.presentationEffects.step(1/60);assert.equal(g.debug.presentationEffects.feedback.length,0);
});
test("simultaneous musical, KO and attack voices remain finite and gain-managed without dropping events",()=>{
  const g=setup();for(let n=0;n<10;n++)for(const name of["firedUpClash","ko","punchSwing"])g.debug.combatAudio.play(name);
  assert.equal(g.events().length,30);const gains=g.audio.context.gains.map(g=>Math.max(...g.gain.events.map(e=>e.value)));
  assert(gains.every(g=>g>0&&g<.08));assert(gains.at(-1)<gains[0]);
  const h=setup("anchor",null,false);h.debug.combatAudio.play("ko");punch(h);assert.equal(h.rb.save().core.fighters[0].health,h.debug.fighters[0].health);
});
test("presentation restore does not duplicate feedback; audio replay is deduplicated and resimulation muted",()=>{
  const g=setup(),row=[R.decode(R.encode({hasAim:true,aimX:1,punchHeld:true})),neutral];g.rb.presentStep(row);const saved=g.rb.save();
  g.rb.presentStep([neutral,neutral]);const count=g.events("punchSwing").length;assert.equal(count,1);g.rb.restore(saved);g.rb.presentStep([neutral,neutral]);assert.equal(g.events("punchSwing").length,count);
  g.rb.restore(saved);g.rb.step([neutral,neutral]);assert.equal(g.events("punchSwing").length,count);
  g.debug.matchFlow.knockout(0);const ko=g.rb.save();g.debug.presentationEffects.step(.3);g.rb.restore(ko);assert.equal(g.debug.presentationEffects.feedback.filter(p=>p.feedback==="ko").length,1);
  const hash=g.rb.hash();g.debug.presentationEffects.draw();g.debug.presentationEffects.ko();assert.equal(g.rb.hash(),hash);
});
test("all core fighter stats and simulation hashes remain identical to the immediate pre-audio checkpoint",()=>{
  const before=execFileSync("git",["show","39d14e4:game.js"],{encoding:"utf8"});
  const old=createGame(process.cwd(),{sourceOverrides:{"game.js":before}}),now=createGame();
  for(const key of now.rb.characterKeys){for(const g of[old,now])g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flat"),characterKeys:[key,"anchor"],seed:42});assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data),key);
    for(let n=0;n<100;n++){const row=[{hasAim:true,aimX:1,aimY:n<50?0:-.8,punchHeld:n%37<8,dashHeld:n%59<20},neutral];old.rb.step(row);now.rb.step(row);assert.equal(now.rb.hash(),old.rb.hash(),`${key}/${n}`);}}
});
test("fixed-step replay, delayed rollback and 30/60/120Hz preserve gameplay",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[],rows=[],saved=a.rb.save();
  for(let n=0;n<150;n++){const row=[0,1].map(i=>R.encode({hasAim:true,aimX:i?-1:1,punchHeld:(n+i*5)%37<5,dashHeld:(n+i*7)%59<18}));rows.push(row.map(R.decode));pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(rows[n]);}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash());assert(manager.rollbacks>0);const end=a.rb.hash();a.rb.restore(saved);for(const row of rows)a.rb.step(row);assert.equal(a.rb.hash(),end);
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.gravity.dash(0,{x:1,y:0},0);for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
