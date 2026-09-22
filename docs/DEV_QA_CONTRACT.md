# Developer QA Harness Contract

## 1. Scope & Purpose

This document defines the permanent contract for the in-game Developer QA Harness (toggled via **F8** or dedicated QA trigger) in **BONKAGEDDON**. The harness provides rapid reproduction and validation of gameplay systems during development.

---

## 2. Core Architectural Principles

1. **Development-Only**:
   - QA controls are strictly isolated to development environments (`import.meta.env.DEV` or development builds).
   - QA code must never introduce overhead or alter normal production gameplay mechanics.
2. **Reuse Existing Pathways**:
   - QA buttons and triggers must invoke the actual store actions, combat calculations, and progression pipelines rather than duplicating gameplay logic.
3. **Clean Reset**:
   - The harness must provide a total reset capability that clears all simulation state, arrays, modifiers, and stores back to baseline.

---

## 3. Required QA Capabilities

### Progression & Upgrades
- **Max All Normal Upgrades**: Instantly sets all 20 normal upgrades to Tier 5.
- **XP After Max**: Grants substantial XP to trigger multiple level advancements while at max upgrades to verify uncapped leveling and lack of progression lock.
- **Clear Normal Upgrades**: Resets all normal upgrades to Tier 0.
- **Queue Inspector**: Displays current `pendingLevelUps`, player level, and XP overflow.

### Chest Spawning & Rewards
- **Spawn Common Chest**: Triggers a Common chest event (normal upgrade choices).
- **Spawn Rare Chest**: Triggers a Rare chest event (normal upgrade choices + 25 Shield).
- **Spawn Legendary Relic Vault**: Triggers a Legendary chest event (3 relic choices, stat buffs, or maxed fallback).

### Relics System
- Individual stack control (+1 / -1 / max) for all **8 special relics**:
  - Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment, Aegis Capacitor, Apex Lens, Echo Prism, Gravity Seed.
- Display current stack count for each relic (0 - 5).

### Secret Passives
- Display unlocked secret passives.
- Dedicated recipe buttons to instantly satisfy recipes:
  - **Unlock Storm Engine** (Overclock 2, Tesla 2).
  - **Unlock Venom Singularity** (Toxic 2, Gravity 2).
  - **Unlock Radiant Bastion** (Phoenix 1, Aegis 2).
  - **Unlock Apex Echo** (Apex 2, Echo 2).

### Playable Characters Testing
- Quick-switch selector across all **8 survivors**:
  - `bonk`, `byte`, `tank`, `nova`, `hex`, `rift`, `fuse`, `lux`.
- Instantiates the character via authoritative character initialization pathways.
- Real-time combat inspector displaying:
  - Selected character and weapon type.
  - Effective attack cooldown (accounting for Haste, Overclock, Storm Engine).
  - Attack speed multiplier.
  - Global damage multiplier.
  - Boss damage multiplier (Boss Hunter, Apex Lens, Apex Echo).
  - Critical chance and critical multiplier (Precision, Echo Prism, Apex Echo).
  - Effective attack area multiplier (Area, Gravity Seed, Venom Singularity).
  - Active weapon synergy status.
  - Current and max Shield.
  - Fortune-modified normal-enemy chest drop chance.

### Combat & Survivability Stress
- **Trigger Lethal Damage**: Inflicts 9999 damage to test Shield breakdown, HP loss, and Phoenix Fragment / Radiant Bastion revival.
- **Spawn Boss Encounter**: Spawns any specified rotating boss at a chosen tier.
- **Toggle Frenzy**: Instantly triggers or cancels Frenzy horde mode.
- **Spawn Enemy Swarm**: Spawns enemies up to the hard cap of 48 to test horde performance.
- **Reset QA Run**: Flushes all upgrades, relics, passives, pending chests, active enemies, projectiles, pickups, and boss state.
