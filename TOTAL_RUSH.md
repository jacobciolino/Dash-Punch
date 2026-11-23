# Total Rush

Play > Dashball > Choose Fighters > Choose Stage > Total Rush.
Three objectives. One scoreboard. Battle-only, local 1v1-5v5 and existing private
WebRTC rollback 1v1. Human/CPU seats, team assignment, controls and combat remain
shared. No Court, gravity switch, new fighter ability or network expansion.

## Defaults

| Objective / Setting | Value |
| --- | --- |
| Victory target | 300, configurable 10-500 |
| Ordinary boulder territory | 0.5 points/second |
| Above bonus platform | 1 point/second total |
| Opposing middle ring | 5 points |
| Opposing highest ring | 10 points |
| Golden target | 30 points; 144 HP (3 x Golden Rush) |
| Golden target respawn | 45 simulation seconds |
| Small scoring balls | 3; existing bounded 1-5 option |
| Fighter health / KO respawn | Existing 50% / 15 seconds (10/15/20) |
| Respawn protection | Existing 2 seconds, ends on offense |
| KO points / team-wipe victory | None |
| Timer | Unlimited by default; existing optional timer |
| Arena | 3600 x 2400; floor top 2240; closed roof 24 |
| Camera | Upright fixed 0.23 zoom, full court framing |
| Boulder diameter / attack mass | 540 / 3.8, regular Boulder tuning |
| Boulder gravity / cap / bounce | 760 / 1700 / 0.58 |
| Small-ball radius / gravity / cap / bounce | 16 / 900 / 2050 / 0.84, Golden Rush tuning; rolling friction 0.95 |

These are the **Balanced** defaults. Total Rush Settings now offers Balanced,
Original (1/2 boulder income) and Custom, with all eight objective balance
controls. Score target, timer, fighter respawn and teams remain separate.
See [TOTAL_RUSH_BALANCE.md](TOTAL_RUSH_BALANCE.md) for exact choices and validation.

Horizontal regions preserve the 9% dead / 23% Blue / 36% midfield / 23% Red /
9% dead proportions. Blue is physically left (team 1), Red right (team 0), as in
Boulder Control. Both fighter and objective horizontal wrapping retain momentum.
Ring ownership follows the actual defending team, not its numeric left/right
index. Total Rush has only four rings: center heights 1180 and 600, openings 290.
The original Golden Rush six-ring layout and 1/3/5 awards are unchanged.

Bonus platforms remain 108 x 28 at Y=1340. The neutral perch is 132 x 28 at
Y=1060, and two pass-through routes at Y=900 support the high-ring approaches.
All core fighters can reach relevant ring heights using native charged super
jumps/platform routes, including Chungus. No fighter movement was buffed.

## Shared Architecture

`dashball.js` still owns deterministic arena geometry, state, physics and scoring.
The boulder remains `state.ball`; the existing `extraBalls` collection contains
the small balls. Existing golden state, rings, hit generations, possession,
resource cooldowns and successful-hit callbacks are reused. A small per-object
physics selector prevents treating small balls as heavy just because the match
contains a Boulder meter. Small balls retain their ordinary shot behavior;
boulder hits remain additive native impulses divided by effective mass.

The boulder starts on the midfield floor. Small balls start in separated neutral
positions above it; their resets use the same neutral lanes. Only a scoring
small ball resets. Boulder, fighters, other balls and golden target remain live.
The target uses existing authored flight, final-hit ownership and attack damage.
Passive object contact never damages it. Its new health and respawn settings
are Total Rush-specific.

## One Score And Simultaneous Events

Continuous scoring keeps the existing 60,000 integer units per point and carried
fractions. Ring and snitch awards enter the same pending score ledger. All sources
resolve once at the end of the complete fixed step, including projectile awards
queued earlier in that step. No separate Boulder win condition remains.

If both teams reach the target in the same step, the greater resulting total
wins. An exact tie enters established sudden-death style overtime; the first
subsequent unequal scoring step resolves it. Ball array order does not choose
the winner. Over-target scores are retained, not arbitrarily clamped. Existing
standalone sports retain their previous resolution conventions.

The Boulder meter separately records territory income for the result breakdown;
it never overwrites the shared scoreboard. Victory stops objective scoring,
physics, target damage, AI, timers and fighter simulation through existing match
flow. Rematch recreates all objectives/resources at zero score and downward
gravity. Individual KO respawns never reset objectives or awards.

## Physical Interplay

Only Total Rush adds large/small circle collisions. Bounded shared microsteps
reuse the existing ball solver, with globally aligned fighter/terrain sampling.
Contact impulses use a 24x collision mass scale on the boulder's effective mass
(91.2:1 at defaults), making small balls rebound while moving the boulder only
slightly. This does not change the existing 3.8 attack-impulse resistance.
Relative inward velocity triggers restitution; sustained separating overlap
does not repeatedly add impulses. Floor pins separate sideways, terrain is
rechecked, seam contacts use nearest periodic positions, and velocity caps remain.
Collision corrections cannot arm ring entry; an actual field-side crossing is
still required. Held Spike balls do not participate until released.

