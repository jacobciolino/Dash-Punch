"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { createGame } = require("./simulation-harness");

const ROOT = process.env.CORE_RELEASE_DIR
  ? path.resolve(process.env.CORE_RELEASE_DIR) : path.resolve(__dirname, "..");
const D = require(path.join(ROOT, "dashball.js"));
const R = require(path.join(ROOT, "rollback.js"));
const DT = 1 / 60;
const CORE = ["anchor", "orbit", "spike", "rain", "edgebert", "reverso", "whipado",
  "microusb", "gunman", "archer", "kite", "chungus", "defiplate", "boomerangus", "phantom"];
const PROJECTILES = new Set(["gunman", "archer", "boomerangus"]);
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected, message = "", epsilon = 1e-7) =>
  assert(Math.abs(actual - expected) < epsilon, `${message}: ${actual} != ${expected}`);
const neutral = () => R.decode(R.neutral());

function fixture(config = {}, leftTeam = 0) {
  const settings = { arena: "volleyball", ...config };
  const stage = D.arena("volleyball", 154, settings);
  stage.leftTeam = leftTeam;
  const state = D.create(settings, stage);
  const world = { stage, fighters: [], attacks: () => [], attackTouches: () => false,
    terrain: () => stage.terrain.concat(stage.ballOnly),
    body: f => ({ x: f.x - f.data.width / 2, y: f.y - f.data.height / 2,
      w: f.data.width, h: f.data.height }),
    shielding: f => Boolean(f.shielding), shieldAim: f => f.aim || { x: 1, y: 0 },
    shieldCovers: () => true, shieldPadding: () => 24, kicking: () => false };
  return { stage, state, world,
    tick(count = 1) { for (let i = 0; i < count; i++) D.step(state, DT, world); } };
}

function setup(config = {}, options = {}) {
  const game = createGame(ROOT);
  game.debug.dashball.setup({ arena: "volleyball", ...config },
    { characters: ["anchor", "orbit"], seed: 731, ...options });
  assert.equal(game.debug.dashball.arena.dashballArena, "volleyball");
  return game;
}

function pose(fighter, x, y, extra = {}) {
  Object.assign(fighter, { x, y, prevX: x, prevY: y, vx: 0, vy: 0,
    onGround: false, wallSliding: false, wallClinging: false, touchingWall: false,
    hitstop: 0, hitstun: 0, invulnerable: 0, hasLiveAim: false,
    dashReboundLockout: 0, punchInputHeld: false, ...extra });
}

function arm(game, index = 0, extra = {}) {
  const SetType = vm.runInContext("Set", game.sandbox);
  const attack = { id: 10000 + index, age: .1, startup: 0, active: 1,
    recovery: .1, total: 1.2, charge: 0, dir: { x: index ? -1 : 1, y: 0 },
    hitTargets: new SetType(), clashed: false, selfCancelled: false,
    grounded: false, ...extra };
  game.debug.fighters[index].attack = attack;
  return attack;
}

function press(game, index, held, dir = { x: 1, y: 0 }) {
  const fighter = game.debug.fighters[index];
  Object.assign(fighter.controls, { hasAim: true, aim: dir });
  fighter.controls.actions.punchHeld = held;
  fighter.controls.buffers[held ? "punchPressed" : "punchReleased"] = .09;
  game.debug.updateHumanInput(index);
}

function nativeAttack(game, index = 0, dir = { x: 1, y: 0 }) {
  press(game, index, true, dir);
  press(game, index, false, dir);
  const attack = game.debug.fighters[index].attack;
  assert(attack, "native Punch press/release must create an attack");
  game.debug.updateAttack(index, attack.startup + 1e-9);
  return attack;
}

function assertSide(fighter, stage, label = fighter.id) {
  const half = fighter.data.width / 2;
  assert(fighter.x - half >= 24 - 1e-7, `${label}: outside left wall`);
  assert(fighter.x + half <= stage.width - 24 + 1e-7, `${label}: outside right wall`);
  if (fighter.team === stage.leftTeam)
    assert(fighter.x + half <= stage.net.x - 3 + 1e-7, `${label}: left body crossed net`);
  else assert(fighter.x - half >= stage.net.x + stage.net.w + 3 - 1e-7,
    `${label}: right body crossed net`);
}

function drop(state, stage, side = "left", speed = 2300) {
  Object.assign(state.ball, { x: stage.width * (side === "left" ? .2 : .8),
    y: stage.floorY - state.ball.r - 1, vx: 0, vy: speed,
    carrier: null, ownerId: null, ownerTeam: -1 });
}

