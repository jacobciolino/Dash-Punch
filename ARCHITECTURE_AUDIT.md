# Maintainability And Portability Audit

Findings only, after the current sports/visual milestone. No refactor or native
port is authorized or implemented by this report. Scope: the sports, fighter
rendering, input adapter, snapshot and release paths inspected during these
patches. This is not a claim that every line has been audited for reachability.

## Findings

- `game.js` is 18,059 lines. Menus (`renderMatchSettingsMenu`, line 3192),
  sports AI (8482-8652), simulation/input (8652/8732), audio (13900) and rendering
  (14090 onward) share closure state. Reasonable local changes can therefore
  affect unrelated systems. Existing pure sports and renderer modules are a
  useful incremental pattern; no wholesale conversion is needed.
- `dashball.js:148` has similar golden/boulder timer bookkeeping, while
  `sandbag.js:34` handles its own sports clock. There are real rule differences,
  so a shared helper should cover only common bookkeeping, not erase phase,
  overtime or reset semantics. Settings row construction also repeats across
  `game.js:3215`, `3255` and `3279`.
- Ball behavior previously depended heavily on match-wide `state.boulder` and
  `state.golden` flags. Total Rush required an explicit per-object physics
  selector. Future mixed objectives should use that classification rather than
  adding more match-wide truthiness checks to individual collision decisions.
- `game.js:8020` excludes a hand-maintained set of presentation fields when
  serializing all other fighter properties. This works and is regression tested,
  but a new render/cache field accidentally placed on a fighter could enter
  deterministic state. Team preferences/cache were deliberately kept outside it.
- `tools/build-core-release.cjs:28` evaluates data slices and patches source
  through unique text markers. It fails loudly on changed markers, which is good,
  but formatting/data-layout edits can still break release creation. Core/source
  simulation parity and manifest checks must remain mandatory.
- Verified retained paths are not automatically dead code: Block rendering,
  `drawFighterFace` (`game.js:16137`) and full-source experimental asset branches
  remain reachable. Stage Builder's normal entry/UI is omitted by the core
  builder, while implementation remains in development source. A full static
  and runtime reachability pass is needed before deleting more implementation.
  No globally dead function is asserted or removed in this scoped audit.
- `game.js:7043` and `8020` support different network/simulation copy purposes.
  Some overlap is visible, but they are not proven interchangeable; merging
  them without protocol/snapshot tests risks losing Sets, Maps or fighter links.

## Top Five Improvements

| Rank | Recommendation | Benefit | Risk | Effort |
| --- | --- | --- | --- | --- |
| 1 | Add a documented regression catalog/runner separating current contracts, immutable history and known intentional balance changes | High | Low | Small |
| 2 | Add explicit snapshot-boundary assertions for browser objects, caches, visual preferences and all new objective types | High | Low-medium | Small-medium |
| 3 | Move one coherent rendering slice at a time beside the existing sprite/stage helpers, preserving the current host API | High | Medium | Medium-large |
| 4 | Give the core builder explicit character/stage data export boundaries instead of relying on broad source slicing | High | Medium | Medium |
| 5 | Share narrowly scoped sports clock/option-row helpers after documenting the distinct mode lifecycles | Medium | Medium | Small-medium |

Each proposal needs its own small patch and existing before/after fixtures.
Recommendations 3-5 should be planned and approved before architectural work.
No framework, dependency, new engine or Wii port is required for any proposal.

## Test Gaps And Portability

Current coverage includes deterministic sports state, delayed-input rollback,
cross-objective physics, sprite alpha/transform tests, core/source parity, real
WebRTC peers and browser performance. It does not establish long-session AI
ring/snitch scoring frequency, coordinated human balance, physical controller
feel or cross-browser/cross-native floating-point equivalence. The older
`orbit-before` fixture still expects Rain's prior balance; it must be classified
and explained, not silently regenerated or treated as a current gameplay target.

For portability, retain plain serializable sports state and abstract directional/
Dash/Punch inputs. Keep Canvas, DOM, Web Audio and Gamepad behind host adapters.
Existing fixed-step/seeded replay is useful, but native implementations would
also need explicit numerical agreement for trigonometry and collision ordering.
That is a future design issue, not permission to begin a native port now.

## Typography Milestone Follow-Up, November 14

Current inspected source is 19,104 lines in `game.js`, 1,707 in `styles.css`,
1,087 in `dashball.js`, 140 in `sandbag.js`, and 67 in `match-flow.js`.
The existing report above records an earlier checkpoint; line references below
refer to this milestone. No architectural rewrite has been performed.

### Current Findings

- Coupling remains concentrated in `game.js`: menu dispatch at line 5486,
  browser input at 7699, fixed-step simulation at 8451, match presentation at
  8559, and Canvas HUD rendering at 18013 share one closure. The font patch
  isolated family/readiness/tooltips in `typography.js` instead of embedding
  font loading in combat. Similar small boundaries are possible, not authorized.
- `drawMiniPlayerHud` (18013) and `drawPlayerHud` (18073) repeat health, shield
  and resource-label construction. They have intentionally different layouts;
  a future shared data formatter would be safer than merging their renderers.
- `renderSlotStack` (3895), `renderCharacterFeature` (3946), and
  `renderCharacterTile` (3963) have no remaining references in current source
  beyond their declarations after the independent-card overhaul. They are
  verified unreferenced closure functions, unlike retained experimental
  renderers. They were not deleted during this typography-only pass.
- `FIGHTER_PRESENTATION_FIELDS` (8300) is still an exclusion-based snapshot
  boundary. Browser font/tooltip state was kept outside fighters entirely.
  Future cached art fields need assertions so they cannot silently enter hashes.
- `tools/build-core-release.cjs:28` still uses source slicing and unique-text
  substitutions, including patch-note accumulation. Current markers fail
  loudly, but increasingly long prose markers are brittle. Font data now has
  explicit manifest provenance; that does not solve the larger builder boundary.
- Shared global and private card input are correctly distinct (`collectSharedMenuInput`
  at 6102, `updateLobbyGamepads` at 6163), but both call the same large menu
  dispatcher. Existing tests cover current contracts; older development-only
  lobby browser scripts still target retired markup and need classification.

### Highest-Value Next Steps

| Rank | Recommendation | Benefit | Risk | Effort |
| --- | --- | --- | --- | --- |
| 1 | Catalog and expose a single current regression runner, separating historical fixtures and retired UI tests | High | Low | Small |
| 2 | Assert snapshot boundaries against DOM/Canvas/font/cache objects | High | Low-medium | Small |
| 3 | Remove the three verified unreferenced lobby renderers in a dedicated tested cleanup | Medium | Low | Small |
| 4 | Replace prose/source-replacement release markers with explicit data and patch-note inputs | High | Medium | Medium |
| 5 | Extract one HUD/presentation slice behind a narrow simulation-read-only interface | High | Medium | Medium-large |

Remaining test gaps include physical controller brands, TV overscan, other
browser font engines, and native-runtime numerical agreement. Current typography
tests add delayed/failed font startup, embedded offline loading, Canvas metrics,
glyph coverage checks and rendering purity; they do not certify those hardware
or portability concerns. Present a plan before recommendations 4 or 5.
