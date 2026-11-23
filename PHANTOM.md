# Phantom

Phantom (`phantom`) is the 15th core fighter, appended after Boomerangus without
reordering the existing core roster. His two-button moveset combines slow ground
movement, two intangible air dashes and a short-range materialization strike.
Gameplay tuning lives in `CHARACTER_DATA.phantom` and `data.phantomDash` in
`game.js`; art assignment lives in `presentation-assets.js`.

## Runtime Tuning

Distances use simulation units; speed is units/second and acceleration is
units/second squared. Health below is the normal fighter maximum before any
mode-specific health setting, not the raw pre-global definition.

| Property | Current value |
| --- | --- |
| Maximum health | 99 HP (`Math.round(60 * 1.65)`) |
| Body width x height | 46 x 66 |
| Ground walk speed | 99 (`132 * 0.75`) |
| Ground walk acceleration | 1820 (`2600 * 0.7`), before reversal modifiers |
| Gravity | 1450 |
| Air dashes | 2 |
| Free-fall control scale | 0.65 |
| Tippy-toes jump scale | 0.88 |
| Normal Punch damage | 14.3 nominal, before shared integer damage rounding and combat modifiers |
| Normal Punch reach / radius | 34 / 24 |
| Normal Punch knockback / hitstun | 620 / 0.36 seconds |

### Ghost Dash

These are `data.phantomDash` values, separate from the inherited grounded dash.
Releasing an airborne Dash spends one available air dash and locks its direction
to the release aim (or facing direction when there is no aim).

| Property | Current value |
| --- | --- |
| Duration | 1.25 seconds, 75 fixed 60 Hz steps if uninterrupted |
| Uncharged speed | 520 |
| Fully charged speed | 600 |
| Nominal unobstructed travel | 650 to 750 (`speed * 1.25`) |
| Ghost opacity | 0.4 (40%) |

Speed interpolates linearly from 520 to 600 with Dash charge. The travel range is
nominal, not guaranteed: landing or solid terrain contact can end the dash early.
Ghost movement sets velocity along the committed direction; it is not an extra
projectile or a separate teleport.

While ghosted, Phantom ignores incoming attacks, fighter body contacts and
gameplay-object interactions. He does not damage fighters, deflect projectiles,
carry or push sports objects, or hit targets while passing through them.
Terrain collision remains solid, including the normal one-way-platform rules;
ghosting does not permit movement through walls or floors.

### Materialization Strike

On timeout, a fresh Dash press, or an early terrain/landing stop, Phantom becomes solid and resolves
one immediate body-overlap strike. It does not damage every fighter or object
crossed during the dash, and it is not a ranged explosion. Shared shields,
invulnerability, team rules and other combat modifiers still apply.

| `data.phantomDash.strike` field | Current value |
| --- | --- |
| `damage` | 28 nominal: one above rounded full-charge grounded Punch (27; airborne 26) |
| `knockback` | 110 |
| `hitstun` | 0.24 seconds |
| `impulse` | 120 for supported sports-object interactions |

The materialization profile is distinct from the normal 14.3-damage Punch.
Damage and knockback listed here are tuning values, not a promise of identical
final damage or launch speed against every target or in every mode.

## Refills And Input

- Landing on gravity-relative ground restores the two-air-dash supply. Initial
  spawn and ordinary round/respawn resets initialize the supply normally.
- A fresh Dash press during ghost travel materializes at that exact input
  endpoint, then immediately starts a new uncharged ghost in the current input
  direction if an air-dash charge is available. Holding Dash does not repeat it.
- Successful materialization contacts restore normal punch resources, including
  both air dashes and capped damage-based shield recovery. This applies to valid
  fighter, blocked shield, ball, boulder, golden-target and sandbag contacts.
  Refilling occurs before the redirected dash spends one charge. A miss refunds
  nothing; an empty-budget cancel can materialize but cannot start another ghost
  unless its strike earns the refill. Hitstop, parries, KO and round freezes
  retain their normal protection. Punch cannot buffer through the cancel.
- Wall clings, ordinary solid-phase punches, projectile reflections, sports rewards, passive air
  dash banking and mercy dashes do not refill Phantom's air dashes. A terrain
  stop that is not a landing does not refund the dash.
