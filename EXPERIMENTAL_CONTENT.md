# Experimental Content In Menus

The main/title menu has an accessible Experimental Content switch. It defaults to
Off for fresh installs and old saved preferences without this setting. Changes
are saved in the existing `dashPunch.menuPreferences.v1` record.

Off shows the existing 13 core fighters and 11 core stages. On shows the complete
roster and stage pool, with the existing experimental asterisks/legend. The same
filter is used for local human/CPU selection, independent controller navigation,
the online fighter chooser, stage select and Stage Builder's test-fighter menu.
Custom stages remain stored; promoted non-core stages appear when enabled.

The filter never removes or reindexes character/stage definitions. Simulation,
combat data, input mappings, controller ownership and network content IDs are
unchanged. It is a local selection-menu preference, not a protocol restriction:
online opponents' selections are still accepted and displayed normally, and the
existing fixed online stage is unchanged. A new joining guest defaults to Orbit
rather than experimental Vesper when the preference is Off.

Toggling on the main menu does not reset or alter the current match. When editing
a local lobby, a previously selected hidden fighter is replaced with a core
fighter and its ready flag is cleared. Entering stage select replaces a hidden
saved stage with the first visible stage. Existing team, costume, human/CPU and
controller settings are preserved. Both changes use the existing round reset;
neither runs during an active online match. This avoids invisible selections or
controller navigation landing on filtered-out entries.

Verification:

- `tests/experimental-content.browser.test.js`: default/persisted On/Off states,
  core/full pools, controller wrap, keyboard/controller toggle, stale selection
  fallback, builder test roster, retained custom stages, unchanged IDs/match hash
  and main-menu fit at 1280, 960 and 390 pixels wide.
- `tests/single-controller-lobby.browser.test.js`: one controller edits its CPU
  opponent, keeps ownership, selects fighters and readies/backs/closes slots.
- `tests/menu-flow.browser.test.js`: mouse/keyboard selection, saved settings,
  remapping, countdown, pause and smaller-window layout.
- `tests/drop-in-lobby.browser.test.js`: two through ten players, independent
  selection, CPU settings, reconnection, rematch and retained lobby assignments.
- `tests/rollback-browser.test.js`: real two-browser WebRTC, mixed On/Off menu
  settings, core/full online rosters and an experimental selection visible to
  the other peer, then rollback play, delay/jitter/loss, pause, rematch and exit.
- `tests/pro-visuals-simulation.test.js`: 1,440 frames still match the untouched
  gameplay baseline; `tests/online-state.test.js` also passes.

Controller input is automated through emulated Gamepad API data, not a physical
controller test. Screenshots are in `artifacts/experimental-content/`. No Git
checkpoint is available because this project folder is not a Git repository.
