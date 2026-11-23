# Snow And Castle Terrain Variation

This is a presentation-only change. Stage geometry, surface heights, collisions,
platform motion, wall behavior, fighter sprites and combat rules are untouched.

## Authored Texture Sources

The old terrain used a repeating 64x64 fill and 64x16 edge. The snowy fill was
actually masonry from the bottom of its construction sheet. Both affected themes
now use a fixed 1024x512 fill and 1024x16 edge assembled from native-resolution
patches in their existing PF environment sheets:

| Theme | Fill source regions (x, y, width, height) | Edge source regions |
| --- | --- | --- |
| Snowy Mountains | `mainlevbuild1.png`: (320,144,96,32), (160,464,416,16) | Same sheet: (192,440,352,16), (192,328,128,16) |
| Castle Prison | `mainlevbuildB.png`: (208,128,96,64), (208,208,96,64) | `mainlevbuild.png`: (240,672,192,16), (144,672,48,16) |

Snow now has natural dark rock and varied snow caps. Castle masonry uses multiple
authored stone arrangements, staggered courses and matching stone caps. Compatible
patch families are grouped into larger sections, avoiding immediately repeated
neighboring selections. No new artwork, noise overlays, colored borders, sprite
distortion or foreground clutter was generated. Deep Forest and Strange World
textures are unchanged. Existing source sheets and licensing information are
retained; see `STAGE_ART.md` for the supplied packs' license limitations.

## Runtime And Rebuilding

`presentation-assets.js` marks the two themes as larger variation atlases.
`drawTerrainArt` still uses the existing two cached Canvas patterns per surface,
not individual tile draws or per-frame texture generation. Each platform chooses
a fixed, tile-aligned texture origin from its original geometry. Moving platforms
retain that origin as they travel, including after snapshot restore. No simulation
seed, gameplay random number, frame clock or camera position influences it.

Stage-select previews use the same atlases and offsets at their existing half-size
texture scale, rather than shrinking the whole atlas into a tiny repeating tile.
Both Enhanced and Classic quality use the same sharp terrain. The two larger fill
atlases total 4 MiB of decoded RGBA pixels, replacing two 16 KiB fills; loading is
still lazy and covered by the existing match-readiness checks.

Rebuild using the existing Playwright installation:

```sh
node tests/build-stage-art.js --textures-only --theme=snowy-mountains
node tests/build-stage-art.js --textures-only --theme=castle-prison
```

These fixed offline compositions are reproducible and do not rebuild backgrounds.

## Verification

- `terrain-variation.browser.test.js`: five affected stages, both quality modes,
  non-repeating texture coverage, unchanged geometry/simulation while drawing,
  distinct platform texture origins, moving-platform stability, snapshot restore
  and correct stage-preview texture sizing.
- `hd2d.test.js`: 810 identical simulation frames across graphics quality settings
  and existing bounded background caches.
- `pro-visuals-simulation.test.js`: all 1,440 frames match the existing unchanged
  combat baseline.
- `team-arenas.test.js`: ten fighters, moving-platform carry/reversal, wall
  collisions, cling/sling, forest recovery and deterministic snapshot replay.
- `terrain-borders.browser.test.js`: no normal terrain outlines across nine
  stages, debug outlines preserved, borderless previews and live four-AI play.
- `ROLLBACK_QUICK=1 node tests/rollback.test.js`: 74 rollbacks up to eight frames
  deep, defensive/combat stress cases, packet loss and rematch checks passed.
  This was the quick network/stress suite, not the full independent-frame soak.
- `team-arenas.browser.test.js`: ten live CPUs in Castle Dungeon and Enchanted
  Forest, both quality modes, full-stage visibility and three viewport sizes.
  Castle Dungeon sampled 16.7 ms median RAF intervals, 16.8 ms Classic / 16.7 ms
  Enhanced p95, with zero of 180 samples over 25 ms in each mode. These are local
  headless Chrome measurements, not a hardware-wide performance guarantee.

Before/after captures and source-crop inspection are in
`artifacts/terrain-variation/`. The original before images were captured before
the texture rebuild. Screenshots show High Perch, Uplift, Castle Dungeon, Flip
Chamber and Crosswire; the after stage-select capture verifies preview readability.

There is no Git repository in this working folder, so no Git checkpoint was
created. Existing gameplay regression baselines were not replaced.
