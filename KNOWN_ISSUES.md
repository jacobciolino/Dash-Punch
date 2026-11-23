# Known Issues

- November 22 requested Spike shield-contact state and heavyweight mobility
  tuning supersede the archived pre-Ember a2f06be equality comparison at the end
  of tests/ember.test.js. It now differs at Spike frame zero. The functional
  flame, snapshots, delayed rollback and fixed-rate groups are tested separately;
  neither that archived comparison nor its historical source has been rewritten.

- `tests/whipado-air-dash.test.js` passes nine functional groups but its historical
  override-removal group no longer finds the old source-comment/block layout.
  The same matcher fails at pre-running checkpoint 9bf9aa8; no fixture or source
  matcher has been rewritten. Current running tests separately compare unchanged
  pre-run walking and all fighter configurations against that checkpoint.
- Build 76 adds approved authoritative run-up state and immediate crouch braking.
  Earlier whole-core cosmetic comparisons (including the af5b795 comparison in
  character-presentation.test.js) predate this gameplay change; their baselines
  remain intact. The cosmetic suite passed all 16 groups at visual checkpoint
  9bf9aa8 before running was added. Ground-running tests cover the new behavior
  and compare pre-run movement/configuration against that checkpoint.
- Historical Rain/Orbit replay fixtures predate current movement/animation work.
  Preserve and report their discrepancy separately from new regressions.
  `tests/charged-recall.test.js` also ends with an archived roster comparison
  expecting Orbit's old four dashes/shorter arc; its preceding recall physics,
  snapshot, delayed rollback and 30/60/120Hz checks pass on November 21.
- Some old sports-guide/physics expectations precede approved floatier-ball
  tuning (900 gravity, .84 bounce, .95 rolling friction). Do not regenerate old
  fixtures. Record actual failing tests before a release.
- Shared-menu/player-card unit tests default to older November 14 comparison
  builds, which include superseded gameplay. These default comparisons still
  differ; use REGRESSION_BEFORE_DIR for the task's actual pre-change Git export
  to test new regressions. Historical defaults and fixtures remain unchanged.
- Raw development file:// pages lack the release's embedded sprite resources;
  use npm run dev. Offline menu smoke tests reuse the existing release asset
  embedding; they are not a newly packaged release certification.
- Physical multi-controller feel still requires human testing; simulated pads
  and browser measurements are not hardware playtest certification.
- November 21 local-hitstop work intentionally changes contact timing, not damage
  or launch values. `tests/reflektor.test.js` passes its 17 functional tests but
  fails its final pre-Reflektor whole-simulation equality comparison. Other
  archived exact-timeline comparisons may likewise differ. The new focused
  hitstop suite checks original instant damage/force, fixed-step rates, replay,
  delayed rollback and contact deduplication. Historical baselines are unchanged.
  `test:card-flourish` likewise passes six functional groups but its fixed
  fd02b02 whole-timeline comparison differs at Anchor frame 37. The later
  radial-menu work matches the immediate 6fe4779 pre-change simulation exactly.
- `tests/charged-recall-online.browser.test.js` only waits for network frame 10,
  then presses Punch while the best-of-three opening countdown is still active.
  It timed out with no throw. `test:local-hitstop-online` waits for actual playing
  state and passes real WebRTC Edgebert contacts and Boomerangus recall/rematch
  at 50ms delay, 15ms jitter and 5% packet loss. The older test remains unchanged.
- November 21 release sweep also exposes obsolete assertions for Phantom's
  materialization resource refill, permissive Soccer/Basketball goal interiors,
  current roster/stage counts, and later approved charge/shield/movement tuning.
  Logs are retained in artifacts/release-2026-11-21. The final core package has
  separately passed source parity, offline extraction, asset and WebRTC checks;
  this is not a claim that the entire historical test suite is green.

These notes do not waive relevant tests or authorize unrelated gameplay fixes.