function rowsFor(game, frame) {
  return game.debug.fighters.map((fighter, index) => ({ hasAim: true,
    aimX: fighter.team === 0 ? 1 : -1, aimY: frame % 23 < 9 ? -.65 : .2,
    dashHeld: (frame + index * 7) % 43 < 6,
    punchHeld: (frame + index * 3) % 29 < 8 }));
}

test("Volleyball has isolated defaults, stable registration and configurable round trips", () => {
  assert.equal(D.ARENAS.filter(a => a.id === "volleyball").length, 1);
  assert.equal(D.ARENAS.find(a => a.id === "volleyball").name, "Volleyball");
  for (const ruleset of ["court", "battle"]) {
    const config = D.options({ arena: "volleyball", ruleset });
    assert.equal(config.ruleset, ruleset);
    for (const [key, value] of Object.entries({ duration: 300, winningScore: 11,
      gravity: 1850, ballRadius: 26, maxSpeed: 2300, bounce: .76 })) {
      assert.equal(D.VOLLEYBALL_DEFAULTS[key], value, key);
      assert.equal(config[key], value, key);
    }
    const custom = D.options({ ...config, gravity: 1700, ballRadius: 29,
      maxSpeed: 2100, bounce: .7, winningScore: 7, duration: 90, teamSize: 4 });
    assert.deepEqual(D.options(plain(custom)), custom);
    assert.deepEqual(D.savedOptions(plain(custom)), custom);
  }
  assert.equal(D.options({ arena: "standard" }).gravity, 1050);
  assert.equal(D.options({ arena: "standard" }).ballRadius, 24);
  assert.equal(D.options({ arena: "golden-rush" }).gravity, 900);
  assert.equal(D.options({ arena: "volleyball", teamSize: 20 }).teamSize, 5);
});

test("court is 2880x1440 with a full floor, solid sides, physical 20x420 net and no ceiling", () => {
  const { stage } = fixture();
  assert.equal(stage.width, 2880);
  assert.equal(stage.height, 1440);
  assert.equal(stage.floorY, 1280);
  assert.equal(stage.leftTeam, 0, "authoritative red team owns the left side");
  assert.equal(stage.volleyball, true);
  assert.equal(stage.wrap, false);
  assert.equal(stage.verticalWrap, false);
  assert.equal(stage.cameraOpenTop, true);
  assert.equal(stage.hole, null);
  assert.deepEqual(stage.goals, []);
  const floor = stage.terrain.filter(r => r.kind === "floor");
  assert.equal(floor.length, 1);
  assert.equal(floor[0].x, 0);
  assert.equal(floor[0].w, stage.width);
  assert.equal(floor[0].y, stage.floorY);
  const net = stage.terrain.filter(r => r.volleyballNet);
  assert.equal(net.length, 1);
  assert.deepEqual({ x: net[0].x, y: net[0].y, w: net[0].w, h: net[0].h },
    { x: 1430, y: 860, w: 20, h: 420 });
  assert.equal(net[0].kind, "wall");
  assert.equal(stage.terrain.filter(r => r.y === 0 && r.h === stage.height).length, 2);
  assert(!stage.terrain.some(r => r.y < stage.floorY && r.w > stage.width / 2),
    "no ceiling or invisible overhead platform");
});

test("serve is a fresh deterministic ball on the serving team's actual side", () => {
  for (const leftTeam of [0, 1]) {
    const { state, stage } = fixture({}, leftTeam);
    assert.deepEqual(state.volleyball, { serveTeam: leftTeam, rallies: 0 });
    const initial = plain(state.ball), before = plain(state);
    const first = D.volleyball.serve(state, stage), second = D.volleyball.serve(state, stage);
    assert.notEqual(first, second);
    assert.notEqual(first, state.ball);
    assert.deepEqual(first, second);
    assert.deepEqual(plain(first), initial);
    assert.deepEqual(plain(state), before, "serve planning must not change live state");
    assert(first.x < stage.net.x && first.y + first.r < stage.floorY);
    assert.equal(first.x, first.prevX);
    assert.equal(first.y, first.prevY);
    assert.equal(first.ownerId, null);
    assert.equal(first.carrier, null);
    assert.equal(first.r, 26);
    state.volleyball.serveTeam = 1 - leftTeam;
    const opposite = D.volleyball.serve(state, stage);
    near(first.x + opposite.x, stage.width, "mirrored service positions");
    near(first.y, opposite.y);
    near(first.vy, opposite.vy);
    assert(opposite.x > stage.net.x + stage.net.w);
  }
});

