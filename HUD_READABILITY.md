# Pixel HUD And Combat Readability

The core roster uses one 58px top strip. Blue/Red ordering follows authoritative
team colors, including Sandbag's inverse mapping. FFA retains player order.
The camera, world dimensions and gameplay are not changed by this presentation.

## Fighter Themes

Health shapes and five-pixel dash motifs share the existing fighter palettes:

| Fighter | Health frame |
| --- | --- |
| Anchor | Anchor-ended straight bar |
| Orbit | Comet head and tapered tail |
| Spike | Spiked shield edge |
| Rain | Stepped storm cloud and lightning tail |
| Edgebert | Jagged teeth |
| Reverso | Curling spiral strip |
| Whipado | Undulating tentacle |
| Micro USB | Cable and wide connectors |
| Gun Man | Wand and star tip |
| Archer | Bow grip and arrowhead |
| Kite | Diamond-ended string |
| Chungus | Heavy beveled block |
| DefiPlate | Barbell shaft and plates |
| Boomerangus | Curved returning-weapon strip |
| Phantom | Ragged spectral hem |
| Booster | Syringe barrel, plunger and needle |
| Lamer | Drooping negative-energy strip |
| Reflektor | Symmetrical mirror bevels |
| Lancer | Thin shaft and spearhead |

Shapes use integer column spans and cached runs rather than vector clipping.
Depletion always proceeds left to right. The same actual HP, shield durability,
banked resources, ammo and respawn progress feed the display. Disabled experimental
fighters retain a generic fallback rather than receiving invented core artwork.

## On-Fighter Information

Dash marks sit below the P-number and below the ammo row when present. Up to
twelve dashes use six compact marks per row; larger counts use a number. Consumed
marks dim, banked marks remain subdued, and replenished resources briefly brighten.
Orbit's stack clears the halo. Bounds account for current gravity and sprite anchors.

Escape/parry availability and recovery, exhaustion, failed defenses, floor-tech
vulnerability and shield break use shared five-pixel icons and fixed palettes.
HUD and world indicators use the same definitions; character themes do not change
their meaning. Compact icons replace the old large defensive rings.

At 25% HP or lower, sprites use a brief red-tinted phase in a 0.72-second cycle.
Source alpha and shading remain; damage flashes, spawn protection and KOs take
priority. Phantom retains his actual phase opacity. Team outlines remain separate.
Tint frames are bounded to 96 entries/800k native pixels. No source assets change.

Charge previews and active melee outlines use the same neutral gray stepped cells,
sampled directly from existing authoritative geometry. These cells never collide.

## Verification

`node --test tests/hud-readability.test.js tests/compact-hud.test.js`

`DASH_PUNCH_DEVELOPMENT=1 node tests/hud-readability.browser.test.js`

`DASH_PUNCH_DEVELOPMENT=1 node tests/compact-hud.browser.test.js`

Set `PLAYWRIGHT_MODULE` to the installed Playwright directory when needed.
Browser artifacts cover 720p/1080p, nineteen core fighters, 73 native tint masks,
crowded and identical rosters, Phantom, shared status icons and gray aim geometry.
Readout flash history lives only in presentation snapshots. Tests verify exact
pre-change simulation hashes, restored counters and delayed rollback. Headless
render samples are not physical-controller or subjective couch-readability tests.
