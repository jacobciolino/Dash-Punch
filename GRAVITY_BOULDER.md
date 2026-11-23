# Gravity Flip Boulder Control

## Play

Play > Dashball > Choose Fighters > Choose Stage > Gravity Flip Boulder Control.
Battle-only: choosing it overrides a previous Court setup and never offers Court.
Other sports keep their Court rules. Local humans/CPUs support 1v1-5v5; private
WebRTC rollback remains 1v1. Direction, Dash and Punch are unchanged.

First to 100 cumulative points. Keep the boulder's center inside your moving
Blue-left or Red-right scoring window for 1 point/s, or on the bonus side for
2 points/s. No goal-entry event is required: a window moving over a stationary
boulder legitimately begins scoring. Leaving its current bounds stops scoring.
Bonus means above the platform under downward gravity, below under upward.

## Shared Systems And Tuning

| Property | Default | Bounded configuration |
| --- | --- | --- |
| Arena | 3000 x 1980 | Existing Boulder arena construction |
| Playable floor / roof | 1820 / 24 | Existing collision geometry |
| Horizontal zones | 9% dead, 23% Blue, 36% neutral, 23% Red, 9% dead | Existing `zoneWidth` |
| Boulder diameter / mass | 540 / 3.8 | Existing 462-612 / 2.5-7 |
| Boulder gravity / speed cap | 760 / 1700 | Existing heavy-ball physics |
| Bounce / friction | 0.58 / 0.2 | Existing additive impulse behavior |
| Platform acceleration | 720 units/s^2 | `zoneAcceleration`, 200-1400 |
| Platform speed cap | 620 units/s | `zoneMaxSpeed`, 200-900 |
| Scoring window height | 1100 | `scoringWindowHeight`, 800-1280 |
| Bonus height from supporting surface | 630 | `bonusHeight`, 620-780 plus diameter/window clearance |
| Bonus platforms | 108 x 28 | Same width/thickness as regular Boulder |
| Neutral perch | 132 x 28 | No scoring; 220 left of midfield switch |
| Match health / respawn | 50% / 15 s | Shared sports Battle settings |
| Respawn protection | 2 s | Ends on offense, as in other Battle sports |

Size, Weight, score, timer, team size and Battle settings use the existing
Boulder Settings screen. Advanced motion/window parameters are bounded,
serializable `Dashball.options` values, not additional setup pages.

Regular Boulder defaults, including its 900-unit bonus height, are unchanged.
This variant uses 630 so mirrored destinations create meaningful travel rather
than nearly coincident platforms. Default bonus-platform centers travel between
Y=1204 and Y=640; neutral-perch center between Y=1064 and Y=780. Existing core
super jumps can reach the platform heights under both gravities, including
Chungus. No fighter movement was buffed.

## Continuous Motion And Scoring

The only gravity authority remains `stageGravityAxis` / `stageGravitySign`.
The switch uses the original melee/projectile successful-hit hooks and the
Gravity Flip Soccer no-cooldown/contact-generation rules. Persistent overlap
cannot flip repeatedly, but fresh valid hits can. Original Flip cooldown remains.
No bystander air-dash refill is granted. Straight shots stay straight.

`dashball.js` shares a small gravity-body integrator with moving Soccer goals.
Each moving body stores current/previous Y, vertical velocity and target Y in
the normal sports snapshot. Flips change acceleration/target only. Endpoint
contacts stop velocity; mid-flight reversals preserve it and decelerate naturally.

Each scoring window is centered on its platform and retains its fixed vertical
size throughout transit. This avoids teleporting its bounds when gravity flips.
Both destinations guarantee the entire window stays inside the roof/floor.
The bonus threshold is the platform's gravity-opposing face: top under downward
gravity, bottom under upward. The 28-unit change of threshold at a flip is the
platform thickness, not a jump of the scoring window. Ordinary/bonus halves
exchange roles immediately with the shared gravity direction.

One transform supplies interpolated platform collision, render position, AI
prediction and scoring. Window edges are inclusive left/top, exclusive right/
bottom; exact threshold earns 1x. Scoring uses existing 60,000 integer units per
point plus carried fractions, once per deterministic collision substep. Scores
never decrease. No zone state is duplicated separately from its platform.

## Physics, AI And Lifecycle

The same boulder sprite, effective mass, additive character impulses, contact
generation deduplication, Kickoff/resources, shields, projectiles, magazines and
horizontal wrap are reused. Body contact displaces fighters, not the boulder.
Gravity flips change boulder acceleration, never its instantaneous velocity.
Moving geometry contributes relative velocity; collision substeps account for
both ball and platform speed, bounded to 64. Fighters reuse existing moving-
platform displacement without a second carry. The neutral perch is offset
within midfield so its vertical path never covers the switch.

CPUs reuse Boulder control/overshoot/guard roles. New-stage-only planning leads
the window by 0.65 seconds, uses gravity-aware approach sides and super jumps,
and assigns a secondary teammate to strategic switch contests rather than
pulling every teammate off the boulder. Its AI decision interval is not a switch
cooldown. Humans can flip immediately with distinct valid hits.

