"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const { createGame } = require("./simulation-harness"), { sample } = require("./kite-rain-fixture"), R = require("../rollback");
const before = require("./projectile-rework-before.json");
let groups = 0;
const check = (name, fn) => { if(process.env.TEST_FILTER&&!new RegExp(process.env.TEST_FILTER).test(name))return;fn(); groups++; console.log(`ok ${name}`); };
function setup(key = "gunman", opponent = "anchor", stage = "Flat") {
  const g = createGame();
  g.rb.setup({ characterKeys: [key, opponent], stageIndex: g.rb.stageNames.indexOf(stage), seed: 91 });
  for (const [i, f] of g.debug.fighters.entries()) Object.assign(f, { x: 400 + i * 600, y: i ? 100 : 300,
    prevX: 400 + i * 600, prevY: i ? 100 : 300, vx: 0, vy: 0, onGround: false });
  return g;
}
function input(g, index, held, dir = { x: 1, y: 0 }) {
  const f = g.debug.fighters[index];
  Object.assign(f.controls, { hasAim: true, aim: dir });
  f.controls.actions.punchHeld = held;
  f.controls.buffers[held ? "punchPressed" : "punchReleased"] = .09;
  g.debug.updateHumanInput(index);
}
function fire(g, index = 0, direction = { x: 1, y: 0 }) {
  const f = g.debug.fighters[index];
  assert(!f.attack);
  // Cap/ownership fixtures isolate shot physics from the new magazine clock.
  if(f.reloadRemaining>0)g.debug.projectileMagazine.tick(index,f.reloadRemaining);
  f.whiffLag = f.punchLockout = f.hitstop = 0;
  input(g, index, true, direction); input(g, index, false, direction);
  assert(f.attack?.projectile, "Punch release did not queue a shot");
  const attack = f.attack;
  g.debug.updateAttack(index, attack.startup + 1e-9);
  assert(f.projectiles.includes(attack));
  return attack;
}
function motion(attack, x, y, vx, vy) {
  const speed = Math.hypot(vx, vy);
  Object.assign(attack.projectile, { x, y, vx, vy, speed });
  attack.dir = speed ? { x: vx / speed, y: vy / speed } : { x: 1, y: 0 };
}
function armKick(g, attack) {
  const f = g.debug.fighters[0];
  Object.assign(f, { x: 500, y: 300, prevX: 470, prevY: 300, vx: 900, vy: 0,
    onGround: false, dashDir: { x: 1, y: 0 }, dashCarryTimer: .3, airDashes: 0,
    dashReboundLockout: 0, hitstun: 0, hitstop: 0, punchInputHeld: false });
  motion(attack, 530, 300, 0, 0); attack.projectile.kickoffReady = true;
}
function holdToFizzle(g, index = 0, advanceShots = false) {
  input(g, index, true);
  const f = g.debug.fighters[index]; let frames = 1;
  while (!f.punchExhausted && frames < 600) {
    g.debug.updateHumanInput(index);g.debug.shields.tick(index);if (advanceShots) g.debug.updateProjectiles(1 / 60); frames++;
  }
  assert(f.punchExhausted); return frames / 60;
}