test("floor contacts score the opposing team on both sides, even at extreme speed, exactly once", () => {
  for (const ruleset of ["court", "battle"]) for (const leftTeam of [0, 1])
    for (const side of ["left", "right"]) for (const speed of [0, 2300, 1000000]) {
      const f = fixture({ ruleset }, leftTeam), events = [];
      const defending = side === "left" ? leftTeam : 1 - leftTeam;
      f.world.onGoal = team => events.push(team);
      drop(f.state, f.stage, side, speed);
      f.tick(3);
      assert.equal(f.state.phase, "goal");
      assert.equal(f.state.scores[1 - defending], 1);
      assert.equal(f.state.scores[defending], 0);
      assert.equal(f.state.goalSerial, 1);
      assert.equal(f.state.volleyball.rallies, 1);
      assert.equal(f.state.volleyball.serveTeam, 1 - leftTeam);
      assert.deepEqual(events, [1 - defending]);
      f.tick(120);
      assert.equal(f.state.goalSerial, 1, "parked floor ball cannot score twice");
      assert.equal(f.state.volleyball.rallies, 1);
      assert.equal(D.goal(f.state, defending, f.world), false);
    }
});

test("points reuse celebration/reset/countdown and alternate service independently of scorer", () => {
  const f = fixture(), original = f.state.ball;
  drop(f.state, f.stage, "left"); f.tick();
  const remaining = f.state.remaining;
  assert.equal(D.clock(f.state, 1, f.stage).play, false);
  assert.equal(f.state.ball, original);
  assert.equal(f.state.remaining, remaining, "celebration does not drain the round timer");
  const reset = D.clock(f.state, .21, f.stage);
  assert.equal(reset.reset, true);
  assert.equal(f.state.phase, "countdown");
  assert.notEqual(f.state.ball, original);
  assert(f.state.ball.x > f.stage.width / 2);
  const serve = plain(f.state.ball);
  f.tick(120);
  assert.deepEqual(plain(f.state.ball), serve, "countdown freezes the next serve");
  assert.equal(D.clock(f.state, 1, f.stage).play, false);
  assert.equal(D.clock(f.state, 1.01, f.stage).go, true);
  drop(f.state, f.stage, "left"); f.tick();
  assert.deepEqual(f.state.scores, [0, 2]);
  assert.deepEqual(f.state.volleyball, { serveTeam: 0, rallies: 2 });
  assert.equal(D.clock(f.state, 1.21, f.stage).reset, true);
  assert(f.state.ball.x < f.stage.width / 2, "same scorer still alternates service");
});

test("winning score, five-minute clock, tied overtime and no-overtime draws use shared flow", () => {
  const won = fixture({ winningScore: 1 });
  drop(won.state, won.stage, "right"); won.tick();
  assert.equal(won.state.phase, "finished");
  assert.equal(won.state.winner, 0);
  assert.equal(won.state.goalSerial, 1);
  const timed = fixture();
  near(timed.state.remaining, 300);
  D.clock(timed.state, 1, timed.stage); near(timed.state.remaining, 299);
  timed.state.remaining = .001; timed.state.scores = [2, 1];
  D.clock(timed.state, DT, timed.stage);
  assert.equal(timed.state.winner, 0);
  const tied = fixture(); tied.state.remaining = .001;
  D.clock(tied.state, DT, tied.stage);
  assert.equal(tied.state.overtime, true);
  drop(tied.state, tied.stage, "left"); tied.tick();
  assert.equal(tied.state.winner, 1);
  const draw = fixture({ overtime: false }); draw.state.remaining = 0;
  D.clock(draw.state, DT, draw.stage);
  assert.equal(draw.state.phase, "finished");
  assert.equal(draw.state.winner, null);
});

test("solid walls reflect at normal and above-arena heights without horizontal wrap", () => {
  for (const side of [-1, 1]) for (const y of [600, -400]) {
    const f = fixture(), b = f.state.ball;
    Object.assign(b, { x: side < 0 ? 24 + b.r + 2 : f.stage.width - 24 - b.r - 2,
      y, vx: side * 1800, vy: 0 });
    f.tick();
    assert(b.vx * side < 0, "wall must reverse horizontal velocity");
    near(Math.abs(b.vx), 1800 * .76, "wall restitution below the vector speed cap");
    assert(b.x >= 24 + b.r && b.x <= f.stage.width - 24 - b.r);
    assert.equal(f.state.goalSerial, 0);
    assert(Math.hypot(b.vx, b.vy) <= f.state.config.maxSpeed + 1e-7);
  }
});

