# Independent Player Cards

**Presentation update:** the full fourteen-fighter roster grid is visible again
above compact player controls. Hover previews and direct mouse picks are
restored without removing independent controller ownership or explicit Ready.
See `ROSTER_GRID.md` for the current selection screen and verification.

Local couch-lobby update, November 14, 2026.

## Controls And Ownership

Start/Menu joins a controller to one stable player slot, or reopens that slot's
card. A controller cannot occupy two seats. Joining uses a waiting human seat,
then an empty seat, then a CPU seat at full capacity. It never replaces another
joined human. Open keyboard editors and Ready keyboard seats are reserved too.

Each open card owns its candidate fighter, navigation focus and review state.
Directions browse; the existing Dash mapping confirms a fighter. Confirmation
keeps the card open in Review and does not mark Ready. Review offers team (where
applicable), costume, Ready, Back, CPU and Leave Lobby. Ready locks the canonical
fighter/team and collapses the editor. Start reopens it with explicit Unready.
Ordinary navigation or Back cannot silently unlock it.

View/Select (normalized standard button 8) closes only the owner's editor. It
does not leave, clear Ready, change teams or discard a confirmed fighter. A Close
command is also reachable by navigation for devices without a View button.
Punch goes back within the card. Start is no longer global confirm in pregame
local screens; closed cards use their existing Dash/Punch mappings for global
selection/back. In-match Start/pause, gameplay bindings and remaps are unchanged.
The previous generic-controller alias map remains intact, including its legacy
RB/Dash alias; this update does not silently remap anyone's combat controls.

Keyboard O opens a keyboard seat. Each keyboard editor uses its own existing
profile; with one editor, arrows/Enter also work. Backspace closes the most
recent keyboard editor, Escape backs within it. Multiple keyboards are not
separately identifiable by the browser: use the existing disjoint key profiles.
Mouse controls directly address the selected card, without moving global focus.

## Shared Menus And Match Flow

An open card consumes that controller's input before shared menu arbitration.
Closed joined controllers retain equal global authority. Private controls are
excluded from the shared focus list; no controller is a permanent host. Each
device has independent button edges and a 0.18-second direction repeat. Held
buttons do not repeatedly Ready, Unready or Leave. Within one card, simultaneous
actions resolve Close, Open, Back, Confirm, then navigation. Global conflicts
retain the established shared-menu rules.

Stage/settings screens retain their shared panel while open cards occupy a
separate dock. The main lobby fits 2/4/6/10 cards at 720p and 1080p, with integer
scaled animated previews. Original sheets, palette masks and existing halo
previews are reused without art changes. Ready cards use a compact display.

All participating human seats must be Ready and connected; CPUs need no human
Ready input. Sports team limits remain five per side. Global CPU count controls
do not remove or unlock another human. Fighter/team/controller assignments carry
into the normal countdown and best-of-three flow. Rematch preserves them; Change
Characters returns existing selections and Ready locks, requiring explicit Unready.

Disconnects reserve the seat and pause local gameplay, including round clocks.
Exact index/ID reconnects are recognized; a unique matching device can reclaim
its seat with Start. Ambiguous identical devices returning at new indices require
an explicit P-number choice. Resume is blocked until everyone reconnects. No AI
replacement or automatic loss occurs. Mid-round and between-round drop-in is
deferred until the next match's Change Characters lobby; a notice explains this.

Private WebRTC ownership and its existing 1v1 limit are unchanged. Local card,
focus, reconnect-dialog and notice state never enters gameplay snapshots/hashes.

## Implementation

- `lobby-cards.js`: dependency-free presentation-state reducer and button edges.
- `game.js`: canonical slot integration, private/global routing, card rendering,
  keyboard ownership, reconnect safety and match lifecycle hooks.
- `styles.css` / `index.html`: responsive grid, card dock and transient join notice.
- `server.js` / release builders: serve and package the small shared reducer.
- `tests/simulation-harness.js`: load the reducer, optionally for older comparisons.
- `tests/player-cards.*`: reducer, parity, lifecycle, layout and controller tests.
- Existing round/core/mapping browser tests use the new explicit Confirm/Ready
  sequence. Historical replay JSON fixtures are unchanged.

Pre-change archive: `exports/pre-player-cards-2026-11-14.zip`. This folder is not
a Git checkout; no Git commit/checkpoint is claimed. No new dependencies, artwork,
fighter tuning, physics, sports scoring or network architecture were introduced.

## Verification Notes

