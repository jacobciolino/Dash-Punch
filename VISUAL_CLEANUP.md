# Seeker PRO Visual Cleanup

## Scope And Inventory

First pass covers the twelve core fighters in sprite mode. Combat simulation,
attack properties, hitstop, knockback, wall-sling/slide, gravity, camera feedback
and inputs are unchanged. No new artwork, dependency, or combat system was added.
Sources were checked against the supplied PRO Animation Guide and PNG sheets.

| Existing rendering | Action | Replacement or reason |
| --- | --- | --- |
| `getStatePose`: nonuniform scaling, lean, wobble, squash | Removed for core sprites | Authored dash/crouch/hurt/attack/wall frames; neutral body transform |
| `drawFighter`: angle/tumble over sprite frames | Removed for core sprites | PRO HurtKnockback for moving hitstun; gravity orientation remains |
| `drawLocalStateEffects`: X/cross impacts, diagonal lines, rectangles, circles, fake poses | Replaced for core sprites | Native big impacts, air rings, dash dust, landing dust; redundant overlays omitted |
| `drawParticles`: generic circular particle clouds | Removed | One native impact/dust animation per existing burst; existing projectile sprite effects retained |
| `drawChargeBox`: growing rectangular charge outlines | Replaced for core sprites | PRO Charge Loop / Charge Loop Big |
| `drawFiredUpFlames`: procedural flame triangles | Replaced for core sprites | Ember Aura Loop, opacity follows existing fired-up health |
| `drawAttack`: active/startup geometric hitbox overlay | Removed for core sprites | Authored attack/spell art; explicit debug hitboxes remain |
| Body-following cling and tech rectangles | Removed for core sprites | WallSlide frames, native tech ring/landing dust |
| Sprite brightness flash | Removed for core sprites | Hurt/knockback animation and native impact feedback |
| Sprite dash afterimage | Removed for core sprites | Authored Dash plus native dust; no duplicate stretched body |
| Runway dash shear/squash | Removed | Existing imported dash/run frames, without transform distortion |
| Fractional body-art scaling | Replaced for core sprites | Uniform integer effective-pixel scale; cached frames drawn at native size, nearest-neighbor |

## Authentic Asset Mapping

`presentation-assets.js` now centralizes PRO effect metadata in `effects`:

- Void Basic Impact: ordinary hits and medium bursts.
- Dream Big Impact: clashes, parries, shield breaks and large bursts.
- Void Dash Dust: dash/spot-dodge motion and small bursts.
- Void Land Dust: floor tech feedback.
- Frost AirJump Ring: rebound, escape, surface-tech and stance-readiness feedback.
- Void Charge Loop / Loop Big: charge and resource-flash feedback.
- Ember Aura Loop: fired-up state.
- Dream Power Burst: shield-break feedback; Void Charge Release: shield reactivation.
- Void HurtKnockback: eleven standard core sprite variants in moving hitstun.
- Existing PRO attacks, casting, bow, crouch, dash and WallSlide remain in use.

Effects use the pack's frame dimensions and pivots, a shared renderer, integer
scale and nearest-neighbor sampling. Current-stage countdown preloading now
includes the shared effects. Startup remains lazy. No animation duration controls
gameplay timing or collision.

## Intentionally Retained / Missing Matches

- Directional shield barrier, Spike's shield spikes, shield pressure pulse,
  defensive-resource indicators, team badges, HUD and projected aim preview are
  functional readability cues, not collision-generating artwork. Kept intact.
  The reflected-projectile danger ring is retained for the same reason.
- Hitstop, screen shake, low-opacity impact frames, KO fade and dodge transparency
  remain. Gravity rotation is necessary to show which way the fighter's feet point.
- PRO has no American plug, electricity latch, magical whip or projected fist.
  Micro USB's plug/electricity, Whipado's whip and Anchor/Chungus fist are retained
  as previously requested signature visuals. No substitute artwork was invented.
- PRO has no obese Seeker. Chungus keeps his existing pixel atlas and body poses,
  now without the extra squash/wobble layer. No skinny replacement was imposed.
- PRO has no exact tippy-toes, tech-roll, shield-break or stun-star animation.
  Existing appropriate body frames plus native feedback are used. Tippy-toes keeps
  a four-world-unit lift and subtle authored ring, not a stretched body.
- Block-model comparison mode and experimental fighters still use their legacy
  pose/state renderer. It is reachable fallback code, not dead code. Their full
  art cleanup is deferred rather than silently removing their identities.
- Existing burst emission records/RNG calls remain for deterministic compatibility;
  only the first record renders an authored effect. Removing those allocations
  needs a separate RNG/presentation change, not an incidental visual patch.

## Verified Removal And Tests

Deleted the circular particle drawing branch and Runway shear transform. Core
sprites bypass legacy geometric overlays and poses; those functions are retained
only where the block/experimental fallback still calls them.

- `pro-visuals.test.js`: twelve core fighters, 39 neutral-transform states,
  authored sheet dimensions, wall/knockback clip selection and render-state purity.
- `pro-visuals-simulation.test.js`: all 1,440 frames exactly match the baseline
  recorded before this cleanup. Do not re-record to hide a gameplay regression.
- `pro-visuals.browser.test.js`: 72 nonblank core poses, no squash/shear calls,
  native effect drawing, decoded assets and no gameplay changes from rendering.
- Existing core roster, Whipado/bow, fist, Micro USB, countdown, online-state,
  performance and rollback checks were run.
- Performance sample: startup one image, no eager arena cache; median 16.7 ms,
  p95 16.8 ms, zero sampled frames over 25 ms on this machine. Not a hardware-wide
  performance guarantee.

Visual QA galleries: `/tmp/dash-pro-core-cleanup.png` and
`/tmp/dash-pro-effects.png`. Larger architecture findings are in
`ARCHITECTURE_AUDIT.md`; no major refactor was undertaken.