test("physical net rejects low shots from either side and supports a top rebound without scoring", () => {
  for (const sign of [-1, 1]) for (const speed of [2300, 1000000]) {
    const f = fixture(), b = f.state.ball, n = f.stage.net;
    Object.assign(b, { x: sign > 0 ? n.x - b.r - 3 : n.x + n.w + b.r + 3,
      y: n.y + 80, vx: sign * speed, vy: 0 });
    f.tick(3);
    assert(b.vx * sign < 0, "net side must reflect the capped high-speed shot");
    assert(sign > 0 ? b.x + b.r <= n.x : b.x - b.r >= n.x + n.w,
      "ball must not tunnel through the net");
    assert.equal(f.state.goalSerial, 0);
  }
  const f = fixture(), b = f.state.ball;
  Object.assign(b, { x: f.stage.width / 2, y: f.stage.net.y - b.r - 2, vx: 0, vy: 2300 });
  f.tick();
  assert(b.vy < 0);
  assert(b.y + b.r <= f.stage.net.y);
  assert.equal(f.state.goalSerial, 0, "net top is not a scoring floor");
});

test("high shots pass over the net, travel above zero, and return under Volleyball gravity", () => {
  const clear = fixture(), b = clear.state.ball;
  Object.assign(b, { x: clear.stage.net.x - b.r - 8,
    y: clear.stage.net.y - b.r - 80, vx: 1800, vy: -200 });
  clear.tick(6);
  assert(b.x - b.r > clear.stage.net.x + clear.stage.net.w);
  assert(b.vx > 0);
  const high = fixture(), ball = high.state.ball;
  Object.assign(ball, { x: 700, y: -300, vx: 0, vy: -2000 });
  high.tick();
  assert(ball.y < -300, "no invisible ceiling bounce or clamp");
  near(ball.vy, -2000 + 1850 * DT, "high gravity per fixed step");
  high.tick(70);
  assert(ball.vy > 0, "gravity must turn the very high shot around");
  high.tick(170);
  assert.equal(high.state.goalSerial, 1, "high ball must eventually return to the court");
  assert.deepEqual(high.state.scores, [0, 1]);
});

test("both rulesets constrain full fighter bodies to their assigned half even above the net", () => {
  for (const ruleset of ["court", "battle"]) for (const leftTeam of [0, 1])
    for (const team of [0, 1]) for (const y of [600, -500]) {
      const f = fixture({ ruleset }, leftTeam), left = team === leftTeam;
      const fighter = { id: "probe", team, data: { width: 100, height: 120 },
        x: left ? 2400 : 400, y, vx: left ? 5000 : -5000, vy: -100 };
      D.constrain(f.state, fighter, f.stage);
      assertSide(fighter, f.stage);
      assert.equal(fighter.vx, 0);
      assert.equal(fighter.y, y, "open top applies to fighters too");
    }
});

test("Court blocks actual PvP hits; Battle preserves normal across-net combat", () => {
  for (const ruleset of ["court", "battle"]) {
    const g = setup({ ruleset }, { characters: ["whipado", "anchor"] });
    const [attacker, target] = g.debug.fighters, stage = g.debug.dashball.arena;
    pose(attacker, stage.net.x - attacker.data.width / 2 - 3, 700);
    pose(target, stage.net.x + stage.net.w + target.data.width / 2 + 3, 700);
    arm(g);
    const health = target.health;
    assert.equal(g.debug.sandbag.canAffect(0, 1), ruleset === "battle");
    g.debug.resolveHit(0, 1);
    assert.equal(target.health < health, ruleset === "battle");
    assert.deepEqual(plain(g.debug.dashball.state.scores), [0, 0]);
    assertSide(attacker, stage); assertSide(target, stage);
  }
});

