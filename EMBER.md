# Ember - The Smolder

Core fighter 21. Uses the licensed Seeker PRO Void animation sheets, cached
charcoal-cloth derivatives, native ember markings and flame eyes. Original PNGs,
silhouette, animation anchors, costumes and team outlines remain intact.

## Prototype Tuning

| Property | Value |
| --- | --- |
| Health | 132 Versus / 66 Battle; Rain is 125 / 63 |
| Body | Ordinary 46 x 66 Seeker collision dimensions |
| Walk / run target | 89.76 / 148.104 units/sec (68% of Rain) |
| Walking acceleration | 65% of ordinary acceleration |
| Gravity | 2060 |
| Air dashes | Four; existing landing, defensive recharge and qualifying hit rules |
| Dash base / maximum / air multiplier | 340 / 720 / .60 |
| Neutral horizontal air launch | 276.96 tap through 409.2 full charge units/sec |
| Air carry / steering | .34 sec; 850 steering acceleration; launch speed unchanged |
| Powered air-dash duration | 21.4% longer than the previous .28 sec, before further coasting |
| Punch | 13 base damage; ordinary Rain 760 knockback and .44 base hitstun |
| Punch charge / startup / active / recovery | .66 / .07 / .13 / .21 sec, with existing charge/ground modifiers |
| Shield | 24 durability, 4.5 sec hold, 6.75 sec inactive full recovery plus existing impact delays |
| Shield contact | Two immediate damage once per physical contact entry; no additional stun or launch |
| Dash flame | Three damage once per fighter per dash; .14 sec airborne / .65 sec ground life |

## Flame Rules

`ember.js` stores bounded, plain snapshot-owned path segments and per-dash fighter
and ball contact ledgers. Segments sample actual dash motion, including seams;
recovery teleports never become long damaging paths. Ground dashes coat the actual
supporting floor/platform for .65 seconds. Coatings retain surface-local positions
on moving platforms, face away from the support under reversed/sideways gravity,
and stop at gaps or missing support. Super-jump takeoff does not paint a coating.
Four-unit flame pixels make both trails more visible without blur. At most 40
segments per owner remain active. KO, respawn and round reset clear owned fire.

Flame damage deliberately bypasses successful-hit rewards, combo credit, hitstop
and hitstun. It never restores air dashes or defensive resources. Grounded targets
get a 1.5-unit gravity-relative bump and 16 upward velocity; airborne targets get
12 outward velocity. Current attacks and inputs are not canceled. Normal punches
and Kickoffs keep their ordinary interactions and rewards. There is no burn or
damage-over-time status.

Native melee, eligible Kickoffs, projectiles, directional shields and sports
objects extinguish contacted segments before body damage. Balls get at most 80
units/sec deflection (eight for boulders), once per ball per dash to prevent
overlap stacking. Resting overlap adds no energy. Ball ownership and scoring are
untouched. Court, friendly fire, spawn protection and Phantom intangibility apply.

The fire fist reuses Rain's cached native-grid flowing-fist renderer with its own
palette, flame edges and brief smoke. Kickoff puffs, small shield-edge flames,
campfire-log health art and four flaming/toasted marshmallow indicators are
presentation-only. Universal low-health, shield-break and vulnerability marks stay.

## Verification

- `npm run test:ember`: focused mechanics, counterplay, sports objects, HUD state,
  cleanup, snapshots, replay, delayed rollback, 30/60/120 Hz and ten CPUs.
- `REGRESSION_BEFORE_DIR=/path/to/pre-change/export npm run test:ember` additionally
  uses that actual export for old-roster/sport comparisons; ordinary runs fall back
  to the immediate a2f06be source checkpoint. Historical fixtures are not rewritten.
- `npm run test:ember-browser`: 720p/1080p roster, source masks, fist, trails,
  shield, campfire HUD, marshmallows, victory, rendering purity and offline smoke.
- `npm run test:ember-online`: real private WebRTC 1v1, 50ms delay, 15ms jitter,
  5% loss, flame synchronization and rematch cleanup. Build 86 peers must match.

The four-second headless ten-CPU sample is not a sustained hardware benchmark.
Physical controller feel, short-dash usefulness and flame/shield damage need human
playtesting. Offline smoke reuses existing licensed asset embedding; it does not
certify a newly packaged release. No new assets, dependencies or ZIP were built.
