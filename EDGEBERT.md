# Edgebert: One Input, Three Strikes

Tap or hold/release Punch once. The complete three-hit sequence runs without
additional presses, even if early strikes miss. Charge is captured once for all
three strikes. Being hit, parried, blocked, clashed or KO'd interrupts normally.
There is no homing, teleportation or automatic pursuit.

The existing sword fighter's follow-up pattern is reused: a fresh native attack
ID and target Set for each stage, preserving ordinary combat and sports hit
confirmations. Successful contacts do not cancel the remaining animation; each
strike can hit a target once. Independent hit events are ready for shared on-hit
shield recovery, without inventing an Edgebert-only recovery rule.

## Animation And Timing
Licensed Seeker PRO Void Attack1, Attack2 and Attack3 retain their source-frame
proportions, pixel density and anchors. The shared source-time scale is derived
from Anchor's actual tap startup + active + recovery, not a guessed target.
No source artwork is modified.
Frame indices are zero-based.

| Strike | Visible Frames | Startup | Active | Recovery | Combo-Time Active Window |
| --- | --- | --- | --- | --- | --- |
| Opening / Attack1 | 3-4 | 46.48ms | 33.20ms | 59.77ms | 46.48-79.69ms |
| Follow-up / Attack2 | 1-2 | 19.92ms | 33.20ms | 39.84ms | 159.38-192.58ms |
| Finisher / Attack3 | 5-6 | 79.69ms | 33.20ms | 79.69ms | 312.11-345.31ms |

Total nominal sequence: 425ms (previously 960ms), exactly Anchor's 75 + 130 + 220ms
tap punch before hitstop. Source-time multiplier is .33203125. A charged shield release adds the normal 55ms to
the opener only. Status speed modifiers are captured at release, as for other
attacks. Fixed-step sampling can differ by one tick. Up/down variants retain
their original visible strike-frame mappings.

## Power
Nominal ungrounded, unstaled values; normal ground, combo, defense and status
modifiers still apply. Damage rounds at native hit resolution.

| Strike | Tap Damage | Full Damage | Tap Knockback | Full Knockback | Base Hitstun |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2 | 35 | 42 | 120ms |
| 2 | 1 | 2 | 45 | 54 | 130ms |
| 3 | 15 | 27 | 820 | 1558 | 640ms |

Isolated damage totals: 17 tap / 31 full charge. Natural combos retain normal
staling. Early charge knockback is limited to +20%, with direct low-force launch
and no automatic lift or combo pull; the finisher keeps +90% scaling.
Setup hitstun scales by only +15% at full charge (138/149.5ms), with brief hitstop
and smaller sparks. Only the finisher applies the usual dramatic slow motion.
Existing limited aim adjustment, narrow hit geometry and partial-combo spacing
remain. Sports strikes have separate attack generations, 80/100 base opening
impulses and the native 1040 finisher floor. Volleyball's first two assisted arcs
are scaled to 10%; the finisher keeps its ordinary full launch. Other fighters'
ball impulses are unchanged. Moving objects need not remain in range.

## Verification
`node tests/edgebert-combo.test.js` covers automatic progression, exact timing,
damage, deduplication, misses, interruption, native charge, natural grounded
combos against stationary and moving opponents, six sports, snapshots/replay,
delayed rollback and 30/60/120Hz. Every other fighter's configuration is compared
with the release checkpoint; Edgebert's non-punch stats remain unchanged.
The old three-input assertions are intentionally updated for the requested
one-input design; no historical replay fixtures are regenerated.

`node tests/edgebert-combo.browser.test.js` checks one native tap, three attack
IDs, licensed sheet loading, left/right poses, anchors and render purity.
Online clients must both refresh to matching builds. No release ZIP.
