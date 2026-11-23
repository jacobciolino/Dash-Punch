# Deliberate Shared-Menu Back

- Hold the existing Punch/Back input or Escape for 1.6 seconds; release early
  to cancel. One hold returns one menu level, never several screens.
- MENU_BACK_HOLD_SECONDS is defined once in lobby-cards.js. Its small reducer
  tracks monotonic milliseconds independently per eligible input owner. The HUD
  shows the greatest individual progress, never combined controller time.
- Shared Back accepts only joined, connected human controllers. Open cards keep
  their owner's input; immediate card Back, View/Select, Start and Ready remain.
- Screen/ownership changes, remapping, focus loss and disconnect cancel holds.
  Carried or reconnected held buttons must release before becoming eligible.
- Clickable Back/Done exits first change to Confirm Return. A separate confirm
  activates the return; held Confirm never repeats it automatically.
- Pause/resume, gameplay mappings, simulation clocks and rollback state are
  unchanged. Victory and controller-reconnect screens keep their existing Back
  restrictions. No menu hold preferences enter snapshots or gameplay hashes.

Tests: node tests/menu-back.test.js and node tests/menu-back.browser.test.js.
Browser checks use six simulated controllers, keyboard, 720p/1080p and existing
offline asset embedding. Physical controllers have not been tested in this pass.
