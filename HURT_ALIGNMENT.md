# Hurt Sprite Alignment

## Cause And Fix

The Seeker PRO knockback sheet includes translation inside its nine animation
cells: the body moves from source x=40 to x=15. One fixed pivot was used for all
frames, so the model drifted about 75 screen pixels at normal 3x scale while the
simulated fighter and defensive-resource outline stayed in place. Switching back
to the idle/hurt pose then produced a conspicuous snap. There was also a small
baked vertical shift during the tumble.

The two hurt clips now declare per-frame body-center anchors. Rendering cancels
only their baked translation. Authored poses, tumble, white impact frame, pixel
scale and frame durations are unchanged. The whole model continues to follow
the real physics position. Damage, hitstun, hitstop, knockback, hitboxes, collision,
controller input, Orbit's new arc and all other mechanics are untouched.

The shared anchor lookup is used by both normal sprite drawing and Spike's cached
coat/spine construction. This keeps his spines attached to the actual pose, even
when the source sprite has moved inside its cell. No images are edited, stretched
or regenerated, and no runtime pixel scan is added.

All eleven Seeker PRO core variants inherit the corrected hurt/knockback metadata.
The matching Seeker Lite hurt clip receives the same alignment metadata. Chungus's
custom atlas, DefiPlate's plate/barbell and other imported character sheets are
unchanged. Clips without frame anchors keep their existing pivot/foot behavior;
attack reach art, casting and movement anchors are not recentered globally.

## Verification

- Unit checks cover 198 hurt poses across eleven core variants, recovery/attack
  pivot fallback, authored timing and render purity.
- Browser checks compare metadata against actual opaque source pixels, then
  inspect 1,584 real draw transforms across hurt/knockback frames, both facings
  and all four gravity directions. Corrected body-center error is at most 1.5
  world pixels from native pixel rounding, not a second movement trajectory.
- Before mode removes only the new metadata from the browser's served copy to
  reproduce the old renderer. It does not rewrite source files or game baselines.
- The old drift reproduces at 76.5 pixels; the fixed draw checks peak at 1.5.
  Recovery sprites are separately checked for visibility and centering.
- Existing visual/combat fixtures pass without replacing baselines: 1,440 core
  visual-fixture frames, 720 DefiPlate frames, four Orbit ground-dash fixtures and
  960 other-fighter frames. Orbit's current arc/offense tests also pass unchanged.
- Authored animation/gravity/render-purity tests pass. The quick rollback suite
  passes 74 rollback corrections, including eight-frame recovery and combat stress
  cases. This visual-only patch does not change the multiplayer protocol/build ID.
- [Before](artifacts/hurt-alignment/before.png) and
  [After](artifacts/hurt-alignment/after.png) show Orbit and Spike with the existing
  resource indicators, including recovery. Raw results are alongside the images.

## Files And Scope

Runtime changes: `presentation-assets.js` adds the two source-anchor tables;
`game.js` reuses a small anchor lookup in sprite drawing and Spike's cached art.
Tests, package test commands and this note accompany them. Source art is unchanged.
No controller fix was made after the user redirected the task. No Git repository
is available here, so no checkpoint is claimed.
