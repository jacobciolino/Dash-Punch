# Boulder Control

## Play

Play > Dashball > Choose Fighters > Choose Stage > Boulder Control.
Battle-only, as requested during development. Selecting it from a Court setup
automatically selects Battle; its settings do not offer Court. Existing Court
rules, layouts and controls in other sports are unchanged.

Local humans/CPUs: 1v1 through 5v5. Existing private WebRTC rollback: 1v1 only.
Use the same direction, Dash and Punch controls. No fighter abilities added.
Score by controlling territory, not by eliminating opponents or scoring goals.

## Arena And Tuning

| Setting | Default | Bounds / Notes |
| --- | --- | --- |
| Winning score | 100 | 10-500 |
| Match timer | Unlimited | Optional 0-3600 seconds |
| Boulder diameter | 540 | 462-612 in six-unit increments; 3.5x Chungus height |
| Effective mass | 3.8 | 2.5-7; attack impulses divided by mass |
| Gravity | 760 | Existing shared gravity direction; no levitation |
| Maximum speed | 1700 | Existing speed limiting, no per-hit reset |
| Restitution | 0.58 | `boulderBounce`, 0.35-0.8 |
| Ground friction | 0.2 | Gentle momentum loss on supported contacts |
| Scoring zone width | 23% each | `zoneWidth`, 20-27% |
| Bonus height above floor | 900 | `bonusHeight`, 800-1200; diameter clearance enforced |
| Arena | 3000 x 1980 | Widens automatically if size/zone tuning requires it |
| Ground top | Y=1820 | Continuous floor; solid ceiling at Y=24 |
| Camera | Fixed upright, 0.28 | Zoom bound also fits wider custom arenas |

Left to right: Blue dead zone (9%), Blue scoring zone (23%), neutral midfield
(36%), Red scoring zone (23%), Red dead zone (9%). Blue is team 1, Red team 0;
only this stage reverses the usual left/right spawn presentation. Team ownership
still uses the existing team IDs and colors. Five separated spawns per side.

Two solid bonus platforms are 108 units wide, at Y=920 by default, leaving 872
units of clear space underneath for the 540-unit boulder. The neutral perch is
132 units wide at Y=640. Chungus can reach the bonus platform's height with his
existing super jump and air dashes, then use it to reach the high perch. Custom
extreme height settings may be harder for slow fighters; no movement was buffed.

Boulder Settings exposes score, timer, team size, size, weight, sports HP and
respawn choices. Bounce, zone width and bonus height are bounded, serializable
`Dashball.options` properties rather than extra menu pages.

## Physics And Interactions

The boulder uses the existing ball state, fixed-step loop, wrapping and terrain
collisions. Hits add their existing character/charge/launch impulse divided by
mass to current velocity. No combo multiplier or attraction to scoring zones.
Electric follow-up pulses use their existing reduced launch strength. Melee
contacts test the real circle against the authored attack polygon, not a giant
invisible square. Each attack/contact generation registers once; cleanup retains
live lingering attacks. Simultaneous attackers process in stable fighter order.

Collision substeps travel at most roughly 8 units at the normal simulation step,
bounded to 64. Contact responses only reflect inward relative velocity; floor,
ceiling, platform edges and narrow ledges use existing circle/rectangle rules.
The giant object displaces fighters instead of teleporting itself by their full
penetration depth. Floor/ceiling pins resolve sideways. It is not an extra
ground-resource platform; resource refills still require normal valid events.

Shielding safely deflects it with existing directional coverage. Spike cannot
pocket the giant boulder; this size-specific interaction is deflection, not
Soccer's small-ball possession. His shield against fighters and small-ball
possession in every existing sport are unchanged. Dangerous launched contacts
reuse ordinary sports knockdown, at most once per fighter per distinct launch.
No boulder HP, hitstun, elimination or new fighter state machine.

Punches keep existing successful-hit cancellation/recovery/resource hooks.
Kickoffs use normal rebound and one-dash reward, with the existing 0.22-second
object-reward cooldown. Body/shield overlap never farms resources. Bullets,
arrows, reflect ownership, active caps, magazines and lifetimes remain shared.

Fighters, projectiles and the boulder wrap with momentum/state intact. Previous
positions shift with the seam to prevent cross-field swept contacts. Boulder
render copies clip at the arena edges. Spin remains simulation state; the static
pixel sprite is not smoothly rotated or distorted.

## Scoring And Match Flow

Center X selects one zone, with inclusive left/exclusive right bounds. Center Y
strictly above that zone platform's top earns 2/s; at/below earns 1/s. Contact
with a platform is irrelevant. Neutral field, dead zones and out-of-range centers
award nothing. Last hitter does not determine scoring ownership.

Scores use 60,000 integer units/point plus carried sub-unit fractions. Time is
counted once per collision substep, never per collision or fighter. The HUD shows
one decimal, team ownership and the active rate. First to the target ends play
immediately; no goal reset interrupts control. Simultaneous movement/scoring is
ordered by simulation microstep. Optional timed ties use next-control overtime.