Inverted landing, wall interactions and safe ceiling-side respawns use existing
gravity-aware rules. Independent respawns never reset gravity, movers, boulder
or score. Victory freezes play/movers through the existing sports flow. Rematch
restores downward gravity, floor-side bodies, zero scores and normal resources.
Leaving the stage does not leak state to regular Soccer, Boulder or Versus.

Presentation uses the existing neutral court, pixel boulder, Seeker sprites,
two-row team HUD, fixed upright wide camera, shared switch and UP/DOWN indicator.
Blue/Red bounded bands and bonus thresholds visibly follow the platforms. No
new artwork, dependencies, fighter controls or network capacity were added.

## Verification

- `tests/gravity-boulder.test.js`: 23 focused groups for geometry, bounded
  configuration, true continuous motion, reversal, scoring sweeps/boundaries,
  both gravities, melee/native-projectile switch deduplication, momentum,
  collisions, rider carrying, inverted landing/respawn, wrap, all-core height
  access, friendly fire, strategic CPUs, 1v1/3v3/5v5 determinism, snapshots,
  render purity, six-frame delayed-input rollback and 30/60/120 Hz equivalence.
- `tests/gravity-boulder-before.json`: 2,640 immutable pre-change frame hashes
  across every previous sport, Versus, regular Boulder AI and Gravity Soccer AI.
  Only the known Sandbag stage/contact ID index shift is normalized. Historical
  gameplay fixtures were not regenerated.
- `tests/gravity-boulder.browser.test.js`: native stage/setup/lobby/countdown,
  Battle-only controls, ten core fighters, floor/transit/ceiling screenshots at
  1440 and 980 pixels, pixel checks, missing assets/errors and frame pacing.
- `tests/gravity-boulder-online.browser.test.js`: two real WebRTC peers with
  50 ms delay, 15 ms jitter and 5% simulated packet loss; live flips/motion,
  fractional scoring, confirmed matching state, victory in transit and rematch.
- `tests/core-release.test.js`: source/core simulation parity now explicitly
  includes this stage, alongside all existing core gameplay and asset checks.

Results and screenshots: `artifacts/gravity-boulder/`. No Git repository exists
here; the pre-change checkpoint is
`exports/checkpoint-before-gravity-boulder-2026-11-13.zip`. Shareable builds use
`tools/build-release.cjs` and exclude experimental content without deleting it
from development source. Both online peers need the same new core build.

Remaining human checks: controller feel, coordinated ten-player scoring,
window speed/height, switch strategy and long-match AI behavior. Automated
controller/browser tests are not physical hardware verification. Narrow ledges
can support a precisely balanced boulder; no artificial anti-camping force was
introduced. Advanced extreme configuration values may be harder to traverse.

### Final Results

- All 23 new focused groups pass, including the explicit original Flip Chamber
  0.5-second cooldown check. All 2,640 pre-change sports/AI/Versus hashes match.
- Sixteen primary existing suites pass: Boulder Control, Gravity Flip Soccer,
  Dashball, online state, gravity rendering, Orbit animation, shield pressure,
  projectile magazines/rework, Kite, targets, Golden Rush, Sandbag, sports
  updates, core packaging and rollback. Existing rollback stress covers 7,320
  independent frames, 1,047 corrections and maximum rollback depth eight.
- Additional team-arena, DefiPlate, Orbit arc, hurt alignment, Spike, Chase,
  Edgebert, Fired Up, projectile parry, audio, Canvas rendering and signaling
  checks pass. Canvas rendering used the already-installed runtime libraries;
  no project dependency was added.
- One historical test remains failing: `tests/orbit-before.test.js` expects
  Rain's older balance hashes. Running the identical test against the pre-change
  ZIP produces the identical failure. Its fixture and current Rain tuning were
  left untouched. See `artifacts/gravity-boulder/legacy-orbit-comparison.json`.
  Therefore the entire historical test collection is not claimed green.
- Final core/source comparison: 2,310 equal frames and 11 restored replays.
  All 76 runtime PNGs and 23 embedded sheets load. Thirteen core fighters,
  eleven combat stages, eight Dashball arenas; no experimental assets added.
- Final browser suites pass against
  `exports/Dash-Punch-Gravity-Boulder-Ready-2026-11-13`, including native menus,
  floor/transit/ceiling scenes at two sizes, ten CPUs, real WebRTC agreement,
  victory/rematch, standard Versus online, pause/disconnect and offline file play.
- Ten-CPU new-stage frame samples: median 16.7 ms, p95 16.8 ms, zero of 180
  samples above 25 ms, no missing assets or page errors. These are local automated
  measurements, not a hardware-wide performance guarantee.
- Real WebRTC new-stage checks use 50 ms delay, 15 ms jitter and 5% simulated
  packet loss. Matching confirmed state, live fractional scoring and a win
  while platforms are moving all pass. Physical controllers are unverified.

Changed runtime: `dashball.js`, `game.js`. Packaging/scripts:
`tools/build-core-release.cjs`, `package.json`, `playtest-release.json`. Tests:
the three new gravity-boulder suites and immutable pre-change fixture; existing
Dashball registry, Boulder stage-index normalization and core parity coverage.
Docs: this report, `README.md`, `DASHBALL.md`; in-game/core patch notes updated.
No existing artwork, fighter balance, historical baselines or combat geometry
were replaced. No major work remains; long-session balance/AI and real controller
feel remain human playtests.
