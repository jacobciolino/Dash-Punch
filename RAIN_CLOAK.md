# Rain Cloak Texture

Rain retains the original Seeker PRO silhouette, source sheets, palette, native
resolution, animation timing and gameplay. Sparse raindrop markings use nearby
light/dark fabric shades, with no falling rain or weather effects.

## Rendering

`game.js` applies explicit native-pixel cloth coordinates for each authored pose
inside the existing cached palette pass. Full drops are 2x3 pixels; edge-on folds
use a restrained 1x2 variant. Nearby fabric shading is multiplied by 1.10 or 0.88.
Only fully opaque original cloak pixels qualify. Entire motifs are skipped if
any cell would touch the background, outline, eyes or non-cloth effects.

All 158 source frames are covered. There are 144 textured poses; white impact
flashes and late dissolved death frames intentionally have no markings. Idle and
dash coordinates are stable. Hurt and knockback marks share the same cloth
coordinates after their existing root translations. Facing and gravity use the
existing sprite transforms, not a separate screen-space overlay.

Character selection uses the same cached atlas. The pattern is created once per
source sheet, with no per-render pixel processing. It adds no gameplay fields,
physics, input, hitbox or network changes. Original assets remain intact and
reversibly available; no backup replacement sheets are required.

## Verification

- Seven focused test groups pass, including 1,710 exact gameplay-frame
  comparisons against the pre-texture release across Versus, all 15 Dashball
  arenas and all three Sandbag rulesets.
- Browser verification checks all 14 atlases and 158 frames byte-by-byte:
  1,980 changed cloth pixels, identical transparency, no other artwork changes.
- Actual-size before/after screenshots cover idle, movement, jumping, dash,
  directional attacks, hitstun, cling, crouch, death and character selection.
  1,264 frame/facing/gravity render combinations leave simulation state unchanged.
- Snapshot, delayed rollback and 30/60/120 Hz gameplay equivalence pass.
- Nine of ten selected regression scripts pass: Rain cloak, hurt alignment,
  gravity rendering, Orbit animation, Kite accessory, team silhouettes, online
  state, rollback and core release. Rollback checks cover 8,280 simulation frames
  and 1,047 rollbacks; core checks compare 3,390 frames and 11 replays.
- The existing Orbit halo test has an unrelated assertion that expects two
  equal hurt-frame hood anchors to differ. The identical failure was reproduced
  against the previous Orbit Halo release. No old test or fixture was rewritten.
  The known historical Rain/Orbit fixture discrepancy is unchanged.
- Final core release passes Chrome and offline file loading without exceptions
  or missing assets. Ten Rain CPUs across existing sports render successfully.
  A short 240-frame headless run measured about 16.7 ms median/p95 frame intervals,
  with none over 25 ms. This is not a physical-device performance guarantee.
- Original asset hashes, animation metadata, roster, stages and network identity
  match the pre-texture release. Physical controllers were not retested for this
  presentation-only patch.

Reports, unfiltered test logs and screenshots: `artifacts/rain-cloak/`.

## Files and Release

- `game.js`: frame-aware texture, cached tint integration, debug inspection and
  patch notes.
- `tools/build-core-release.cjs`: core patch notes and README description.
- `package.json`: focused test commands.
- `tests/rain-cloak.test.js`, `tests/rain-cloak.browser.test.js`.
- `playtest-release.json`: selects the final core build.

No Git repository exists. Pre-change source checkpoint:
`exports/pre-rain-cloak-2026-11-14.zip`. Prior releases are retained.

Release: `exports/Dash-Punch-Rain-Cloak-Release-2026-11-14/` and its `.zip` sibling.
Preview: `http://localhost:8080/`.
