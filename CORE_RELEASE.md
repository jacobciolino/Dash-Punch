# Core-Only Playtest Edition

Core-only is now the default for every new playtest/release (`npm run build` or
`npm run build:playtest`). Existing development content and old archives are
retained. Experimental content must be explicitly requested for distribution.

Lightweight releases default to Classic graphics and a separate saved graphics
preference; Enhanced remains opt-in. Showcase scenes/choreography are removed
from the export, while the shared input adapter used by sports CPUs is retained.
`playtest-release.json` selects the core folder served by normal `npm start`.
Imported test servers and explicit `DASH_PUNCH_DEVELOPMENT=1` still serve source.

`tools/build-core-release.cjs` produces a separate, streamlined game folder.
The development project retains its full experimental roster and stages. Its
Local/Online artwork now uses only the actual core sprites: Orbit/Anchor and
Spike/Rain, with existing authored Dash/cast frames and Anchor's spell-fist.
An existing CSS cascade conflict that squeezed the mode tiles is corrected.

## Included And Omitted

- All 20 current core fighters, now including Icer. This describes the next source
  build; previously shared ZIPs are not rebuilt or modified by FEATURE tasks.
- All currently registered core fighting and sports stages, including 5v5 arenas.
- Up to ten local fighters, humans/CPUs, teams, friendly fire, remapping and
  graphics settings. Core fighter abilities and combat rules are unchanged.
- Private online rollback 1v1. Both players must use this Core Edition. The
  online arena is Crosswire, replacing the full edition's experimental Flat.
- Latest Orbit/Anchor splash and snow/castle terrain textures.

The generated character and stage data contain no non-core records. Only sprite
sets, stage profiles and bitmaps reachable from the core presentation metadata
are included. Experimental asset packs, old illustrations, screenshot galleries,
test fixtures and development dependencies are not shipped. Stage Builder,
Quick Playtest, Showcase and the experimental toggle have no menu entry points
in the core edition. The full project's tools and saved custom stages are not
deleted or overwritten.

## Build Method

```sh
node tools/build-core-release.cjs /path/to/empty/Dash-Punch-Core
CORE_RELEASE_DIR=/path/to/Dash-Punch-Core node tests/core-release.test.js
CORE_RELEASE_DIR=/path/to/Dash-Punch-Core node tests/core-release.browser.test.js
```

The builder evaluates the existing trusted stage/character data declarations in
an isolated Node VM, resolves inherited properties, selects the existing core
sets and serializes those records. Character defaults, movement, attacks,
collision, input, physics and rollback functions remain shared with the source.
Unused legacy sprite registrations are omitted. Existing code-section markers
and the expected base network build are checked so source drift fails loudly.
There is no new runtime framework or third-party dependency.

Twenty unique sprite source sheets are embedded once in the presentation script,
instead of shipped again as PNG files. This preserves the original bytes and
permits Canvas recoloring/pixel-grid processing when opened directly through
`file://` in Chrome. Other bitmaps remain separate and lazy-loaded. No poses or
animation timings are changed to support embedding. Original applicable license
and credit files are retained; asset resale rights are not granted by this ZIP.

The core edition has its own lobby preference key and distinct network build
suffix. Controller mappings remain compatible with the existing profiles.
It intentionally does not connect to full-edition peers, whose stage indices
and content pools differ. Existing data signatures also remain enforced.

## BackOut Typography

The current release bundles the original BackOut WOFF2 from Velvetyne's official
repository, pinned to `4f894ca0`. Upstream calls the release 2.1; the binary name
table retains `Version 2.001`. No conversion, subsetting or font editing occurs.
The builder copies its SIL OFL 1.1 license, FONTLOG, trademark and attribution
notices, records the font hash/version/license in the manifest, and embeds the
same WOFF2 bytes into `typography.css` for reliable offline `file://` use.

`typography.js` gates initial presentation on font readiness and centralizes
Canvas text. `typography.css` supplies the shared HTML family and font metrics.
This presentation state is excluded from combat, snapshots and rollback. A
failed font load produces an explicit recovery notice and system-font fallback;
the wait is bounded to five seconds. See `BACKOUT_TYPOGRAPHY.md` for validation.

## Verification

Sports guides are bundled as `sports-guide.js`, using current stage factories and
the shared world painters. All fifteen Dashball stages and three Sandbag rules
have accurate initial-layout previews, concise rules and actual scoring values.
No external preview images, development assets or new dependencies are shipped.
See `SPORTS_STAGE_PREVIEWS.md` for regeneration, caching and verification.

`tests/core-release.test.js` compares every core character's final data with the
full edition, checks unchanged geometry, compares 1,170 simulation frames across
all eleven stages and both ten-fighter arenas, and restores/replays eleven
snapshots. Only stage indices and their contact-ID prefixes are normalized for
cross-edition comparison because pruning necessarily renumbers the stage list.
No combat fields or existing regression baselines are replaced or relaxed.
Runtime bitmap and embedded-sheet SHA-256 hashes are verified.

`tests/core-release.browser.test.js` checks all installed images, core-only menus,
old experimental-save handling, controller joining/navigation, CPU setup, 5v5
countdown and live combat, desktop/small-window mode artwork, real two-context
WebRTC play with 50 ms delay/15 ms jitter/5% loss, pause, rematch, disconnect,
and direct offline-file entry through a full match countdown.
Gamepad tests are automated emulation, not physical-controller validation.

Screenshots and the measured browser report remain outside the release ZIP in
`artifacts/core-release/`. There is no Git repository in this folder, so no Git
checkpoint is claimed.

## Latest Verified Package

The current character-selection build is
`exports/Dash-Punch-Full-Roster-2026-11-14.zip` (7,665,221 bytes). It restores the
full fourteen-fighter grid, hover preview and direct picks above compact player
controls. Seven relevant non-browser suites and five browser suites pass;
offline play, private WebRTC 1v1 and archive integrity are verified. See
`ROSTER_GRID.md`. The earlier sports-preview validation below remains applicable.

`exports/Dash-Punch-Sports-Previews-Release-2026-11-14.zip` is 7,668,320 bytes.
It includes fourteen fighters, eleven Versus stages, fifteen Dashball stages,
three Sandbag rules, the embedded BackOut font and cached real-renderer sports
guides. All 86 extracted files match the checked release; ZIP integrity passes.
All eight current browser suites pass, including offline and real WebRTC play.
Six older sports suites still fail only their historical replay assertions;
checkpoint evidence confirms these predate the preview patch. Baselines were
not regenerated. See `SPORTS_STAGE_PREVIEWS.md` for full results and limitations.

## Historical Core Package

`Dash-Punch-Core-Only.zip` is 7,120,971 bytes (7.12 MB), 88.8% smaller than the
previous 63.9 MB full playtest ZIP. Archive integrity and byte-for-byte extracted
contents were checked, then the extracted build passed the simulation suite.
The browser suite passes direct offline-file play and hosted local/online play
with zero missing bitmaps. Ten-fighter sampling was 16.7 ms median / 16.8 ms p95,
with no sampled frames above 25 ms on this machine. This is not a hardware-wide
performance guarantee. The full project's 1,440-frame gameplay baseline and
mouse/keyboard menu-flow regression also pass unchanged.
