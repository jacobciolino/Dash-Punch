# Core Seeker Roster

The core roster has twelve Seeker-based fighters plus DefiPlate's standalone
pixel-art plate. Replaceable assignments and cloak colors live in
`presentation-assets.js`. Experimental fighters keep their prior
art and sizes. Per-player Block mode and additional color variants remain.

| Fighter | Seeker Variant |
| --- | --- |
| Anchor | Amber PRO Seeker, spectral fist spell |
| Orbit | Violet PRO Seeker |
| Spike | Green PRO Seeker, existing scales/spines |
| Rain | Cyan PRO Seeker |
| Edgebert | White PRO Seeker |
| Reverso | Magenta PRO Seeker |
| Whipado | Lavender PRO Seeker, Dream casting projection for Chase |
| Micro USB | Silver PRO Seeker |
| Gun Man | Gold PRO Seeker, PRO casting poses for shooting |
| Archer | Lime PRO Seeker, PRO bow poses |
| Kite | Rose PRO Seeker |
| Chungus | Custom obese brown Seeker, multi-pose atlas |
| DefiPlate | Shaded trapezoid plate; attack-only exposed barbell sleeve |

## Dimensions And Mechanics

Ten core fighters use Orbit's actual 46x66 body dimensions,
including their body-based collision/hurtbox sizes. Chungus retains 118x154.
Anchor joins the core roster at the front, without an asterisk, but keeps his
existing 48x78 body so this promotion does not change his collision behavior.
This is the requested size normalization, not a visual-only scale change.
Damage, startup, active duration, recovery, launch rules, movement constants,
air-dash counts, shields, Chase and other abilities are otherwise unchanged.
Experimental/test character dimensions are untouched.
DefiPlate joins core without resizing his existing 86x48 body or changing his
straight-down launch. His 29x16 plate and separate 64x8 barbell are drawn at 3x
native scale. See `DEFIPLATE.md` for attack visibility and validation.

## Shared Animation And Palettes

The existing shared sprite renderer selects authored PRO idle, dash, wall-slide,
crouch, directional Punch, hurt and KO frames. Attack visuals follow existing
startup/active/recovery timing; animation never triggers damage or projectiles.
Hurt/knockback clips use per-frame body anchors to cancel source-sheet translation
without moving the real fighter; see `HURT_ALIGNMENT.md`.
Archer and Gun Man share the base body but use the pack's Bow/CastBasic poses.
Gun Man's existing recoil timer only drives visual follow-through.
His projectile uses the Seeker PRO Basic spell bolt (four 24x12 frames at 20 fps)
and Basic Impact burst (seven 32x32 frames, 0.35 seconds). Consumed hits on fighters,
shields, solid terrain and gravity switches create a stationary cosmetic burst
through the existing effects list. There is no splash damage or extra hitbox.
Parried/punched projectiles keep reflecting rather than being consumed. Wrapping,
speed, direct damage, charge, lifetimes and resource refunds remain unchanged.
Gooder Gun Man's experimental bullets do not receive this presentation change.
Anchor uses slash-free Cast poses and `anchor-fist-spell.png`, a spectral fist
adapted from the supplied Seeker spell reference. It follows the existing Punch
aim, charge, reach and visual extension; it is not a projectile and has no
independent damage, stun, grab or collision. Match countdown preloads the image.

Cloak recoloring preserves eyes, outlines and green attack effects. Processed
sheets are cached by source image and tint, and the same result is used for
character previews and matches. Spike keeps the established green/spine shader.
Costume variants layer on top of the base character palette.

Whipado uses slash-free Cast poses and a purple magical whip for Punches, without
the sword-swing sheet, green snake head or active melee-cone overlay. Her attack
volume/timing and Chase behavior are unchanged. Chase reuses the same whip
drawing with its brief Dream casting projection, still cosmetic and 0.16 seconds.
Archer uses the provided Seeker Bow sheet for ground, air, charged and directional
shots. Its draw frames 0-8 and release frames 9-21 follow existing charge/startup
and recoil timers; no animation frame spawns extra arrows or changes fire rate.
Archer's projectile uses the supplied Seeker magical-arrow sheet (three 28x8
frames at 20 fps, anchor 24x4). Match countdown preloads it, including Block mode.
Drawing derives its frame from simulation time without mutating projectile state;
normal, reflected and screen-wrapped arrows keep existing behavior and lifetime.

## Chungus

`assets/optional/seeker-pro/chungus-seeker-atlas.png` is a generated adaptation of
the supplied Seeker reference: a broad round belly, heavy brown robe, stubby limbs
and small hood, not a stretched slim model. The 1254x1254 atlas has a 4x4 layout;
313.5-pixel cell metadata reflects the exact delivered image dimensions. Existing
row/start-frame support selects idle, ground/air dash, cling, crouch, windup,
hammer fist, up/down attack, hurt and KO poses. No new hitboxes or attack rules.
The shared presentation pipeline caches a coarser 52x52 pixel grid for each cell,
with hard alpha edges and reduced color precision. Previews and matches share
that processed sheet; the original atlas, pivots, body size and poses are retained.
Pixel processing runs once per source sheet, not every rendered frame.

## License And Testing

Hooded Seeker PRO by Primitive Pixels, supplied by the user. Its included license
permits modification/use in the purchaser's games and promotional material, but
not standalone asset-pack/template/game-kit redistribution. The generated
Chungus adaptation is also kept as game art, not offered as a sprite library.

`test:core-sprites` checks all core assignments, sizes, clip selection and pure
rendering. `test:core-sprites-browser` checks decoded sheets, nonblank poses and
twelve visually distinct fighters. Shield, Chase, projectile, online/rollback
and performance tests provide additional regressions.
