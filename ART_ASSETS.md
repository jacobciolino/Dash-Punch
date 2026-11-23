# Replaceable Presentation Assets

All additions from this art pass live in `assets/optional/`. Their assignments,
animation frames, alignment, preview size and arena backdrops are configured in
`presentation-assets.js`. Combat properties remain in `game.js` and are unchanged.

Set `enabled: false` in that file to disable this entire optional layer. Removing
its script tag from `index.html` also restores built-in presentation. Players can
still select Block instead of Pixel Art independently in character select.

## Current Assignments

| Fighter | Optional art |
| --- | --- |
| Paul | SMS Brawler Renegade |
| Bront | Khabib pack, four available poses |
| Needle | Kung Fu Platformer, Skin 1 |
| Vesper | Female Hero, east-facing animations |
| Whipado | Lavender Seeker PRO, Dream Seeker PRO Chase casting projection |
| Orbit | Hooded Seeker PRO, Void |
| Spike | Hooded Seeker PRO, custom green scales/spines |
| Rain | Cyan Seeker PRO |
| Reverso | Magenta Seeker PRO |
| Micro USB | Silver Seeker PRO |
| Gun Man | Gold Seeker PRO with casting poses |
| Archer | Lime Seeker PRO with bow poses |
| Zomg | Schoolgirl 1 |
| Broadside | Schoolgirl 2 |
| Anchor | Amber Seeker PRO, spectral fist spell |
| Sword Kun | Knight sword fighter |
| Drop | Cloaked Reaper |
| Edgebert | Red Seeker PRO |
| Kick Off Kevin | Crow |
| Kite / Chungus | Rose Seeker PRO / custom obese brown Seeker atlas |

The unified twelve-core-character Seeker roster and its animation assignments are
documented in `CORE_SPRITES.md`. PRO assets are licensed by Primitive Pixels for
use in the user's game, not redistribution as a standalone sprite library.

All 19 built-in arenas now use original generated scenery inspired by the
references, not direct copies. `assets/backdrops/quiet-worlds.png` contains four
equal environment panels: misty woodland, dusk citadel, sky ruins and lunar
observatory. Assignments select a normalized quarter-image crop and muted base
color in `presentation-assets.js`. At 42% opacity over those base colors, scenery
has reduced contrast and saturation. Match and stage-select views use the same
crop, opacity and base. Terrain has opaque dark fills and light collision edges;
fighter sprites have fine dark/light silhouette separation. Combat is unchanged.

The original supplied JPEGs remain as reference files but are no longer used by
the stage backgrounds or stage-selection previews. The main menus use original
`pixel-menu-worlds.png` scenery: a crimson citadel for modes, a quiet dojo for
character select, a sky terrace for stage select, and an observatory for
settings/online. `renderMenuBackdrop()` selects the panel; CSS controls opacity
and framing. Roster thumbnails and mode illustrations reuse registered character
art. The supplied ensemble is no longer active in character select.

Orbit's Seeker clips follow the included Animation Guide: idle at 10 fps, run at
14 fps, gravity-relative rise/apex/fall frame ranges, authored hurt/death frame
durations, and strike frames 3-4 aligned to the existing punch active window.
Sprite facing defaults to right-facing when a pack omits `facingLeft`. These are
presentation corrections only; attack durations and collision rules are unchanged.

Battle models rotate their local feet axis toward the current gravity vector.
Sprite facing, directional animation selection and dash ghosts use body-local
directions; aim previews, shields and actual attacks retain world-space vectors.
Gravity orientation is added to existing tumble rotation without changing fighter
angles, collision geometry or rollback state. Menu portraits remain upright.

The start screen uses the original generated `dash-punch-pixel-faceoff.png`: a
simple airborne dash sprite faces an exaggerated, fist-dominated pixel fighter
under a red sky. The previous painted `dash-punch-faceoff.png` is preserved as an
unused alternative. Replace the active
image or its URL in `styles.css` to change the title scene. The supplied Berserk
image is retained as a reference, not used as the generated title artwork.

These are
decorative only: terrain, platforms and collision are unchanged. The charger,
gunmen and other previously assigned sprites are preserved.

## Replacing Art

Change one assignment's `spriteSet` to another registered set, or remove that
assignment to restore that fighter's original appearance. A set defines frame
`width`, `height`, visible `bodyHeight`, `foot` and optional `pivotX`. Animation
clips can override frame dimensions and pivots for oversized attacks. Clips use
either a horizontal PNG sheet (`src`, `frames`, optional `row`) or an ordered
`sources` array of individual PNG frames. Animation names include `idle`, `walk`,
`attack1`, `attack2`, `block`, `hurt`, `death`, `jump`, `fall`, `cling`, `attackAir`,
`attackUp` and `attackCrouch`. `startFrame` can select a pose within a sheet without
duplicating images. `spriteOverrides` adds clips to existing built-in sets without
recreating their metadata. Vesper's menu preview and gameplay use full sequences.

Needle now uses dedicated rising and falling frames. Vesper and Paul use available
wall-climb frames. Terrible Knight uses its supplied aerial, crouching and upward
sword clips. Airborne animations advance through their available frames rather
than remaining fixed on frame 1 or 3. These changes are cosmetic only.

