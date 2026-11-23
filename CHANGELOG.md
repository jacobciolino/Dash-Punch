# Development Changelog

## 2026-11-22
- PATCH Ember readability and ground fire: air carry/steering lasts .34 seconds
  instead of .28, with identical launch speed. Clearer four-unit flame pixels
  accompany air trails and .65-second floor/platform coatings from ground dashes.
  Coatings use surface-local coordinates, follow moving supports, respect gravity
  orientation and stop at gaps. Existing three-damage once-per-dash contacts,
  extinguishing, team restrictions and cleanup remain. No burn/DOT or new input.
- PATCH heavyweight lift: Chungus/boomerangus ordinary dash base/max increase 20%
  to 252/624 and 252/504 respectively. Super-jump scales become 1.08 and .46
  (previously implicit 1 and .42). Walking, gravity, mass, charge, recovery,
  weapons, punch and air-dash counts remain unchanged; derived fighters retain
  their old tuning. Low-mobility traversal still needs deliberate positioning.
- PATCH Spike shield touch: ordinary covered frontal contact now deals 7 damage,
  .18-second stun and 130-speed push, costing 4 durability. Genuine separation
  rearms; overlap or release/rehold cannot farm damage. Blocked Kickoffs reuse
  the same low-force contact with their native impact durability cost. Court,
  friendly-fire, invulnerability, spawn and Phantom protections remain intact.
- PATCH Pong goal-side perches: both Pong stages gain mirrored 176x20 stone
  one-way platforms at Y820, X136/X1928, beneath the sconces. Native upward
  passage/landing and descending-ball rebounds are reused. CPU rising attempts
  now hold the real one-second super-jump threshold instead of .65 seconds;
  no scripted movement, hidden impulses or ball/goal/camera retuning.
  Verification: 53 Pong/perch/heavyweight/Spike groups pass, two optional
  pre-change comparison groups skip without an export; legacy focused Spike
  checks pass. Ember passes 30 functional groups including ground attachment,
  all gravity directions, replay, snapshots, delayed rollback and 30/60/120Hz.
  Its one archived pre-Ember equality comparison differs at Spike frame zero
  due to the requested contact state/tuning; recorded in KNOWN_ISSUES.md without
  rewriting fixtures. Quick rollback passes 74 reconciliations/depth eight and
  transport/rematch stress. Browser checks pass 16 scenes at 720p/1080p, native
  sprite masks, render purity, ground fire, Spike touch, Pong perches, victory
  and offline asset smoke. Private WebRTC airborne and ground-fire runs pass
  matching hashes, delayed/lost input and rematch cleanup with 50ms delay,
  15ms jitter and 5% loss. Twenty syntax checks and diff checks pass.
  Ten-Ember short headless samples: p95 2.1ms, maximum 7.7ms, peak 96 flames;
  not sustained hardware or physical-controller certification. Screenshots and
  logs: artifacts/ember and artifacts/dash-pong. Build 86 peers must match.
  Ground-fire lifetime, heavyweight perch access and shield contact feel still
  need human playtesting. No assets, dependencies, historical fixtures or old
  release files changed, and no ZIP was produced.
- PATCH Ball Hell naming and card clarity: Tri-Ball and its Wraparound variant
  are now Ball Hell / Ball Hell: Wraparound in selection, settings, descriptions,
  HUD and future release text. Internal tri-ball IDs and stage indices remain
  unchanged for saved settings/replay compatibility. Card palette choices now
  read Color 1 through Color 4, with unchanged colors, ownership and Ready rules.
  Both online peers require matching build 83. Phantom's design is unchanged.
- PATCH turf scope correction: restored all authored Versus and Boulder stage
  textures, including High Perch Drift. Turf applies only to otherwise plain
  outdoor sports platforms; authored ground/edge textures take precedence.
- CANCELED the previously bookmarked Icer/Ember aura dash-counter idea at the
  user's request. Existing dash indicators and cosmetic auras stay unchanged.
- GitHub copy: the public jacobciolino/Dash-Punch repository is source-only by
  explicit user choice. GITHUB_SOURCE.md documents a fresh-tree upload that
  excludes all assets, binary media, releases, dependencies and private Git
  history. The exporter scans for embedded media/credential patterns and adds
  a public-only asset ignore rule and non-playable-source README notice.
  Never push this licensed-asset development history to that public repository.
  Verification: 13 Ball Hell gameplay/settings groups, five presentation groups
  and four naming/export groups pass. Covers exact pre-change gameplay/geometry,
  Phantom, snapshot/replay, rollback, 30/60/120Hz and preserved texture scope.
  Browser selection/settings and native ten-CPU/twenty-ball scenes pass; palette
  cycling covers all four labels at 720p/1080p without changing other seats or
  readiness. Fifteen syntax checks and diff checks pass. No historical fixtures,
  licensed sprite assets, gameplay tuning, existing releases or ZIP changed.
- FEATURE Sticky Ball football scoring: both stages now award six-point
  touchdowns and three-point loose-ball field goals, defaulting to 33 points
  and five minutes with tied next-score overtime. Traditional visual-only
  uprights use the established above-crossbar swept entry rule; initial overlap,
  backside travel, held balls and correction alone cannot score field goals.
  Strict crossing signs prevent a new slow-shot substep rounding failure.
  Goal/reset/countdown, possession, fumbles, carrier penalties and combat remain.
  Three 320x24 platforms share Y1100 from X1484 to X2996, approximately the
  30-yard lines; the elevated center tier is gone. Flip still reverses native
  gravity, while uprights remain fixed. CPU loose-ball shot aiming accounts for
  the elevated opening and gravity. Selection defaults, settings, descriptions,
  scoring feedback, saves and authoritative build 82 configuration are integrated.
  Old saved seven-point defaults migrate; snapshots/online configs do not.
- PATCH outdoor turf and pixel fixtures: natural/sky Versus scenery and outdoor
  sports scenery use cached green grass/earth platform art. Indoor hall/prison
  materials, floors, walls and collision geometry remain intact. Soccer nets,
  hoop nets/rims and upright frames use hard-edged four-unit native-pixel raster
  stamps with nearest-neighbor drawing and a 64-entry cache. Shared gameplay and
  preview rendering stay aligned; no licensed sprite/art assets were modified.
- PATCH match-end presentation: confirmed full-match completion captures the
  last game frame, fades it to black over .32 seconds, holds .10 seconds and
  reveals the existing victory screen over .26 seconds. One original .42-second
  synthesized swoosh accompanies each completed match, not each round. Repeated
  presentation/rollback cannot retrigger it; rematch clears it. Reduced motion
  uses a static blackout. Controls remain accessible and all fade state is local
  presentation only, outside snapshots and gameplay hashes.
  Verification for this batch: 21 Sticky Ball groups and five presentation
  groups pass; 14 shared match-flow groups and quick rollback pass (74
  reconciliations, depth eight). Includes slow/fast/radius/direction/correction
  scoring, both gravity states, 1v1-5v5, ten CPUs, 30/60/120Hz, snapshots/replay,
  delayed rollback and exact 0139f1e gameplay/geometry parity for every other
  sports arena. Real WebRTC Standard/Flip peers pass scoring, matching hashes,
  settings and rematch with 50ms delay/15ms jitter/5% loss. Browser checks pass
  22 views at 720p/1080p, inverted goals, settings, pure rendering, zero softened
  native stamp pixels, blackout and victory reveal; no runtime errors. All 13
  runtime syntax checks and diff checks pass. Screenshots: artifacts/sports-
  presentation; online results: artifacts/sticky-ball. Human turf/hoop aesthetic,
  loose-ball kicking opportunities and new platform spacing still need couch
  playtesting; no physical controller or exhaustive release suite was run. No
  dependencies, historical fixtures, existing releases or ZIP changed.
