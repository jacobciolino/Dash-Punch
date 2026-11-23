"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),R=require("../rollback"),{createGame}=require("./simulation-harness");
const near=(a,b,tolerance=1e-7)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function setup(dir={x:1,y:0},ruleset="battle",charge=0,target="anchor"){
  const g=createGame();g.debug.dashball.setup({arena:"standard",ruleset},{characters:["lancer",target],seed:71});
  g.debug.fighters.forEach((f,i)=>Object.assign(f,{x:500+i*1200,y:700,prevX:500+i*1200,prevY:700,vx:0,vy:0,onGround:false,invulnerable:0}));
  g.debug.booster.punch(0,charge,dir);hold(g,.3);return g;
}
function hold(g,after){const a=g.debug.fighters[0].attack;a.age=a.startup+g.debug.lancer.pose().thrust+after;delete a.previousAge;return a;}
function atShaft(g){const p=g.debug.lancer.pose(),t=g.debug.fighters[1];Object.assign(t,{x:p.x+p.dir.x*220,y:p.y+p.dir.y*220,prevX:p.x+p.dir.x*220,prevY:p.y+p.dir.y*220,health:1000,vx:0,vy:0,hitstun:0,hitstop:0});return t;}
function onSurface(g,side=-1,along=220){
  const d=g.debug,p=d.lancer.pose(),t=d.fighters[1],n={x:-p.dir.y,y:p.dir.x};
  const extent=(Math.abs(n.x)*t.data.width+Math.abs(n.y)*t.data.height)/2;
  Object.assign(t,{x:p.x+p.dir.x*along+n.x*side*(extent+p.halfWidth-2),y:p.y+p.dir.y*along+n.y*side*(extent+p.halfWidth-2),
    prevX:p.x+p.dir.x*along+n.x*side*(extent+p.halfWidth+5),prevY:p.y+p.dir.y*along+n.y*side*(extent+p.halfWidth+5),
    vx:-n.x*side*100,vy:-n.y*side*100,onGround:false,airDashes:0,invulnerable:0});
  d.resolveTerrain(1,0);return t;
}
test("shaft and haft damage only during thrust and the first 100ms of extension hold",()=>{
  for(const charge of[0,.5,1])for(const along of[40,220]){
    const g=setup(undefined,"battle",charge),d=g.debug,a=hold(g,.09),t=atShaft(g);t.x=d.lancer.pose().x+along;
    d.handleHits();assert.equal(1000-t.health,Math.round(along===40?3+7*charge:4+8*charge));
    const h=setup(undefined,"battle",charge),u=atShaft(h);u.x=h.debug.lancer.pose().x+along;
    assert(!h.debug.lancer.shaftActive());h.debug.handleHits();assert.equal(u.health,1000);
    assert.equal(h.debug.fighters[0].attack.hitTargets.size,0);assert.equal(a.active,g.debug.fighters[0].attack.active);
  }
});
test("late shaft sports contacts are solid but do not create strike impulses or resource rewards",()=>{
  const g=setup(),d=g.debug,p=d.lancer.pose(),b=d.dashball.state.ball,a=d.fighters[0].attack;
  Object.assign(b,{x:p.x+220,y:p.y,r:16,vx:0,vy:0});assert(!d.dashball.shot(0,a));
  assert.equal(a.hitTargets.size,0);d.lancer.constrain(0,b,{x:b.x,y:p.y-50});assert(b.y<p.y);near(b.vx,0);near(b.vy,0);
});
test("tip remains damaging throughout hold and retraction while shaft damage stays off",()=>{
  for(const charge of[0,1])for(const phase of["hold","retract"]){
    const g=setup(undefined,"battle",charge),d=g.debug,a=d.fighters[0].attack;
    if(phase==="retract")a.age=a.startup+a.active+a.recovery*.4;
    delete a.previousAge;const p=d.lancer.pose(),t=d.fighters[1];
    Object.assign(t,{x:p.x+p.length-5,y:p.y,health:1000});assert(!d.lancer.shaftActive());d.handleHits();
    assert.equal(t.health,charge?900:975);assert.equal(a.spearZone,"tip");
  }
});
test("horizontal shaft supports standing, walking and jumping without late damage",()=>{
  const g=setup(),d=g.debug,t=onSurface(g),p=d.lancer.pose(),hp=t.health;
  assert(t.onGround);assert.match(t.groundTerrainId,/^lance:/);assert.equal(t.airDashes,t.data.maxAirDashes);
  for(let n=0;n<20;n++){d.gravity.physics(1);d.handleHits();assert(t.onGround);}
  near(t.y+t.data.height/2,p.y-p.halfWidth+.01);near(t.health,hp);
  t.crouching=true;d.resolveTerrain(1,0);assert(t.onGround);t.crouching=false;d.resolveTerrain(1,0);assert(t.onGround);
  t.vx=80;d.gravity.physics(1);assert(t.x>p.x+220);assert(t.onGround);
  t.vy=-600;t.onGround=false;d.gravity.physics(1);assert(!t.onGround);assert(t.y+t.data.height/2<p.y-p.halfWidth);
});
test("a vertical shaft is a native wall with cling and wall-jump resources, not a damage volume",()=>{
  const g=setup({x:0,y:-1}),d=g.debug,t=d.fighters[1];t.aim={x:-1,y:0};t.hasLiveAim=true;
  const hp=t.health;onSurface(g,1);assert(t.wallSliding);assert(t.wallClinging);assert.equal(t.wallNormalX,1);assert.match(t.currentWallId,/^lance:/);
  assert.equal(t.airDashes,t.data.maxAirDashes);d.handleHits();near(t.health,hp);
  d.gravity.dash(1,{x:1,y:-.2});assert(t.vx>0);assert(t.vy<0);assert(!t.wallClinging);
});
test("a moving Lancer carries a shaft rider once per step, without solver-multiplied displacement",()=>{
  const g=setup(),d=g.debug,f=d.fighters[0];Object.assign(f,{y:1280-f.data.height/2,prevY:1280-f.data.height/2,onGround:true,vx:40});
  const t=onSurface(g),start=[f.x,t.x];
  for(let n=0;n<30;n++){d.gravity.physics(0);d.gravity.physics(1);assert(t.onGround);}
  assert(f.x>start[0]);near(t.x-start[1],f.x-start[0]);
});
test("angled shaft collisions follow its thin shape rather than filling its enclosing rectangle",()=>{
  const g=setup({x:.8,y:-.6}),d=g.debug,t=onSurface(g,-1);assert(t.onGround);
  Object.assign(t,{x:850,y:680,prevX:850,prevY:680,vx:0,vy:0,onGround:false,wallContactGrace:0});d.resolveTerrain(1,0);
  assert(!t.onGround);assert(!t.wallSliding);near(t.x,850);near(t.y,680);
});
test("solid lance remains terrain for teammates, Court, protected spawns and intangible Phantom",()=>{
  for(const ruleset of["court","battle"]){const g=setup(undefined,ruleset),d=g.debug,t=d.fighters[1],hp=t.health;t.team=d.fighters[0].team;t.invulnerable=2;onSurface(g);assert(t.onGround);near(t.health,hp);}
  const g=setup(undefined,"battle",0,"phantom"),d=g.debug,t=d.fighters[1];
  t.phantomDash={phase:"ghost",remaining:.5};assert(d.phantom.ghost(1));onSurface(g);assert(t.onGround);
});
test("swept fighter contacts cannot tunnel through the shaft from either side",()=>{
  for(const side of[-1,1]){const g=setup(),d=g.debug,p=d.lancer.pose(),t=d.fighters[1];Object.assign(t,{x:p.x+220,y:p.y-side*140,prevX:p.x+220,prevY:p.y+side*140,vx:0,vy:-side*8000});d.resolveTerrain(1,0);assert.equal(Math.sign(t.y-p.y),side);near(t.vy,0);}
});
test("inverted gravity uses the underside as a floor, and expired/interrupted lances disappear",()=>{
  const g=setup(),d=g.debug;d.gravity.setDirection("y",-1);const t=onSurface(g,1);assert(t.onGround);near(t.vy,0);
  d.fighters[0].attack=null;assert.equal(d.lancer.surfaces().length,0);d.resolveTerrain(1,0);assert(!t.onGround);
  const h=setup(),a=h.debug.fighters[0].attack;a.age=a.total;assert.equal(h.debug.lancer.surfaces().length,0);
});
test("standing contacts and active-tip state restore and replay deterministically",()=>{
  const g=setup(),d=g.debug;onSurface(g);const state=g.rb.save(),rows=Array.from({length:90},(_,n)=>[{}, {hasAim:true,aimX:n<40?1:-1}]);
  for(const row of rows)g.rb.step(row);const hash=g.rb.hash();g.rb.restore(state);assert(g.debug.fighters[1].onGround);
  for(const row of rows)g.rb.step(row);assert.equal(g.rb.hash(),hash);
});
test("surface riders agree after delayed rollback and at 30/60/120Hz",()=>{
  const a=setup(),b=setup();onSurface(a);onSurface(b);const manager=b.rb.manager(0,8),pending=[];
  for(let n=0;n<100;n++){const row=[R.neutral(),R.encode({hasAim:true,aimX:n%40<20?1:-1})];pending.push({frame:n,input:row[1]});if(pending.length>6){const p=pending.shift();manager.receive(p.frame,p.input);}manager.advance(row[0]);a.rb.step(row.map(R.decode));}
  for(const p of pending)manager.receive(p.frame,p.input);manager.reconcile();assert(manager.rollbacks>0);assert.equal(a.rb.hash(),b.rb.hash());
  const hashes=[];for(const hz of[30,60,120]){const g=setup();onSurface(g);for(let n=1;n<=hz*2;n++)g.render(1000+n*1000/hz+.001);hashes.push(g.rb.hash());}assert.equal(new Set(hashes).size,1);
});
