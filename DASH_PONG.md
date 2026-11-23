# Dash Pong

Battle-only Pong with normal fighter gravity and combat. Blue defends the left
wall goal; Red defends the right. Use the existing Dash and Punch controls.
Select **Play > Dashball > Choose Fighters > Choose Stage > Dash Pong**.
Dash Pong Settings also appears on stage selection, including private online 1v1.

Both stages now include a small mirrored stone one-way perch beneath each
goal-side sconce: X136 / X1928, Y820, 176 wide and 20 thick. Fighters land on
top and pass upward from below; descending balls rebound at unchanged speed.
Goal openings, camera framing and chamber boundaries are unchanged. CPUs use
the actual one-second native super-jump hold to reach aerial play, not an
AI-only impulse. The lowest-mobility fighters still need deliberate routes.

## Moving Goals

Select **Dash Pong - Moving Goals** beside the original stage. It keeps the same
chamber, camera, ball tuning, combat, continuous scoring and best-of-three rules.
No switch or new input is needed.

Both goals mirror each other and stay within their own halves. They start at
the outer wall, slide to the ceiling, reverse through the wall to the floor,
and return. A full cycle takes 72 simulation seconds, including two-second
pauses at each wall/ceiling/floor stop. Smoothstep easing makes starts, stops
and reversals gentle. The dotted team-colored rails show the route; small
arrows or pause marks show its direction. Track bounds, cycle and pause are
centralized in `Dashball.pong.trackTuning`.

The 440-unit opening follows the perimeter continuously, spanning adjoining
edges while turning a corner. Shared goal segments drive ball-wall cutouts,
rendering, swept full-radius scoring, debugging and AI. The scoring surface is
an actual ball opening; fighters keep the chamber's continuous floor and walls.
Goals never reset fighter positions or the track. Rounds/rematches reset the
track to its opening wall position. Pauses and existing combat slow-motion
affect track movement with the ball, never through wall-clock time.

`state.pongTrack` holds current/previous simulation time in normal snapshots.
Existing private WebRTC stays 1v1 and requires matching build 86. CPUs lead the
moving enemy opening and distribute defense around their own live goal, using
ordinary movement and attack inputs. Original stage IDs and behavior remain.

Focused checks: `test:pong-track`, `test:pong-track-browser`, and
`test:pong-track-online`. The existing Dash Pong suite uses the actual
`6364019` export for this feature's regression comparisons. Screenshots and
short headless measurements: `artifacts/dash-pong-track`. Human playtesting
still needs to assess ceiling defense by heavyweights and the movement pace.

## Tuning

`Dashball.pong.tuning` and `Dashball.pong.defaults` in `dashball.js` centralize:

| Value | Default |
| --- | --- |
| Chamber | 2240 x 1280; floor Y1236; 44-unit walls |
| Goal opening | Y420-860, 440 units high |
| Goal planes | X44 / X2196 |
| Camera | Fixed .5 zoom, Y72 header (1.92x Ball Hell sprite screen height) |
| Ball | Radius 34; no gravity, drag or rolling friction |
| First hit | 520 units/sec |
| Subsequent genuine contacts | +55 units/sec |
| Speed cap | 1600; settings 800-2200, 100-unit increments |
| Round | 10 goals or 300 simulation seconds; tied time: next goal wins |
| Match | Best of three, first to two rounds |

Native strike/shield/contact response determines outgoing direction. The ball's
rally-speed ledger sets its magnitude, so a strong first hit cannot immediately
skip the approachable opening speed. Wall collisions do not advance the ledger.
Body/shield separation generations and existing attack IDs prevent overlap
farming. An idle fighter overlapping a fresh center spawn does not serve it.
Native Spike possession, Phantom intangibility, projectiles, spear surfaces,
Kickoffs, resources, friendly-fire settings and individual respawns remain.

## Architecture

- One new arena/state branch in `dashball.js`; reuse the shared ball microsteps,
  swept attack tests, goal planes and Battle rules. Goals use full-radius vertical
  clearance through the visible opening and an outward swept center crossing.
- Nonwinning goals replace only the ball. Health, attacks, resources, fighter
  positions and respawn timers persist. A round-winning goal freezes existing
  match flow instead of spawning another active ball.
- Normal round timer, overtime, tally, transitions, victory and rematch come from
  `match-flow.js`. No independent update loop or browser timers.
- Ball position/velocity, rally speed/hits and separation state serialize through
  existing sports snapshots. Host settings are included in signed match config.
  Current build 86 requires matching peers; online remains 1v1.
- CPUs predict short, reflected trajectories and distribute pursuit, goal defense
  and support roles, using only native inputs. No scripted shots or scores.
- Reused Flip Chamber artwork; shared renderer generates the actual stage preview.
  Pixel orb, velocity-based bounded trail, spawn ring, sparks and procedural
  hit/wall/goal tones are presentation-only. Existing audio replay dedup applies.
- Existing arena indexes remain stable; Dash Pong is appended after old stages.
  No dependencies, external art or packaging changes are necessary.

## Focused Checks

```sh
REGRESSION_BEFORE_DIR=/path/to/pre-change-git-export npm run test:dash-pong
npm run test:dash-pong-browser
npm run test:dash-pong-online
npm run test:match-flow
ROLLBACK_QUICK=1 npm run test:rollback
npm run check
npm run dev
```

The comparison groups explicitly skip without REGRESSION_BEFORE_DIR. This task
used the actual `6e444e9` Git export, not historical replacement fixtures.
Browser screenshots and measurements are in `artifacts/dash-pong/` (ignored).
The real WebRTC test uses an identical pre-start shot fixture to test a fast goal,
immediate stationary respawn, host cap synchronization, delayed input and rematch.

Human playtesting is still needed for goal height, initial center-ball access by
the lowest-jumping heavyweights, maximum rally speed and 5v5 goal defense. The
short headless benchmark is not a TV/physical-controller certification. Existing
historical Rain/Orbit fixtures remain untouched. No release or ZIP is produced.

Changed files: `dashball.js`, `game.js`, `sports-guide.js`,
`presentation-assets.js`, `package.json`, `tests/dash-pong.test.js`,
`tests/dash-pong.browser.test.js`, `tests/dash-pong-online.browser.test.js`,
`DASH_PONG.md`, `WORKFLOW.md`, `CHANGELOG.md`.
