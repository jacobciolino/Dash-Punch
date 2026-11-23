# Core Stage Art

Presentation assignments in `presentation-assets.js`:

| Stages | Supplied pack |
| --- | --- |
| Crosswire, Flip Chamber, Castle Dungeon | PF Castle Prison 1.0 |
| Uplift, High Perch | PF Snowy Mountains 1.0 |
| High Perch Drift, Smash Vile | PF Strange World 1.0 |
| Perch, Battlefield, Corners, Enchanted Forest | PF Deep Forest 1.0 |

Original PNG sheets/layers are retained in `assets/stages/<theme>/`. Scene PNGs
combine the supplied layers; Castle Prison assembles its background atlas.
Ground and edge PNGs are derived from authored texture crops. Castle and snow
use larger, fixed mosaics of compatible native-resolution patches rather than
one small repeating crop; see `TERRAIN_VARIATION.md`. Rebuild with
`tests/build-stage-art.js` using the existing Playwright installation. Use
`--textures-only --theme=snowy-mountains` (or `castle-prison`) to rebuild just
that theme's terrain without changing scenery. No runtime dependency is added.

Classic graphics uses a single scene image per theme and cached Canvas patterns for
ground surfaces. Enhanced graphics adds shared cached parallax, atmospheric depth
and restrained lighting; see `HD2D_STAGE_POLISH.md` for the audit and comparison.
Images load lazily and the current stage's textures participate
in countdown asset readiness. All imagery is cosmetic: collision, moving terrain,
warps, gravity, hitboxes and camera rules are unchanged. One-way platform and
surface edges come from the pack textures; collision outlines are debug-only.
Stage-select previews use the same scenes and terrain textures. See
`TERRAIN_VISUALS.md` for the legacy-border cleanup.
The two 5v5 arenas reuse these source images, with warm dungeon illumination and
green/gold forest atmosphere profiles. See `TEAM_ARENAS.md` for geometry, captures,
ten-fighter measurements and local/online limits. No new environment art is added.

Deep Forest includes the retained `public-license.txt`, naming Szadi art and
permitting use/editing but prohibiting resale of the asset pack. The other three
supplied ZIPs contain no license text; retain the original purchase/download
terms before publishing. Do not assume the Deep Forest terms cover other packs.
