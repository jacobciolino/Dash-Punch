# Kite And Rain Identity Tuning

Historical first pass. Kite's current movement fix supersedes its float/dash
values below; see [KITE_MOVEMENT.md](KITE_MOVEMENT.md). Rain is unchanged.

## Scope

Kite is a floating, upward-launching aerial fighter. Rain is a fast dashing,
heavy-falling downward launcher. The optional `airFloat` tuning lives on Kite's
character data and uses the existing abstract aim and fixed-step physics.
There is no new input, state machine, animation, resource or dependency.

Assignments occur after derived fighter data is copied. Kevin, Zomg, Dragon and
all other fighters retain their original data and simulation behavior.

## Tuning

| Property | Previous | New |
| --- | --- | --- |
| Kite air dashes | 6 | 7 |
| Kite airborne gravity | 980 | 220 units/s squared |
| Kite airborne gravity with full Up intent | 980 | 66 units/s squared |
| Kite controlled descent limit | native 860 cap | 160; 55 while aiming Up |
| Kite free-air tangent movement | dash steering / dashless control only | 330 units/s target |
| Kite air-walk acceleration / braking | n/a | 2000 / 1800 units/s squared |
| Kite launch bias / blend | (-0.35, -0.85) / 0.46 | (0.1, -1) / 0.72 |
| Rain air dashes | 10 | 9 |
| Rain gravity | 1280 | 2850 units/s squared |
| Rain launch bias / blend | (-0.24, -0.82) / 0.56 | (0.15, 1) / 0.68 |

Launch X mirrors with strike direction; negative Y is up. Both use the existing
aim blending, charged bias and launch calculations. Damage, hitstun, hitboxes,
dash launch speeds/durations and shield properties are unchanged.

Kite's passive airborne gravity applies to his body; active air-walking and
Up-based slowing are unavailable during hitstun, blockstun, jukes, dodges,
surface-tech travel, wall-clinging/sliding or KO. Existing hitstun DI is unchanged.
Grounded walking/dash launch tuning and wall-cling rules are unchanged.

Air-walking uses gravity-relative tangent movement, including reversed and
horizontal gravity. Up intent means opposing that gravity vector. Neutral input
brakes tangent drift. Control works with any remaining dash count, including zero.
It does not replace active Dash steering or cap Dash speed. Descent braking never
adds upward thrust or clamps upward momentum. Ordinary anti-warp velocity caps,
mercy-dash rules and defensive meters remain in place.

Held aerial Dash retains its existing stall/decay. Kite's lower gravity stacks
with the stall; his full-charge descent limit is multiplied by 0.4 and further
by the Up gravity modifier. He always falls slowly, rather than gaining altitude
from directional input alone. Rain retains the normal held-Dash behavior with
his heavier gravity.

## Verification

- `tests/kite-rain.test.js`: pre-change data plus 3,240 unchanged simulation
  frames across the other 27 fighters; Dash startup preservation; directional
  float, charge stacking, gravity axes, stun guards, launch mirroring and Rain
  gravity; snapshot replay and six-frame delayed rollback.
- `tests/kite-rain-before.json`: immutable pre-patch capture; do not record over
  it to hide a gameplay regression.
- `tests/pro-visuals-simulation.test.js`: historical baseline retained; explicitly
  excludes the separately tested intentional Edgebert/Kite/Rain changes.
- `tests/core-release.test.js`: full-source/core-only data and simulation parity,
  including a 240-frame airborne Kite/Rain sequence.
- `tests/core-release.browser.test.js`: accepts
  `CORE_ONLINE_CHARACTERS=kite,rain` for real WebRTC regression, plus offline
  file play, virtual controller joining, ten-fighter play and missing assets.

The network build identifier changes to reject incompatible pre-tuning peers.
Real controller comfort and competitive balance still need human playtesting.

## Results

- Nine focused test groups passed, including 235 six-frame rollback corrections.
- Full rollback suite passed: 6,960 comparison frames, 1,047 corrections, depth 8.
- Full/core parity passed: 2,040 frames, eleven replays, ten-fighter arenas.
- Exact core-package Chrome test passed: offline file play, controller joining,
  Kite/Rain WebRTC with 50 ms delay, 15 ms jitter and 5% simulated loss, pause,
  rematch and disconnect. All 82 runtime PNGs decoded; no missing assets.
- Ten-fighter browser sample: 16.7 ms median, 16.8 ms p95, zero frames over 25 ms.
- Shield pressure, hit interruption, shared sports, Dashball (29 groups) and
  Sandbag (16 groups) regressions passed.
- The older online-state asset audit assumed all stage backgrounds were named
  `scene.png`. Its test now recognizes the existing 480x270 Orc `preview.png`
  while still checking file presence and exact dimensions. No art was changed.
