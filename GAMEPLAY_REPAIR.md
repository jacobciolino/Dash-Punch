# Gameplay Repair Pass

## Scope and Checkpoint

Existing HTML/JavaScript, fixed-step combat, two buttons, 14 fighter definitions,
stage geometry and online 1v1 capacity are retained. Local sports remain 1v1-5v5.
No new dependency or physics engine. The requested changes are isolated to sports
physics, sports AI, shared collision hooks and presentation.

No Git repository exists. Pre-change source checkpoint:
`exports/pre-gameplay-repair-2026-11-13.zip`. The prior playable Charged Recall
release is retained. Historical JSON fixtures have not been regenerated.

## Root Causes and Repairs

### Boomerangus

The reproduced exception in the original offline HTML was a Chrome Canvas
`SecurityError` at `getPixelGridSheet`, called from weapon drawing. Local external
images taint a canvas; a CPU pixel read then aborts the animation loop. The
already packaged Charged Recall release embedded that sheet and did not reproduce
this error. The no-palette-reduction, hard-alpha nearest-neighbor pass now avoids
unnecessary CPU readback entirely. The weapon remains visible and functional.

Charged Recall, finite steering, wall turnaround, catches, reflection ownership,
one-weapon availability and cleanup are retained. `boomerang.js` and all fighter
data are unchanged. The pre-change simulation soak ran 40 seconds of ten mixed
CPUs in Versus, all 15 Dashball stages and Sandbag without an exception; this does
not claim every possible runtime failure was reproduced.

### Goals and Hoops

The old leading-edge latch plus later trailing-edge clearance required multiple
perfect frames. Some checks used the final height rather than the height at the
crossing. Floor/body correction guards also rejected legitimate low shots.

Scoring now uses a shared swept center-plane crossing, interpolating transverse
clearance and moving-goal height at the actual crossing. The full ball radius
must fit across the opening. Direction, ownership and point values remain.
Basketball requires downward entry through the open top. Field Goal remains an
above-crossbar lateral crossing, not a basket; its frame is visual-only and its
scoring flow remains continuous. Collision corrections can stop or retreat a
shot, but cannot invent extra travel through a scoring plane. Wrap normalization
applies to both endpoints. Stationary overlap and rear entries do not score.

Append `?scoreDebug=1` to enable ball radii, physics geometry, traveled paths and
scoring planes. Ordinary play keeps overlays off. This preference does not enter
snapshots or simulation hashes.

### Edgebert

Native opener contact was confirmed, but the low 200/240 fighter-knockback values
produced very weak ball nudges. Old tests called the shot hook directly rather
than exercising native contact. Sports attacks now sweep relative ball/fighter
motion, and repeat body-contact frames separate overlaps without farming impulses.
Edgebert's sports impulse bases are 580 / 720 / 1040 before existing charge,
ground and damage contributions. Versus stats, hitboxes, range and frame data
remain unchanged. Each new legitimate combo attack has its own hit generation.

### Golden Target and Golden Rush

Previously flight steering immediately overwrote impact momentum, with no
hitstun. Now the target has a 36-unit collider (previously 27), 0.45-second base
hitstun plus up to 0.1 charge bonus, 0.75 per-hit stun decay, and a 0.35-second
stun-recovery window after six consecutive hits. It still takes damage in that
window. Repeated callbacks for one attack generation do not deal damage again.
Hitstun suspends evasion, preserves launch momentum with 1.1/s drag and 360
gravity, and uses ordinary terrain rebounds. Patrol resumes with bounded
520-unit/s² acceleration and a 500-unit/s target speed, not an instant escape.
Health, points and respawn settings are unchanged in Golden Rush and Total Rush.

Golden Rush defaults to ten balls, adjustable 1-12. Deterministic spawns cover
the six side platforms, middle platform and floor lanes, with no spawn overlaps.
Low/mid openings are 420 high; high openings are 380 high, with artwork aligned
to these openings. Their points remain 1/3/5. Total Rush retains its independent
1-5 ball configuration and ring scoring values.

### Boulder Physics and Traversal

