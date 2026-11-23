# Target Charge Delivery - November 13, 2026

## Build

- Preview: http://localhost:8080/?v=target-charge
- ZIP: `exports/Dash-Punch-Target-Charge-2026-11-13.zip`
- Unpacked build: `exports/Dash-Punch-Target-Charge-Release-2026-11-13/`
- Network version: `dash-punch-rollback-41-target-charge-core-1`.
- ZIP size: 7,447,561 bytes (7.45 MB); archive integrity passed.
- Core-only: 13 fighters, 11 Versus stages, 15 Dashball stages, existing Sandbag
  rules. 75 runtime files, 57 external assets and 23 embedded sprite sheets.
  No new art, dependencies, experimental fighters or development tools packaged.
- SHA-256: `aae1a12ad6cfcc47624f6fa14274b4ee2a83f29a346a1d51638e9aa5ea76f4ad`.

## Implementation

Three adjacent stages in Dashball's existing stage picker, also available online:

1. **Target Charge - Stationary**: immovable target at (1280, 700).
2. **Target Charge - Vertical**: smooth Y350-1020 travel, eight-second cycle.
3. **Target Charge - Roaming**: seeded destinations in the central 70% of arena
   width and Y270-1020, acceleration 260, maximum speed 340, 3-5 second retargeting.

All share a closed 2560 x 1440 court, floor Y1280, radius-80 neutral target and
two radius-24 balls. Soccer gravity 1050, speed cap 2050 and restitution 0.73.
Balls spawn symmetrically at 44% and 56% width, clear of fighter spawn lanes.
Their permanent scoring team is independent of last touch, shielding, Spike
possession and projectile redirection. Existing attack impulses, resources,
magazines, physics and fighter balance remain unchanged.

The target measures pre-response relative normal closing speed. Fixed-point
charge uses 60,000 units per percentage point and linear interpolation through
0/200/400/600/800/1000/1400/1800/2200 speed -> 0/1/3/6/10/14/21/27/32 percent.
Higher speeds cap at 32%. Observed separation re-arms impacts; there is no scoring
cooldown. Correction, spawn overlap and persistent contact cannot farm charge.
Both balls' awards batch before deciding victory. Equal threshold totals enter
overtime; over-target totals are retained. KO events award no charge.

Battle-only, mandatory friendly fire, normal 50% Battle health and independent
15-second respawns with existing protection. Local 1v1-5v5; WebRTC stays 1v1.
Target Charge Settings offers 50/75/100/150/200% victory targets, timer, team size,
health and respawn. No Court toggle. Existing keyboard/controller selection
controls are reused. Settings carry between target-motion variants and rematches.

AI dynamically divides offense, defense and support, predicts target motion,
uses native ballistic shot planning and ordinary fighter inputs. It avoids
unreachable below-floor approaches and deliberate straight-down defensive banks
into the target overhead. No scripted scores, forces or AI-only movement.

Cached tints reuse existing pixel sprites. Permanent team ball colors remain
visible with fighter outlines disabled. Square meters pulse on impact; simultaneous
awards have separate gain labels and split target flashes. All feedback stays
outside gameplay state; muted rollback replay does not duplicate these effects.

## Verification

- **35 current automated suites passed**, including **20 Target Charge groups**.
- All **4,440 immutable pre-change gameplay hashes** match. No old fixtures were
  regenerated. Relevant sports, fighters, shields, projectiles, Kite, rollback,
  original Flip, team rendering and signaling suites passed.
- Final core/source parity: **3,390 simulation frames**, 11 replay checks and
  both ten-fighter team arenas. New sports retain identical gameplay in the ZIP.
- Target Charge covers scoring anchors/interpolation, moving-target impacts,
  tangential contact, ownership, real rebounds versus persistent contact,
  simultaneous wins/ties, two-ball physics, native shots/Spike, safe target/body
  separation, AI roles, KOs/reset, snapshots and delayed-input rollback with
  actual charge awards. Fixed-step 30/60/120 Hz rendering agrees.
- Final browser checks passed at **1920 x 1080 and 1280 x 720**. Settings fit
  without overflow; keyboard and simulated gamepad navigation passed. Both
  team-owned balls passed color-pixel checks with outlines/glow disabled.
- **Six real WebRTC Target Charge scenarios passed**: live scoring and
  victory/rematch for all three stages, with 50 ms delay, 15 ms jitter and 5%
  packet loss. Peer gameplay hashes matched with different local visual settings.
- Target Charge plays directly from the extracted `index.html` offline.
- A final 3,600-step ten-CPU soak per stage stayed finite and both teams earned
  charge in every variant (five/five/two target impacts respectively). This is
  a stability and opportunity check, not a claim that AI or pacing is balanced.
- Open Soccer browser/recovery tests and six WebRTC scenarios also passed.
  Core browser checks passed controller joining, offline Versus, all 76 runtime
  PNGs, ten fighters, normal online combat, pause/rematch and disconnection.
- ZIP integrity and live preview routes were verified; no missing assets or
  browser errors in the final release checks.

### Frame Pacing

Warmed, software-rendered headless Chrome; 180 animation-frame intervals per stage:

| Stage | Median | P95 | Frames over 25 ms |
| --- | --- | --- | --- |
| Stationary, ten CPUs | 16.7 ms | 16.7 ms | 0 |
| Vertical, ten CPUs | 16.7 ms | 16.8 ms | 0 |
| Roaming, ten CPUs | 16.7 ms | 16.7 ms | 0 |

Charge art stayed at five cached sheets; fighter outline caching stayed within
its existing 320-entry / 1.2-million-pixel limits. These are short warmed rAF
samples, not cold-load timing, isolated CPU/GPU cost, worst-case projectile
stress or performance guarantees for slower hardware.

## Remaining Concerns

- The known historical **Rain/Orbit pre-tuning fixture still fails**, unchanged.
  Its separate failure is recorded; it is not included as a passing current suite.
- Physical-controller feel, ten real controllers, WAN/NAT behavior and subjective
  balance were not verified. CPU spacing, charge pace and rebound accessibility
  need human playtesting; crowded CPU games can have long scoreless rallies.
- Previous Open Soccer work is complete for the two real base sports: Soccer and
  Gravity Flip Soccer. This checkout has no distinct Gravity Soccer sport (the
  old HUD shorthand referred to Flip). No fake third gravity implementation was
  registered; that separate requested variant remains pending clarification.

## Changed Files And Checkpoint

- `target-charge.js`: pure deterministic curve, movement, contacts, ledger,
  two-ball collision and role allocation.
- `dashball.js`: three registrations, validated settings, reused Soccer arena and
  ball solver, state, Battle lifecycle, shared target stepping and shot planner.
- `game.js`: existing menu/settings, native collision/AI hooks, cached pixel
  presentation, square HUD, feedback, online build identity and patch notes.
- `index.html`, `server.js`, `tools/build-core-release.cjs`, `package.json`,
  `playtest-release.json`: runtime loading, serving, core packaging and preview.
- New Target Charge unit/browser/WebRTC tests and immutable before fixture;
  `tests/simulation-harness.js`, core-release tests and scoped registry/fixture
  adapters in existing Dashball, Field Goal and sports tests.
- `TARGET_CHARGE.md`, `DASHBALL.md` and this report document rules and results.
  Detailed logs, screenshots and metrics are in `artifacts/target-charge/`.
- No Git repository exists. The pre-change code checkpoint is
  `exports/checkpoint-before-target-charge-2026-11-13.zip`; no commits are claimed.
  Earlier completed work was retained, not restarted or overwritten.

No engine rewrite, new controls, fighter rebalance or native port was undertaken.
