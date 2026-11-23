"use strict";
const assert=require("node:assert/strict"),{test}=require("node:test"),fs=require("node:fs"),{createGame}=require("./simulation-harness");
const plain=x=>JSON.parse(JSON.stringify(x));
function setup(size=1,kind="dashball",arena="standard"){
  const g=createGame();g.debug[kind].setup({arena,teamSize:size,ruleset:"battle"},{characters:["rain"],seed:42});return g;
}
function validate(layout,count){
  assert.equal(layout.height,58);assert.equal(layout.entries.length,count);assert.equal(new Set(layout.entries.map(e=>e.y)).size,1);
  const entries=[...layout.entries].sort((a,b)=>a.x-b.x);
  for(const e of entries){assert(e.x>=0&&e.w>0&&e.y+e.h<=58);assert(e.x+e.w<=1280);assert(e.x+e.w<=layout.center.x||e.x>=layout.center.x+layout.center.w);}
  for(let n=1;n<entries.length;n++)assert(entries[n].x>=entries[n-1].x+entries[n-1].w);
}
test("1v1 through 5v5 remain a single shallow row with Blue left, Red right and stable P-numbers",()=>{
  for(const size of[1,2,3,4,5]){
    const g=setup(size),layout=g.debug.compactHud.layout();validate(layout,size*2);assert.equal(layout.kind,"teams");assert.equal(layout.sides[0].team,1);assert.equal(layout.sides[1].team,0);
    assert.deepEqual(plain(layout.entries.map(e=>e.playerIndex)),[...Array(size)].map((_,i)=>i*2+1).concat([...Array(size)].map((_,i)=>i*2)));
    for(const e of layout.entries)assert.equal(e.label,`P${e.playerIndex+1}`);
  }
});
test("Sandbag's reversed team-color mapping and runtime team changes update immediately",()=>{
  const g=setup(5,"sandbag"),d=g.debug,l=d.compactHud.layout();assert.equal(l.sides[0].team,0);assert.equal(l.sides[1].team,1);validate(l,10);
  const f=d.fighters[0];f.team=1;const next=d.compactHud.layout();assert(next.entries.find(e=>e.id===f.id).x>800);assert.equal(d.compactHud.player(0).color,d.compactHud.player(1).color);
});
test("FFA uses stable player ordering without assigning artificial teams",()=>{
  const g=createGame(),d=g.debug;d.ai.configure({teamModeId:"ffa",teams:Array.from({length:10},(_,i)=>i),characters:Array(10).fill("anchor")});
  const before=g.rb.hash(),layout=d.compactHud.layout();validate(layout,10);assert.equal(layout.kind,"ffa");assert.equal(layout.sides.length,0);
  assert.deepEqual(plain(layout.entries.map(e=>e.playerIndex)),Array.from({length:10},(_,i)=>i));d.compactHud.draw();assert.equal(g.rb.hash(),before);
});
test("health, shields, high dash counts and essential resource values derive from current authoritative state",()=>{
  const g=setup(1),d=g.debug,f=d.fighters[0],max=d.compactHud.player(0).maximum;
  for(const fraction of[1,.5,.25,0]){f.health=max*fraction;const v=d.compactHud.player(0);assert.equal(v.health,f.health);assert.equal(v.ratio,fraction);assert.equal(v.low,fraction>0&&fraction<=.25);}
  Object.assign(f,{shieldHealth:f.data.shieldMax*.55,airDashes:2,bankedAirDashes:1,escapeAvailable:false,punchParryAvailable:false,dashEscapeMeter:.4,punchParryMeter:.2});
  const v=d.compactHud.player(0);assert.equal(v.shield,.55);assert.equal(v.remaining,2);assert.equal(v.capacity,f.data.maxAirDashes);assert.equal(v.banked,1);assert.equal(v.escape,false);assert.equal(v.parry,false);assert.equal(v.escapeMeter,.4);assert.equal(v.parryMeter,.2);
});
test("all core fighters have distinct compact pixel motifs; projectile ammo and phase opacity remain available",()=>{
  const g=createGame(),motifs=new Set(),keys=["anchor","orbit","rain","spike","edgebert","reverso","whipado","microusb","gunman","archer","kite","chungus","defiplate","boomerangus","phantom","booster","lamer","reflektor","lancer"];
  for(const key of keys){g.rb.setup({characterKeys:[key,"anchor"]});const v=g.debug.compactHud.player(0);assert.equal(v.key,key);assert(v.motif.every(row=>row.length===5));motifs.add(v.motif.join(""));if(["gunman","archer"].includes(key))assert.equal(v.ammo,g.debug.fighters[0].data.projectileConfig.magazine);}
  assert.equal(motifs.size,19);g.rb.setup({characterKeys:["phantom","anchor"]});const f=g.debug.fighters[0];f.onGround=false;g.debug.gravity.dash(0,{x:1,y:0},0);assert(g.debug.compactHud.player(0).ghost);
});
test("score, round clock, round wins, charge squares and objective details remain correctly mapped",()=>{
  const g=setup(3,"dashball","total-rush"),d=g.debug;d.matchFlow.begin({countdown:false,seconds:300});d.matchFlow.state.wins=[1,0];d.matchFlow.state.remainingTicks=9*60;
  d.dashball.state.scores=[42.5,101.75];const c=d.compactHud.center();assert.equal(c.time,"0:09");assert.equal(c.urgent,true);assert.equal(c.sides[0].label,"BLUE");assert.equal(c.sides[0].score,101.75);assert.equal(c.sides[0].wins,0);assert.equal(c.sides[1].wins,1);assert(c.detail.includes("SNITCH"));assert(c.detail.includes("CONTROL"));
  d.matchFlow.state.overtime=true;assert.equal(d.compactHud.center().time,"OVERTIME");
  const charge=setup(1,"dashball","target-charge-stationary");assert(charge.debug.compactHud.center().detail.includes("CHARGE TARGET"));
});
test("KO respawn progress replaces only the eliminated player's bar and restores naturally",()=>{
  const g=setup(2),d=g.debug;d.dashball.state.phase="playing";d.dashball.knockout(0);assert(d.compactHud.player(0).returning);assert(!d.compactHud.player(1).returning);assert.equal(d.compactHud.player(0).health,0);
  const saved=g.rb.save();d.compactHud.draw();g.rb.restore(saved);assert(d.compactHud.player(0).returning);
});
test("HUD/marker rendering and restoration do not change simulation, camera, stage size or player IDs",()=>{
  for(const arena of["standard","basketball","golden-rush","total-rush","target-charge-vertical","volleyball","tri-ball","sticky-ball"]){
    const g=setup(5,"dashball",arena),d=g.debug,hash=g.rb.hash(),camera=plain(d.camera.state),stage=plain(d.dashball.arena),ids=d.fighters.map(f=>f.id);
    d.compactHud.draw();d.stagePresentation.draw();assert.equal(g.rb.hash(),hash,arena);assert.deepEqual(plain(d.camera.state),camera);assert.deepEqual(plain(d.dashball.arena),stage);assert.deepEqual(d.fighters.map(f=>f.id),ids);
    const saved=g.rb.save(),before=plain(d.compactHud.layout());d.fighters[0].health=1;g.rb.restore(saved);assert.deepEqual(plain(d.compactHud.layout()),before);
  }
  const css=fs.readFileSync("styles.css","utf8");assert(css.includes("clip-path:inset(50%)"));
});