test("Battle KOs award no points and individual protected respawns return to the correct half", () => {
  const g = setup({ ruleset: "battle", respawn: 10, teamSize: 5 }), d = g.debug;
  const state = d.dashball.state, stage = d.dashball.arena, ball = state.ball;
  Object.assign(ball, { x: 1000, y: -1000, vx: 0, vy: -1000 });
  state.scores = [3, 2];
  for (const index of [0, 1, 8, 9]) d.dashball.knockout(index);
  assert.deepEqual(plain(state.scores), [3, 2]);
  assert.equal(state.goalSerial, 0);
  assert.equal(state.ball, ball);
  for (const index of [0, 1, 8, 9]) {
    const fighter = d.fighters[index];
    assert(fighter.koScored);
    near(state.respawns[fighter.id], 10, "shared configurable Battle respawn delay");
    // Exercise the final native respawn tick without waiting through a ten-second rally.
    state.respawns[fighter.id] = DT / 2;
  }
  d.dashball.step();
  for (const index of [0, 1, 8, 9]) {
    const fighter = d.fighters[index];
    assert(!fighter.koScored);
    assert(fighter.invulnerable > 1.9);
    assert(fighter.health > 0);
    assert.equal(state.respawns[fighter.id], undefined);
    assertSide(fighter, stage);
  }
  assert.equal(state.ball, ball);
  assert.deepEqual(plain(state.scores), [3, 2]);
});

for (const key of CORE) test(`native ${key} ball strike retains the shared hit hooks`, () => {
  const g = setup({ ruleset: "court" }, { characters: [key, "anchor"] });
  const d = g.debug, fighter = d.fighters[0], ball = d.dashball.state.ball;
  pose(fighter, 600, 600, { airDashes: 0, whiffLag: 0, punchLockout: 0 });
  const attack = nativeAttack(g);
  if (PROJECTILES.has(key)) {
    assert(attack.projectile, `${key} must create its native projectile`);
    Object.assign(ball, { x: 820, y: 600, vx: 0, vy: 0 });
    Object.assign(attack.projectile, { x: 790, y: 600, vx: 0, vy: 0 });
    d.updateProjectiles(0);
  } else {
    const entry = d.dashball.world(0).attacks().find(entry => entry.fighter === fighter);
    assert(entry, `${key} must expose its real active melee hitbox`);
    Object.assign(ball, { x: entry.box.cx, y: entry.box.cy, vx: 0, vy: 0 });
    d.dashball.ballStep(0);
  }
  assert.equal(ball.ownerId, fighter.id);
  assert.equal(ball.ownerTeam, fighter.team);
  assert(ball.launched > 0);
  assert([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite));
  assert(Math.hypot(ball.vx, ball.vy) > 0);
  assert(Math.hypot(ball.vx, ball.vy) <= 2300 + 1e-7);
  assert.equal(fighter.airDashes, key === "phantom" ? 0 : fighter.data.maxAirDashes,
    "ordinary successful-hit refill and Phantom's landing-only exception remain intact");
  assert.equal(fighter.whiffLag, 0);
  assert.equal(d.dashball.state.goalSerial, 0);
});

test("ordinary horizontal punches receive upward arcs but deliberate downward spikes remain downward", () => {
  for (const dir of [{ x: 1, y: 0 }, { x: 0, y: 1 }]) {
    const g = setup(), fighter = g.debug.fighters[0], ball = g.debug.dashball.state.ball;
    fighter.aim = { ...dir };
    const attack = arm(g, 0, { dir });
    assert(g.debug.dashball.shot(0, attack));
    assert(dir.y > 0 ? ball.vy > 0 : ball.vy < -1000);
    assert.equal(ball.ownerId, fighter.id);
  }
});

test("Spike captures with his real shield and releases through the existing possession path", () => {
  const g = setup({}, { characters: ["spike", "anchor"] }), d = g.debug;
  const fighter = d.fighters[0], ball = d.dashball.state.ball;
  pose(fighter, 600, 600, { chargingPunch: true, punchInputHeld: true, punchAim: { x: 1, y: 0 } });
  Object.assign(ball, { x: 660, y: 600, vx: -900, vy: 0 });
  assert(d.isShielding(0), "fixture must activate Spike's actual shield");
  d.dashball.ballStep(0);
  assert.equal(ball.carrier, fighter.id);
  assert.equal(d.dashball.state.goalSerial, 0);
  fighter.punchExhausted = true;
  d.dashball.ballStep(0);
  assert.equal(ball.carrier, null);
  assert(ball.noCapture[fighter.id] > d.dashball.state.time);
});

