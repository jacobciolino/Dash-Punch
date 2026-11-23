# Fired Up

Showcase was removed on November 13, 2026. Fired Up remains available in normal
matches with its existing behavior and tuning unchanged.

## Fired Up In All Matches

- Punch clashes: both fighters gain 8 temporary health.
- Projectile clashes: both current owners gain 8.
- Successful offensive Kickoff: attacker gains 6 after damage is resolved.
- Mutual Dash Rebound: both fighters gain 6.
- Shielded / missed Kickoffs do not earn reserve.
- Reserve caps at 40, absorbs incoming damage before normal health, and never
  heals normal health. Punch and offensive Kickoff damage scale linearly from
  normal to +25% according to the reserve remaining. Thorns are unchanged.
- Each qualifying interaction refreshes a six-second grace period. After that,
  reserve drains at 40 points/second until empty. Damage can consume it earlier.
- Gold inside the existing health bar shows the reserve; no extra HUD meter or
  input. Flame intensity follows remaining reserve. Brief low-opacity impact
  frames accompany gains. Heated exchanges subtly increase shake.

The mechanic uses per-fighter fields captured by existing rollback / host
snapshot serialization. Online build signature advanced; both peers must refresh.

## Verification

`npm run test:fired-up` checks real clash and Kickoff gains, real Punch damage,
absorption/overflow, reserve cap, grace refresh/decay and exact state restoration.
Combat, shield, projectile, menu and rollback suites remain separate.
