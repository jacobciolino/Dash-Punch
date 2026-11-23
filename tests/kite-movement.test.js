"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),R=require("../rollback"),{createGame}=require("./simulation-harness"),{sample}=require("./kite-rain-fixture");
const before=require("./kite-movement-before.json"),clone=v=>JSON.parse(JSON.stringify(v)),dt=1/60,near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
let groups=0;const check=(name,fn)=>{fn();groups++;console.log(`ok ${name}`);},metrics={};
function setup(key="kite",legacy=false,opponent="anchor"){
  const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:[key,opponent],seed:91});
  const f=g.debug.fighters[0];if(legacy)f.data=clone(before.fighters[key].data);
  g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:400+i*400,y:-50000,prevX:400+i*400,prevY:-50000,onGround:false,vx:0,vy:0,hasLiveAim:false,health:10000}));return g;
}
function trial({key="kite",legacy=false,dir={x:1,y:0},charge=0,aim=dir,frames=120,dash=true}={}){
  const g=setup(key,legacy),f=g.debug.fighters[0];f.hasLiveAim=Boolean(aim);if(aim)f.aim=aim;
  if(dash)g.debug.gravity.dash(0,dir,charge*f.data.dashChargeTime);
  const initial=Math.hypot(f.vx,f.vy);let distance=0,at1=0,rise=0,peakSide=0;
  for(let i=0;i<frames;i++){g.debug.gravity.physics(0);distance+=f.vx*dt;peakSide=Math.max(peakSide,Math.abs(f.vx));rise=Math.max(rise,-50000-f.y);if(i===59)at1=distance;}
  return {g,f,initial,distance,at1,rise,peakSide,fall:f.y+50000};
}
check("the other 28 fighters retain data and 3,360 immutable pre-patch frame hashes",()=>{
  for(const [key,expected] of Object.entries(before.fighters))if(key!=="kite")assert.deepEqual(sample(key),expected,key);
});
check("air impulse is 54-59% of Anchor; grounded dash launch and resources remain unchanged",()=>{
  for(const charge of [0,1])for(const dir of [{x:1,y:0},{x:0,y:-1},{x:Math.SQRT1_2,y:-Math.SQRT1_2}]){
    const kite=setup(),normal=setup("anchor"),old=setup("kite",true),f=kite.debug.fighters[0];
    for(const g of [kite,normal,old])g.debug.gravity.dash(0,dir,charge*g.debug.fighters[0].data.dashChargeTime);
    const ratio=Math.hypot(f.vx,f.vy)/Math.hypot(normal.debug.fighters[0].vx,normal.debug.fighters[0].vy);assert(ratio>.5&&ratio<.65);assert.equal(f.airDashes,6);
    for(const g of [kite,old]){const f=g.debug.fighters[0];Object.assign(f,{onGround:true,vx:0,vy:0});g.debug.gravity.dash(0,dir,charge*f.data.dashChargeTime);}
    near(f.vx,old.debug.fighters[0].vx);near(f.vy,old.debug.fighters[0].vy);assert.equal(f.airDashes,6);
  }
});
check("horizontal, upward and diagonal bursts settle into slow drift instead of acceleration",()=>{
  for(const charge of [0,1]){
    const now=trial({charge}),old=trial({charge,legacy:true}),normal=trial({charge,key:"anchor"});
    assert(now.at1<old.at1*.4);assert(now.at1<normal.at1*.5);assert(now.peakSide<=now.initial);near(now.f.vx,110);
    const up=trial({charge,dir:{x:0,y:-1}}),oldUp=trial({charge,legacy:true,dir:{x:0,y:-1}}),diagonal=trial({charge,dir:{x:Math.SQRT1_2,y:-Math.SQRT1_2}});
    assert(up.rise<oldUp.rise*.15);assert(up.f.vy>0);assert(diagonal.rise<220);assert(diagonal.f.vy>0);
    metrics[charge?"charged":"tap"]={oldInitial:old.initial,newInitial:now.initial,anchorInitial:normal.initial,oldTravel1s:old.at1,newTravel1s:now.at1,anchorTravel1s:normal.at1,oldUpRise:oldUp.rise,newUpRise:up.rise};
  }
});
check("neutral and Up falls are slower than ordinary fighters but never hover; reversals are gradual",()=>{
  const normal=trial({key:"anchor",dash:false,aim:null}),neutral=trial({dash:false,aim:null}),up=trial({dash:false,aim:{x:0,y:-1}});
  assert(neutral.fall>350&&neutral.fall<normal.fall*.6);assert(up.fall>300&&up.fall<neutral.fall);near(neutral.f.vy,360);near(up.f.vy,280);
  const drift=trial({dash:false,aim:{x:1,y:0}});near(drift.f.vx,110);Object.assign(drift.f,{aim:{x:-1,y:0}});drift.g.debug.gravity.physics(0);assert(drift.f.vx>0);
  for(let i=0;i<90;i++)drift.g.debug.gravity.physics(0);assert(drift.f.vx< -100);
  metrics.fall={normal2s:normal.fall,kite2s:neutral.fall,kiteUp2s:up.fall};
});
check("seven dashes do not stack; legitimate hit and Kickoff refills do not create runaway speed",()=>{
  const g=setup(),[f,t]=g.debug.fighters;
  for(let i=0;i<7;i++){g.debug.gravity.dash(0,{x:1,y:0},f.data.dashChargeTime);near(f.vx,578.48);}
  assert.equal(f.airDashes,0);const vx=f.vx;g.debug.gravity.dash(0,{x:0,y:-1},0);assert.equal(f.airDashes,0);near(f.vx,vx);
  for(let cycle=0;cycle<30;cycle++){
    f.attack={id:1000+cycle,age:.1,startup:0,active:.2,recovery:.1,total:.4,charge:0,dir:{x:1,y:0},hitTargets:new Set(),grounded:false};
    Object.assign(t,{hitstun:0,hitstop:0,invulnerable:0,health:10000});g.debug.resolveHit(0,1);assert.equal(f.airDashes,7);f.hitstop=0;
    g.debug.gravity.dash(0,{x:1,y:0},f.data.dashChargeTime);assert(f.vx<580);for(let n=0;n<10;n++)g.debug.gravity.physics(0);
  }
  const k=setup(),[a,b]=k.debug.fighters;Object.assign(a,{x:500,y:-1000,prevX:500,prevY:-1000,airDashes:1});
  k.debug.gravity.dash(0,{x:1,y:0},0);Object.assign(a,{prevX:480,prevY:-1000});Object.assign(b,{x:530,y:-1000,prevX:530,prevY:-1000});
  assert(k.debug.tryDashRebound(0,1));assert.equal(a.airDashes,1);const force=Math.abs(a.vx);assert(force>1500);k.debug.gravity.physics(0);assert.equal(a.floatMotion,"external");assert(Math.abs(a.vx)>force*.98);
});
check("Chungus's full launch, hitstun, juggle drag and floor bounce match the old attack flight",()=>{
  const runs=[];
  for(const legacy of [false,true]){
    const g=setup("kite",legacy,"chungus"),[kite,chungus]=g.debug.fighters;
    Object.assign(kite,{x:640,y:500,prevX:640,prevY:500});Object.assign(chungus,{x:640,y:350,aim:{x:0,y:1},vx:0,vy:0});
    chungus.attack={id:999,age:.2,startup:0,active:5,recovery:.2,total:5.2,charge:1,dir:{x:0,y:1},hitTargets:new Set(),grounded:true};
    g.debug.resolveHit(1,0);const initial={vx:kite.vx,vy:kite.vy,hitstun:kite.hitstun,health:kite.health};const flight=[];
    for(let i=0;i<90;i++){g.debug.gravity.physics(0);flight.push([kite.x,kite.y,kite.vx,kite.vy,kite.hitstun]);}
    runs.push({initial,flight});
  }
  assert.deepEqual(runs[0],runs[1]);assert(runs[0].initial.vy>1500);assert(runs[0].flight.some(([, , ,vy])=>vy< -200),"Chungus floor impact did not launch Kite upward");metrics.chungus=runs[0].initial;
});
check("external horizontal/upward momentum is never clamped to self-movement limits, even after hitstun",()=>{
  const g=setup(),f=g.debug.fighters[0];Object.assign(f,{vx:1800,vy:-1400,hitstun:.4,floatMotion:"self",hasLiveAim:false});
  let travel=0;for(let i=0;i<120;i++){g.debug.gravity.physics(0);travel+=Math.abs(f.vx)*dt;}
  assert.equal(f.floatMotion,"external");assert(f.vx>300);assert(travel>1400);assert(f.vy<0);assert.equal(f.data.juggleTerminalVelocity,before.fighters.kite.data.juggleTerminalVelocity);
  metrics.external={distance2s:travel,vxAfter2s:f.vx,vyAfter2s:f.vy};
});
check("all four gravity directions pull Kite down; grounded jumps, floors and ceiling landings remain legal",()=>{
  for(const [axis,sign] of [["y",1],["y",-1],["x",1],["x",-1]]){
    const g=setup(),f=g.debug.fighters[0];g.debug.gravity.setDirection(axis,sign);const gravity=g.debug.gravity.vector;
    Object.assign(f,{aim:{x:-gravity.x,y:-gravity.y},hasLiveAim:true});for(let n=0;n<90;n++)g.debug.gravity.physics(0);assert(f.vx*gravity.x+f.vy*gravity.y>200);
    g.debug.gravity.dash(0,{x:-gravity.x,y:-gravity.y},0);for(let n=0;n<120;n++)g.debug.gravity.physics(0);assert(f.vx*gravity.x+f.vy*gravity.y>0);
  }
  for(const sign of [1,-1]){
    const g=createGame();g.rb.setup({stageIndex:g.rb.stageNames.indexOf("Flip Chamber"),characterKeys:["kite","anchor"]});const f=g.debug.fighters[0];g.debug.gravity.setDirection("y",sign);
    Object.assign(f,{x:400,y:300,vx:0,vy:0,onGround:false,hasLiveAim:false,airDashes:0});
    for(let n=0;n<240&&!f.onGround;n++)g.debug.gravity.physics(0);assert(f.onGround);assert.equal(f.airDashes,7);
    f.hasLiveAim=true;f.aim={x:0,y:-sign};g.debug.gravity.dash(0,f.aim,0);assert(f.vy*sign<0);assert(!f.onGround);
  }
});
check("30/60/120Hz rendering advances the same fixed-step movement",()=>{
  const values=[];
  for(const hz of [30,60,120]){
    const g=createGame();g.debug.dashball.setup({arena:"elevated-open"},{characters:["kite","anchor"]});const f=g.debug.fighters[0];Object.assign(f,{x:640,y:-50000,prevX:640,prevY:-50000,onGround:false});g.debug.gravity.dash(0,{x:1,y:0},0);
    for(let i=1;i<=hz*3;i++)g.render(1000+i*1000/hz+.001);values.push([f.x,f.y,f.vx,f.vy,g.debug.dashball.state.time]);
  }
  assert.deepEqual(values[0],values[1]);assert.deepEqual(values[0],values[2]);metrics.renderRates=values;
});
check("sports navigation, human inputs, AI physics, snapshots and delayed rollback remain deterministic",()=>{
  for(const mode of ["standard","elevated","elevated-open","target-break","golden-rush","brawl","scramble"]){
    const a=createGame(),b=createGame(),bag=["brawl","scramble"].includes(mode);
    for(const g of [a,b])g.debug[bag?"sandbag":"dashball"].setup(bag?{ruleset:mode}:{arena:mode,ruleset:"battle"},{characters:["kite","rain"]});
    const saved=a.rb.save(),manager=b.rb.manager(0,8),pending=[],inputs=[];
    for(let i=0;i<180;i++){const encoded=[0,1].map(p=>R.encode({hasAim:true,aimX:p?-1:1,aimY:Math.sin(i*.04),dashHeld:i%35<9,punchHeld:i%29<6}));inputs.push(encoded.map(R.decode));pending.push({frame:i,input:encoded[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(encoded[0]));a.rb.step(inputs[i]);}
    for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert.equal(a.rb.hash(),b.rb.hash(),mode);const hash=a.rb.hash();a.rb.restore(saved);for(const input of inputs)a.rb.step(input);assert.equal(a.rb.hash(),hash);
    const peer=createGame();peer.debug.online.installSnapshot(a.debug.online.createSnapshot());assert.equal(peer.debug.fighters[0].floatMotion,a.debug.fighters[0].floatMotion);
  }
  const a=createGame(),b=createGame();for(const g of [a,b])g.debug.dashball.setup({arena:"golden-rush",teamSize:5},{characters:["kite","rain"],ai:true});
  for(let i=0;i<360;i++){a.debug.dashball.step();b.debug.dashball.step();assert.equal(a.rb.hash(),b.rb.hash());}
});
fs.mkdirSync("artifacts/kite-movement",{recursive:true});fs.writeFileSync("artifacts/kite-movement/verification.json",JSON.stringify({groups,metrics},null,2));
console.log(JSON.stringify({passed:true,groups,metrics},null,2));
