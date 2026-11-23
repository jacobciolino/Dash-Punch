# Orbit: Steerable Air Arc

## Current Movement Patch (2026-11-17)
Five air dashes (previously four). Air launch speed is 85% of the preceding arc
tuning; active duration grows from 976.97ms to 2011.41ms. Neutral horizontal
travel is approximately 810.16 / 1212.30 units at tap/full charge, versus
464.17 / 694.58 before (1.745x). Initial velocity changes from (508.992,-330.845)
to (432.643,-281.218), and full-charge (761.64,-495.066) to
(647.394,-420.806). Ground dash, punches, shields, gravity and HP are unchanged.

Active DI steers actual velocity with exponential response 9/sec, limited to
4.2 radians/sec. Neutral input retains the last heading instead of pulling the
flight back to a scripted arc. Finite duration, interruption and gravity-change
guards remain. Five charges still recharge through native landing/hit rules.
Tests: `test:orbit-movement` (six focused movement/rollback cases); historical
JSON fixtures remain unchanged. Earlier tuning details below are historical.

## Movement

Orbit's normal **airborne-at-initiation** Dash now carves an arc against the
current gravity direction. Holding Up raises the arc under ordinary gravity;
Down flattens it and brings descent earlier. The controls rotate with reversed
or horizontal gravity. Neutral follows a moderate route. Meaningful horizontal
input gradually steers/brakes the heading, without snapping velocity.

Ground Dash is unchanged, including a grounded Dash that later leaves a ledge.
Ground-initiated tippy-toes super jumps, wall launches and weak mercy recovery
dashes keep their existing behavior. No buttons or controller mappings changed.
The existing charge, carry, resource and collision systems are reused.

### Measured Before / After

Same no-momentum, unobstructed Flat fixture, fixed 1/60-second simulation steps,
horizontal initiation, neutral follow-through. Distances cover the active carry
window, not all subsequent drifting. Full charge uses Orbit's existing 0.76 s
charge time. Values are world pixels and world pixels/second.

| Measurement | Tap before | Tap now | Full before | Full now |
| --- | ---: | ---: | ---: | ---: |
| Initial horizontal speed | 616.96 | 508.99 | 923.20 | 761.64 |
| Average horizontal speed | 571.06 | 472.04 | 854.51 | 706.35 |
| Horizontal range | 361.67 | 464.17 | 541.19 | 694.58 |
| Nominal carry duration | 0.620 s | 0.977 s | 0.620 s | 0.977 s |

This is **28.3% more range**, **17.3% lower average horizontal speed**, and
**17.5% lower initial horizontal speed**. Sampling the entire window takes 38
old steps (0.633 s) versus 59 new steps (0.983 s); that discretization explains
the small difference from the nominal timers. Range varies with steering,
inherited momentum, charge, collisions and combat interruptions.

| Held after a horizontal start | Tap arc height | Full arc height | Apex time |
| --- | ---: | ---: | ---: |
| Up | 156.75 | 234.55 | 0.633 s |
| Neutral | 100.18 | 149.90 | 0.550 s |
| Down | 50.96 | 76.25 | 0.400 s |

### Exposed Tuning

`CHARACTER_DATA.orbit.airDashArc` centralizes:

| Property | Value |
| --- | ---: |
| speedScale | 0.825 |
| durationScale | 1.3 / 0.825 |
| neutralRise / highRise / lowRise | 0.65 / 1.00 / 0.22 |
| upPhaseBias / downPhaseBias | 0.08 / 0.20 |
| shapeResponse / velocityResponse | 8 / 12 |
| horizontalResponse | 1.4 |

Input smooths the desired shape and heading continuously. Velocity eases toward
that evolving target; it is never teleported along a position spline. Arc phase
advances for a finite duration, then normal gravity resumes with the current
velocity. One air Dash is spent normally. Landing, wall contact, hitstun, KO,
charge/brake, blockstun, rebound, clash disadvantage or a gravity-direction change
ends arc control rather than overriding the external interaction. Fresh Dashes
can reset the arc only by spending their normal resource. Successful hits/refunds
still use the existing game rules; this patch adds no replenishment or hover loop.

## Offense

Orbit's Punch base damage changes **13 -> 11.25 (-13.46%)**. Final health damage
still uses the existing integer rounding, charge, grounded leverage, combo staling
and fired-up rules. Actual fresh-hit values are:

| Charge / origin | Old damage | New damage | Old hitstun | New hitstun |
| --- | ---: | ---: | ---: | ---: |
| Tap air | 13 | 11 | 0.400 s | 0.580 s |
| Tap ground | 14 | 12 | 0.400 s | 0.580 s |
| Half air | 18 | 16 | 0.710 s | 1.0295 s |
| Half ground | 19 | 17 | 0.710 s | 1.0295 s |
| Full air | 23 | 20 | 1.020 s | 1.479 s |
| Full ground | 25 | 21 | 1.020 s | 1.479 s |

