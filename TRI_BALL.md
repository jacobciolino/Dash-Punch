# Ball Hell

Two stages: **Ball Hell** and **Ball Hell: Wraparound**. Court and Battle share
continuous, opponent-facing swept scoring: basket 5, soccer 3, field goal 1.
Only the scored ball recycles to a safe neutral top drop. No freeze, fighter reset
or interruption. Awards are batched before victory, with exact ties in overtime.
Field-goal posts are visual markers, not invisible walls. The entire ball must
clear the crossbar. Baskets accept downward center crossings inside the opening.

## Arena
4480 x 1800, floor Y1640, solid side walls, open sky. Each end has a ground soccer
opening, a 208-unit basket and elevated U-shaped uprights. Keeper perches are
160 x 24 at Y600. The central 560 x 24 one-way lift travels from Y1160 to
Y181.72 (1.18 x actual 154-unit Chungus height), on a 14-second sinusoidal cycle.
Peak lift speed is 219.52 units/sec. Native moving-platform displacement carries
riders. The upright fixed .26 camera shows the full arena; high objects get
offscreen markers instead of zooming out indefinitely.

Wraparound retains the full-width one-way floor: ordinary standing and native
Down+Dash drop-through work, as does upward passage. Centers normalize modulo
1800 at the top/bottom seam, preserving velocity, resources, charge and attacks.
Nearest-image contacts cover fighters, shields, melee, spear/whip, balls and
projectiles. Split projectile paths and shifted previous positions avoid
full-arena sweeps and phantom scores; edge ghosts show crossing objects.

## Settings
Dashball opens the general rules menu. Selecting a Ball Hell stage opens
**Ball Hell Settings**; Done returns to stage selection without changing players.
Use the existing previous/next controls. The panel scrolls.

| Setting | Default | Choices |
| --- | --- | --- |
| Duration | 5:00 | 1:00-10:00, 30-second steps |
| Winning score | 33 | No Limit, 10-100 |
| Timed spawn | 90 sec | Off, 30/60/90/120/150/180 sec |
| Combined-score spawn | 3 pts | Off, 3/6/9/12/15 pts |
| Starting balls | 1 | 1-5 |
| Maximum balls | Unlimited | Unlimited, 5/10/15/20 |
| Basket / soccer / field | 5 / 3 / 1 | Each independently 1-10 |
| Ruleset | Battle | Court / Battle |

Team size, Battle health and existing respawn settings remain available.
Restore Defaults affects only Ball Hell settings. Host settings synchronize to
both online peers; native snapshots and rematches retain all selections.

Each timed threshold and each crossed combined-score threshold independently
attempts one spawn. Cap-suppressed spawns are not queued. Neutral deterministic
spawn searches reject terrain, fighters and other balls. There is no hidden
ordinary ball cap. Ball pairs reuse the existing circular mass collision solver.

## Single Ball
Starting 1 + both spawn mechanisms Off automatically chooses radius 18.4 instead
of 16, mass 1.5 instead of 1, rolling drag .76 instead of .95/sec, air drag .025
instead of .04/sec. Gravity remains 900, restitution .84, maximum speed 2050.
Native attack velocity changes divide by mass, so weak strikes have less control.
The automatic target becomes 10, reverting to 33 for multiball. Explicitly chosen
targets, including No Limit, are never overwritten. Physics is derived afresh,
not compounded when settings are serialized or changed.

AI distributes native ball tasks by team rank, selects useful goal values and
uses ballistic aim, ordinary punches, jumps and dashes. Wrap CPUs use native
Down+Dash when the nearby ball has a shorter route through the floor; an
eight-second route retry interval prevents repeated pointless drop loops. Court half restrictions
remain. No scripted shots or scoring forces. Human playtests should assess
keeper access, high-goal routes, role quality and late-match ball density.

## Validation
Focused scoring, configuration, spawn, seam, carrier/projectile, lift/rider,
Court/Battle, native CPU, snapshot/replay, delayed rollback and 30/60/120 Hz tests.
Real WebRTC Court/Battle checks passed for both variants with 50ms delay,
15ms jitter, 5% simulated packet loss and rematches. Online remains 1v1.

720p/1080p settings/arena captures are in `artifacts/team-objectives` and
`artifacts/tri-ball`. Ten CPUs plus twenty balls: 180 synchronous simulation and
Canvas draws, latest p50 2.7ms, p95 5.1ms, maximum 31.8ms in software Chrome. This is
not display-frame pacing or a physical-controller benchmark. One seeded default
five-minute-clock CPU match ended early at 33 points: 73.17 simulated seconds,
37-23, peak 21 balls, finite state throughout. This is a sample, not a balance
claim or a guarantee on Unlimited-mode performance at extreme ball counts.

No historical fixtures regenerated and no release build/ZIP created.
