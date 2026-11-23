# Golden Rush - Four-Way Gravity

Select **Play > Dashball > Choose Fighters > Choose Stage**, then choose
**Golden Rush - Four-Way Gravity**, beside Golden Rush. It is Battle-only,
supports local 1v1 through 5v5 and the existing private WebRTC 1v1 limit.

## Rules and Controls

Hit the central physical switch with a normal Punch or projectile. Distinct hits
cycle **Down > Left > Up > Right > Down** with no switch cooldown. Persistent
overlap from one attack cannot keep switching. Projectiles use the established
switch-consumption rules. Gravity changes acceleration, not current velocity.

All four outer boundaries are solid. Land on the gravity-facing surface, then
walk using normal input: left/right on floor or ceiling, up/down on a side wall.
Normal charged jumps and dashes launch away from that surface. No new buttons,
movement buffs or fighter data changes.

The seven original platforms, six hoops and Golden Rush settings are reused.
Ten scoring balls by default (1-12 configurable), hoops worth 1/3/5, 48-HP golden
target worth 15, 20-second golden respawn, default winning score 100. Existing
timers, first-to-two rounds, sports health and individual respawns remain.
Ordinary wrapping Golden Rush is unchanged.

Balls use shared gravity in both axes. The autonomous golden target still flies;
while stunned it falls along current gravity and retains combo momentum. Ball
recoil and fighter knockdown use the new map's gravity. Respawns use separated
team lanes on the current gravity-facing boundary without resetting objectives.

## Implementation

- `dashball.js`: reuses Golden Rush's arena, objects, scoring and shot planner.
  Adds enclosed geometry and gravity-aware ball/stunned-target acceleration.
  Shot prediction includes horizontal and reversed vertical acceleration only
  for the new map.
- `game.js`: reuses `stageGravityAxis` / `stageGravitySign` and the original
  four-way cycle. Vertical sports retain their axis lock. Existing simulation
  stage IDs stay unchanged: the new stage is appended internally but sorted
  beside Golden Rush in local and online selection.
- `sports-guide.js`: actual-renderer preview and stage-specific description.
- Core exports record `stageOrder`, preserving older Sandbag replay IDs.

AI uses ordinary inputs, gravity-aware jumps and shot prediction, and periodically
assigns a nearby teammate to contest the switch. Shot plans refresh when gravity
changes. No AI-only forces or scoring.

Camera: upright, fixed full-arena view, 2800x2400 at 0.22 zoom with a 192-unit
HUD header. Human TV playtests should confirm sprite readability and whether
this full view needs closer framing.

## Verification

`node tests/gravity-rush.test.js` covers switch cycles/contact deduplication,
projectile consumption, velocity preservation, all fourteen fighters walking
both ways on all four surfaces, jumps, scoring, respawns, snapshots, replay,
delayed rollback, frame-rate equivalence and ten-CPU stability. Existing fighters
and sports are compared with the preceding release.

Browser checks cover selection/settings, real keyboard walking, four-direction
screenshots at 1280x720 and 1920x1080, ten CPUs, offline loading and supported
WebRTC 1v1. Automated checks do not verify physical controller feel.

The checkpoint is `artifacts/gravity-rush-before-2026-11-15.zip`; this source
folder is not a Git repository. Historical replay fixtures are not regenerated.

The old sports-guide pre-preview comparison still diverges at Basketball frame
58: BackOut release `e9a2222e`, preceding own-goal release and this update both
`89f03841`. This predates the new map; the old reference is left intact. The
focused prior-release comparisons cover the current authorized gameplay.

The final Chrome run measured 16.7 ms median / 16.8 ms p95 over 240 rAF intervals
with ten CPUs, ten balls and up to two projectiles (software/headless benchmark,
not a hardware guarantee). A 30-second simulation activated the switch and
reached 101 points for one team. Sideways gravity can feed hoops quickly, so
switch influence and scoring pace need human balance playtests. AI switch
strategy is opportunistic rather than a coordinated team plan.