- PATCH Icer now has four air dashes, restored by the existing landing/reward
  and reset mechanics. Dash range, speed, mercy-dash tuning, ice effects and all
  other fighter data remain unchanged. Existing HUD symbols follow the new
  capacity; aura-based counters remain deferred. Private online peers require
  matching build 81. Verification: all 35 Icer groups pass, including exact
  pre-change fighter-data comparison, four launches/fifth rejection, snapshots,
  delayed rollback and 30/60/120 Hz. Quick rollback passes 74 reconciliations
  through depth eight. Focused browser checks pass four-stock HUD at 720p/1080p
  and 3/2/1/0 consumption with no runtime errors. Syntax and diff checks pass.
  No full browser/online suite, physical-controller test or release ZIP.
- FEATURE Dash Pong - Moving Goals: a separate stage beside original Pong, with
  mirrored 440-unit goal openings following each half's floor/outer-wall/ceiling
  perimeter. A smooth 72-second cycle includes two-second endpoint/wall pauses;
  goals bend continuously around corners and never cross midfield. Dotted rails,
  direction/pause marks, live previews and scoring effects share the goal data.
  Ball-only boundary cutouts leave fighter footing solid. Swept outward crossings
  require radius clearance; stationary overlap, goal movement and correction
  alone cannot score. Continuous ball-only resets preserve fighters and track;
  rounds/rematches reset the track. Existing Pong physics, speed settings,
  Battle rules, best-of-three and old stage indices stay unchanged. AI leads
  live openings and distributes defense using native inputs. Track time is
  fixed-step snapshot state; both private online peers require build 80.
  Verification: 16 new groups; 24 original Pong/regression groups with actual
  6364019 export (including every prior arena); 14 match-flow groups; quick
  rollback stress with 74 reconciliations/depth eight. New/original Pong both
  pass real WebRTC 1v1, 50ms delay/15ms jitter/5% loss, scoring and rematch.
  Browser: 14 goal-position/resolution views, stage/settings navigation, floor
  scoring and ten CPUs. Short headless update/render p95 2.5ms, max 3.2ms; not
  physical controller or sustained hardware validation. Native combat slowdown
  scales ball/track time together. Full-cycle containment caught and fixed a
  corner cutout orientation error before completion. Runtime syntax passes.
  Updated future core manifest order without building a release. No new art,
  dependencies, historical fixture edits or ZIP. Human tuning: goal pace and
  ceiling defense, especially heavyweight reach. See DASH_PONG.md and
  artifacts/dash-pong-track. Source preview: http://127.0.0.1:8095.
- BOOKMARK (canceled later on 2026-11-22): considered replacing Icer's
  on-character air-dash symbols with two countable frost crystals, and Ember's
  with four flame tongues. Each dims when spent and restores on landing; retain
  a faint cosmetic aura at zero and the tiny HUD counter as backup. This is an
  idea only, never an unfinished implementation task. The user has canceled it;
  keep existing dash counters and cosmetic auras. No implementation is planned.
- PATCH Ember flame aura: six small flickering flame tongues and sparse rising
  sparks surround his unchanged sprite, using the existing native flame art and
  orange/gold palette. One cached eight-frame atlas is shared by gameplay,
  character previews, lock-in flourishes and victories; gravity transforms,
  costumes, team outlines and KO hiding remain intact. Cosmetic only: no new
  hazards, particles, gameplay RNG, damage or snapshot fields.
  Verification: four focused groups pass, including cache/native-pixel checks,
  render purity and 240 exact pre-change combat/sports frames. Browser checks
  pass for 720p/1080p selection, nine movement/combat/gravity/KO scenes and
  victory; atlas has no soft pixels or face overlap. Existing sprite derivatives,
  source art definitions and physics modules are unchanged. Runtime syntax passes.
  Screenshots: artifacts/ember-aura. No dependencies, fixture changes or ZIP.
- PATCH chevron cloaks: Booster has three rows of repeating upward stitches;
  Lamer has matching downward rows. Native two-pixel chevrons follow the existing
  torso basis, clip to cloak fabric and use two palette shades for folds. Hood
  symbols/cuff accents, source PNGs, silhouettes and authored opacity are intact.
  Verification: five focused groups pass; other fighter derivatives and auras
  are byte-identical; gameplay/physics/asset-definition sources are unchanged.
  Browser compares 28 native clips against 2a97147 with unchanged face/alpha,
  cache reuse, six-player 720p/1080p views, flourishes and victory render purity.
  Screenshots: artifacts/chevron-cloaks. No mechanics, fixtures or ZIP changed.
- PATCH ball impact flare: eligible sports balls briefly hold their visual impact
  pose, compress along the contact direction, stretch into launch and settle.
  Actual impact strength scales the hold from 1-3 frames (17-50ms), squish from
  6-19% and stretch from 4-16%; launch/settle take 65/75ms. Ball physics, hitboxes,
  trajectories, scoring and fighter timing never pause or change. Visual lag is
  capped below one radius. Quidditch/Golden Rush and Total Rush small balls,
  golden targets and every boulder retain their original appearance/behavior.
  Shared optional contact notifications cover melee, projectiles, Kickoffs,
  shields, body redirects, walls/platforms, targets and ball-ball rebounds.
  Existing presentation snapshots handle replay; one bounded effect per ball,
  no new gameplay state/RNG or particles. Wrap copies deform independently.
  Sticky Ball and Pong use tiny cached native sprites so stretching stays sharp;
  their undeformed art is pixel-identical to the prior renderer.
  Verification: 11 new groups, including snapshots, delayed rollback, 30/60/120Hz,
  exclusions, dedup/reset and 1080 exact pre-change frames across all 24 stages.
  Existing Dash Pong: 22 pass; its two optional export comparisons were not run,
  with immediate-before equality covered separately above. Browser smoke passes
  seven ball families/all animation phases, eight 720p/1080p scenes and ten
  fighters/five active balls (short headless render p95 0.6ms, not a hardware
  benchmark). Runtime syntax passes. Human feel remains to be playtested.
  Screenshots: artifacts/ball-impact. No historical fixtures or ZIP changed.
- PATCH Icer frost aura: pale-blue stepped vapor wisps and tiny ice crystals
  drift around his unchanged native sprite. A cached eight-frame pixel atlas
  reuses the existing aura path for gameplay, selection previews, lock-in
  flourishes and victory screens; costumes, gravity transforms and KO hiding
  remain intact. No blur, new particles, gameplay RNG or snapshot fields.
  Verification: 13 focused Icer-aura/Shockston/status-aura groups pass, including
  byte-identical sprite derivatives/electricity, state purity and 360 exact
  pre-change Icer combat/sports frames. Browser checks pass for 720p/1080p
  selection, eight gameplay/gravity/KO states, native-pixel atlas and victory.
  Runtime syntax passes; screenshots: artifacts/icer-aura. No stats, physics,
  licensed PNGs or historical fixtures changed; no dependencies or ZIP.
- PATCH status auras: Boosted fighters now have rising pale-gold/green pixel
  streaks; Lamed fighters have falling purple streaks. Thin three-unit cores
  use a restrained stepped glow, stay beside the body, and follow gravity.
  Both can render together; suppression stacks and expiration feedback remain.
  Eight closed-form streaks per effect replace Booster's older generic aura;
  no particles, textures, gameplay RNG, stat changes or snapshot fields added.
  Verification: four focused groups, directional/pixel-grid checks, independent
  expiry/KO cleanup, render/hash purity in four gravity directions, and 480 exact
  pre-change combat/Dash Pong frames with combined statuses. Browser smoke passes
  at 720p/1080p in normal/inverted gravity with six fighters; ten-fighter rendering
  stays state-pure (short headless sample p95 0.6ms, not a hardware benchmark).
  Runtime syntax passes; screenshots: artifacts/status-auras. No ZIP.
