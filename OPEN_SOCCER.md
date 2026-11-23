# Open Arena Soccer

## Implemented Stages

- Soccer - Open Arena (`standard-open`), immediately after Soccer.
- Gravity Flip Soccer - Open Arena (`gravity-soccer-open`), immediately after
  Gravity Flip Soccer (`gravity-soccer`).

Both support existing Court/Battle settings, local 1v1 through 5v5, humans/CPUs,
existing private online 1v1, Soccer scoring, timers, respawns, resets and rematches.
Play > Dashball > Choose Fighters > Choose Stage. Online uses the same pool.

### Missing Third Base

There is no separate Gravity Soccer sport in this checkout. `gravitySoccer`
and the abbreviated HUD text "Gravity Soccer" both refer to Gravity Flip Soccer:
the physical central switch reverses shared vertical gravity, while goals move
between floor and ceiling. The registry, implementation, documentation and tests
agree on this. No different third gravity behavior or fake stage was invented.
Clarification was requested; a separate Gravity Soccer - Open Arena remains
unimplemented until its distinct intended behavior is specified.

## Shared Rules

The open variants are small geometry/presentation extensions of their actual
bases, not copies of Soccer simulation. Normal goal dimensions, ball coefficients,
fighter data, input, attacks, projectile magazines/lifetimes and sport settings
are unchanged. Original stages retain their original boundaries and camera.

Only full-height side walls and the full-width roof are removed. Existing goal
frames and floor remain physical; no replacement wall or hidden ceiling is added.
In the normal Soccer variant the side boundary formerly also backed the net;
removing it opens the route behind that net, without changing the goal line or
valid scoring direction. Flip's explicit moving goal backs/bars remain intact.

### Horizontal Seam

An object wraps only when its complete collider exits: center less than minus
its half-width/radius, or greater than arena width plus that extent. The period
is exactly arena width for every object, including large overshoots. Velocity,
gravity, hitstun, attack identity, ammo, ownership and resources are retained.
Prior movement positions shift by the same amount. Wrapping clears partial ball
goal entry rather than sweeping across the whole field.

Periodic references cover fighter bodies, melee/clashes/Kickoffs, ball attacks,
shields, floor contact and projectile paths. Projectile paths are short translated
copies, not a cross-field ray. Hit generations/target sets remain the source of
single-contact registration. Spike possession stays singular across seams.
Native sprite/ball copies and small matching side arrows provide visual continuity.
Court fighters still cannot wrap out of their assigned half; the ball can.

### Open Top And Recovery

With downward gravity, nothing teleports at the upper boundary. Existing gravity,
drag, speed caps and finite projectile lifetimes apply, so ballistic objects return
naturally. No downward impulse, roof bounce or resource bonus is introduced.

With inverted gravity in the open Flip variant, an object whose entire collider
is above Y=-2400 returns to clear air at the same X and with exactly the same
velocity. Candidate center heights start at Y420 and advance in 120-unit steps
when necessary to avoid actual terrain, moving goal volumes, the switch, fighters
and the ball. This keeps the return visible and avoids embedded objects.

The return simulation step is non-contact: no melee/projectile/ball hit, switch
activation, goal, landing refill or new attack is produced. Existing attack and
electric-latch state pause for that step, not cancel. Projectile lifetime still
decreases. Captured balls follow their carrier and share the return guard. Normal
interaction resumes on the next step. If gravity has already reversed down while
an object is high, it continues its natural return instead of being teleported.

The entity's `upperRecoveryAt` uses existing deterministic simulation time
(`stageTime` in the fighter adapter), already included in snapshots. It is not
wall-clock based. No additional gravity state, special control or physics engine
exists. The original Flip cooldown and original Gravity Flip Soccer are unchanged.

## Camera And AI

Both cameras stay upright and fixed at their base framing: Soccer 0.38 zoom,
Flip 0.30, 160-unit HUD header. They never chase high objects or zoom out to fit
the recovery region. Fighter indicators keep actual team colors; BALL is neutral.
Top labels are separated so ten overlapping flyers do not produce one unreadable
label. Scene clipping keeps sprites/effects out of the scoreboard. Open Flip's
gravity indicator is offset away from Pause.

Battle AI uses nearest periodic ball positions and leads ballistic seam travel.
It estimates high downward returns and inverted recovery locations, and clears
a ball back toward the field if it is behind the target goal. Flip reuses its
existing switch decisions and moving-goal prediction. Court AI uses non-wrapped
targets and its existing half-field clamp. All decisions use native inputs;
environmental recovery applies equally to human and AI fighters.

## Verification And Limitations

`tests/open-soccer.test.js` covers adjacency/base parity, full-exit seams,
history/velocity/resource preservation, goals/own goals, roof-free flight,
inverted recovery, offscreen reversal, switch deduplication/moving goals, Spike,
seam shields/melee/projectiles, magazines, AI routes, Court/Battle, KOs, camera/
markers, local 1v1/3v3/5v5, snapshots/replay, delayed rollback and 30/60/120 Hz.
Its immutable pre-change capture contains 3,600 frames across every prior sport,
strategic AI, Sandbag and Versus. No historical fixture was regenerated.

Browser checks include 1920x1080, 1280x720 and 980x720, ten fighters, nominal/high/
recovery scenes, visible goals, fixed camera and loaded art. Tests use keyboard
and virtual gamepad input; physical-controller feel is not claimed.
Artifacts are in `artifacts/open-soccer/`.

Human playtesting is needed for inversion/recovery cadence, high-ball reads and
wrap flanking. Recovery is intentionally a visible discontinuity far above the
field, never an invisible roof. No new missing art or dependency is required.
The known pre-existing Rain/Orbit historical fixture discrepancy is preserved,
not treated as a new regression. The distinct third requested gravity sport is
the unresolved scope item described above.

No Git repository exists. Pre-change checkpoint:
`exports/checkpoint-before-open-soccer-2026-11-13.zip`. The frozen capture source
was copied before edits; previous packages and the full checkout are retained.
Core export continues to omit experimental/development-only content.

## Changed Files

`dashball.js`, `game.js`, `package.json`, `tools/build-core-release.cjs`,
`tests/dashball.test.js`, `tests/core-release.test.js`; new open Soccer unit,
browser, online and pre-change data files; `DASHBALL.md`, this report, patch notes
and generated release/pointer. No sprite asset or fighter balance file changed.