Rounding makes individual reductions vary by a few percentage points. Base
outgoing Punch hitstun changes **0.40 -> 0.58 s (+45%)**, multiplied by the existing
charge and stale-hit rules. This does not increase hitstun received by Orbit.
Knockback magnitude, attack startup/active/recovery/whiff timings, charge timing,
hitstop and hitboxes are unchanged. Kickoffs retain their existing 4-damage,
techable 0.68-second knockdown behavior: they are not converted into longer
Punch-style hitstun, and their low integer damage is not rounded down by 25%.

### Launch Direction

Orbit's `directionalLaunch` flag uses the actual normalized `attack.dir`, not his
position relative to the victim, live movement aim, or instantaneous dash velocity.
The old inward/upward bias is bypassed for Orbit. His old 18% horizontal / 10%
vertical attacker-momentum contribution is also bypassed. Thus left/right mirror,
up strikes lift, down strikes drive downward, and steering an arc does not rotate
an already chosen strike's launch. Active Punch aiming still works normally.

The shared small horizontal-hit lift, combo pop-up/pull and surface bounces remain
intentional exceptions. A downward follow-up on a grounded combo victim can still
pop them upward under the preexisting combo-starter rule. This is not a new global
launch rewrite. Other fighters retain their intentional curves and carry behavior.

**Separate shared-system observation:** the existing attacker-momentum term can
overwhelm a sufficiently weak launch at extreme opposing speeds for other fighters.
That behavior was not silently changed roster-wide in this character patch.

## Combo Potential And Risks

The normal-collision automated fixture confirms a six-hit route using an opener,
immediate Dash chase, and repeated aimed Punch releases against a non-defending
airborne dummy. Upward openers also support aerial chasing. These are possible
routes, not guaranteed strings: the same fixture with a correctly timed defensive
Dash Escape breaks pressure before the follow-up and grants the existing escape.

Existing damage/hitstun staling (down to 0.62), DI, surface techs on eligible hits,
combo defenses, ground-gated defense refills and in-combo meter regeneration remain.
Four air Dashes without a landing/hit/refund expire normally; an exhausted Orbit
falls instead of hovering forever. No new infinite resource is introduced.

Full-charge Punch hitstun is now about 1.48 seconds before staling or target
vulnerability modifiers. Combined with hit-confirm cancels and existing dash
refunds, that is deliberately strong pressure and needs human balance testing.
Automated defense tests demonstrate counterplay, not a proof against every
possible wall/character/DI loop. Do not call all possible infinites ruled out.

## Verification

- Four pre-tuning ground Dash fixtures (tap/full, left/right) remain exactly equal.
- 960 pre-tuning simulation frames for Anchor, Spike, Rain, Whipado, Reverso,
  Chungus, Paul and DefiPlate remain exactly equal with an unchanged Anchor foe.
- Air range/speed/duration, distinct input arcs, earlier Down apex, smooth braking,
  mirrored travel, expiry, finite resources and collision/state cancellations pass.
- Fresh Punch damage/hitstun at three charge levels and two origins, unchanged
  hitstop, unchanged incoming hitstun, vector-based launches and momentum isolation
  pass. Combo staling and an executable defensive escape pass.
- Independent simulations and restore/replay from the middle of a live arc match.
- Browser captures show authored Seeker Dash poses, no body distortion and no
  rendering changes to simulation. See `artifacts/orbit/` for captures/raw numbers.
- Real two-browser WebRTC tests pass with 50 ms delay, 15 ms jitter and 5% loss,
  including hash matching, rollback, pause, rematch and disconnect.
- The full suite passes 6,120 independent simulation frames and 1,047 rollbacks,
  with a maximum rollback depth of eight. Ten-fighter arena replay tests also pass.
- Existing controller remapping/reconnection/alias tests and the simulated
  ten-controller lobby test pass. The live two-player performance check measured
  median 16.7 ms / p95 16.8 ms RAF intervals, with 0/180 above 25 ms on this machine.

Old visual-only and DefiPlate baselines were **not replaced**. Their Orbit fixture
is explicitly pinned to his old tuning via `tests/legacy-orbit-fixture.js`, keeping
those historical tests meaningful. New tuning is tested independently. The new
pre-tuning fixture refuses to overwrite its recorded file.

Runtime changes are in `game.js` only for Orbit's data and shared hooks gated by
his optional properties. Arc state contains simulation-time numbers and is packed
by the existing rollback snapshot system, without DOM/Canvas/Gamepad dependencies.
Tuning is applied after derived fighters copy Orbit, preserving Spike and other
copies. Build ID is `dash-punch-rollback-20-orbit-arc`; friends need matching files.
No physical controller feel test or long competitive balance session is claimed.
