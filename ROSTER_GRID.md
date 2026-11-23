# Full Character Roster Restored

The local fighter lobby once again shows all fourteen core fighters together
in a persistent roster grid, replacing the cards-only presentation. Existing
Seeker PRO artwork, animations, cosmetics, teams and gameplay are unchanged.

Hover or focus a fighter to preview its animated sprite, name and existing
character description without changing any selection. Click a player label
to choose the mouse's target seat, then click a fighter tile to pick it.
Picking keeps that player's review controls open and does not auto-ready.
Ready human seats require an explicit Unready before another choice.
CPU seats can also be chosen directly from the roster.

Controllers retain their independent card cursors. Start joins/opens the owner's
controls, View/Select closes them, and normal confirm/back actions remain.
On the roster screen, vertical navigation moves by the displayed grid rows;
below the last row it returns to the existing confirmation/close/leave fields.
Each browsing/selected fighter has small player markers. Closed controllers
still share stage/settings controls, without gaining permission to pick a
different player's fighter through the mouse-targeted roster tiles.

Player cards are compact beneath the roster rather than replacing it. All
fourteen tiles, names and player controls fit at 1280 x 720 and 1920 x 1080,
including ten simultaneous editors. The online roster and card docks on other
menus retain their existing behavior. No controller mappings, combat values,
scoring, sports physics, fighter assets or match-round logic changed.

## Implementation

- `game.js`: restores the shared roster, read-only hover preview, per-player
  mouse targeting, safe direct picks and compact lobby presentation.
- `styles.css`: bounded roster/preview and compact controls for 2-10 players.
- `lobby-cards.js`: optional grid-row navigation; other menus retain their
  existing navigation behavior.
- `tools/build-core-release.cjs`: release notes and core-only packaging.
- `tests/roster-grid.browser.test.js`: roster visibility, mouse/keyboard focus,
  hover purity, CPU picks, Ready locks, independent cursors, eight player-count
  and resolution combinations, and direct offline play.
- `tests/player-cards.test.js`: adds isolated owner/grid navigation coverage.

There is no Git repository. Pre-change source and playable-release ZIPs are
retained under `exports/pre-roster-grid-*`. Historical fixtures remain intact.
Browser controller checks use simulated devices, not physical gamepads.

## Verification and Build

All seven relevant non-browser suites pass: player-cards, core-release,
shared-menu, match-flow, sports-guide, typography and rollback. Core packaging
checks 3,390 unchanged simulation frames and eleven replay restores. Rollback
checks 8,280 independent frames and 1,047 rollback events. No historical fixture
was regenerated; prior documented historical sports/Rain mismatches remain.

All five browser suites pass: roster-grid, player-cards, shared-menu,
sports-guide and core-release. The final export was separately rechecked with
the roster-grid and core-release browser suites, including real WebRTC 1v1,
offline play, mouse/keyboard picks, Ready locks, CPU picks and ten controllers.
All fourteen fighters remain visible in eight player-count/resolution cases
(2/4/6/10 players at 1280 x 720 and 1920 x 1080). Hovering is read-only.
Screenshots and reports are in `artifacts/roster-grid/`.

Playable build: `http://localhost:8084`.

Offline core-only ZIP: `exports/Dash-Punch-Full-Roster-2026-11-14.zip`,
7,665,221 bytes. Archive integrity passes. The whole extracted folder is needed
for direct `index.html` play. Existing exports and running servers are retained.
