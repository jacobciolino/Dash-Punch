# Volleyball

Volleyball is a separate `volleyball` Dashball stage. Select Play > Dashball >
Choose Fighters > Choose Stage > Volleyball. Volleyball Settings on stage select
offers Court/Battle, team size, winning score, timer and existing Battle options.
The normal player cards, shared menu controls and best-of-three matches remain.

## Rules

- The ball touching a team's floor awards one point to the opponent, independent
  of last touch. Floor contact is checked before collision bounce/correction in
  the existing fixed-step ball substeps, including fast and shallow shots.
- The normal 1.2-second point celebration and two-second countdown reset the
  rally. Service alternates left/right after every point, regardless of scorer.
  A round starts with the left team serving. Serve position is one-quarter or
  three-quarters court width, 260 units above the floor, with initial VY -220.
- Court disables PvP damage/KO. Battle keeps existing combat, friendly-fire
  preferences, reduced health, independent respawns and protection. KOs award no
  volleyball points and do not stop the rally or end the sports round.
- Both rulesets keep full fighter bodies on their own halves, including above
  the net and during dashes/knockback. Battle attacks can reach across the net.
  Phantom is constrained before materialization, not after a forbidden strike.
- Default: 11-point rounds, five-minute timers, first to two round wins. Existing
  timer choices, overtime, round transitions, rematches and victory sprites apply.

## Tuning

Values are isolated in `VOLLEYBALL_DEFAULTS` and `VOLLEYBALL_TUNING` in
`dashball.js`. No fighter stats or other sports' physics are retuned.

| Property | Value |
| --- | --- |
| Arena / floor | 2880 x 1440 / Y1280 |
| Net | 20 wide x 420 high, centered, physical |
| Ball radius | 26 |
| Ball gravity | 1850 units/sec squared |
| Maximum speed | 2300 units/sec |
| Restitution | 0.76 |
| Ground friction | 1.2 |
| Ordinary-shot horizontal scale | 0.78 of the fighter's native sports impulse |
| Ordinary-shot upward assistance | 1350-1850 units/sec, scaled by native power |

Explicit downward attacks retain downward trajectories. Native charge,
projectile characteristics, Kickoffs, shields, Spike possession, hit IDs and
resource cooldowns remain. Phantom's materialization profile bypasses upward
assistance and retains its low 120-unit impulse; ghost travel cannot touch balls.
The existing crisp neutral soccer-ball sprite is reused; no new art dependency.

Side walls reflect the ball even above the visible court. There is no roof,
upper clamp, downward impulse or upper teleport. Downward gravity returns high
shots naturally. The fixed upright camera stays on the normal court; small
top-edge indicators track high fighters and the neutral ball below the HUD.

## CPU Play

The existing native-input AI receives a Volleyball planner. It predicts a
gravity-based landing position with reflected side-wall paths, chooses a nearby
receiver and spreads teammates across defensive home positions. Receivers loft
normal attacks toward the opposite court and use ordinary movement/jump/dash
inputs. Both sides contest a ball centered over the net, including a ball
temporarily balanced on top. Battle CPUs can attack nearby opponents across the divider. No scripted
scores, forced ball motion, perfect interception or CPU-only abilities are used.

## Validation

Final result: all 51 focused Volleyball tests passed. Browser checks passed at
720p and 1080p, including the freshly extracted ZIP. Court and Battle both
passed real WebRTC rollback and rematches. Ten-CPU browser frame intervals were
approximately 16.7 ms median and p95 in the short software-Chrome run.

`tests/volleyball.test.js` covers geometry, floor points, high-speed net/wall
contacts, open-top returns, alternating serves, Court/Battle combat, all 15
fighters, native projectiles, Spike, Phantom, all team sizes, CPU roles,
snapshots, replay, delayed rollback, actual 30/60/120 Hz simulation and resets.
`tests/volleyball.browser.test.js` checks stage selection and previews, settings,
720p/1080p play, mixed ten-fighter teams, high-ball tracking and offline play.
The existing online browser suite tests both Volleyball rulesets with real
WebRTC, 50 ms input delay, 15 ms jitter, 5% simulated packet loss and rematches.

Prior fighters and modes match the previous Phantom release over 5,400 sampled
frames in 48 cases. Relevant existing match-flow, goals, magazines, Golden Rush,
Sandbag and Total Rush balance tests passed. Historical fixtures were not
regenerated. The older sports-guide test still expects pre-float-update ball
values (1050/0.73/1.35 instead of 900/0.84/0.95); the known Rain/Orbit historical
discrepancy and other previously documented fixture gaps remain unrelated.

Screenshots and reports live in `artifacts/volleyball/`, not the release ZIP.
The project is not a Git repository; the pre-change checkpoint is
`artifacts/volleyball-before-2026-11-16.zip`.

Core-only release: `exports/Dash Punch V1 - 2026-11-16 - Volleyball.zip`.
Local preview: `http://localhost:8090`. Extract the full folder and open
`index.html` to play offline. All required assets and licenses are included;
development files and experimental content are omitted. Earlier ZIPs remain.

Human playtesting is still needed for rally length, net height, CPU choices and
the balance of cross-net attacks. Automated checks do not verify physical
controller feel. Browser frame measurements are short headless observations,
not a hardware performance guarantee.
