# BONKAGEDDON Weapon Synergies

These synergies are implemented in `src/game/weaponSynergies.ts` and consumed by combat code. They are unlocked by reaching the listed upgrade tiers during a run.

| Synergy | Character | Weapon | Required upgrade combination | Gameplay effect |
| --- | --- | --- | --- | --- |
| METEOR SLAM | BONK | Mega Hammer | Damage Boost T2 + Critical Strike T2 | Critical hammer attacks create a secondary smaller shockwave. |
| PRISM BARRAGE | BYTE | Energy Orb | Haste T2 + Multishot T2 | Attacks gain an additional stronger central piercing orb. |
| CYCLONE EDGE | TANK | Cleaving Axe | Damage Boost T2 + Multishot T2 | Orbital axes gain a stronger, wider, faster combat pattern. |
| SUPERNOVA | NOVA | Nova Burst | Damage Boost T2 + Haste T2 | Radial burst releases a secondary delayed outer burst. |
| HEXSTORM | HEX | Hex Chain | Critical Strike T2 + Multishot T2 | Seeking void projectile can jump to an additional enemy. |
| EVENT HORIZON | RIFT | Rift Disc | Area Amplifier T2 + Critical Strike T2 | Disc size +25%, +1 outbound pierce, return hits deal +25% damage with a violet dimensional trail. |
| CHAIN REACTION | FUSE | Pulse Mine | Damage Boost T2 + Area Amplifier T2 | Detonations trigger a secondary shockwave after 0.28s dealing 45% damage over 70% radius. |
| SOLAR REFRACTION | LUX | Light Lance | Critical Strike T2 + Critical Power T2 | Critical hits refract to a secondary enemy within 5.5 units dealing 60% damage. |

Presentation notes:
- Character cards show each survivor's synergy path before starting a run.
- Level-up choices call out upgrades that build toward or unlock the selected survivor's synergy.
- HUD shows the selected survivor's synergy progress and switches to the synergy name once active.
