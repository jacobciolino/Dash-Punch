# Target Charge

## Play

Play > Dashball > Choose Fighters > Choose Stage. Three adjacent core stages:
Target Charge - Stationary, Target Charge - Vertical, Target Charge - Roaming.
Each stage has a **Target Charge Settings** button. Existing minus/plus controls
work with keyboard, controller and mouse. Set the charge target to 50, 75, 100,
150 or 200 percent (default 100), match timer, team size, Battle health and KO
respawn. Battle-only; friendly fire is mandatory. Other sports retain Court.
Local 1v1 through 5v5; private WebRTC remains limited to 1v1.

## Scoring And Physics

Two Soccer-physics balls have permanent `scoringTeam` ownership, separate from
ordinary `ownerTeam` / `ownerId` last-touch and possession metadata. Either team
can strike, shield, capture or redirect either ball. Only its permanent team
receives impact charge. KO events award nothing. Spike uses his existing catch,
fizzle/release and charged-launch rules, without changing permanent ownership.

One neutral, indestructible circle has radius 80. Closing velocity is measured
along the swept contact normal **before** correction/restitution, relative to
the target's actual velocity. Tangential speed does not inflate the award.
The centralized piecewise-linear speed/percent anchors in `target-charge.js`:

| Speed | 0 | 200 | 400 | 600 | 800 | 1000 | 1400 | 1800 | 2200 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Charge | 0 | 1 | 3 | 6 | 10 | 14 | 21 | 27 | 32 |

Above 2200 the award caps at 32 percent. Awards use 60,000 integer units per
percentage point. Small fractional awards are retained; displayed percentages
are truncated to hundredths, never rounded into a premature win.

Contact re-arms only after observed separation greater than one world unit.
There is no scoring cooldown. Spawn overlap, depenetration, duplicate callbacks,
resting contact and separating velocities cannot score. Ball/target resolution
runs before terrain/body correction; those corrections cannot manufacture a
scoring crossing. Both balls accumulate pending awards, then victory resolves
once per fixed step. Higher resulting total wins if both cross the target;
exact equality enters sudden death until a subsequent unequal scoring step.
Over-target totals remain intact. Timer ties also use sudden death.

Arena: 2560 x 1440, floor Y1280, closed sides/ceiling, fixed upright camera.
Ball: radius 24, gravity 900, max speed 2050, restitution 0.84, rolling friction
0.95; ordinary Soccer impulses/shields/resources/projectiles. Equal-mass ball collisions use
relative normal restitution, not repeated impulses on separating contacts.
Bounded shared substeps use the existing ball solver; no new physics engine.
Fighters collide with the target through existing circle/body separation, with
no damage, attack confirmation, automatic landing or resource rewards.

## Motion

- Stationary: center (1280, 700), zero velocity.
- Vertical: Y350-1020, smooth eight-second sine cycle, starting at Y700 with no
  positional jump. Actual displacement supplies collision/scoring velocity.
- Roaming: central 70% of arena width, Y270-1020, acceleration 260, max speed 340.
  Destinations are inset 32 units and reconsidered on arrival or every 3-5
  simulation seconds. Discrete braking protects safe bounds without teleporting.
  Uses the existing seeded gameplay RNG; its state is in the shared core snapshot.

Target state includes previous/current position, velocity, phase, destination
and destination time. Contacts, fixed-point ledgers and permanent ownership are
ordinary sports snapshot data. No independent update loop or wall-clock timer.
Rendering preferences are not part of scoring or motion. Cached native pixel
tints reuse existing Soccer and target sprites; no new artwork/dependencies.

## AI And Presentation

Dynamic deterministic roles allocate own-ball offense, opponent-ball defense
and combat support. Offense reuses the existing native attack/ballistic planner,
leading target motion and rejecting unreachable below-floor approaches; defense
clears predominantly sideways rather than deliberately banking an opponent's
ball from the floor straight into the target overhead.
All movement and attacks use normal fighter inputs. No scripted shots or scores.
Blue and Red balls retain their appearance independently of outline settings.
Square HUD meters show current charge and target, with brief team-colored target
flashes and separate small gain labels for impacts.

## Verification

`tests/target-charge.test.js` covers curve anchors/interpolation, relative speed,
ownership, re-arming/correction, simultaneous wins/ties, all target strategies,
native shots/Spike/projectiles, fighter obstacle safety, AI roles, local sizes,
snapshots/replay/delayed rollback, frame-rate equivalence, KOs and reset.
`tests/target-charge-before.json` preserves 4,440 pre-change gameplay hashes.
Browser and real WebRTC suites are separate. Detailed final results and release
path are recorded in `artifacts/target-charge/` and the delivery report.

Human playtesting is still needed for controller feel, practical rebound routes,
AI team spacing and scoring pace (crowded CPU matches can have long scoreless
rallies). Automated frame pacing is a short headless Chrome
sample, not proof of performance on other computers or ten physical controllers.
