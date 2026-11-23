# Dashball: Target Break

## Play

Open the running game at <http://localhost:8081/?v=target-break>.
Choose **Play > Dashball**, set **Court** or **Battle** and team size, then
**Choose Fighters > Choose Stage > Target Break > Start Dashball**.
Use the existing direction, Dash and Punch controls. CPUs are supported.
The separate Dashball stage pool now has Soccer, Basketball, Wrap Around
Basketball, Target Break and Golden Rush; standard stages remain separate.

Local play supports 1v1 through 5v5. Existing private rollback online play remains
1v1, not ten-player networking. Both online players need this build. This local
URL is for this computer; it is not a public hosting address.

## Rules And Tuning

- Six targets per team in one mirrored, widely spaced vertical column on each
  back wall, following the final layout revision rather than the earlier grid.
- Only a physical ball impact destroys a target. Default minimum closing speed
  along the collision normal is **300 world units/second**, configurable in
  Dashball settings after selecting Target Break. Damage values do not decide it.
- A slow or grazing contact rebounds. A valid break removes collision immediately
  and retains 94% ball velocity. Distinct targets can break in one continuous
  trajectory, but a single horizontal shot cannot wipe a vertical column.
- Each break gives the opposing side of that target one point, regardless of
  last touch. No target health, duplicate scoring or points for fighter KOs.
- First to six wins immediately. A timed leader wins; a tie always enters sudden
  death, regardless of the goal-level overtime toggle. No targets are restored.
- The ball and fighters stay in play after each break. Invalid/out-of-bounds
  ball state recovers at midfield. A genuinely overlapping, stationary trapped
  ball recovers after four seconds. Ordinary stationary loose balls do not reset.
- Court retains the existing own-half restriction and no PvP. Battle retains
  existing damage, reduced health, respawn and spawn protection settings.
- Existing Punch, projectile, Kickoff, shield and resource interactions are
  reused. Spike can capture and charged-launch the ball, but possession cannot
  destroy targets. Shields and bodies resolve before ball-target collisions.
- Results show winner, both destruction scores, remaining targets and active
  match duration. Rematch resets objectives, ball, clock, fighters and resources;
  character/team/settings choices persist. Dashball Menu and Main Menu are exits.

## Geometry And Presentation

The new arena is **2560 x 1340**, with a continuous floor at **1180**, a roof
and back walls. Target radius is 48; centers are at x=72/2488 and
y=108,309,510,714,915,1116. The smallest vertical separation is 201 units.
There are no new platforms or movement abilities. All 29 currently installed
fighters can reach the top-target ball-contact height with their existing full
super jump; Chungus determined the height adjustment. Other arenas and character
movement are unchanged. Targets act as horizontal wall faces for fighters, not
standing platforms or inaccessible interior pockets. Destroyed faces disappear.

Original pixel-art bullseyes use a 512 x 128 sheet: eight 64-pixel frames in
each team's row, drawn at integer 3x scale with nearest-neighbor sampling.
The 32-pixel bullseye inside each frame has transparent space for fracture and
scattering fragments. Flash, crack and debris last 350 ms and reuse the existing
sprite-effect system. Camera shake and existing impact audio are subtle.
No debris collision, damage, new gameplay hitstop or new dependencies were added.
Results wait briefly for the final cosmetic break to remain visible, but victory
itself is immediate and online input exchange continues.

Full arena and fracture captures:

![Target Break arena](artifacts/target-break/full-arena.png)
![Target fracture](artifacts/target-break/fracture.png)

## Simulation And AI

Target layout, collision, one-hit state, scoring, overtime, recovery and shot
planning are extensions of the existing browser-independent `dashball.js` module.
Normal ball physics and character controllers are not duplicated. Plain target
state, event serials, scores, timers, recovery, possession and respawns use the
existing snapshot/rollback serialization. Cosmetic fragments remain presentation
state and do not enter authoritative hashes.

