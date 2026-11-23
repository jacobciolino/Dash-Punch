# Texture-Defined Terrain Edges

Normal gameplay terrain no longer draws yellow platform rectangles, gray
floor/wall rectangles, one-way dashes, blue wall washes, moving-platform path
guides, yellow hole lips or the full-height dashed hole box. Stage-select terrain
previews also use the existing edge/ground textures, without borders or shadows.
Menu focus highlights and functional wrap-portal markers are intentionally kept;
they do not describe platform collision bounds.

All nine core stages use their existing pack textures in both Enhanced and
Classic graphics. The Deep Forest edge crop now repeats the existing 32x16 soil
ledge at source `(352,272)` in `mainlev_build1.png`, at native pixel scale, instead
of the sparse vine crop. No colored outline, invented texture or new art was added.
The subsequent snow/castle terrain-variation pass is documented in
`TERRAIN_VARIATION.md`; other texture sources are unchanged. The rebuild accepts
`--textures-only` to avoid rewriting scenery images.

Collision outlines and movement guides are drawn separately by `drawDebugTerrain`
when the existing `debugHitboxes` URL option is present. Remove that option for
normal gameplay. Stage Builder's editing outlines remain intact.

No collision code, terrain dimensions, platform motion, gravity, wall mechanics,
attack properties or combat timing were changed. The normal and debug draw passes
are verified not to mutate terrain rectangles or authoritative state.

Validation: `terrain-borders.browser.test.js` checks zero normal terrain strokes
across nine stages, retained debug outlines, textured borderless previews, both
graphics qualities and a live four-AI match. Desktop captures were inspected for
surface readability; they are in `artifacts/terrain-cleanup/`. Existing 1,440-frame
gameplay baseline, graphics-quality determinism and rollback regressions pass.
This is visual QA on the current desktop setup, not a substitute for hands-on
testing at every screen size or during every possible multiplayer effect stack.