- PATCH Wizard: Gun Man's display name is now Wizard. Three differently tipped
  spare wands sit in a diagonal leather chest bandolier, rendered as cached native
  Seeker PRO pixels across the existing poses. The held wand, source PNGs, face,
  transparency, frame anchors, costumes and timing remain unchanged. Keeping the
  `gunman` ID preserves roster position, saves and online configuration; magazine
  capacity stays three and reload stays 1.1 seconds. Updated current UI notes and
  player documentation without renaming the unrelated Gooder experiment.
  Verification: five Wizard groups, 600 exact prior-version combat/sports frames,
  resource/stat equality and snapshot restoration; byte-identical other-fighter
  art; 13 native clips preserve alpha/face pixels; 720p/1080p selection, gameplay
  and victory naming in browser. Five Lancer groups also pass. Its original art
  reference remains; Wizard's explicitly approved new appearance is now covered
  by its own immediate-before comparison. No historical replay fixture changes,
  dependencies or ZIP. Screenshots: artifacts/wizard/appearance.png.
- PATCH Shockston: renamed Micro USB throughout data-driven menus, HUD and victory
  labels while retaining the `microusb` ID, roster slot, saved choices and online
  configuration. Added a restrained cyan/white pixel-electric aura behind the
  unchanged static-pattern cloak. One cached eight-frame native atlas is shared
  by gameplay, sprite previews, card flourishes and victory rendering; no new
  gameplay objects, RNG calls, snapshot fields, blur or source PNG edits.
  Verification: five Shockston groups, 480 exact pre-change fighting/sports frames
  including rounds and electric follow-ups, immutable stats/resources, render/hash
  purity; 720p/1080p selection, seven animation/gravity/KO views, ten fighters and
  victory naming in browser. Existing micro-usb.test.js defenses, three electrical
  pulses and state restoration pass. Five Lancer art/gameplay groups also pass. Its test
  now checks the same original fighter data, simulation and licensed PNGs instead
  of freezing the entire unrelated game.js file; reference 48a1352 is unchanged.
  Screenshots: artifacts/shockston. No gameplay changes, dependencies or ZIP.
- PATCH Lancer carried-spear placement: the native-pixel spear now angles up-left
  from his grip over the old sword position, matching the supplied markup instead
  of standing upright behind the opposite shoulder. A broader stepped spearhead
  stays distinct at gameplay size. Pose-aware fitting keeps the grip attached and
  tip inside authored frames; held/attack states do not gain a second weapon.
  Source PNGs, timing, hitboxes and gameplay files are untouched. Five focused
  groups pass, including byte-identical other-fighter art and unchanged runtime
  source; browser checks cover native poses, 720p/1080p roster previews and state
  purity. Before/after: artifacts/lancer-carried-spear/comparison.png. No ZIP.
- FEATURE Ember, core fighter 21: 132 HP (66 Battle), 13 base punch damage,
  68% ordinary walk speed, four short .28s air-dash carries and a fragile
  24-durability shield. Native Seeker PRO charcoal cloth, ember markings and
  flame eyes preserve source PNGs, anchors and animation timing. Rain's cached
  fist renderer supplies a separate fire palette, flame edges and brief smoke.
  Snapshot-owned .14s flame segments deal three damage once per fighter per
  dash, with tiny gravity-relative displacement and no stun, hitstop, combo
  credit or hit-reward refills. Melee, projectiles, shields and sports objects
  extinguish segments before body damage; per-ball/dash ledgers prevent stacked
  deflections. Shield contact deals two damage once per entry without added stun.
  Campfire health art, four flaming/toasted marshmallows, Kickoff puffs and
  shield flames preserve universal warnings, team colors and resource state.
  Verification: 26 focused groups; 1320 exact prior-roster/sport simulation frames
  against the actual a2f06be export; snapshots, replay, delayed rollback,
  30/60/120Hz and ten CPUs; quick rollback stress (74 reconciliations, depth 8);
  12 720p/1080p browser scenes, native-alpha preservation, offline embedded-art
  smoke, victory rendering and Rain fist regression; real WebRTC at 50ms delay,
  15ms jitter and 5% loss with matched hashes and rematch cleanup. Ten-CPU
  180-frame measured sample: Ember p95 1.6ms / max 7ms, Rain 1.9ms / 14.9ms;
  short headless sample only, not sustained hardware certification. Human feel
  and balance remain unverified. Build 79 requires matching peers. Future core
  packaging includes the new module; existing releases and historical fixtures
  are untouched. FEATURE only, no ZIP. See EMBER.md and artifacts/ember.
- PATCH pixel-art menu controls: buttons and option tiles now use crisp two-pixel
  stepped frames instead of soft rounded edges. Settings steppers, card arrows
  and close/remove symbols use native pixel glyphs; focus, selected and team
  colors remain clear. Covers shared menus, private cards and builder controls
  without changing labels, fonts, layout dimensions, source art or input rules.
  Verification: 16 before/after screen samples at 720p/1080p preserve button
  bounds, typography, artwork and simulation hashes; rendered corner samples
  contain no smoothed pixels. Existing radial and controller-only lobby browser
  suites pass, including ten-player layouts. Physical controller feel remains
  a human check. Screenshots: artifacts/pixel-menu. No gameplay change or ZIP.
- CHECK menu pixel-star coverage: the existing shared dash-style star background
  already runs on stage select, general settings, sports settings and controls.
  Extended browser coverage to verify actual destinations after radial transitions
  (not the previous screen), animation, black background, input pass-through,
  reduced motion and gameplay hiding at 720p/1080p. All 12 screen/size samples and
  four particle-unit groups pass. Runtime artwork/effects unchanged; no ZIP.
- PATCH pause menus no longer host player cards. Paused state explicitly blocks
  roster/card editing even in legacy matches without a round session, and pause
  rendering clears stale open-card/flourish flags. Selections, teams, Ready,
  controller ownership and simulation state are unchanged. Joined controllers
  retain shared settings and Start-to-resume; pre-match card setup still works.
  Browser checks: six stale editors, session/legacy pause paths at 720p/1080p,
  P2 settings/resume, no unjoined/keyboard card opening, unchanged state hashes;
  controller-only lobby setup regression also passes. No ZIP or gameplay change.
- PATCH controller-only lobby setup: the private review wheel now offers Add CPU,
  Settings and Lobby. Add CPU creates another participant instead of replacing
  the owner. Joined keyboard/controller seats, choices, teams and Ready states
  remain protected. Ready cards expose the same setup actions without unreadying.
  View/Select or Lobby hands control to the shared Add CPU / Match Settings /
  Choose Stage toolbar (Settings at capacity). Each controller must release its
  held input before controlling that toolbar; other controllers are not blocked.
  Settings returns to that toolbar, with nested Dashball/Showdown rules returning
  to their actual parent. Internal card Back and the 1.6s shared Back hold remain.
  Eight-option wheels fit without overlap at 720p/1080p with 2, 6 and 10 cards.
  Verification: player-card, shared-input, radial and hold-Back unit groups;
  2520 exact gameplay frames against the actual 96db176 pre-change export;
  simulated controller-only bot add/edit/remove, P2 setup while P1 edits, Ready,
  held-input/capacity safety, keyboard fallback and nested sports settings;
  existing radial browser regression. No physical-controller claim, gameplay
  changes, dependencies or ZIP. Screenshots: artifacts/lobby-setup.
