"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const R = require("../rollback");
const { createGame } = require("./simulation-harness");

const ROOT = process.env.CORE_RELEASE_DIR
  ? path.resolve(process.env.CORE_RELEASE_DIR) : path.resolve(__dirname, "..");
const DT = 1 / 60;
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected, message = "", epsilon = 1e-7) =>
  assert(Math.abs(actual - expected) < epsilon, `${message}: ${actual} != ${expected}`);
const neutral = () => R.decode(R.neutral());

function pose(fighter, x, y, extra = {}) {
  Object.assign(fighter, {
    x, y, prevX: x, prevY: y, vx: 0, vy: 0, onGround: false,
    wallSliding: false, wallClinging: false, touchingWall: false,
    hitstop: 0, hitstun: 0, invulnerable: 0, comboHits: 0, comboGrace: 0,
    hasLiveAim: false, dashReboundLockout: 0, punchInputHeld: false,
    ...extra,
  });
}

function setup({ key = "phantom", other = "anchor", arena, sandbag = false } = {}) {
  const game = createGame(ROOT);
  if (sandbag) {
    game.debug.sandbag.setup({ ruleset: "scramble" }, { characters: [key, other], seed: 91 });
  } else if (arena) {
    game.debug.dashball.setup({ arena, ruleset: "battle" }, { characters: [key, other], seed: 91 });
  } else {
    game.rb.setup({ stageIndex: game.rb.stageNames.indexOf("High Perch"),
      characterKeys: [key, other], seed: 91 });
  }
  game.debug.fighters.forEach((fighter, index) =>
    pose(fighter, 200 + index * 800, arena || sandbag ? 600 : -5000 - index * 2000));
  return game;
}

function step(game, inputs = game.debug.fighters.map(neutral)) {
  return game.rb.step(inputs);
}

function arm(game, index = 0, extra = {}) {
  const SetType = vm.runInContext("Set", game.sandbox);
  const attack = { id: 10000 + index, age: .1, startup: 0, active: 1,
    recovery: .1, total: 1.2, charge: 0, dir: { x: index ? -1 : 1, y: 0 },
    hitTargets: new SetType(), clashed: false, selfCancelled: false, grounded: false, ...extra };
  game.debug.fighters[index].attack = attack;
  return attack;
}

function dash(game, dir = { x: 1, y: 0 }, charge = 0) {
  game.debug.gravity.dash(0, dir, charge * game.debug.fighters[0].data.dashChargeTime);
  return game.debug.fighters[0].phantomDash;
}

function finish(game) {
  let frames = 0;
  while (game.debug.phantom.ghost(0) && frames++ < 100) step(game);
  assert(frames > 0 && frames <= 100, "dash must complete within its bounded lifetime");
  const state = game.debug.fighters[0].phantomDash;
  assert.equal(state.phase, "solid");
  assert.equal(state.pending, false, "rb.step must consume completion");
  return frames;
}

function punchInput(game, held) {
  const fighter = game.debug.fighters[0];
  Object.assign(fighter.controls, { hasAim: true, aim: { x: 1, y: 0 } });
  fighter.controls.actions.punchHeld = held;
  fighter.controls.buffers[held ? "punchPressed" : "punchReleased"] = .09;
  game.debug.updateHumanInput(0);
}

function endpointGame(offset = 5, other = "anchor") {
  const game = setup({ other });
  const [fighter, target] = game.debug.fighters;
  dash(game);
  fighter.phantomDash.remaining = DT;
  // Hitstop keeps the target stationary so contact and launch have exact oracles.
  pose(target, fighter.x + fighter.phantomDash.speed * DT + offset, fighter.y,
    { onGround: true, hitstop: 1 });
  return game;
}

test("Phantom tuning: two charges, 1.25-second ghost, low health and strong short strike", () => {
  const game = setup(), [fighter, anchor] = game.debug.fighters;
  const data = fighter.data;
  assert.equal(data.name, "Phantom");
  assert.equal(data.maxHealth, 99, "60 base health uses the shared 1.65 health scale");
  assert(data.maxHealth < anchor.data.maxHealth);
  assert.equal(data.maxAirDashes, 2);
  assert.equal(data.unlimitedAirDashes, undefined);
  near(data.gravity, 1450);
  near(data.walkSpeedScale, .75);
  near(data.punchDamage, 14.3);
  near(data.punchReach, 34);
  near(data.punchRadius, 24);
  assert.deepEqual(plain(data.phantomDash), { duration: 1.25, speed: 520,
    chargedSpeed: 600, opacity: .4,
    strike: { damage: 28, knockback: 110, hitstun: .24, impulse: 120 } });
});

