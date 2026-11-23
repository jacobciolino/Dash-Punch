# Online 1v1 Rollback Playtest

## Status

Genuine input prediction, snapshot restoration and frame resimulation are
functional in automated game-engine tests and a real local WebRTC browser test.
This is not a host-position-streaming or input-delay implementation. It is a
playtest foundation, not a claim of proven cross-home-network reliability.

Checkpoint before the changes: `rollback-checkpoint-before.zip` in the project
root. No character balance or combat constants were intentionally retuned.

## Deterministic Simulation

- `frame()` accumulates browser elapsed time and advances in fixed 1/60 steps.
  Rendering runs independently; missed render frames do not change step size.
- `simulateFrame(inputs)` runs the existing `simulateCombat()` pipeline, not a
  second combat engine, without reading physical devices. It can run silently.
- Physical controller/keyboard actions become quantized normalized intent.
  4096 angular bins preserve full-circle aiming (about 0.088 degrees per bin).
  Button holds and explicit press/release edges remain independent; simulation
  input buffers are snapshotted and consumed inside combat as before.
- Gameplay tumble randomness uses a seeded PRNG. AI is bypassed during these
  two-human simulation frames. Audio, particles and camera shake use cosmetic
  randomness that does not advance gameplay RNG or enter authoritative hashes.
- Collision iteration remains the existing stable fighter/terrain array order.
  Moving platforms and gravity state use simulation time, never wall-clock time.
- Existing slow-motion/hitstop behavior stays in the fixed-step combat pipeline;
  timers retain their units and tuning. No speculative integer-timer rewrite.

## Snapshots

`saveSimulation()` stores all fighter-owned gameplay fields except immutable
character definitions, physical device objects and rendering-only state. This
includes hitboxes, projectiles, cooldowns, resources, shield, combo, latch, tech,
cling, rebound, invulnerability, KO and scoring state. Tagged serialization
preserves Sets, Maps, undefined/non-finite values and cross-fighter references.
Restoration deletes fields that did not exist in the saved frame as well.

Global state includes simulation frame/RNG, character IDs, stage ID/time,
gravity/switch state, attack serial, slow motion, round-reset timer, team rules,
scores, clash state and simulation input buffers. Static stage/character
definitions are bound by the start handshake; snapshots reject a different match
configuration. Moving-platform positions are functions of this saved stage time.

Particles, text effects and sound-sequence counters are saved separately from
the gameplay hash. Rendering-only animation fields and local model preferences
cannot cause peer desyncs. Camera interpolation is presentation-only.

## History And Corrections

`rollback.js` is transport independent. Each peer records local input, confirmed
remote input, predicted input, and the state immediately before each frame.
Prediction retains the last known direction/holds, never repeated button edges.
A mismatch restores the earliest affected state and resimulates to the current
frame. Confirmed-state hashes are exchanged and compared at equal frame numbers.

The shipped online window is **8 frames**; the manager accepts a configurable
window for tests/future tuning. Snapshots are bounded to that window, while a
240-frame input/hash history and 16-input packet redundancy support verification
and delivery recovery. These numbers do not imply a 240-frame rollback window.

At the prediction limit, simulation explicitly waits for input. An invalid or
conflicting packet, exhausted snapshot history, or hash mismatch produces an
explicit error instead of silently diverging. A hash mismatch requires rematch;
there is no unverified automatic authoritative-state repair. Ten seconds without
opponent gameplay input prompts reconnection/rematch.

## Audio And Effects

Sound IDs include session, simulation frame, event ordinal, sound name and
fighter. Replaying the same event does not play it twice. Newly discovered
corrected events may play; a sound already heard from a wrong prediction cannot
be unplayed. Effects are restored with the frame and reconstructed, not appended
to an uncorrected future effect list. Cosmetic particles may change appearance
on correction. Damage, hit targets, KO flags and scores are restored exactly.

## Connection And Match Start

Run `npm start` and open the server URL. Offline file-based play remains usable,
but online hosting needs the server-backed URL. For friends on different
networks, deploy the included Node server behind HTTPS/WSS and share that address.

