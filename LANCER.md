# Lancer And Whipado Charge Patch

Lancer is core fighter 19. Licensed Seeker PRO Void Cast_40x40_11f supplies the
bracing body poses, with an independent native-grid animated spear layer. Original
sheets, palettes and anchors remain intact. There was no separate licensed spear
sheet; the custom layered animation is code-native pixel art, not a static image.

The carried spear angles up-left from his grip over the original sword position,
matching the November 22 reference markup. It no longer protrudes vertically over
the opposite shoulder. Its native-pixel tip fits each authored pose; the carried
overlay hides during held/attack states so it never duplicates the active lance.
This placement is cosmetic only. Focused checks: `npm run
test:lancer-spear-presentation` and `npm run test:lancer-spear-presentation-browser`.

## Stats
- HP 182 (Anchor 165 x 1.1, rounded), walking 125.4 units/sec (95% of Anchor).
- Three air dashes. Air launch endpoints 682/1474, .78 scale: exactly 110% of
  Anchor's air launch/travel under the same neutral conditions. Ground endpoints
  remain Anchor's 620/1340. Dash charge .72 seconds.
- Gravity 3090 (150% of Anchor); terminal fall 1680, juggle terminal 930.
- Shield uses the shared 68-durability resources and duration/recovery rules.
- Full punch charge 1.1 seconds. Tap/full startup 90/200ms; accelerating thrust
  200/320ms; retraction/recovery 140/300ms. Native interruptions remain.
- Fully extended movement is 20% of ordinary ground walking. Aim turns at up to
  .35 pi radians/sec (63 degrees/sec). Airborne extension never suspends gravity.

## Geometry And Power
Whipado's prior maximum **extension from the body edge** was 309.2 world units.
Lancer's base shaft-to-point reach is 445.248 = 1.44 x that value (10% shorter
than the previous 494.72). The native spear
tip is 36 units (12 pixels); full charge adds exactly half a tip, 18 units, for
463.248 total. Body-edge offset is added equally to visuals and collisions.

| Zone | Tap Damage | Full Damage | Tap Knockback | Full Knockback |
| --- | --- | --- | --- | --- |
| Tip | 25 | 100 | 1100 | 2400 |
| Shaft | 4 | 12 | 450 | 800 |
| Close Haft | 3 | 10 | 100 | 180 |

Normal defense, status, staling and sports mass/speed rules still apply. Tip takes
priority over shaft and haft. A fighter can be damaged only once per attack,
even after separating and returning to the tip. A fresh attack can hit again.
Sports-object tip hits still rearm after four-unit separation from the entire
lance; no timer, attack restart or extended duration. Persistent overlap never
repeats damage. Shaft/haft-only hits remain once per
attack, and only during thrust plus the first 100ms of the fully extended hold
(scaled by the attack's native action-speed modifier). After that opening,
shaft/haft contact does not damage fighters, strike sports objects or earn hit
rewards. The tip remains active through hold and retraction, until fully withdrawn.
Fighter and sports-object contact state and shield rewards rearm together,
using native hit-confirm and rollback state. Court fighter damage remains disabled.

Extension uses monotone cubic segments through time/distance anchors
0/0, .4/.15, .7/.4, 1/1. The advancing tip sweep shares its geometry with the
visible spear, including the fast final extension. Hold begins only at full
extension. The visible shaft stays solid throughout extension, hold and retraction.
Its thin oriented surface participates in native floor/landing, wall-cling,
wall-jump and moving-platform handling, including inverted gravity, allies and
Court. The owner cannot stand on their own lance. Swept fighter contacts prevent
tunneling; native sports-object substeps retain their existing rigid barrier.
No additional physics engine or invisible full-length startup hitbox is used.

Fighter separation now prefers the original contact side and checks the complete
short push path against stage solids and other tangible fighters. A blocked side
can use a clear local opposite exit, without moving other players or granting
Lancer recoil. If no nearby exit exists, a genuine geometry pin keeps the legal
stage position without alternating spear/wall corrections or repeated damage.
Retraction, interruption and normal escape paths release the obstruction.

Pixel-grid spear animation includes windup, accelerating thrust, finite hold,
retraction, travelling charged glint and angular tip flash. Original synthesized
whoosh, metallic piercing accent, sharp tip and dull shaft cues reuse Web Audio
volume/event/rollback deduplication. The piercing accent peaks at 70% of extension.

## Charge-Dependent Durations
Both use Whipado's measured **pre-patch 2200ms tap active duration** as the common
reference, avoiding a compounded second reduction while applying both prompts.

| Charge | Whip Extension | Whip Active / Lancer Full Hold | Nominal 60Hz Ticks |
| --- | --- | --- | --- |
| Tap | 262.82 | 1870ms | 112.2 |
| Half | 286.01 | 2585ms | 155.1 |
| Full | 309.2 | 3300ms | 198 |

Whipado's flexible visual uses the same reach calculation as collision. His
damage, knockback, recoil/follow-through, air dashes and other movement remain.
Lancer's extension time is separate from the fully extended hold in this table.

## Verification
`test:lancer`, `test:lancer-tip-reset`, `test:lancer-surfaces` and `test:lancer-separation`: 37 focused cases covering relative stats, all charge values,
zone priority, true extension sweeps, native sports, rigid contacts, no recoil,
Court, interruption, ten native CPUs, snapshots/replay, delayed rollback,
30/60/120Hz and unchanged unrelated fighters. Surface tests cover the opening
damage cutoff, active retraction tip, standing/walking/jumping, wall-cling/jump,
single-step rider carry, angled thin geometry, fast crossings, inverted gravity,
Court/allies/Phantom, expiry/interruption and restored/rolled-back riders.
Separation tests cover above/below/diagonal contacts, blocked ceilings and walls,
other fighter clearance, genuine pins, simultaneous contacts, release and replay.
Whipado's prior full-charge recoil
and ball momentum are compared directly against Git checkpoint 6e8e978.

`test:lancer-browser`: roster 19, all four custom phases at tap/full in 720p/1080p,
render-state purity, standing and wall-clinging shaft contacts, licensed art
loading and victory. Screenshots are in
`artifacts/lancer/`. Existing Edgebert tests also pass. No ZIP is built.

Human playtests are still needed for sustained barrier balance, extreme angled
wall contacts and physical controller feel. Private WebRTC remains 1v1; both
clients require matching code (current Lancer update: build 73). This development
patch is not part of the frozen November 21 game-night ZIP (build 71 core).
