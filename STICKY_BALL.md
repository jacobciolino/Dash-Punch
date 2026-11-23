# Sticky Ball

Stages: **Sticky Ball - Standard** and **Sticky Ball - Gravity Flip**. Battle
only, 1v1-5v5 local / existing private WebRTC 1v1. Default 33 points and
five-minute rounds, within the shared best-of-three match flow.

## Arena And Possession
4480 x 1600, floor Y1440, closed side walls/top. End zones are X24-350 and
X4130-4456. Three one-way platforms: (1484,1100), (2080,1100), (2676,1100),
each 320 x 24. Their outer edges span the approximate 30-yard lines, with no
raised center tier. Uprights stand at X350 and X4130, with crossbars at Y916
(524 above the floor), 224-unit visual width and 264-unit posts. Golden frames
are visual-only, not terrain. Gravity Flip uses the existing no-cooldown switch at
(2240,690), inverted landing, safe team-side respawns and upright camera.

One native Dashball physics object acquires a carrier on valid body contact.
The same authoritative carrier reference supplies attachment, movement penalty,
HUD and scoring. Fighters can attack and shield without automatically throwing
the ball. A securely attached ball cannot be stolen or directly shot. The ball
follows its living carrier at a body-relative offset, including inverted gravity.
Phantom retains an already carried ball but cannot score while intangible.

No football art was found in the bundled assets. A compact three-unit pixel-grid
football with laces is drawn locally; no external art or collision object is
added. Loose-ball physics uses the existing radius24/gravity1050/speed2050/
restitution.73 Soccer tuning. Attachment removes loose-ball collisions only.

## Retention And Mobility
Only valid, deduplicated incoming attacks contribute pressure:

```
pressure = sum(damage + .02 * knockback over the last .8 simulation seconds)
threshold = 18 + 60 * (current HP / current match maximum HP)
fumble when pressure >= threshold
```

The retention window is centralized and bounded .25-2 seconds in authoritative
configuration; no extra player-facing controls are added. Shielded hits use chip
damage/reduced knockback. Native punches, projectiles and Kickoffs contribute.
Separate combo strikes have separate contact IDs. Former carrier pickup lockout
is .35 seconds. Fumble impulse clamps to 180-1250, with native ball speed limits.

Carrying: walking x.5, ground/air dash speed x.55, air carry duration x(.6/.55)
to target x.6 air distance. Native jump/gravity/air-charge counts remain. Curve
state is preserved for Orbit; an ongoing self-dash is rescaled on pickup/loss.
No permanent character-stat mutation is used.

## Scoring And Safety
Only a living, tangible carrier in the opponent's end zone scores. Touchdowns
resolve after that fixed step's combat and projectile processing, so a KO wins
over an otherwise simultaneous touchdown. KO handling immediately drops the
football before corpse/respawn processing; a second drop is a no-op.

Each touchdown awards six points. A loose ball crossing the opponent's upright
plane from the field side, with its whole radius above the crossbar, awards
three. No basket-style downward entry is required; clearance extends above the
post tips. Last touch does not override the defending goal's team. Carried balls
score touchdowns only. Initial overlap, backside entry, vertical drops and
collision correction alone never award a field goal. Slow and fast crossings
use the shared swept detector, with strict sign checks for Sticky Ball so tiny
substep rounding cannot swallow a slow crossing.

Both scores use the normal Soccer celebration/reset/countdown. Ball and players
reset with established clock behavior. At least 33 points ends the round;
otherwise the higher score after five minutes wins, with next-score overtime
when tied. Existing score/time settings remain adjustable. Old saved seven-point
defaults migrate to 33; authoritative snapshots/configurations do not migrate.
KOs award no sports points. Uprights remain fixed during gravity reversal;
the switch still reverses fighter/ball gravity, not these visual goal markers.

AI uses ordinary movement/Punch/Dash: collect, carry, escort, pressure the enemy
carrier and sometimes contest the existing gravity switch. Team ranks distribute
nearby recovery/escort positions. Nearby loose-ball opportunities use an elevated,
gravity-aware shot aim; no artificial motion or scripted scores are added.

## Verification
`test:sticky-ball`: 21 focused groups cover both arenas, native pickup,
attachment, penalties, pressure/expiry, KO/corpse safety, scoring/reset, gravity,
Phantom, regulation/overtime, ten CPUs, snapshot/replay, delayed rollback and
30/60/120Hz, field-goal crossings, 1v1-5v5 spawns, round transitions and exact
pre-change parity for all non-Sticky sports. `test:sports-presentation-browser`
checks actual selection/settings, fixtures and ten-fighter 720p/1080p/inverted
scenes without render-state changes. `test:sticky-ball-online` checks real
WebRTC scoring/rematch under simulated delay/jitter/loss; set STICKY_TEST_ARENA
to sticky-ball-flip for the second variant. Both peers require build 82.

The new objective helper is bundled by the existing core builder and whitelisted
by the local file server. No build or ZIP is produced. Human carrier-penalty,
platform-route and fumble balance testing remains necessary.
