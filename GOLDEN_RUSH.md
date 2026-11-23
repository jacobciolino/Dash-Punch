# Dashball: Golden Rush

A separate **Golden Rush - Four-Way Gravity** stage reuses this sport's scoring
and settings with a central four-direction switch and solid walking boundaries.
Ordinary Golden Rush keeps its wrapping sides and normal gravity. See
[GRAVITY_GOLDEN_RUSH.md](GRAVITY_GOLDEN_RUSH.md).

## Play

Open <http://localhost:8081/?v=golden-rush>, then **Play > Dashball > Choose
Fighters > Choose Stage > Golden Rush > Start Dashball**. Ready human seats in
the existing fighter lobby. CPUs work without manual readying.
**Golden Rush Settings** on stage select opens the mode's compact settings.
Controls remain direction, Dash and Punch. Both online players need this build.
This is a local-computer URL, not public hosting.

## Defaults And Rules

- First to **100** points. No timer by default; an optional timed match selects
  the leader or enters next-score sudden death on a tie.
- **Three** small independent scoring balls (adjustable 1-5). Each uses the
  existing ball physics, character-specific shots, Kickoffs, dribbling, shields,
  resource confirms and Spike possession. One Spike can possess one ball at a
  time; other balls deflect. Charged launch works on every ball, not just ball 1.
- Each team defends three rings: low **1**, middle **3**, high **5**. The complete
  ball must cross from the field-facing side. Own goals credit the opposing team.
  Rims are solid for balls; bodies and the golden target never trigger ring goals.
- Only the scoring ball resets to midfield. Other balls, fighters and combat
  continue. The existing shared reward cooldown prevents multiball resource farming.
- The golden target has **48 shared HP**, takes native melee/projectile/Kickoff
  damage, and rewards only the final hitter's team: **15 points** by default.
  No partial rewards or duplicate capture. It returns after **20 simulation
  seconds** (adjustable 5-60). This does not end play unless the score target is met.
- Native damage, charge, grounded power and Fired Up bonuses feed golden damage;
  character launch vectors feed its brief recoil. The target is not a Fighter,
  cannot be shield-captured, and never enters fighter stun/KO scoring.
- Battle combat and **friendly fire are always enabled** in this mode, even when
  the saved standard-game preference is Off. That preference is not overwritten.
- Fighters have **50% normal HP**. Default respawn **15 seconds**, with 10/15/20
  choices. Respawn restores reduced HP and normal resources, with **2 seconds** of
  protection. Throwing a Punch or executing a Dash ends protection early.
- Fighter KOs award no points. Eliminating an entire team does not end play.
- Results show ring points, golden captures and total score. Rematch restores all
  balls, golden health, players, resources and scores while retaining selections.

## Arena And Presentation

The new arena is 2800 x 2400, floor at 2240, with seven pass-through platforms,
wrapping sides and a solid roof. Mirrored side platforms are at
1720, 1240 and 760; the central platform is at 1480. Rings are centered at
y=1980/1320/620. Every installed fighter can reach successive platform tiers and
the high-ring band using their existing super jump. No character movement changed.

The shared camera follows fighters rather than the golden target, with smooth
zoom bounded between 0.25 and 0.48. Gameplay is clipped below the HUD. Offscreen
ball/golden indicators identify objectives without dragging the camera away.
The ten-player HUD retains native health, shields, dash resources and respawn
information, with team scores and golden health/respawn above it.

Original authored pixel art in `assets/dashball/golden-rush.png` contains team
rings, the gold target's winged crystal frames and a short score burst. Ring and
target sprites use integer 3x nearest-neighbor drawing; shiny red balls use the
authored 16x16 rush-ball.png at 2x. No new environment pack or dependency is needed.
Hit confirms use existing audio/feedback; the golden trail and score bursts are
cosmetic. Camera, drawing and effects do not alter authoritative hashes.

![Golden Rush arena](artifacts/golden-rush/full-arena.png)
![Ten-player match](artifacts/golden-rush/ten-players-3-balls.png)

## Implementation

`dashball.js` extends the existing ball step with an explicit ball parameter.
The original ball remains canonical; additional balls are a separate plain-state
array. Physics, possession and hit logic are not duplicated. Stable ball IDs
determine scoring order; ring events precede golden melee/Kickoffs, then native
combat/projectile processing. The first winning event stops subsequent scoring.

