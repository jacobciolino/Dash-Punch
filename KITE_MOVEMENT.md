# Kite: Slow Drift, Powerful External Launches

## Diagnosis

The previous air dash still launched at 528/847 units per second (tap/charged),
then applied up to 2500 units/s squared of steer acceleration for 0.66 seconds.
Its speed ceiling used currentSpeed * .96 * 1.1, allowing the ceiling itself to
grow every step. Holding Up reduced airborne gravity from 220 to just 66, so
the resulting upward momentum persisted for a long time. Free drift accelerated
at 2000 toward 330 units/s. Seven normal dashes and inherited momentum amplified
the effect. Dash resources, duration checks and position integration were not
bypassed; there was no Kite teleport or direct position-changing branch.

## Final Values

| Property | Before | Now |
| --- | --- | --- |
| Air dash scale | .82 | .56 |
| Air dash impulse, tap / full | 528.408 / 847.06 | 360.864 / 578.48 |
| Impulse relative to Anchor | 80% / 86% | 54% / 58% |
| Steering duration | .66 seconds | .30 seconds |
| Steering acceleration | 2500 | 320 units/s squared |
| Steering speed-ceiling multiplier | 1.1 | 1.0, no growing ceiling |
| Free drift target / acceleration | 330 / 2000 | 110 / 220 |
| Neutral drift brake | 1800 | 100 units/s squared |
| Passive air gravity / Up gravity | 220 / 66 | 686 / 617.4 |
| Controlled descent / Up descent | 160 / 55 | 360 / 280 units/s |
| Full-charge fall multiplier | .4 | .85 |
| Extra voluntary-dash drag | none | exp(-1.4 * dt) |
| Forward dash momentum inheritance | shared additive carry | none on Kite air dashes |
| Lateral carry on air dash | shared carry | 10%, bounded to 10% of the new impulse |
| Air dashes / active carry window | 7 / .62 seconds | unchanged |
| Minimum Kickoff speed | 327.61296 | 223.73568, same native .62-of-tap formula |

686 is 70% of Kite's original 980 gravity baseline. Grounded dash launch values,
universal super-jump impulse, wall-sling mechanics, launch bias, attack properties,
health, hitstun, juggle drag, terminal-velocity rules and defensive meters remain.
The free drift target is not a global velocity cap.

## Momentum Separation

The optional Kite-only floatMotion state distinguishes his own air burst from
external launches. Extra drag applies only to self-generated tangent/upward
motion. It never brakes gravity-generated descent. A weak new voluntary air dash
does not stack forward momentum onto itself or inherit an unlimited lateral speed.

Hits, stuns, shield recoil, clashes and Kickoffs mark external momentum. They
bypass the voluntary drag, air-walk braking and controlled-descent limiter, even
after hitstun ends. Their existing airborne gravity of 220 is retained, including
normal juggle gravity scaling. Thus restoring stronger everyday gravity does not
reduce enemy launch impulse or shorten its established hitstun flight.

Landing clears provenance; choosing a new air dash deliberately starts a new
self-powered burst. Respawns and round resets also clear provenance. Existing
intentional Dash-charge braking and hitstun DI remain available under normal rules.
No new global speed clamp, position movement, thrust mode or dependency was added.

## Measured Travel

Measured at 60Hz in open air, with direction held and no terrain contact:

| Measurement | Before | Now | Standard Anchor |
| --- | --- | --- | --- |
| Tap horizontal travel in 1 second | 654.5 | 201.0 | 716.2 |
| Charged horizontal travel in 1 second | 802.9 | 289.0 | 947.2 |
| Upward tap peak rise | 1553.1 | 82.9 | - |
| Charged upward peak rise | 1616.9 | 159.7 | - |
| Neutral fall in 2 seconds | - | 627.5 | 1941.3 |

Actual collisions, DI, charge, walls and combat interactions change these distances.
Chungus's charged test hit retains its exact 1877.9904 launch velocity and 1.836s
hitstun; the subsequent 90-step flight and upward floor bounce match the old
attack flight exactly. A separate external-launch test travels 2094.8 horizontal
units in two seconds and still moves at 653.8 afterward, far above Kite's own
110-unit/s drift target. External attacks are not capped to voluntary movement.

## Tests And Packaging

tests/kite-movement.test.js covers the diagnosis, 28 unchanged fighters/3360
immutable frames, dash comparisons, directional drift, actual resource limits
and hit/Kickoff refills, Chungus launch/bounce, persistent external momentum,
all gravity axes, jumping/landing, identical 30/60/120Hz results, all sports modes,
AI peer agreement, snapshots, replay and delayed rollback.
tests/kite-movement.browser.test.js checks authored models and attack flight,
gravity inversion, render purity, missing assets and ten-player sports performance.

Historical baselines were not regenerated. Old Kite-specific test expectations
were updated to the explicit requested rework; Rain and other fighters retain
their existing data and behavior. The new before fixture was captured once before
editing. No Git repository exists; a pre-change source ZIP is retained under
artifacts/projectile-rework/checkpoints/before-kite-movement-2026-11-13.zip.

Network build: rollback-33-kite-drift. Both online peers must refresh to the same
edition. Distribution remains core-only; no experimental content is removed from
the development checkout. Physical controller comfort and competitive tuning still
need human playtesting.

## Verified Results

- Ten new focused movement groups passed. All other 28 fighters retain their
  data and 3,360 pre-patch simulation hashes. No original fixture was overwritten.
- The updated Kite/Rain suite passed nine groups, including 240 replay frames
  and 235 delayed-input corrections. Rain's existing tuning is unchanged.
- Golden Rush (25 groups), projectile control (21 groups), shield pressure and
  hit interruption passed. Golden Rush's existing all-fighter platform/upper-ring
  reachability test also passed with Kite's new movement.
- The full rollback suite passed 6,960 independent frames, 1,047 corrections,
  depth up to eight, packet-drop stress and rematch handling.
- The exact core package matched full-source simulation across 2,040 frames,
  eleven replays and both ten-fighter arenas. No packaging-related behavior change.
- Chrome verified short bursts, charged drifting, Chungus's upward floor bounce,
  gravity reversal, render purity and zero missing assets. Ten-player Golden Rush
  with five AI Kites/five Rains: 16.7ms median, 16.8ms p95 and zero frames over
  25ms in 180 samples. These local figures are not hardware-wide guarantees.
- Exact-package controller joining, offline-file play, 75 runtime PNGs and real
  Kite/Chungus WebRTC passed with 50ms delay, 15ms jitter and 5% packet loss.
  Peer frame hashes matched; pause, rematch and disconnect passed.

Metrics/screenshots: artifacts/kite-movement/verification.json and
artifacts/kite-movement/browser-results.json. Physical controller feel remains a
playtest task; automated controller polling is not a substitute for handling one.
