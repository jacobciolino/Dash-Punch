# Sports Update - November 13, 2026

## Implemented

- Sports Battle eliminations show the existing authored death animation briefly,
  then remove the image. A compact combined banner announces recent eliminations.
  The existing health bar fills as the respawn timer elapses, with RETURNING text.
  This is presentation only: actual health remains zero and the fighter remains
  absent from collision until the existing independent respawn timer completes.
  DefiPlate has no supplied death clip, so it uses its existing idle art and fades.
- All sandbags move. Default mass increased from 1.4 to 2 and gravity from 1300
  to 1800. Damage/scoring and attack launch calculations are unchanged. Race's
  movable bags remain on their assigned half so they cannot become unreachable.
- Golden Rush uses an authored 16x16 shiny red ball (nearest-neighbor scaling).
  Upper/middle/lower rings score 5/3/1. The flying golden target has 48 HP
  (previously 36) and awards 15 points (previously 20). Reward remains configurable.
  Its smooth deterministic patrol spans nearly the full width and makes occasional
  deeper dives while spending most of its time in the upper half. The arena wraps
  horizontally, with a closed roof and unchanged floor/platform positions.
- Showcase scene director, menu entry, hooks, preload and debug controls removed.
  Fired Up and normal/sports AI are retained. The shared AI input adapter was
  renamed from showcaseInput to aiButtonsToInput; its behavior is unchanged.
- New Dashball selections default to Battle; Sandbag defaults to Damage Brawl.
  Explicit saved Court/Race selections remain respected. Both remain selectable.
- All Dashball balls use top-face-only collisions for passable platforms, including
  moving platforms and all Golden Rush balls. Solid floors, roofs, goal rims and
  basket boundaries retain their existing collisions. Projectiles already had this
  behavior and were left unchanged.

## Preserved

Standard Versus combat, character data, movement, timing, hitboxes, resources,
shield mechanics, controller mappings, sports KO scoring rules, independent
respawns, 50% Battle health, 10/15/20-second choices and two-second spawn protection.
No new dependencies, framework, physics engine or native port.

Simulation build signature is now rollback-31-sports. Both online peers must
refresh to the same edition. Core packages still support ten local players and
two online players. Experimental content remains outside new distribution ZIPs.

## Verification

Focused coverage: tests/sports-update.test.js. Existing sports, projectile,
Fired Up, replay/rollback and core-release suites are also run for this patch.
Original historical fixtures are not regenerated: the Orc-removal test continues
checking unchanged Target Break frames; Golden Rush's intentionally changed
simulation is covered by its dedicated peer/replay/delayed-input tests instead.
Browser coverage and performance results are recorded in artifacts/sports-update.

Verified results: 7 new focused groups; existing Dashball 29, Sandbag 16, Golden
Rush 25, Target Break 24, projectile rework 21 and sports polish 6 groups passed.
Fired Up and 840 historical unchanged-fighter visual-cleanup frames passed.
The full rollback suite passed 6,960 independent frames and 1,047 corrections
(depth up to eight). Target Break retained 240 pre-Orc-removal baseline frames.
The exact core package matched 2,040 full-source simulation frames and 11 replays.
Chrome visual checks passed at 1440x1000 and 980x720 with no errors/missing assets.
Ten-CPU Golden Rush and Brawl samples: 16.7ms median, 16.8/16.7ms p95, zero frames
over 25ms in 180-frame samples. These are local samples, not hardware guarantees.
Real WebRTC Golden Rush ring/capture victories and rematches passed with 50ms
delay, 15ms jitter and 5% packet loss. Peer frame hashes agreed.

The broad preexisting core-menu/browser test timed out, including a retry that
could not launch Chrome. That full end-to-end navigation check is not claimed as
passing; the dedicated current sports visual and online tests above did pass.
A separate software-rendered check of the exact core build passed the ordinary
two-player lobby, stage selection, countdown, loaded arena and running match.
The generated ZIP also passed archive-integrity verification.

Physical controller hardware was not available for this automated test run.
No Git repository is present; the pre-patch source checkpoint and earlier releases
are retained in exports.
