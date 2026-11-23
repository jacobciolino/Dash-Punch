# Five Versus Five Core Arenas

## Play

Castle Dungeon and Enchanted Forest are in the normal core stage pool, without
experimental asterisks. Choose either in Stage Select, then **Set Up 5v5** to
return to the lobby with ten seats in two teams. Existing human/controller seats
are retained; spare seats become CPUs. Ready the humans and choose Fight normally.
The shortcut preserves the current Team Attack preference (on by default).
Additional controllers use the existing lobby: change a CPU seat to Human before
joining it, or close that seat to let a controller claim it. Rematch/return retain
the lobby settings. No separate mode or experimental pool was introduced.

**Ten local fighters are supported. Online remains two-human 1v1.** This patch
does not add 5v5 networking or change controller assignments/polling. Physical
ten-controller operation still depends on the browser, OS and adapters.

## Geometry And Camera

Both stages are 3456 x 1740 world pixels: 2.7 times the standard 1280-pixel width.
The continuous floor starts at y=1584. Five **solid** floating platforms support
landing, side-wall cling/sling and underside impacts through the existing solver:

| Platform | Base x | y | Width x height |
| --- | ---: | ---: | --- |
| Lower left | 480 | 1280 | 480 x 36 |
| Upper left | 912 | 960 | 480 x 36 |
| Lower right | 2496 | 1280 | 480 x 36 |
| Upper right | 2064 | 960 | 480 x 36 |
| Moving center | 1488 | 640 | 480 x 36 |

The upper platform reuses the existing simulation-time sine mover:
`x = 1488 + 576 * sin(stageTime * 0.24)`. Its period is about 26.18 seconds,
maximum speed 138.24 world pixels/second. Endpoints reverse smoothly. Existing
moving-terrain velocity carries standing fighters; no second mover/collision
system was added. Platform spacing was checked against current dash travel and
super jumps, not achieved by increasing fighter or projectile speeds.

Five-fighter team lanes place centers at x=384, 600, 816, 1032, 1248 and their
mirrored right-side positions. Spawns follow actual team ownership rather than
assuming consecutive slot numbers. Initial bodies do not overlap, including
Chungus. Uneven teams use a wider lane when more than five seats share a side.
FFA and other existing team rules remain selectable.

The camera stays at x=0, y=0, zoom=1/3. At the 1280 x 720 logical canvas the whole
stage occupies 1152 x 580 pixels at (64,128), leaving a dedicated two-row HUD band.
Each row holds five fighters, ordered by team. Team-colored P# labels remain
screen-sized; clamped edge arrows identify fighters outside the fixed view.
Normal core Seeker art uses its existing integer source scale followed by the
1/3 arena camera, retaining crisp authored pixels and nearest-neighbor sampling.
Small desktop windows scale the whole canvas, so a larger window remains better
for ten people. No cinematic zoom or foreground occluders were added.

### Boundary Differences

**Castle Dungeon:** side walls occupy x=0..256 and x=3200..3456, from floor to
upper boundary. A matching stone ceiling cap closes y=0..256 between them.
Horizontal wrap is off; there is no vertical wrap. All spawns and platform routes
are inside. The 256-world-pixel wall thickness prevents ordinary fast dashes from
crossing the nearest-face midpoint of the existing discrete collision solver;
the collision engine and movement tuning were not changed. Tests include
6000-pixel/second side impacts and the existing maximum super jump. Interior wall
faces retain normal cling, slow slide, refill, sling and hitstun bounce rules.

**Enchanted Forest:** no roof or full-height side walls. It retains Dash Punch's
existing horizontal screen wrap and an uncapped aerial space. Edge indicators
cover high flyers. The continuous floor carries through the existing wrap margin
so recovery does not fall into a seam. This is **not a new ring-out/blast-zone
mode**; HP/KO rules are unchanged. The fixed camera does not chase extreme height.

## Artwork And Effects

No new sprite artwork or dependencies were created. Both stages reuse the shared
Canvas stage renderer, already installed environment sheets, scene previews,
terrain crops and authored Seeker PRO combat art.

- Forest: five supplied scenery images composed into three parallax depths,
  subdued green/gold grading, soft background haze and ambient sunlight tint.
- Dungeon: masonry, arches and columns from the Castle Prison atlases, barred
  architectural openings, cool stone depth and warm ambient/impact lighting.
  Existing brazier flame pixels provide restrained, cached selective bloom.
  Barred openings are not treated as light sources.
- Far/mid blur is cached, not applied to the frame or fighters. Static background
  composites are reused until quantized parallax changes. Charge/major-impact
  illumination stays behind terrain and combatants and contributes no game state.
- Terrain uses existing soil/stone edge textures, without colored borders or
  movement-path lines. Collision outlines remain debug-only.
- Enhanced/Classic remains available in Settings, saved per browser. Graphics
  quality does not enter the deterministic state or need to match online peers.

### Asset Provenance And Gaps

Forest uses **PF Deep Forest 1.0**, by Szadi art, with its retained
`assets/stages/deep-forest/public-license.txt`: personal/commercial use and editing
permitted; reselling the asset pack is prohibited. Dungeon uses **PF Castle Prison
1.0** supplied by the user. Its installed files do not include license text:
retain the original download/purchase terms before public distribution. The
Forest terms must not be assumed to cover Castle Prison. Other installed packs
(Snowy Mountains and Strange World) remain untouched. See `STAGE_ART.md`.

