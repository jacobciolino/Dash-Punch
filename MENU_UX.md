# Drop-In Local Lobby

## Main Path

Play -> Local -> Choose Fighters -> Choose Stage -> Fight. Online 1v1 remains
separate. Extras still contains Stage Builder, Controls and Quick Playtest.

The local screen is both the roster and the lobby. All ten seats are visible;
P1 and P2 are active by default, P3-P10 start empty on a fresh installation.
Saved local setups restore their active seats, characters, teams, color variants,
model preferences and CPU status. CPU players are automatically ready.

## Controller Ownership

- Unassigned controllers join on Start or the primary bottom face button
  (Cross on PlayStation, standard Gamepad button 0).
- Connecting alone does not join. The join edge cannot also ready or start.
- A waiting human seat is filled first, then the first empty seat. CPU seats
  are not silently replaced. Each controller owns at most one seat.
- Each pad moves its own fighter marker independently. Confirm toggles Ready;
  Back unreadies. Ready fighters must unready before changing their fighter.
- Dash confirms and Punch backs out throughout menus, using saved combat aliases.
  Alias holds are combined before detecting presses; extra face/shoulder commands
  are not required. Start remains an optional join/advance shortcut.
- Punch from an unready roster opens the player selector. Left/Right switches
  editable seats for the host; Dash returns to that seat's roster. Up/Down moves
  through Type, Team, Color, Model, Player, Close Slot, Choose Stage and Back.
  Left/Right or Dash adjusts a setting. Other connected humans cannot be edited.
- Ready focuses Choose Stage for the host; a fresh Dash advances when all ready.
  Stage navigation is host-only; mouse/keyboard can also advance.
- Host Back from their own unready roster selection returns to Play, where
  Settings is controller-accessible. Back first unreadies a ready player.

Mouse controls on every player card adjust Human/CPU/Empty, team, color and model
directly. Clicking an empty roster seat's character selection adds a CPU there.
Type toggles Human/CPU; empty seats add CPU. Close Slot explicitly removes a seat.
Converting a human to CPU/Empty
releases its controller. Controls/remapping remain accessible via the existing
Player Options keyboard command O or Extras -> Controls.

Settings is available on both the title and Play menus and contains Controls /
Button Mapping. Select an action and press a fresh controller button or key.
Dash/Punch bindings add aliases; directional bindings replace their previous
binding. The small remove control removes the last controller alias. Reset to
Defaults restores that player's keyboard and recognized-controller defaults.
Menu confirm/back follow Dash/Punch bindings. Enter/Escape remain keyboard fallbacks.
Capture ignores the button used to open it, cancels with Escape or after 15
seconds, and cannot transfer a device owned by another player.

Mappings are saved by player slot and reported controller ID. Identical hardware
IDs share a device type, with separate player-slot profiles. GameCube defaults
use standard-mapped A/L-click/L-analog for Dash and B/R-click/R-analog for Punch.
Trigger button values above 0.5 count as held, as do digital button presses.
Unmapped adapters reporting raw trigger axes need physical adapter testing; no
axis layout is guessed. Other controllers retain existing default mappings.
The What's New section on the title/Play menus lists verified customization.

## Disconnects

Assignments retain both browser gamepad index and controller ID. Disconnects
remove Ready and display a warning without assigning another controller.
The same index/ID reconnects to its original seat, unready. If its index changes,
Start/Confirm reclaims the first disconnected seat with that ID. A different ID
at an old index cannot control the reserved seat. Host can remove/convert a
disconnected seat. Empty middle seats do not renumber remaining players.

Gamepad API does not supply reliable physical serial numbers. Two identical-ID
controllers reconnecting at different indices are inherently ambiguous; reconnect
them one at a time or free/reassign the affected seats. Browser/OS support may
expose fewer than ten pads, and some devices only appear after a button press.
Standard-mapped modern controllers use button 0/9 to join; nonstandard adapters
may need their existing mappings/device configuration. No new hardware claims
are made by synthetic controller tests.

## Matches And Presentation

The existing engine supports ten fighters. The lobby uses stable seat IDs and
filters empty seats when spawning; combat rules were not rewritten. Ten-fighter
and sparse nine-fighter matches are covered by browser tests. This is a capacity
check, not a guarantee of ten-player performance on every machine.

Returning via Pause -> Local preserves settings and exposes immediate Rematch.
Start gates require at least two active fighters, every connected human ready,
and at least two represented teams in team modes. Friendly fire remains on by
default. Four color variants affect presentation only; imported sprite variants
are cached per sheet, rather than filtered anew every gameplay frame.

Core characters are Orbit, Spike, Rain, Edgebert, Reverso, Whipado, Micro USB,
Gun Man, Archer, Kite and Chungus. All other roster names carry an asterisk.
The preferred nine-stage pool (Crosswire through Corners) is unmarked; remaining
and custom stages are marked experimental, still in the same stage reel.

No preexisting AI difficulty levels were found. The current AI behavior is
preserved; difficulty tuning was intentionally not invented in this menu task.

## Tests

- `npm run test:lobby`: ten-controller join/selection/ownership, CPU/Empty,
  team/color, reconnect at another index, host gates, ten/sparse matches,
  retained settings and experimental content.
- `npm run test:single-controller`: PS4-style pad-only human-versus-CPU setup.
- `npm run test:menus`: keyboard/mouse, remapping/preferences, Ready gates,
  builder, pause and desktop/smaller-window label/layout bounds.
- `npm run test:countdown`: loaded/frozen arena before countdown, then AI starts.
- `npm run test:browser`: real two-browser WebRTC rollback, pause/rematch/disconnect.
- `npm run test:performance`: startup laziness and render cache/frame pacing.
- `npm run test:mapping`: keyboard/controller access, fresh-edge capture,
  saved mappings/reconnect, GameCube digital/analog trigger values, alias holds,
  charged-action partial/final releases, defaults and patch notes.

Desktop layouts are verified at 1280x900 and 960x720. Narrower than 760px may
require page/seat-strip scrolling. Physical ten-controller ergonomics and unusual
adapters still require human testing.
