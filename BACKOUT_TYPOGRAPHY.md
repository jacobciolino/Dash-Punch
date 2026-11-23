# BackOut Typography

November 14, 2026. Presentation-only update; no sprite, fighter, collision,
scoring, input-mapping or multiplayer-protocol changes.

## Official Font And License

Source: https://gitlab.com/velvetyne/backout, Velvetyne Type Foundry's official
repository, pinned to commit `4f894ca0` (October 4, 2022).
The foundry page https://velvetyne.fr/fonts/backout/ redirected to its strike
notice during acquisition, so the download used the foundry's own repository,
not a font mirror. The original archive remains in temporary acquisition storage;
the project retains the actual official webfont and license notices.

Upstream README version: **BackOut 2.1**. The distributed font's binary metadata
still says **Version 2.001**, family **BackOut Medium**, PostScript name
**BackOut**. Original design: Frank Adebiaye (2012). Revision: Ariel Martin Perez
(2019, updated kerning in 2022). Original UTF-8 author names and notices remain
in `FONTLOG.txt`, `TRADEMARKS.md` and the font metadata.

License: **SIL Open Font License 1.1**, allowing bundling/embedding with software
while preserving the license and copyright notices; not standalone font resale.
Reserved Font Name: **Backout**. BackOut is a trademark of Frank Adebiaye.
The font is unchanged, without conversion, modification or subsetting.

`assets/fonts/backout/` contains `BackOut.woff2` (41,696 bytes), the original
`LICENSE.txt`, `FONTLOG.txt`, `TRADEMARKS.md`, and project `NOTICES.txt` recording
provenance and copyright. WOFF2 SHA-256:
`f0f2e44bcd3b3fd2ec96c58745519e818741e72ceb3f41aab62bbb7dd28ea94a`.

## Application

- `typography.css`: one HTML family token, the local `@font-face`, bounded font
  metrics, no synthetic bold/italic, BackOut form controls and tooltips.
- `typography.js`: shared Canvas font helper and presentation readiness.
- `styles.css`: all generic/monospace overrides now use the shared family.
  Compact card controls/status text are slightly larger; spacing is zero.
- `game.js`: all 46 Canvas font assignments use the shared helper, including
  round/countdown, HUD, sports scores/progress, object labels, player markers,
  notifications, KO markers, debug and development Stage Builder text.
- Title, play/mode, stage, lobby, teams, Ready/Unready, settings, controls,
  disconnect, errors, online setup, patch notes, pause and victory inherit the
  same family. Original art, animation frames and palettes are untouched.
- Existing title-based tooltips now use an accessible, viewport-bounded shared
  BackOut tooltip instead of unstyleable native browser tooltips. Focus and
  pointer interactions do not change menu ownership or gameplay state.
- Boulder/gravity HUD text reserves space for the existing Pause button.
- Future tutorial exports use the shared font and await readiness too; previous
  exported videos/images were not overwritten.

## Readiness And Offline Behavior

Initial presentation waits for the actual font face, not just stylesheet loading.
Canvas draw entry points reject an outstanding load; the first frame's clock is
rebased after presentation startup, so loading time is not simulated as combat.
Font status, promises, tooltips and failure notices never enter snapshots or
rollback hashes. Existing fixed-step simulation remains independent.

The release builder embeds the original WOFF2 bytes into `typography.css` as a
`data:font/woff2` resource, and also includes the original local file and notices.
No Google Fonts, CDN or other remote runtime resource is used. The server can
also serve the development WOFF2 with `font/woff2` MIME type. Manifest font
metadata records source, release/binary versions, license, hash and embedding.

If loading fails, or exceeds five seconds, presentation continues with a plainly
announced system-font recovery. No unrelated decorative replacement is used.
If a slow font eventually succeeds, the notice disappears. Older environments
without the Font Loading API retain ordinary CSS fallback behavior.

## Readability Exceptions

No normal game label, timer, score, tiny HUD field or menu uses a readability
fallback. The collected visible English text and Canvas labels have no missing
characters against the official UFO's 434 mapped codepoints, including the
current arrows, punctuation and numeric symbols. A real browser font inspection
also confirms use of the downloaded custom BackOut face, not a local substitute.

The browser-owned clipboard fallback `window.prompt` (invitation copying) and
browser/OS permission dialogs cannot be styled by the game and retain OS fonts.
Unsupported characters in arbitrary external controller/browser error strings
may use the centralized fallback stack. The explicit font-failure recovery is
the other intentional fallback. These are not alternate decorative UI fonts.

## Files And Checkpoints