Native bullets/arrows, shielding, Spike small-ball possession, giant deflection,
Kickoffs, reflection ownership, magazines and resource cooldowns remain shared.
No passive collision grants ammunition, dash resources or golden damage.

## AI

Deterministic, dynamic task allocation considers territory ownership, nearby
balls, snitch health, winning ring/snitch opportunities, teammate numbers,
mobility and native attack strength. Teammates distribute across objectives;
the roles are recalculated, not fixed character classes. Existing Boulder
approach/guard/overshoot planning and Golden Rush shot/hunt controls execute
these tasks using ordinary abstract inputs. Ring hunters route around the giant
and honor their calculated charge instead of the low-ring quick-shot cap.

The AI can play every objective but human playtesting is still needed for high
ring reliability, sustained snitch pursuit and team coordination. The neutral
opening can take more than ten seconds before the first territory score;
automated progress/determinism tests use a 30-second horizon, not a scripted
instant score. No AI-only movement, shots or forces were added.

## Verification And Packaging

- `tests/total-rush.test.js`: 24 groups for all objectives, charge/mass, native
  bullets/arrows and rewards, shield/possession, collisions/pins/wrap, score
  batching/ties, full friendly fire, KOs, respawns, all-core height access,
  dynamic roles, 30-second ten-CPU determinism, 1v1/3v3/5v5 replay/snapshots,
  delayed-input rollback, render purity, 30/60/120 Hz equivalence and clean reset.
- `tests/total-rush-before.json`: 2,940 immutable pre-change hashes, covering
  all previous sports, Versus and three prior strategic AIs. Historical fixtures
  are not regenerated. Appending the arena shifts Sandbag stage IDs only;
  old fixture comparisons normalize only those known metadata prefixes.
- New browser suite checks native setup/stage/lobby/countdown, controller and
  keyboard visual settings, all team modes/FFA, all thirteen core sprite models,
  flips/inverted gravity/KO visibility, screenshots at 1440/980 widths, ten-CPU
  frame pacing, cache bounds and unchanged simulation hashes.
- New real-WebRTC suite checks 50 ms delay, 15 ms jitter, 5% simulated packet
  loss, shared fractional scores, 300-point victory and complete rematch reset.
  Peers deliberately use different outline/glow preferences without desync.
- Core/source parity adds Total Rush; core browser tests retain controller
  joining/navigation, standard online, pause/rematch/disconnect and offline play.

Artifacts are in `artifacts/total-rush/`. The core-only builder retains thirteen
fighters, eleven combat stages and ten Dashball arenas, with the same 76
runtime PNGs / 23 embedded sheets. No new artwork or dependencies are needed.
`team-silhouette.js` is included in the static server route list and distribution.

An existing broad one-way-platform fixture initially mixed the new small balls
into its giant-ball setup. Its Total Rush branch now tests each ball type in
isolation so intentional giant/small collisions do not invalidate a platform-
filtering assertion. Older arena setups and historical baselines are unchanged.

Known historical issue: `tests/orbit-before.test.js` expects Rain's old balance
hashes and already failed before this work. Do not treat it as a new Total Rush
regression or replace its baseline. Balance, AI strategy and physical-controller
feel remain human playtests; automated checks are not subjective verification.

No Git repository exists. The pre-change checkpoint is
`exports/checkpoint-before-total-rush-and-outlines-2026-11-13.zip`; the full
development checkout and previous core releases remain intact.

### Initial Implementation Results

All 24 Total Rush groups and the native-mask suite pass. Eighteen existing primary
regression suites and nine additional fighter suites pass. Source/core parity
covers 2,400 identical frames and eleven restored replays. Existing rollback
stress: 7,440 independent frames, 1,047 corrections, maximum depth eight.

The exact package `exports/Dash-Punch-Total-Rush-Team-Colors-Final-2026-11-13`
passes native browser, real WebRTC and core/offline tests. All 76 PNGs and 23
embedded sheets load with no missing assets or page errors. Team preferences
differ between online peers while confirmed gameplay hashes match.

Ten-CPU Total Rush frame sample: median 16.7 ms, p95 16.8 ms; zero of 180 samples
above 25 ms. Same-scene warmed CPU draw benchmark: old-effects setting 0.3 ms
median / 0.5 ms p95, team outlines/glow 0.2 / 0.3 ms; no masks rebuilt during
either 60-draw sample. Timer precision and local hardware limit this comparison;
it indicates no observed regression, not a guaranteed performance improvement.
Outline cache stayed below 1,200,000 pixels. Physical controllers are unverified.

The historical Rain snapshot failure was rerun and remains in
`artifacts/total-rush/known-legacy-orbit-test.json`. No old fixture was rewritten.
The entire historical collection is therefore not described as fully green.

Changed runtime files: `dashball.js`, `game.js`, `server.js`, `index.html`; new
`team-silhouette.js`. Packaging/scripts: `tools/build-core-release.cjs`,
`package.json`, `playtest-release.json`. New Total Rush, silhouette and browser/
WebRTC suites plus pre-change fixture/helper; extended registry, platform-filter,
stage-index, simulation-harness and source/core parity tests. Documentation and
in-game/core patch notes updated. No new visual asset or dependency was added.
