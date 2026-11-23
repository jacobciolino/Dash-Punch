# Gravity Flip Soccer

Play > Dashball > choose Court or Battle > Choose Fighters > Choose Stage >
Gravity Flip Soccer. The same level is available in the online stage picker.
No controls or fighter abilities were added. Local play supports 1v1 through
5v5. Existing private WebRTC rollback remains 1v1, not networked 5v5.

## Shared Systems

The existing `stageGravityAxis` / `stageGravitySign` are the only gravity state.
The original switch handler and successful-hit resource/recovery hooks are
reused. This arena locks the axis to vertical. Distinct melee strikes or shots
flip immediately; an attack/contact generation can activate only once. A new
legitimate contact generation can activate again. Shots are consumed as before.
Ordinary Flip retains its existing half-second switch cooldown and behavior.

Acceleration reverses; current velocity is untouched. Bystanders receive no air
dash refill from a flip. Normal landing, wall, hit and Kickoff refills remain.
Straight projectiles remain straight. Ball knockdowns and wall slides follow
the new arena's vertical gravity. Individual Battle respawns use the appropriate
team-side floor or ceiling and existing health/resources/protection rules.

## Goal Bodies And Scoring

- Arena: 2560 x 1800, continuous floor at Y=1640, solid roof at Y=24.
- Goals: standard Soccer X/depth; default opening height 324 (75% of 432).
- Goal acceleration: 720 units/s^2; maximum travel speed: 620 units/s.
- Ball acceleration: existing Soccer 1050 units/s^2, along shared gravity.
- Fixed upright camera: 0.30 zoom with 160-unit HUD allowance; no screen rotation.
- `Dashball.options`: `goalHeightScale` (0.5-1), `goalGravity` (200-1400),
  `goalMaxSpeed` (200-1000). Goal Height also has a setup-menu control.

Both goals store serializable current/previous Y and velocity. The shared
`goalTransforms` / `goalTerrain` supply simulation, rendering, AI and collision.
Movement runs before fighter physics on the fixed simulation step. Riders use
existing moving-platform displacement; ball collisions use interpolated goal
geometry and relative velocity in bounded collision microsteps.

Each frame has attached top/base rails and a back. Down gravity highlights the
top rail as crossbar; Up highlights the bottom. The other rail becomes the
supporting base. This changes orientation immediately without sweeping a rotating
bar through the ball or detaching the frame. The opening always faces midfield.

An entry arms only when the ball's leading edge crosses from field into a valid
opening. Full trailing-edge crossing awards one goal. Opening bounds are
interpolated at the crossing time relative to the moving goal. Solid-frame hits
and exiting the opening invalidate partial entries. A stationary vertical sweep,
initial overlap, rear approach, or carried ball cannot score.

Goal celebration freezes play; the normal reset/countdown restores down gravity,
floor goals, zero goal velocities, midfield ball and team-side fighters. Individual
respawns do not reset gravity, goals, score or ball. Leaving this mode restores
the destination mode's own setup.

## AI And Presentation

Soccer AI leads the current moving opening and accounts for signed ball gravity.
It reuses existing Punch/Dash inputs, charging vertically away from its grounded
surface when it needs height. A designated teammate occasionally contests a
reachable switch instead of every fighter spamming it. The decision interval
limits AI strategy, not switch activation. Threats near the ball take priority.

The existing switch arrow shows gravity with a short local impact pulse, a small
screen shake and subdued existing audio. HUD reads GRAVITY UP/DOWN. Both goals,
floor, roof and switch remain within the fixed view. Existing soccer ball art,
Seeker animations and neutral court rendering are reused; no new assets loaded.

## Verification

`tests/gravity-soccer.test.js` covers geometry, repeated/deduplicated switch hits,
projectiles, preserved velocity, goal travel/reversal/settling, moving and ceiling
scores, invalid entries, frame collisions, Court/Battle, inverted landing/dash/
wall cling/respawns, resets, AI, snapshots, replay and delayed-input rollback.
`tests/gravity-soccer-before.json` records 720 pre-patch Soccer/Flip frame hashes;
it is not a regenerated gameplay baseline.

Browser tests cover stage selection, ten-fighter floor/transit/ceiling rendering
at 1440- and 980-pixel windows, frame pacing, and real WebRTC Court/Battle peers
with 50 ms delay, 15 ms jitter and 5% packet loss. Results and screenshots go to
`artifacts/gravity-soccer/`. Physical controller feel still needs human playtest.

No Git repository is installed in this folder. The pre-patch checkpoint is
`exports/checkpoint-before-gravity-soccer-2026-11-13.zip`. Existing release folders
are retained; new distribution builds remain core-only.

### Results (2026-11-13)

- 18 new test groups pass, including 30/60/120 Hz fixed-step equivalence, four
  delayed-input rollback scenarios and ten-CPU determinism under inverted gravity.
- 720 recorded regular Soccer/Flip frame hashes remain identical.
- Existing Dashball (29 groups), Target Break (24), Golden Rush (25), Sandbag
  Showdown (16), projectile magazines (8), Kite movement (10), sports update (7),
  shield pressure, gravity rendering and online-state tests pass.
- Existing rollback stress passes 7,080 independent frames, 1,047 corrections
  and maximum rollback depth 8. Core-export parity passes 2,040 frames/11 replays.
- Core Chrome visual checks pass with 10 fighters at 1440 and 980 widths, all
  floor/transit/ceiling scenes, no console errors and no missing assets.
- Measured final ten-CPU Chrome run: median 16.7 ms / p95 16.8 ms; 0 of 180 frames above 25 ms.
  This is a local automated measurement, not a hardware performance guarantee.
- Real WebRTC Court and Battle peers pass with 50 ms delay, 15 ms jitter and 5%
  simulated loss. Both keep matching confirmed hashes through corrections.
- The existing core browser regression also passes all 75 installed PNGs,
  controller join/navigation, ten-fighter Versus, standard WebRTC, pause/rematch/
  disconnect and offline file play. No missing assets were reported.

Remaining playtest work: physical controllers and human balance/shot difficulty.
The zoomed-out full-stage view favors awareness over large fighter sprites. This
mode adds no network-player capacity; ten fighters are local only.