Added: `typography.js`, `typography.css`, the five font/license files,
`tests/typography.test.js`, `tests/typography.browser.test.js`, this report.
Modified: `game.js`, `styles.css`, `index.html`, `server.js`,
`tools/build-core-release.cjs`, `tools/render-tutorial.cjs`, `package.json`,
`tests/simulation-harness.js`, `tests/online-state.test.js`, `CORE_RELEASE.md`,
`ARCHITECTURE_AUDIT.md`. The builder updates `playtest-release.json` and generated
release files. Font-only additions leave existing art hashes unchanged.

Pre-change checkpoints: `exports/pre-backout-release-2026-11-14.zip` and
`exports/pre-backout-source-2026-11-14.zip`. This is not a Git checkout; no Git
commit or repository setup is claimed. Historical replay fixtures are untouched.

## Verification

Focused commands: `npm run test:typography` and
`npm run test:typography-browser`. The browser report and representative
screenshots are in `artifacts/backout/`. Tests verify official font bytes and
notices, CSS/Canvas coverage, exact embedding, absence of external font requests,
delayed/failed loading, offline Canvas readback, real font selection, stable text
measurements and rendering purity across every registered sports HUD.

The unit suite compares 1,380 exact pre-font frames across all 14 fighters,
15 Dashball stages and three Sandbag rulesets; all hashes match. It also checks
30/60/120 Hz agreement and independence of readiness flags from snapshots.

The layout/card and shared-menu suites use simulated browser Gamepad API devices.
They do not claim physical controller or TV testing. Existing round/victory,
core release, online-state and rollback regressions are run separately. The
known historical Rain/Orbit fixture issue remains documented and unchanged.

## Completed Results And Release

- Focused typography: **6 groups passed**, including 1,380 pre-font frame
  comparisons, all fighter/sports hashes, 30/60/120 Hz, exact WOFF2 embedding,
  provenance, all font assignments and failure recovery.
- Typography browser: **51 captured screens passed** at 1280x720 and
  1920x1080. Includes title/modes, two/ten-player cards, Ready, stages, controls,
  all settings layouts, tooltips, round/sports HUDs, countdown, overtime,
  victory/rematch, pause, notes and controller-disconnection screens.
- Every registered Dashball HUD was rendered; render calls preserved hashes.
  All captured Canvas assignments used BackOut (18 size/weight combinations).
  Real browser inspection confirmed a custom BackOut face. Collected normal
  text has no missing glyphs against the official source character map.
- Offline `file://` with browser networking disabled: font loaded, title
  rendered and text-only Canvas pixel readback succeeded without security errors.
  Zero external requests, missing assets or ordinary runtime/font errors.
- Delayed font startup kept text-dependent rendering gated. Deliberately corrupt
  font data produced the explicit recovery notice and still-usable menus.
- Player cards: complete independent-owner lifecycle, keyboard plus controller,
  ten owners, full-capacity/CPU handling, 5v5 teams, ambiguity-safe reconnect,
  pause, Ready locks, rematch and all 720p/1080p layouts passed with larger labels.
- Shared menus: 9 groups and 1,710 exact simulation frames, plus browser tests
  with one/two/four controllers passed. Round flow: 14 groups and the browser
  suite's all-14 victory appearances/two- and five-fighter lineups passed.
- Rollback: 8,280 independent frames and 1,047 rollbacks passed. Core release:
  3,390 unchanged frames and 11 replays passed. Online-state, Orbit animation,
  four-direction gravity rendering and signaling-server suites passed.
- Real WebRTC 1v1: Versus/Soccer round clocks, state agreement, 2-0 victories,
  pause and rematches passed with 50 ms artificial delay, 15 ms jitter, 5% loss.
- Final core browser: 77 runtime bitmaps, 26 embedded sheets, offline match
  start, ten-fighter combat, online play, pause/rematch/disconnect all passed.
  Ten-fighter sample: 16.7 ms median/p95; zero frames above 25 ms in 180 samples.
  This is a headless-machine sample, not a hardware-wide or physical-TV guarantee.
- Five edited-source syntax checks passed. No dependency was added and no
  historical baseline was regenerated. Not every old development-only UI script
  was run; the current lobby and match contract suites were used.

Release folder: `exports/Dash-Punch-BackOut-Release-2026-11-14/`.
Offline ZIP: `exports/Dash-Punch-BackOut-Release-2026-11-14.zip`.
Size: **7,667,705 bytes**, about 92 KB larger than the preceding player-card ZIP.
Compressed-data integrity check passed.
SHA-256: `12b686df681d3f26bf46e3a1497b70727a5b486fd3f41e2586dc00c8d32f02f3`.

Preview: http://localhost:8080/?v=backout . Served game, typography, HTML, original
WOFF2 and license bytes were checked against this release. The original font
route returns `font/woff2`. Experimental content remains physically omitted.