test("ground Dash stays tangible, spends no air charge and produces no materialization strike", () => {
  const game = setup(), [fighter, target] = game.debug.fighters;
  pose(fighter, 200, -5000, { onGround: true });
  pose(target, 240, -5000, { hitstop: 1 });
  const health = target.health;
  dash(game);
  assert(!game.debug.phantom.ghost(0));
  near(game.debug.phantom.alpha(0), 1);
  assert.equal(fighter.phantomDash, undefined);
  assert.equal(fighter.airDashes, 2);
  step(game);
  assert.equal(target.health, health);
  arm(game, 1);
  const ownHealth = fighter.health;
  game.debug.resolveHit(1, 0);
  assert(fighter.health < ownHealth, "a ground Dash must not grant ghost immunity");
});

test("air Dash uses two charges; low-level launch rejects overlapping ghosts and a direct third launch", () => {
  const game = setup(), fighter = game.debug.fighters[0];
  const first = dash(game);
  assert(game.debug.phantom.ghost(0));
  near(game.debug.phantom.alpha(0), .4);
  assert.equal(fighter.airDashes, 1);
  dash(game, { x: -1, y: 0 });
  assert.equal(fighter.phantomDash, first, "held/repeated Dash must not replace an active ghost");
  assert.equal(fighter.airDashes, 1);
  assert.equal(finish(game), 75);
  const second = dash(game, { x: -1, y: 0 }, 1);
  assert.notEqual(second.id, first.id);
  assert.equal(fighter.airDashes, 0);
  near(second.speed, 600);
  finish(game);
  const position = [fighter.x, fighter.y, fighter.vx, fighter.vy];
  dash(game);
  assert.equal(fighter.phantomDash, second);
  assert.equal(fighter.airDashes, 0);
  assert(!game.debug.phantom.ghost(0));
  assert.deepEqual([fighter.x, fighter.y, fighter.vx, fighter.vy], position);
});

test("ghost direction, charge interpolation and displacement remain committed", () => {
  for (const charge of [0, .5, 1]) {
    const game = setup(), fighter = game.debug.fighters[0];
    const dir = { x: .6, y: -.8 }, state = dash(game, dir, charge);
    const speed = 520 + 80 * charge, start = { x: fighter.x, y: fighter.y };
    near(state.speed, speed);
    for (let frame = 0; frame < 20; frame++) {
      step(game, [{ hasAim: true, aimX: -1, aimY: 0 }, neutral()]);
      near(fighter.vx, dir.x * speed);
      near(fighter.vy, dir.y * speed);
    }
    near(fighter.x, start.x + dir.x * speed * DT * 20);
    near(fighter.y, start.y + dir.y * speed * DT * 20);
    assert.deepEqual(plain(state.dir), dir);
  }
});

test("real landing refills two charges; fresh wall cling does not", () => {
  const game = setup({ arena: "standard" }), fighter = game.debug.fighters[0];
  const stage = game.debug.dashball.arena;
  pose(fighter, 800, stage.floorY - fighter.data.height / 2 + 1,
    { airDashes: 0, vy: 100 });
  game.debug.resolveTerrain(0);
  assert(fighter.onGround);
  assert.equal(fighter.airDashes, 2);
  pose(fighter, 24 + fighter.data.width / 2 - 1, 500,
    { airDashes: 0, vx: -200, hasLiveAim: true, aim: { x: -1, y: 0 } });
  game.debug.resolveTerrain(0);
  assert(fighter.wallClinging, "fixture must establish a genuine fresh cling");
  assert.equal(fighter.airDashes, 0);
  dash(game, { x: 1, y: 0 });
  assert(!game.debug.phantom.ghost(0), "a wall must not bypass an exhausted air budget");
});

test("actual wall, ceiling and floor stop the ghost, but stale wall grace does not", () => {
  for (const surface of ["wall", "ceiling", "floor", "grace"]) {
    const game = setup({ arena: "standard" }), fighter = game.debug.fighters[0];
    const stage = game.debug.dashball.arena;
    let dir = { x: 1, y: 0 };
    if (surface === "wall") pose(fighter, 24 + fighter.data.width / 2 + 2, 500);
    if (surface === "wall") dir = { x: -1, y: 0 };
    if (surface === "ceiling") {
      pose(fighter, 800, 24 + fighter.data.height / 2 + 2);
      dir = { x: 0, y: -1 };
    }
    if (surface === "floor") {
      pose(fighter, 800, stage.floorY - fighter.data.height / 2 - 2);
      dir = { x: 0, y: 1 };
    }
    dash(game, dir);
    if (surface === "grace") Object.assign(fighter,
      { wallContactGrace: .1, wallContactId: "stale", wallContactNormalX: 1 });
    step(game);
    assert.equal(game.debug.phantom.ghost(0), surface === "grace", surface);
    if (surface !== "grace") {
      assert.equal(fighter.phantomDash.phase, "solid");
      assert.equal(fighter.phantomDash.pending, false);
      assert.equal(fighter.airDashes, surface === "floor" ? 2 : 1);
    }
  }
});

