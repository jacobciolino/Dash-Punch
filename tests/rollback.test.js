"use strict";
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const vm = require("node:vm");
const { createGame } = require("./simulation-harness");
const R = require("../rollback");
const a = createGame(), b = createGame();
const flat = a.rb.stageNames.indexOf("Flat");
const neutral = R.decode(R.neutral());
let comparedFrames = 0, rollbacks = 0, maximumDepth = 0;
const started = performance.now();

function command(frame, player) {
  const phase = frame + player * 17;
  const angle = (phase * 0.17 + player * Math.PI);
  return R.encode({ hasAim:true,aimX:Math.cos(angle),aimY:Math.sin(angle),
    dashHeld:phase % 37 < 10,punchHeld:phase % 29 < 9,
    downHeld:phase % 80 < 3,upHeld:phase % 120 > 100,downPressed:phase % 80 === 0 });
}
function setup(game, stageIndex = flat, characters = ["anchor","swordkun"], seed = 1234) {
  const name=game.rb.stageNames[stageIndex],arena=game.sandbox.Dashball.ARENAS.find(stage=>stage.name===name);
  if(arena){game.debug.dashball.setup({arena:arena.id,teamSize:1},{characters,seed});return;}
  if(name?.startsWith("Sandbag")){game.debug.sandbag.setup({ruleset:name==="Sandbag Scramble"?"scramble":"brawl",teamSize:1},{characters,seed});return;}
  game.debug.dashball.standard();
  game.rb.setup({stageIndex,characterKeys:characters,seed});
}
function determinism(stage, characters, frames = 180) {
  setup(a,stage,characters); setup(b,stage,characters);
  assert.equal(a.rb.hash(),b.rb.hash(),"initial state mismatch");
  for (let frame = 0; frame < frames; frame++) {
    const inputs = [command(frame,0),command(frame,1)].map(R.decode);
    assert.equal(a.rb.step(inputs), b.rb.step(inputs), `determinism ${a.rb.stageNames[stage]}/${characters} frame ${frame}`);
    comparedFrames++;
    if (frame === 45) {
      const saved = a.rb.save();
      const hash = a.rb.hash();
      a.rb.step([neutral,neutral]);
      a.rb.restore(saved);
      assert.equal(a.rb.hash(),hash,"state restoration not exact");
    }
  }
}

// Real game engine in independent JS globals, all characters and moving/gravity arenas.
if (!process.env.ROLLBACK_QUICK) {
  for (const character of a.rb.characterKeys) determinism(flat,[character,"anchor"],120);
  for (let stage = 0; stage < a.rb.stageNames.length; stage++) determinism(stage,["microusb", "anchor"],120);
}

// Actual state restoration and resimulation, with dropped/reordered redundant packets.
for (const latency of [0,3,6,8]) {
  setup(a); setup(b);
  const manager = b.rb.manager(0,8);
  const scheduled = [];
  for (let frame = 0; frame < (process.env.ROLLBACK_QUICK ? 30 : 360); frame++) {
    const local = command(frame,0), remote = command(frame,1);
    const delay = frame % 19 === 0 ? Math.min(8,latency+1) : latency;
    scheduled.push({due:frame+delay,frame,input:remote});
    for (let i = scheduled.length-1; i >= 0; i--) {
      if (scheduled[i].due <= frame) { const packet=scheduled.splice(i,1)[0]; manager.receive(packet.frame,packet.input); }
    }
    assert.equal(manager.advance(local),true,"unexpected window stall");
    a.rb.step([local,remote].map(R.decode));
  }
  for (const packet of scheduled) manager.receive(packet.frame,packet.input);
  manager.reconcile();
  assert.equal(b.rb.hash(),a.rb.hash(),`rollback did not recover authoritative state at latency ${latency}`);
  rollbacks += manager.rollbacks; maximumDepth = Math.max(maximumDepth,manager.maxDepth);
}

// Bound prediction explicitly, retain the input for the stalled frame, then recover.
setup(b);
const capped = b.rb.manager(0,8);
for (let frame=0; frame<8; frame++) assert.equal(capped.advance(R.neutral()),true);
assert.equal(capped.advance(R.neutral()),false);
assert.equal(capped.frame,8);
for (let frame=0; frame<8; frame++) capped.receive(frame,R.neutral());
assert.equal(capped.advance(R.neutral()),true);
assert.throws(()=>capped.receive(0,command(0,0)),/Conflicting/);

