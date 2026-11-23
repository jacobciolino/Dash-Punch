"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const DT=1/60,near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),plain=x=>JSON.parse(JSON.stringify(x));
const source=fs.readFileSync("game.js","utf8"),override=/  \/\/ Air-only overrides leave Whipado's ground dash and derived whip\/Kickoff tuning intact\.\n  Object\.assign\(CHARACTER_DATA\.whipado,\{[\s\S]*?\n  \}\);\n/;
function pose(f,{ground=false,velocity={x:0,y:0}}={}){Object.assign(f,{x:500,y:ground?1040-f.data.height/2:-5000,prevX:500,prevY:-5000,vx:velocity.x,vy:velocity.y,onGround:ground,hasLiveAim:false,hitstun:0,hitstop:0,hasMercyDash:false});}
function setup(js=source){const g=createGame(process.cwd(),{sourceOverrides:{"game.js":js}});g.rb.setup({stageIndex:g.rb.stageNames.indexOf("High Perch"),characterKeys:["anchor","whipado"],seed:501});g.debug.fighters.forEach(f=>pose(f));return g;}
test("Whipado derives three air charges and Anchor air-only launch values",()=>{
  const g=setup(),[a,w]=g.debug.fighters;assert.equal(a.data.maxAirDashes,4);assert.equal(w.data.maxAirDashes,Math.max(0,a.data.maxAirDashes-1));assert.equal(w.airDashes,w.data.maxAirDashes);
  assert.equal(w.data.airDashBase,a.data.dashBase);assert.equal(w.data.airDashMax,a.data.dashMax);assert.equal(w.data.airDashScale,a.data.airDashScale);
});
test("Anchor configuration changes are read at initialization and count clamps at zero",()=>{
  for(const count of[0,1,2,6]){const js=source.replace(/(anchor: \{[\s\S]*?maxAirDashes:) 4,/,`$1 ${count},`),g=setup(js),[a,w]=g.debug.fighters;assert.equal(a.data.maxAirDashes,count);assert.equal(w.data.maxAirDashes,Math.max(0,count-1));assert.equal(w.airDashes,Math.max(0,count-1));}
  const js=source.replace(/(anchor: \{[\s\S]*?dashBase:) 620,/,"$1 710,").replace(/(anchor: \{[\s\S]*?dashMax:) 1340,/,"$1 1490,").replace(/(anchor: \{[\s\S]*?airDashScale:) 0.78,/,"$1 0.83,");
  const g=setup(js);for(const i of[0,1])g.debug.gravity.dash(i,{x:1,y:0},g.debug.fighters[i].data.dashChargeTime);near(g.debug.fighters[0].vx,g.debug.fighters[1].vx);
});
test("equal tap/partial/full air launch and native carried momentum at every aim direction",()=>{
  for(const charge of[0,.25,.5,.75,1])for(const dir of[{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:.6,y:-.8}])for(const velocity of[{x:0,y:0},{x:250,y:-80},{x:-300,y:100}]){
    const g=setup();for(const[i,f]of g.debug.fighters.entries()){pose(f,{velocity});g.debug.gravity.dash(i,dir,charge*f.data.dashChargeTime);}const[a,w]=g.debug.fighters;near(a.vx,w.vx);near(a.vy,w.vy);near(a.dashCarryTimer,w.dashCarryTimer);
  }
});
test("neutral horizontal dash travel matches Anchor throughout the common 0.6s carry window",()=>{
  const report=[];for(const charge of[0,.5,1]){const g=setup(),row={charge};for(const[i,f]of g.debug.fighters.entries()){g.debug.gravity.dash(i,{x:1,y:0},charge*f.data.dashChargeTime);const speed=f.vx;let distance=0;for(let n=0;n<36;n++){g.debug.gravity.physics(i);distance+=f.vx*DT;}row[f.data.name]={speed,distance};}near(row.Anchor.distance,row.Whipado.distance);report.push(row);}console.log(JSON.stringify({horizontalCarrySeconds:.6,measurements:report}));
});
test("ground walking/dashes, charge time and every non-air-dash configuration field are unchanged",()=>{
  assert(override.test(source));const old=setup(source.replace(override,"")),now=setup(),before=plain(old.debug.fighters[1].data),after=plain(now.debug.fighters[1].data);
  for(const key of["maxAirDashes","airDashScale","airDashBase","airDashMax"]){delete before[key];delete after[key];}assert.deepEqual(after,before);assert.deepEqual(plain(now.debug.fighters[0].data),plain(old.debug.fighters[0].data));
  for(const charge of[0,.5,1])for(const dir of[{x:1,y:0},{x:-1,y:0},{x:0,y:-1}]){for(const g of[old,now]){const f=g.debug.fighters[1];pose(f,{ground:true});g.debug.gravity.dash(1,dir,charge*f.data.dashChargeTime);}near(old.debug.fighters[1].vx,now.debug.fighters[1].vx);near(old.debug.fighters[1].vy,now.debug.fighters[1].vy);}
  for(const g of[old,now]){const f=g.debug.fighters[1];f.reset(true);pose(f,{ground:true});Object.assign(f,{hasLiveAim:true,aim:{x:1,y:0}});}for(let n=0;n<30;n++){for(const g of[old,now])g.debug.gravity.physics(1);near(old.debug.fighters[1].x,now.debug.fighters[1].x);near(old.debug.fighters[1].vx,now.debug.fighters[1].vx);}
});
test("three air dashes exhaust normally, fourth is blocked, and ground dashes are free",()=>{
  const g=setup(),w=g.debug.fighters[1];for(let n=0;n<w.data.maxAirDashes;n++){g.debug.gravity.dash(1,{x:1,y:0});assert.equal(w.airDashes,w.data.maxAirDashes-n-1);}const velocity={x:w.vx,y:w.vy};g.debug.gravity.dash(1,{x:-1,y:0});near(w.vx,velocity.x);near(w.vy,velocity.y);assert.equal(w.airDashes,0);
  pose(w,{ground:true});g.debug.gravity.dash(1,{x:1,y:0});assert.equal(w.airDashes,0);assert(w.vx>0);
});
test("native floor and inverted-ceiling landing restore all three charges",()=>{
  for(const sign of[1,-1]){const g=setup();g.debug.dashball.setup({arena:"gravity-soccer"},{characters:["anchor","whipado"],ai:false,seed:501});const w=g.debug.fighters[1];g.debug.gravity.setDirection("y",sign);const surface=sign===1?g.debug.dashball.arena.floorY:24,y=surface-sign*(w.data.height/2+1);Object.assign(w,{x:640,y,prevX:640,prevY:y,onGround:false,vx:0,vy:sign*120,airDashes:0});g.debug.gravity.physics(1);assert(w.onGround);assert.equal(w.airDashes,w.data.maxAirDashes);}
});
test("air-dash movement, count and landing state restore exactly through snapshots/replay",()=>{
  const g=setup(),rows=Array.from({length:180},(_,n)=>[{hasAim:true,aimX:1,dashHeld:n%43<6},{hasAim:true,aimX:-1,aimY:n%60<30?-.2:.2,dashHeld:n%37<7}]),saved=g.rb.save();for(const row of rows)g.rb.step(row);const hash=g.rb.hash();g.rb.restore(saved);for(const row of rows)g.rb.step(row);assert.equal(g.rb.hash(),hash);
});
test("delayed-input rollback reproduces Whipado air dashes with no count divergence",()=>{
  const a=setup(),b=setup(),manager=b.rb.manager(0,8),pending=[];
  for(let n=0;n<180;n++){const row=[R.encode({hasAim:true,aimX:1,dashHeld:n%47<5}),R.encode({hasAim:true,aimX:-1,aimY:n%55<30?-.3:.3,dashHeld:n%37<7})];pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}assert(manager.advance(row[0]));a.rb.step(row.map(R.decode));}for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());assert.equal(a.debug.fighters[1].airDashes,b.debug.fighters[1].airDashes);
});
test("30/60/120 Hz rendering gives identical fixed-step air-dash motion",()=>{
  const hashes=[];for(const hz of[30,60,120]){const g=setup();g.debug.matchFlow.begin({countdown:false});g.debug.gravity.dash(1,{x:1,y:-.2},g.debug.fighters[1].data.dashChargeTime);for(let n=1;n<=hz;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
