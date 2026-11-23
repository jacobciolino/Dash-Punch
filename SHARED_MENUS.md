# Shared Local Menu Control

Global menus use one visible focus shared by every connected, joined local human
controller. There is no Player 1 or host restriction on mode selection, stages,
match settings or starting a valid match. Before a local lobby exists, any detected
controller can use the main menus. After joining, active slot ownership identifies
eligible controllers; unjoined, closed, CPU and disconnected seats cannot take over.

Character selection still uses the existing independent roster/card path. Its
ownership, joins, character changes and readiness rules were not redesigned.
Advancing to the global stage menu is now available to any joined player's Start
or existing Choose Stage command, but only after the existing readiness gate.

## Controls and Arbitration

- Directional inputs use the existing normalized D-pad/hat and analog sticks.
  Saved directional button remaps are respected.
- Existing Dash confirms and Punch goes back. Start retains confirm/resume
  behavior, but is processed together with other menu actions rather than through
  a second, earlier activation path. In-match Start/pause behavior is unchanged.
- Each controller has its own held-button edges, direction and repeat timer.
  A held button cannot swallow another controller's new press. Held directions
  repeat every 0.18 seconds, using existing 0.55/0.35 stick hysteresis thresholds.
- Each controller update produces at most one global action. Back takes precedence
  over Start, then confirm, then navigation. This is action precedence, never
  controller, seat, connection or array-order precedence.
- Matching simultaneous navigation coalesces. Conflicting simultaneous directions
  cancel. A newly changed direction takes precedence over held repeats. Different
  updates act in arrival order on the same shared focus.
- Screen changes sample/consume held buttons during the existing input lock.
  Newly observed/reconnected held buttons require release before activation.
  Disconnect removes stale global input records and preserves existing seat rules.
- Keyboard and mouse remain available. Keyboard auto-repeat no longer repeats
  confirm/back through global screens. Stage-specific settings return to the stage
  picker with its selection intact; entering settings from the mode menu returns
  there. Sports-result navigation retains its existing mode-menu destination.

No new buttons, settings, dependencies, combat rules or networking infrastructure
were added. Menu input state is not part of simulation snapshots or rollback hashes.
Readiness, team validity and all-zero-objective validation remain authoritative.

### Existing Mapping Caveat

The source's generic controller defaults are Dash `[0,3,4,5]` and Punch `[1,2,6,7]`.
Thus a standard-mapped RB (button 5) is currently a Dash alias, not Punch. Existing
GameCube defaults are Dash `[0,4,6]` and Punch `[1,5,7]`, which do provide L/Dash
and R/Punch. Saved custom assignments remain intact. This patch deliberately does
not change in-match mappings; use existing Settings > Controls / Button Mapping
to customize a generic controller. Physical adapters and button labels need a real
controller check.

## Changed Files

- `game.js`: per-device global input sampling, a small shared-action reducer,
  existing lobby-to-stage permission, Start routing, settings return and patch notes.
- `tools/build-core-release.cjs`: core patch notes and README controls description.
- `package.json`: shared-menu test commands.
- `tests/shared-menu.test.js`: focused input arbitration and gameplay parity tests.
- `tests/shared-menu.browser.test.js`: browser controller scenarios and offline test.
- `tests/drop-in-lobby.browser.test.js`: replace the obsolete host-only stage
  advancement expectation with the intentionally shared behavior. No gameplay
  fixture or historical baseline was regenerated.
- `playtest-release.json`: selects the final core-only release.

## Verification

- Nine focused groups pass: 1/2/4 independent controllers, held handoffs,
  order-independent simultaneous actions, conflicting directions, repeats,
  transition locks, reconnect/cache bounds and snapshot purity.
- 1,710 exact pre-change simulation frames match across Versus, all 15 Dashball
  stages and all three Sandbag rulesets, with native fighter inputs and AI.
- Ten selected unit/regression scripts pass: shared menus, online state, shield
  pressure, projectile magazines, Kite movement, Rain cloak, team silhouettes,
  gameplay repairs, rollback and core release. Rollback covers 8,280 independent
  simulation frames and 1,047 rollbacks. Core comparisons cover 3,390 frames and
  eleven replays. Historical Rain/Orbit and unrelated halo-test caveats are not
  modified or rebaselined by this patch.
- Final Chrome checks cover one, two and four simulated gamepads, out-of-order
  joining, P2/P3/P4 navigation, shared stage confirmations, D-pad/stick input,
  remapped confirm, held-button handoff, conflicting navigation, reserved reconnect,
  unjoined-controller exclusion, keyboard mixing, settings return, readiness-gated
  match start, pause/resume, lobby return and offline HTML.
- Existing controller-mapping, single-controller, ten-player drop-in lobby,
  keyboard/mouse menu-flow and art-ready countdown browser suites pass.
- Total Rush's settings browser suite also passes on the final release: keyboard
  and controller changes, all-zero validation, persistence, rematch configuration
  and a readable scrolling 1280x720 layout with 16-pixel setting labels.
- Final core browser suite passes all 14 core fighters/77 loaded PNGs, ten-player
  gameplay, offline HTML, and a real private WebRTC 1v1 using Boomerangus/Kite,
  delayed/jittered/lossy input, matching peer hashes, pause/rematch and disconnect.
  Ten-CPU frame intervals were approximately 16.7 ms median/p95 over 180 samples,
  with none above 25 ms. This short headless test is not a device performance or
  controller-feel guarantee.

Reports, logs and screenshots: `artifacts/shared-menus/`. Real physical-controller
feel, unusual adapter mappings and multiple identical device reconnects require
human testing. Local support remains ten fighters; online remains private 1v1.

## Release

No Git repository exists. Source checkpoint:
`exports/pre-shared-menus-2026-11-14.zip`. Earlier releases remain intact.

Final offline core folder and ZIP:
`exports/Dash-Punch-Shared-Menus-Release-2026-11-14-v2` (and `.zip`).
Preview: `http://localhost:8080/`.
