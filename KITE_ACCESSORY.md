# Kite Visual Accessory

Kite trails a small gold-and-mint diamond, a thin pixel string attached near his
back, and two tiny ribbon bows. The authored 9x14 pixel stamp is cached once and
drawn at integer 3x scale with nearest-neighbor sampling. The diamond itself is
27x27 world units; the narrow ribbon brings total artwork height to 42. No original
Seeker sheet, palette, animation frame, anchor, fighter stat or control is edited.

## Motion and Rendering

- Fixed-step exponential visual easing (7/s), not an object/force simulation.
- Fighter displacement leaves the accessory behind; it catches up after stopping.
- Small deterministic idle sway; an 86-unit tether bound avoids long screen lines.
- Gravity-relative back attachment and hover destination, including sideways and
  inverted gravity. The bitmap uses crisp quarter turns, never smooth rotation.
- Shortest wrapped displacement and seam copies prevent cross-arena strings.
- Large recovery teleports reset the visual offset. KO removes the accessory;
  respawns and rematches start cleanly.
- The accessory pass is behind all fighters. It does not inherit fighter hitboxes,
  act as a projectile, affect balls, award resources, or create team-glow clutter.

Tethers are keyed by fighter ID in a bounded presentation map, not on fighters or
sports objects. Existing presentation snapshots restore them during rollback.
They are excluded from gameplay hashes, authoritative match configuration and
combat decisions. Rendering never advances the tether. No dependencies or new
controls are required. The gameplay network build remains unchanged.

## Verification

Nine focused groups pass: authored pixels, idle float, movement lag/catch-up,
facing/gravity, wrapping/recovery, KO/reset cleanup, exact visual snapshot/replay
and delayed rollback, 30/60/120 Hz equality, and pre-accessory gameplay parity.
Versus, all 15 Dashball stages and all three Sandbag rulesets retain the previous
release's exact gameplay states under the same inputs (1,710 compared frames).

Relevant existing suites pass: Kite movement, hurt alignment, gravity rendering,
Orbit animation, team silhouettes, online state, shared rollback, and core release.
The shared rollback suite covers 8,280 frames / 1,047 rollbacks; packaging covers
3,390 full/core parity frames and 11 replays. Sprite/environment file hashes and
all roster/stage records remain identical to the pre-accessory release.

Real Chrome checks cover idle, running, jump/fall, dash, native punch, hitstun, KO,
gravity flips, wrapping, offline file play, and ten Kites in every sports mode.
Screenshots were inspected at actual gameplay size. Zero browser exceptions or
missing assets. Real WebRTC matches/rematches pass with 50 ms delay, 15 ms jitter
and 5% loss, including a new host playing an old-build guest.

Short headless software-Chrome measurements with ten Kites in Golden Rush:

| Check | Before | Accessory |
| --- | --- | --- |
| Warm full-render/effects median | 0.2 ms | 0.2 ms |
| Warm full-render/effects 95th percentile | 0.2 ms | 0.3 ms |

Live ten-CPU frame intervals: median 16.7 ms, 95th percentile 16.8 ms, zero
intervals over 25 ms across 240 samples. Browser timing is coarse and this is not
a physical-controller, exhaustive stress or hardware performance guarantee.

Artifacts: `artifacts/kite-accessory/`, including browser and online JSON reports,
animation screenshots, the 1080p ten-Kite scene and unfiltered regression logs.

## Files and Release

- `game.js`: accessory art/cache, fixed-step presentation update, drawing pass,
  presentation snapshot/reset integration, patch notes and debug inspection.
- `tools/build-core-release.cjs`: core-edition patch notes and README entry.
- `package.json`: accessory simulation/browser/online test commands.
- Three new `tests/kite-accessory*.js` suites.
- `playtest-release.json`: selects the new core-only build.

No Git repository exists. Source checkpoint:
`exports/pre-kite-accessory-2026-11-14.zip`. Previous releases remain intact.

Playable core-only release:
`exports/Dash-Punch-Kite-Accessory-Release-2026-11-14/` and its `.zip` sibling.
Preview: `http://localhost:8080/`.
