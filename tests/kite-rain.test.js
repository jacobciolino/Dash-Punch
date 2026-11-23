"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createGame } = require("./simulation-harness");
const { sample } = require("./kite-rain-fixture");
const R = require("../rollback");
const before = require("./kite-rain-before.json");
const clone = value => JSON.parse(JSON.stringify(value));
const near = (a, b, label = "") => assert(Math.abs(a - b) < 1e-8, `${label}: ${a} != ${b}`);
let groups = 0;

function setup(key = "kite", legacy = false) {
  const game = createGame();
  game.rb.setup({ stageIndex: game.rb.stageNames.indexOf("High Perch"), characterKeys: [key, "anchor"], seed: 291 });
  const fighter = game.debug.fighters[0];
  if (legacy) fighter.data = clone(before[key].data);
  Object.assign(fighter, { x: 640, y: -50000, vx: 0, vy: 0, onGround: false, hasLiveAim: false });
  return { game, fighter };
}

function trial({ key = "kite", legacy = false, aim = null, charge = false, frames = 120, airDashes } = {}) {
  const { game, fighter: f } = setup(key, legacy);
  if (airDashes !== undefined) f.airDashes = airDashes;
  if (aim) Object.assign(f, { aim, hasLiveAim: true });
  if (charge) Object.assign(f, { chargingDash: true, dashChargeAirborne: true, dashCharge: f.data.dashChargeTime, dashChargeAge: 1 });
  const initial = { x: f.x, y: f.y };
  for (let frame = 0; frame < frames; frame++) game.debug.gravity.physics(0);
  return { vx: f.vx, vy: f.vy, travelX: f.x - initial.x, fall: f.y - initial.y, game, fighter: f };
}

// Captured before the patch: all unrelated fighters, including Rain-derived
// Kevin, Zomg and Dragon, retain identical tuning and simulation hashes.
for (const key of Object.keys(before).filter(key => !["kite", "rain", "gunman", "archer"].includes(key))) {
  const current = sample(key);
  assert.deepEqual(current.data, before[key].data, `${key}: unrelated tuning changed`);
  assert.deepEqual(current.hashes, before[key].hashes, `${key}: unrelated simulation changed`);
}
groups++;

for (const [key, allowed, count] of [
  ["kite", ["airFloat", "maxAirDashes", "launchBias", "launchBiasStrength", "airDashScale", "airSteerDuration", "airSteerAccel", "airSteerMaxSpeedScale", "dashReboundMinSpeed"], 7],
  ["rain", ["gravity", "maxAirDashes", "launchBias", "launchBiasStrength"], 9],
]) {
  const { fighter } = setup(key);
  assert.equal(fighter.data.maxAirDashes, count);
  for (const [field, value] of Object.entries(before[key].data)) {
    if (!allowed.includes(field)) assert.deepEqual(clone(fighter.data[field]), value, `${key}: unexpected ${field} change`);
  }
  for (const ground of [true, false]) for (const charge of [0, 1]) {
    const current = setup(key), old = setup(key, true);
    for (const test of [current, old]) {
      test.fighter.onGround = ground;
      test.game.debug.gravity.dash(0, { x: 1, y: 0 }, charge * test.fighter.data.dashChargeTime);
    }
    if(key!=="kite"||ground){
      near(current.fighter.vx, old.fighter.vx, `${key} dash launch`);
      near(current.fighter.vy, old.fighter.vy);
      near(current.fighter.airSteerTimer, old.fighter.airSteerTimer);
    }else assert(current.fighter.vx<old.fighter.vx*.7,"Kite did not receive a weaker air burst");
    near(current.fighter.dashCarryTimer, old.fighter.dashCarryTimer);
  }
}
groups++;

