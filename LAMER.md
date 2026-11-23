# Lamer: The Equalizer

Core fighter 17. Reuses licensed Seeker PRO Void art with a muted lavender tint
(#9da5ce), existing costumes, animation anchors and nearest-neighbor rendering.
No source sheets, controls, dependencies or unrelated fighter stats changed.

## Prototype Stats
| Property | Value |
| --- | --- |
| Versus health | 145; existing sports health scaling applies |
| Walk / acceleration | Same as Booster: 113.52 units/sec / 2236 units/sec squared |
| Dash | Same as Anchor/Booster: 620-1340; .78 air scale |
| Air dashes | 2, ordinary landing/refill conventions |
| Full punch charge | 3 simulation seconds, native hold/release convention |
| Startup | .045 + .075 times charge seconds; shield release adds .055 |
| Active | .05 seconds at all charges |
| Recovery | .14 + .41 times charge squared seconds |
| Extra whiff lockout | .08 + .82 times charge squared + .16 times charge seconds |
| Damage | 7-11 (rounded from 7-10.5), before grounded/stale/status modifiers |
| Fighter knockback | 95% of Chungus at equal charge: 988-1877.2, straight along the punch direction |
| Sports-object force | Unchanged: 1000 times (1 + 11 times charge squared), before object mass/speed limits |
| Base hitstun | .20 sec, existing charge/stale conventions |
| Reach / radius | 36 / 26, identical to Booster, ordinary charge geometry |

Fighter launches have no added lift, aim bias, combo pull or inherited attacker
momentum. The fighter-only scale leaves sports impulse and shield recoil intact.
Charged sports strikes retain their stronger charge curve; taps do not inherit
full-charge object power. Existing ball speed limits and boulder mass still apply.
Both fighters use directional impulses without inherited lift or attacker speed.
Booster instead has 30-54 damage and only 70-87.5 nominal knockback; see BOOSTER.md.

## Suppression
Every surviving clean melee hit adds exactly one stack, independent of charge
and allegiance. Maximum three; every valid hit refreshes all stacks to five
simulation seconds. One attack generation cannot repeatedly apply a stack.

| Stacks | Movement | Action speed | Hit power |
| --- | --- | --- | --- |
| 1 | -10% | -8% | -12% |
| 2 | -20% | -16% | -24% |
| 3 | -30% | -24% | -36% |

All stacks expire together. KO, respawn and round reset clear them. Shields,
invulnerability and Phantom intangibility retain clean-hit protection. Lethal
hits do not grant a status to dead targets. Sports objects never receive stacks.
Court permits statuses on either team but no fighter damage, displacement or
stun. Battle/Versus retain existing friendly-damage settings. The exception is
only in Booster/Lamer melee resolution, not the global friendly-fire predicate.

The existing derived-stat hooks combine independent effects multiplicatively:
full Booster plus three Lamer stacks gives movement 1.015x, action .988x, power
.96x. Base stats never mutate. Attack timing is captured once at creation;
expiry cannot jump hitboxes. Defensive stun, input delay and charge requirements
are not altered. Compatible reload/heavy-dash timers use current action speed.

`fighter.lamerSuppression` stores stacks and remaining simulation time; existing
snapshots and rollback serialize both. Build ID 58 requires matching peers.

## Art And AI
The frowning-face projection is actual integer-grid pixel art, not emoji or a
vector. It follows aim, mirrors without turning the frown into a smile, scales
within the charge hitbox, and renders only during active/contact frames. Shared
needle/frown caches are capped at 128, including hard-pixel baked rotations.
No physics object or extra collision event is created. Stack chevrons and expiry
feedback are presentation-only and coexist with team outlines and Booster aura.

CPU Lamer retains native combat/sports planning. It mixes quick stack-building
taps with committed charged clears and prefers launches once three stacks are
present. Booster can support nearby allies and avoids refreshing a dangerous
enhanced enemy. Decisions use normal inputs and seeded randomness, no forces.

## Verification
`node tests/lamer.test.js` and `node tests/booster.test.js`: charge, damage,
launch, resources, statuses, Court/Battle, sports, snapshots, delayed rollback,
fixed-step 30/60/120 Hz, ten-CPU determinism and projection geometry.
`node tests/lamer.browser.test.js` / `node tests/booster.browser.test.js`:
720p/1080p roster, attacks, ten fighters, inversion, victory, hard pixel alpha,
bounded cache and real private WebRTC charged-hit agreement.

No release build/ZIP for this FEATURE. Physical-controller feel and subjective
balance still require human playtesting. Historical Rain/Orbit fixtures remain
unchanged; exact pre-change comparisons exclude only intentionally refined Booster.
