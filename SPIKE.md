# Spike

Spike uses the shared Seeker PRO animation sheets with a cached green recolor and
scale texture. Small native-pixel spines grow from each pose's actual silhouette,
rather than a fixed armor overlay. Matches and character previews share the same
processed sheet. Orbit's original images are never mutated. Block-model mode
remains available. Each sheet is processed once, with no live blur/filter chain
or new image downloads. `npm run test:spike-art` checks palette/spines across all
six sheets and renders character select and a match in Chrome.

- Orbit's movement baseline; 104 health and four air dashes.
- Upward-biased Punch launches (`{x:0.25,y:-1.3}`, strength 0.78).
- Chase has moved to Whipado. Spike no longer follows opponents after a landed
  Punch. His shield, launches, movement and all other abilities remain unchanged.
  Whipado and Paul retain the existing 0.92 follow-through and 0.3-second minimum
  carry; blocks/misses do not activate Chase. A fresh Dash is still required
  before pursuit movement can become Kickoff intent. Whipado's 0.16-second spell
  whip and Hooded Seeker casting projection are purely visual, reusing the
  existing successful-Punch visual lifetime. Her normal serpent model remains.
- Shield: 140 durability, 40 px barrier padding (normal 12), 80-degree half-angle
  (normal 55). Still directional; its uncovered back remains vulnerable.
- Incoming Punch and Kickoff shield durability damage is multiplied by 0.55.
- Punch blockstun is multiplied by 0.6: 100 ms tap / 180 ms full charge. Existing
  release rearming, chip, regeneration, knockback and shield-break rules remain.
- Frontal shield contact deals 7 damage, 180 ms of existing non-combo stun and
  130 units/sec outward push. Ordinary contact costs 4 shield durability; a
  blocked Kickoff uses its existing reduced impact cost, not both costs.
  Genuine separation rearms contact. Persistent overlap or releasing/reholding
  without separation cannot farm damage. Spike receives KO attribution, not
  offensive resource refills. Court, friendly-fire, invulnerability and Phantom
  ghost rules remain intact. Backside contact and Punch reflection are unchanged.
  The shielded Kickoff does not apply Punch blockstun to Spike.

Optional art assignment: `spike: {spriteSet:"seeker"}`. Gameplay tuning lives in
`CHARACTER_DATA.spike`, and all shield extension values default to unchanged
behavior for the rest of the roster. The online build signature was advanced;
both peers should refresh.

Tests: `npm run test:spike`, `npm run test:spike-shield-contact`, quick rollback
and the Ember browser smoke's shield-contact fixture.