test("successful solid-phase hits do not refill Phantom, while other fighters still refill", () => {
  for (const key of ["phantom", "anchor"]) {
    const game = setup({ key }), [fighter, target] = game.debug.fighters;
    fighter.airDashes = 0;
    arm(game);
    const health = target.health;
    game.debug.resolveHit(0, 1);
    assert(target.health < health);
    assert.equal(fighter.airDashes, key === "phantom" ? 0 : fighter.data.maxAirDashes);
  }
});

test("hitstun banking, mercy wrap and successful combo escape never refill Phantom", () => {
  const game = setup(), [fighter, attacker] = game.debug.fighters;
  Object.assign(fighter, { airDashes: 0, hitstun: .5, comboHits: 3,
    lastAttacker: attacker, comboGrace: .8 });
  game.debug.updateComboResilienceMeters(0, 10);
  assert.equal(fighter.bankedAirDashes, 0);
  near(fighter.airDashRechargeMeter, 0);
  fighter.hitstun = DT / 2;
  game.debug.gravity.physics(0);
  assert.equal(fighter.airDashes, 0);
  Object.assign(fighter, { mercyDashWrapped: true, mercyDashTimer: 10, hitstun: 0 });
  game.debug.gravity.physics(0);
  assert.equal(fighter.airDashes, 0);
  assert.equal(fighter.hasMercyDash, false);
  Object.assign(fighter, { hitstun: .5, comboHits: 3, lastAttacker: attacker,
    lastHitDir: { x: 1, y: 0 }, escapeAvailable: true });
  arm(game, 1, { dir: { x: 1, y: 0 } });
  const incoming = game.debug.getLaunchDirection(1);
  assert(game.debug.bufferComboEscape(0, { x: -incoming.x, y: -incoming.y }));
  game.debug.resolveHit(1, 0);
  assert.equal(fighter.dashEscapeBuffer, 0);
  assert(fighter.comboEscapeFlash > 0, "fixture must successfully escape");
  assert.equal(fighter.airDashes, 0);
});

test("Phantom cannot conventional-Kickoff in either phase; Anchor still can", () => {
  for (const phase of ["ghost", "solid"]) {
    const game = setup(), [fighter, target] = game.debug.fighters;
    dash(game);
    fighter.phantomDash.phase = phase;
    pose(fighter, 500, -5000, { prevX: 470, vx: 900,
      dashDir: { x: 1, y: 0 }, dashCarryTimer: .3, airDashes: 0 });
    pose(target, 530, -5000);
    const health = target.health;
    assert.equal(game.debug.tryDashRebound(0, 1), false, phase);
    assert.equal(target.health, health);
    assert.equal(fighter.airDashes, 0);
  }
  const game = setup({ key: "anchor" }), [fighter, target] = game.debug.fighters;
  pose(fighter, 500, -5000, { prevX: 470, vx: 900,
    dashDir: { x: 1, y: 0 }, dashCarryTimer: .3, airDashes: 0 });
  pose(target, 530, -5000);
  assert(game.debug.tryDashRebound(0, 1));
  assert.equal(fighter.airDashes, 1);
});

test("ghost rejects incoming damage, outgoing attack and shield without consuming hit contacts", () => {
  const game = setup(), [fighter, target] = game.debug.fighters;
  dash(game);
  const incoming = arm(game, 1), health = fighter.health;
  game.debug.resolveHit(1, 0);
  assert.equal(fighter.health, health);
  assert.equal(fighter.hitstun, 0);
  assert.equal(incoming.hitTargets.size, 0);
  pose(target, fighter.x + 40, fighter.y);
  const outgoing = arm(game), otherHealth = target.health;
  Object.assign(fighter, { chargingPunch: true, punchPending: true, punchInputHeld: true });
  assert.equal(game.debug.isShielding(0), false);
  game.debug.handleHits();
  assert.equal(target.health, otherHealth);
  assert.equal(outgoing.hitTargets.size, 0);
  game.debug.resolveHit(0, 1);
  assert.equal(target.health, otherHealth);
});

test("ghost clears punch buffers and requires release then a fresh press after materializing", () => {
  const game = setup(), fighter = game.debug.fighters[0];
  dash(game);
  punchInput(game, true);
  assert.equal(fighter.attack, null);
  assert.equal(fighter.chargingPunch, false);
  assert.equal(fighter.punchPending, false);
  punchInput(game, false);
  assert.equal(fighter.attack, null);
  finish(game);
  for (let frame = 0; frame < 4; frame++) step(game);
  assert.equal(fighter.attack, null, "a release buffered during ghost must not become a strike");
  punchInput(game, false);
  punchInput(game, true);
  punchInput(game, false);
  assert(fighter.attack, "a fresh post-materialization press/release must still punch");
  assert.equal(fighter.attack.materialization, undefined);
});

