# Projectile Magazines And Balance

Wizard is the current display name for Gun Man; the internal `gunman` ID and all
projectile rules are unchanged. Historical before-values and verification reports
below retain their original names.

## Current Tuning

| Property | Gun Man Before | Wizard Now | Archer Before | Archer Now |
| --- | --- | --- | --- | --- |
| Magazine | none | 3 | none | 5 |
| Automatic empty reload | none | 1.1 seconds | none | 1.4 seconds |
| Controlled cap | 3 | 3 | 5 | 5 |
| Tap startup / recovery | 16.7 / 45 ms | unchanged | 130 / 270 ms | unchanged |
| Projectile hitstun, base | 200 ms | 70 ms | 500 ms | 220 ms |
| Maximum charged hitstun before pressure decay | charge-dependent | 105 ms | charge-dependent | 320 ms |
| Projectile blockstun, tap / charged | 167 / 300 ms | 25 / 40 ms | 167 / 300 ms | 65 / 100 ms |
| Projectile hitstop, tap | 52 ms | 12 ms | 52 ms | 28 ms |
| Native lifetime | 4 seconds | 0.8 seconds | 7 seconds | 2.5 seconds |
| Speed, tap / charged | 1800 / 2250 | unchanged | 760 / 980 | 1150 / 1400 |
| Unobstructed native range, tap / charged | 7200 / 9000 | 1440 / 1800 | 5320 / 6860 | 2875 / 3500 |
| Shield durability damage multiplier | 1 | 0.3 | 1 | 0.65 |

Body size, movement, air dashes, base damage, knockback, projectile size, mass,
terrain bounce/lodging, one-way platforms and native Kickoff/ricochet physics
remain unchanged. Arrow range was checked against 1280-wide normal arenas,
2400-2800-wide sports arenas and the 3456-wide team arenas. Fully charged arrows
can cross the largest core arena unobstructed; tap arrows cover meaningful
long-distance team-spawn engagements without becoming faster than bullets.

## Magazine Rules

- Ammunition is spent only when a new projectile actually spawns. Interrupted
  startup, charging, shielding, reflection and redirection spend no ammunition.
- The last shot starts one simulation-time countdown: Wizard 1.1 seconds
  (66 ticks at 60Hz), Archer 1.4 seconds (84 ticks). Other actions and hitstop do not restart
  or pause it; an actual paused match/countdown does not advance simulation.
- While empty, releasing Punch uses the existing close-range melee hitbox and
  authored Seeker attack. Existing recovery and defensive-state restrictions
  still apply. If reload completes while Punch is held, its later release can
  shoot normally. There is no automatic shot on reload completion.
- Respawns/round resets restore the normal full magazine. Grounding, successful
  hits, Kickoffs, ricochets and reflections never refill ammunition.
- Both fighters use the supplied Seeker PRO CastBig_Loop animation. Hurt,
  attacks, shields, dashes and wall states may interrupt the pose without changing
  the reload clock. No new animation artwork or dependency was introduced.

## Pressure And Defense

Consecutive managed projectile hits/blocks on the same defender share a one-second
pressure chain across owners, including reflected shots. Stun/hitstop multipliers
are 1, .78, .56, .34, .12, then zero from the sixth contact. Existing combo staling
also remains. One second without these contacts resets the chain. At saturation,
shots still damage and knock back but no longer cancel a pending action or active
melee, preventing repeated projectiles from indefinitely refreshing control loss.
Parries, dodges and ordinary misses do not increase pressure. Melee Punch and
Kickoff blockstun are unchanged. Projectile damage/knockback and normal chip rules
are retained; shield damage uses the projectile's own multiplier, not a reflector's
unrelated melee shield-breaking property. No new immunity state or HUD meter.

## Ownership And Lifetime

Original creator arrays and stable attack IDs are retained. Current-owner caps
count every live controlled shot across those arrays, including reflected legacy
shots. Reflection into Gun Man/Archer enforces 3/5 immediately; other fighters are
bounded to six controlled reflected projectiles. Excess removes the oldest by
original spawn order, not most recent reflection/Kickoff generation.

Reflection halves remaining life without resetting it. Double-reflection clashes
apply the same rule to both shots. Repeated reflections compound the reduction.
Kickoffs and same-owner ricochets do not incur this penalty or extend lifetime.
Their existing separation/cooldown, single-event refunds and generations remain.
Friendly-fire eligibility and sports contacts continue through existing handlers.

## Presentation

