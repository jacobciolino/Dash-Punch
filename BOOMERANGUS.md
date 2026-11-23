# Boomerangus

Latest movement update: 20% faster ordinary dashes and 9.52% stronger super-jump
launch, without changing walking, gravity, weight, health or weapon. See
[Dash Controls](DASH_CONTROLS.md). See
[Charged Recall](CHARGED_RECALL.md) for Punch-held return charging, wall
turnarounds and multi-target collision rules.

Core fighter #14, added without replacing the previous thirteen. Local matches
support ten fighters; private WebRTC remains two players. No new controls,
dependencies, physics engine or experimental release content.

## Tuning

| Property | Value |
| --- | --- |
| Body | 136 x 176 game units |
| Health | 347 Versus; 174 at default 50% sports health |
| Shield durability | 130 |
| Walking | 92.4 units/sec, 70% of Chungus |
| Ground acceleration | 1,950 units/sec^2, 75% of Chungus |
| Direction reversal acceleration | 390 units/sec^2 |
| Walking deceleration | 900 units/sec^2 |
| Gravity | 2,700 units/sec^2 |
| Air acceleration / ordinary freefall input | 220 / 18% of universal control |
| Air dashes | One; normal legitimate refills apply |
| Nominal ground dash | 267.12-534.24 units/sec |
| Nominal air dash | 199.584-287.28 units/sec |
| Ground dash glide | 0.85 seconds; same-direction walking does not cancel its momentum |
| Dash startup / repeat lock | 0.10 / 0.32 seconds |
| Dash full charge | 1.35 seconds |
| Tippy jump launch | 726.8-1,315.6 units/sec, 46% of normal |
| Received punch/Kickoff/block impulse | 58% of normal |
| Punch charge / startup | 1.15 / 0.30 seconds |
| Punch recovery | 0.48-0.5856 seconds; normal clean-hit benefits apply |
| Damage | 16-29 airborne; 17-31 grounded, before existing staleness/buffs |
| Knockback base | 1,800, with existing charge/combo/ground rules |
| Projectile hitstun | 0.42 seconds base; existing charge/pressure decay |
| Collision diameter | 76 units |
| Outbound flight | 0.8 seconds, cosine deceleration from 1,050-1,150 |
| Outbound travel | Approximately 526-577 units from the hand at 60 Hz |
| Return | 2,400 acceleration / 1,100 cap normally; charged to 4,363.64 / 2,000; 4.8 rad/sec steering |
| Flight failsafe | Eight seconds; reflections halve remaining life |

Movement values describe fresh launches, not guaranteed travel distance. Existing
inertia, drag, wall launches, terrain, hitstop and gravity still apply. No new
invulnerability. Shield-break stun and ordinary sports-ball knockdown retain
their existing responses, rather than granting blanket immunity.

## Weapon Rules

The shared projectile loop owns collision, reflection, Kickoffs, team filtering
and sports interactions. `boomerang.js` only supplies deterministic steering.
The weapon stops before turning, then homes toward its current controller's
current position using the shortest legal wrapped route. An initial hand offset
of 120 tangent units and -20 gravity units mirrors with the sprite.

There is one weapon slot, including a weapon reflected away from its creator.
Catch, expiration, stage-switch consumption and KO cleanup restore availability;
they never bypass remaining punch recovery. Holding Punch while the weapon is
away still shields. Releasing does not create melee, another weapon or a queued
automatic throw. Shield exhaustion does not recall the weapon for free.
Holding also charges recall while outbound, without affecting outward motion.
Release smoothly sheds assistance; a fresh Punch cycle is required after a
recall hold. Solid walls stop blocked motion and ease into an early return;
wrapping does not trigger this turnaround.

Each fighter can be hit once per outward/return generation. Contact latches
prevent persistent-overlap damage and objective/resource farming, including at
the turnaround. A separated return can hit again. Shields turn outbound flight
back; return shields deflect the path before finite steering resumes. Parries,
melee reflection and projectile clashes use current controlling ownership and
the existing caps/lifetime rules. Ordinary impacts do not consume the weapon.
The gravity switch retains its established projectile-consumption behavior.

