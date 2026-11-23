# Own Goal Repair

## Current Rule: If It Goes In

The November 15 human-playtest update supersedes the old entry restrictions
below. Soccer and Basketball now award the opposing team one point whenever
the ball center is inside the goal, including own touches, an already-inside
ball, reverse entry and Spike carrying it there. The existing goal pause/reset
prevents duplicate points. Moving Soccer goals use their current interior.
Field Goal, Golden Rush rings and the other objective sports keep their rules.
Both online peers must use rollback build 54 or its Core Edition.

Focused coverage: `tests/goal-interiors.test.js`; packaged browser coverage:
`tests/own-goals.browser.test.js`. Old assertions explicitly rejecting an inside,
rear-entering or carried ball describe the superseded design, not this rule.
Historical replay fixtures have not been regenerated.

## Historical Repair

Soccer and Basketball award a point to the opposing team when a ball enters the
defending team's goal, regardless of last touch. Court/Battle and gravity/open
variants share this rule. Ordinary own shots already followed it; shield
deflections and walking dribbles had missed-entry paths.

## Cause and Repair

A shield places the ball just outside its surface. Near a goal line or basket
opening, this can move the ball across the scoring plane in a single contact.
The ordinary physics sweep deliberately excludes position corrections, so the
ball was already inside on the next step and no entry was detected.

The shared ball-contact path now returns real shield, Kickoff and moving-body
displacements. A body push requires actual fighter travel into the contact
normal, not a stationary overlap correction. Bounded collision samples validate
these paths against solid terrain and existing swept scoring openings. Forces
and ball ownership are unchanged. Wrapped contacts use local seam coordinates
rather than a cross-arena sweep.

Spike possession remains non-scoring. Rear/side entries, initial overlap, solid
obstructions and duplicate scores are rejected. Golden Rush, Target Charge,
boulder scoring and fighter mechanics are unchanged. Network build 49 requires
both peers to update.

## Verification

- `node tests/own-goals.test.js`: shield rebounds, ordinary own shots, native
  punches, both teams, Court/Battle, gravity/open variants, capture/wall/rear/
overlap rejection, native walking dribbles, seam safety, replay, snapshots, delayed rollback and
  30/60/120 Hz equivalence. Also compares all fourteen fighters and all existing
  sports against the previous release without changing historical fixtures.
- `node tests/own-goals.browser.test.js`: packaged Chrome checks at 1280x720 and
  1920x1080 with ten fighters, plus direct offline-file Soccer/Basketball checks.
  Screenshots and results are in `artifacts/own-goals/`.
- Existing Dashball, core packaging, projectile magazine and rollback suites
  provide regression coverage. No physical-controller testing is claimed.

The pre-change source checkpoint is
`artifacts/own-goals-before-2026-11-14.zip`; this checkout is not a Git repository.