const float = trial(), up = trial({ aim: { x: 0, y: -1 } }), oldKite = trial({ legacy: true });
assert(float.vy > 0 && float.vy <= 360 && float.fall < oldKite.fall * .7);
assert(up.vy > 0 && up.vy <= 280 && up.fall < float.fall);
const neutralCharge = trial({ charge: true }), upCharge = trial({ aim: { x: 0, y: -1 }, charge: true });
assert(upCharge.fall > 0 && upCharge.fall < up.fall && upCharge.fall < neutralCharge.fall);
assert.equal(upCharge.fighter.airDashes, 7, "holding charge granted or consumed a dash");
groups++;

for (const airDashes of [0, 7]) {
  const left = trial({ aim: { x: -1, y: 0 }, airDashes });
  const right = trial({ aim: { x: 1, y: 0 }, airDashes });
  assert(right.vx > 100 && right.vx<=110 && right.travelX > 150, "no useful gradual drift");
  near(left.vx, -right.vx, "air-walk mirror");
  near(left.travelX, -right.travelX);
  Object.assign(right.fighter, { hasLiveAim: false });
  for (let frame = 0; frame < 30; frame++) right.game.debug.gravity.physics(0);
  assert(right.fighter.vx>=0&&right.fighter.vx<80,"neutral drift did not brake gently");
}
groups++;

// Movement is gravity-relative; Up means away from the current pull. Holding
// Up slows falling but cannot generate an upward force, even with no dashes.
for (const [axis, sign] of [["y", 1], ["y", -1], ["x", 1], ["x", -1]]) {
  const { game, fighter: f } = setup();
  game.debug.gravity.setDirection(axis, sign);
  const g = game.debug.gravity.vector;
  Object.assign(f, { hasLiveAim: true, aim: { x: -g.x, y: -g.y }, airDashes: 0 });
  for (let frame = 0; frame < 90; frame++) game.debug.gravity.physics(0);
  const fall = f.vx * g.x + f.vy * g.y;
  assert(fall > 0 && fall <= 280, `${axis}/${sign}: float generated lift or ignored gravity`);
  Object.assign(f, { vx: 0, vy: 0, aim: { x: g.y, y: -g.x } });
  for (let frame = 0; frame < 30; frame++) game.debug.gravity.physics(0);
  assert(f.vx * g.y - f.vy * g.x > 80, `${axis}/${sign}: tangent steering failed`);
}
groups++;

for (const extra of [
  { hitstun: 1 }, { punchBlockstun: 1 }, { shieldPressureRearm: true },
  { juked: 1 }, { spotDodgeRecovery: 1 }, { spotDodgeInvuln: 1 },
  { wallSliding: true }, { koScored: true }, { surfaceTechTravelTimer: 1 },
]) {
  const a = setup(), b = setup();
  // Disable only the new control, retaining passive gravity, to distinguish
  // pre-existing hitstun DI / wall movement from an unintended float escape.
  b.fighter.data = { ...b.fighter.data, airFloat: { ...b.fighter.data.airFloat, moveSpeed: 0, upGravityScale: 1 } };
  for (const test of [a, b]) {
    Object.assign(test.fighter, extra, { hasLiveAim: true, aim: { x: .8, y: -.6 } });
    test.game.debug.gravity.physics(0);
  }
  near(a.fighter.vx, b.fighter.vx, `stun guard ${JSON.stringify(extra)}`);
  near(a.fighter.vy, b.fighter.vy);
}
const ascent = setup();
Object.assign(ascent.fighter, { vy: -700, floatMotion:"external" });
ascent.game.debug.gravity.physics(0);
assert(ascent.fighter.vy < -690, "float fall cap erased upward momentum");
const dash = setup();
dash.game.debug.gravity.dash(0, { x: 1, y: 0 }, dash.fighter.data.dashChargeTime);
dash.game.debug.gravity.physics(0);
assert(dash.fighter.vx > dash.fighter.data.airFloat.moveSpeed, "air-walk capped active Dash");
groups++;

