# Current Fighter Comparison

Values read from the current core configuration, November 17, 2026. HP is the
Versus maximum before sports scaling. Punch values below are nominal tap/full
charge, before grounded bonuses, staling, enhancement, armor and combo modifiers.
Actual damage is rounded by native hit processing.

November 22 mobility patch: Chungus and Boomerangus ordinary dash launch speeds
increase 20% without changing walking, charge, recovery or air stock. Chungus
dash base/max is 252/624 and super-jump scale 1.08; Boomerangus is 252/504 and
.46 (previously .42). Their gravity and combat tuning are unchanged. Ember's air
carry/steering duration is .34 rather than .28 seconds, with the same launch
speed. Spike's frontal shield touch now deals 7 damage, .18 sec stun and a low
130-speed push at a 4-durability cost, once until genuine separation.

| Fighter | HP | Walk speed | Air dashes | Full charge | Damage | Fighter knockback |
| --- | --- | --- | --- | --- | --- | --- |
| Spike | 172 | 132 | 4 | .72s | 13 / 23 | 570 / 1083 |
| Anchor | 165 | 132 | 4 | .74s | 18 / 32 | 930 / 1767 |
| Rain | 125 | 132 | 9 | .66s | 12 / 22 | 760 / 1444 |
| Booster | 145 | 113.52 | 2 | 3s | 30 / 54 | 70 / 87.5 |
| Lamer | 145 | 113.52 | 2 | 3s | 7 / 11 | 988 / 1877.2 |
| Reflektor | 165 | 118.8 | 3 | .8s | 16 / 29 | 820 / 1558 |
| Lancer, spear tip | 182 | 125.4 | 3 | 1.1s | 25 / 100 | 1100 / 2400 |

- Spike's 25% reduction is fighter-punch-only: underlying 760 force stays intact
  for sports objects and shield recoil. Shield durability 140, hold 8s, passive
  full recovery 12s excluding existing delays.
- Booster/Lamer share Anchor ground dash parameters (620-1340) and .78 air scale.
  Both have a 50ms active punch window, fast taps and substantial charged-whiff
  recovery. Independent enhancement/suppression and needle/frown visuals remain.
  Lamer's fighter launch is 5% below Chungus (1040/1976), with no added arc.
  His sports-object force remains 1000/12000 before native mass and speed limits.
- Reflektor shares Anchor dash parameters, but walks at 41.58 units/sec while
  shielding. Shield durability 36, hold 10s, full passive recovery 15s plus delay.
  Licensed Void cloth is modified in a cached copy; no named metallic source
  asset is falsely claimed. Original sheets remain intact.
- Lancer is 1.5x Anchor gravity, with 1.1x Anchor air launch amplitude and three
  charges. His shaft does 4/12 damage, 450/800 force; haft 3/10, 100/180.
  Full extension is 445.248 units from the body edge, plus 18 at full charge.
  Shaft/haft damage ends 100ms after the thrust; the shaft remains standable and
  wall-clingable until withdrawn. Tip damage stays active through retraction.
  Fighters can be hit only once per lance attack, even after separation. Sports
  objects retain tip rearming after separation; lingering contact never farms hits.
- Whipado has **3 air dashes**, versus Anchor's **4**, and exactly matching air
  travel at every charge/aim. Neutral horizontal measured distance over the native
  .6s carry window is 369.87 / 506.09 / 551.49 units at tap/half/full for both.
  Ground dash parameters remain Whipado's original 330-680.
- Orbit has **5 air dashes**, up from 4. Launch speed x.85, duration
  .97697 -> 2.01141s; measured neutral horizontal range 464.17/694.58 ->
  810.16/1212.30 units at tap/full. Steering response 9/sec, turn limit 4.2rad/sec;
  neutral holds the current heading. Normal ground movement and punch unchanged.
- Phantom: a fresh Dash press during ghost travel materializes and redirects,
  spending another air charge. Confirmed materialization hits restore native
  punch resources before that charge is spent. Damage 28, versus 26 airborne /
  27 grounded full-charge normal Punch; knockback 110 / sports impulse 120.

See BOOSTER.md, LAMER.md, SHIELDS.md, LANCER.md, ORBIT.md and EDGEBERT.md for
mechanics and focused validation. No physical-controller balance claim is made.