The golden target follows continuous, deterministic patrol curves with damped
steering, brief proximity evades and hit recoil. No uncontrolled randomness,
teleports, Canvas state or wall-clock time controls its movement. Per-attack hit
records prevent repeated damage from lingering hitboxes. Target health, patrol,
respawn, balls, score statistics and individual fighter respawns serialize through
existing snapshots and rollback. The normal online start countdown is retained.

AI divides attention between balls and the golden opportunity. It reuses existing
input generation, character-specific shot/bank estimates, native Punch/Dash,
shield interceptions and super-jump routing. Nearest teammates get the initial
golden pursuit, while others favor different balls. There is no new AI engine.

## Validation

- **25 Golden Rush test groups passed:** 1/3/5 scoring, whole-ball/directional
  entry, own goals, independent reset, no carried/target ring score, per-ball
  hit records, shared reward cooldown, secondary-ball Spike charged launch,
  shared golden health/final hit, respawn, stable flight, native projectiles and
  Kickoff damage, simultaneous events, immediate victory, timer/overtime,
  countdown freeze/release, forced native friendly fire, reduced HP, fighter
  respawn, team wipe without victory, all-fighter platform access, rematch,
  native melee/projectile confirms, snapshots and six-frame delayed rollback
  containing real ring scores and fighter/golden respawns.
- Independent ten-CPU simulations match hashes. One full default mixed-roster
  5v5 run ended **96-109 after 231.92 active seconds**, with 16/29 ring points
  and four golden captures per team. This is one playtest, not a balance guarantee.
- Browser tests passed virtual-controller stage selection, six-ring preview,
  all setting controls, smaller-window layout, loaded sharp art, render purity,
  results and rematch. Ten fighters with three and five balls: median **16.7 ms**,
  p95 **16.7-16.8 ms**, **0/180** frames above 25 ms in short samples on this Mac.
- Real WebRTC tests passed ring and golden capture victories, prediction
  corrections, matching confirmed hashes and rematches at 50 ms artificial
  one-way delay, 15 ms jitter and 5% packet loss.
- Existing **29 Dashball** and **24 Target Break** groups pass. Hit interruption,
  Spike, reflection/parries, Micro USB, DefiPlate, Chase, shielding and online-state
  regressions pass. The canonical 1,440-frame combat baseline remains exact.
- Full existing rollback suite: **6,720 independent frames**, **1,047 rollbacks**,
  depth up to eight; 480 packets with 20 simulated drops and rematch pass.
  Core export checks pass 1,170 unchanged frames, eleven replays and both
  ten-fighter arenas; the new sheet is included automatically. No baseline updates.

Test commands: `npm run test:golden-rush`, `npm run test:golden-rush-browser`,
`npm run test:golden-rush-online`. Browser tests use Playwright and Chrome.

## Limitations And Follow-Ups

- Local supports 1v1 through 5v5; existing online transport remains **1v1**.
- Balls deliberately do not collide with one another, as allowed by the spec.
- AI is playable rather than expert: coordinated passing, goalkeeper roles and
  advanced multi-objective tactics are future polish. Golden rewards currently
  dominate the demonstrated AI match; no unrequested character rebalance was made.
- Physical controllers and separate home-network computers were not exercised.
  Virtual pad navigation and isolated real browser peers were tested.
- Existing arenas, standard combat and experimental content remain available.
  All PvP sports now share the 50% HP, 15-second respawn and 2-second protection
  defaults in `sports.js`; see `SPORTS_POLISH.md` for the subsequent shared pass.
- This folder has no Git repository. Recoverable patch archives are under
  `artifacts/golden-rush/checkpoints/`; previous ZIPs and checkpoints are untouched.
  `final-validated.tar.gz` contains the final changed files and screenshots,
  not a second copy of the game's unchanged licensed assets.

## Changed Files

- `dashball.js`: mode settings, arena, shared multiball stepping, rings, golden
  flight/combat/reward/respawn and serializable state.
- `game.js`, `styles.css`: existing input/combat/resource integrations, AI,
  camera, preview, settings, HUD, results, effects and verified patch notes.
- `assets/dashball/golden-rush.png`, `tools/build-golden-rush-art.cjs`: original
  reproducible pixel art using the existing PNG helper.
- `tests/golden-rush*.js`: mode, browser and online coverage.
- `tests/dashball.test.js`, `tests/dashball.browser.test.js`,
  `tests/target-break.browser.test.js`: five-entry pool expectations while
  preserving all prior assertions for existing modes.
- `package.json`, `README.md`, `DASHBALL.md`, `TARGET_BREAK.md`, this report:
  test commands, launch flow and implementation notes.
