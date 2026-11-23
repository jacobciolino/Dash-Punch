# Dashball

## Play

Choose **Play > Dashball** (Battle by default), set Court/Battle, then choose fighters in the existing
lobby. Assign humans or CPUs and ready the human seats. **Choose Stage** opens
Dashball's separate level pool, in this order: **Soccer**, **Soccer - Open Arena**, **Basketball**,
**Wrap Around Basketball**, **Target Break**, **Golden Rush**, **Gravity Flip Soccer**, **Gravity Flip Soccer - Open Arena**,
**Boulder Control**, **Gravity Flip Boulder Control**, **Total Rush**, **Field Goal**,
**Target Charge - Stationary**, **Target Charge - Vertical**, **Target Charge - Roaming**. **Start Dashball** loads both teams and the full field
before the countdown. Standard Dash Punch stages never appear in this pool, and
Dashball levels never appear in the standard pool.
Controls remain direction, Dash and Punch. Pause, remapping and controller
ownership use the existing systems. Experimental fighters remain available.

**Online 1v1** on the Dashball setup screen opens the same stage picker before
hosting or joining. Guests can join
through the ordinary Online menu; the host's mode is shown before readying. Both
players need this build. Ten-player networking is not implemented: local play is
up to 5v5, existing rollback online play is 1v1.

## Rules

- Target Charge has three Battle-only target-motion stages. Two permanently
  team-owned balls charge square meters by hitting one shared neutral target.
  Harder relative normal impacts earn more charge, including rebounds and
  opponent-assisted hits. Default target 100%; local 5v5 and online 1v1.
  See [TARGET_CHARGE.md](TARGET_CHARGE.md).

- Soccer and Gravity Flip Soccer have Open Arena variants immediately after
  their originals. Full exits wrap horizontally with momentum and state intact;
  the ceiling is genuinely absent. Camera remains fixed with top-edge player/
  ball indicators. Court retains its existing half-field restrictions. Under
  inverted gravity only, fully escaped objects beyond Y=-2400 return to clear
  air without a contact/scoring/resource event. See [OPEN_SOCCER.md](OPEN_SOCCER.md).

- Field Goal supports Court and Battle with the same Soccer ball and match flow.
  Elevated physical football uprights replace the old soccer goals. Lofted
  field-side shots score one point after the complete ball crosses the vertical
  plane above the crossbar, within the projected inner opening. Solid keeper
  perches are reachable with existing movement. See [FIELD_GOAL.md](FIELD_GOAL.md).

- Total Rush is Battle-only with mandatory friendly fire. Boulder territory
  (0.5/1 per second by default), opposing elevated rings (5/10) and the 144-HP golden target
  (30) contribute to one score. First to 300; target respawns after 45 seconds.
  Three small balls physically collide with the boulder. KOs give zero points.
  Existing individual respawns do not reset any objectives. See
  [TOTAL_RUSH.md](TOTAL_RUSH.md) for simultaneous scoring and physics details.
  Objective awards, golden HP/respawn and small-ball count are adjustable in
  Total Rush Settings, with Balanced, Original and Custom presets. At least
  one scoring source must be enabled. Other sports keep their own values.

- Court keeps the entire fighter collider on its own half. Fighter attacks,
  clashes, damage, Kickoffs and body knockback against other fighters are
  disabled; the ball is unrestricted. There are no eliminations.
- Boulder Control is Battle-only. Keep the heavy boulder in your own Blue-left
  or Red-right scoring zone for 1 point/second, or 2 when its center is above the
  zone platform. First to 100 wins. All fighters and the boulder wrap horizontally.
  No goals or scoring resets. See [BOULDER_CONTROL.md](BOULDER_CONTROL.md).
- Gravity Flip Boulder Control is also Battle-only. The shared Flip switch
  reverses acceleration without changing momentum. Both bounded scoring windows
  follow their moving bonus platforms continuously; the neutral perch moves too.
  A center inside its own zone earns 1/s, or 2/s on the side away from gravity.
  Zones remain active in transit. First to 100; regular Boulder Control is
  unchanged. See [GRAVITY_BOULDER.md](GRAVITY_BOULDER.md).
- Battle keeps normal combat and friendly-fire settings. Default match health
  is 50% of each character's normal maximum, without changing character data.
  Eliminated fighters respawn on their own side after 15 seconds (10/15/20
  choices), with 2 seconds of protection. An executed Punch or Dash ends it early.
  These Battle settings are shared with Sandbag Showdown in `sports.js`.
- Soccer goals have midfield-facing openings 432 units tall: 2.8 times
  Chungus's 154-unit standing collider. The complete ball must cross the line
  after entering the opening. Crossbars, back walls and floor are solid.
- Basketball baskets score only a complete downward entry through the top.
  Walls and bottom collide with the ball. Fighters pass through the interior,
  bottom and rims, but can cling/slide on exterior vertical faces.
