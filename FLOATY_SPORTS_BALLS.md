# Floatier Sports Balls

## Tuning

| Property | Previous | New |
| --- | --- | --- |
| Gravity | 1050 | 900 |
| Rebound speed retention | 0.73 | 0.84 |
| Rolling friction coefficient | 1.35 | 0.95 |
| Speed cap | 2050 | 2050 (unchanged) |

An identical airborne launch hangs about 17% longer. Balls already preserve
horizontal velocity in open air; the additional momentum comes from livelier
rebounds and reduced loss on floor/platform contact, not harder punches.

Applies to Golden Rush/Quidditch, Four-Way Golden Rush, Target Break, all three
Target Charge stages and Total Rush small scoring balls. Boulders and golden
targets keep their own physics. Soccer, Basketball, Field Goal, Versus, fighter
movement, attack impulses, shields, ownership, scoring curves and resource rules
are unchanged. No controls, assets or dependencies were added.

## Settings and Multiplayer

Values live in the shared Dashball options and the existing Total Rush small-ball
profile. AI planners read the same configuration as simulation. Switching stages
restores the selected sport's proper physics, preventing floating-ball values
from leaking into Soccer. Match settings serialize normally and survive rematches.

Only untouched old saved menu defaults are upgraded on load; explicitly tuned
physics remain. Snapshots and host-authoritative online configuration are never
rewritten by this migration. Both peers need network build 52 (Floaty Sports Balls).

## Verification

`npm run test:floaty-sports-balls` covers tuning, actual airtime and ricochets,
unchanged attack force, speed bounds, saved settings, stage switching, target
charge/ownership/deduplication, ten native CPUs, snapshot/replay, delayed rollback,
30/60/120 Hz and exact prior-build parity for unrelated sports and all fighters.

`npm run test:floaty-sports-balls-browser` checks saved menu migration, all seven
affected sports configurations, ten fighters, offline HTML, screenshots at
1280x720 / 1920x1080, and limited ten-CPU frame pacing.

`npm run test:floaty-sports-balls-online` reuses the two-peer sports harness for
Golden Rush and roaming Target Charge, including real WebRTC, simulated delay,
jitter/loss, matching peer hashes and rematches.

Existing target, Golden Rush, gravity, match and rollback suites remain in use.
Historical baselines are not regenerated. Tests comparing historical physics
exclude only sports intentionally retuned by this request; the new focused
tests verify those changes against the immediately previous release.

Results: 10 focused groups, Golden Rush (25), Target Break (24), four-way
gravity (13), Dashball (29), magazines (8), match flow (14), Whirlwell/wide courts
(12), core source/export parity and the general 8,760-frame rollback suite pass.
All 19 Target Charge functional groups pass; its final historical
`gravity-soccer:ai` comparison still differs from the older fixture. The same
180 frames match the immediately previous release exactly, confirming that
failure predates this tuning. No fixture was replaced.

Browser checks pass all seven configurations, both display sizes, offline play
and saved-settings migration with no missing assets or runtime exceptions.
Real WebRTC passes standard/four-way Golden Rush and roaming Target Charge,
including rematches, 50 ms simulated delay, 15 ms jitter and 5% packet loss.
Ten-CPU software-Chrome samples show about 16.7 ms median and 16.7-16.8 ms p95
frame intervals, with no intervals above 25 ms in the short 180-frame samples.

Physical controller feel and the best amount of float remain human playtest
questions. Longer-lived rebounds may make defensive interception more important.
The existing speed cap prevents the change from creating faster extreme shots.

This folder is not a Git repository. The pre-change checkpoint is
`artifacts/floaty-sports-balls-before-2026-11-15.zip`.