Shared sports Battle rules remain: 50% HP, independent 15-second respawns
(10/15/20), full starting resources and 2-second protection ending on offense.
KOs give no points, team wipes do not end play, and respawns do not reset the
boulder or scores. Rematch restores the selected settings and a fresh midfield
boulder; leaving the mode does not leak its radius, scoring or rules elsewhere.

## AI And Presentation

CPUs predict placement/overshoot, compare native Punch/Kickoff impulses, and
approach from a useful striking side. Closest teammates contest; others guard,
intercept, climb or disrupt opponents. They stop unnecessary hits when their
zone is secure, attempt occasional bonus lifts, and route above the boulder.
These are regular abstract Dash/Punch inputs, not scripted forces or resources.

Neutral court, Blue/Red territory bands, upper bonus bands and dashed thresholds
show the five regions without nets. Existing sprites, attacks, elimination/HUD
and audio remain. A single 180x180 transparent 16-color pixel-art boulder is about
4 KB; nearest-neighbor rendering only. No new rendering dependency or background
pack. Asset: `assets/dashball/boulder.png`; built-in image generation, then
nearest-neighbor runtime export and transparent-border trim. Prompt provenance:
`artifacts/boulder-control/asset-prompt.txt`.

## Checkpoints, Validation And Limits

Before interruption: arena, additive physics, territory scoring, wrapping,
Battle-only integration, CPU logic and initial tests were already implemented.
The resume preserved those systems, corrected the missing live-aim/super-jump
test setup, made the first platform reachable by Chungus, and completed visual,
native menu, online and release verification. There is no Git repository here;
the pre-change ZIP is `exports/checkpoint-before-boulder-control-2026-11-13.zip`.

Focused suite: `tests/boulder-control.test.js`. Browser and real WebRTC checks:
`tests/boulder-control.browser.test.js` and
`tests/boulder-control-online.browser.test.js`. Results/screenshots are under
`artifacts/boulder-control/`. Historical fixture files were not regenerated.
The new pre-change fixture checks 1,920 frames across every prior sport/Versus;
only the one-position Sandbag stage-ID shift is normalized, not gameplay fields.

One existing synthetic one-way-platform test assumed all balls were small.
Only its Boulder branch now starts outside the platform and allows time for a
540-unit object to pass through; all older arena setups are unchanged.

Human playtest concerns: match length to 100, weight versus weak fighters,
coordinated bonus juggling, and CPU role/overshoot decisions. Precise balance on a
narrow platform is physically possible; no artificial force knocks the boulder
off. Heavy fighters benefit from the intermediate platforms. Physical controller
feel has not been verified by automated tests. Online capacity remains 1v1.

### Verified Results

- 24 Boulder Control groups pass, including 1v1/3v3/5v5, live native projectiles,
  score boundaries, mass/combos, collisions, resources, AI, host snapshots,
  30/60/120 Hz fixed-step equivalence and delayed-input rollback.
- Existing Gravity Flip Soccer (18), Dashball (29), projectile magazines (8),
  Kite movement (10), Target Break (24), Golden Rush (25), Sandbag (16), sports
  updates (7), online state, gravity rendering, Orbit animation and shield
  pressure pass. The initial small-ball-only regression fixture failure was
  corrected for the new giant object, without changing older arena setups.
- Historical comparisons: 1,920 pre-Boulder frames, plus the existing 720-frame
  Soccer/Flip and 3,360-frame fighter checks. No historical baseline regenerated.
- Existing rollback stress: 7,200 independent frames, 1,047 corrections, maximum
  rollback depth 8. Core/source parity: 2,220 frames and 11 restored replays,
  now also covering Gravity Flip Soccer and Boulder Control.
- Final core browser: all 76 PNGs and 23 embedded sheets load. Controller join/
  navigation, ten-player Versus, standard online, pause/rematch/disconnect and
  offline file play pass. Gamepad checks use emulation, not physical hardware.
- Final Boulder browser: native lobby/countdown and saved size/weight settings;
  neutral/bonus/wrap screenshots at 1440- and 980-pixel widths; sprite-center
  pixel checks; no missing assets or console errors. Ten CPUs: median 16.7 ms,
  p95 16.8 ms, zero of 180 sampled frames above 25 ms. Not a hardware guarantee.
- Real WebRTC: 50 ms delay, 15 ms jitter, 5% simulated packet loss. Matching
  confirmed hashes, fractional scores, 100-point victory and rematch pass.

Completed after resume: all remaining implementation, testing and core packaging.
Nothing is blocked; balance and physical controller feel remain human playtests.

Changed code: `dashball.js`, `game.js`, `tools/build-core-release.cjs`,
`package.json`; new `assets/dashball/boulder.png`. New Boulder tests and fixture;
extended registry, large-ball platform and core-parity tests; updated Dashball
docs, README, patch notes and `playtest-release.json`. Existing experiments are
retained in source but absent from the new core distribution.
