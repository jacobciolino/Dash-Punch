# Wide Courts and Whirlwell

## Stages

- **Soccer - Wide:** Select beside Soccer in Play > Dashball > Choose Fighters >
  Choose Stage. Width 4,480 rather than 2,560 (exactly 1.75x); height 1,440 and
  floor Y1,280 stay unchanged. Closed sides and ceiling. Same goals, ball,
  Court/Battle rules, team sizes, timer, scoring and resets as regular Soccer.
- **Field Goal - Wide:** Select beside Field Goal. Same wide dimensions and
  closed boundaries. Keeps visual-only uprights, defensive perches, continuous
  play and individual top-drop ball replacement after a valid goal. No field
  reset or pause after a score.
- **Whirlwell:** Select in the local Versus stage picker. 1,600 x 960, floor
  Y832, horizontal wrap and a genuinely open ceiling. The 160-unit center pit
  returns falling fighters/projectiles above the center, preserving velocity,
  resources and active combat state. It does not warp objects leaving the top.

## Turning Wheel

The circular center platform has radius 160 at (800, 464). It rotates clockwise
at 0.6 radians/sec (one turn every 10.47 seconds). Standing fighters are carried
by its surface displacement once per fixed simulation step; they can walk,
jump, dash and attack normally. It uses the existing solid-terrain, projectile
and wall-interaction systems with a native-pixel stepped circular boundary.
All strips share one surface identity, preventing artificial wall-resource
refills between neighboring strips. There is 208 units of clearance underneath.

The wheel reuses the existing stone boulder image and Perch environment assets.
128 cached 90-pixel rotation frames use nearest-neighbor rendering, with no
per-frame pixel scan. Cache memory is bounded at roughly 4 MiB when fully warm.
There is no new artwork, asset license, engine or dependency.

## Compatibility

Original stages and fighter balance are unchanged. All prior stage IDs remain
in the same order; new definitions append after them, while the sports menu
shows wide variants adjacent to their originals. Both wide sports are included
in the existing private WebRTC 1v1 stage pool. Online Versus retains its existing
Crosswire picker behavior; this patch does not expand online capacity or UI.

Wheel motion derives from existing serialized stage time and contact IDs.
Pit and side warp corrections normalize previous positions so collision sweeps
do not mistake a warp for a cross-arena attack. New network build ID prevents
older clients with different stage registries from joining.

## Verification

- `npm run test:wide-whirlwell`: geometry, goals/own goals, Court/Battle,
  14-fighter pit clearance, wheel carrying/jumping/wall contact, ten-CPU
  stability, 30/60/120 Hz, snapshot/replay and delayed-input rollback.
- `npm run test:wide-whirlwell-browser`: actual menu selection, full-stage
  screenshots at 1280x720 and 1920x1080, rotation pixels, rider carrying,
  pit return, keyboard walking, ten-CPU timing and offline file loading.
- `npm run test:wide-courts-online`: real two-peer WebRTC for both courts,
  50 ms simulated delay, 15 ms jitter, 5% loss, rollback hashes and rematches.

Browser reports and screenshots go in `artifacts/wide-whirlwell/`. Physical
controller feel and subjective stage balance still require human playtesting.
Existing local Versus CPU decisions use randomness; deterministic wheel replay
tests therefore use recorded abstract inputs, not independent CPU decisions.
Historical Rain/Orbit and old sports fixtures are not regenerated.

### Results (2026-11-15)

The 12 focused groups, 29 Dashball groups, 13 four-way gravity groups, 9 own-goal
groups, 14 match-flow groups and 8 magazine groups pass. Core release validation
checks 3,480 unchanged source/export simulation frames and 12 stage replays.
The general rollback suite passes 8,760 independent frames and 1,047 corrections.
Real WebRTC matches/rematches pass for both wide courts with matching peer hashes.
Browser checks pass offline loading, normal selection, both display sizes, actual
wheel pixel rotation, rider carrying, pit return and keyboard walking.

Short ten-CPU software-Chrome samples (180 frames/stage) show approximately
16.7 ms median and 95th-percentile frame intervals, with no frames above 25 ms.
These are limited automated observations, not a hardware or controller guarantee.

Three old suites still fail their final historical comparisons: Field Goal and
Open Soccer compare Golden Rush to an outdated fixture (`43d0e6ad` current and
previous release, versus fixture `9e1d9a98`); Sports Guide compares Basketball to
an older release (`89f03841` current and previous release, versus `e9a2222e`).
Their functional groups pass. Dedicated prior-release comparisons confirm no
new change to these modes. No historical fixture was replaced.

## Checkpoint

This folder has no Git repository. The pre-change source checkpoint is
`artifacts/wide-courts-whirlwell-before-2026-11-15.zip`.
