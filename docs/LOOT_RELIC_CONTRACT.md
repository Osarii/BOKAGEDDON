# Loot, Chests, Relics & Secret Passives Contract

## 1. Scope & Purpose

This document defines the permanent contract for world pickups, chest drop pacing, chest reward mechanics, the 8 special relics, and secret passive fusions in **BONKAGEDDON**.

---

## 2. Drop Rules & Loot Contracts

### Boss Death Contract
Upon the defeat of any rotating boss (Rounds 10, 20, 30, 40, 50, ...):
1. **World Pickup**: Exactly **1** pickup randomly rolled from `BOSS_LOOT_TABLE`:
   - 20% Recovery Pickups (Medkit Emergency, Medkit Case, Shield Potion, Shield Battery).
   - 80% Special Relic Pickups (Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment, Aegis Capacitor, Apex Lens, Echo Prism, Gravity Seed; 10% weight each).
2. **Guaranteed Chest**: Exactly **1** separate **Legendary Chest** (Relic Vault) spawned adjacent to the boss death location.

### Normal Enemy Contract
- Normal enemies drop XP orbs and have a baseline chance to drop chests:
  - Base drop chance: `1.5%` (`0.015`).
  - Pity guarantee: 1 chest guaranteed every `30` normal enemy kills if none dropped.
  - Normal enemies **NEVER** directly drop special relic world pickups.
  - Chests dropped by normal enemies roll rarity according to dynamic chest weights.

---

## 3. Chest Identities & Reward Systems

Chests are rolled across three distinct tiers:

### Common Chest (Base Weight: 75)
- **Reward**: Offers up to 3 valid non-maxed normal upgrades (`UpgradeId`).
- Player selects 1 upgrade to advance its tier by +1.
- No secondary stat bonuses.

### Rare Chest (Base Weight: 22)
- **Reward**: Offers up to 3 valid non-maxed normal upgrades (`UpgradeId`).
- Player selects 1 upgrade to advance its tier by +1.
- **Rarity Bonus**: Grants an immediate `+25 Shield` upon claiming.

### Legendary Chest / Relic Vault (Base Weight: 3)
- **Identity**: Dedicated **Relic Vault**.
- **Rules**:
  - **NEVER** offers normal `UpgradeId` choices.
  - Offers up to 3 non-maxed special relics (`SpecialPickupType`).
  - Player selects exactly 1 relic to increase its stack by +1 (up to max stack of 5).
  - Also awards: `+50 Shield`, `+35 HP`, and `+500 Score`.
  - If fewer than 3 non-maxed relics remain, displays only the valid remaining choices.
- **All-Relics-Maxed Fallback**:
  - If all 8 special relics are at max stack (5), opening a Legendary Chest automatically triggers:
    - Heal to Max HP (`health = maxHealth`)
    - Fill Shield to Max Shield (`shield = maxShield`)
    - `+1000 Score`
    - Seamlessly closes without presenting an empty or blocking modal.

### Fortune Upgrade Rarity Skew
The `fortune` normal upgrade enhances normal-enemy chest drops:
- Drop chance: `+0.30%` per tier (from 1.5% at T0 up to 3.0% at T5).
- Rarity weights:
  - Tier 0: Common 75 / Rare 22 / Legendary 3
  - Tier 5: Common 69 / Rare 25 / Legendary 6

---

## 4. Special Relics (8)

Relics are permanent, stackable run modifiers stored in `passives: Record<SpecialPickupType, number>`:
- **Maximum Stacks**: `5` stacks per relic.

| Relic ID | Display Name | Stack Effect | Max Stack | Visual / Theme |
| :--- | :--- | :--- | :--- | :--- |
| `overclock_core` | Overclock Core | +15% attack speed | 5 | Orange reactor core |
| `tesla_cell` | Tesla Cell | +25% electric damage, +1 chain target | 5 | Cyan capacitor |
| `toxic_relic` | Toxic Relic | +20% poison DoT damage, +1s duration | 5 | Emerald toxic vial |
| `phoenix_fragment` | Phoenix Fragment | 1 revive per stack (heal 40% HP, 2s invuln) | 5 | Crimson feather |
| `aegis_capacitor` | Aegis Capacitor | +15 max Shield (+15 Shield on pickup) | 5 | Cyan defensive cell |
| `apex_lens` | Apex Lens | +6% damage to bosses per stack | 5 | Amber targeting lens |
| `echo_prism` | Echo Prism | +0.10x critical damage multiplier | 5 | Violet refraction prism |
| `gravity_seed` | Gravity Seed | +8% attack area, +10% XP magnet radius | 5 | Dark indigo gravity core |

---

## 5. Secret Passive Fusions (4)

Secret passives are powerful binary unlocks achieved through specific relic synergies.

### Rules & Architecture
1. **Binary Unlocks**: Stored in `secretPassives: Record<SecretPassiveId, boolean>` (default all false).
2. **Event-Driven Evaluation**: Checked ONLY when relic stacks change (never polled per-frame in `useFrame`).
3. **HUD Visibility**: Locked secret recipes are hidden from the normal HUD; once unlocked, their active status displays prominently.
4. **Notification**: Unlocking a secret passive triggers a non-blocking toast/banner: **SECRET PASSIVE UNLOCKED**.
5. **Reset**: All secret passives reset to inactive on a new run.

### The 4 Secret Fusion Recipes
1. **Storm Engine** (`storm_engine`):
   - **Recipe**: `overclock_core >= 2` AND `tesla_cell >= 2`.
   - **Effect**: +10% final attack speed, +10% Shock/Tesla proc chance, +25% Shock chain damage.
2. **Venom Singularity** (`venom_singularity`):
   - **Recipe**: `toxic_relic >= 2` AND `gravity_seed >= 2`.
   - **Effect**: +25% Poison DoT, +20% Poison duration, +10% final attack area.
3. **Radiant Bastion** (`radiant_bastion`):
   - **Recipe**: `phoenix_fragment >= 1` AND `aegis_capacitor >= 2`.
   - **Effect**: Revive restores 60% max HP (instead of 40%), +50 Shield, and 3.5s invulnerability (instead of 2.0s).
4. **Apex Echo** (`apex_echo`):
   - **Recipe**: `apex_lens >= 2` AND `echo_prism >= 2`.
   - **Effect**: Against bosses: +15% additional boss damage and +0.25x critical damage multiplier.

---

## 6. Asset Staging Principle

- Visual presentation uses existing assets for original pickups, and procedural 3D / CSS / Lucide React fallbacks for new relics and secret emblems.
- External image asset files are strictly deferred until runtime playtesting confirms gameplay balance.
