# Development Workflow

Use these words in a prompt; no special syntax is required.

| Workflow | Scope | Verification | Delivery |
| --- | --- | --- | --- |
| PATCH (default for fixes) | Smallest focused change | Syntax + affected tests | Source + short report, no build/ZIP |
| FEATURE | One feature at a time | Focused tests + browser smoke | Source + short report, no build/ZIP |
| RELEASE (explicit only) | Package validated work | Full regression/integration, browser, offline and private online | One core build + notes + ZIP |

Examples: `PATCH: make the timer clearer`, `FEATURE: add hold-to-back`,
`RELEASE: package the current changes for game night`.

## Ordinary Development
1. Inspect `git status --short` and `git diff --stat`, then affected systems only.
2. Checkpoint relevant work, implement, and briefly update CHANGELOG.md.
3. Run `npm run check` and relevant scripts from package.json.
4. For browser work run `npm run dev`. Use `CORE_RELEASE_DIR="$PWD"` for tests
   that otherwise default to an old export. Set PLAYWRIGHT_MODULE to the installed
   Playwright directory if it is not on Node's module search path.
5. Commit tested files. After verification, update the local known-good tag:
   `git tag -f known-good HEAD`. Never silently revert work.

```sh
npm run check
npm run test:shared-menus
npm run test:player-cards
npm run test:match-flow
npm run test:rollback
CORE_RELEASE_DIR="$PWD" npm run test:player-cards-browser
CORE_RELEASE_DIR="$PWD" npm run test:shared-menus-browser
```

If npm is unavailable in the agent runtime, run the same script directly with
the installed Node binary (for example `node tests/menu-back.test.js`). Do not
install dependencies just to obtain npm. For immediate pre-change comparisons,
the menu/card unit tests accept REGRESSION_BEFORE_DIR pointing at a Git export;
their historical comparison defaults are preserved separately.

Gameplay changes also require affected sports/fighter tests, snapshot/replay,
30/60/120 Hz and delayed-input/online rollback checks. Presentation-only changes
need render purity (unchanged state hash), not every networking suite again.
Never describe simulated gamepads as physical-controller testing.

## Release Gate
Build once: `node tools/build-release.cjs exports/<new-unique-name>`.
Reuse that output for all release checks; do not rebuild per test.
Run every applicable unit, browser and online integration script in package.json,
including npm test, core release, match flow and packaging. Point release-aware
tests at the output via CORE_RELEASE_DIR; historical/full-source tests retain
their existing roots. Record failures; never regenerate fixtures. New regressions
block release. Historical failures need explicit disclosure/review, not exclusion.

ZIP contents: runtime HTML/CSS/JS, assets, minimal play instructions/server
metadata and licenses. Exclude build-manifest.json, render.yaml, tests, artifacts,
tools, exports and dependencies. Check ZIP integrity, extract fresh and verify
file:// offline loading plus served play. Never alter old release files.

## Checkpoints And Reports
Initial checkpoint: 633354f (existing workspace, scenery work in progress).
Generated exports/artifacts, old archived copies and dependencies are ignored,
not deleted. No GitHub/remote connection is needed.

Ordinary reports: changes, tests/results, remaining issues. Do not repeat the
project history or run full integration/packaging unless this is RELEASE.

Radial menu changes: `npm run test:radial-menu` and
`npm run test:radial-menu-browser`, plus the affected shared-menu/card/Back
checks. The optional REGRESSION_BEFORE_DIR points at the immediate Git export
for gameplay-parity coverage. Browser tests freeze gameplay but advance the
separate menu presentation clock; do not put animations in simulation ticks.

Fighter appearance changes: `npm run test:character-presentation` and
`npm run test:character-presentation-browser`. The latter generates native
before/after galleries and gameplay views in artifacts/character-presentation.
Use fighter-presentation.js for cached native-pixel derivatives; keep licensed
PNGs and character mechanics untouched. Runtime tethers/trails belong only to
snapshot presentation, not fighter/core state. Reuse the shared sprite path so
previews, team silhouettes, flourishes and victories stay consistent.

Ground locomotion changes: `npm run test:ground-running` and
`npm run test:ground-running-browser`, plus affected shield/Sticky Ball tests.
The focused suite covers run-up, gravity-relative braking, jump momentum,
snapshots, delayed rollback and 30/60/120Hz. `ROLLBACK_QUICK=1 npm run
test:rollback` additionally checks the existing transport/rematch stress cases;
it deliberately omits the exhaustive all-stage sweep, which remains a release gate.

Icer: `npm run test:icer`, `npm run test:icer-browser` and
`npm run test:icer-online`. The browser tests use source, existing embedded art
for file:// checks, and real private WebRTC for air-dash hazards/rematch. No ZIP
is generated. `ice.js` owns the small deterministic hazard state; fighter fields
serialize it through existing snapshots. Do not put these hazards in cosmetic
particle pools or route their damage through successful-hit resource rewards.

Dash Pong: `npm run test:dash-pong`, `npm run test:dash-pong-browser` and
`npm run test:dash-pong-online`. Set REGRESSION_BEFORE_DIR to the actual pre-change
Git export for optional old-sports equality checks. Shared match-flow and quick
rollback tests cover round transitions and transport; no release build is needed.

Moving-goal Pong: `npm run test:pong-track`, `npm run test:pong-track-browser`
and `npm run test:pong-track-online`. Pair shared edits with the original Pong
suite (REGRESSION_BEFORE_DIR at the task's actual Git export), match-flow and
quick rollback. Ball collision, drawing, previews and AI must use the same
perimeter goal segments; fighter terrain stays solid. No ZIP for FEATURE work.

Sticky Ball: `npm run test:sticky-ball` covers scoring, native possession,
flat-platform geometry, rates and rollback. `npm run test:sticky-ball-online`
checks private WebRTC; STICKY_TEST_ARENA=sticky-ball-flip selects its flip variant.
`npm run test:sports-presentation` / `test:sports-presentation-browser` cover
turf, native-pixel fixtures and the cosmetic match-end fade/swoosh. Keep fixture
art and fade state out of simulation snapshots; no packaging for these checks.

Lobby setup: `npm run test:lobby-setup-browser` drives Add CPU, Settings and
Lobby handoffs using simulated pads and keyboard, including P2 while P1 edits,
Ready preservation, nested rules returns, capacity and compact wheel layouts.
Pair with shared-menu/player-card/radial/hold-Back tests. Card-to-global release
gates are local UI state, never simulation snapshots or controller remaps.

Menu-control styling: `npm run test:pixel-menu-browser` compares original/current
button geometry, typography, artwork and state hashes on eight actual screens
at 720p/1080p, and samples rendered pixel corners. Screenshots are generated in
artifacts/pixel-menu. Pair with affected radial/lobby browser navigation checks.

Ember: `npm run test:ember`, `npm run test:ember-browser` and
`npm run test:ember-online`. The focused suite accepts REGRESSION_BEFORE_DIR for
the actual pre-change Git export; no historical fixtures are regenerated. Fire
segments/contact ledgers belong in fighter snapshots; fire art and smoke do not.
Pair simulation edits with quick rollback; shared fist edits need Rain's focused
render checks. No release build is required for these FEATURE checks.
Use `EMBER_TEST_GROUND=1 npm run test:ember-online` for surface-attached fire;
the default online run covers airborne trails. `test:heavy-lift-pong-perches`
and `test:spike-shield-contact` cover November 22 mobility/platform/contact edits.