test("Phantom's real ghost cannot body-touch, capture, kick or directly attack the ball", () => {
  const g = setup({}, { characters: ["phantom", "anchor"] }), d = g.debug;
  const fighter = d.fighters[0], state = d.dashball.state, ball = state.ball;
  pose(fighter, 600, 600);
  d.gravity.dash(0, { x: 1, y: 0 }, 0);
  assert(d.phantom.ghost(0));
  assert.equal(fighter.airDashes, 1);
  Object.assign(ball, { x: fighter.x, y: fighter.y, prevX: fighter.x, prevY: fighter.y, vx: 0, vy: 0 });
  const before = plain(ball), attack = arm(g);
  assert.equal(d.dashball.shot(0, attack), false);
  d.dashball.ballStep(0);
  assert.deepEqual(plain(ball), before, "intangible overlap cannot change the ball at zero elapsed time");
  assert.equal(d.dashball.world(0).fighters.includes(fighter), false);
  assert.equal(state.goalSerial, 0);
});

test("Phantom materialization adds exactly 120 native impulse once without Volleyball lift or refill", () => {
  const g = setup({}, { characters: ["phantom", "anchor"] }), d = g.debug;
  const fighter = d.fighters[0], ball = d.dashball.state.ball;
  pose(fighter, 600, 600);
  d.gravity.dash(0, { x: 1, y: 0 }, 0);
  fighter.phantomDash.remaining = DT;
  Object.assign(ball, { x: fighter.x + 520 * DT + 5, y: fighter.y, vx: 70, vy: 0 });
  const api = g.sandbox.Dashball, original = api.shot, impulses = [];
  api.shot = (...args) => {
    const object = args[5] || args[0].ball, before = { x: object.vx, y: object.vy };
    const result = original(...args);
    if (result && args[2].materialization)
      impulses.push({ x: object.vx - before.x, y: object.vy - before.y });
    return result;
  };
  try {
    g.rb.step(d.fighters.map(neutral));
    assert.equal(impulses.length, 1);
    near(Math.hypot(impulses[0].x, impulses[0].y), 120);
    assert.deepEqual(plain(fighter.phantomDash.contacts), ["ball:primary"]);
    assert.equal(ball.ownerId, fighter.id);
    assert.equal(fighter.airDashes, 1);
    g.rb.step(d.fighters.map(neutral));
    assert.equal(impulses.length, 1);
  } finally { api.shot = original; }
});

test("a ghost stopped above the net materializes at the legal endpoint without a cross-divider ball hit", () => {
  for (const ruleset of ["court", "battle"]) for (const index of [0, 1]) {
    const g = setup({ ruleset }, { characters: ["phantom", "phantom"] }), d = g.debug;
    const fighter = d.fighters[index], stage = d.dashball.arena, ball = d.dashball.state.ball;
    const left = fighter.team === stage.leftTeam, sign = left ? 1 : -1;
    const edge = left ? stage.net.x - fighter.data.width / 2 - 3
      : stage.net.x + stage.net.w + fighter.data.width / 2 + 3;
    pose(fighter, edge - sign * 2, 500);
    d.gravity.dash(index, { x: sign, y: 0 }, 0);
    assert(d.phantom.ghost(index));
    Object.assign(ball, { x: left ? stage.net.x + ball.r + 2
      : stage.net.x + stage.net.w - ball.r - 2, y: 500, vx: 0, vy: 0 });
    g.rb.step(d.fighters.map(neutral));
    assertSide(fighter, stage);
    near(fighter.x, edge, "materialization uses the clamped endpoint");
    assert.equal(d.phantom.ghost(index), false);
    assert.equal(fighter.phantomDash.pending, false);
    assert.equal(fighter.phantomDash.terrainStopped, true);
    assert.deepEqual(plain(fighter.phantomDash.contacts), []);
    assert.equal(ball.ownerId, null, "illegal pre-clamp endpoint must never contact the ball");
    assert.equal(fighter.airDashes, 1);
  }
});

test("native floor landing refills Phantom while a net wall cling cannot bypass his two-charge budget", () => {
  const g = setup({}, { characters: ["phantom", "anchor"] }), d = g.debug;
  const fighter = d.fighters[0], stage = d.dashball.arena;
  pose(fighter, 600, stage.floorY - fighter.data.height / 2 + 1, { airDashes: 0, vy: 100 });
  d.resolveTerrain(0);
  assert(fighter.onGround);
  assert.equal(fighter.airDashes, 2);
  pose(fighter, stage.net.x - fighter.data.width / 2 + 1, stage.net.y + 100,
    { airDashes: 0, vx: 200, hasLiveAim: true, aim: { x: 1, y: 0 } });
  d.resolveTerrain(0);
  assert(fighter.wallClinging, "fixture must establish real net-side contact");
  assert.equal(fighter.airDashes, 0);
  d.gravity.dash(0, { x: -1, y: 0 }, 0);
  assert(!d.phantom.ghost(0));
});

