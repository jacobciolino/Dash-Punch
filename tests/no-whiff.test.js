"use strict";
const assert = require("node:assert/strict");
const { createGame } = require("./simulation-harness");
const { debug, rb } = createGame();
function setup(key = "nowhiff") {
  rb.setup({ characterKeys: [key, "anchor"], seed: 42 });
  return debug.fighters[0];
}
function punch(fighter, charge = 0) {
  Object.assign(fighter, { punchPending: true, punchCharge: charge * fighter.data.punchChargeTime });
  Object.assign(fighter.controls, { hasAim: true, aim: { x: 1, y: 0 } });
  fighter.controls.actions.punchHeld = false;
  fighter.controls.buffers.punchReleased = 0.1;
  debug.updateHumanInput(0);
}
for (const charge of [0, 0.5, 1]) {
  const fighter = setup();
  for (let i = 0; i < 10; i++) {
    punch(fighter, charge);
    const attack = fighter.attack;
    assert(attack, "must be able to throw another punch");
    assert.equal(attack.recovery, 0);
    punch(fighter, charge);
    assert.equal(fighter.attack, attack, "must not replace an active punch");
    debug.updateAttack(0, attack.total + 0.001);
    assert.equal(fighter.attack, null);
    assert.equal(fighter.whiffLag, 0);
    assert.equal(fighter.punchLockout, 0);
  }
  punch(fighter, charge);
  const defender = debug.fighters[1];
  Object.assign(fighter, { x: 430, y: 300 });
  Object.assign(defender, { x: 480, y: 300, chargingPunch: true,
    punchPending: true, punchInputHeld: true, punchAim: { x: -1, y: 0 } });
  debug.resolveHit(0, 1);
  assert.equal(fighter.attack, null);
  assert(fighter.punchLockout >= fighter.data.punchRecovery, "blocking must retain recovery");
  assert(defender.punchBlockstun > 0);
  const saved = rb.save(), hash = rb.hash();
  rb.restore(saved);
  assert.equal(rb.hash(), hash);
}
const ordinary = setup("needle");
punch(ordinary, 1);
assert(ordinary.attack.recovery > 0);
debug.updateAttack(0, ordinary.attack.total + 0.001);
assert(ordinary.whiffLag > 0 && ordinary.punchLockout > 0);
console.log("No Whiff: repeated tap/charged misses, single active punch, block punishment, rollback and ordinary whiff regressions passed.");