- FEATURE Dash Pong: Battle-only closed 2240x1280 chamber, Blue left / Red right,
  mid-wall goals, fixed .5 camera (1.92x Tri-Ball apparent fighter height).
  Radius-34 gravity-free ball starts stationary at exact center; first real hit
  launches at 520 units/sec, subsequent contacts add 55 to a 1600 default cap
  (settings 800-2200). Perfect wall rebounds never increase rally speed.
  Swept full-radius goal clearance awards one point, immediately replaces only
  the ball, and preserves fighter/combat/respawn state. Defaults: 10 goals,
  five-minute simulation clock, tied next-goal overtime, first to two rounds.
  Reused Battle, native attacks/shields/possession/projectiles, round flow,
  snapshots and host-authoritative private WebRTC 1v1; new native CPU roles,
  real-renderer preview, pixel orb/trail/spawn feedback and procedural Pong tones.
  Existing stage IDs stay stable; no new assets, dependencies, fighter rebalance
  or changes to other sports. Build 78 requires matching online peers.
  Verification: 24 Dash Pong groups, including actual 6e444e9 export comparison
  across all previous sports, 1v1-5v5, 30/60/120Hz, snapshots and delayed replay;
  14 match-flow groups; quick rollback stress (74 reconciliations, depth 8);
  720p/1080p browser checks and real WebRTC at 50ms delay, 15ms jitter, 5% loss,
  synchronized fast goal / stationary replacement / custom cap and rematch.
  Ten-CPU headless sample: 240 measured simulation+draw frames, p95 2.5ms,
  max 3.2ms. Human controller feel, heavyweight center access and rally balance
  remain playtest questions. Historical fixtures and existing ZIP unchanged;
  FEATURE only, no release build. See DASH_PONG.md.
- FEATURE Icer, core fighter 20: 102 HP (51 Battle), 24 shield durability, two
  Anchor-length air dashes, .18x ground acceleration, .995 retained ground speed
  and a short 318-636 launch-speed ground dash. Ordinary ice-blade punch uses
  existing timing, aiming, sports strikes and reward rules. Original Seeker PRO
  sheets remain intact; cached native edits add fur trim, cyan eyes and snowflake
  cloth. Compact HUD has a frozen thermometer and two snowflake/droplet dash marks;
  universal low-health, shield-break, resource and team indicators stay intact.
  Air dashes trace their actual path, then place three evenly spaced icicles.
  They hang .4s, fall world-down, deal six damage without added stun/launch/refills,
  and share a once-per-target damage ledger for each dash/break event. Native
  melee/projectiles/shields/terrain/balls destroy them through swept contacts;
  ball ownership/scoring stay native. Ground dashes leave .9s surface-anchored,
  destructible ice that reduces friction/braking for every team. Genuine shield
  break emits three icicles without removing stun or restoring resources; normal
  timeout does not. State is bounded and lives in existing fighter snapshots,
  with no independent update loop or new dependencies. Matching peers use build 77.
  All 61 focused Icer/movement/shield groups pass, including rate equivalence,
  snapshot/replay, delayed rollback, terrain/gravity/wrap, native scoring after
  ice contact and exact non-Icer parity against 654ccf2. Reduced rollback stress
  passes 74 recoveries. Browser checks pass 14 native sheets, 14 gameplay scenes
  at 720p/1080p, selection/flourish/victory and offline embedded-art loading.
  Real WebRTC peers agree on native air-dash hazards and clean rematch at 50ms
  delay, 15ms jitter and 5% loss. Warm short ten-CPU p95: Anchor ~1.5ms, Icer
  ~1.6ms, 21 peak icicles, bounded caches; not physical hardware/balance approval.
  The run-test comparison now checks fighters actually present in its old source,
  rather than trying to instantiate the newly added Icer there; no historical
  baseline or fixture was replaced. Core builder includes ice.js and dynamic
  roster/stage counts for the next release. No build or ZIP; Ember remains queued.
- PATCH queued ground movement: 2.8s uninterrupted walking then .7s acceleration
  to 1.65x character-specific walk speed, capped at .85x uncharged ground dash.
  Existing Run sheets play faster; no new art/input/resource. Release/reversal,
  crouch, dash, combat interruption, airtime and gravity changes restart run-up.
  Running jumps keep actual lateral takeoff velocity. Accepted crouches set
  ground-tangent velocity to zero without clearing attack, recovery, dash-parry,
  skid or resource timers; held crouch waits for existing attack/whiff restrictions.
  Sticky Ball's .5 carrier walk modifier remains. Run state snapshots through the
  existing generic fighter serializer; matching peers now require build 76.
  All 39 focused run/shield/Sticky Ball groups, rate equivalence, delayed rollback
  and reduced transport/rematch stress pass. Browser checks cover eight native-sprite
  720p/1080p scenes and real keyboard events. The existing real WebRTC check passes
  Edgebert contacts and Boomerangus recall/rematch at 50ms delay, 15ms jitter and
  5% packet loss; its click helper now waits for the approved radial wipe before
  clicking the next screen, rather than clicking during its input lock.
  One existing Whipado source-matcher
  test fails identically before the patch (nine functional groups pass); historical
  fixtures remain untouched. Icer/Ember remain queued. No build or ZIP.
- PATCH fighter refinements: Reverso now has green spiral eyes only, with his
  original mouth preserved and no tongue. Whipado's attack is a tapered pixel
  tentacle. Micro USB has frame-baked, cloth-clipped TV static. Booster has a
  larger cross and contrasting cuff bands; Lamer has a larger thumbs-down mark
  and cloak chevrons. Sword cleanup also covers aerial/directional attacks and
  Archer's melee sheet; Lancer keeps his existing spear instead. Phantom is
  unchanged. Licensed artwork, timing, hitboxes and physics remain untouched.
  All 16 focused groups pass, including pre-feature simulation parity, delayed
  rollback and 30/60/120Hz. Browser checks pass for 239 sheets, extra weapon
  poses, four ten-fighter 720p/1080p scenes and offline embedded art. Warm
  headless ten-CPU p95 is 2.6ms; this is not a physical-TV readability test.
  No release build or ZIP; the previously shared release remains untouched.

## 2026-11-21
- POST-RELEASE FEATURE fighter presentation: Edgebert has native-pixel horns,
  brows and one fang; Rain has a soft-following cloud and sparse droplets;
  Orbit leaves fading sprite/halo samples along his actual curved dash path.
  Gun Man carries a hand-attached wand, Archer a back quiver, and Whipado small
  idle cloak tentacles. Reverso has face-contained spiral eyes/mouth and a
  compact animated pixel vortex. Booster/Lamer have cloth-clipped plus/thumbs-
  down hood marks. Phantom's longer flowing cloak hides his legs and eyes.
  Lancer carries one back spear, hides it during charge/attack/withdrawal and
  displays the existing in-hand weapon through windup/recovery. Chungus's arm
  now connects from inside the shoulder to the existing fist endpoint, with
  coherent short extensions and matching costume color. Anchor, Kite, Spike,
  Reflektor, Boomerangus, Micro USB and DefiPlate artwork is untouched.
  Rain/Reverso/Booster/Lamer use cached derived attack frames with the baked
  green slash and blade removed, preserving their body motion, eyes and native
  frame timing. Licensed PNGs remain byte-identical; no new raster assets or
  dependencies. Pose masks, bow/cast-specific roots and nearest-neighbor pixels
  are shared by gameplay, previews, flourishes and victory rendering. The
  original all-white hurt flashes and dissolving death frames remain intact.
  Derived sheets are capped at 128 / four million pixels; Orbit at nine samples
  per fighter, clouds at one per living Rain. Tethers/trails save only in the
  presentation portion of snapshots, never gameplay hashes. Stats, hitboxes,
  attack timing, controls, stages and scoring remain unchanged.
  Fourteen focused groups pass, including immediate-af5b795 simulation parity,
  snapshot restoration, six-frame delayed rollback, 30/60/120Hz and four-way
  gravity. Browser checks cover 239 sheets, source preservation, hard alpha,
  weapon visibility, 19-character before/after galleries, facing/state samples,
  four ten-player 720p/1080p scenes and offline file rendering with existing
  release embedding. Existing team-silhouette, Rain water-fist and card-flourish
  visual checks pass. Warm ten-CPU update/render p95 about 2.6ms headless;
  synthetic ten-Orbit stress peaked at 80 ghosts, then expired completely.
  These are not physical-controller/TV or subjective artwork certification.
  Native facial/hood details remain intentionally tiny; human couch readability
  and attachment feel still need playtesting. No release build or ZIP.
