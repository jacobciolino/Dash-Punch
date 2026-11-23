# Dash Punch Development

## Workflows
- PATCH (default for narrow fixes): minimal edits, syntax and targeted tests,
  no release build or ZIP. FEATURE: one feature, focused tests and browser smoke,
  no ZIP. Only an explicit RELEASE request authorizes packaging.
- RELEASE: one core build, full regression/integration, browser/offline/online
  checks, release notes and ZIP. Report failures, never conceal them.
- See `WORKFLOW.md` for commands and `CHANGELOG.md` for recent work. Use Git
  diffs instead of rediscovering project history. Keep reports concise.

## Architecture
- `game.js`: existing combat, movement, animation, input, menus, AI and camera.
  `index.html` / `styles.css`: browser UI.
- `dashball.js`, `target-charge.js`, `sandbag.js`, `sports.js`: sports rules/physics.
- `rollback.js`: deterministic snapshots/replay; `server.js`: files/signaling.
  Local supports ten fighters; private WebRTC remains 1v1, no online teams.
- `match-flow.js`: best-of-three. `lobby-cards.js`: independent card reducer.
  Global menus share focus; an open card consumes only its owner's input.
- `presentation-assets.js`, `stage-renderer.js`, `sports-guide.js`,
  `team-silhouette.js`, `typography.*`: artwork, scenery/previews, outlines, fonts.
- `tests/`: harness, browser tests and historical fixtures.
  `tools/build-release.cjs`: core-only offline build entry point.

## Guardrails
- Continue HTML/JavaScript; no Wii port, framework migration or wholesale rewrite.
  Reuse hooks; keep simulation, input, rendering, animation, audio and UI separate.
- Preserve two-button controls and remaps. Dash = L1/LB, bottom/top face, R2/RT.
  Punch = R1/RB, left/right face, L2/LT. Start opens the owner's player card;
  View/Select closes it. No permanent shared-menu owner.
- Shared-menu exits hold Back/Escape for 1.6 seconds. Private card Back remains
  immediate; clickable exits use Confirm Return. Hold timers are presentation-only.
- Preserve Seeker PRO art, pixel density, anchors, timing, nearest-neighbor
  rendering and licenses. Cosmetic changes must not change hits or physics.
- Do not change stats, physics, frame data, scoring, controls or unrelated modes
  unless requested. No unnecessary dependencies, duplicate systems or refactors.
- Fixed-step simulation uses seeded RNG and simulation-time timers. Gameplay
  state must snapshot/replay/rollback; local presentation must not enter hashes.
- Simulation changes require relevant determinism and rollback tests even for
  PATCH. Never regenerate historical fixtures to hide failures; see KNOWN_ISSUES.md.
- Use `rg` and `apply_patch`; match local conventions. Keep functions small,
  comment non-obvious behavior, and verify references before removing old code.

## Testing And Delivery
- `npm run check`: runtime syntax. Use affected `test:<feature>` scripts from
  `package.json`, not every suite for every cosmetic change.
- Menus: `test:shared-menus`, `test:player-cards` and their `-browser` scripts.
  Rounds: `test:match-flow` / `-browser`. Rollback: `test:rollback`.
- Browser tests use installed Playwright (`PLAYWRIGHT_MODULE` if necessary).
  `npm run dev` serves source; `npm start` may serve the selected older export.
- Offline releases bundle runtime art/audio/fonts/licenses, no external fetches.
  Physically omit experiments, tests, artifacts, dependencies and old packages.
  Never delete or overwrite existing releases.

## Checkpoints
- Local Git exists; no remote is configured. Commit only task-related changes;
  preserve user edits. `known-good` identifies a validated checkpoint.
- GitHub `jacobciolino/Dash-Punch` is a public source-only copy, not a mirror.
  Never push local history there: it contains licensed artwork. See
  GITHUB_SOURCE.md and use the source-only exporter; no assets or embedded media.
- Update CHANGELOG.md with meaningful changes/tests/limitations. Only label
  known-good after relevant tests pass. Revert work only with user approval.
- ARCHITECTURE_AUDIT.md records the audit; major changes still require a plan
  and approval. Portability is not justification for an unrequested rewrite.