Only character-mounted pips show ammo. They track the current sprite's transformed
bounds (limiting transparent frame padding), remain upright, and use fixed screen-readable pixel sizes. Empty reload
pips pulse progressively, but all become filled together only when the timer ends.
No ammo is added to health/resource HUDs. Dead/respawning fighters have no pips.

Three small pixel trail samples identify current ownership: team color in teams,
player color in FFA, with a player-color accent to distinguish teammates. Authored
arrow and spell shapes remain distinct. Colors resolve from current ownership on
each draw. Free projectiles draw independently of the creator's visible body, so
a living controller's reflected shot cannot become invisible when its creator is KO'd.
Presentation does not change simulation or hitboxes.

## Validation

See tests/projectile-magazine.test.js and tests/projectile-magazine.browser.test.js.
The existing projectile, shield, sports, core parity and rollback suites are also
used. Historical fixtures are retained, not regenerated. Physical controller feel
and competitive tuning remain human playtest tasks. No Git repository is present;
the pre-patch checkpoint is under artifacts/projectile-rework/checkpoints.

## Reload Tuning Update

Wizard's reload is now 1.1 seconds and Archer's is 1.4 seconds. Each fighter's
`projectileConfig.reloadTime` drives the automatic reload, conjuring frame and
pip progress. Magazine sizes, firing cadence, damage, projectiles and other
actions are unchanged. Both online peers require the new reload build. No
historical replay fixtures are regenerated for this requested balance change.

Validated reload update: all eight magazine groups pass, including 66/84-tick
completion, uninterrupted clocks, separate pip progress, snapshots and delayed
rollback across eight Versus/sports configurations. Core/full parity passes
3,390 frames and eleven replay restores. Chrome verifies both conjuring poses,
halfway pips, inverted orientations, controller aliases, movement/melee during
reload, reflection colors and ten projectile fighters with no runtime errors.
Real Gun Man/Archer WebRTC 1v1 passes matching hashes, delayed/jittered/lossy
inputs, rematch, pause and disconnect. Offline loading and ZIP integrity pass.
The browser fixture now waits for the round countdown and keeps its target
inside the arena; no gameplay rules were changed to accommodate it.

Core-only build: `exports/Dash-Punch-Reloads-2026-11-14.zip` (7,663,553 bytes),
also running at `http://localhost:8085`. Full-roster selection is preserved.
Source checkpoint: `exports/pre-reload-tuning-source-2026-11-14.zip`.

## Historical Verification

- Eight focused magazine/balance groups passed, including the exact 108-tick
  reload, interruption, saturation, cap transfer, compounded reflection decay,
  no ammunition farming, upright indicators, snapshots and delayed rollback in
  Versus and every sports arena/ruleset.
- Existing projectile rework: 21 groups; the other 27 fighters retain their data
  and 3,240 historical frame hashes. Projectile parry, double reflection/camera,
  hit interruption, shield pressure and authoritative online-state suites passed.
- Sports: Dashball 29, Golden Rush 25, Target Break 24, Sandbag 16, shared sports
  polish 6 and sports update 7 groups passed. Their existing mechanics remain.
- Full rollback: 6,960 independent frames, 1,047 corrections, depth up to eight;
  rematch and packet-drop stress passed. No historical baselines were replaced.
- Exact core/full parity: 2,040 frames, 11 replay restores and both ten-fighter
  arenas. Core packages retain 13 fighters/11 combat stages plus all sports arenas.
- Final package: 75 runtime PNGs decoded, including 23 deduplicated embedded
  sprite sheets. Offline-file play, virtual-controller joining, ten fighters,
  Gun Man/Archer WebRTC with 50ms delay/15ms jitter/5% loss, matching frame hashes,
  pause/rematch/disconnect and zero missing assets passed.
- Chrome magazine checks cover real Gamepad API polling with a virtual pad,
  aliased Punch holds, simultaneous Dash/Punch while reloading, both casting
  poses, gravity orientations, ten independent indicators at 980/1440-wide
  windows, current reflection colors and render-state purity.
- Ten projectile-fighter sample: 16.7ms median, 16.8ms p95, zero frames over 25ms
  in 180 samples, peak 19 live shots in the final run (16 in the earlier sample). This is a local sample, not a guarantee for
  other computers. Screenshots and browser reports: artifacts/projectile-magazine.

No systems were intentionally deferred. Physical controller comfort and
competitive balance still need human playtesting; automated gamepad polling
does not substitute for holding an actual controller.