test("ghost passes through fighter bodies without damage, push or historical completion hits", () => {
  const game = setup(), [fighter, target] = game.debug.fighters;
  pose(target, 450, fighter.y, { onGround: true, hitstop: 10 });
  const health = target.health, start = fighter.x;
  dash(game);
  for (let frame = 0; frame < 75; frame++) {
    step(game);
    near(fighter.x, start + 520 * DT * (frame + 1), "body contact changed committed movement");
    assert.equal(target.health, health);
    near(target.x, 450);
  }
  assert.equal(fighter.phantomDash.phase, "solid");
  assert.equal(fighter.phantomDash.pending, false);
  assert.deepEqual(plain(fighter.phantomDash.contacts), []);
});

test("completion hits only the endpoint: 28 damage, 110 grounded knockback, .24 hitstun and normal hit refill", () => {
  const game = endpointGame(), [fighter, target] = game.debug.fighters;
  const endpoint = fighter.x + 520 * DT;
  // Stay inside materialization's .75 contact margin, outside body depenetration.
  target.x = target.prevX = endpoint + (fighter.data.width + target.data.width) / 2 + .5;
  const health = target.health;
  step(game);
  near(fighter.x, endpoint);
  assert.equal(health - target.health, 28);
  near(Math.hypot(target.vx, target.vy), 110);
  near(target.hitstun, .24);
  assert.equal(target.lastAttacker, fighter);
  assert.equal(fighter.airDashes, 2, "confirmed materialization restores the punch air-dash resource");
  assert.deepEqual(plain(fighter.phantomDash.contacts), [target.id]);
});

test("materialization respects native invulnerability without recording a false contact", () => {
  const game = endpointGame(), [fighter, target] = game.debug.fighters;
  target.invulnerable = 1;
  const health = target.health;
  step(game);
  assert.equal(target.health, health);
  assert.equal(target.lastAttacker, null);
  assert.deepEqual(plain(fighter.phantomDash.contacts), []);
  assert.equal(fighter.phantomDash.pending, false);
  assert.equal(fighter.airDashes, 1);
});

test("materialization respects native friendly-fire filtering", () => {
  const game = setup();
  game.debug.ai.configure({ stageName: "High Perch", teamModeId: "teams2",
    teams: [0, 0], characters: ["phantom", "anchor"] });
  const saved = game.rb.save();
  saved.core.teamAttackEnabled = false;
  game.rb.restore(saved);
  const [fighter, teammate] = game.debug.fighters;
  assert.equal(game.debug.sandbag.canAffect(0, 1), false,
    "fixture must disable friendly fire before starting the ghost");
  pose(fighter, 200, -5000);
  dash(game);
  fighter.phantomDash.remaining = DT;
  pose(teammate, fighter.x + 520 * DT + 5, fighter.y, { onGround: true, hitstop: 1 });
  assert.equal(game.debug.sandbag.canAffect(0, 1), false);
  const health = teammate.health;
  step(game);
  assert.equal(teammate.health, health);
  assert.deepEqual(plain(fighter.phantomDash.contacts), []);
});

test("materialization uses native directional shielding, chip and shield damage", () => {
  const game = endpointGame(), [fighter, target] = game.debug.fighters;
  Object.assign(target, { chargingPunch: true, punchPending: true, punchInputHeld: true,
    punchAim: { x: -1, y: 0 }, punchCharge: .5 });
  assert(game.debug.isShielding(1));
  const health = target.health, shield = target.shieldHealth;
  step(game);
  assert.equal(health - target.health, 6, "native 22% chip rounds to six damage");
  near(shield - target.shieldHealth, 28 * 1.05);
  assert(target.punchBlockstun > 0);
  assert.equal(target.hitstun, 0);
  assert.deepEqual(plain(fighter.phantomDash.contacts), [target.id]);
  assert.equal(fighter.airDashes, 2);
});

test("completion does not hit a nearby nonoverlapping fighter or a still-ghost Phantom", () => {
  for (const ghostTarget of [false, true]) {
    const game = endpointGame(ghostTarget ? 5 : 100, ghostTarget ? "phantom" : "anchor");
    const [fighter, target] = game.debug.fighters;
    if (ghostTarget) {
      target.onGround = false;
      game.debug.gravity.dash(1, { x: 1, y: 0 }, 0);
      assert(game.debug.phantom.ghost(1), "the second fighter must actually start an air ghost");
    }
    const health = target.health;
    step(game);
    assert.equal(target.health, health);
    assert.deepEqual(plain(fighter.phantomDash.contacts), []);
  }
});

