"use strict";
const assert = require("node:assert/strict");
const { createGame } = require("./simulation-harness");
const game = createGame();
const { debug, rb } = game;
const dt = 1 / 60;
const near = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function setup() {
  rb.setup({ characterKeys: ["anchor", "anchor"], seed: 42 });
  const [a, d] = debug.fighters;
  Object.assign(a, { x: 430, y: 300, vx: 0, vy: 0 });
  Object.assign(d, { x: 480, y: 300, vx: 0, vy: 0, chargingPunch: true,
    punchPending: true, punchInputHeld: true, punchAim: { x: -1, y: 0 } });
  return [a, d];
}
function block(a, d, charge, covered = true) {
  d.hitstop = 0;
  a.attack = { id: 999, age: 0.1, startup: 0, active: 0.2, recovery: 0.2,
    total: 0.4, dir: { x: 1, y: 0 }, charge, hitTargets: new Set(), grounded: true };
  debug.resolveHit(0, 1);
  assert.equal(a.attack, null, "block must cancel attack");
  if (covered) assert(a.punchLockout > 0, "block must retain attacker recovery");
}
function input(d, { held = true, release = false, pressed = false, dash = false, aim = { x: -1, y: 0 } } = {}) {
  Object.assign(d.controls, { hasAim: true, aim, downHeld: aim.y > 0.5 });
  Object.assign(d.controls.actions, { punchHeld: held, dashHeld: dash });
  Object.assign(d.controls.buffers, { punchReleased: release ? 0.1 : 0,
    punchPressed: pressed ? 0.1 : 0, dashPressed: dash ? 0.1 : 0, dashReleased: dash ? 0.1 : 0, downPressed: 0.1 });
  debug.updateHumanInput(1);
}
for (const charge of [0, 0.5, 1]) {
  const [a, d] = setup();
  block(a, d, charge);
  near(d.punchBlockstun, (10 + 8 * charge) / 60);
  const saved = rb.save();
  const hash = rb.hash();
  d.punchBlockstun = 0;
  d.shieldPressureRearm = false;
  rb.restore(saved);
  assert.equal(rb.hash(), hash, "pressure state must survive rollback");
  for (let frame = 0; frame < 10 + 8 * charge; frame++) {
    debug.gravity.physics(1, dt);
  }
  near(debug.fighters[1].punchBlockstun, 0);
}
{
  const [a, d] = setup();
  block(a, d, 1);
  for (const elapsed of [0.013, 0.027, 0.06, 0.09, 0.11]) debug.gravity.physics(1, elapsed);
  near(d.punchBlockstun, 0);
}
{
  const [a, d] = setup();
  block(a, d, 1);
  for (let i = 0; i < 8; i++) input(d, { held: false, pressed: true, release: true, dash: true, aim: { x: 0, y: -1 } });
  assert.equal(d.attack, null);
  assert.equal(d.dashPending, false);
  assert.equal(d.chargingDash, false);
  assert.equal(d.shieldReleaseParry, 0);
  assert(debug.isShielding(1), "release during pressure must not drop shield");
  assert(d.punchAim.y < -0.9, "shield aim must respond during hitstop/pressure");
  assert.equal(d.controls.buffers.punchReleased, 0);
  assert.equal(d.controls.buffers.dashReleased, 0);
  d.dashCarryTimer = 0.1;
  d.hitstop = 0;
  assert(debug.isShielding(1), "residual movement cannot lower shield during pressure");
  d.dashCarryTimer = 0;
  d.punchBlockstun = 0;
  input(d, { held: false, release: true });
  input(d, { held: false });
  assert.equal(d.attack, null, "old release cannot fire a counterattack");
  assert.equal(d.shieldReleaseParry, 0);
}
{
  const [a, d] = setup();
  block(a, d, 1);
  d.punchBlockstun = 0.05;
  d.shieldHealth = d.data.shieldMax;
  block(a, d, 0);
  near(d.punchBlockstun, 10 / 60);
  d.punchBlockstun = 0;
  input(d); // Observe the continued hold after recovery.
  d.hitstop = 0;
  input(d, { held: false, release: true });
  assert(d.attack, "fresh release after pressure must still punch");
  near(d.shieldReleaseParry, 0.14);
  near(d.attack.startup, d.data.punchStartup + 0.055);
}
{
  const [a, d] = setup();
  d.shieldHealth = 1;
  block(a, d, 1);
  assert.equal(d.stunType, "shieldBreak");
  assert.equal(d.punchBlockstun, 0);
  assert.equal(d.shieldPressureRearm, false);
  assert(!debug.isShielding(1));
}
{
  const [a, d] = setup();
  block(a, d, 0);
  d.punchAim = { x: 1, y: 0 }; // A subsequent hit on the uncovered side is real hitstun.
  block(a, d, 0, false);
  assert(d.hitstun > 0);
  assert.equal(d.punchBlockstun, 0);
  assert.equal(d.shieldPressureRearm, false);
}
{
  const [a, d] = setup();
  Object.assign(a, { x: 448, prevX: 418, prevY: 300, vx: 900, vy: 0,
    dashDir: { x: 1, y: 0 }, dashCarryTimer: 0.3, airDashes: 2, onGround: false });
  d.x = 470;
  const shield = d.shieldHealth;
  assert(debug.tryDashRebound(0, 1));
  assert(d.shieldHealth < shield);
  assert(a.vx < 0, "shielded kickoff must rebound attacker");
  assert.equal(d.punchBlockstun, 0);
  assert.equal(d.shieldPressureRearm, false);
}
// Identical abstract inputs on independent peers must remain deterministic.
const peer = createGame();
setup();
peer.rb.setup({ characterKeys: ["anchor", "anchor"], seed: 42 });
peer.rb.restore(rb.save());
for (let i = 0; i < 90; i++) {
  const inputs = [{ aimX: 1, punchHeld: i % 20 < 10, punchReleased: i % 20 === 10 },
    { aimX: -1, punchHeld: true, dashPressed: i % 7 === 0 }];
  assert.equal(rb.step(inputs), peer.rb.step(inputs));
}
// Offline AI/local multiplayer share the same fighter input and shield collision hooks.
debug.ai.configure({ teams: [0, 1, 2, 3], characters: ["anchor", "anchor", "anchor", "anchor"] });
const [a, d] = debug.fighters;
Object.assign(a, { x: 430, y: 300 });
Object.assign(d, { x: 480, y: 300, chargingPunch: true, punchPending: true, punchAim: { x: -1, y: 0 } });
block(a, d, 0);
const snapshot = debug.online.createSnapshot();
near(snapshot.fighters[1].punchBlockstun, 10 / 60);
assert.equal(snapshot.fighters[1].shieldPressureRearm, true);
game.render(1000);
game.render(1020);
assert.equal(debug.fighters.length, 4);
console.log("Shield pressure: timing, input locks, aim, rearm, refresh, shield break, Kickoffs and rollback passed.");