1. One player chooses Online 1v1, then Host Match, and sends the room invitation.
2. The other chooses Join Match and enters the code (or uses the invitation).
3. Both choose a fighter with the lobby fighter button and press Ready.
4. Host presses Start Fight. Flat is the default online stage.
5. Peers exchange build/configuration signature and initial-state hash, then
   commit frame zero. Rematches use a new session ID; stale packets are ignored.

The build ID, selected character definitions, stage geometry, rules/step and RNG
seed are verified. Slots are fixed host=P1, guest=P2; both use their own local P1
keyboard/controller profile. Both fighters are human-controlled. No online teams,
spectators, accounts or larger online matches were added.

Transport is the existing reliable ordered WebRTC DataChannel, with public STUN
servers. The existing WebSocket room server handles signaling and can relay the
same rollback inputs if direct RTC fails. No positions are sent during gameplay.
Reliable ordered channels can incur head-of-line blocking during packet loss;
an unreliable gameplay channel is a possible later optimization, not a claim
about the current transport.

TURN is optional because the WebSocket relay provides a fallback, but a TURN
service may improve direct WebRTC reachability. To supply TURN/STUN configuration,
define `window.DASH_PUNCH_ICE_SERVERS` before `game.js` using standard RTCIceServer
entries. Use short-lived TURN credentials from your hosting service; do not ship
long-lived secrets in a public script. No TURN server or public deployment was
provisioned in this change.

## Developer Tools

Add `?netDebug=1` (or `&netDebug=1` on an invitation) for RTT, intentional input
delay (0), current/confirmed frame, rollback count/rate/depth, packet-gap estimate,
simulation/replay cost and matched-state hash status. Developer controls inject
0/50/100/150 ms **one-way** delay, jitter and loss on outgoing gameplay packets.
They do not delay control/handshake messages or change combat rules. Apply them
on both clients to model symmetric links. Packet-gap percentage is an estimate
and can overcount reordered packets; it is not a transport loss measurement.

## Validation

- Existing combat/input/AI/stage/resource/projectile regression suite passes.
- Independent VM instances: 5,520 matching fixed frames across every character
  and stage, including moving platforms and gravity arenas.
- Delayed-input baseline comparisons: 1,047 rollbacks, maximum depth 8, identical
  final authoritative state after all inputs arrive.
- Additional restoration scenarios: clashes, charged hits/DI, shield-break
  setups, KO states, floor tech, wrapping, electric multihits, projectiles,
  defensive inputs, kickoff routing and Punch/kickoff priority.
- Production protocol through a simulated wire: 480 input packets, 20 dropped,
  reordering/jitter, matching state, new-session rematch and stale-packet rejection.
- Replayed release events do not duplicate audio IDs or particle counts.
- Forced wrong state hash stops the match explicitly.
- Real localhost signaling, room joining, input relay and disconnect tests pass.
- Two isolated Chrome browser contexts established actual WebRTC, with different
  model preferences, keyboard inputs, 50 ms one-way delay, 15 ms jitter and 5%
  loss injected. Both reported real rollbacks and matching confirmed hashes.
  Host pause, a new-session rematch, and closing the guest browser were also
  verified through the real browser/room flow.

`npm test` runs the non-browser suites. `npm run test:browser` needs Playwright
and Chromium; set `BROWSER_CHANNEL=chrome` to use an installed Chrome. An external
Playwright module can be supplied with `PLAYWRIGHT_MODULE`. The browser test uses
temporary isolated profiles, a localhost server, then cleans up both.

## Remaining Limits

Two physical computers, real controllers on both peers, different home networks,
cross-browser engines and long matches are not yet validated. JavaScript floating
point/trigonometry matches in the tested VM/Chrome environments; heterogeneous
engines still need confirmation. Snapshot copying/hashing allocates memory, and
an eight-frame correction increases CPU work; use the overlay on slower devices.
Background-tab throttling and sustained latency beyond the prediction window
can stall play. A larger tuned window, transport improvements, long-run profiling,
and real internet testing should precede a reliability claim.