Target-aware CPUs select only intact enemy targets, estimate character-specific
shot arcs and simple floor/ceiling banks, approach useful striking positions,
intercept threats and assign the nearest teammate to cover an endangered target.
They use existing movement, Punch/Dash input and Spike possession; no new controls
or separate AI engine are introduced.

## Validation

- **24 Target Break groups passed:** mirrored layout, every target reachable by
  ball contact, low-speed rejection, normal-relative threshold, own targets,
  continuous chains, no duplicate scoring, collision removal, no carried-ball
  score, six-break/timed/overtime victories, safe recovery, fighter walls/cling,
  Court PvP rejection, Battle combat/respawns, clean rematches, all-fighter upper
  access, shield interception, presentation purity, target-aware AI, Spike shot
  planning, authoritative snapshot restoration, 1v1/5v5 independent replay and
  six-frame-delayed rollback. Independent ten-CPU simulations also match hashes.
- Browser tests passed controller stage selection, the separate Dashball pool,
  loaded crisp pixel art, all twelve targets visible at 1440 x 1000 and
  980 x 720 window sizes, results and rematch. Repeated
  ten-CPU samples on this Mac: median **16.7 ms**, p95 **16.8 ms**, **0/180** frames
  over 25 ms for both Court and Battle. A short local sample, not a hardware promise.
- Real WebRTC Court and Battle tests passed with 50 ms artificial one-way delay,
  15 ms jitter and 5% loss: matching confirmed hashes, unique destruction events,
  six-target/timed victories, Battle respawn and rematch without deadlock.
- **29 existing Dashball groups passed**, retaining all six goal-level/ruleset
  combinations. Goal-level browser tests also passed with ten fighters and no
  browser errors. Existing goal art, collision and stage pool behavior remain.
- Existing hit interruption, Spike, projectile parries, Micro USB, DefiPlate,
  Chase, shield pressure and online-state tests passed. The 1,440-frame canonical
  combat baseline is unchanged. Core export validation passed 1,170 unchanged
  frames and eleven replays; the target artwork is included automatically.
- The full existing rollback suite passed **6,600 independent simulation frames**
  and **1,047 rollbacks**, depth up to eight, plus 480 gameplay packets with 20
  simulated drops and rematch. No baselines were regenerated to conceal changes.

Commands: `npm run test:target-break`, `npm run test:target-break-browser`,
`npm run test:target-break-online`; browser tests require Playwright and Chrome.

## Limits And Follow-Ups

- AI is playable but heuristic, not an expert coordinated team. Hardest remaining
  bank shots and defensive role choices will benefit from human playtesting.
- Physical controllers and separate computers/home networks were not exercised.
  Virtual controller navigation and two isolated browser players were tested.
- Sandbag Showdown was not found in this project, so there was no existing
  Sandbag implementation to modify or test. No Versus round/scoring change was
  made. Experimental content and previous ZIP exports were not removed.
- The folder is not a Git repository. Recoverable phase archives, rather than
  claimed Git commits, are under `artifacts/target-break/checkpoints/`.
  The final tested patch is `phase-5-validated.tar.gz`. Archives contain changed
  files, not a second full copy of the game's unchanged licensed assets.

## Changed Files

- `dashball.js`, `game.js`, `styles.css`: target rules, arena, native integrations,
  AI, menus, HUD, results and presentation.
- `assets/dashball/targets.png`, `tools/build-target-art.cjs`,
  `tools/pixel-png.cjs`: reproducible original target sprite sheet.
- `tests/target-break.test.js`, `tests/target-break.browser.test.js`,
  `tests/target-break-online.browser.test.js`: targeted validation.
- `tests/dashball.test.js`, `tests/dashball.browser.test.js`: roster-aware stage
  pool expectations; existing six-combination regressions remain.
- `package.json`, `README.md`, `DASHBALL.md`, `TARGET_BREAK.md`: test commands,
  play instructions and implementation notes. In-game patch notes are in `game.js`.
