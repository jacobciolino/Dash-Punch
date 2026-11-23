# Menu Audio

Menus reuse the existing Web Audio synthesizer, without samples or dependencies.
The first click or key unlocks browser audio as before. Selection still works if
audio is unavailable or the browser declines playback.

- Navigate: quiet 28 ms rising tick, including mouse hover and private card focus.
- Confirm: 70 ms rising tone.
- Back / close / unready: 65 ms descending tone.
- Setting adjustment: 45 ms short rising tone.
- Ready: short two-note chime.

Shared mode/stage/settings input and independent card ownership are unchanged.
Navigation ticks are spaced at least 55 ms apart and suppressed for 80 ms after
an action, so automatic screen focus does not add a second cue. Identical actions
within 25 ms coalesce, including simultaneous Ready presses. No sound timers,
focus caches or audio objects enter deterministic snapshots or rollback hashes.

## Verification

`npm run test:menu-audio-browser` checks real browser Web Audio scheduling with
mouse, keyboard, two simulated controllers, simultaneous inputs, private cards,
Ready, held directions, rapid hover, first-input unlock and offline file play.
It does not verify physical speakers or physical controller feel.

Movement audio's eight test groups, all-fourteen-fighter gameplay comparison and
delayed rollback pass. Core packaging verifies 3,480 source/export simulation
frames, twelve replays and ten-fighter arenas. The old player-card test's final
comparison against the November 14 rounds build fails for Boomerangus/Kite in
both the pre-menu-audio build and this build with the same hashes; its four
card/input groups pass. Historical fixtures were not changed.

Pre-change checkpoint: `artifacts/menu-audio-before-2026-11-15.zip`. This workspace
is not a Git repository; no Git checkpoint is claimed.
