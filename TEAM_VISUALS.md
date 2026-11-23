# Team Silhouettes

Shared fighter rendering now draws a crisp native-pixel silhouette outline and
restrained outer glow behind authored sprite frames. Original artwork is drawn
unchanged on top. Team mode uses the actual assigned team and existing color
authority: Red `#FF584F`, Blue `#35BFFF`; additional teams retain their established
colors. Sandbag's existing team/color convention is respected. FFA keeps its
existing identification; neutral objectives are not sent through this renderer.

Settings > Team Outlines and Team Glow are independent, on by default, and save
automatically in local storage. Keyboard and controller navigation are supported.
These are presentation-only preferences: no rollback/hash/configuration fields,
team changes, hitbox changes or combat effects are introduced.

## Implementation

`team-silhouette.js` is a small dependency-free presentation helper. Offscreen
Canvas compositing dilates source alpha by two native pixels, subtracts the
original silhouette and colors only the outside boundary. Larger authored
pixel-grid variants use their actual grid, not their export bitmap resolution.
The separate glow is built once with a three-native-pixel blur, subtracts the
original sprite/outline interior, and draws at 0.32 opacity. Nearest-neighbor
sampling keeps the artwork and crisp outline sharp. No per-frame pixel scans,
full-screen blur, recolored animation-sheet copies or sprite distortion.

Cache keys use image identity, frame crop, native dimensions and team color.
Alpha masks are reused across draws until animation/frame/color changes. The LRU
is bounded to 320 entries and 1,200,000 canvas pixels including outline and glow
(about 4.8 MB RGBA, plus two reused scratch canvases). Team swaps select the new
color immediately; no fighter owns a stale cached team mask.

The existing shared sprite path applies the effect before existing flip,
gravity rotation, anchor, scale, transparency and state effects complete. Authored
multi-part bodies/weapons/spikes inside the frame form one silhouette. Separate
spell/projectile effects retain their own established presentation. Hit flashes,
shields, charge effects, afterimages and magazine pips are not recolored.
Sports death animation passes retain their alpha; fully hidden bodies do not
leave a persistent team glow. Explicit Block-model testing outlines only its
actual visible body shape through the same helper; it does not add rectangular
borders around authored sprites. Temporary body masks are bounded to 32 entries.

No stage-specific outline implementations exist. Tests cover all nine Dashball
sports, all three Sandbag variants, Versus teams and FFA. The same helper supports
future team modes through authoritative team assignment and normal sprite draws.

## Checks

- `tests/team-silhouette.test.js`: native alpha/holes, original interior pixels,
  correct colors, static-frame cache reuse, 1,000-key bounded-cache stress,
  immediate team swap, Sandbag mapping, FFA and unchanged simulation hashes.
- `tests/total-rush.browser.test.js`: real sprite pixels, mirrored and four-axis
  gravity alignment, glow-off/outline-on, hidden KO, thirteen core models and
  idle/dash/attack/shield/hit/death transitions. Keyboard/controller setting
  toggles and saved preferences are checked with emulated controller input.
- Real online peers with opposite visual preferences retain matching confirmed
  gameplay hashes. No physical controller feel is claimed.
- Before/after renderer benchmark uses the same frozen ten-fighter Total Rush
  scene, warmed caches, and 60 timed draws per setting. The browser report records
  median/p95 CPU draw times and verifies no warm-frame mask rebuilds. A separate
  live ten-CPU test samples 180 frame intervals, all objectives and combat active.

Screenshots: `artifacts/total-rush/team-silhouettes.png`, `opening-1440.png`,
`combat-980.png`, `ten-cpu-live.png`. Numerical results are in `browser-results.json`.
Local timing is not a guarantee for all hardware. Overlap readability, outline
thickness and glow taste still benefit from human playtesting.
