# Punch Shield Pressure

- A successfully shielded Punch applies `lerp(10 / 60, 18 / 60, charge)` seconds of blockstun. Charge is normalized and clamped to 0..1 (0.166667 / 0.233333 / 0.300000 seconds at minimum / half / maximum).
- The timer counts down in simulation time, including hitstop, using the existing physics timestep. Existing global slow-motion effects can stretch wall-clock duration slightly. Refresh replaces the remaining duration; it never adds to it.
- The shield stays active and aim remains responsive. Punch and Dash edges, spot-dodge taps and platform-drop intent are discarded during pressure. Steering/walking and outgoing Kickoffs cannot create movement escapes; passive momentum, gravity and shield knockback remain unchanged.
- Releasing Punch during pressure does not queue a Punch or parry. After expiration the next input sample discards old edges: a continued hold rearms a later deliberate release; an already released button lowers the shield without firing. This recovery-boundary sample can add up to one simulation tick before accepting a new action.
- A fresh release retains the existing 0.140-second shield-release parry window and 0.055-second extra Punch startup. Neither attacker recovery nor any character frame data is retuned.
- Shield break and an uncovered damaging Punch supersede blockstun and use their existing stun behavior. Shielded Kickoffs retain their separate damage/rebound handler and do not create blockstun or release rearming.
- Existing shield flash now accompanies a slightly heavier, gently pulsing barrier while under pressure. No new HUD or command.
- Both new fighter fields are included automatically by existing rollback and legacy host snapshot serialization. The online build signature was advanced to reject mixed old/new clients. Live online play uses rollback, not the older snapshot-authority path.

Tests: `node tests/shield-pressure.test.js`, plus existing combat/state, rollback, signaling and browser suites.