test("one completion cannot repeatedly hit even if the endpoint stays overlapped", () => {
  const game = endpointGame(), [fighter, target] = game.debug.fighters;
  step(game);
  const health = target.health, id = fighter.phantomDash.id;
  assert.equal(fighter.phantomDash.contacts.length, 1);
  for (let frame = 0; frame < 20; frame++) {
    pose(target, fighter.x + 5, fighter.y, { hitstop: 1, onGround: true });
    step(game);
    assert.equal(target.health, health);
    assert.equal(fighter.phantomDash.id, id);
    assert.deepEqual(plain(fighter.phantomDash.contacts), [target.id]);
  }
});

test("ghost is absent from sports bodies, attacks, shielding and Kickoff hooks", () => {
  for (const arena of ["standard", "boulder-control", "target-charge-stationary", "golden-rush"]) {
    const game = setup({ arena }), fighter = game.debug.fighters[0];
    dash(game);
    const world = game.debug.dashball.world(0);
    assert(!world.fighters.includes(fighter), arena);
    arm(game);
    assert(!world.attacks().some(entry => entry.fighter === fighter), arena);
    assert.equal(world.shielding(fighter), false, arena);
    assert.equal(world.kicking(fighter), false, arena);
    if (world.canKick) assert.equal(world.canKick(fighter), false, arena);
    fighter.phantomDash.phase = "solid";
    assert.equal(game.debug.dashball.world(0).kicking(fighter), false, arena);
  }
  const game = setup({ sandbag: true }), fighter = game.debug.fighters[0];
  dash(game);
  const world = game.debug.sandbag.world(0);
  assert(!world.fighters.includes(fighter));
  assert.equal(world.kicking(fighter), false);
});

test("sports balls cannot hit, push, acquire ownership or reward a ghost", () => {
  for (const arena of ["standard", "boulder-control", "target-charge-stationary"]) {
    const game = setup({ arena }), [fighter, target] = game.debug.fighters;
    const state = game.debug.dashball.state, ball = state.ball;
    dash(game);
    Object.assign(ball, { x: fighter.x, y: fighter.y, vx: 700, vy: 0,
      launched: 2, ownerId: target.id, ownerTeam: target.team });
    const position = [fighter.x, fighter.y, fighter.vx, fighter.vy], health = fighter.health;
    game.debug.dashball.ballStep(0);
    assert.deepEqual([fighter.x, fighter.y, fighter.vx, fighter.vy], position, arena);
    assert.equal(fighter.health, health, arena);
    assert.equal(fighter.hitstun, 0, arena);
    assert.equal(ball.ownerId, target.id, arena);
    assert.equal(ball.contacts[fighter.id], undefined, arena);
    assert.equal(fighter.airDashes, 1, arena);
  }
});

test("sandbag body motion and direct ghost attacks cannot damage, move or score the bag", () => {
  const game = setup({ sandbag: true }), fighter = game.debug.fighters[0];
  const state = game.debug.sandbag.state, bag = state.bags[0];
  pose(fighter, bag.x, bag.y);
  dash(game);
  const attack = arm(game), before = plain({ damage: bag.damage, vx: bag.vx,
    vy: bag.vy, scores: state.scores });
  assert.equal(game.debug.sandbag.hit(0, attack), false);
  game.debug.sandbag.bagStep(0);
  assert.deepEqual(plain({ damage: bag.damage, vx: bag.vx, vy: bag.vy, scores: state.scores }), before);
});

test("ball materialization adds exactly 120 impulse once without replacing existing momentum", () => {
  const game = setup({ arena: "standard" }), fighter = game.debug.fighters[0];
  const state = game.debug.dashball.state, ball = state.ball;
  dash(game);
  fighter.phantomDash.remaining = DT;
  Object.assign(ball, { x: fighter.x + 520 * DT + 5, y: fighter.y,
    vx: 70, vy: 0, carrier: null });
  const api = game.sandbox.Dashball, original = api.shot, impulses = [];
  // Observe the unmodified native shot before subsequent ball integration.
  api.shot = (...args) => {
    const attack = args[2], object = args[5] || args[0].ball;
    const before = { x: object.vx, y: object.vy };
    const result = original(...args);
    if (result && attack.materialization) impulses.push({
      x: object.vx - before.x, y: object.vy - before.y, dir: { ...attack.dir },
    });
    return result;
  };
  try {
    step(game);
    assert.equal(ball.ownerId, fighter.id);
    assert.deepEqual(plain(fighter.phantomDash.contacts), ["ball:primary"]);
    assert.equal(impulses.length, 1);
    near(Math.hypot(impulses[0].x, impulses[0].y), 120);
    near(impulses[0].x, impulses[0].dir.x * 120);
    near(impulses[0].y, impulses[0].dir.y * 120);
    assert.equal(fighter.airDashes, 2);
    step(game);
    assert.equal(impulses.length, 1, "completed contact must not add a second impulse");
  } finally {
    api.shot = original;
  }
});

