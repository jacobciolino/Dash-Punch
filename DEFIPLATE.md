# DefiPlate Attack Art

DefiPlate is now the thirteenth core fighter, directly after Chungus, without an
experimental asterisk. His original 86x48 collision body and all combat values
remain unchanged, including the straight-down launch. He is excluded from the
Seeker body-normalization loop so core promotion does not resize his hurtbox.

## Presentation

- Idle, movement, aerial movement, charge, shield and other non-attack states use
  only the shaded trapezoidal weight plate. No human face or permanent barbell.
- Punch startup, strike and recovery reveal/retract a separate steel barbell.
  DefiPlate sits at the loaded end; the exposed **empty** opposite sleeve is the
  striking surface. The plate's center shaft hole remains the attachment point.
- Existing attack phase/charge determines extension. Shaft detail repeats from
  the authored texture rather than stretching the art or inventing a rectangle.
  The sleeve itself remains rigid. Both horizontal facings mirror correctly;
  360-degree strike aim and all four gravity directions are supported.
- Clean-hit follow-through uses the existing 0.16-second visual tail, then ends.
  Entering a new charge/shield state hides that old tail. Holding the next Punch
  while an attack still exists does not hide its current strike. Interrupts and
  expired attack states do not leave a barbell on screen.
- Native sprites are 29x16 (plate) and 64x8 (bar), at integer 3x display scale with
  nearest-neighbor sampling, dark outlines, flat steel shading and binary alpha.
  No squash/stretch, procedural fist, geometric attack fill or new impact FX.
- The per-player Block test model and optional-art-disabled fallback are retained.

## Assets And Replacement

`assets/defiplate/plate.png` and `barbell.png` are imported from the generated
transparent `source-atlas.png`. The built-in image-generation tool was used with
the user's DefiPlate logo as a shape reference and Seeker PRO as a pixel-style
reference. The final plate was redrawn taller before native-resolution import;
there is no per-state body distortion. Prompts are recorded in
`assets/defiplate/PROMPTS.md`.

`presentation-assets.js` owns the replaceable assignment, native dimensions,
attachment and sleeve/grip crops. `tests/build-defiplate-art.js` performs the
presentation-only crop/downsample/palette import. No new runtime dependency or
procedural replacement artwork is introduced. The source atlas is not decoded by
the game. Existing Seeker effects retain their original license.

## Verification And Changed Files

`tests/defiplate-combat.test.js` compares 720 simulation frames with a recorded
pre-art fixture and checks original dimensions/launch. That fixture cannot be
overwritten through its record option. Its Orbit opponent is explicitly held at
old tuning after the separate Orbit rebalance, rather than replacing the baseline.

`tests/defiplate-art.test.js` checks core placement, original frame/damage values,
sprite dimensions, rigid poses, visibility gating, mirroring and render purity.
`tests/defiplate-art.browser.test.js` verifies the actual core tile, 15 rendered
states, charge/follow-up overlap, both facings, vertical strikes, four gravities,
native bar scale and transparency. The old logo-hole expression/debug fallback
test remains. See [State Gallery](artifacts/defiplate/attack-states.png).

Changed runtime files: `game.js` (core membership, dimension exemption, presentation
hooks, asset readiness, description and patch notes), `presentation-assets.js`
(replaceable sprite metadata), and the new `assets/defiplate/` files. Documentation,
test commands and visual/combat regressions accompany them. No simulation timing,
hitbox, damage, knockback, recovery, shield or controller change is made for
DefiPlate. There is no Git repository here, so no Git checkpoint is claimed.