// Cross-fighter references and Sets survive restoration, including projectile owners.
setup(a,flat,["gunman","goodergunman"]);
a.debug.fighters[0].lastAttacker = a.debug.fighters[1];
a.debug.fighters[0].knockdownSource = a.debug.fighters[1];
const reference = a.rb.save();
a.debug.fighters[0].lastAttacker = null;
a.rb.restore(reference);
assert.equal(a.debug.fighters[0].lastAttacker,a.debug.fighters[1]);
assert.equal(a.debug.fighters[0].knockdownSource,a.debug.fighters[1]);

function arm(game,index,dir = {x:1,y:0},charge = 0.8) {
  const SetType = vm.runInContext("Set",game.sandbox);
  game.debug.fighters[index].attack = { id:800+index,age:0.02,startup:0,active:0.3,recovery:0.2,total:0.5,
    dir,charge,hitTargets:new SetType(),clashed:false,selfCancelled:false,grounded:true };
}
const stressCases = [
  { name:"clash", init(game) { arm(game,0); arm(game,1,{x:-1,y:0}); } },
  { name:"charged hit/DI/combo", init(game) { arm(game,0); } },
  { name:"shield break", init(game) {
    arm(game,0); Object.assign(game.debug.fighters[1],{chargingPunch:true,punchCharge:0.3,punchInputHeld:true,shieldHealth:0.1,face:{x:-1,y:0}});
  } },
  { name:"low health KO", init(game) { arm(game,0); game.debug.fighters[1].health=0.1; } },
  { name:"simultaneous KO state", init(game) {
    for (const fighter of game.debug.fighters) { fighter.health=0; fighter.koScored=true; fighter.koCorpseAge=0; }
  } },
  { name:"surface tech", init(game) {
    Object.assign(game.debug.fighters[1],{y:558,vy:380,onGround:false,hitstun:0.5,surfaceBounceSource:"kickoff",stunType:"",lastAttacker:game.debug.fighters[0],comboHits:3,comboGrace:0.6});
  } },
  { name:"wrap boundary", init(game) { Object.assign(game.debug.fighters[0],{x:1278,vx:900,onGround:false,dashCarryTimer:0.3}); } },
  { name:"electric multihit", characters:["microusb","anchor"], init(game) { arm(game,0); } },
  { name:"projectile/reflect", characters:["gunman","goodergunman"], init() {} },
  { name:"combo defensive inputs", init(game) {
    Object.assign(game.debug.fighters[1],{hitstun:0.6,comboHits:4,comboGrace:0.8,lastAttacker:game.debug.fighters[0],onGround:false});
    arm(game,0);
  } },
  { name:"kickoff routing", init(game) {
    Object.assign(game.debug.fighters[0],{x:438,y:300,prevX:408,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:0.3,onGround:false,dashReboundLockout:0});
    Object.assign(game.debug.fighters[1],{x:470,y:355,dashReboundLockout:0});
  } },
  { name:"punch/kickoff priority", init(game) {
    Object.assign(game.debug.fighters[0],{x:438,y:300,prevX:408,prevY:300,vx:900,vy:0,dashDir:{x:1,y:0},dashCarryTimer:0.3,onGround:false,dashReboundLockout:0});
    Object.assign(game.debug.fighters[1],{x:470,y:355,dashReboundLockout:0});
    arm(game,0);
  } },
];
for (const scenario of stressCases) {
  for (const game of [a,b]) {
    setup(game,flat,scenario.characters || ["anchor","swordkun"]);
    game.debug.fighters.forEach((fighter,index)=>Object.assign(fighter,{x:500+index*62,y:530,onGround:false,face:{x:index?-1:1,y:0}}));
    scenario.init(game);
  }
  const manager = b.rb.manager(0,8);
  const pending = [];
  for (let frame=0;frame<60;frame++) {
    const local=command(frame,0), remote=command(frame,1);
    if (frame===0 && scenario.name.includes("kickoff")) { local.b=0; remote.b=0; }
    if (scenario.name==="shield break" && frame<20) remote.b |= 2;
    pending.push({frame,input:remote});
    if (frame>=5) { const packet=pending.shift(); manager.receive(packet.frame,packet.input); }
    manager.advance(local);
    a.rb.step([local,remote].map(R.decode));
  }
  for (const packet of pending) manager.receive(packet.frame,packet.input);
  manager.reconcile();
  assert.equal(a.rb.hash(),b.rb.hash(),`stress rollback diverged: ${scenario.name}`);
}