test("solid sports hits and gravity-switch confirmations preserve the landing-only budget", () => {
  for (const arena of ["standard", "boulder-control", "golden-rush"]) {
    const game = setup({ arena }), fighter = game.debug.fighters[0];
    fighter.airDashes = 0;
    const attack = arm(game);
    if (arena === "golden-rush") {
      assert(game.sandbox.Dashball.goldenRush.hit(game.debug.dashball.state,
        fighter, attack, game.debug.dashball.world(0)));
    } else assert(game.debug.dashball.shot(0, attack));
    assert.equal(fighter.airDashes, 0, arena);
  }
  const game = setup({ arena: "gravity-soccer" }), fighter = game.debug.fighters[0];
  const control = game.debug.dashball.arena.gravitySwitch;
  pose(fighter, control.x - 20, control.y, { airDashes: 0 });
  arm(game);
  const sign = game.debug.gravity.direction;
  game.debug.gravity.hitSwitch();
  assert.notEqual(game.debug.gravity.direction, sign, "fixture must hit the switch");
  assert.equal(fighter.airDashes, 0);
});

test("ghost, pending completion and completed contacts survive save/restore and online snapshots", () => {
  for (const phase of ["ghost", "pending", "completed"]) {
    const game = endpointGame(), fighter = game.debug.fighters[0];
    if (phase === "ghost") fighter.phantomDash.remaining = .5;
    if (phase === "pending") game.debug.gravity.physics(0);
    if (phase === "completed") step(game);
    const saved = game.rb.save(), hash = game.rb.hash(), expected = plain(fighter.phantomDash);
    fighter.phantomDash.remaining = 999;
    fighter.phantomDash.contacts.push("corrupt");
    game.rb.restore(saved);
    assert.equal(game.rb.hash(), hash, phase);
    assert.deepEqual(plain(game.debug.fighters[0].phantomDash), expected, phase);
    const peer = setup();
    peer.debug.online.installSnapshot(game.debug.online.createSnapshot());
    const remote = peer.debug.fighters[0];
    assert.deepEqual(plain(remote.phantomDash), expected, `${phase} online Phantom state`);
    for (const field of ["x", "y", "vx", "vy", "health", "airDashes", "phantomPunchLock"])
      assert.equal(remote[field], game.debug.fighters[0][field], `${phase} online ${field}`);
    assert.equal(peer.debug.fighters[1].health, game.debug.fighters[1].health);
    // Legacy presentation snapshots omit frame/RNG/input history; rollback uses full saves.
    peer.rb.restore(saved);
    assert.equal(peer.rb.hash(), hash, `${phase} full rollback snapshot`);
    for (let frame = 0; frame < 20; frame++) {
      step(game); step(peer);
      assert.equal(peer.rb.hash(), game.rb.hash(), `${phase} replay ${frame}`);
    }
  }
});

test("delayed rollback crosses ghost completion without duplicate strikes or contacts", () => {
  for (const arena of [undefined, "standard", "boulder-control"]) {
    const games = [setup({ arena }), setup({ arena })];
    for (const game of games) {
      const [fighter, target] = game.debug.fighters;
      pose(target, fighter.x + 520 * 1.25 + 5, fighter.y,
        { onGround: true, hitstop: 10 });
      dash(game);
    }
    const [reference, delayed] = games, manager = delayed.rb.manager(0, 8);
    const saved = reference.rb.save(), pending = [], rows = [];
    for (let frame = 0; frame < 100; frame++) {
      const row = [R.neutral(), R.encode({ hasAim: true, aimX: -1,
        punchHeld: frame % 11 < 4, dashHeld: frame % 17 < 3 })];
      rows.push(row);
      pending.push({ frame, input: row[1] });
      if (pending.length > 6) {
        const packet = pending.shift(); manager.receive(packet.frame, packet.input);
      }
      assert(manager.advance(row[0]));
      step(reference, row.map(R.decode));
    }
    for (const packet of pending) manager.receive(packet.frame, packet.input);
    manager.reconcile();
    assert(manager.rollbacks > 0, "test must actually roll back");
    assert(manager.maxDepth >= 6);
    assert.equal(delayed.rb.hash(), reference.rb.hash(), arena || "versus");
    assert(reference.debug.fighters[0].phantomDash.contacts.length > 0,
      "rollback scenario must actually complete an endpoint contact");
    const end = reference.rb.hash();
    reference.rb.restore(saved);
    for (const row of rows) step(reference, row.map(R.decode));
    assert.equal(reference.rb.hash(), end, "saved replay must be exact");
  }
});

