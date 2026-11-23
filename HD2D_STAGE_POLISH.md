# HD-2D-Inspired Stage Presentation

## Audit And Prototype

The installed environment packs are unchanged:

| Pack | Existing source inventory | Used for |
| --- | --- | --- |
| PF Castle Prison 1.0 | `background_obj.png`, `mainlevbuild.png`, `mainlevbuildB.png`: background masonry/arches/columns, terrain, barred openings, chains, brazier decorations | Crosswire, Flip Chamber |
| PF Snowy Mountains 1.0 | Six background layers (`1`, `2a`, `2b`, `3`, `4`, `5`), two construction sheets: sky, mountain distances, snowy trees, rock/snow ledges and walls | Uplift, High Perch |
| PF Deep Forest 1.0 | Five backgrounds, two construction sheets: sky, distant canopy, trees/undergrowth, root/soil/wall tiles and vegetation details | Perch, Battlefield, Corners |
| PF Strange World 1.0 | Four backgrounds, `decorative.png`, construction sheets A/B: sky, distant silhouettes, twisted landscape, stone/soil walls, columns and decorative scenery | High Perch Drift, Smash Vile |

Existing `scene.png`, `ground.png` and `edge.png` files remain the Classic
presentation and menu previews. No new stage artwork was generated or substituted.
The Castle pack is an atlas rather than a set of complete parallax layers, so its
existing backdrop components are composed into depth layers. Border-connected
atlas matte is removed in the cached cutout; the source PNGs are never edited.

The audit found a Canvas 2D renderer drawing a single static backdrop before
terrain and fighters. Layer composition, source-atop grading, cached Canvas
filters, gradients and low-opacity screen blending are sufficient; no engine
rewrite, WebGL pipeline or new dependency is needed.

Perch was prototyped first: a fixed view, solid floor, one platform and an
uncluttered view of both fighters. Before/after captures were inspected before
enabling the same renderer on the other eight core stages.

## Working Presentation

- Three scenery depths per theme, with bounded, integer-offset parallax responding
  to existing camera position and the fighters' average position. The game camera
  itself is not changed. Backgrounds also cover High Perch's open-top views.
- Depth-specific palette grading, subtle haze and soft ambient light gradients
  baked into cached background canvases. No fog particles, geometric decorations,
  replacement terrain, or foreground occluders are added.
- Selective far/mid-background blur baked once. Near scenery remains detailed;
  terrain and Seeker animations are never passed through a blur filter.
- Selective bloom only on the Castle pack's actual brazier flame pixels, isolated
  with a brightness mask and blurred once. Window openings are not emissive:
  their apparent white areas were transparent, so they were explicitly excluded.
- Brief, low-opacity environmental illumination from existing charge/hitstop/
  impact state. It is drawn behind fighters and functional stage controls, affects
  at most three light contributions, adds no damage, and creates no gameplay state.
- Palette intent: cool blue prison interiors, icy mountain depth, muted green
  forest haze, and subdued lilac/olive Strange World distance. Shared contrast and
  lighting limits keep the stages cohesive. Per-stage haze/parallax multipliers
  distinguish the nine layouts without adding separate rendering systems.

## Quality And Performance

Settings -> Graphics toggles **Enhanced / Classic**, with keyboard or controller.
The choice saves locally, does not enter rollback snapshots, and need not match
the other player's setting. Classic restores the previous single-image stage
renderer and skips extra environment layer requests on a fresh session.

Static layers are cached per theme, with at most four theme entries. The final
background composite is reused until quantized parallax changes. Filters are not
run on the main game canvas or once per frame. Charge illumination uses a cached
light texture rather than a live blur. Cache construction is warmed before the
match countdown becomes ready. The maximum tested cache is below 16 million
RGBA pixels (64 MB), excluding decoded source images and the existing sprite cache.

Fighter art still uses integer effective-pixel scale and nearest-neighbor sampling.
Canvas display also uses nearest-neighbor scaling. Background depth/ambient effects
are intentionally softer; none is applied over fighters. Existing geometry,
hitboxes, walls, warps, moving platforms, collision, gravity, attack timing,
wall-sling/slide, hitstop and rollback rules are preserved.

### Comparison On This Machine

Headless Chrome, 1280x720 game canvas, same two-fighter Perch fixture, 160 warmed
draws per run. A one-pixel readback forces completion; this is a render-cost
microbenchmark, not FPS or a cross-device guarantee.

| Scenario | Median draw | p95 draw |
| --- | ---: | ---: |
| Original renderer, static fixture | 2.4 ms | 4.2 ms |
| Enhanced, cached static fixture | 1.9 ms | 5.7 ms |
| Classic, moving-focus fixture | 2.4 ms | 3.6 ms |
| Enhanced, moving-focus fixture | 1.9 ms | 5.5 ms |

The results do not establish an overall speedup: Enhanced has a higher tail cost.
The existing live two-player performance test still measured median 16.7 ms and
p95 16.8 ms between animation frames, with zero of 180 samples above 25 ms.
That is approximately 60 FPS on this machine. Classic is the lower-complexity
option for slower hardware. Moving Enhanced reused its composite for most frames:
28 composites in 160 measured draws; blur ran only twice while building the theme.
Raw benchmark JSON and screenshots are in `artifacts/hd2d/`.

## Screenshots

[Perch Before](artifacts/hd2d/perch-before.png)
and [Perch After](artifacts/hd2d/perch-after.png).
All nine Enhanced stage captures, three viewport captures and verification results
are in the same folder. These are frozen visual fixtures, not scripted combat.

## Verification

- All nine theme assignments and source files validated.
- 810 simulation frames match between Classic and Enhanced across all nine stages.
- The prior 1,440-frame gameplay baseline remains identical.
- Browser tests verify parallax, one-time filters, stable caches, bounded memory,
  identical fighter pixels across qualities, illumination/render purity, open-top
  camera coverage, saved settings and keyboard/controller operation.
- Captures at 960x640, 1280x900 and 1920x1080, at device pixel ratio 2.
- Existing gravity, High Perch Drift, countdown, menus, authoritative-state and
  rollback tests pass. Real two-browser WebRTC tests pass with different local
  graphics settings, including pause, rematch and disconnect.

## Missing Assets / Deliberately Not Invented

The packs contain no authored fog volumes, depth/normal maps, directional lighting
maps or matching luminous props for every environment. The implementation uses
presentation gradients and layer depth settings, not fabricated art. Snow,
Forest and Strange World therefore have no invented torch or glowing-object
bloom. No 3D reconstruction, moving foreground foliage, sun shafts, artificial
snow particles or new environmental hazards were added. Existing unused decorative
sprites remain available, but were not scattered over gameplay surfaces.

Physical low-end GPUs, every browser's filter implementation, sustained ten-player
stress and additional device-pixel ratios still need hands-on validation. Existing
pack-license notes in `STAGE_ART.md` continue to apply.

## Changed Files

`stage-renderer.js` adds the isolated Canvas presentation adapter.
`presentation-assets.js` contains reusable theme data. `game.js` supplies read-only
presentation snapshots, countdown preparation and the settings hook. `index.html`
loads the adapter; `server.js` serves it; `styles.css` preserves nearest-neighbor
display. New tests cover the renderer, performance comparison and captures;
the simulation harness loads the adapter and the online test varies client quality.
The project still has no Git repository; no Git checkpoints are claimed.
