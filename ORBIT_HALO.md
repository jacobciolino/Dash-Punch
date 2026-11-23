# Orbit Halo

Orbit has a small gold elliptical pixel ring with a restrained dark-gold outline.
The authored 11x5 stamp is cached once, then drawn at the original sprite's native
integer pixel scale (normally 33x15 world units). No wings, particles, glow,
armor, permanent sprite edits, controls or gameplay behavior were added.

## Positioning

The halo is drawn in the existing sprite pass, after the original frame. Native
hood anchors cover all 158 Seeker PRO frames used by Orbit, including directional
attacks, crouch, wall slide, hurt, knockback and death. They use the same per-frame
root anchor, scale, facing and gravity transform as the fighter. Large attack
effects are not mistaken for the top of the head.

Idle and dash anchors are stable instead of following small changes in the hood
tip. Gameplay uses a 0.2-native-pixel simulation-time bob, rounded to crisp draw
positions. The ring stays separated from the hood. It fades with the character
and stops drawing once the death animation no longer has a recognizable head.

Character-select roster, player cards and online previews use the same native
head positions and existing frame timing. Orbit's portrait framing moves slightly
down to fit the halo; the sprite is not resized or deformed. The small-window
roster and visible player-card portraits have been checked for clipping.

No halo state is stored on fighters, sports objects or in gameplay snapshots.
There is no hitbox, collision, damage, force, projectile interaction or input.
The network build and authoritative match configuration remain unchanged.

## Verification

- Eight dedicated groups pass: pixel shape, all frame anchors, facing/gravity,
  subtle bob/render purity, preview timing, old-release gameplay parity, snapshot/
  delayed rollback and 30/60/120 Hz gameplay equivalence.
- 1,710 gameplay frames across Versus, all 15 Dashball arenas and all three
  Sandbag rulesets exactly match the pre-halo release, including Orbit's stats and
  projectile state. No historical fixture was regenerated.
- Ten relevant test scripts pass: halo, hurt alignment, gravity rendering, Orbit
  animation/arc, Kite accessory, team silhouettes, online state, rollback and core
  release. The prior historical Rain/Orbit fixture caveat is unchanged.
- Real Chrome checks cover 1,264 frame/facing/gravity combinations. All visible
  rings contain the expected 144 gold pixels; no source hood pixels overlap the
  ring. Twelve late death frames correctly hide it under all eight transforms.
- Character-select checks cover all 24 idle frames at 1280x720 and 1920x1080,
  including visible player cards. Offline core HTML renders after actual sprite
  decoding. No browser exceptions or missing assets.
- Ten native-CPU sports runs stay readable. The short Golden Rush benchmark had
  about 16.7 ms median / 16.8 ms p95 frame intervals, with none above 25 ms across
  240 samples. This headless software-browser result is not a hardware guarantee.

Existing sprite/environment file hashes, animation metadata, roster, stages and
gameplay network identity match the pre-halo core release. The existing Kite
accessory reuses a small shared pixel-stamp helper with identical output.

Reports, unfiltered logs and screenshots: `artifacts/orbit-halo/`.

## Files and Build

- `game.js`: halo stamp, hood anchors, shared stamp helper, sprite-pass overlay,
  preview markup and patch notes. No simulation changes.
- `styles.css`: halo preview styling and portrait headroom.
- `tools/build-core-release.cjs`: core patch notes and README entry.
- `package.json`: dedicated test commands.
- `tests/orbit-halo.test.js`, `tests/orbit-halo.browser.test.js`.
- `playtest-release.json`: selects the finished core-only build.

No Git repository exists. Source checkpoint:
`exports/pre-orbit-halo-2026-11-14.zip`. Previous releases are retained.

Release: `exports/Dash-Punch-Orbit-Halo-Release-2026-11-14/` and its `.zip` sibling.
Preview: `http://localhost:8080/`.