test("30/60/120Hz presentation produces the same non-vacuous fixed-step Phantom completion", () => {
  const hashes = [];
  for (const hz of [30, 60, 120]) {
    const game = setup();
    game.debug.matchFlow.begin({ countdown: false });
    const ticks = game.debug.matchFlow.state.remainingTicks;
    dash(game);
    for (let frame = 1; frame <= hz * 2; frame++) game.render(1000 + frame * 1000 / hz + .001);
    assert.equal(ticks - game.debug.matchFlow.state.remainingTicks, 120,
      `${hz}Hz must simulate 120 fixed match ticks`);
    near(game.rb.save().core.stageTime, 2, `${hz}Hz simulated seconds`);
    assert.equal(game.debug.fighters[0].phantomDash.phase, "solid");
    assert.equal(game.debug.fighters[0].phantomDash.pending, false);
    const hash = game.rb.hash();
    game.debug.stagePresentation.draw();
    assert.equal(game.rb.hash(), hash, "rendering must not mutate simulation");
    hashes.push(hash);
  }
  assert.equal(hashes[0], hashes[1]);
  assert.equal(hashes[1], hashes[2]);
});

test("KO cancels ghost and pending strikes; round reset removes every Phantom runtime field", () => {
  for (const phase of ["ghost", "pending", "completed"]) {
    const game = endpointGame(), [fighter, target] = game.debug.fighters;
    if (phase === "pending") game.debug.gravity.physics(0);
    if (phase === "completed") step(game);
    if (phase === "pending") assert.equal(fighter.phantomDash.pending, true);
    if (phase === "completed") assert.equal(fighter.phantomDash.contacts.length, 1);
    const health = target.health;
    game.debug.matchFlow.knockout(0);
    assert(fighter.koScored, phase);
    assert.equal(game.debug.phantom.ghost(0), false, phase);
    assert.equal(fighter.phantomDash.phase, "solid", phase);
    assert.equal(fighter.phantomDash.pending, false, phase);
    for (let frame = 0; frame < 10; frame++) step(game);
    assert.equal(target.health, health, `${phase}: KO must not deliver a delayed strike`);

    fighter.reset(true);
    assert.equal(fighter.phantomDash, undefined, `${phase}: reused Fighter.reset`);
    assert.equal(fighter.phantomPunchLock, false, phase);
    assert.equal(fighter.airDashes, 2, phase);
    assert.equal(fighter.koScored, false, phase);
    assert.equal(fighter.attack, null, phase);

    // Also exercise the full round setup, not just the reused fighter's reset method.
    pose(fighter, 200, -5000);
    dash(game);
    fighter.phantomDash.pending = true;
    fighter.phantomDash.contacts.push(target.id);
    game.rb.setup({ stageIndex: game.rb.stageNames.indexOf("High Perch"),
      characterKeys: ["phantom", "anchor"], seed: 91 });
    const fresh = game.debug.fighters[0];
    assert.equal(fresh.phantomDash, undefined, `${phase}: complete round reset`);
    assert.equal(fresh.phantomPunchLock, false, phase);
    assert.equal(fresh.airDashes, 2, phase);
    assert.equal(fresh.health, fresh.data.maxHealth, phase);
    assert.equal(game.debug.phantom.ghost(0), false, phase);
  }
});

test("sports KO and native respawn clear ghost, pending completion, contacts and punch lock", () => {
  for (const mode of ["dashball", "sandbag"]) for (const phase of ["ghost", "pending", "completed"]) {
    const game = mode === "sandbag" ? setup({ sandbag: true }) : setup({ arena: "standard" });
    const [fighter, target] = game.debug.fighters, api = game.debug[mode];
    dash(game);
    if (phase !== "ghost") {
      fighter.phantomDash.remaining = DT;
      game.debug.gravity.physics(0);
      assert.equal(fighter.phantomDash.pending, true);
      if (phase === "completed") step(game);
    }
    const targetHealth = target.health;
    api.knockout(0);
    assert(fighter.koScored, `${mode}/${phase}`);
    assert.equal(game.debug.phantom.ghost(0), false, `${mode}/${phase}`);
    assert.equal(fighter.phantomDash.pending, false, `${mode}/${phase}`);
    assert.equal(api.state.respawns[fighter.id], api.state.config.respawn);
    step(game);
    assert.equal(target.health, targetHealth, `${mode}/${phase}: no post-KO strike`);

    // Shorten the scheduled wait, while retaining the actual production respawn path.
    api.state.respawns[fighter.id] = DT / 2;
    step(game);
    assert.equal(fighter.koScored, false, `${mode}/${phase}`);
    assert.equal(api.state.respawns[fighter.id], undefined);
    assert.equal(fighter.phantomDash, undefined, `${mode}/${phase}`);
    assert.equal(fighter.phantomPunchLock, false, `${mode}/${phase}`);
    assert.equal(fighter.airDashes, 2, `${mode}/${phase}`);
    assert.equal(fighter.health, Math.round(fighter.data.maxHealth * api.state.config.healthMult));
    assert(fighter.invulnerable > 0, "native spawn protection must remain");
    assert.equal(fighter.dashballSpawnProtected, true);
    assert.equal(fighter.attack, null);
  }
});

