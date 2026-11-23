# Sandbag Showdown

## Play

Play > Sandbag Showdown > ruleset/settings > Choose Fighters > ready players >
Start Showdown. Spare seats use the existing CPU controls. Local play supports
1v1 through 5v5; private online remains two human players (1v1). No new commands.
Damage Brawl is the default. See SPORTS_UPDATE.md for the latest tuning and build.

- Damage Race: own-half restriction, two heavy movable bags, no fighter interactions
  including teammate hits/clashes/projectile reflections/Kickoffs. Only the
  assigned team's bag accepts scoring hits. Existing self-damage remains usable;
  reaching zero cannot eliminate a Race fighter (health is clamped to one).
- Damage Brawl: same assigned, movable bags, full-field combat, reduced health
  and individual respawns. Opponent damage/KOs never add score.
- Sandbag Scramble: a single shared movable bag; each hit credits its attacker's
  team. The condition reflects both teams' combined bag damage.

Blue is left/team 0, Red right/team 1 within this mode only. Standard/Dashball
team colors and preferences are unchanged. Optional friendly fire defaults on
for Brawl/Scramble and is always off in Race.

## Tuning

`sandbag.js` owns rules/configuration, arenas, bag physics, hit ledgers, event
attribution, score, clock and deterioration. `game.js` supplies narrow adapters
for existing hitboxes, attack profiles, damage, launch, confirmations, AI,
respawns and presentation. Bags are never passed to fighter `resolveHit()`.

- Duration: 30/60/90/120/180 seconds, default 90. Leader wins at zero; a tie
  preserves scores and enters next-valid-bag-hit sudden death.
- Brawl/Scramble health: 50%, adjustable 20-100%; respawn: 15s, with 10/15/20s choices.
  Shared two-second sports spawn protection ends on offensive action. See
  `sports.js` and `SPORTS_POLISH.md` for the shared Battle configuration.
- Arena: 2400 x 1320, floor at 1160; fixed .43 camera zoom and full arena view.
  Symmetric team spawn lanes do not overlap the bags at match start.
- Bag: 90 x 168 collider, 30 x 56 authored sprite drawn at integer 3x.
- All-bag mass: 2; gravity: 1800; speed cap: 1100; floor bounce: .38;
  wall bounce: .5; air drag: .3; grounded friction: 3. Numeric values are exposed
  in module defaults/options. Solid/one-way rectangle collision uses the native
  overlap solver with capped-speed microsteps and arena safety bounds.
- Deterioration thresholds: 120 / 450 / 1000 / 2200 cumulative damage.
  Five stages: fresh, torn, burning, charred, nearly black. These are presentation
  thresholds only; maximum condition never limits future damage/scoring.

Damage shares the native calculation: base projectile/Punch profile, charge,
grounded damage, electric-pulse scaling and Fired Up. Fighter combo staling and
fighter-specific vulnerability multipliers do not apply to bags. Launch uses
attack knockback, direction and grounded launch separately from damage, then
bag mass and speed cap. No roster properties or fighter frame data were changed.

## Registration And Special Attacks

Each scoring event includes attacker ID, team, damage, bag ID, tick and serial.
The bag ledger keys fighter/attack ID (or actual Dash ID), while the attack's
existing hit-target set records its bag target. Ordinary sustained hitboxes
self-cancel on one hit. Native confirmation clears recovery and refills resources.

Micro USB's initial hit attaches the existing three electrical pulses at .16s
intervals and quarter damage, each with a fresh deterministic attack ID. Fresh
ordinary hits replace/clear the current latch, matching native latch ownership.
Sword Kun retains his automatic second strike; Edgebert's stages retain separate
inputs, IDs and per-stage damage. Projectile sweeps consume shots on contact.
Existing fighter interception/shield/parry resolution precedes bag registration
in combat rulesets. Punches retain priority over Kickoffs. A valid airborne
Kickoff uses the native contact/trajectory test, recoil, damage and one-air-dash
reward. Chase follows the bag's launch velocity.

Scores, bags, ledgers, electrical latches, clock and respawns are serialized in
rollback and host snapshots. Stable fighter/bag iteration determines simultaneous
hit order; the last valid impulse sets the shared bag's launch, not the damage.
Restoring/replaying a frame restores its score/events instead of appending twice.

## Art

`assets/sandbag/conditions.png`: five 30x56 frames, 150x56 sheet.
`assets/sandbag/flames.png`: six 40x64 flame frames, 240x64 sheet, 12 fps.
Both were generated with the built-in image-generation tool, then cropped and
nearest-neighbor sampled to their logical resolution, with binary alpha edges.
Prompts: five aligned canvas-bag deterioration states on transparency; six sparse
looping flame frames around an open center on transparency. Original generations
are preserved in `artifacts/sandbag/`. `tools/prepare-sandbag-art.cjs` reproduces
normalization. The installed Ember aura was inspected but was unsuitable as
readable bag fire, so it was not reused or modified.

Bags render behind fighters. Authored flame frames/embers, native impact sprites,
small damage numbers, restrained shake/hitstop and tiny fragments sampled from
the actual bag sheet provide feedback. No body distortion or geometric attack
placeholders were added. Particles are presentation-only and cannot score.

## Validation And Limits

Run `npm run test:sandbag`, `test:sandbag-browser`, `test:sandbag-online`.
Browser tests require Playwright/Chrome as the existing browser suite does.

The focused suite covers all rules, exact damage/modifiers, duplicate prevention,
electric pulses, sword/Edgebert stages, projectiles/Kickoffs, respawns, boundaries,
physics/caps, condition thresholds, countdown/time/overtime/rematches, seeded
replays and delayed-input rollback. Browser validation covers controller settings,
real keyboard Punch, transparent assets, small windows, ten-CPU rendering, results
and real two-peer WebRTC with 50ms delay, 15ms jitter and 5% simulated packet loss.

Physical controllers were not available for hands-on feel testing; virtual
Gamepad input exercises the existing controller action layer. AI is intentionally
simple and may bunch around bags; human team strategy and damage thresholds need
playtesting. No new self-damage abilities or environment art were invented.

This folder is not a Git repository. Recoverable before/phase/final source
archives are under `artifacts/sandbag/checkpoints/`; no Git checkpoints are claimed.