Automated browser tests use simulated Gamepad API devices, not physical pads.
Physical controller feel, brand-specific View mappings and TV overscan still
need human playtesting. A browser must expose separate indices for each adapter
port; the game cannot distinguish ports presented as one device.

New focused coverage includes simultaneous owner input, confirmation versus
Ready, locking/unlocking, owner-only close/leave, keyboard plus controller,
full capacity, CPU takeover, 5v5 teams, ambiguous reconnect, frozen local clocks,
deferred joins, shared settings, actual match start, best-of-three/rematch,
offline HTML and 720p/1080p screen-fit checks. Existing simulation/rollback,
gameplay repair, round flow and core release suites remain relevant. See the
generated test reports in `artifacts/player-cards`, `artifacts/match-flow` and
`artifacts/core-release` for the exact tested build.

The known historical Rain/Orbit fixture discrepancy remains documented in the
earlier reports. No historical baselines were regenerated for this update.

## Completed Results

- Player-card unit suite: 4 groups, including exact sampled checkpoint parity.
- Player-card browser suite: passed on the final release. Includes independent
  four-controller selection, two-step Confirm/Ready, owner-only Close/Leave,
  keyboard plus pad, ten simultaneous owners, 5v5 team setup, CPU takeover,
  full-capacity rejection, same-device reconnection at a new index, ambiguous
  identical-device selection, real-time disconnect pausing, deferred joins,
  all 14 complete preview bounds, rematch and offline HTML.
- All 2/4/6/10 card layouts and reviews fit at 1280x720 and 1920x1080. Nine
  private editors also fit in the settings dock while a tenth pad navigates
  the shared settings panel. Screenshots: `artifacts/player-cards/`.
- Shared-menu suite: 9 unit groups, 1,710 unchanged simulation frames, plus
  one/two/four-controller browser navigation, conflicts and settings returns.
- Match flow: 14 simulation groups; browser HUD, all 14 victory appearances,
  two- and five-fighter winning lineups, rematch and offline play passed.
- Gameplay repair: 21 groups passed, including sports, all fighters and the
  original Flip fixture. No combat, physics or scoring repairs were repeated.
- Rollback: 8,280 independent simulation frames and 1,047 rollbacks passed.
- Core release: 3,390 unchanged simulation frames and 11 replays passed.
- Final release browser: all 77 runtime bitmaps loaded; 26 embedded sheets;
  no missing assets or runtime exceptions. Ten-fighter dungeon benchmark:
  median 16.7 ms, p95 16.8 ms, zero frames over 25 ms across 180 samples.
  This headless browser sample is not a physical-TV/controller performance claim.
- Real WebRTC: final-release Versus and Soccer rounds, 2-0 victories, pause,
  rollback, state agreement and rematches passed under 50 ms simulated delay,
  15 ms jitter and 5% loss. Existing online capacity remains 1v1.
- Existing controller-remapping browser suite passed. Old core/round/shared
  browser test setup steps were changed to explicit Confirm then Ready, not
  new gameplay baselines. Not every legacy development-only UI script was run.
- Eight source syntax checks passed. Source art hashes match the pre-change
  manifest exactly. All 14 fighters, 11 Versus stages and 15 Dashball stages
  remain in the core package. Historical fixture discrepancy remains unchanged.

## Release

Playable folder: `exports/Dash-Punch-Player-Cards-Release-2026-11-14-v2/`.
ZIP: `exports/Dash-Punch-Player-Cards-Release-2026-11-14-v2.zip`.
Size: 7,575,628 bytes. Compressed-data integrity test passed.
SHA-256: `795618c2418ba2a85a699d10d69231bff8dbda835e5fb0a2f645dda10b5c2dd4`.

The selected local preview is `http://localhost:8080/?v=player-cards`.
Served `game.js`, `lobby-cards.js` and `index.html` were byte-checked against
this release. Experimental content and development dependencies are omitted.

Changed source files: `game.js`, `lobby-cards.js`, `styles.css`, `index.html`,
`server.js`, `tools/build-core-release.cjs`, `package.json`,
`tests/simulation-harness.js`, `tests/player-cards.test.js`,
`tests/player-cards.browser.test.js`, `tests/shared-menu.browser.test.js`,
`tests/match-flow.browser.test.js`, `tests/core-release.browser.test.js`,
`tests/controller-mapping.browser.test.js`, and this report. The release builder
also updates `playtest-release.json`; release files and test artifacts are generated.