Kickoff impulse transfer is 45% of the former value. Same-direction impulses
diminish with current speed; counter-hits retain braking power. Mass stays 3.8
by default. Default speed cap is 1100, restitution 0.46, horizontal wall bounce
at most 0.35, and grounded rolling resistance 0.65/s. All boulder modes share
these rules, preserving their distinct gravity, territory and score rules.

Angular velocity follows vx/r on ground (opposite sign on the ceiling), with
12/s grip, 0.08/s airborne angular drag and a 6-radian/s bound. Rendering caches
32 nearest-neighbor rotations of the existing boulder image; no new art is needed.
This is a deterministic rolling approximation, not a new rigid-body solver.

Curved support and side proxies feed existing landing and wall-cling logic.
Standing fighters ride translation, can move/jump/dash/attack, and use stable
surface identities. Side clings use ordinary inputs and wall-resource rules.
Fast unestablished side impacts remain dangerous. Crushing clearance is checked
against terrain; ordinary flattening/air-launch behavior is retained. Walking
does not transfer momentum into the boulder. Tiny near-rest contact gaps are
recognized so Total Rush's finer substeps do not weaken rolling resistance.

## AI

Native-input AI values the new impulse response, avoids rapid ineffective
Kickoffs, can guard from the boulder or wall-jump from its sides, distributes
ball pursuit and leads/combo-attacks a stunned golden target. No AI-only physics,
movement, scores or resources were added.

## Verification

Results, screenshots and unfiltered regression logs are recorded in
`artifacts/gameplay-repair/`.

- All 21 focused repair groups pass: native Edgebert contacts, swept scoring,
  snitch combos, boulder traversal/crushing, wrapping, live-state snapshots,
  six-frame delayed rollback, rematches and 30/60/120 Hz render equivalence.
- All 14 fighter definitions and 90 Versus frames per fighter match the previous
  playable release. Original Flip Chamber retains its exact 240-frame fixture.
- Real WebRTC checks pass for Soccer, Basketball, Golden Rush, Boulder Control,
  Gravity Flip Boulder Control and Total Rush, including rematches and the new
  rider state. Confirmed hashes agree with 50 ms delay, 15 ms jitter and 5% loss.
- The existing Charged Recall online check also passes in Versus and Soccer:
  recall charge, one-weapon limit, no automatic rethrow and rematches.
- Existing keyboard/synthetic-controller tests pass for remapping, analog and
  digital triggers, simultaneous bindings, partial release and reconnection.

The full historical suite is not entirely green. Older frame-hash comparisons
include the old three-ball Golden Rush state, old snitch state and old boulder
physics; those comparisons fail after these explicitly requested replacements.
They remain enabled, with their historical JSON fixtures unchanged. Functional
assertions for deliberately changed tuning were updated, not the replay baselines.
The separate pre-existing Rain/Orbit historical fixture discrepancy also remains.
New native-input, rollback, prior-release Versus and original Flip checks provide
current behavioral coverage without pretending the old sports hashes still match.

### Remaining Playtest Limits

Physical controller feel, subjective balance and long-session performance need
human testing. Browser benchmarks are short headless software-Chrome runs, not a
hardware guarantee. Saved match options remain selected; existing custom ball
counts can be changed under Golden Rush Settings > Scoring Balls. Online remains
private 1v1, not networked 5v5. Boulder rolling
is an approximation; riders inherit translation, not a full rigid-body treadmill.
Golden Rush keeps its existing adaptive camera and offscreen indicators: upper
hoops can leave the viewport when everyone is on the floor. No camera redesign
or unrelated fighter rebalance was performed.

## Changed Files

- `game.js`: safe weapon rendering, boulder terrain/carry hooks, native sports AI,
  rolling/snitch/ring rendering, optional geometry overlay, patch notes/build ID.
- `dashball.js`: swept scoring, sports contact sweeps, Edgebert object impulses,
  shared snitch combat, Golden Rush distribution/openings, heavy rolling physics.
- `tools/build-core-release.cjs`: core patch notes and release documentation.
- `package.json`: repair simulation/browser/online test commands.
- `tests/gameplay-repair*.js`: focused simulation, browser and real WebRTC checks.
- Existing `boulder-control`, `gravity-boulder`, `total-rush`, `golden-rush`,
  `edgebert-combo` and `sports-update` tests: assertions/fixtures for the explicitly
  requested current rules only. Historical replay JSON files are untouched.