Seeker PRO is by Primitive Pixels; its original license remains under
`assets/optional/seeker-pro/Seeker_PRO/LICENSE.txt`. It permits use in games and
promotional material, not standalone asset redistribution. No new character art
or combat animation was needed here.

The packs do not provide dedicated ambient pollen/mist animation, authored sun
shafts or depth/normal maps. No geometric substitute particles or invented forest
glowing props were added. Haze/lighting are restrained presentation composites;
the forest deliberately has no object bloom without a genuine luminous source.

## Captures

The before captures show the **new layouts before environment assignment**, not
an older version of these previously nonexistent stages. After captures show the
same spawn fixture with the installed art and atmosphere applied.

| Stage | Before | After / full stage | Live ten AI |
| --- | --- | --- | --- |
| Forest | [Before](artifacts/team-arenas/enchanted-forest-before.png) | [Full stage](artifacts/team-arenas/enchanted-forest-full-stage.png) | [Combat](artifacts/team-arenas/enchanted-forest-ten-ai.png) |
| Dungeon | [Before](artifacts/team-arenas/castle-dungeon-before.png) | [Full stage](artifacts/team-arenas/castle-dungeon-full-stage.png) | [Combat](artifacts/team-arenas/castle-dungeon-ten-ai.png) |

Additional canvas captures cover 960 x 640 and 1920 x 1080 browser windows; the
primary test window is 1440 x 1000. Raw results are in
`artifacts/team-arenas/verification.json`.

## Performance

Headless Chrome on this machine, 1280 x 720 game canvas, ten current core fighters
including projectile, electrical, Chase and large-body characters. Each live
scenario warms for 1.2 seconds and samples 180 RAF intervals. AI decisions are
live, not a prerecorded fight. Render-only costs use the same frozen ten-fighter
fixture, 90 cached draws, and a synchronous one-pixel readback.

| Stage / quality | Median draw | p95 draw | Live median / p95 | Frames >25 ms |
| --- | ---: | ---: | --- | ---: |
| Forest Classic | 2.1 ms | 4.5 ms | 16.7 / 16.8 ms | 0 / 180 |
| Forest Enhanced | 2.9 ms | 4.4 ms | 16.7 / 16.8 ms | 0 / 180 |
| Dungeon Classic | 2.2 ms | 3.2 ms | 16.7 / 16.8 ms | 0 / 180 |
| Dungeon Enhanced | 2.7 ms | 5.1 ms | 16.7 / 16.7 ms | 0 / 180 |

This is approximately 60 FPS locally, not a hardware/browser guarantee or proof
that Enhanced is faster. Enhanced has higher tail cost in the dungeon. Its active
background cache contains about 3.12M forest / 4.39M dungeon RGBA pixels, excluding
decoded images and existing fighter caches. No repeated blur/static rebuilds were
observed in the frozen fixture. Low-end GPUs and long physical ten-player sessions
still need hands-on testing; Classic remains the lighter fallback.

## Verification And Scope

`tests/team-arenas.test.js` covers shared geometry, ten symmetric nonoverlapping
team spawns, uneven large-body teams, moving-platform carry through reversal,
wall cling/slow slide/refill/sling, horizontal knockback, fast wall/ceiling
containment, forest wrap recovery, fixed camera and ten-input deterministic
snapshot restore/replay on both stages. Existing live AI is not claimed to be
seed-deterministic: replay comparisons use recorded abstract player inputs.

`tests/team-arenas.browser.test.js` covers the real 5v5 menu shortcut, retained
controller ownership, CPU seats, team assignment, ten-fighter match startup, core
stage labels, cached render purity, offscreen markers, multiple window sizes,
both qualities and ten live AI fighters. Physical controllers are simulated for
the automated ownership test; ten actual devices were not tested.

The existing 1,440-frame pre-visual-cleanup gameplay baseline was run unchanged.
Combat/state regressions passed for directional shields and blockstun, Chase,
electrical hits, hitbox interruption, projectile reflection, gravity, moving
stages and core authored animations. The full rollback suite passed 6,120
independent simulation frames and 1,047 rollbacks (maximum depth eight), with
unchanged baselines.
Existing browser regressions also passed: ten-controller simulated join/select/
reconnect and sparse slots, loaded-and-frozen countdown, nine prior HD-2D stages,
debug-only platform borders, and real two-browser WebRTC with 50 ms delay, 15 ms
jitter and 5% loss. Online hashes matched; synchronized pause, rematch and peer
disconnect succeeded with different local graphics settings.
New stages are appended internally so old stage/replay indices remain stable;
only the menu groups core stages before experimental entries. The rollback build
identifier introduced by this arena pass was `dash-punch-rollback-19-team-arenas`.
The subsequent Orbit tuning uses `dash-punch-rollback-20-orbit-arc`, so friends need
matching updated game files. There is no Git repository in this folder, so no Git
checkpoint is claimed.

Changed runtime files: `game.js` (stage definitions, stage-only spawn/camera/HUD
hooks, setup shortcut, debug test adapter, patch notes), `presentation-assets.js`
(two existing-pack atmosphere assignments). `package.json` adds test commands.
Documentation, tests and screenshot artifacts accompany them. `stage-renderer.js`,
combat rules, physics, attack values, authored art, rollback transport and input
handling are reused without modification.