- POST-RELEASE FEATURE radial menus: the existing Play hub now places Local,
  Online 1v1, Dashball, Sandbag, Settings and Stage Builder around animated
  Anchor. The title entry and conventional settings/stage/editor screens remain;
  future core builds substitute Controls for the intentionally omitted editor.
  Locked-in human cards independently show their selected fighter surrounded by
  Team (when applicable), Color, Ready, Fighters, CPU and Leave. The full roster
  grid is unchanged. Existing two-cycle/shield/phase flourishes hand off to idle;
  editing can skip them. Native signature attacks aim at the actual option angle,
  with sparks, recoil, flash, outward spin and a corner-covering pixel wipe.
  Impact is at 95ms; shared navigation commits at 250ms and reveals by 380ms.
  Card actions commit at 210ms; repeatable settings at 140ms, recovering by
  180ms. Fresh rapid setting presses complete each prior change exactly once
  without a queue; held inputs never repeat confirmation. Analog aim snaps to
  sectors. Private setting presses survive another controller's shared-screen
  navigation; changing or closing the owning card cancels its pending feedback.
  Neutral retains focus, conflicting simultaneous shared aims cancel,
  and fresh aim overrides a held selection. Keyboard arrows cycle every option.
  Mouse, shared authority, explicit Ready, immediate private Back/View and the
  1.6-second shared Back hold remain. The older Punch-confirm/Dash-back proposal
  is not applied because the current AGENTS.md explicitly preserves controls.
  Menu state stays outside combat snapshots and hashes; no new hitboxes or art.
  Seven new focused groups, immediate-prior fighter/sports parity, existing
  shared-menu/card/Back unit checks and browser lifecycle/layout/offline checks
  pass, including 19 native attack poses and 2/4/6/10 cards at 720p/1080p. Frozen
  browser harnesses now advance presentation time and aim at radial sectors;
  historical gameplay fixtures remain untouched. The older flourish suite's
  fixed fd02b02 timeline comparison still fails at Anchor frame 37 from the
  already-requested local-hitstop change; its six functional groups pass.
  Physical controllers and subjective menu feel still need human validation.
  Warm ten-card render-only sampling used a stable 20 canvases; observed p95
  ranged .2-1.1ms across headless runs, not a TV/hardware frame-time guarantee.
  No ZIP or release build; the verified game-night archive is unchanged.
- POST-RELEASE PATCH local combat impacts: damaging melee hits use 2/4/6/8
  fixed-tick hitstop according to actual damage/launch strength. Edgebert's
  setup strikes and electric follow-ups use one tick; his finisher uses 5-6.
  Melee progression pauses with its owner, while independent projectiles retain
  their lifecycle. Clashes use 3/4/5 ticks and blocks 2-4; existing projectile
  pressure scaling and special parry/break behavior remain. Ordinary hit/clash/
  block slow motion and camera shake are removed; unrelated fighters and balls
  keep moving. Original damage, launch vectors, chip, shield loss and reflections
  are retained. Yellow/orange hit stars and perpendicular cyan clash shards use
  actual convex overlap points, a 256-particle cap and presentation-only shake.
  Interrupted Lancer spears withdraw visually for .12s with no collision; CLASH
  text is debug-only. Build 75 requires matching peers. Ten new focused groups,
  eleven Edgebert groups, Fired Up audio, 74 rollback reconciliations across the
  quick transport/stress cases, twelve browser scenes and real WebRTC combo/
  recall/rematch checks pass. Reflektor's 17 functional groups pass; its archived
  whole-simulation equality test differs after the requested timing change.
  The older recall-online script presses during the three-second countdown and
  times out without a throw; the new current-flow online test waits for playing
  and verifies native recall. Neither old test nor historical fixtures changed.
  Ten-fighter contact-stress rendering p95 about 1ms headless, not hardware
  certification. No ZIP; the game-night release remains frozen.
- POST-RELEASE FEATURE sports scenery: twenty implemented sports variants share
  five layered pixel themes: Sky, Ancient Temple, Castle Interior, Castle
  Courtyard and dusk-graded Castle Roof/Citadel. Boulder/Total Rush, Versus and
  Sandbag retain existing scenery; no nonexistent Pendulum stage was added.
  Imported 23 unchanged PNGs from three owner-supplied CraftPix freebie archives,
  retaining source hashes and publisher-license notes. Three cached nearest-
  neighbor layers use subtle integer cloud drift in Enhanced, static layers in
  Classic, flat readability veils and no blur/bloom. Previews share the profiles.
  Future core packaging preserves/embeds used themes and notices; no build/ZIP
  was run. Six focused groups, all 23 arenas' immediate-prior simulation/camera
  parity and restoration, the existing 810-frame stage-renderer test, 20 browser
  scenes and 30 offline renderer samples pass. Warm ten-CPU/ten-ball sample:
  combined p95 2.1ms Classic/1.6ms Enhanced; render p95 1.0/.6ms headless.
  An earlier first-use mixed run had one 214ms spike, not reproduced after a
  longer warm-up; this is not a hardware frame-pacing guarantee. Citadel uses
  the supplied castle terrace rather than a bespoke distant-tower skyline.
- POST-RELEASE PATCH lock-in flourishes: each local card independently plays two
  native uncharged attack cycles with shared signature-effect renderers. Spike
  and Reflektor briefly display their real shield artwork without durability UI;
  Phantom phases at 40% opacity, stationary in the portrait. Centered canvases
  temporarily use the wider card portrait, then restore idle. Back, Close,
  costume/character changes, Ready and leaving cancel only the owner's flourish.
  No gameplay objects, resources or Ready transitions are generated by animation.
  Seven focused groups pass, including all nineteen fighters' immediate-prior
  simulation parity; seven existing shield presentation groups also pass.
  Browser checks pass for nineteen native previews, two loops, ten simultaneous
  owners, keyboard/controller edges and 720p/1080p containment. Physical pads
  remain untested. Long native Whipado/Lancer hold animations remain skippable
  through ordinary card actions. Post-lock-in radial integration is still pending.
  No ZIP built; the verified game-night ZIP is unchanged.
- POST-RELEASE FEATURE HUD readability: nineteen core fighters now have distinct
  pixel-column health silhouettes within the unchanged 58px strip. World-anchored
  themed dash marks show actual charges/banked stock, with compact rows, separate
  ammo/P-number spacing and brief refill feedback. Universal shared pixel icons
  replace large defensive rings. Neutral gray stepped charge/active outlines use
  existing hitbox vertices. At <=25% HP a brief red sprite tint pulses every
  .72 seconds, preserving alpha, Phantom transparency and separate team outlines;
  damage/spawn flashes take priority. Source sprites and all gameplay stay intact.
  Eight new groups plus eight compact-HUD groups pass, including immediate-prior
  simulation parity and delayed rollback. Browser checks cover 73 tint masks,
  nineteen fighters, 720p/1080p scenes and existing compact layouts. Ten-low-HP
  render sample p95 .7ms headless, not hardware certification. No ZIP built.