- Own goals in Soccer and Basketball award the point to the opponent of the
  defending goal, regardless of the ball's last toucher. Shield rebounds,
  Kickoff nudges and actual moving-body dribbles are swept through the same
  scoring opening, with intervening solid terrain checked first. This fixes a
  ball being pushed beyond the line/top without registering entry. Spike
  possession, rear entry, wrapping, terrain correction and stationary body
  overlap repair cannot manufacture a score. Includes gravity/open variants;
  no ball ownership, impulse or fighter balance changes.
- Gravity Flip Soccer uses the original physical Flip switch, without a cooldown
  between distinct hits. Gravity reverses fighter/ball/goal acceleration, not
  velocity. Both 75%-height goals accelerate between floor and ceiling and remain
  live while traveling. Court and Battle are supported. See
  [GRAVITY_SOCCER.md](GRAVITY_SOCCER.md) for tuning and scoring rules.
- Wrap Around Basketball uses the same baskets, floor and moving platform,
  without boundary walls or a ceiling. The ball wraps through both horizontal
  sides with its momentum intact; Battle fighters and projectiles wrap too.
  Court fighters remain in their own half, including at the outer sideline.
  Neither the ball nor fighters wrap vertically. The camera stays wide during
  ordinary play and includes high ball/fighter movement above the old ceiling.
- The centered platform moves vertically on the simulation clock. Exact frame
  displacement carries riders; ball bounces use platform-relative velocity.
- Goal-level defaults: 3-minute active-play timer, first to 5, tied timer enters sudden
  death. Sudden death can be disabled for a timed draw. Goal celebration freezes
  play for 1.2 seconds, resets ball and fighters, then counts down for 2 seconds.
  Scores and settings survive rematches as configuration; a rematch resets score.
- Target Break replaces goals with six targets in a vertical column on each back
  wall. Ball impacts of at least 300 units/second toward a target break it once;
  own-target breaks benefit the opponent. First to six wins, a timed leader wins,
  and tied time always enters sudden death with existing destruction preserved.
  No ball or fighter reset follows a break. Both Court and Battle work. See
  [TARGET_BREAK.md](TARGET_BREAK.md) for collision, AI, art and validation details.
- Golden Rush is always Battle with friendly fire. Three independent small balls
  score through each team's low/middle/high rings for 1/3/5 points. The golden
  flying target has 48 shared health; its final damaging hit awards 15 points before
  a 20-second respawn. First to 100 wins. Only the scoring ball resets. Fighters
  use 50% health, a 15-second default respawn (10/15/20 choices), and 2-second
  protection ending on Punch or an executed Dash. Other modes retain their prior
  health/respawn settings. See [GOLDEN_RUSH.md](GOLDEN_RUSH.md).

## Ball Interactions

- Punches use existing active hitboxes, charge, launch direction and character
  strength. Successful ball hits use the normal confirm/refill/recovery hooks.
  Ranged shots are consumed on ball impact. A discrete reward cooldown prevents
  overlapping attacks from repeatedly refilling resources in the same instant.
- Existing aerial Dash contact can Kickoff the ball: it launches the ball,
  rebounds the attacker and returns one air dash, capped at the normal maximum.
  Existing recoil/carry/lockout tuning and Fired Up gain are reused; the ball
  does not grant the attacker a defender-only combo-breaker recharge.
  Punch pursuit is not treated as a new Kickoff.
- Body contact gently dribbles; ground dash speed is capped out of dribble
  strength. Continuous rolling/body contact never grants resources.
- Directional shields deflect safely without damage or ball knockdown. A launched
  ball above 650 units/second can knock down an unguarded opposing fighter;
  the recoil is deliberately slow. Friendly fire follows the Battle setting.
- Spike's normal active shield captures the ball at its outside edge. Captured
  balls cannot score or generate repeated rewards. Expiration, fizzle, damage
  or cancellation immediately drops possession, with a short recapture lockout.
  A real charged shield-release Punch launches it at 1.35x normal shot strength
  when the authored attack becomes active, not when the button is released.

## Implementation

`dashball.js` is a browser-independent deterministic module: settings, arena
geometry, ball state, collision, scoring, possession and match clocks. `game.js`
adapts existing fighter/input/attack/shield/resource/AI hooks and renders the
minimal courts and HUD. Only the new mode takes the new branches. Existing
stage order, geometry, characters and combat tuning are not replaced.

Ball state, possession, scoring phase, cooldowns and respawns are included in
simulation snapshots. Online configuration/signatures include Dashball settings.
Online results wait for confirmed state; input exchange continues on the result
screen so finishing a match does not deadlock rematching.

Tunables live in `Dashball.DEFAULTS` and sanitized `options()`. The field is
2560 x 1440 on goal levels, floor at 1280; ordinary zoom is 0.38. Target Break
uses 2560 x 1340 with its floor at 1180, allowing Chungus's existing super jump to
reach the top-target ball-contact height. The wrap level can zoom out to
0.12 and follow upward without changing simulation. Ball radius is 24, gravity 1050,
speed cap 2050, bounce 0.73. Collision microsteps cap travel per step and test
the complete ball against valid goal entry. Moving platform defaults: width
360, total travel 400, sine speed 0.75 radians/second (8.38-second period).