test("Volleyball planning is pure, side-aware and distributes teammate defensive positions", () => {
  const g = setup({ teamSize: 5 }), d = g.debug, state = d.dashball.state;
  const stage = d.dashball.arena, world = d.dashball.world(0);
  Object.assign(state.ball, { x: 850, y: 500, vx: 600, vy: 200 });
  const saved = g.rb.hash(), plans = d.fighters.map(f => D.volleyball.plan(state, stage, f, world));
  assert.equal(g.rb.hash(), saved);
  for (const team of [0, 1]) {
    const members = d.fighters.map((f, i) => ({ f, plan: plans[i] })).filter(x => x.f.team === team);
    assert.equal(members.filter(x => x.plan.receiver).length, 1);
    assert(new Set(members.map(x => x.plan.target.x)).size > 1, "teammates must not all cluster");
    for (const { f, plan } of members) {
      assert([plan.landing, plan.time, plan.target.x, plan.target.y, plan.aim.x, plan.aim.y].every(Number.isFinite));
      assert(plan.landing >= 24 + state.ball.r && plan.landing <= stage.width - 24 - state.ball.r);
      assert.equal(plan.own, team === stage.leftTeam);
      assert(plan.aim.y < 0);
      assert.equal(plan.aim.x > 0, team === stage.leftTeam);
      assertSide({ ...f, x: plan.target.x }, stage);
    }
  }
});

test("both teams contest a ball balanced exactly on the net instead of waiting forever", () => {
  const g=setup({teamSize:3}),d=g.debug,stage=d.dashball.arena,state=d.dashball.state;
  Object.assign(state.ball,{x:stage.width/2,y:stage.net.y-state.ball.r,vx:0,vy:0});
  for(const f of d.fighters){const plan=D.volleyball.plan(state,stage,f,d.dashball.world(0));assert(plan.own);assertSide({...f,x:plan.target.x},stage);}
});

for (const ruleset of ["court", "battle"]) for (const teamSize of [1, 2, 3, 4, 5])
  test(`${ruleset} ${teamSize}v${teamSize}: native spawns, scoring, snapshot restore and exact replay`, () => {
    const games = [setup({ ruleset, teamSize }), setup({ ruleset, teamSize })], [a, b] = games;
    for (const g of games) {
      const stage = g.debug.dashball.arena;
      assert.equal(g.debug.fighters.length, teamSize * 2);
      for (const team of [0, 1]) assert.equal(g.debug.fighters.filter(f => f.team === team).length, teamSize);
      for (const fighter of g.debug.fighters) assertSide(fighter, stage);
      drop(g.debug.dashball.state, stage);
    }
    const saved = a.rb.save(), rows = [];
    for (let frame = 0; frame < 240; frame++) {
      const inputs = rowsFor(a, frame); rows.push(inputs);
      assert.equal(a.rb.step(inputs), b.rb.step(inputs), `independent peer frame ${frame}`);
      for (const fighter of a.debug.fighters) assertSide(fighter, a.debug.dashball.arena);
    }
    assert(a.debug.dashball.state.goalSerial >= 1, "replay must cross a real scored point");
    assert(a.debug.dashball.state.time > .1, "replay must resume after countdown");
    const hash = a.rb.hash(), state = plain(a.debug.dashball.state);
    a.rb.restore(saved);
    for (const inputs of rows) a.rb.step(inputs);
    assert.equal(a.rb.hash(), hash);
    a.debug.stagePresentation.draw();
    assert.equal(a.rb.hash(), hash, "drawing must not mutate simulation");
    b.debug.online.installSnapshot(a.debug.online.createSnapshot());
    assert.deepEqual(plain(b.debug.dashball.state), state);
    b.rb.restore(a.rb.save());
    assert.equal(b.rb.hash(), hash);
  });