- POST-RELEASE PATCH magical shields: existing directional ellipse, coverage,
  padding and distinctive Spike spikes/Reflektor ribs now use crisp stepped
  luminous segments with a restrained sustained shimmer. Confirmed blocks get a
  3-4-frame white-cyan flash, contact ripple and small pixel fragments. Genuine
  breaks fracture the actual arc and emit 18/20/24 short-lived shards; normal
  release/timeout never shatters. All fragments remain cosmetic and capped at
  240. Ball callbacks provide their contact position without changing physics.
  Seven focused presentation groups, all 18 Reflektor mechanics/rollback/rate
  cases and 20 browser scenes/performance samples pass. Ten-shield render sample
  p95 about 0.9ms headless, not a hardware guarantee. No new ZIP.
- POST-RELEASE PATCH projectile presentation: Gun Man gets a small cyan stepped
  silhouette glow and narrow short-lived sparks; Archer gets violet/pale-gold
  accents and longer, heavier pixel fragments. Original projectile art, bounds,
  ownership cues and mechanics remain. Shared silhouette caching is bounded at
  24 frames/150k pixels; trail fragments cap at 192 and expire after destruction.
  Boomerangus's three-band pixel shadow projects to the nearest actual terrain
  surface along gravity, respecting platforms, moving terrain and floor pits.
  Ten focused tests and browser frame-cache/alpha/render-purity checks pass.
  Ten-fighter projectile sample: 113 peak fragments, 1.1ms median/2.6ms p95
  update/draw in headless software rendering, not a live hardware guarantee.
  Existing Charged Recall behavior/rate/rollback groups pass; its final archived
  roster comparison still fails on previously approved Orbit dash changes.
  Historical fixtures remain untouched. No release or ZIP built.
- POST-RELEASE PATCH compact HUD: replaced stacked health displays with one
  58px top strip. Authoritative Blue fighters appear on the left and Red on the
  right, including Sandbag's inverse mapping. FFA stays in stable player order.
  Each entry keeps its P-number, compact fighter motif/name, pixel-snapped HP,
  shield, dash/punch stock, escape/parry readiness and projectile ammo/reload.
  Center score/time/round wins and sports objective status remain; Target Charge
  keeps square progress meters. Player tags now also appear in ordinary Versus.
  The old DOM round text remains accessible but no longer reserves stage space;
  camera zoom, stage dimensions and physics are unchanged. Pause moves below the
  strip to avoid covering the rightmost player. Eight focused tests, 16 browser
  layouts at 720p/1080p, and all 14 match-flow groups pass. No new ZIP.
- POST-RELEASE PATCH menu backgrounds: a capped 72-star presentation pool uses
  crisp two-pixel-scale stars, roster effect colors, varied directions and short
  occasional streaks on black. It sits behind menus and builder panels, masks
  text/portrait regions, pauses during gameplay/hidden tabs, and becomes static
  under reduced motion. Existing title artwork and gameplay dash effects remain.
  Four focused tests and 720p/1080p browser screens/navigation/reduced-motion
  checks pass. Source server and future core packaging include the local module;
  no assets/dependencies or ZIP added. Tonight's release stays unchanged.
- POST-RELEASE PATCH audiovisual feedback: character-specific attack execution
  sounds now play once per strike (Edgebert light/light/heavy); projectile cues
  wait for successful creation. Existing Lancer and impact sounds remain separate.
  Every already-Fired-Up clash gets one original brass/string synth stab, without
  a rapid-clash cooldown. Every confirmed KO gets the universal descending boom
  and a short, sprite-bounded pixel KO/P-number burst above its existing marker.
  Charged super jumps use actual upward launch velocity for their rising synth
  sound and 22-38 takeoff dirt fragments. Ordinary ground dashes emit eight small
  fragments plus a sparse two-particle trail; air dashes emit no ground debris.
  Cosmetic debris is capped at 480; overlapping musical/KO/attack voices reduce
  gain rather than discarding legitimate events. No new assets or dependencies.
  Twelve focused groups pass, including exact pre-patch gameplay hashes across
  the registered roster, snapshots, delayed rollback and 30/60/120Hz. Browser
  Web Audio synthesis, 720p/1080p rendering and ten-player capped-burst checks pass;
  no physical playback/controller or subjective audio-mix certification. Build 74.
  Tonight's verified ZIP is unchanged; no new release built.
- POST-RELEASE PATCH Lancer: fighter hit records now persist for the entire
  attack, including tip separation/re-entry. Sports-object rearming is unchanged.
  Physical separation checks local swept exits against stage solids and other
  fighters, prefers the contact side, and can choose the opposite clear side.
  Genuine pins retain legal stage positions instead of alternating corrections.
  No extra recoil or changes to reach, zones, power, hold, gravity or movement.
  Eight new separation tests and all 29 existing Lancer tests pass; the combined
  Edgebert/Lancer run passes 48 cases including rollback/rate checks. Browser
  phase, stand/wall-cling and victory smoke passes. Build 73, no new ZIP.
- POST-RELEASE PATCH Edgebert: complete three-hit sequence 960ms -> 425ms, derived
  from Anchor's actual tap startup/active/recovery. Tap/full damage is 1/2, 1/2,
  15/27; fighter force 35/42, 45/54, 820/1558. Brief setup hitstun/hitstop and no
  setup auto-lift keep stationary/moving targets nearby, with the native finisher
  launch and stronger impact feedback. Opening ball force is 80/100; the finisher
  retains the existing 1040 floor. Charge, aim, interrupts, movement/HP/shields
  stay intact. Eleven focused tests, delayed rollback, 30/60/120Hz and native
  keyboard/three-stage animation browser checks pass. Build 72 on the feature
  branch; not included in tonight's frozen ZIP. No additional release built.
- RELEASE core-only game-night ZIP: 19 fighters, 12 combat stages, 23 Dashball
  stages and existing Sandbag rules. Concise current play guide and recent patch
  notes replace the distributed historical instructions. Required art, fonts,
  audio and licenses remain; experimental content and development files are omitted.
- Fixed file:// Tri-Ball recoloring by embedding neutral objective sheets and
  resolving them through the shared image cache. Retained Whirlwell's CSS texture
  file and corrected manifest stage order to match the existing runtime order.
  No gameplay/physics/input changes. Failed draft candidates were preserved.
- Verified final package parity over 3,480 simulation frames, twelve replays,
  ten-player stages, every core fighter's configuration and asset checksums.
  Browser checks cover all bundled sprite loading, controller menus, offline
  play, real WebRTC rollback/rematch and disconnect. Fresh-unzip offline ten-CPU
  Tri-Ball passes at 720p/1080p with no external requests or runtime errors.
  Headless ten-player sample: 16.7ms median / 16.8ms p95, not hardware certification.
- Historical regression expectations remain mismatched, including old no-refill
  Phantom, goal-entry restrictions, roster/timing counts and archived Rain/Orbit
  snapshots. Full sweep logs are in artifacts/release-2026-11-21; no fixtures were
  regenerated. Latest submitted feature batch is deliberately outside this ZIP.
  Final: exports/Release-2026-11-21-Verified/Dash Punch V1 - 2026-11-21.zip.

## 2026-11-18
- PATCH Lancer: shaft/haft hit only through thrust plus 100ms of full extension,
  then remain harmless solid terrain. The tip stays active through retraction.
  Native landing, walking, jumping, wall-cling/jump and rider displacement now
  use the thin oriented lance, including Court, allies and inverted gravity.
  Swept contacts prevent fighter tunneling; carry applies once, not once per
  collision retry. Existing shorter reach, damage, timing, tip-separation rearm,
  sports barrier and owner gravity remain. Prior geometry snapshots with attacks.
