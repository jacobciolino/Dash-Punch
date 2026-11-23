# Icer - The Cold Front

Core fighter 20, using the licensed Seeker PRO Void sheets through the existing
cached native-pixel derivative pipeline. The source PNGs remain intact. Fur trim,
pale cyan eyes, dark blue cloth and flickering cloth-clipped snowflakes are shared
by gameplay, selection, costumes, lock-in flourishes and victory rendering.

## Tuning

| Property | Value |
| --- | --- |
| Health | 102 Versus / 51 under the existing Battle reduction |
| Body | 46 x 66, matching the ordinary core Seeker fighters |
| Gravity | 2060, unchanged ordinary gravity |
| Walking / universal running | 132 / 217.8 units/sec target |
| Ground acceleration | 468 units/sec squared, 18% of ordinary acceleration |
| Reversal acceleration scale | .55 of Icer's acceleration |
| Ground friction | .995 per fixed step |
| Neutral aimed braking | 72 units/sec squared; no-input sliding uses friction |
| Ground dash | 300-600 base, 318-636 launch with existing ground multiplier |
| Powered ground skid | .28 seconds, followed by ordinary low-friction coasting |
| Air dashes | Four; native landing/reward rules remain |
| Air launch | Same 620/1340 base/max and .78 scale as Anchor |
| Neutral air launch endpoints | 663.312-989.04 units/sec |
| Air carry | Existing .62 seconds |
| Punch | 16 base damage, 800 base knockback, 42 reach, 27 radius |
| Punch timing | Existing .74s charge, .075s tap startup, .13s active, .22s recovery |
| Shield | 24 durability; ordinary 4.24s hold / 6.36s full inactive recovery |

Shared charge, grounded-hit, defensive resource and shield-break rules still apply.
Same-direction walking does not erase Icer's earned overspeed. Reversal remains
gradual. Deliberately accepted crouches still stop locomotion immediately.

## Ice Rules

Each air dash records its real traveled path. At completion or interruption, three
icicles are placed at evenly spaced arc-length samples of that path. Chaining
another dash finishes the previous trail first. Positions are fixed after
placement, normalized across supported wrap boundaries, and never home.

Icicles hang for .4 simulation seconds, then fall in world-down Y regardless of
stage gravity: gravity 1700, fall cap 1450, 12 x 30 collision dimensions and a
four-second maximum lifetime. Each event can damage a particular fighter once
across all three icicles. A subsequent dash or genuine shield break is a new event.
Damage is six, with no additional hitstun, launch, combo credit or successful-hit
resource refill. Court, invulnerability, Phantom intangibility and friendly-fire
rules are respected. Directional shields intercept before eligible body contacts.

Melee, projectiles, shields, terrain and sports objects can shatter icicles.
Relative swept contacts handle fast balls, fighters and crossing projectiles;
stable contact ordering prevents duplicate destruction. Ball velocity changes are
closing-speed based and capped at 160 units/sec, or 16 for a boulder. Stationary
overlap injects no impulse. No ball ownership or scoring fields are changed.

A ground dash coats its actual contacted stage surface for .9 seconds. The .3s
emitter extends only along that surface, clipping at its ends; the coating remains
short, not an accumulating ice field. It follows moving terrain by a local anchor,
and vanishes if its surface disappears. Friction becomes at least .995 retention;
reversing/braking traction uses a .3 multiplier, while forward acceleration and
jump controls remain. All teams can use it. Attacks/projectiles remove it early.

Only genuine shield breaks create the three shield-shatter icicles. Normal hold
timeout does not. Break stun, vulnerability, durability regeneration and resource
loss remain. KO, respawn and round reset clear owned ice. Pools are capped at
48 icicles and eight patches per Icer; expired event hit ledgers are removed.

## Integration And Checks

- `ice.js`: bounded authoritative hazards and contact math.
- `game.js`: registration, native movement/attack/shield hooks, sports adapters,
  snapshot-owned fighter state, pixel blade/hazards, thermometer and snowflake HUD.
- `fighter-presentation.js` / `presentation-assets.js`: cached native costume art.
- `index.html`, `server.js`, release builder and simulation harness: runtime loading.
- `tests/icer*`, movement/shield checks and package scripts: focused verification.

The thermometer uses authoritative health, frosted empty glass and cracks; low
health retains the universal red warning. Four snowflakes become dim droplets in
both the compact HUD and the on-fighter indicators. Universal combat marks and
team colors are unchanged. CPU Icer uses the existing native-input AI.

Tests cover mechanics, all relevant ball families, native Soccer/Basketball
scoring after ice contact, terrain attachment, four-way gravity, seam traversal,
KO/reset, snapshots/replay, delayed rollback, 30/60/120Hz and unchanged simulation
for the prior 19 core fighters without Icer. Browser checks cover 20-character
selection, native art, blade/shatter/coating, HUD, victory, 720p/1080p, ten CPUs,
offline embedded-art loading and real WebRTC hazard/rematch agreement.

The short headless ten-CPU comparison is a development signal, not a sustained
hardware benchmark or subjective gameplay certification. Human playtesting is
still needed for slipperiness, narrow icicle readability, damage and team utility.
The offline check reuses licensed embedding from the frozen release; it is not a
new packaged-release certification. No new ZIP or dependencies were produced.
