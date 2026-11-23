"use strict";
const assert = require("node:assert/strict");
const { createGame } = require("./simulation-harness");
const before = require("./orc-removal-before.json");
const R = require("../rollback");
let frames = 0;
for (const [name, fixture] of Object.entries(before)) {
  const game = createGame();
  const art = game.sandbox.window.DASH_PUNCH_ART;
  assert(!JSON.stringify(art).includes("orc-arena"), "runtime art still references Orc assets");
  for (const stage of ["Target Break", "Golden Rush"]) {
    assert.equal(art.backdrops[stage], undefined);
    assert.equal(art.stageAtmospheres[stage], undefined);
  }
  game.debug.dashball.setup(fixture.config, { characters: ["kite", "rain"], seed: 91 });
  // Golden Rush now intentionally changes geometry, patrol, health and scoring.
  // Retain its original fixture; current deterministic behavior has dedicated tests.
  const unchanged=fixture.config.arena!=="golden-rush";
  for (let frame = 0; frame < fixture.hashes.length; frame++) {
    const inputs = [0, 1].map(i => R.decode(R.encode({ hasAim: true,
      aimX: Math.cos(frame * .07 + i), aimY: Math.sin(frame * .07 + i),
      dashHeld: (frame + i * 9) % 61 < 24, punchHeld: (frame + i * 9) % 43 < 12,
    })));
    const actual=game.rb.step(inputs);
    if(unchanged)assert.equal(actual, fixture.hashes[frame], `${name}: cosmetic removal changed frame ${frame}`);
    if (frame % 30 === 0) {
      const hash = game.rb.hash();
      game.debug.stagePresentation.draw();
      assert.equal(game.rb.hash(), hash, "plain background rendering changed simulation");
    }
    if(unchanged)frames++;
  }
}
console.log(`Orc removal: no runtime art references, neutral sports courts, ${frames} unchanged pre-removal frames.`);
