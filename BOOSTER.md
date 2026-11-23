# Booster: The Performance Enhancer

Core fighter 16. Source art: the existing licensed Seeker PRO Void set, using
the established olive-lime tint (#b6ca68), costumes, anchors and pixel rendering.
No source artwork, new assets, buttons or dependencies were added.

## Prototype Stats
| Property | Value |
| --- | --- |
| Versus health | 145; existing sports health modifier applies |
| Walk speed / acceleration | 86% Anchor: 113.52 units/sec / 2236 units/sec squared |
| Dash base / maximum | 620 / 1340, same as Anchor, including .78 air scale |
| Air-dash capacity | 2; landing restores both; ordinary valid refill rules remain |
| Punch charge | 3 seconds after the native tap/charge transition |
| Punch startup | .045 sec tap, .12 sec full charge; usual shield release adds .055 sec |
| Active hitbox | .05 sec at every charge |
| Normal recovery | .14 sec + .41 times charge squared; .55 sec at full charge |
| Extra whiff lockout | .08 + .82 times charge squared + .16 times charge; 1.06 sec full |
| Damage | 30-54; grounded 32-57 before other native modifiers |
| Knockback | 70-87.5 nominal, only +25% at full charge; no automatic lift/momentum |
| Reach / radius | 36 / 26, with existing charge geometry |

A missed tap has .235 seconds of attack animation plus .08 extra lockout;
a missed full charge has .72 seconds plus 1.06 extra lockout (before the usual
shield-release addition). Successful hits use existing confirm/cancel rules.
Native shielding, charge fizzle, parries, hitstun and movement controls remain.

## Enhancement
Charge is normalized to 0-1. Each property interpolates linearly:

| Effect | Minimum | Full charge |
| --- | --- | --- |
| Voluntary movement | +10% | +45% |
| Action speed | +5% | +30% |
| Hit damage/physical power | +10% | +50% |
| Duration | 2 sec | 9 sec |

Only surviving, clean fighter hits enhance. Blocking, dodging, intangibility and
invulnerability retain their protections; blocked punches retain normal chip.
Weaker boosts cannot overwrite or refresh stronger ones. Equal boosts refresh;
stronger boosts replace. Base character definitions are never modified.

Walking, air steering/control and native dashes improve without multiplying
external knockback or changing gravity. Startup/active/recovery and combo cancel
timings are captured when an attack begins, so expiration cannot jump its
hitbox. Reload and heavyweight dash timers run faster while enhanced. Charge
requirements, ammo counts, projectile caps/lifetimes and defensive stun remain.
Combat, Kickoff, compatible ball/boulder, snitch and sandbag damage/impulses use
the power modifier. Objective rules, ownership, mass and speed caps still apply.

## Teams And Court
The exception exists only in Booster's melee target handling, not the universal
friendly-fire predicate. With friendly damage disabled, a teammate can receive
support without health loss, knockback, hitstun or shield damage. Court remains
no-damage/no-knockback; both allies and opponents can receive status. Battle/Versus health loss
still follows their existing friendly-damage settings. Sports objects never
receive fighter enhancements. Friendly damage being enabled makes ally support
dangerous, including the possibility of killing an ally instead of buffing them.

## State, AI And Feedback
`fighter.boosterEnhancement` contains only charge and remaining simulation time.
Existing snapshots/rollback serialize it; KO/respawn/reset clear it. Cosmetic
aura, small gold arrows and expiry feedback use presentation-only state.
The hypodermic needle is cached native-grid pixel art drawn over the existing
attack sprite. It follows aim, stays within punch reach and appears only during
active frames or the existing short hit-confirm visual. No projectile, extra
hitbox or licensed-sheet edit. Its pixels match the Seeker PRO three-unit grid;
rotations are baked with nearest-neighbor sampling, with a bounded 128-frame
shared needle/frown cache.

Lamer's suppression is independent: effective movement, action speed and power
multiply the current enhancement by the suppression factor. Neither effect
cancels the other, compounds base data, or expires the other. See [LAMER.md](LAMER.md).
CPU Booster retains native sports/combat planning, occasionally supports nearby
healthy unboosted allies, commits to longer offensive charges, and avoids
needlessly refreshing a dangerous enhanced enemy. Decisions are seeded; no
scripted hits, scores, movement or hidden bonuses.

## Verification
`node tests/booster.test.js`: mechanics, all sports-ball families, sandbags,
timings, ownership, expiry, snapshots, delayed rollback, 30/60/120Hz and ten CPUs.
`node tests/booster.browser.test.js`: 720p/1080p roster and ten-fighter visuals,
inverted gravity, victory rendering, native charged Punch over real WebRTC 1v1.
Relevant existing rollback, magazines, Edgebert, Phantom and Spike tests run;
historical fixtures remain untouched. Human balance/physical-controller feel
is not certified. No release build or ZIP is produced for this FEATURE.
