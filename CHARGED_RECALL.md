# Boomerangus: Charged Recall

## Controls and Tuning

Hold the existing Punch input while the weapon is away. This charges recall
and retains the existing shield, including its costs, fizzle, shield break,
release parry and Punch recovery. No new input or meter.

Return speed caps interpolate linearly: 0 / 0.3 / 0.6 / 0.9 / 1.2 seconds of
hold gives 1100 / 1300 / 1550 / 1800 / 2000 units/second. Acceleration scales
proportionally from 2400 to 4363.64 units/second squared. Steering remains
limited to 4.8 radians/second. Releasing sheds two charge-seconds per second:
full assistance fades over 0.6 seconds, with bounded speed deceleration.

Charge builds during outbound flight but does not alter its motion or its
0.8-second duration. Normal turnaround still slows to rest before homing.
At a solid wall, only blocked velocity is removed, the shot separates by
0.5 units, pauses acceleration for 0.06 seconds, then eases into homing.
It never instantly reverses wall-impact velocity. It does not pathfind around
obstacles; an obstructed weapon still has the existing eight-second failsafe.

The current controlling fighter's actual Punch-held input charges recall,
including after reflection. Ownership transfer immediately clears stored
charge. Catch, expiration, destruction, KO and match reset remove recall state.
A hold begun while the weapon is away consumes its release as defense, even
if caught before release; a fresh Punch cycle throws again. It cannot become
a recovery-buffered second throw.

## Collision and Strength Rules

Ordinary fighters and sports balls do not recall or destroy the weapon. All
distinct swept fighter/ball targets can be hit in the same step. Existing hit
generations and separation latches prevent sustained overlap damage; a separated
return pass can hit again. The primary boulder and small ball zero have distinct
contact identities in Total Rush.

Directional shields, release parries, melee reflection, projectile clashes,
owned-projectile Kickoffs, cap ownership and reflection lifespan decay remain.
Shield deflections preserve finite homing on subsequent steps. Horizontal
wrapping preserves velocity and shortest-route homing. Gravity switches retain
their projectile-consuming rules. The original creator remains weapon-locked
when another fighter controls the boomerang, until that one weapon is gone.

Recall changes travel speed only. Fighter damage, hitstun, knockback, shield
damage, sports and boulder impulses still use existing attack properties, not
the increased travel speed. Target Charge's impact curve and permanent ball
ownership are unchanged. All 14 fighter definitions and all sprite assets are
unchanged. Existing explicit Kickoff/ricochet/reflection momentum rules remain.

## Presentation and AI

Existing baked rotation frames play up to twice as fast with full recall.
No smooth image rotation, new assets, trails, meter or dependency were added.
The existing positional AI sometimes holds Punch for defensive shields and
fast recovery, and sometimes leaves the normal return available for attacks.
It uses the same inputs, charge rate and shield resources as human players.

## Architecture and Verification

`boomerang.js` owns pure fixed-step recall and flight math. `game.js` integrates
input, collisions and shared projectile ownership. Recall, spin progress, wall
pause and controller identity live on the existing serializable projectile;
the defensive-release latch lives only on Boomerangus. No second update loop.
Online build signature: `dash-punch-rollback-44-charged-recall` (core suffix
added by the existing builder). Both peers must update.

Offline packaging also embeds the boomerang rotation sheet alongside the fighter
sheets. Its native pixel-grid pass needs readable image data; an external
`file://` image otherwise taints Canvas and interrupts the render loop in Chrome.

Pre-change checkpoint: `exports/pre-charged-recall-2026-11-13.zip`. This folder
is not a Git repository; no Git commit is claimed. Historical JSON fixtures
remain untouched. Run `node tests/charged-recall.test.js` and the existing
Boomerangus, sports, projectile and rollback suites. Browser and release results
are recorded under `artifacts/charged-recall/` after validation.

Physical controller feel and subjective balance require human playtesting.
The pre-existing historical Rain/Orbit fixture discrepancy is not a new recall
regression and its baseline must not be regenerated.

## Verified Release

Release: `exports/Dash-Punch-Charged-Recall-Release-2026-11-13.zip`.
Playable local preview: `http://localhost:8080/?v=charged-recall`.

- 15 focused Charged Recall groups pass, including simultaneous distinct targets,
  multiple balls, wall braking, wrap, switch consumption, no strength buffs,
  cleanup, AI, replay, delayed rollback and 30/60/120 Hz equivalence.
- 38 current simulation/build suites pass. Final core package parity covers
  3,390 full/core simulation frames, eleven stage replays and 26 embedded sheets.
- Real browser checks pass at 1920x1080 and 1280x720, with both gravity signs,
  unchanged rendering hashes, offline keyboard throw/recall and no page errors.
- Real WebRTC Versus and Soccer pass with 50 ms delay, 15 ms jitter and 5% packet
  loss, matching confirmed hashes, actual rollback and clean rematches.
- Existing controller-remapping browser coverage passes. This is automation,
  not physical-controller feel certification.
- Ten-fighter Total Rush software-Chrome samples: median 16.7 ms both without
  throws and with active recall; p95 16.7 / 16.8 ms, no frames above 25 ms in
  240 sampled intervals each. Up to eight weapons were observed. This short,
  headless local test does not guarantee performance on other hardware.

The separately run historical `orbit-before` check still fails at the documented
Rain fixture; current Orbit, Kite/Rain and unchanged-roster regression checks
pass. No historical baseline was regenerated.

Changed implementation files: `boomerang.js`, `game.js`,
`tools/build-core-release.cjs`. Tests: new `tests/charged-recall.test.js`,
`tests/charged-recall.browser.test.js`, `tests/charged-recall-online.browser.test.js`,
plus the embedded-sheet inventory in `tests/core-release.test.js`. Package
scripts, this document, `BOOMERANGUS.md`, patch notes and the existing preview
release pointer are updated. No new art, dependencies or fighter definitions.
