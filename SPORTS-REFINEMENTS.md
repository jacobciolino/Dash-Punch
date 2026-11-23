# Sports And Heavyweight Refinements

## KO Feedback

The 840-pixel screen-wide elimination strip is removed. Battle sports now draw
one small, upright `P# / KO` marker at each knocked-out fighter's frozen world
position. It remains until that fighter respawns. Markers are bounded to 88%
of hurtbox width and 56% of height, with additional 48 x 36 screen-pixel caps.
They use authoritative team colors, follow the shared camera, and add no new
simulation state. Death animation, health-bar refill and respawn timing remain.

## Field Goal

Both Court and Battle use continuous, timer-based play. The goal frame is now
entirely decorative: uprights, crossbar and support have no fighter, ball or
projectile collision boxes. Defensive perches remain solid.

The crossbar is 3.4 Chungus heights above the floor: 524 units, formerly 432.
A ball must cross from the field side and fully clear the marked crossbar;
there is no downward-entry requirement and no height cap at the upright tips.
Rear approaches, persistent overlap and collision-correction crossings cannot
score. Each valid crossing awards one point to the attacking team.

Only the scored ball is removed. A fresh ball, with a deterministic new ID,
drops at midfield from Y=78 for the default radius. Fighters keep their
positions, inputs, velocity, resources and KO timers. No goal celebration pause,
field reset or countdown occurs. The clock determines victory, not the old
winning-score setting; tied matches retain the chosen overtime behavior.
The obsolete winning-score control and labels are hidden for Field Goal.

AI targets the elevated scoring plane without trying to clear a physical near
upright. Goal-frame geometry is presentation data separate from collision
terrain. Drop serial, ball state and scoring use ordinary match serialization.

## Boulder Contact

Applies to Boulder Control, Gravity Flip Boulder Control and Total Rush's giant
boulder only. Walking contact never adds velocity or impulses to the boulder.
Existing body separation transfers/displaces the fighter instead.

An inward-moving boulder becomes hazardous above 110 units/sec normal speed:

- Grounded fighters: 0.85-second flatten stun, no direct damage. Existing authored
  fallen/death poses represent flattening; there is no sprite squash or collider
  resize. The stun does not produce floor bounces.
- Airborne fighters: 8-18 damage scaled by impact, 0.65-second knockdown, and
  340-1,100 launch force, respecting heavyweight resistance and current gravity.
- Active dash movement, correctly aimed shields and successful Punch/Kickoff
  contacts protect the fighter. Holding an inactive punch is not a free block
  outside the existing directional shield rules.

Persistent contact cannot repeatedly stun or damage. A separation margin rearms
genuine later impacts. Friendly-fire, spawn protection, normal resource rewards,
projectile ownership and heavy-ball mass remain in the shared systems. Airborne
KO damage invokes existing individual sports respawns and awards no points.

## Pixel Density

The existing cached nearest-neighbor renderer samples Chungus and both armed /
unarmed Boomerangus atlases at 46 pixels per pose instead of 52. The boomerang
uses 28 samples per 32-pixel rotation frame. This is a roughly 12% resolution
reduction, not a replacement design or aggressively reduced palette.

Original PNG files are untouched. Boomerangus keeps sampled original colors;
Chungus retains his existing palette treatment. The original 52-pixel scale grid
is retained separately, preserving display size, pivots and feet positions.
All animation frames, durations, stats, hitboxes and hurtboxes are unchanged.
Caches avoid new pixel processing during normal animation frames.

Before/after captures at actual gameplay scale are in
`artifacts/sports-refinements/heavyweights-{before,after}-{1280,1920}.png`.
The comparison includes Orbit as the normal Seeker PRO reference. Rendering was
verified not to change simulation hashes; nearest-neighbor sampling is retained.

## Verification

Focused suites cover marker bounds, continuous scoring, visual-only frames,
timer victory, ball drops, boulder hazards and defense, grounded flattening,
sprite metadata, snapshot/replay and delayed-input rollback. Existing sports,
fighter, controller, offline release and networking checks are also run.

Historical JSON fixtures are retained, never regenerated. Old exact-hash cases
for Field Goal and the three boulder sports intentionally no longer match their
explicitly revised rules. The regression helper identifies these four modes;
3,660 recorded pre-Boomerangus frames for unchanged modes are still checked.
New behavior has dedicated physics, scoring and determinism coverage.
The known older Rain/Orbit fixture discrepancy remains separate and unchanged.

Changed runtime files: `game.js`, `dashball.js`, `presentation-assets.js`.
Packaging, patch notes and tests were updated. No new assets, dependencies,
controls, networking infrastructure or fighter balance changes were introduced.
There is no Git repository; the pre-change checkpoint is
`exports/checkpoint-before-sports-refinements-2026-11-13.zip`.

Human playtesting should assess boulder impact strength, flatten duration,
Field Goal shot difficulty and tiny KO-label readability on TVs. Physical
controller feel is not certified by automated gamepad simulation.

Final checks: 37 current simulation/build suites and seven browser checks passed,
including real WebRTC Court/Battle Field Goal scoring, timed victory and rematch.
The final core/full build parity test checked 3,390 frames. Short 180-frame
ten-CPU samples in software-rendered Chrome measured about 16.7-ms median and
16.8-ms p95 with no sampled frames above 25 ms. This refresh-limited sample is
not a minimum-spec performance guarantee.

The shared Seeker flatten pose holds authored death frame 12, before the final
fade/puddle frames. Heavyweights retain their existing single fallen pose.
Normal death animation is unchanged.

Release folder: `exports/Dash-Punch-Sports-Update-2026-11-13/`.
Offline core ZIP: `exports/Dash-Punch-Sports-Update-2026-11-13.zip`.
The preview at localhost:8080 serves that build; old releases are retained.