`Dashball.ARENAS` is the ordered level registry. Future Dashball arena IDs and
geometry belong there; its entries populate the same separate stage picker,
online configuration and core-release manifest. Stable internal IDs `standard`
and `elevated` are retained; the wrapping level uses `elevated-open` and the
target objective uses `target-break`.
Wrap collisions use the nearest periodic ball position, and wrapping preserves
local motion history so no false swept contact crosses the entire field.
Possession remains collision-free even on its initial capture frame.

The authored ball is a 16 x 16, five-color pixel sprite with four integer-grid
quarter-turn frames, drawn at 3x nearest-neighbor scale and centered on its
collider. `tools/build-dashball-art.cjs` contains the authored pixels; it writes
`assets/dashball/ball.png`. It does not resample or rotate art at runtime. The
Seeker PRO source animation sheets are 30 x 30, with the same 3x gameplay pixel
scale. This ball is original project artwork; existing Seeker licenses remain
unchanged. No new dependency, environment pack or physics engine was added.

## Verification

- `tests/dashball.test.js`: 29 groups covering the three goal levels/both rulesets, full-ball
  goal entry, crossbars/behind/side/bottom rejection, velocity cap, dribble,
  shields, resource events, real melee/projectile/Kickoff confirms, Spike
  capture/fizzle/charged release, Court boundaries, Battle respawns, moving
  platform carrying/reversal, ball-platform relative bounce, exterior cling,
  timer/overtime/draw, 1v1/5v5 independent simulation and save/replay, and
  deterministic ten-CPU decisions across all six combinations; side wraps,
  floor-seam rolling, periodic attack/shield/projectile contact and open-top framing.
- `tests/target-break.test.js`: 24 groups for targets, Court/Battle, all-fighter
  height access, AI, interception, score, recovery, snapshots and rollback.
  Target Break browser and real-WebRTC tests additionally check stage selection,
  target art, framing, ten-player performance, results and online rematches.
- `tests/golden-rush.test.js`: 25 groups for multiball, rings, golden captures,
  shared health/respawns, forced friendly fire, platform access, snapshots and
  rollback. Browser/real-WebRTC suites cover menus, art, camera, results,
  rematches and ten-player performance. See the dedicated report for details.
- Late-input rollback tests recover scoring, possession, respawn and wrap scenarios
  after six-frame delayed inputs, with exact final-state hashes.
- Browser tests run all six combinations with ten CPU fighters, verify sharp
  loaded ball art, framing, render purity, smaller-window layout, separate stage
  pools and virtual host-controller selection without accidental match starts.
  Clean full-stage and high-altitude captures are in
  `artifacts/dashball/`.
- Real WebRTC tests run all six combinations at 50 ms delay, 15 ms jitter and
  5% packet loss with matching confirmed hashes; timed completion/rematch passes.
- Existing standard online pause/rematch/disconnect coverage is retained. The
  full rollback suite passes 6,600 independent frames and 1,047 rollbacks,
  depth up to 8, after Target Break was added.
- The existing 1,440-frame pre-visual-cleanup combat baseline matches exactly.
  Orbit, shielding, Spike, Chase, projectile reflection, electric multihits,
  hit interruption, gravity rendering, hurt alignment, DefiPlate and ten-player
  team arena regressions pass without baseline replacement.
- Ten-CPU browser frame pacing: median 16.7 ms, p95 16.8 ms, 0/180 frames over
  25 ms on this machine. This is a short local sample, not a hardware guarantee.

## Limitations

- Goal-level AI is deterministic and can chase, shoot, defend and use Spike possession;
  it does not yet coordinate striker/goalkeeper roles or plan advanced bank shots.
- Target Break adds intact-target shot/bank estimates and a closest-defender
  assignment. These are deterministic heuristics, not expert team coordination.
- Physical controllers were not exercised; the existing input layer and virtual
  gamepad navigation were tested. Browser Gamepad activation still requires a
  button press and support depends on browser/device mappings.
- The five sports courts intentionally use minimal functional geometry, not the
  textured presentation of standard stages. No new stage artwork is required.
- This folder is not a Git repository, so no Git checkpoint was created.
  Existing ZIP exports were not overwritten.

## Changed Files

- `dashball.js`: pure rules, ball simulation, arena geometry and match state.
- `game.js`, `index.html`, `styles.css`, `server.js`: existing menu, fighter,
  rendering, resource, collision, AI, loading and network integration points.
- `assets/dashball/ball.png`, `tools/build-dashball-art.cjs`: authored ball art
  and its reproducible source pixels.
- `tests/dashball.test.js`, `tests/dashball.browser.test.js`,
  `tests/dashball-online.browser.test.js`: new automated mode coverage.
- `tests/simulation-harness.js`, `package.json`: module loading and test commands.
- `tools/build-core-release.cjs`, `tests/core-release.test.js`: keep the existing
  core exporter compatible with the new runtime file, mode arenas and build ID.
- `README.md`, `DASHBALL.md`: play instructions and implementation report.