- Phantom cannot perform Kickoffs, including fighter and sports-object Kickoffs.
- Starting a ghost dash clears the active Punch and pending actions. Punch input
  edges during ghosting are discarded, not buffered for exit. Fresh Dash presses
  explicitly cancel rather than queueing a later action.
- Holding Punch through materialization cannot queue a Punch or shield. Release
  Punch after ghosting, then use a fresh press/release for the next Punch action.
  The materialization strike happens independently of that input.
- Direction, Dash and Punch remain the only combat inputs. Grounded Dash and
  normal solid-state Punch use the existing shared action systems.

## Source Art

Phantom reuses the existing licensed Hooded Seeker PRO **Void** artwork by
Primitive Pixels through the shared `seekerpro` sprite set. His pale cloak tint
is `#bddbd1`; ghosting uses the 0.4 opacity above. Tinting and opacity are runtime
presentation, not edits to the source sheets or changes to gameplay hitboxes.

- Original sheets: `assets/optional/seeker-pro/Seeker_PRO/Spritesheets/Void/`,
  using the existing `Seeker_Void_*.png` files.
- Original license: `assets/optional/seeker-pro/Seeker_PRO/LICENSE.txt`.
- Pack documentation: `assets/optional/seeker-pro/Seeker_PRO/README.txt` and
  `assets/optional/seeker-pro/Seeker_PRO/Animation_Guide.txt`.

No new Phantom atlas, modified sprite sheets or newly generated character art
are required. The pack's existing license and attribution remain with the game;
the source artwork is not offered as a standalone sprite library.

## Validation Status

The 50 dedicated simulation tests cover charges, terrain stops, harmless ghost
travel, input discard, endpoint-only materialization, shields, invulnerability,
friendly fire, low object impulse, snapshots, delayed rollback and genuinely
simulated 30/60/120 Hz completion, KO/respawn cleanup and ten native-input CPU
Phantoms in Versus and every sports arena/ruleset. Core and full-source behavior
agree. Versus CPU decisions had used unseeded `Math.random`; those gameplay-only
calls now use the existing `gameplayRandom` source. This is a shared determinism
repair, not a change to stats, controls or decision probabilities. Presentation
randomness remains separate.

Browser checks cover all 15 roster previews, Phantom's animation states and 40%
opacity, nearest-neighbor pixels, gravity inversion, victory sprites, player
cards, offline file play and ten-fighter matches on all 18 Dashball arenas plus
three Sandbag rulesets. Captures at 1280x720 and 1920x1080 are in
`artifacts/phantom/`. Rendering did not alter simulation hashes.

The final real two-browser private WebRTC Phantom/Orbit match passed with 50 ms
delay, 15 ms jitter and 5% simulated packet loss. Both peers reported matching
frame hashes, with rollback, pause, rematch and disconnect handling verified.
One initial browser countdown wait timed out; subsequent runs, including the
final release, passed without a runtime change. Its cause was not reproduced.

The unchanged 14 fighters and existing modes match the immediately previous
playable release over 5,280 frames in 47 cases. Core packaging parity adds 3,480
frames and 12 replays. Existing rollback, match-flow, magazine, Golden Rush,
Sandbag, Total Rush balance, shield, timer-audio and silhouette checks passed.

The entire historical suite is not green. Old player-card/shared-menu, Kite,
Boulder/Gravity Boulder and Target Charge fixture comparisons fail identically
against the pre-Phantom checkpoint; the fixtures were not regenerated. The
known Rain/Orbit discrepancy remains. Older frozen-file checks and the legacy
online-state harness also predate later requested changes. See
`artifacts/phantom/preexisting-failures.json` for the checkpoint comparisons.

Live ten-CPU Total Rush measured approximately 16.7 ms median and 16.8 ms p95
requestAnimationFrame intervals in headless software Chrome. This is a short
browser observation, not a physical-controller test, hardware guarantee or
proof of subjective balance. Human playtesting should focus on the long dash's
commitment, materialization contact tolerance, shield counterplay and CPU aim.

The core-only offline release is
`exports/Dash Punch V1 - 2026-11-16.zip`. Extract the complete folder and open
`index.html`; all required code, art, audio, fonts and licenses are bundled.
Tests, screenshots, build reports, old releases and experimental assets are not
included. The project has no Git repository; the pre-change checkpoint is
`artifacts/phantom-before-2026-11-15.zip` rather than a claimed Git commit.
