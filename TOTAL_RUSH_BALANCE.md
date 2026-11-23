# Total Rush Objective Balance

Play > Dashball > Choose Fighters > Choose Stage > Total Rush > Total Rush Settings.
The same settings button is available in the online Dashball stage picker.
Navigate with directions, Dash to select a minus/plus control and Punch to go
back. Keyboard arrows/Enter and mouse also work. Focus scrolls controls into
view; Match Rules are below Objective Balance. No new button is required.

## Values And Presets

| Setting | Balanced Default | Selectable Values |
| --- | --- | --- |
| Boulder Territory | 0.5 pts/sec | 0, 0.25, 0.5, 0.75, 1, 1.5, 2 |
| Boulder Bonus | 1 pts/sec total | 0, 0.5, 1, 1.5, 2, 3, 4 |
| Middle Ring | 5 pts | 0, 1, 3, 5, 10, 15 |
| High Ring | 10 pts | 0, 5, 10, 15, 20, 25 |
| Golden Target | 30 pts | 0, 10, 20, 30, 40, 50, 60 |
| Golden HP | 144 | 48, 96, 144, 192, 240 |
| Golden Respawn | 45 sec | 10, 20, 30, 45, 60, 90 |
| Small Balls | 3 | 1, 2, 3, 4, 5 |

Balanced is the new default. Original restores territory 1 and bonus 2 pts/sec,
with all six other values exactly as Balanced. Custom keeps the current values;
manual objective changes select it automatically. Returning to a named preset
restores all eight exact values without changing score target, match timer,
fighter health/respawn, team size, team assignments, characters or AI seats.
The default victory target remains 300.

Bonus is the **total** scoring rate above the platform, not an addition to the
ordinary rate. It can be lower than ordinary or zero independently. A zero-point
objective stays physical and visible: balls still collide/reset at rings and
the golden target still takes damage, disappears and respawns normally.

All five scoring values at zero produces a clear validation message and disables
local/online continuation. Start/rematch actions and the online match signature
also reject such configurations. Editing an invalid setup remains possible.

## Configuration And Simulation

`dashball.js` centralizes bounded choices, presets, normalization and validation
under `Dashball.totalRush`. New configuration keys are `boulderTerritoryRate`,
`boulderBonusRate` and `balancePreset`; the existing ring, golden and ball-count
keys are reused. Preset identity does not itself change scoring.

The existing 60,000-integer-units-per-point ledger and sub-unit remainder are
preserved. Selected rates replace only Total Rush's former 1/2 coefficients.
All ring/golden awards still batch into the same end-of-step ledger. Simultaneous
victory, exact ties, overtime and no-KO-point rules remain unchanged. HUD and zone
labels show actual rates; score text retains hundredths without long float tails
or rounding an unearned 299.999 up to 300.

Every objective value is part of authoritative match configuration, signature,
snapshot, replay and rollback state. The host sends the full normalized setup;
guests use it rather than local menu preferences. Snapshot restoration refreshes
Total Rush ring labels/awards to the restored values. Rematches retain the full
configuration and reset scores, HP, balls, timers and fighters normally.
Network build: `dash-punch-rollback-39-total-rush-balance` (core suffix on exports).
Online remains private WebRTC 1v1; local remains 1v1 through 5v5.

## AI And Scope

Existing dynamic task allocation now weights boulder income and ring rewards.
Golden opportunity considers configured reward, HP and respawn. Zero-point
rings are excluded from shot planning, not physics; zero-value objectives are
not assigned as scoring tasks. Extra teammates support ordinary combat when no
valuable objective is currently available. Native attack/movement inputs remain
the only way AI affects play. Bonus-seeking respects its actual value.

No fighter, ball physics, geometry, hitbox, magazine, control or standalone sport
was rebalanced. Other modes do not acquire Total Rush configuration fields.
Original matches the existing historical Total Rush physics/AI frames; the
comparison supplies Original values and omits only the three new configuration
keys that did not exist when those hashes were recorded. Historical JSON
fixtures are untouched.

## Verification

- `tests/total-rush-balance.test.js`: every choice, exact fractional rates at
  30/60/120 Hz and collision subdivisions, total-versus-additive bonus, zero
  awards, HP/respawn, ball count, invalid setup, presets, signatures, snapshots,
  delayed rollback, replay, simultaneous awards/ties, configured AI valuation,
  HUD precision and Original historical parity.
- Browser: native settings at 1280x720, 16px labels, scrolling without overflow,
  keyboard and virtual gamepad, invalid-start guard, saved reload preferences,
  match start, rematch persistence and ten CPUs with five small balls.
- Real WebRTC: default Balanced and a fully custom host setup, 50 ms delay,
  15 ms jitter, 5% simulated loss, matching confirmed hashes, victory and rematch.
  Different local team-visual preferences do not alter scoring.

Browser artifacts: `artifacts/total-balance/`. Physical controller feel and
subjective balance still require human testing. The previously documented
Rain/Orbit historical fixture mismatch remains separate and unchanged; no old
baseline was regenerated to conceal it.

### Final Results

- Fourteen focused balance groups pass. Thirty relevant test suites pass,
  including existing Total Rush, every installed sport, fighters, magazines,
  Kite, shields, networking, rollback and release packaging.
- Existing Field Goal comparisons retain 3,360 historical frames, including
  Original Total Rush compatibility. Standalone Boulder Control and Golden Rush
  keep their geometry, physics, rates and AI behavior.
- Rollback stress: 7,560 independent frames, 1,047 corrections, maximum depth
  eight. Exact source/core parity: 2,760 frames and eleven restored replays,
  explicitly covering Balanced, Original and Custom.
- The exact final core package passes balance UI, custom real-WebRTC scoring/
  rematch, existing controller joining, offline file play, standard online
  pause/rematch/disconnect and all runtime-art loading checks. No missing assets
  or browser errors. Local keyboard/virtual controller input is verified;
  physical device feel is not claimed.
- At 1280x720 the settings fit from Y19 to Y703 with 16px labels, bounded
  scrolling and no row overflow. Ten CPUs with five small balls: median 16.7 ms,
  p95 16.8 ms, 0/180 frames above 25 ms. This is a short local sample, not a
  universal hardware performance guarantee.

Preview: `http://localhost:8080/?v=total-balance`.
Core folder: `exports/Dash-Punch-Total-Balance-Final-2026-11-13`.
Shareable archive: `exports/Dash-Punch-Total-Rush-Balance-2026-11-13.zip`,
7,438,182 bytes, archive integrity verified. Thirteen core fighters, eleven
combat stages, ten Dashball stages, unchanged art inventory and 74 package
files. No experimental/development-only assets or dependencies are included.

There is no Git repository. The checkpoint before this patch is
`exports/checkpoint-before-total-rush-balance-2026-11-13.zip`. Old releases and
the full development checkout remain. New distribution uses the existing
core-only exporter, with no additional art, dependency or experimental content.

## Changed Files

Runtime/UI: `dashball.js`, `game.js`, `styles.css`.
Packaging: `tools/build-core-release.cjs`, `package.json`, playtest pointer.
Tests: new balance unit/browser/online suites; existing Total Rush unit/online,
historical comparison helper, Field Goal comparison and core parity coverage.
Documentation: this report, `TOTAL_RUSH.md`, `DASHBALL.md`, in-game/core patch notes.