- Verification: 29 Lancer checks plus 16 Lamer/Phantom checks pass, including
  snapshot/replay, delayed rollback and 30/60/120Hz. Quick core rollback passes
  with 74 recoveries and rematch. Browser phase/surface/victory checks pass at
  720p/1080p; real WebRTC hashes, delayed inputs and rematch pass on retry after
  an initial wait timeout. Failure diagnostics are retained by the online runner.
  Build 71; no ZIP, fixture regeneration or physical-controller certification.

## 2026-11-17
- PATCH Dashball setup: mode entry shows general rules, with Battle as Tri-Ball's
  default. Confirming a Tri-Ball stage opens its objective settings; Done returns
  to that selected stage. Court remains selectable. Thirteen Tri-Ball tests,
  shared-controller/menu browser checks, 720p/1080p settings and real WebRTC
  delayed-input/hash/rematch checks pass. No simulation tuning or ZIP.
- PATCH Phantom: fresh Dash presses cancel the active ghost at its input endpoint,
  resolve one materialization, then redirect into a new ghost if a charge exists.
  Valid materialization contacts refill native punch resources before the new
  dash consumes one; misses refund nothing. Held inputs and hitstop cannot farm
  cancels. Damage is 28, just above his 26-air/27-ground full-charge Punch;
  knockback 110 and object impulse 120 remain. Pending redirects snapshot and
  clear on KO/reset. Ordinary solid punches retain their existing refill rules.
  Eleven new tests and all 55 existing Phantom tests pass, including every
  ten-CPU sport, snapshots, delayed rollback and 30/60/120Hz. Actual keyboard
  cancel, real WebRTC hashes and rematch pass with 50ms/15ms/5% network simulation.
  Lancer's 17 tests and phase browser checks pass. Charged Recall functional checks
  pass, but its archived Orbit configuration comparison still differs; no fixture
  regenerated. Build 70, no ZIP or physical-controller certification.
- PATCH Lancer: shortened reach by 10% to 445.248 tap / 463.248 full, shaft
  damage 8/25 -> 4/12, tip/haft damage and all knockback/timing/movement unchanged.
  Tip-hit targets rearm after four-unit separation from the lance; contact maps
  and shield rewards serialize and rearm together. No overlap farming, duration
  restart, or rearming of shaft-only victims. Seventeen focused Lancer/contact/
  rollback/rate checks pass. Build 69; no ZIP.
- PATCH Lamer fighter launch: now 95% of Chungus at equal charge, 988 tap /
  1877.2 full, instead of 1000 / 12000. Existing direct punch direction and
  no-lift behavior keep launches straight without added arc or attacker momentum.
  Fighter-only scaling preserves damage, suppression, timing, movement, shield
  recoil and the stronger sports-object impulse. Five targeted balance/replay/
  rate checks and the 23 existing Lamer tests pass. Build 68; no ZIP.
- FEATURE Tri-Ball / Tri-Ball: Wraparound: continuous 5/3/1 basket/soccer/field
  scoring, individual safe ball recycling, 4480x1800 arena, open sky and native
  560-wide 14-second center lift. Court/Battle, 33-point/5-minute default and
  complete bounded settings. Independent 90-second/3-combined-point spawns;
  optional caps suppress without queuing. Automatic single-ball radius x1.15,
  mass x1.5, reduced drag and suggested 10-point target preserve explicit choices.
  Vertical torus uses full-width pass-through floor, seam contacts/ghosts and
  split projectile paths; no new controls, KO/resource reset or phantom scores.
- Requested roster/arena refinements: Booster/Lamer final HP 145; Lamer damage
  7-11 and nominal knockback 1000-12000 with existing charge/debuff rules.
  Reflektor's user-authorized Void cloth copy gains native-pixel mirror facets.
  Gravity Boulder neutral perch now travels horizontally around center on a
  ten-second cycle; both bonus platforms/windows retain vertical gravity motion.
  Native rider displacement now includes X for marked moving sports platforms.
- Global successful punch recovery: effective damage x.25 shield durability,
  capped, per-target/contact deduplicated, including owned projectiles and neutral
  sports objects. Court contacts can recover without damage; misses/Kickoffs do
  not. Passive recovery and genuine shield-break stun/lockout are preserved.
- PATCH picker: Tri-Ball, Sticky Ball, Volleyball first, remaining display order
  retained; stage registry/replay IDs untouched. New Dashball entry highlights
  Tri-Ball without changing initial Versus simulation configuration. Fixed stage
  Settings being mistaken for Back; deliberate shared exits remain protected.
- Validation and limits: 138 focused feature tests, 30/60/120Hz, snapshot/delayed
  rollback, real private WebRTC for both Tri-Ball rulesets/variants and rematches.
  General rollback: 9,960 frames / 1,047 recoveries. Browser 720p/1080p settings,
  actual previews, ten fighters, shared simulated-controller navigation and
  twenty-ball benchmark; no physical-controller certification. Three legacy
  unit suites still differ at archived-release comparisons (shared-menu,
  player-cards, gravity-boulder); functional checks preceding them pass. Fixtures
  remain unchanged, including Rain/Orbit. See TRI_BALL.md for benchmark/sample
  ball counts and tuning; FIGHTER_TUNING.md compares the current roster values.
  Build 67; no build/export ZIP.
- FEATURE Sticky Ball: Standard/Gravity Flip, Battle-only, 4480x1600 field,
  three platforms, 7-touchdown/5-minute defaults. Native ball pickup/attachment,
  HP-scaled combo pressure and immediate KO fumbles; touchdown resolves after
  combat. Carrier walk x.5 / dash speed x.55 / air distance approximately x.6.
  Existing gravity, sports reset, CPU, team, clock and rollback systems reused.
  Twelve focused tests and 720p/1080p/inverted ten-player browser checks pass.
  Both stages pass real WebRTC delayed-input/hash and rematch checks; the
  combined Sticky/Lancer/Reflektor run passes 42 tests.
  Registered the local runtime module in server/core-builder paths; no ZIP.
  See STICKY_BALL.md. Build 66.
- FEATURE Lancer + Whipado charge patch: core fighter 19, 182 HP, 95%-Anchor
  walking, 110%-Anchor air range/three charges and 150% gravity. Rigid 494.72-unit
  spear (+18 charged), accelerating tip sweep, tip/shaft/haft power and finite
  1870-3300ms full-extension hold. No spear recoil or persistent damage farming.
  Licensed bracing poses plus native-grid animated spear/glints and original
  synthesized thrust/impact cues. Whip reaches 85-100% of its prior maximum and
  lasts 85-150% of its prior 2200ms tap; recoil/damage/movement preserved.
  Twelve focused tests, ten CPU simulation, rollback/rate checks and 720p/1080p
  phase/victory browser checks pass. Details: LANCER.md. Build 65; no ZIP.
- PATCH Orbit: air charges 4 -> 5; launch speed x.85, duration 976.97 -> 2011.41ms,
  neutral unwrapped range 464.17/694.58 -> 810.16/1212.30 units (tap/full).
  DI turns actual velocity at up to 4.2rad/sec with response 9/sec; neutral holds
  its heading. Six focused movement/rollback/rate tests and the existing arc/
  combat suite pass. Fixture helper now measures long travel across full-exit
  seams; historical JSON fixtures are untouched. Ground/combat stats unchanged.
  Build 64; no release ZIP.
- PATCH Rain water fist: shared projected-punch placement now draws a native
  three-unit pixel grid, four flowing blue/translucent poses and four stretch/
  dissolution poses. Bounded rotation cache; no projectile, hitbox or source-art
  changes. Three focused rendering/gameplay-preservation checks and 720p/1080p
  browser pixel/cache/render-purity checks pass; Anchor's fist stays unchanged.
