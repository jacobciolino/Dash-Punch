# Rounds, Matches and Victory Celebrations

## Match Rules

Playable matches now use first-to-two round victories. Two-sided matches are best
of three. Existing multi-player FFA and four/multi-team formats are retained;
they can require more than three rounds when wins are split between several sides.
No new stocks, fighter abilities, scoring values or controls were introduced.

Fighting rounds default to 120 seconds. New sports setups default to 300 seconds.
Existing saved/custom sports timers, including already-supported Unlimited choices,
remain intact. Switching sports stages preserves the chosen timer. Sandbag's time
choices now also include 300 seconds. Lower-level sports creation/clock APIs retain
their legacy defaults for independent mechanics tests and historical fixtures.

Round wins are separate from fighter KO scores and sports objective scores. A
fighting round ends when one fighter/team remains, or at timeout by the unique
highest remaining-health percentage (sum of living health / total starting team
health). Ties enter normal-combat sudden death; a unique health lead or survival
outcome decides it. Simultaneous total elimination restarts the tied round in sudden
death without awarding anybody a win or adding a stock rule.

Sports retain their existing objective completion and score-limit conditions.
Timeout compares current objective scores/progress. Ties use the existing scoring
interactions in overtime; KO events and team wipes do not award round victories.
Continuous territory/charge progress can decide overtime without rounding away a
fractional gain. Goal celebrations/reset pauses retain their existing paused clock.
Field Goal retains continuous, timer-based play rather than gaining a new score cap.

## Transitions and State

`match-flow.js` is a small browser-independent state machine. At 60 simulation
steps/second it owns integer round-clock ticks, wins, overtime, two-second round-end
announcements and the three-second countdown. GO stays visible for 24 steps.
Pause and rendering frame rate cannot advance these timers independently.

The existing `resetRound` initializes the next round: fighters, health/resources,
combat/KO/respawn state, projectiles, stage time/gravity, sports objects and progress
reset. Roster, controller assignments, characters, teams, stage and match options
remain. During internal round resets, simulation frame/seed history is preserved
for rollback rather than restarting the network session.

The existing combat step runs only while active play is permitted. Native AI is
not consulted during frozen transitions. Per-fighter release gates observe held
inputs during countdown, discard carry-over releases and accept fresh GO inputs
with the original charge/release timing.

Active match state is included in core and legacy snapshots. Standalone mechanics
tests can still run without a match attached, preserving old replay fixtures.
Private WebRTC remains 1v1. Peers simulate the same rounds and show the final splash
only after the result is confirmed. Network identity is now
`dash-punch-rollback-46-match-rounds` (`-core-1` in the release); both peers must update.

## Presentation

A separate compact bar above the game canvas shows round number, clock, round wins
and identities; the final ten seconds turn red. Existing combat/objective HUDs and
gameplay areas are not covered by a second scoreboard. Solo players use player and
fighter names. Two-team labels use actual team identity, including Sandbag's existing
Blue/Red mapping. Multi-team labels retain their current team labels.

The full-screen victory page displays the winning fighter or every winning team
member, even eliminated/respawning teammates, with player names and final tally.
Native sprite sheets, frame anchors, cached tint/costume processing, Rain's cloak,
Orbit's halo and Kite's accessory are reused. Idle/jump timing is offset between
fighters. Drawing uses nearest-neighbor sampling and native pixel steps, without
editing any sprite assets. Animation time is presentation-only.

Rematch is highlighted by default. Every joined controller can navigate Rematch,
Change Characters, Change Mode and Main Menu using the shared focus. Buttons already
held on entering the splash are sampled/consumed. Back does not accidentally dismiss
the results; choose an explicit destination. Rematch resets wins and objective state
while preserving roster, teams, stage and settings. Online requests retain the
existing host-controlled rematch handshake; no networked teams were added.

## Verification

- Fourteen focused groups pass: KO and timeout outcomes, health normalization,
  sports objectives/progress, tied overtime, 2-0/2-1, cleanup/countdown, held-input
  gating, fresh GO input, pause, snapshots/replay and delayed rollback.
- All 15 sports arenas run ten native CPUs with two five-member round sides and
  snapshot restoration. All three Sandbag rulesets have round timeout coverage.
- Eight selected unit/regression scripts pass: match flow, online state, shield
  pressure, projectile magazines, Kite movement, gameplay repairs, rollback and
  core release. Rollback covers 8,280 independent frames / 1,047 rollbacks. Core
  comparisons cover 3,390 frames and eleven replays. Original Flip's historical
  fixture and all fourteen fighter definitions remain verified.
- Final browser checks render all fourteen victory appearances, solo and two-/
  five-member team wins at 1280x720 and 1920x1080, nonblank sprite columns, no menu
  overflow, cosmetics, render purity, urgent clock, held-button protection,
  controller rematch, character/mode/menu destinations and offline HTML.
- Final real WebRTC tests complete Versus and Soccer 2-0 matches, pause/resume and
  rematch, with changed inputs, 50 ms delay, 15 ms jitter and 5% simulated loss.
  Both peers agree on match state and hashes. These tests use identical one-second
  timeout fixtures to keep the full lifecycle practical; production defaults are
  unchanged by that test-only injection.
- Existing mapping, single-controller, ten-player drop-in lobby, keyboard/mouse
  menu-flow and asset-loading countdown browser tests pass. The countdown test now
  checks the simulation countdown instead of expecting the old menu overlay to
  remain visible. No historical replay JSON or gameplay baseline was regenerated.
- Shared-menu and core-package browser checks remain applicable, including all
  installed assets, offline HTML and real WebRTC pause/rematch/disconnect.
- Short headless ten-CPU frame intervals were about 16.7 ms median / 16.8 ms p95,
  with no samples above 25 ms in the focused 180-frame run. This is a limited
  browser smoke benchmark, not a physical-device or controller-feel guarantee.

Known prior Rain/Orbit historical and unrelated halo-test caveats were not changed.
Long-form human playtesting, physical controllers/adapters, and couch readability
on the actual television remain necessary. Local capacity stays ten; online stays
private 1v1. Reports and screenshots are in `artifacts/match-flow/`.

## Files and Release

- New `match-flow.js`; integration/HUD/victory actions in `game.js`.
- `dashball.js`, `sandbag.js`: optional external clocks; existing physics and score
  handling retained. Sandbag also accepts the new five-minute setup choice.
- `index.html`, `styles.css`: match bar, module load and victory layout.
- `server.js`, `tools/build-core-release.cjs`: serve/package the new module, core
  patch notes and README. Existing art is retained; experimental content stays out.
- `package.json`, `tests/simulation-harness.js`, `tests/countdown.browser.test.js`.
- New `tests/match-flow.test.js`, `tests/match-flow.browser.test.js`,
  `tests/match-flow-online.browser.test.js`.
- `playtest-release.json` selects the final build.

No Git repository exists. Checkpoint: `exports/pre-match-rounds-2026-11-14.zip`.
Previous releases remain intact.

Final core folder and offline ZIP:
`exports/Dash-Punch-Rounds-Victory-Release-2026-11-14-v2` (and `.zip`).
Preview: `http://localhost:8080/`.
