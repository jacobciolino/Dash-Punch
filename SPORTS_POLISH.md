# Sports And Core Release Update

## Orc Scenery Removed

The Orc arena presentation was removed at the owner's request. Target Break and
Golden Rush now use the existing plain sports background and clear, untextured
surfaces. Their gameplay, geometry, targets, balls and scoring are unchanged.
Orc parallax, grading, backdrop/preview art and terrain hooks are gone; new core
packages contain no Orc files or unused Orc license/README entries. The original
source assets, preparation tool and previous ZIPs are retained, not loaded.

The milestone/benchmark notes below are historical. They do not mean the removed
scenery is still enabled or included in new builds.

Removal verification: 360 pre-removal sports frames and 2,040 full/core parity
frames remain identical. Sports settings and online-state regressions pass.
Chrome verified both plain courts with no Orc requests, no background caches or
blur passes, and ten-player Golden Rush at 16.7 ms median/p95 with no frames over
25 ms. The new core package also passed offline file play, virtual-controller
joining, real Kite/Rain WebRTC, pause/rematch/disconnect and all asset checks.
The four existing PF environments and all fighters remain installed unchanged.

## Completed In Request Order

1. Sandbag Showdown: Damage Race, Damage Brawl and Sandbag Scramble; local
   1v1-5v5, native controllers/CPUs, private online 1v1, damage attribution,
   deterioration, movable bag physics, clock/overtime/results/rematches and
   serializable rollback state. See `SANDBAG_SHOWDOWN.md`.
2. Distribution policy: `npm run build` / `build:playtest` calls the core-only
   exporter. Experimental fighters/stages/assets/developer screens are physically
   omitted. The development checkout and old archives are retained, not deleted.
3. Basketball: the existing center mover is one-way for fighters, including
   normal landing/carrying and Down+Dash drop-through; the ball still collides
   with it. Melee interception now runs within the ball's collision microsteps,
   catching brief/narrow punches without changing any fighter hitbox or frame
   data. All three Edgebert stages are tested against a moving basketball.
4. Shared sports Battle: `sports.js` centralizes 50% HP, configurable 20-100% HP,
   15-second default respawn, 10/15/20 choices and two-second protection. This
   covers every Battle Dashball arena plus Sandbag Brawl/Scramble. Knockouts
   never directly score/end a sports match; objectives keep running. Each fighter
   has an independent timer, safe team-side spawn, restored reduced HP/resources,
   and protection ends on an executed Punch or Dash. Versus/Court/Race retain
   their non-PvP/normal health rules. No roster stats were edited.
5. Chungus: generated a brown, attached arm/fist sprite from the existing art
   references. Native pixel slices extend the sleeve/forearm to the actual attack
   reach, with one large fist and a looping stream texture. This avoids stretching
   the pixel artwork or leaving a long invisible gap. Timing/collision unchanged.
6. Soccer SFX: supplied kick, melody-1 and stab clips become kick, goal and start
   cues. Silent tails were removed; mono 22050 Hz PCM with short fades totals
   205,970 bytes rather than importing 21 MB of padded WAV files. Browser-only
   `sports-audio.js` reuses the game's audio event/replay deduplication and caches
   decoded samples. No sounds are added to other arenas or normal combat.
7. Basketball: the supplied `ball.png` is sampled to a crisp 16x16 sprite and
   rendered at integer scale, centered on the unchanged collider. It is used in
   Basketball and Wrap Around Basketball only, without smooth sprite rotation.
8. Orc arena kit: imported only selected scenery/terrain for Target Break and
   Golden Rush (about 80 KB). The existing cached stage renderer supplies layered
   depth, restrained grading and atmosphere; distant crowds are strongly muted.
   Authored grass/soil/timber define surfaces. Arena geometry, targets, rings,
   ball physics and score rules are unchanged by the art.

## Files