const rain = trial({ key: "rain", frames: 30 }), oldRain = trial({ key: "rain", legacy: true, frames: 30 });
assert.equal(rain.fighter.data.gravity, 2850);
assert(rain.fall > oldRain.fall * 1.8, "Rain is not substantially heavier");
assert(rain.vy <= rain.fighter.data.terminalVelocity, "Rain lost the anti-warp fall cap");
groups++;

for (const key of ["kite", "rain"]) for (const charge of [0, .5, 1]) {
  const launches = [];
  for (const side of [-1, 1]) {
    const { game, fighter: f } = setup(key);
    f.aim = { x: side, y: 0 };
    f.attack = { dir: { x: side, y: 0 }, charge };
    const dir = game.debug.getLaunchDirection(0);
    assert(dir.x * side > 0, "horizontal launch went behind the attacker");
    assert(key === "kite" ? dir.y < -.85 : dir.y > .8, `${key}: launch identity is weak`);
    launches.push(dir);
    const beforeMove = { ...dir };
    Object.assign(f, { vx: -side * 2000, vy: 1000 });
    assert.deepEqual({ ...game.debug.getLaunchDirection(0) }, beforeMove, "velocity changed attack launch");
  }
  near(launches[0].x, -launches[1].x);
  near(launches[0].y, launches[1].y);
}
groups++;

// Replay and six-frame prediction correction with live steering, aerial charge
// holds/releases and Punches in both directions.
const a = setup().game, b = setup().game;
for (const game of [a, b]) {
  game.rb.setup({ stageIndex: game.rb.stageNames.indexOf("High Perch"), characterKeys: ["kite", "rain"], seed: 79 });
  for (const [i, f] of game.debug.fighters.entries()) Object.assign(f, { x: 400 + 400 * i, y: -5000, onGround: false });
}
const manager = b.rb.manager(0, 8), pending = [], inputs = [];
let snapshot;
for (let frame = 0; frame < 240; frame++) {
  const encoded = [0, 1].map(i => R.encode({ hasAim: true, aimX: Math.cos(frame * .07 + i), aimY: Math.sin(frame * .07 + i),
    dashHeld: (frame + i * 9) % 61 < 24, punchHeld: (frame + i * 9) % 43 < 12 }));
  inputs.push(encoded.map(R.decode));
  pending.push({ frame, input: encoded[1] });
  if (frame >= 6) { const packet = pending.shift(); manager.receive(packet.frame, packet.input); }
  assert(manager.advance(encoded[0]));
  a.rb.step(inputs[frame]);
  if (frame === 80) snapshot = a.rb.save();
}
for (const packet of pending) manager.receive(packet.frame, packet.input);
manager.reconcile();
assert.equal(a.rb.hash(), b.rb.hash(), "Kite/Rain rollback diverged");
const end = a.rb.hash();
a.rb.restore(snapshot);
for (let frame = 81; frame < inputs.length; frame++) a.rb.step(inputs[frame]);
assert.equal(a.rb.hash(), end, "Kite/Rain replay diverged");
assert(manager.rollbacks > 0);
groups++;

const metrics = {
  groups, unchangedFighters: 25, unchangedFrames: 25 * 120,
  kite: { beforeDashes: 6, afterDashes: 7, airGravity: 686, upGravity: 617.4,
    oldFallTwoSeconds: oldKite.fall, newFallTwoSeconds: float.fall, upFallTwoSeconds: up.fall,
    chargeFallTwoSeconds: neutralCharge.fall, upChargeFallTwoSeconds: upCharge.fall },
  rain: { beforeDashes: 10, afterDashes: 9, oldGravity: 1280, newGravity: 2850,
    oldFallHalfSecond: oldRain.fall, newFallHalfSecond: rain.fall },
  rollback: { frames: 240, corrections: manager.rollbacks, maxDepth: manager.maxDepth },
};
fs.mkdirSync("artifacts/kite-rain", { recursive: true });
fs.writeFileSync(path.join("artifacts/kite-rain", "verification.json"), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify({ tests: "passed", ...metrics }, null, 2));