- PATCH Edgebert: one Punch release now runs all three licensed attack clips.
  Fresh attack IDs/target sets reuse the sword follow-up architecture; early
  misses continue, interruptions cancel normally. First-two charge knockback
  limited to +20%; finisher remains +90%. Ten focused combo/sports/determinism
  tests and native-keyboard browser smoke pass, including six mirrored poses and
  render purity. Timings and tap/full values documented in EDGEBERT.md. Build 63.
- Completed Reflektor (core fighter 18): 165 HP, 90%-Anchor walking, three air
  charges, ordinary 16-damage/820-force punch. Shield: ten-second hold, 36
  durability, 40-unit padding/160-degree coverage, 35% shield walking, fifteen-
  second recovery plus existing delays. Shared relative-momentum reflection,
  bounded object/fighter velocities, collision damage and separation-based
  contact deduplication reuse sports, combat, projectile and rollback hooks.
- User-authorized native-pixel silver scales on a cached copy of Seeker PRO Void
  resolve the earlier art block. No named metallic source asset is claimed;
  original sheets and alpha are unchanged. CPU, roster/previews and victory work.
- Validation: 42 focused Reflektor/resource/Spike tests pass; existing rollback
  suite passes 9,360 deterministic frames / 1,047 recoveries. Browser roster,
  fourteen animation masks, 720p/1080p ten-player scenes, victory and real private
  WebRTC shield hit/hash agreement pass without page/asset errors. Initial distant
  online shot fixture missed; a close, unobstructed fixture passed. No historical
  fixture changes or ZIP. Physical-controller/balance playtesting remains.
  Pre-change tag: reflektor-before-2026-11-17; online build 62.

## 2026-11-16
- FEATURE shield resources (Reflektor request, partial): durability persists and
  recovers only while inactive; hold timeout no longer drains durability or
  triggers break stun. Recovery = maximum hold duration * shared 1.5 multiplier:
  Anchor 6.36s; Spike 12s, excluding existing delays. Spike has explicit 8s hold.
  Genuine attack breaks, directional defense, thorns and sports behavior remain.
  Thin secondary shield bar displays hold time; state serializes through rollback.
- Shield validation: 14 focused resource/Spike tests, two fizzle cleanup groups,
  720p/1080p browser smoke/native keyboard and unchanged render hashes pass.
  Reflektor is not registered: no verified metallic-scaled asset was found.
  Existing Spike scales / Micro USB silver art were not substituted. Awaiting
  supplied asset before reflection, pushing, fighter stats/AI/roster work.
  Build 61; pre-change tag reflektor-shields-before-2026-11-16. See SHIELDS.md.
  No historical fixture updates, unrelated full suites, release build or ZIP.
- PATCH Spike: melee fighter launch reduced 25% at every charge via a .75
  fighter-only scale. Nominal tap 760 -> 570; full charge 1444 -> 1083.
  Shared punch force remains intact for sports objects and shields; damage,
  hitstun, timing, geometry, movement and shield thorns remain unchanged.
  Ten focused knockback/shield/sports-preservation/determinism groups plus the
  existing Spike shield suite pass, including delayed rollback and 30/60/120Hz.
  Matching peers require build 60. Pre-patch tag: spike-before-2026-11-16.
  No unrelated suites, release build or ZIP.
- PATCH Whipado air dash: capacity derives from Anchor minus one, clamped at zero
  (currently Anchor 4 / Whipado 3). Air-only launch endpoints/scale derive from
  Anchor; both launch at 663.312 tap / 989.04 full-charge units/sec and travel
  369.865 / 551.492 units over a neutral 0.6s horizontal carry sample. Ground
  dashes/walking, native charge timing, whip geometry and recoil remain unchanged.
  Ten focused movement/resource/replay/rollback tests pass, including floor and
  inverted-ceiling refill and 30/60/120Hz. Build 59 requires matching online peers.
  Pre-patch tag: whipado-before-2026-11-16. No broad suites, release build or ZIP.
- FEATURE Lamer + Booster refinements: core fighter 17, shared 86%-Anchor
  walking/dash amplitude/two air charges. Both use 45ms tap startup, 50ms active
  windows and three-second charge; charged misses have 1.06s extra lockout.
  Booster: 30-54 nominal damage / 70-87.5 knockback. Lamer: 4-6 damage /
  220-2640 knockback, charge-squared launch growth and proportional sports power.
- Independent five-second Lamer stacks cap at three (-30% movement, -24% action,
  -36% power). Booster enhancement remains nonstacking; derived modifiers combine
  without base-stat mutation. Court permits either status on either team without
  HP loss, stun or displacement. Other friendly-damage rules stay authoritative.
- Cached native-grid needle/frown projections have hard pixels, baked rotations,
  active/contact-only display and no physics/hitboxes. Licensed sheets untouched.
  Existing roster/cards, CPU, victory and WebRTC support include Lamer; build 58
  requires matching peers. Pre-change tag: lamer-before-2026-11-16.
- Validation: 46 focused status-fighter tests; real browser 720p/1080p, ten-fighter,
  cache/pixel and victory checks; Booster and Lamer real WebRTC hit agreement.
  Full rollback: 9,240 deterministic frames / 1,047 recoveries. Exact pre-change
  comparison: 8,430 frames, 31 unchanged fighters (only intentional Booster changes
  excluded). Edgebert's 13 groups, magazines' 8 groups and Spike pass. Historical
  fixtures untouched. No release build or ZIP; human balance/controller feel pending.
- FEATURE Booster: core fighter 16, existing Seeker PRO Void art, 86% Anchor
  walk speed, matching dash amplitude, two air charges, three-second heavy punch,
  50ms active window and long whiff lockout. Nonstacking charge-scaled enhancement
  applies to surviving allies/enemies; Court support preserves no-damage rules.
  Shared movement/action/power modifiers, native CPU support and serializable
  expiry retain fighter individuality. Networking build advanced to Booster;
  both peers must refresh. Pre-change Git tag: booster-before-2026-11-16.
- Booster validation: 23 focused mechanic tests and browser checks, real WebRTC charged
  hit agreement, full rollback (9,120 frames / 1,047 recoveries), 8,430 exact
  pre-change unbuffed frames; magazines, Edgebert, Phantom and Spike pass.
  No new assets, dependencies, release build or ZIP. Balance still needs humans.
- Workflow: local-only Git, preserved source/assets/tests and old releases,
  ignored generated files, PATCH / FEATURE / RELEASE guidance. No gameplay,
  sprite, control or scoring changes in workflow setup.
- Complete: High Perch Drift background, terrain textures and atmosphere in
  Boulder Control, Gravity Flip Boulder Control and Total Rush, with previews.
- Complete: independent 1.6-second shared-menu Back timers, compact progress,
  release gates, keyboard parity and Confirm Return for clickable exits. Private
  card Back/View stay immediate. Corrected keyboard card input precedence and an
  invalid hidden-roster cursor that could undo Ready in the development edition.
- Tests: 11 hold groups; six simulated-controller hold browser checks; existing
  shared-menu and 2/4/6/10-card browser suites at 720p/1080p; 14 match-flow groups;
  full rollback (9,000 deterministic frames, 1,047 recoveries); 5,520 exact
  pre-change simulation frames. Scenery checks pass in Classic/Enhanced with
  unchanged geometry/state hashes, shared textures and no per-frame cache rebuild.
- Test infrastructure: rollback now initializes sports through the sports setup
  hooks instead of Versus (the old test crashed identically before this patch).
  Shared-menu/player-card comparison tests accept REGRESSION_BEFORE_DIR for a
  pre-change Git export; original historical defaults/fixtures remain untouched.
- No new release ZIP. Existing packages remain untouched. Physical-controller
  validation and full release integration remain RELEASE tasks.
- Previous delivered build: Grass Pitches (soccer turf and stage previews).