All native sports impulses are reused, including boulder mass resistance and
Target Charge's unchanged impact curve and permanent ball scoring ownership.
No character-specific points or automatic repositioning exist.

## AI

Normal abstract Dash/Punch/direction inputs only. Versus AI holds a useful post,
leads nearby targets and shields while its weapon is away. Sports AI favors
team-side defense/clears, own-ball interception in Target Charge and territorial
positions in Boulder modes. It can adjust its post slightly during returns but
does not receive movement boosts, scripted shots or scoring privileges.

## Art And Limitations

Separate armed/unarmed 4 x 4 atlases use 52-pixel cells with hard alpha, limited
palettes and nearest-neighbor integer scaling. Teal clothing, bronze projecting
armor and a two-pronged crest change the silhouette. The visible weapon uses
sixteen baked 32-pixel rotation frames, not smooth runtime image rotation.
Team outlines, glow, costumes, gravity transforms and existing authored combat
effects remain in the shared renderer. Original Chungus PNGs are unchanged.

The built-in image-generation workflow edited the licensed project Chungus
atlas, then produced a matching weapon and unarmed atlas. Prompts requested the
same sixteen pose cells, a teal/bronze armored heavyweight with altered crest
and shoulders, a raised-weapon windup/empty-hand throw, and removal of the carried
weapon for the unarmed set. `tools/prepare-boomerangus-art.cjs` performs only
nearest-neighbor export, palette/alpha cleanup, anchoring and baked rotations.

This is a functional sixteen-pose approximation, including a two-pose throw,
not a new fully hand-authored animation pack. Human playtesting should assess
throw readability, return-path traps, extreme mobility weakness, objective
power and physical controller feel. Automated tests cannot certify these.

## Checkpoint And Verification

No Git repository exists here. The pre-change ZIP is
`exports/checkpoint-before-boomerangus-2026-11-13.zip`; frozen data/art hashes and
5,160 historical simulation frames are retained, not regenerated.

Focused tests: `node tests/boomerangus.test.js`.
Browser tests: `node tests/boomerangus.browser.test.js` with the existing browser
runtime and optional `CORE_RELEASE_DIR`. Results and 720p/1080p captures are in
`artifacts/boomerangus/`. Packaging uses the established core-only builder.

Final verification: 18 focused groups; 36 current simulation/build suites;
six browser checks, including real WebRTC with both peers using Boomerangus,
50-ms delay, jitter/loss, matched hashes, pause, rematch and disconnect. Final
core/full parity checks cover 3,390 frames. No historical baselines changed.
The pre-existing Rain discrepancy in `tests/orbit-before.test.js` still fails;
the current Orbit arc suite passes. Old universal traversal assertions now
explicitly retain Boomerangus's intended low-jump exception; every old fighter
retains its original assertion.

At 1280 x 720 in headless Chrome with software rendering, ten-fighter Total Rush
samples measured 16.7-ms median / 16.8-ms p95 for both Chungus and Boomerangus,
with zero sampled frames over 25 ms. This short 180-frame animation-frame sample
is refresh-limited, not a precise isolated CPU/GPU cost or a minimum-spec promise.
Physical controller feel and subjective balance still need human playtests.

Changed runtime files: `game.js`, `boomerang.js`, `presentation-assets.js`,
`index.html`, `server.js`; new assets in `assets/boomerangus/`. Preparation,
packaging and verification changes are in `tools/prepare-boomerangus-art.cjs`,
`tools/build-core-release.cjs`, `package.json`, the simulation harness, dedicated
Boomerangus tests and existing core/traversal tests. Combat timing, collision,
AI and rendering reuse the existing engine; `dashball.js`, `sandbag.js`,
`rollback.js` and the previous thirteen fighter definitions are unchanged.

Release: `exports/Dash-Punch-Boomerangus-Release-2026-11-13/`.
Offline ZIP: `exports/Dash-Punch-Boomerangus-2026-11-13.zip` (7,537,556 bytes).
CRC integrity and identical tested/final runtime files were verified. Source
and old exports are retained. The default preview points to this core build.