Simulation: `sports.js`, `dashball.js`, `sandbag.js`, narrow hooks in `game.js`.
Presentation: `sports-audio.js`, `presentation-assets.js`, renderer hooks in
`game.js`, selected assets under `assets/sandbag`, `assets/audio/soccer`,
`assets/dashball`, `assets/stages/orc-arena`, and `chungus-arm.png`.
Loading/package: `index.html`, `server.js`, `package.json`, core build tools.
Tests: focused Sandbag/sports/audio/render suites, shared simulation harness and
explicitly updated sports respawn expectations in existing tests. Historical
Versus gameplay baselines are untouched. Documentation/policy updated.

## Validation

- 16 Sandbag groups: scoring, latches, sequences, physics/caps, timers, respawns,
  snapshots, seeded replay, delayed rollback and all three ten-CPU rulesets.
- 6 sports groups: shared settings, all seven PvP sports variants' independent
  ten-second respawns, resource restoration/protection/offense, basketball
  interception, platform pass-through/carrying and normal replay.
- Audio: three WAVs decoded with correct format, cached, playback/cooldown tested.
- CPU Canvas: both arena backgrounds, basketball and Chungus left/right render;
  rendering does not change simulation hashes. Screenshots are in
  `artifacts/sports-polish/`. This is not a substitute for browser/input testing.
- Existing Dashball 29, Target Break 24, Golden Rush 25 and Edgebert 13 groups
  pass. Core export parity covers 1,170 frames/11 replays; the historical visual
  cleanup baseline covers 1,320 non-Edgebert Versus frames.
- Before the later sports changes, Sandbag passed real Chrome controller-menu,
  keyboard, loaded-countdown, result/rematch and small-window checks, plus real
  WebRTC for all three rulesets at 50ms delay/15ms jitter/5% simulated packet loss.
  Ten-player frame samples were 16.7ms median, 16.7-16.8ms p95, no >25ms samples.
  These performance numbers do not claim to measure the subsequent Orc art.

The temporary browser approval limit cleared and final Chrome tests passed:
actual Soccer start/kick/goal sample hooks and playback, basketball/arena art,
Chungus left/right, all sports settings, all six online Court/Battle basketball/
soccer combinations, all three Sandbag online rulesets and rematches. The exact
core folder passed offline file play, all 82 runtime bitmaps, controller joining,
pause/rematch/disconnect and two-peer WebRTC with matching hashes and no missing
assets. Core/full parity also checks another 630 sports frames (1,800 total).
Physical controller feel and listening on real speakers still require hands-on
testing. AI can bunch around bags. Sports health/respawn rules intentionally
change earlier sports timing expectations, not Versus.

Final isolated Chrome Golden Rush/Orc-art benchmark with ten CPUs: 16.7ms
median, 16.8ms p95, zero >25ms samples over 180 frames; one cached scenery build
and one cached blur pass. The lightweight Classic-default core also passed
ten-player Chrome sampling at 16.7ms median/p95 with no >25ms samples.

The subsequent reported boot failure was traced to stale local servers on
8080/8081 returning 404 for sports.js, sports-audio.js and sandbag.js. The normal
startup now serves the selected core release. Old local ports forward to 8080,
and all required files return 200. Showcase scene logic and experimental content
are removed from that build; Classic defaults avoid enhanced-layer allocations.

## Asset Notes

Chungus arm and sandbag images used the built-in image-generation tool; originals
are retained under `artifacts`. Mechanical nearest-neighbor/alpha preparation is
reproducible using the new tools. Original Seeker PRO sprites remain licensed
project assets and are not redistributed as a standalone art pack.

Soccer SFX ZIP supplied no separate license document; this is recorded beside
the clips. Basketball art was supplied by the project owner. Orc kit license and
README are retained. The project owner confirmed the creator is okay with these
shared browser ZIPs on November 12, 2026; original license text was not altered.
Only the selected assets, not the entire kit or previews, are packaged.

The folder is not a Git repository. Recoverable source archives are under
`artifacts/sandbag/checkpoints`; no Git checkpoint is claimed.
