# Double Reflect And High Perch

Opposing free projectiles now clash using swept relative-motion contact checks,
including ordinary horizontal wrap-edge contacts. Both reverse their own firing
direction and swap combat ownership. They remain dangerous to their original
shooters, retain existing damage/speed, clear prior hit targets, and use the
existing 6.7-second reflected-only lifetime. A 120 ms projectile-only re-clash
cooldown prevents immediate overlap loops; it does not protect fighters from
the shots. Reflections add gold rings and a brief DOUBLE REFLECT impact label.
Punch reflection and shield behavior are unchanged. Friendly-fire rules govern
whether projectiles from teammates can interact, as with other combat.

## Parry Reflections

Successful combo Punch Parry, shield-release parry and defensive Dash parry now
reverse incoming projectiles and transfer ownership to the defender. The shot
survives its parry collision, clears prior hit targets, starts outside the new
owner's body, and gets the same 6.7-second reflected lifetime. It can wrap and
damage its original shooter. Existing parry eligibility, resource costs and
attacker stun remain; shield-parry counterattack preparation is preserved.
Ordinary shield blocks still consume a projectile without reflecting it.
Punching a projectile retains aim-directed reflection and its existing hit
refund/cancel rewards. Parry reflection does not add a second set of hit rewards.

`npm run test:projectile-parry` covers all three parry paths for Gun Man, Gooder
and Archer, shooter damage, preserved shield counterattack, lifetime, wrapping,
state restoration, ordinary blocking and non-combo stun restrictions.

High Perch alone permits camera tracking above world y=0 and lowers its zoom
floor to 0.12 for widely separated fighters. There is no added ceiling, collision,
or vertical warp. Other stages retain their camera limits. The background base
color extends into the newly visible sky.

The online build signature was advanced for the new combat behavior. Projectile
ownership, reflection flags, cooldown and lifetime use existing rollback/snapshot
serialization. Both online players must refresh to the current build.

`npm run test:projectile-clash-camera` covers two-way reflection, original-shooter
damage, overlap cooldown, horizontal wrap contact, saved state and High Perch
framing above the old top boundary, plus unchanged Flat camera clamping.