const cpuModes = [
  { name: "Versus", kind: "versus" },
  ...createGame(ROOT).sandbox.Dashball.ARENAS.map(arena =>
    ({ name: arena.id, kind: "dashball", arena: arena.id })),
  ...["race", "brawl", "scramble"].map(ruleset =>
    ({ name: `sandbag-${ruleset}`, kind: "sandbag", ruleset })),
];

function cpuGame(mode) {
  const game = createGame(ROOT);
  const options = { characters: ["phantom"], ai: true, seed: 773 };
  if (mode.kind === "versus") game.debug.arena.setup("Castle Dungeon", options);
  else if (mode.kind === "dashball")
    game.debug.dashball.setup({ arena: mode.arena, teamSize: 5 }, options);
  else game.debug.sandbag.setup({ ruleset: mode.ruleset, teamSize: 5 }, options);
  const stage = mode.kind === "versus" ? game.debug.arena.definition : game.debug[mode.kind].arena;
  if(stage.volleyball){
    // Keep a legal high rally alive long enough to observe the whole 1.25s ghost.
    Object.assign(game.debug.dashball.state.ball,{y:300,prevY:300,vy:-900});
  }
  // Airborne starts put objectives in native AI dash range; no dash/input is injected.
  for (const [index, fighter] of game.debug.fighters.entries()) {
    let x, y;
    if (mode.kind === "versus") {
      x = stage.width / 2 + (fighter.team === 0 ? -320 : 320) + Math.floor(index / 2) * 8;
      y = (stage.floorY ?? stage.height - 160) - 400;
    } else {
      const state = game.debug[mode.kind].state;
      const objective = mode.kind === "sandbag"
        ? state.bags.find(bag => bag.team === null || bag.team === fighter.team)
        : game.sandbox.Dashball.balls(state).find(ball =>
          !state.targetCharge || ball.scoringTeam === fighter.team);
      x = objective.x + (fighter.team === 0 ? -610 : 610) + Math.floor(index / 2) * 8;
      y = Math.max(180, objective.y - 220);
    }
    pose(fighter, Math.max(100, Math.min(stage.width - 100, x)), y);
  }
  return game;
}

for (const mode of cpuModes) test(`10 native-input Phantom CPUs stay deterministic: ${mode.name}`, () => {
  const games = [cpuGame(mode), cpuGame(mode)], ghosts = new Set(), completions = new Set();
  for (const game of games) {
    assert.equal(game.debug.fighters.length, 10);
    assert(game.debug.fighters.every(fighter => fighter.data.phantomDash));
  }
  assert.equal(games[0].rb.hash(), games[1].rb.hash(), `${mode.name} initial state`);
  for (let frame = 0; frame < 180; frame++) {
    for (const game of games) {
      if (mode.kind === "versus") game.debug.arena.stepAI();
      else game.debug[mode.kind].step();
      for (const fighter of game.debug.fighters) {
        assert([fighter.x, fighter.y, fighter.vx, fighter.vy, fighter.health].every(Number.isFinite),
          `${mode.name}/${frame}/${fighter.id} nonfinite simulation`);
        assert(fighter.airDashes >= 0 && fighter.airDashes <= 2,
          `${mode.name}/${frame}/${fighter.id} invalid air budget`);
        const state = fighter.phantomDash;
        if (!state) continue;
        assert(state.remaining >= 0 && state.remaining <= state.duration);
        assert.equal(new Set(state.contacts).size, state.contacts.length,
          `${mode.name}/${frame}/${fighter.id} duplicate completion contact`);
      }
    }
    assert.equal(games[0].rb.hash(), games[1].rb.hash(), `${mode.name} frame ${frame}`);
    for (const fighter of games[0].debug.fighters) {
      const state = fighter.phantomDash;
      if (!state) continue;
      const id = `${fighter.id}:${state.id}`;
      if (games[0].debug.phantom.ghost(fighter.playerIndex)) ghosts.add(id);
      if (ghosts.has(id) && state.phase === "solid" && !state.pending && !fighter.koScored)
        completions.add(id);
    }
  }
  assert(ghosts.size > 0, `${mode.name}: native CPU input must actually begin a ghost`);
  assert(completions.size > 0, `${mode.name}: native CPU input must actually complete a ghost`);
  const hash = games[0].rb.hash();
  games[0].debug.stagePresentation.draw();
  assert.equal(games[0].rb.hash(), hash, `${mode.name} rendering changed simulation`);
});
