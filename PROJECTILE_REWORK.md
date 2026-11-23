# Gun Man And Archer Projectile Control

This records the earlier control-system pass. Current magazine, lifetime,
reflection decay and stun tuning supersede the older values below; see
[PROJECTILE_MAGAZINES.md](PROJECTILE_MAGAZINES.md).

## Tuning

| Property | Gun Man Before | Gun Man Now | Archer Before | Archer Now |
| --- | --- | --- | --- | --- |
| Controlled shot cap | 1 unreflected | 3 | 1 unreflected | 5 |
| Tap startup | 100 ms | 16.7 ms | 130 ms | 130 ms |
| Tap post-fire lockout | 300 ms | 45 ms | 270 ms | 270 ms |
| Speed, tap to full charge | 1050-1500 | 1800-2250 | 840-1200 | 760-980 |
| Collision radius | 8-15 | 5-7 | 4-7 | 12-16 |
| Native lifetime | until replaced/consumed | 4 s | until replaced/consumed | 7 s |
| Base damage | 10 | 4 | 12 | 12 |
| Base knockback | 620 | 280 | 680 | 680 |
| Base hitstun | 480 ms | 200 ms | 500 ms | 500 ms |
| Shield maximum | 68 | 41 | 68 | 41 |
| Uninterrupted full-shield overhold fizzle | 4.15 s | 2.75 s | 4.3 s | 2.9 s |

The existing charge, ground, Fired Up, combo-stale and defensive modifiers still
apply. Shield-release startup remains additional to ordinary tap startup.
Shield overhold grace and drain duration are each multiplied by 0.6 for these
two fighters only. Fizzle preserves the existing exhausted/uncharged Punch,
zero shield health and regeneration delay; it does not add a shield-break stun
or grant any resource refill. Global shield regeneration is unchanged.
Gun Man's native shot lifetime exceeds his full-shield fizzle time, so deliberate
clearing can remove still-active shots rather than waiting for them to expire.

All movement properties, controllers, animations and other fighter data are
unchanged. Gun Man keeps his Seeker spell-shot artwork; no new assets are added.

## Identity And Ownership

Shots remain in their original creator's existing projectile array. Each new
managed shot records a stable ID, creator ID, current owner/team, spawn order,
velocity, remaining lifetime and hit generation. `attack.id` never changes.
Reflection retains the existing `reflectedOwnerId` convention. A generation's
`contactId` lets the shared sports ball/target/bag hit registries accept a
legitimate redirected shot without awarding damage every overlapping frame.

The cap counts shots currently controlled by the fighter across all creator
arrays. A new shot replaces the oldest controlled shot, not the latest reflected
or re-hit shot. Ownership transferred into Gun Man/Archer is capped too.
Neither replacement nor lifetime expiration awards resources. Players are not
required to maintain the cap and no automatic shots are created.

Fizzle clears all shots currently attributed to that fighter, including reflected
shots created by someone else. It leaves shots originally created by that fighter
but now controlled by someone else alone. Existing round/KO cleanup rules remain.
Existing reflection lifetime is still 6.7 seconds; Kickoff does not reset lifetime.

## Kickoff And Ricochets

- Airborne, active-Dash contact with a controlled shot uses the existing through-
  trajectory/contact tests, Punch-priority guards and normal Kickoff lockout.
  Spawned shots must first separate, so firing during a Dash does not auto-kick.
- Redirection follows actual dash velocity, combines a little prior shot momentum
  with the existing Kickoff defender force, and respects the shot speed cap.
- The existing object-Kickoff response handles recoil, movement steering time,
  hitstop, end-lag cancellation, Fired Up and **one** air-dash refund.
- A valid re-hit advances the generation and clears its per-target hit records.
  Ordinary target overlap never advances it or damages/refills every frame.
- Two controlled managed shots use a swept, mass-weighted elastic exchange with
  separation and a short collision lockout. Gun Man's speed cap is 2600; Archer's
  is 1600. A distinct owned-shot ricochet invokes the same full air-dash restore
  helper as a successful clean hit, even when the fighter is elsewhere.
- Static/separating overlap is not a ricochet and awards nothing. There is no new
  projectile-specific resource pool or refill cooldown.