// A replayed release must not create a second sound or append another particle burst.
setup(a);
const held=R.decode(R.encode({hasAim:true,aimX:1,aimY:0,punchHeld:true}));
a.rb.step([held,neutral]);
const beforeRelease=a.rb.save();
const release=R.decode(R.encode({hasAim:true,aimX:1,aimY:0,punchReleased:true}));
a.rb.presentStep([release,neutral]);
const emitted=a.rb.stats.audioEvents;
const particles=a.rb.save().presentation.effects.length;
assert(emitted>0,"audio replay test generated no event");
a.rb.restore(beforeRelease);
a.rb.presentStep([release,neutral]);
assert.equal(a.rb.stats.audioEvents,emitted,"replayed frame duplicated audio");
assert.equal(a.rb.save().presentation.effects.length,particles,"replayed frame duplicated particles");

// Exercise the production start handshake, input-only messages, hashes and rematch.
const host = createGame(), guest = createGame();
const wire = [];
let tick = 0, delayed = false, dropped = 0, gameplayPackets = 0;
function send(to, text) {
  const message = JSON.parse(text);
  assert(!["snapshot","input","audio"].includes(message.type),"legacy authoritative traffic is active");
  if (message.type === "rollback-input") {
    gameplayPackets++;
    assert(!("fighters" in message),"gameplay packet contains fighter positions");
    if (delayed && message.sequence % 23 === 0) { dropped++; return; }
  }
  wire.push({to,message,due:tick + (delayed && message.type === "rollback-input" ? 3 + message.sequence % 3 : 0)});
}
function flush(all = false) {
  let again = true;
  while (again) {
    again = false;
    for (let i=wire.length-1;i>=0;i--) if (all || wire[i].due <= tick) {
      const packet = wire.splice(i,1)[0]; packet.to.rb.receive(packet.message); again=true;
    }
  }
}
host.rb.connect("host",text=>send(guest,text));
guest.rb.connect("guest",text=>send(host,text));
flush(); host.rb.start(); flush();
assert.equal(host.rb.networkState.active,true,host.rb.networkState.status);
assert.equal(guest.rb.networkState.active,true,guest.rb.networkState.status);
assert.equal(host.rb.hash(),guest.rb.hash(),"handshake starts different states");
delayed = true;
const networkStarted = performance.now();
for (tick=0;tick<(Number(process.env.NETWORK_FRAMES) || (process.env.ROLLBACK_QUICK ? 30 : 240));tick++) {
  flush();
  host.rb.networkStep(R.decode(command(host.rb.frame,0)));
  guest.rb.networkStep(R.decode(command(guest.rb.frame,1)));
  assert.equal(host.rb.networkState.paused,false,host.rb.networkState.status);
  assert.equal(guest.rb.networkState.paused,false,guest.rb.networkState.status);
  if (process.env.ROLLBACK_PROFILE && tick % 60 === 59) console.error({tick,ms:Math.round(performance.now()-networkStarted),snapshotBytes:JSON.stringify(host.rb.save()).length});
}
flush(true);
const networkMs = performance.now() - networkStarted;
assert.equal(host.rb.frame,guest.rb.frame);
assert.equal(host.rb.hash(),guest.rb.hash(),"two-peer input transport desync");
assert(host.rb.stats.rollbacks+guest.rb.stats.rollbacks>0);
const previousSession = host.rb.networkState.id;
delayed=false;
host.rb.start(); flush(true);
assert.notEqual(host.rb.networkState.id,previousSession,"rematch reused session id");
assert.equal(host.rb.frame,0);
assert.equal(host.rb.hash(),guest.rb.hash());
guest.rb.receive({type:"rollback-input",matchId:previousSession,player:0,sequence:999,inputs:[[0,0,0]]});
assert.equal(guest.rb.frame,0,"stale session mutated rematch");
guest.rb.receive({type:"rollback-input",matchId:guest.rb.networkState.id,player:0,sequence:1000,inputs:[],hashFrame:0,hash:"deadbeef"});
assert.equal(guest.rb.networkState.paused,true,"desync did not stop the match explicitly");
assert.match(guest.rb.networkState.status,/Desync at frame/);

assert(rollbacks>0,"test never caused a rollback");
assert(maximumDepth>=6,"test never exercised a deep rollback");
console.log(JSON.stringify({tests:"passed",independentSimulationFrames:comparedFrames,
  rollbacks,maxRollbackDepth:maximumDepth,window:8, stressCases:stressCases.map(item=>item.name), gameplayPackets,dropped, rematchVerified:true, networkMs:Math.round(networkMs), snapshotBytes:JSON.stringify(host.rb.save()).length,
  elapsedMs:Math.round(performance.now()-started)}));
