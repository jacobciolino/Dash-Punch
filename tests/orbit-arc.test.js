"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {dashFixture}=require("./orbit-fixture"),{createGame}=require("./simulation-harness"),R=require("../rollback");
const before=JSON.parse(fs.readFileSync(require("node:path").join(__dirname,"orbit-before.json"),"utf8"));
const metrics=[];
for(const charge of [0,1]) {
  const neutral=dashFixture({charge}),up=dashFixture({charge,input:{x:0,y:-1}}),down=dashFixture({charge,input:{x:0,y:1}});
  const old=before.air[charge],ratio=neutral.range/old.range,speedRatio=neutral.averageSpeed/old.averageSpeed;
  // This suite's historical fixture predates both arc passes; new focused
  // tests compare the requested 1.75x change with the immediate checkpoint.
  assert(ratio>2.2&&ratio<2.4);assert(speedRatio>.65&&speedRatio<.75);
  assert(neutral.initial.vy<0&&neutral.points.at(-1)[3]<0,"neutral heading was not retained");
  const height=r=>-5000-Math.min(...r.points.map(p=>p[1])),apex=r=>r.points.findIndex(p=>p[3]>0)/60;
  assert(height(up)>height(neutral)&&height(neutral)>height(down));
  const brake=dashFixture({charge,input:frame=>frame<12?{x:1,y:0}:{x:-1,y:0}});
  assert(brake.points.some(p=>p[2]<-200),"steering did not produce a U-turn");
  let maxDelta=0;for(let i=1;i<brake.points.length;i++)maxDelta=Math.max(maxDelta,Math.hypot(brake.points[i][2]-brake.points[i-1][2],brake.points[i][3]-brake.points[i-1][3]));
  assert(maxDelta<neutral.initial.vx*.15,"steering snapped velocity");
  const mirror=dashFixture({charge,side:-1});assert(Math.abs(mirror.range-neutral.range)<1e-8);
  assert(!neutral.game.debug.fighters[0].airDashArc,"arc did not expire");
  metrics.push({charge,before:old,after:{initial:neutral.initial,range:neutral.range,averageSpeed:neutral.averageSpeed,seconds:neutral.seconds},height:{up:height(up),neutral:height(neutral),down:height(down)},apex:{up:apex(up),neutral:apex(neutral),down:apex(down)},maxSteeringVelocityDelta:maxDelta});
}
function arm(game,dir,charge=0,grounded=false) {
  const f=game.debug.fighters[0];f.attack={id:999,age:.08,startup:.075,active:.13,recovery:.2,total:.405,charge,dir,grounded,hitTargets:new (vm.runInContext("Set",game.sandbox))(),clashed:false};
}
function hit(dir,charge=0,{legacy=false,velocity={x:0,y:0},combo=0,grounded=false}={}) {
  const game=createGame(),{debug:d,rb}=game;rb.setup({characterKeys:["orbit","anchor"],seed:42});
  const [a,b]=d.fighters;if(legacy)require("./legacy-orbit-fixture")([a]);
  Object.assign(a,{x:400,y:-5000,onGround:false,vx:velocity.x,vy:velocity.y,aim:{x:-dir.x,y:-dir.y}});
  Object.assign(b,{x:400+dir.x*85,y:-5000+dir.y*85,onGround:false,health:10000,comboHits:combo,hitstun:combo?.2:0,lastAttacker:combo?a:null});
  arm(game,dir,charge,grounded);const launch=d.getLaunchDirection(0),health=b.health;d.resolveHit(0,1);
  return {game,damage:health-b.health,hitstun:b.hitstun,launch,velocity:{x:b.vx,y:b.vy},hitstop:b.hitstop,attackerHitstop:a.hitstop};
}
const attacks=[];
for(const charge of [0,.5,1])for(const grounded of [false,true]) {
  const current=hit({x:1,y:0},charge,{grounded}),old=hit({x:1,y:0},charge,{legacy:true,grounded});
  assert(Math.abs(current.hitstun/old.hitstun-1.45)<1e-10);assert(current.damage<old.damage);
  assert.equal(current.hitstop,old.hitstop);assert.equal(current.attackerHitstop,old.attackerHitstop);
  attacks.push({charge,grounded,oldDamage:old.damage,newDamage:current.damage,oldHitstun:old.hitstun,newHitstun:current.hitstun});
}
for(const dir of [{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:1},{x:.6,y:-.8}]) {
  const atRest=hit(dir,1),moving=hit(dir,1,{velocity:{x:-3000,y:2500}});
  assert.deepEqual({...moving.launch},dir);assert.deepEqual(moving.velocity,atRest.velocity,"dash velocity affected strike launch");
  assert(atRest.velocity.x*dir.x+atRest.velocity.y*dir.y>0);
}
const left=hit({x:-1,y:0}),right=hit({x:1,y:0});assert.equal(left.velocity.x,-right.velocity.x);assert.equal(left.velocity.y,right.velocity.y);
assert(hit({x:0,y:1}).velocity.y>0);assert(hit({x:0,y:-1}).velocity.y<0);
for(const legacy of [false,true]) {
  const game=createGame();game.rb.setup({characterKeys:["anchor","orbit"],seed:42});
  if(legacy)require("./legacy-orbit-fixture")([game.debug.fighters[1]]);
  arm(game,{x:1,y:0});game.debug.resolveHit(0,1);assert.equal(game.debug.fighters[1].hitstun,.46,"incoming hitstun was buffed");
}
const stale=hit({x:1,y:0},0,{combo:10});assert(stale.hitstun<hit({x:1,y:0}).hitstun,"combo staling was removed");
// Actual collision/normal abstract inputs: opener -> Dash chase -> repeated Punches.
function comboTrial(defend=false) {
  const game=createGame(),{debug:d,rb}=game;rb.setup({characterKeys:["orbit","anchor"],seed:42});
  const [a,b]=d.fighters;Object.assign(a,{x:400,y:-5000,onGround:false});Object.assign(b,{x:485,y:-5000,onGround:false,health:10000});
  arm(game,{x:1,y:0});d.handleHits();assert.equal(b.comboHits,1);let max=1,escaped=false;
  for(let i=0;i<180;i++) {
    if(defend&&a.attack&&b.hitstun>0&&a.attack.age<a.attack.startup&&Math.hypot(b.x-a.x,b.y-a.y)<150)d.bufferComboEscape(1,{x:-a.attack.dir.x,y:-a.attack.dir.y});
    const dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1;
    rb.step([{hasAim:true,aimX:dx/n,aimY:dy/n,punchHeld:i%12<4,dashHeld:i<3||(n>95&&i%24<3)},{}]);
    max=Math.max(max,b.comboHits);escaped ||= b.dashEscapeSuccessFlash>0;
  }
  return {max,escaped};
}
const combo=comboTrial(),defense=comboTrial(true);assert(combo.max>=3,"no practical multi-hit follow-up route");assert(defense.escaped,"defender could not escape the extended combo");
// A finite budget: no landing/hits, no extra dashes or persistent hover.
const resource=dashFixture().game,f=resource.debug.fighters[0];
for(let i=0;i<5;i++){resource.debug.gravity.dash(0,{x:1,y:0});for(let frame=0;frame<125;frame++)resource.debug.gravity.physics(0);}
assert.equal(f.airDashes,0);assert(!f.airDashArc);assert(f.vy>0);
resource.debug.gravity.dash(0,{x:1,y:0});assert(!f.airDashArc);assert.equal(f.airDashes,0);
for(const extra of [{hitstun:.5},{wallSliding:true},{onGround:true},{chargingDash:true},{koScored:true}]) {
  const {game}=dashFixture(),fighter=game.debug.fighters[0];game.debug.gravity.dash(0,{x:1,y:0});Object.assign(fighter,extra);game.debug.gravity.physics(0);assert(!fighter.airDashArc,`external state retained arc control: ${JSON.stringify(extra)}`);
}
// Live arc snapshots preserve the controller's smoothed heading/shape and phase.
const a=createGame(),b=createGame();for(const game of [a,b]){game.rb.setup({characterKeys:["orbit","anchor"],seed:52});Object.assign(game.debug.fighters[0],{y:-5000,onGround:false});game.debug.gravity.dash(0,{x:1,y:0});}
let snapshot;const inputs=[];
for(let frame=0;frame<120;frame++){const input=[R.decode(R.encode({hasAim:true,aimX:Math.cos(frame*.08),aimY:Math.sin(frame*.08),punchHeld:frame%20<4})),{}];inputs.push(input);assert.equal(a.rb.step(input),b.rb.step(input));if(frame===14)snapshot=a.rb.save();}
const hash=a.rb.hash();a.rb.restore(snapshot);for(let frame=15;frame<120;frame++)a.rb.step(inputs[frame]);assert.equal(a.rb.hash(),hash);
fs.mkdirSync("artifacts/orbit",{recursive:true});fs.writeFileSync("artifacts/orbit/verification.json",JSON.stringify({metrics,attacks,combo,defense},null,2));
console.log(JSON.stringify({tests:"passed",metrics,attacks,combo,defense},null,2));