for (const ruleset of ["court", "battle"]) test(`${ruleset}: delayed rollback crosses point, service reset and countdown`, () => {
  const games = [setup({ ruleset }), setup({ ruleset })], [reference, delayed] = games;
  for (const g of games) drop(g.debug.dashball.state, g.debug.dashball.arena);
  const manager = delayed.rb.manager(0, 8), pending = [], saved = reference.rb.save(), rows = [];
  for (let frame = 0; frame < 260; frame++) {
    const encoded = rowsFor(reference, frame).map(R.encode);
    rows.push(encoded.map(R.decode));
    pending.push({ frame, input: encoded[1] });
    if (pending.length > 6) { const packet = pending.shift(); manager.receive(packet.frame, packet.input); }
    assert(manager.advance(encoded[0]));
    reference.rb.step(rows[frame]);
  }
  for (const packet of pending) manager.receive(packet.frame, packet.input);
  manager.reconcile();
  assert(manager.rollbacks > 0, "scenario must actually reconcile late inputs");
  assert(manager.maxDepth >= 6);
  assert(reference.debug.dashball.state.goalSerial >= 1);
  assert(reference.debug.dashball.state.time > .5, "scenario must pass the reset/countdown");
  assert.equal(reference.debug.dashball.state.volleyball.rallies, reference.debug.dashball.state.goalSerial);
  assert.equal(delayed.rb.hash(), reference.rb.hash());
  const hash = reference.rb.hash();
  reference.rb.restore(saved);
  for (const inputs of rows) reference.rb.step(inputs);
  assert.equal(reference.rb.hash(), hash);
});

test("30/60/120Hz rendering advances 120 actual fixed steps with identical open-top ball trajectories", () => {
  const hashes = [];
  for (const hz of [30, 60, 120]) {
    const g = setup({ ruleset: "court" });
    g.debug.matchFlow.begin({ countdown: false });
    const state = g.debug.dashball.state, ball = state.ball;
    Object.assign(ball, { x: 650, y: 200, vx: 100, vy: -1500 });
    const start = g.rb.save().core, ticks = g.debug.matchFlow.state.remainingTicks;
    for (let frame = 1; frame <= hz * 2; frame++) g.render(1000 + frame * 1000 / hz + .001);
    const end = g.rb.save().core;
    assert.equal(ticks - g.debug.matchFlow.state.remainingTicks, 120, `${hz}Hz actual match ticks`);
    near(end.stageTime - start.stageTime, 2, `${hz}Hz simulated seconds`);
    near(state.time, 2, `${hz}Hz ball simulation seconds`);
    assert(ball.y > 200 && ball.vy > 0, "ball must complete its upward arc and descend");
    assert(ball.x > 800, "ball must actually move horizontally");
    assert.equal(state.goalSerial, 0);
    const hash = g.rb.hash();
    g.debug.stagePresentation.draw();
    assert.equal(g.rb.hash(), hash);
    hashes.push(hash);
  }
  assert.equal(hashes[0], hashes[1]); assert.equal(hashes[1], hashes[2]);
});

for (const ruleset of ["court", "battle"]) test(`${ruleset}: ten native-input CPUs make deterministic, side-safe ball contacts`, () => {
  const games = [setup({ ruleset, teamSize: 5 }, { ai: true, characters: CORE }),
    setup({ ruleset, teamSize: 5 }, { ai: true, characters: CORE })];
  const contacts = new Set();
  for (let frame = 0; frame < 600; frame++) {
    for (const g of games) g.debug.dashball.step();
    assert.equal(games[0].rb.hash(), games[1].rb.hash(), `CPU frame ${frame}`);
    for (const fighter of games[0].debug.fighters) {
      assert([fighter.x, fighter.y, fighter.vx, fighter.vy, fighter.health].every(Number.isFinite));
      if (!fighter.koScored) assertSide(fighter, games[0].debug.dashball.arena);
    }
    const ball = games[0].debug.dashball.state.ball;
    for (const attack of Object.keys(ball.attacks)) contacts.add(attack);
    assert([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite));
  }
  assert(contacts.size > 0, "CPUs must actually strike the volleyball using native inputs");
});

test("fresh Volleyball rounds and switching sports clear rallies, serving state and special geometry", () => {
  const g = setup(), d = g.debug;
  drop(d.dashball.state, d.dashball.arena); d.dashball.ballStep();
  assert.equal(d.dashball.state.volleyball.rallies, 1);
  d.dashball.setup({ arena: "volleyball" });
  assert.deepEqual(plain(d.dashball.state.scores), [0, 0]);
  assert.deepEqual(plain(d.dashball.state.volleyball), { serveTeam: 0, rallies: 0 });
  assert.equal(d.dashball.state.remaining, 300);
  assert.equal(d.dashball.state.phase, "playing");
  d.dashball.setup({ arena: "standard" });
  assert.equal(d.dashball.state.volleyball, undefined);
  assert(!d.dashball.arena.volleyball);
  assert(!d.terrainArt.rects.some(r => r.volleyballNet));
  assert.equal(d.dashball.state.ball.r, 24);
  assert.equal(d.dashball.state.config.gravity, 1050);
});