- `playtest-release.json`: points to the new core-only distribution.

The weapon simulation module, shared sports rules, Sandbag module, Target Charge
module, sprite assets and existing presentation-asset registry are unchanged.

### Full Regression Status

39 simulation/build scripts were run: 29 exit successfully, including the new
21-group repair suite; 10 retain failing final historical-hash comparisons.
The 38 pre-existing scripts therefore finish 28 passing / 10 failing. The final
failures are not suppressed:

| Script | Passing Groups Before Final Failure | Historical Comparison That Fails |
| --- | --- | --- |
| charged-recall | 14 | Old Boulder Control state |
| sports-refinements | 11 | Old Golden Rush Battle state |
| boomerangus | 17 | Old Golden Rush Court state |
| target-charge | 19 | Old Golden Rush Court state |
| open-soccer | 20 | Old Golden Rush Court state |
| total-rush | 23 | Old Golden Rush Court state |
| field-goal | 19 | Old Golden Rush Court state |
| gravity-boulder | 22 | Old Golden Rush Court state |
| boulder-control | 23 | Old Golden Rush Court state |
| gravity-soccer | 17 | Old Soccer contact/scoring state |

Separate current Golden Rush (25 groups), Edgebert (13), Dashball (29), Target
Break (24), Sandbag (16), Total Rush balance (14), magazines, projectiles, Kite,
shield pressure, team silhouettes and sports rendering pass. The shared rollback
suite passes 8,280 independent frames and 1,047 rollbacks. Core packaging passes
3,390 full/core parity frames, 11 replays, 14 fighters and 26 embedded sheets.
Two native-Canvas tests initially lacked library paths; both pass when pointed at
the already bundled Canvas/Sharp libraries, with the initial logs retained.

The separately run `orbit-before.test.js` still fails on the previously reported
Rain historical data. An independent 120-frame comparison against the pre-change
source checkpoint is exact (first hash `7a06d4ad` in both, versus historical
`cbe4c779`), confirming that mismatch predates this patch. No attempt was made to
regenerate that fixture.

## Release and Browser Results

Core-only offline ZIP:
`exports/Dash-Punch-Gameplay-Repair-Release-2026-11-14.zip` (7,506,232 bytes).
SHA-256: `f478da0b6e91b4446d9012140135bcc0297009cad7273b29ede6c9fbda42eea2`.
The archive passed integrity checks and contains no tests, tools, dependencies or
development-only files. Preview: `http://localhost:8080/`. Both online peers need
network build `dash-punch-rollback-45-gameplay-repair-core-1`.

The final release passed Chrome browser checks:

- All 14 roster selections and native attacks; Boomerangus in every Dashball stage
  at 1v1, 3v3 and 5v5, plus all three Sandbag rulesets.
- Real scoring, ten-fighter standing/inverted boulder scenes and render-only
  geometry overlays at 1920x1080 and 1280x720 viewports, with nonblank canvas checks.
- Original offline HTML's Boomerangus weapon path; all 14 fighters in the packaged
  offline HTML. Zero browser exceptions and missing assets.
- Keyboard setup: Golden Rush defaults to 10 balls, clamps at 1 and 12, and fits
  1280x720 without horizontal overflow.

Ten native-CPU benchmark, 240 animation intervals per case after warmup:

| Case | Median | 95th Percentile | Intervals >25 ms |
| --- | --- | --- | --- |
| Golden Rush, 3 balls | 16.7 ms | 16.7 ms | 0 |
| Golden Rush, 10 balls | 16.7 ms | 16.7 ms | 0 |
| Total Rush, 3 small balls + boulder | 16.7 ms | 16.7 ms | 0 |

This compares ball-count loads in the repaired renderer, not a controlled old/new
hardware benchmark. Peak active weapons were 2-3 in these short natural-AI runs;
this is not a maximum-projectile or long-session stress guarantee. Representative
screenshots: `artifacts/gameplay-repair/ten-cpu-golden-rush-10.png`,
`boulder-1280.png`, `inverted-1920.png` and `golden-settings-1280.png`.
