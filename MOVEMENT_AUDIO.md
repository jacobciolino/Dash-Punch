# Movement and Whiff Audio

The existing Web Audio renderer now makes dash charge easier to hear:

- Progress pings at 28%, 60% and 100% of each fighter's charge time.
- Full charge has a short double chime; holding longer does not repeat it.
- Tap (<28%), charged (28-86%) and full (86%+) dashes use different pitches,
  noise color and lengths. Existing speed/sequence feedback remains.
- Super jumps have a separate rising triangle-wave launch and airy tail.
- Melee misses play a clearer short descending swoosh on the first update after
  the active window, rather than waiting until recovery finishes.

Successful hits/blocks, clashes, canceled strikes and launched projectiles do
not produce false melee-miss cues. No-whiff-penalty fighters can still have the
cosmetic miss sound without gaining a gameplay penalty.

The existing audio unlock, synthesis helpers and replay deduplication are reused.
There are no downloaded sounds, new asset licenses, dependencies or controls.
Threshold crossings use existing charge state, so no cosmetic fields enter the
gameplay snapshot. Muted rollback resimulation stays silent. The feature works
with local humans, CPUs, gravity reversals, sports and existing online inputs.

`test:movement-audio` checks sound graph parameters, native charge thresholds,
all four super-jump directions, true misses/false misses, unavailable audio,
replay deduplication, delayed rollback and exact gameplay parity for all fourteen
fighters against the pre-audio build. Browser tests render the real audio graphs
through Chrome's OfflineAudioContext and verify non-silent, finite, bounded output.
This does not verify speakers, physical controllers or subjective sound balance.

The same release includes the unfinished Chungus timing update: 0.20-second
base activity (was 5 seconds), up to 0.42 at full charge. His other statistics
and all other fighters remain unchanged.

There is no Git repository. Pre-audio checkpoint:
`artifacts/movement-audio-before-2026-11-15.zip`.
