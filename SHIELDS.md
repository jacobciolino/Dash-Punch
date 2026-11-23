# Persistent Shield Resources

## Implemented
Every fighter retains `shieldHealth` through release/reactivation and regenerates
only while the shield is inactive. Activation never refills durability. A new
hold starts `shieldActiveTime` at zero but uses only the durability currently
available. Full fighter/round resets continue restoring resources normally.

Hold duration and impact durability are now independent. The old implementation
enforced overhold timeout by draining durability. That passive drain is removed.
Reaching maximum active hold time sets the existing exhausted/fizzle state, clears
punch charge and deactivates the shield without damage or shield-break stun.
Release is required before another hold. Inactive fizzle can recover gradually.

Attacks, projectiles and existing damaging Kickoff interactions still deplete
durability and call the existing shield break. Existing break stun (1.65s),
regeneration delay (2.4s), visuals, audio and defensive rules are preserved.
Non-damaging sports shield contacts are unchanged; no new collision damage or
shield-drain rule is imposed on neutral sports objects by this resource patch.

## Recovery Formula
One shared tuning constant: `SHIELD_RECOVERY_MULTIPLIER = 1.5`.

```
holdSeconds = data.shieldDuration
           ?? data.punchChargeTime + (1.5 + 2) * (data.shieldFizzleScale ?? 1)
fullRecoverySeconds = holdSeconds * SHIELD_RECOVERY_MULTIPLIER
durabilityPerSecond = data.shieldMax / fullRecoverySeconds
```

The fallback preserves each fighter's existing charge/overhold/fizzle-duration
configuration. `shieldDuration` explicitly supports long-duration, low-durability
shields without coupling time to maximum impact health. Durability remains capped
at the fighter's maximum. All updates use the established fixed simulation steps.

| Fighter | Maximum active hold | Durability | Full recovery, excluding delay |
| --- | --- | --- | --- |
| Anchor | 4.24 sec | 68 | 6.36 sec |
| Spike | 8 sec | 140 | 12 sec |
| Reflektor | 10 sec | 36 | 15 sec |

Spike previously had high durability but almost the same passive hold timeout as
Anchor (4.22s). His explicit eight-second hold realizes the requested long-shield
identity; punch, movement, thorns and shield protection remain unchanged.
Existing 1.1s post-impact recovery delay remains. When a genuine break starts the
2.4s delay, full recovery from zero is approximately 8.76s for Anchor / 14.4s for
Spike. Remaining delay may already have elapsed while the shield stayed active.

Reflektor's low durability recovers at 2.4 units/sec. Full recovery after a genuine
break takes approximately 17.4 seconds, including the existing 2.4-second delay.

## Compatibility
- Successful punches, including owned/reflected projectile hits and sports-object
  contacts, restore `effectiveDamage * 0.25` durability, capped at shield maximum.
  Contact generations deduplicate recovery per target. Court contacts can recover
  without health damage, knockback or ordinary hit-resource refills. Kickoffs,
  misses and passive shield pushing do not award this punch recovery.
- Examples before ground/stale/status modifiers: Anchor tap 18 -> 4.5 durability;
  Booster 30/54 -> 7.5/13.5; Lamer 7/11 -> 1.75/2.75. Existing shield-break stun
  and zero-durability break lockout cannot be bypassed. Passive regen is unchanged.
- Shield direction, coverage, damage, recoil, reflection and sports physics remain
  on existing paths. This resource change adds no movement or attack abilities.
- Spike's soccer capture releases on normal timeout without shield-break stun.
- Dash-from-shield keeps existing reactivation gates and does not refill health.
- Gun Man/Archer keep their existing fizzle cleanup of currently controlled shots;
  redirected ownership, ammunition and air-dash resources are not reset.
- Boomerangus keeps the existing exemption from projectile cleanup on timeout.
- `shieldActiveTime`, health, exhaustion and recovery delay use existing fighter
  snapshot/replay serialization. Presentation bars do not affect simulation hashes.
- Build 62 requires matching online clients. No online capacity changes.

## Reflektor
The user authorized modifying the existing licensed sprite after the missing
named asset was reported. Reflektor uses Seeker PRO Void, not an invented claim
of a separate metallic-scaled source character. A cached native-pixel cloth mask
adds silver/blue scale edges and angular bright/pale-blue mirror facets; source PNGs, alpha, frame anchors and timing remain
unchanged. All fourteen animation clips are checked against their source alpha.

- 165 HP, 118.8 units/sec walking, 41.58 while shielding; three air dashes.
- Anchor's 620-1340 dash endpoints, .78 air scale and .72-second dash charge.
- Punch: 16 nominal damage, 820 base knockback, .8s charge, .09s startup,
  .12s base active, .24s base recovery. Normal roster charge modifiers still apply.
- Shield: 40-unit padding, 160-degree frontal coverage, ten-second hold, 36 HP.
- Relative velocity is reflected along an aim-dominant contact normal with .85
  restitution. Moving shields contribute their velocity. Slow pushes have a
  60-unit/sec minimum (divided by effective boulder mass for giant boulders).
- First impact durability cost: `.35 + inwardSpeed * .012`, with 1.6x impact
  weight for boulders. Continuing contact costs only .45/sec, once per fixed tick.
  Contacts rearm after separation beyond an eight-unit margin, not a cooldown.
- Fighter collision damage: `round(clamp((inwardSpeed - 140) * .018, 0, 22))`.
  Native friendly-fire, Court, invulnerability and Phantom exclusions apply.
  Gentle pushes do not damage. Fighter speed caps at 1500, small objects at 2050,
  boulders at 700; native sports speed limits may further constrain them.
- Native projectile ownership/reflection, magazines, Boomerang catch/recall and
  permanent Target Charge ball ownership remain authoritative. No passive contact
  score, attack confirmation or air-dash refill is awarded.
- Contact generations serialize through the existing fighter snapshot state.
  AI uses ordinary Punch holds, imperfect defensive aim and low-durability release.

## Focused Verification
- `node --test tests/shield-resources.test.js tests/spike.test.js`: persistence,
  duration scaling, timeout/break distinction, native inputs, all core fighters,
  sports capture, snapshots, delayed rollback and 30/60/120Hz (14 passing tests).
- `TEST_FILTER=fizzle node tests/projectile-rework.test.js`: two focused timeout
  and reflected-projectile ownership cleanup groups. Historical fixtures untouched.
- `node tests/shield-resources.browser.test.js`: native keyboard shielding, partial
  durability, timeout and genuine break at 1280x720 / 1920x1080, no page/asset errors,
  state-hash-neutral drawing. Screenshots in `artifacts/shield-resources/`.

No exhaustive unrelated suites, new dependencies, release build or ZIP. Physical
controller feel has not been verified. Reflektor's focused tests add native balls,
boulders, bags, fighter sweeps, Boomerang reflection, wrap seams, ten CPUs,
snapshot/replay, delayed rollback and 30/60/120Hz. Browser checks cover roster,
720p/1080p ten-fighter play, alpha preservation, victory and real WebRTC hit/hash
agreement. Screenshots: `artifacts/reflektor/`. Human angle/balance testing remains.
