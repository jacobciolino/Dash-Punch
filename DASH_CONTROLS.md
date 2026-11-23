# Dash Controls and Boomerangus Range

## Standard Controller Defaults

| Action | PlayStation | Xbox Equivalent | Nintendo Standard Mapping |
| --- | --- | --- | --- |
| Dash | L1, Cross, R2, Triangle | LB, A, RT, Y | L, B, ZR, X |
| Punch | R1, Square, L2, Circle | RB, X, LT, B | R, Y, ZL, A |

Bindings follow the existing normalized Gamepad API positions, not button
letters across brands. Dash indices are 0/3/4/7; Punch is 1/2/5/6. D-pad,
sticks, Start/Select, keyboard controls and custom remapping stay intact.
Analog triggers retain the existing held-value threshold and alias-union rules.

Saved player/device profiles matching the exact old untouched default groups
are upgraded and persisted automatically. Actual custom mappings are preserved;
Reset to Defaults applies the new layout. The specialized GameCube adapter
profile remains A/L-click/L-analog for Dash and B/R-click/R-analog for Punch,
because analog and digital detents share physical triggers on that hardware.

## Boomerangus

Only his dash-specific tuning changes:

| Property | Before | Now |
| --- | --- | --- |
| Base / maximum dash parameter | 150 / 340 | 210 / 420 |
| Nominal ground launch speed | 159-360.4 | 222.6-445.2 |
| Air dash multiplier | 0.38 | 0.60 |
| Nominal air launch speed | 80.104-121.98 | 166.32-239.4 |
| Ground glide | 0.38 sec | 0.85 sec |
| Windup / recovery | 0.10 / 0.32 sec | Unchanged |

Holding the same walking direction no longer immediately reduces his committed
glide to walking speed. Reversing or releasing direction can still brake him.
Ordinary walking, tippy-jump trajectories, gravity, one-air-dash limit, normal
refills, health, body, knockback resistance and boomerang are unchanged. Other
fighters do not use the new glide override. No additional invulnerability or
controls are introduced.

One-second measurements from dash initiation on Soccer, starting stationary:

| Trial | Before | Now |
| --- | --- | --- |
| Ground tap, no held direction | 68.2 units | 145.0 units |
| Ground full charge, no held direction | 154.6 | 290.0 |
| Ground tap, direction held | 93.5 | 167.4 |
| Ground full charge, direction held | 112.2 | 307.7 |
| Air tap from Y300, no held direction | 62.7 | 130.1 |
| Air full charge from Y300, no held direction | 95.4 | 187.3 |

These are fixed-step fixture measurements, including startup, gravity, friction
and possible landing; not guaranteed distance in live combat. Boomerangus still
walks at 92.4 units/sec and has the same vulnerable windup and recovery.

## Verification

`tests/dash-controls.test.js` checks exact defaults, left/right dash symmetry,
longer range, resources, unchanged walking/jump/external knockback, unchanged
data/gameplay for the other thirteen fighters, 30/60/120 Hz, replay and delayed
rollback in four sports. `tests/dash-controls.browser.test.js` checks all eight
aliases on simulated PlayStation/Xbox/Nintendo/generic pads, analog triggers,
partial release, persisted default migrations, custom profiles and native
Boomerangus movement using all four Dash aliases. It preserves GameCube support.

Historical fixtures are retained. Core-only packaging retains all fourteen
fighters and the restored full roster. Both online peers need the updated build
because Boomerangus movement changed. Physical controller feel and final dash
balance still need human playtesting.

Reports/screenshots: `artifacts/dash-controls/`. Pre-change source checkpoint:
`exports/pre-dash-controls-source-2026-11-14.zip`. There is no Git repository.

### Final Results

- Five focused controller/dash groups pass. The other thirteen core fighters
  preserve their data and 780 abstract-input frames against the prior release.
  Boomerangus walking, complete vertical jump traces and external launch
  response are unchanged. Dash ranges mirror left/right and match at
  30/60/120 Hz; four sports pass replay and six-frame delayed rollback.
- Four non-browser suites pass: dash-controls, core-release,
  projectile-magazine and rollback. Core/full parity covers 3,390 frames and
  eleven replays. Full rollback covers 8,280 frames and 1,047 corrections.
- Six browser suites pass: dash-controls, controller-mapping, roster-grid,
  shared-menu, projectile-magazine and core-release. The magazine test was
  updated from R2 to L2 for its Punch-alias hold; its old R2 assumption is no
  longer valid under the requested mapping. Raw first-run logs are retained.
- Eight standard-controller/profile cases pass, plus the preserved GameCube
  adapter case. Native L1/Cross/R2/Triangle input produces the same longer
  Boomerangus dash. Analog triggers and partial-alias release work.
- Actual Boomerangus/Archer WebRTC 1v1 passes matching hashes, 50 ms delay,
  15 ms jitter, 5% packet loss, pause, rematch and disconnect. Offline play and
  all runtime assets pass. No physical-controller test is claimed.
- Historical replay fixtures remain intact; previously documented historical
  fixture discrepancies were not concealed or regenerated.

Build: `http://localhost:8086`.

Core-only offline ZIP: `exports/Dash-Punch-Dash-Controls-2026-11-14.zip`,
7,666,979 bytes. Archive integrity passes. Existing builds and running servers
are retained. Both peers need the new movement build for online play.