- Opposing projectiles retain the existing double-reflect ownership exchange.
  Punch reflections and combo/shield/dash parry reflections remain supported.

## Terrain And Modes

Gun Man's managed shots bounce from solid terrain. Archer's arrows lodge at the
impact for 280 ms as an authored-sprite effect, then fade. Lodged arrows are not
active projectile colliders, cannot be kicked and do not occupy an active slot.

Both managed shot types pass upward through one-way platforms and collide with
their top when descending: bullets bounce, arrows lodge. Solid platforms, floors
and walls remain solid from every direction. Geometry/collision for fighters and
sports objects is not changed.

Shots survive clean fighter/sports-object hits and retain per-generation target
registration. Directional shields deflect them with unchanged blockstun/chip/
durability/recovery rules. They remain eligible after deliberate re-hits.
Managed projectile launch direction follows its current travel vector instead
of the shooter archetype's inherited upward bias/live aim. This makes re-hit and
ricochet shots route predictably; existing combo lift and momentum modifiers
still apply.
Soccer, both basketball arenas, Target Break, Golden Rush and all Sandbag rulesets
reuse this same system. Court/Race PvP restrictions and friendly fire still apply.
Gravity switches retain their existing consume-on-hit interaction.

Standard AI uses short, frequent Gun Man releases and more deliberate Archer
releases. Neither AI waits for an empty projectile slot. Advanced AI Kickoff or
ricochet setups are not scripted in this pass.

## Validation And Limits

`tests/projectile-rework.test.js` covers native spawning/caps, oldest replacement,
IDs, control guards, new hit generations, resource rewards, angled ricochets,
terrain and one-way contacts, fizzle/ownership, all sports arenas, friendly fire,
AI, snapshots and six-frame delayed rollback. Its immutable pre-change fixture
also compares the other 27 fighters' data and 3,240 simulation hashes.

Historical fixture files are retained, not regenerated. Older Kite/Rain and
visual-only comparisons now explicitly exclude these two intentional reworks;
their new dedicated coverage replaces those expectations, not their baselines.

To keep collision ordering bounded and deterministic, each shot resolves at most
one projectile-to-projectile collision per simulation step. Native terrain
collisions win over projectile clashes crossing that terrain in the same step.
Other experimental projectile types keep their legacy one-shot behavior.
Competitive balance and physical-controller comfort need human playtesting.

No Git repository exists here. A recoverable source checkpoint is under
`artifacts/projectile-rework/checkpoints/`; no Git commit is claimed.

## Results

- 21 focused groups passed, including both one-way directions, ordinary solid
  terrain, wrap-contact safeguards, real-time projectile fizzle clearing,
  current-ownership replacement/cleanup, AI and live-generation snapshots.
- Other 27 fighters: unchanged data and 3,240 identical pre-change frame hashes.
- Full rollback: 6,960 comparison frames, 1,047 corrections, maximum depth 8.
- Core/full parity: 2,040 frames, eleven replays and both ten-fighter arenas.
- Existing Dashball 29, Target Break 24, Golden Rush 25 and Sandbag 16 groups
  passed, as did shield pressure, hit interruption, old projectile parries,
  double reflection/camera, online state and historical visual comparisons.
- Final core package passed real Chrome Gamepad API polling with a virtual pad,
  rapid firing, aliased Punch holds and simultaneous Dash/Punch charge/releases.
  Five visual scenes were checked with screenshots, nonblank-canvas tests and
  an authored-sprite draw check for the lodged arrow.
- Ten Gun Man/Archer CPU fighters, high health to sustain the stress sample:
  up to 18 active shots, 16.7 ms median, 16.8 ms p95, zero frames over 25 ms
  across 180 samples. These are local Chrome results, not a hardware guarantee.
- Final core package: offline file play, 73 decoded runtime PNGs, controller
  joining, real Gun Man/Archer WebRTC with 50 ms delay, 15 ms jitter and 5% loss,
  pause/rematch/disconnect, no missing assets. Experimental content and Orc art
  remain physically excluded; no new art files were introduced.

Physical controller feel and competitive balance remain playtest tasks. The AI
uses the new firing cadence but does not deliberately choreograph re-hit combos.