Not all supplied packs contain full movesets: Bront has four boxing poses;
Dragon has flight only; Samurai lacks guard, jump and KO sheets; the new Reaper,
Crow and Werewolf are also limited. Missing authored clips use the game's existing
charge, guard, recoil, tumble and KO pose effects. They are not newly drawn frame
animations. DefiPlate now uses a separate shaded pixel-art trapezoid plate and an
attack-only barbell sleeve; see `DEFIPLATE.md` and `assets/defiplate/`.
the gunmen and Micro USB retain their custom animated pixel models. All other
fighters have imported sprite assignments in Pixel Art mode.

Preview-only sizing uses `previewScale` and `previewOffsetY`. No sprite geometry
changes gameplay hitboxes. Not every pack provides every animation; no missing
animations or new combat abilities are implied by these presentation assignments.

## Deferred / Preserved

- Archer and Knight were already integrated and were not reimported.
- Isometric template retained unassigned: its viewpoint does not fit the current
  side-view fighters. Its original license and readme remain alongside it.
- Crow archive was unavailable after the other files were restored.
- Tekken UI pack contained CopperCube/executable material rather than directly
  reusable menu images. No supplied executable was run; existing menus unchanged.

## Credits And Licenses

These are supplied third-party assets, not original Dash Punch artwork. Original
license/readme files are retained where present. Hooded Seeker is by Primitive
Pixels and is included as part of this game, not offered as a standalone asset
pack. Check the original download-page terms for packs without an included
license before public/commercial release. This import is not a license clearance.
The supplied illustration backgrounds also require permission from their rights
holders before a public release; their inclusion here is for the local prototype.

Regression checks cover enabled and disabled presentation, PNG dimensions and
frame paths. Runtime rendering supports sheet and individual-frame assets.
# Whipado's Custom Model

Whipado now uses the replaceable `pixelModel: "serpent"` assignment instead of
the imported Gorgon sheet. Her code-native pixel model has five animated hair
snakes, golden eyes and a purple/gold outfit; previews use the same pixel parts.
The `hairSnakePunch` visual coils, extends along the existing Punch aim/reach and
retracts with the existing startup/active/recovery timing. Its root follows body
pose, tumble and gravity rotation. Block-model mode retains the standard fist.
No combat timing, damage, hitbox geometry or launch direction was changed.
The original Gorgon files remain available for replacement/testing.

## Sports Theme Layers (2026-11-21)

The current sports theme map is `DASH_PUNCH_ART.sportsScenery` in
`presentation-assets.js`. Sky serves Ball Hell, Volleyball, all implemented Soccer
and Field Goal variants. Sticky Ball uses Ancient Temple; Basketball uses Castle
Interior; Target Break and both Golden Rush arenas use Castle Courtyard; Target
Charge uses a dusk-graded Castle Roof/Citadel. Boulder modes, Total Rush, Versus
and Sandbag retain their existing scenery. Pendulum Soccer is not implemented,
so no fake stage or theme assignment was registered for it.

The 23 unchanged source PNGs come from three owner-supplied CraftPix freebie
archives, not new downloads. `assets/stages/sports/NOTICES.md` records sources and
license review; `provenance.json` records source members, dimensions and SHA-256.
`node tools/import-sports-backgrounds.cjs` reproduces the import from Downloads.
Unused variants, PSDs and promotional files are never imported.

The existing stage renderer caches three pixel layers and one flat readability
veil. New sports profiles use no blur, bloom, procedural gradients or actor
lighting. Enhanced quality permits slow integer-pixel cloud drift; Classic keeps
the same layers static. No fighter-driven background movement is introduced.
The camera and all stage geometry remain untouched. Stage previews use the same
profiles at time zero. Missing textures fall back to the static scene/base fill.

The future core builder retains this metadata and embeds used scenery images for
offline Canvas safety, alongside notices. No new release was built for this
feature. The castle-roof source is a stylized terrace, not a full distant-tower
skyline; no replacement artwork was invented to disguise that limitation.

## Supplied PF Stage Packs

The core stages also support Enhanced / Classic graphics in Settings. Enhanced
reuses the original pack layers and atlas props for parallax and cached atmospheric
effects. See `HD2D_STAGE_POLISH.md` for source inventory, screenshots, performance
measurements and deliberately missing assets. No new stage artwork was generated.

Nine core stages now use Castle Prison, Snowy Mountains, Strange World and Deep
Forest scenery with matching terrain textures. Their source PNGs, optimized
scene/texture outputs, assignments and license notes are documented in
`STAGE_ART.md`. Other stages retain their previous artwork. No terrain collision
or gameplay rules were changed.

## Seeker PRO Cleanup

The core sprite roster now uses native PRO impact, dust, charge and aura effects,
without the legacy squash/stretch and geometric state overlays. See
`VISUAL_CLEANUP.md` for the inventory, retained signature effects and tests, and
`ARCHITECTURE_AUDIT.md` for findings-only follow-up recommendations. Seeker PRO
art is by Primitive Pixels; its license and Animation Guide are retained beside
the imported files. No new replacement artwork was generated for this pass.


