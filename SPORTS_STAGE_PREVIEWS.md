# Sports Stage Previews and Guides

## Coverage and Navigation

All 15 currently registered Dashball stages have full-stage widescreen previews:
Soccer, Soccer Open Arena, Basketball, Wrap Around Basketball, Target Break,
Golden Rush, Gravity Flip Soccer, Gravity Flip Soccer Open Arena, Boulder
Control, Gravity Flip Boulder Control, Total Rush, Field Goal, and Target
Charge Stationary, Vertical and Roaming. There is no separate Gravity Soccer
implementation in this repository, so no fictional stage was registered.

Play > Dashball > Choose Fighters > Choose Stage. Highlight a thumbnail with
the existing shared controller focus, keyboard, pointer or touch. The large
preview and Objective/Twist/Scoring guide update immediately. Confirm still
selects the stage; browsing alone does not change the selected arena or reset
the match. The guide explicitly distinguishes a preview from the selected stage.
Settings and readiness use the existing controls and rules. Open private cards
continue to consume only their owner's input.

Damage Race, Damage Brawl and Sandbag Scramble show their actual arena and guide
beside the existing Sandbag Setup options. Their original setup flow is retained;
no new stage-selection step was added.

## Accuracy

Descriptions are based on implemented rules, not the illustrative examples:

- Boulder Control rewards the team's **own** colored territory, not enemy land.
- Gravity Boulder scores inside the moving window, not all vertical space.
- Field Goal is continuous timed play with a replacement ball dropping from
  above, not a basketball landing or a full-field reset.
- Golden Rush uses 1/3/5 hoops and its configured golden reward.
- Total Rush displays selected fractional boulder rates, ring values, golden
  reward and ball count. Bonus rate is the total, not an additional rate.
- Target Charge preserves permanent ball ownership; opponent assists count.
- Sandbag Brawl rewards only the hitter's own bag; Scramble shares one bag.

## Preview Pipeline

`sports-guide.js` creates fresh initial snapshots through the existing
`Dashball.arena/create/options` and `DashSandbag.arena/create/options` factories.
It never advances simulation, consumes the live RNG, changes the selected
stage, or installs the preview state into the game. The old stage-option
transition defaults are preserved exactly by `dashballConfig`.

`game.js` passes explicit context/stage/state values to the same arena, goal,
ring, ball, target, sandbag and gravity-switch painters used in live matches.
Their default arguments preserve all existing gameplay call sites. Preview-only
annotations show actual travel bounds, roaming limits and wrap seams. Small
world labels and transient combat effects are omitted rather than rendered
unreadably. The full arena is fitted without cropping objectives; no new art
or invented platforms are used.

Previews are static opening-layout overviews, not animated miniature matches.
Moving geometry is represented at its initial position with dotted travel guides.
The source of truth remains the stage definitions: changing geometry or settings
automatically changes the preview and cache key. No manual image regeneration
or duplicate thumbnail illustrations are required.

Each session uses an LRU cache of at most 20 masters at 640 x 360 pixels
(18,432,000 raw RGBA bytes maximum, excluding small visible canvases and browser
overhead). No per-frame pixel scans, image readbacks, data URLs or unbounded
animation-frame allocations are used. Existing objective images load before
masters are cached. Canvas scaling uses nearest-neighbor sampling. Both HTTP
and direct offline file play use the same bundled painters and assets.

Preview scenes, asset-loading state and cache entries are local presentation
state, absent from rollback snapshots and online hashes. No combat, scoring,
physics, AI, team assignment, stage geometry or online capacity is changed.

## Verification

Run `npm run test:sports-guide`, `test:sports-guide-browser`, and
`test:sports-guide-render` with the existing browser-test runtime configuration.
The first suite validates all descriptions, real geometry, 225 preserved stage
option transitions, bounded caching and exact pre-change simulation hashes.
Browser checks cover all 15 stages and three Sandbag rules at 1280 x 720 and
1920 x 1080, independent card input, shared controller focus, offline loading,
distinct nonblank previews and read-only highlighting. Screenshots and reports
are in `artifacts/sports-previews/`, not the release ZIP.

The renderer comparison checks live-match pixels against the pre-preview
BackOut release, including every sport and all four original Flip directions.
Historical gameplay fixtures are never regenerated. The previously documented
Rain/Orbit historical discrepancy remains separate from this presentation patch.
Automated controller emulation is not physical-controller testing.

Pre-change source and release ZIP checkpoints are in `exports/`. This folder
is not a Git repository; no Git commit is claimed.

### Final Results, 2026-11-14

- All five focused preview groups pass: 15 unique Dashball guides, three
  Sandbag guides, actual factory geometry, 225 preserved option transitions,
  bounded cache, and 1,080 exact pre-preview sports simulation frames.
- All seven UI/network browser suites pass: sports-guide, shared-menu,
  player-cards, match-flow, typography, match-flow-online and core-release.
  The separate live-render browser comparison also passes all 22 cases.
- Preview checks captured 39 full menu screens across 720p/1080p plus all
  15 offline preview canvases. No missing images, browser exceptions, clipped
  checked text, or match mutations while highlighting were observed. Fifty
  repeated preview redraws allocate no additional cached masters.
- 21 of 27 non-browser suites pass after using the existing bundled native
  Canvas test runtime. The initial Canvas module-path errors are retained in
  logs; reruns pass with `CANVAS_MODULE` and `SHARP_MODULE` configured.
- The six red suites are gravity-soccer, field-goal, boulder-control,
  gravity-boulder, total-rush and target-charge. Their functional groups pass;
  their final historical replay assertions retain earlier sports hashes from
  before the requested ball/snitch/physics replacements. These are not new
  preview regressions. The source checkpoint reproduces the Soccer mismatch
  at frame 68 and the older Golden Rush mismatch exactly. The separate Rain
  fixture mismatch also reproduces exactly for 120 frames. No old fixture
  or gameplay tuning was changed to make these tests green.
- Full rollback passes 8,280 independent frames and 1,047 rollbacks, including
  depth eight, packet loss, rematches and state restoration. Core packaging
  passes 3,390 source/export parity frames and 11 snapshot replays. The
  gameplay-repair, magazines, Kite, outlines, sports Canvas and font suites pass.
- Real WebRTC 1v1 passed delayed/jittered/lossy input, pause, rounds, victory
  and rematch in Versus and Soccer. No online capacity change was made.
- The existing core-release ten-fighter Dungeon sample measured 16.7 ms median,
  16.8 ms p95 and zero frames over 25 ms in 180 samples. This software-rendered
  Chrome run is a short machine-specific check, not a controlled hardware-wide
  benchmark or a claim about physical controller feel.

Detailed raw attempts, configured reruns, historical checkpoint evidence and
combined results are under `artifacts/sports-previews/`. Historical JSON
baselines remain untouched. Not every historical suite is green.

### Release

`exports/Dash-Punch-Sports-Previews-Release-2026-11-14.zip`

7,668,320 bytes, core-only and offline compatible. All 86 extracted files match
the verified release folder byte-for-byte. Archive integrity passes.

SHA-256: `6c212d3b70b61d9e78c14d7e92ca3a28f49329488119c7a0cd6bd840ccc513a5`.

The updated preview server uses `http://localhost:8083`; the existing server
on 8080 and its aliases were left running. Opening the extracted `index.html`
also works offline. Experimental content and development test artifacts are
not included in the ZIP.