check("26 unchanged fighters retain data and 3,120 pre-change frame hashes; Kite has its own movement coverage", () => {
  for (const key of Object.keys(before).filter(key => !["gunman", "archer", "kite"].includes(key))) {
    assert.deepEqual(sample(key), before[key], `${key} changed outside the projectile rework`);
  }
});
check("caps are optional maxima, replace oldest first, and never refill on spawn/removal", () => {
  for (const [key, cap] of [["gunman", 3], ["archer", 5]]) {
    const g = setup(key), f = g.debug.fighters[0], shots = [];
    assert.equal(f.projectiles.length, 0); f.airDashes = 0;
    for (let i = 0; i < cap + 2; i++) shots.push(fire(g));
    assert.deepEqual(Array.from(f.projectiles, a => a.id), shots.slice(-cap).map(a => a.id));
    assert.equal(f.airDashes, 0);
    assert(new Set(shots.map(a => a.projectile.id)).size === cap + 2);
    for (const a of f.projectiles) {
      assert.equal(a.projectile.creatorId, f.id); assert.equal(a.projectile.ownerId, f.id);
      assert.equal(a.projectile.spawnOrder, a.id); assert.equal(a.projectile.generation, 0);
    }
    assert(g.rb.save().presentation.effects.some(e => e.sprite), "replacement has no authored disappearance cue");
  }
});
check("Gun Man is faster/smaller/weaker; Archer has more lifetime and recovery; movement unchanged", () => {
  const gun = setup(), bow = setup("archer"), a = fire(gun), b = fire(bow);
  assert(a.projectile.speed > b.projectile.speed * 1.5);
  assert(a.projectile.radius < b.projectile.radius);
  assert(a.projectile.remainingLife < b.projectile.remainingLife);
  assert(a.projectile.damage < b.projectile.damage && a.projectile.hitstun < b.projectile.hitstun && a.projectile.knockback < b.projectile.knockback);
  assert(gun.debug.fighters[0].punchLockout < bow.debug.fighters[0].punchLockout / 4);
  for (const g of [gun, bow]) {
    const f = g.debug.fighters[0], old = before[f.data.arrowPunch ? "archer" : "gunman"].data;
    for (const field of ["gravity", "dashBase", "dashMax", "airDashScale", "maxAirDashes", "airSteerDuration", "airSteerAccel"])
      assert.equal(f.data[field], old[field]);
  }
});
check("Kickoff does not make an oldest projectile young again for replacement", () => {
  const g = setup(), f = g.debug.fighters[0], oldest = fire(g), second = fire(g), third = fire(g);
  motion(second, 900, 100, 0, 0); motion(third, 1000, 100, 0, 0);
  armKick(g, oldest); g.debug.updateProjectiles(0); assert.equal(oldest.projectile.generation, 1);
  f.airDashes = 0; const newest = fire(g);
  assert(!f.projectiles.includes(oldest)); assert(f.projectiles.includes(second) && f.projectiles.includes(third) && f.projectiles.includes(newest));
  assert.equal(f.airDashes, 0);
});
check("native lifetimes expire and do not auto-maintain projectile counts", () => {
  for (const key of ["gunman", "archer"]) {
    const g = setup(key), f = g.debug.fighters[0], shot = fire(g);
    motion(shot, 700, 200, 0, 0);
    g.debug.updateProjectiles(shot.projectile.remainingLife + .01);
    assert.equal(f.projectiles.length, 0); assert.equal(f.attack, null);
  }
});
check("own Kickoff uses native recoil and exactly one dash refill; IDs/order/lifetime persist", () => {
  for (const key of ["gunman", "archer"]) {
    const g = setup(key), f = g.debug.fighters[0], shot = fire(g), id = shot.id, life = shot.projectile.remainingLife;
    armKick(g, shot); g.debug.updateProjectiles(0);
    assert(f.vx < -1000 && f.dashReboundFlash > 0 && f.dashReboundLockout > 0);
    assert.equal(f.airDashes, 1); assert.equal(shot.id, id); assert.equal(shot.projectile.spawnOrder, id);
    assert.equal(shot.projectile.ownerId, f.id); assert.equal(shot.reflectedOwnerId, undefined);
    assert.equal(shot.projectile.generation, 1); assert.equal(shot.projectile.remainingLife, life);
    assert(shot.projectile.vx > 0); assert.equal(shot.contactId, `${id}.1`);
    const generation = shot.projectile.generation;
    g.debug.updateProjectiles(0); assert.equal(f.airDashes, 1); assert.equal(shot.projectile.generation, generation);
  }
});
check("Kickoff obeys airborne, Punch priority, stun, approach and separation guards", () => {
  for (const extra of [{ onGround: true }, { punchInputHeld: true }, { chargingPunch: true },
    { punchBlockstun: .2 }, { hitstun: .4 }, { juked: .4 }, { dashReboundLockout: .2 }, { vx: -900 }]) {
    const g = setup(), shot = fire(g); armKick(g, shot); Object.assign(g.debug.fighters[0], extra);
    g.debug.updateProjectiles(0); assert.equal(shot.projectile.generation, 0, JSON.stringify(extra));
  }
  const g = setup(), shot = fire(g); armKick(g, shot); shot.projectile.kickoffReady = false;
  g.debug.updateProjectiles(0); assert.equal(shot.projectile.generation, 0, "a fresh overlapping spawn auto-kicked");
});
check("persistent hits register once, then become eligible after a legitimate Kickoff", () => {
  const g = setup(), [f, target] = g.debug.fighters, shot = fire(g);
  motion(shot, 700, 300, 0, 0); Object.assign(target, { x: 700, y: 300 });
  const hp = target.health; g.debug.updateProjectiles(0);
  assert(target.health < hp && f.projectiles.includes(shot)); const hitHp = target.health;
  for (let i = 0; i < 10; i++) g.debug.updateProjectiles(0);
  assert.equal(target.health, hitHp);
  target.x = 1000; armKick(g, shot); g.debug.updateProjectiles(0);
  motion(shot, 700, 300, 0, 0); Object.assign(target, { x: 700, y: 300, invulnerable: 0 });
  g.debug.updateProjectiles(0); assert(target.health < hitHp);
});
check("screen wrapping cannot turn a remote owned projectile into a phantom Kickoff", () => {
  for (const [x, expected] of [[200, 0], [40, 1]]) {
    const g = setup(), a = fire(g); armKick(g, a);
    Object.assign(g.debug.fighters[0], { x: 20, prevX: 1260 }); motion(a, x, 300, 0, 0);
    g.debug.updateProjectiles(0); assert.equal(a.projectile.generation, expected);
  }
});
check("owned ricochets exchange momentum, preserve ownership and refill once from a distance", () => {
  for (const key of ["gunman", "archer"]) {
    const g = setup(key), f = g.debug.fighters[0], a = fire(g), b = fire(g);
    motion(a, 600, 300, 600, 0); motion(b, 640, 300, -600, 0); f.airDashes = 0;
    const ids = [a.id, b.id]; g.debug.updateProjectiles(.05);
    assert(a.dir.x < 0 && b.dir.x > 0); assert.equal(f.airDashes, f.data.maxAirDashes);
    assert.deepEqual([a.id, b.id], ids); assert(!a.reflectedOwnerId && !b.reflectedOwnerId);
    assert.equal(a.projectile.generation, 1); assert.equal(b.projectile.generation, 1);
    f.airDashes = 0; g.debug.updateProjectiles(0); assert.equal(f.airDashes, 0);
  }
});
check("angled ricochets are bounded and static/separating overlap grants no resources", () => {
  const g = setup(), f = g.debug.fighters[0], a = fire(g), b = fire(g);
  motion(a, 600, 300, 2400, 0); motion(b, 650, 308, -1000, 0); f.airDashes = 0;
  g.debug.updateProjectiles(.025); assert(Math.abs(a.dir.y) > .1 || Math.abs(b.dir.y) > .1);
  for (let frame = 0; frame < 260; frame++) {
    g.debug.updateProjectiles(1 / 60);
    for (const p of f.projectiles) assert(Number.isFinite(p.projectile.speed) && p.projectile.speed <= p.projectile.maxSpeed);
  }
  assert.equal(f.projectiles.length, 0);
  const still = setup(), owner = still.debug.fighters[0], c = fire(still), d = fire(still);
  motion(c, 600, 300, 0, 0); motion(d, 600, 300, 0, 0); owner.airDashes = 0;
  for (let i = 0; i < 30; i++) still.debug.updateProjectiles(1 / 60);
  assert.equal(owner.airDashes, 0); assert.equal(c.projectile.generation, 0);
});
check("Gun Man bounces off terrain; Archer lodges briefly then leaves active play", () => {
  for (const key of ["gunman", "archer"]) {
    const g = setup(key), shot = fire(g); motion(shot, 600, 570, 0, 1000);
    g.debug.updateProjectiles(.05);
    if (key === "gunman") {
      assert(g.debug.fighters[0].projectiles.includes(shot)); assert(shot.dir.y < 0);
      assert(shot.projectile.y < 604 - shot.projectile.radius);
    } else {
      assert.equal(g.debug.fighters[0].projectiles.length, 0);
      const lodged = g.rb.save().presentation.effects.find(e => e.rotation !== undefined);
      assert(lodged && lodged.sprite.src.includes("Arrow_Projectile"));
      g.debug.presentationEffects.step(.1);
      const held = g.rb.save().presentation.effects.find(e => e.rotation !== undefined);
      assert.equal(held.x,lodged.x);assert.equal(held.y,lodged.y);
      g.debug.presentationEffects.step(.2);
      assert(!g.rb.save().presentation.effects.some(e => e.rotation !== undefined));
    }
  }
});
check("both shot types pass upward through one-way platforms and collide only when descending", () => {
  for (const key of ["gunman", "archer"]) for (const direction of [-1, 1]) {
    const g = setup(key, "anchor", "Perch"), shot = fire(g);
    const platform = g.debug.terrainArt.rects.find(p => p.kind === "oneway");
    assert(platform);
    const y = platform.y + (direction < 0 ? 70 : -70);
    motion(shot, platform.x + platform.w / 2, y, 0, direction * 1000);
    g.debug.updateProjectiles(.1);
    if (direction < 0) {
      assert(g.debug.fighters[0].projectiles.includes(shot)); assert(shot.dir.y < 0 && shot.projectile.y < platform.y);
    } else if (key === "gunman") {
      assert(g.debug.fighters[0].projectiles.includes(shot)); assert(shot.dir.y < 0 && shot.projectile.y < platform.y);
    } else assert.equal(g.debug.fighters[0].projectiles.length, 0);
  }
});
check("opposing shots retain double reflect and original creators; fizzle clears current ownership only", () => {
  const g = setup("gunman", "archer"), [a, b] = g.debug.fighters, gun = fire(g), arrow = fire(g, 1);
  motion(gun, 600, 300, 600, 0); motion(arrow, 640, 300, -600, 0);
  g.debug.updateProjectiles(.05);
  assert(gun.doubleReflect && arrow.doubleReflect);
  assert.equal(gun.projectile.creatorId, a.id); assert.equal(gun.projectile.ownerId, b.id);
  assert.equal(arrow.projectile.creatorId, b.id); assert.equal(arrow.projectile.ownerId, a.id);
  assert(gun.projectile.remainingLife > .3 && gun.projectile.remainingLife <= .4);
  a.airDashes = 0; holdToFizzle(g);
  assert(a.projectiles.includes(gun), "creator fizzle cleared a shot now controlled by someone else");
  assert(!b.projectiles.includes(arrow), "fizzle failed to clear a reflected shot controlled by this fighter");
  assert.equal(a.airDashes, 0);
});
const fizzleMetrics = [];
check("both fighters fizzle faster, preserving durability, weak Punch and no resource refill", () => {
  for (const key of ["gunman", "archer"]) {
    const g = setup(key), f = g.debug.fighters[0], first = fire(g), second = fire(g); f.airDashes = 0;
    const seconds = holdToFizzle(g, 0, true), old = setup(key);
    assert([first,second].every(a=>a.projectile.removed||a.projectile.remainingLife<=0), "fizzle left controlled shots active");
    old.debug.fighters[0].data = JSON.parse(JSON.stringify(before[key].data));
    old.debug.fighters[0].shieldHealth = old.debug.fighters[0].data.shieldMax;
    const priorSeconds = holdToFizzle(old);
    assert(seconds < priorSeconds * .71 && seconds > priorSeconds * .5, `${key}: ${seconds}s versus ${priorSeconds}s`);
    assert.equal(f.projectiles.length, 0); assert.equal(f.shieldHealth, f.data.shieldMax); assert.equal(f.punchCharge, 0);
    assert.equal(f.shieldRegenDelay,0); assert(!g.debug.isShielding(0)); assert.equal(f.airDashes, 0);
    assert.equal(f.stunType, "", "deliberate fizzle gained a new shield-break penalty");
    f.whiffLag = f.punchLockout = 0;
    input(g, 0, false); assert.equal(f.attack.charge, 0);
    fizzleMetrics.push({ key, priorSeconds, seconds, priorShield: 68, shield: f.data.shieldMax });
  }
});
check("normal shields deflect once and preserve pressure/recovery; reflected shots can hurt creators", () => {
  const g = setup(), [a, b] = g.debug.fighters, shot = fire(g);
  motion(shot, 700, 300, 600, 0); Object.assign(b, { x: 700, y: 300, chargingPunch: true, punchPending: true,
    punchInputHeld: true, punchAim: { x: -1, y: 0 } });
  const shield = b.shieldHealth; g.debug.updateProjectiles(0);
  assert(b.shieldHealth < shield && b.punchBlockstun > 0 && a.punchLockout > 0);
  assert(shot.dir.x < 0 && a.projectiles.includes(shot)); const after = b.shieldHealth;
  g.debug.updateProjectiles(0); assert.equal(b.shieldHealth, after);
  const reflect = setup(), [owner, guard] = reflect.debug.fighters, projectile = fire(reflect);
  motion(projectile, 700, 300, 600, 0);
  Object.assign(guard, { x: 700, y: 300, hitstun: .7, comboHits: 2, comboGrace: 1,
    lastAttacker: owner, hitstunParryActive: .1, hitstunParryMissPending: true });
  reflect.debug.updateProjectiles(0); assert.equal(projectile.reflectedOwnerId, guard.id);
  const hp = owner.health; motion(projectile, owner.x, owner.y, 0, 0); reflect.debug.updateProjectiles(0);
  assert(owner.health < hp && owner.projectiles.includes(projectile));
});
check("all sports arenas use shared projectiles and re-hit generations for balls/targets/bags", () => {
  for (const arena of ["standard", "elevated", "elevated-open", "target-break", "golden-rush"]) {
    const g = setup(); g.debug.dashball.setup({ arena, ruleset: "battle" }, { characters: ["gunman", "archer"], seed: 91 });
    const f = g.debug.fighters[0]; Object.assign(f, { x: 400, y: 300, prevX: 400, prevY: 300 });
    g.debug.fighters[1].y = 100; const shot = fire(g), ball = g.debug.dashball.state.ball;
    Object.assign(ball, { x: 700, y: 300, vx: 0, vy: 0 }); motion(shot, 650, 300, 1800, 0);
    g.debug.updateProjectiles(.05); assert.equal(ball.ownerId, f.id, arena); assert(f.projectiles.includes(shot));
    armKick(g, shot); g.debug.updateProjectiles(0); const generation = shot.projectile.generation; assert(generation > 0);
    motion(shot, 650, 300, 1800, 0); Object.assign(ball, { x: 700, y: 300, vx: 0, vy: 0 });
    g.debug.updateProjectiles(.05); assert(ball.vx > 0); assert(ball.attacks[`${f.id}:${shot.contactId}`] !== undefined);
  }
  const g = setup(); g.debug.sandbag.setup({ ruleset: "scramble" }, { characters: ["gunman", "archer"] });
  Object.assign(g.debug.fighters[0], { x: 400, y: 300, prevX: 400, prevY: 300 });
  const shot = fire(g), bag = g.debug.sandbag.state.bags[0]; motion(shot, bag.x, bag.y, 0, 0);
  g.debug.updateProjectiles(0); const score = g.debug.sandbag.state.scores[0]; assert(score > 0);
  g.debug.updateProjectiles(0); assert.equal(g.debug.sandbag.state.scores[0], score);
  armKick(g, shot); g.debug.updateProjectiles(0); motion(shot, bag.x, bag.y, 0, 0);
  g.debug.updateProjectiles(0); assert(g.debug.sandbag.state.scores[0] > score);
});
check("friendly fire rules still govern projectile damage after re-hits", () => {
  for (const enabled of [false, true]) {
    const g = setup(); g.debug.ai.configure({ stageName: "Flat", characters: ["gunman", "anchor", "orbit"],
      teamModeId: "pairs", teams: [0, 0, 1], positions: [{ x: 400, y: 300 }, { x: 700, y: 300 }, { x: 1000, y: 300 }] });
    const state = g.rb.save(); state.core.teamAttackEnabled = enabled; g.rb.restore(state);
    const [f, ally] = g.debug.fighters, shot = fire(g), hp = ally.health;
    armKick(g, shot); g.debug.updateProjectiles(0);
    motion(shot, ally.x, ally.y, 0, 0); g.debug.updateProjectiles(0);
    const after = ally.health; g.debug.updateProjectiles(0); assert.equal(ally.health, after);
    assert(enabled ? after < hp : after === hp); assert.equal(shot.projectile.ownerId, f.id);
  }
});
check("AI fires past the cap without getting stuck or repeatedly fizzling", () => {
  const counts = [];
  for (const key of ["gunman", "archer"]) {
    const g = setup(key);
    g.debug.ai.configure({ stageName: "Flat", characters: [key, "anchor"], positions: [{ x: 400, y: 300 }, { x: 800, y: 300 }] });
    vm.runInContext("Math.random = () => .61", g.sandbox);
    g.debug.updateHumanInput(1);
    for (const f of g.debug.fighters) f.health = 10000;
    const seen = new Set(); let fizzleFrames = 0;
    for (let frame = 0; frame < 360; frame++) {
      g.debug.arena.stepAI(); const f = g.debug.fighters[0];
      for (const a of f.projectiles) seen.add(a.id);
      if (f.punchExhausted) fizzleFrames++;
      assert(f.projectiles.length <= f.data.projectileConfig.cap);
    }
    assert(seen.size > g.debug.fighters[0].data.projectileConfig.cap, `${key}: ${seen.size} shots`);
    assert.equal(fizzleFrames, 0); counts.push(seen.size);
  }
  assert(counts[0] > counts[1], `rapid Gun Man / deliberate Archer AI: ${counts}`);
});
check("a live re-hit generation restores exactly, including authoritative snapshot ownership", () => {
  const g = setup("gunman", "archer"), shot = fire(g); armKick(g, shot); g.debug.updateProjectiles(0);
  shot.hitTargets.add("already-hit");
  const saved = g.rb.save(), hash = g.rb.hash(), meta = JSON.stringify(shot.projectile);
  shot.projectile.generation = 999; shot.projectile.creatorId = "wrong"; shot.hitTargets.clear();
  g.rb.restore(saved); const restored = g.debug.fighters[0].projectiles[0];
  assert.equal(JSON.stringify(restored.projectile), meta); assert.equal(g.rb.hash(), hash);
  assert(restored.hitTargets.has("already-hit"));
  const online = g.debug.online.createSnapshot(); online.sequence = 999;
  g.debug.online.installSnapshot(online);
  const authoritative = g.debug.fighters[0].projectiles[0];
  assert.equal(authoritative.projectile.generation, 1); assert.equal(authoritative.projectile.creatorId, g.debug.fighters[0].id);
  assert.equal(typeof authoritative.hitTargets.add, "function");
});
check("stable identities, hit Sets, lifetimes and ownership survive snapshots and delayed rollback", () => {
  const a = setup("gunman", "archer", "High Perch"), b = setup("gunman", "archer", "High Perch");
  for (const g of [a, b]) for (const f of g.debug.fighters) Object.assign(f, { y: -5000, onGround: false });
  const manager = b.rb.manager(0, 8), pending = [], inputs = []; let snapshot;
  for (let frame = 0; frame < 240; frame++) {
    const encoded = [0, 1].map(i => R.encode({ hasAim: true, aimX: Math.cos(frame * .08 + i), aimY: Math.sin(frame * .08 + i),
      dashHeld: (frame + i * 7) % 47 < 6, punchHeld: (frame + i * 9) % (i ? 25 : 8) < (i ? 10 : 2) }));
    inputs.push(encoded.map(R.decode)); pending.push({ frame, input: encoded[1] });
    if (frame >= 6) { const packet = pending.shift(); manager.receive(packet.frame, packet.input); }
    assert(manager.advance(encoded[0])); a.rb.step(inputs[frame]); if (frame === 80) snapshot = a.rb.save();
  }
  for (const packet of pending) manager.receive(packet.frame, packet.input); manager.reconcile();
  assert.equal(a.rb.hash(), b.rb.hash()); const hash = a.rb.hash(); a.rb.restore(snapshot);
  for (let frame = 81; frame < inputs.length; frame++) a.rb.step(inputs[frame]); assert.equal(a.rb.hash(), hash);
  const state = a.debug.online.createSnapshot(); state.sequence = 99999; a.debug.online.installSnapshot(state);
  for (const f of a.debug.fighters) for (const p of f.projectiles) assert.equal(typeof p.hitTargets.add, "function");
  assert(manager.rollbacks > 0);
});
fs.writeFileSync("artifacts/projectile-rework/results.json", JSON.stringify({ groups, fizzleMetrics }, null, 2));
console.log(JSON.stringify({ groups, fizzleMetrics }));
