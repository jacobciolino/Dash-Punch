# Field Goal

Play > Dashball > Choose Fighters > Choose Stage > Field Goal.
The online setup also lists it in the same Dashball stage pool. Field Goal
Settings exposes the existing Court/Battle, score, timer and respawn options.
Local: 1v1 through 5v5. Private WebRTC: existing 1v1 only; both peers need this
build. The two combat buttons and all fighter balance are unchanged.

## Geometry And Rules

The standard Soccer arena is reused: 2560 x 1440, floor at Y1280, ceiling Y24,
fixed upright camera at 0.38 zoom. Team spawn lanes and the standard ball's
radius 24, gravity 1050, speed cap 2050 and bounce 0.73 are unchanged.

All goal tuning lives in `Dashball.fieldGoal.TUNING` in `dashball.js`:

| Property | Value |
| --- | --- |
| Goal planes | X192 and X2368 |
| Crossbar above floor | 432 (2.8 x Chungus's 154-unit collider height) |
| Frame width / inner width | 224 / 192 |
| Post and crossbar thickness | 16 |
| Upright height above crossbar | 264 |
| Central support length | 64 below crossbar |
| Keeper perch | 92 x 20, Y1112 (168 above floor) |
| Perch offset | 102 toward midfield from goal plane |

Posts, crossbars and supports use actual solid colliders, as do both perches.
The short support avoids sealing off inaccessible floor pockets. Perches sit
below the field-side upright rather than under the center support, leaving a
clear route upward even for Chungus's 118-unit-wide collider. No movement buff
is applied. Native landing and charged super-jump tests cover all 13 core
fighters, both floor-to-perch height and perch-to-post-tip height.

### Side-View Scoring

A literal solid U in 2D blocks a flat horizontal shot at post height. The
side-view adaptation uses a lofted shot over the physical field-side post tip,
then an outward crossing of the vertical goal plane, above the crossbar and
within the projected inner width of the uprights. The opening is uncapped above
the post tips, like football's extended upright lines. This is not a basket:
a straight downward entry never scores without the sideways field-side crossing.

Swept leading-edge entry arms a goal; the trailing edge must subsequently clear
the plane. The full circle must fit within the inner window at both crossings.
Rear-side approaches, initial overlaps, under-bar shots and collision-correction
crossings cannot score. Crossbar/post impacts invalidate that contact. One valid
entry awards the attacking team one point, including normal Soccer own goals.

Soccer's existing first-to-5, three-minute timer, overtime, 1.2-second celebration,
ball/fighter reset and two-second restart countdown are reused. Court keeps
full fighter bodies on their own halves without PvP. Battle retains friendly
fire, reduced health, independent respawns and spawn protection. No gravity
switch or moving-goal state is introduced.

## AI

The Soccer shot planner is reused with Field Goal-only targets above the post
tips. It predicts gravity, roof/floor banks and native attack launch vectors,
including full charge when useful. A tested native Orbit floor-bank scores
without a scripted impulse. A nearby CPU teammate can defend the keeper perch
when its side is threatened; others pursue/intercept the ball. Court destination
clamps and Battle combat remain active. All actions use normal fighter inputs.
New AI plan state is serialized by existing fighter snapshots and reset by the
existing fighter reset, not by a second state machine.

## Validation

- `tests/field-goal.test.js`: 20 groups. Geometry, radius-clear swept scoring,
  ricochets, invalid entries, correction rejection, Soccer match flow, native
  landing/super-jumps, ten safe spawns, respawns, Court/Battle, projectile/perch
  collisions, shields/Spike possession, real shot planning and AI roles.
- Independent 1v1, 3v3 and 5v5 snapshots/replay, authoritative snapshot install,
  six-frame delayed-input rollback, 30/60/120 Hz equivalence and ten deterministic
  CPUs under both rulesets pass.
- All 3,360 pre-change hashes for the nine previous Dashball sports, Sandbag,
  Versus and strategic AIs match. `tests/field-goal-before.json` was captured from
  the checkpoint before implementation; no historical baseline was replaced.
- Browser captures at 1920x1080, 1280x720 and 980x720 verify both goals, both
  perches and ten fighters, loaded art, responsive keyboard/virtual controller
  setup and presentation state purity. See `artifacts/field-goal/`.
- Real WebRTC Court and Battle each pass live scoring and victory/rematch with
  50 ms delay, 15 ms jitter and 5% simulated loss. Confirmed hashes match;
  different local outline/glow settings do not affect simulation agreement.
- Ten-CPU browser samples: Court median/p95 16.7/16.7 ms; Battle 16.7/16.8 ms;
  neither sample had a frame over 25 ms (180 frames each). Warm render-only
  median/p95: Soccer 0.3/0.4 ms, Field Goal 0.2/0.3 ms. No warmed silhouette
  allocations; live cache stayed within its existing 1.2-million-pixel bound.
  These small differences are measurement noise, not a claimed speedup.
- Twenty-seven relevant existing regression suites pass, including all sports,
  magazines, Kite, shields, fighter mechanics, silhouette rendering, networking
  state and packaging. The silhouette unit test needed the installed bundled
  Canvas path on retry; no code or fixture change was necessary. The separate
  signaling-server test passes too.
- The broader rollback suite passes 7,560 independent simulation frames and
  1,047 rollbacks, maximum depth eight. Exact final core-package parity passes
  2,580 frames and 11 replays. Its 74 files are byte-identical to the browser-QA
  package. All 76 runtime PNGs/23 embedded sheets load; offline file play,
  virtual controller joining, ten fighters, standard Versus online pause,
  rematch and disconnect tests pass without missing assets.
- A 60-second simulation budget with ten mixed core CPUs produced five Court
  goals (match ended at 15.4 active seconds) and one Battle goal. Those are
  native attacks/physics, not scripted scores, and not a balance guarantee.

### Existing Historical Failure

The older `tests/orbit-before.test.js` still fails its Rain comparison against
pre-Rain-balance hashes. The same failure was recorded before this feature
(see `artifacts/gravity-boulder/legacy-orbit-comparison.json`). Orbit's grounded
fixtures and the other compared fighters are unchanged. This historical fixture
was not regenerated, nor was Rain retuned to hide the mismatch. Thus not every
historical test in the project is green, despite the relevant suites above passing.

## Scope And Playtest Concerns

No new sprite assets, dependencies, controls, collision engine or networking
capacity were added. Existing team silhouette effects automatically apply.
The gold frame, dark perch and minimal court rendering are shared sports
presentation, not changes to fighter art. No missing asset blocks this mode.

AI is heuristic rather than an expert football player: close-to-post setups and
keeper spacing need human playtesting. Loft/bank difficulty, small keeper perch
size and full-team congestion need subjective testing. Physical controller
feel is not verified by automated input tests. Browser timing is a short local
sample, not a guarantee on other hardware.

This folder has no Git repository. The pre-change checkpoint is
`exports/checkpoint-before-field-goal-2026-11-13.zip`; old exports are retained.
Distribution remains core-only, with 13 fighters, 11 combat stages and now ten
Dashball stages. No experimental or development assets are added to the package.
The verified shareable ZIP is
`exports/Dash-Punch-Field-Goal-2026-11-13.zip` (7,435,003 bytes); archive integrity
passes. Preview: `http://localhost:8080/?v=field-goal`, build
`dash-punch-rollback-38-field-goal-core-1`.

## Changed Files

`dashball.js`, `game.js`, `tools/build-core-release.cjs`, `package.json`,
`tests/field-goal.test.js`, `tests/field-goal-before.json`,
`tests/field-goal.browser.test.js`, `tests/field-goal-online.browser.test.js`,
`tests/dashball.test.js`, `tests/total-rush.test.js`, `tests/core-release.test.js`,
`README.md`, `DASHBALL.md`, this report, and the generated playtest pointer/export.
Existing test edits only extend registry/package coverage, not gameplay fixtures.
