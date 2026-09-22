# Current Task

## Objective
Progression Expansion, Balance, Relics, Secret Passives & Roster Expansion.

## Status
Implementation in progress.

## Scope
1. **Max-Upgrade Progression Lock Fix**:
   - Prevent empty Level Up modal loops when all normal upgrades are maxed.
   - Maintain continuous, uncapped numerical player leveling and preserve exact XP overflow.
   - Clear stale pending level-up selections on max state transition and provide safe defensive resume.

2. **20 Normal Upgrades Expansion**:
   - Retain 12 existing paths (8 base + 4 elemental) and add 8 new upgrade paths:
     - `regeneration`, `barrier`, `area`, `recovery`, `boss_hunter`, `executioner`, `precision`, `fortune`.
   - Max tier remains 5 for all 20 upgrades (up to 100 total upgrade tiers per complete build).
   - Rebalance existing upgrades to align with target pacing.

3. **Redesigned Legendary Chests & Relic Vault**:
   - Common Chest: Offers up to 3 normal upgrades.
   - Rare Chest: Offers up to 3 normal upgrades + grants +25 Shield.
   - Legendary Chest (Relic Vault): Offers up to 3 non-maxed special relics (never normal upgrades) + grants +50 Shield, +35 HP, +500 Score.
   - All-relics-maxed fallback: Heals to max HP, fills Shield, +1000 Score, no blocking modal.

4. **Expanded Special Relics (8)**:
   - Retain Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment.
   - Add Aegis Capacitor, Apex Lens, Echo Prism, Gravity Seed.
   - All relics stack up to 5 times.
   - Update Boss loot table to drop 1 world pickup (20% recovery, 80% relics) + 1 guaranteed Legendary Chest.

5. **Secret Passive Fusions (4)**:
   - Event-driven binary unlocks evaluated on relic stack changes:
     - Storm Engine (Overclock >= 2, Tesla >= 2)
     - Venom Singularity (Toxic >= 2, Gravity >= 2)
     - Radiant Bastion (Phoenix >= 1, Aegis >= 2)
     - Apex Echo (Apex >= 2, Echo >= 2)
   - Toast notification on unlock; hidden from HUD until unlocked.

6. **Playable Roster Expansion (8 Total Survivors)**:
   - Baseline survivors: Bonk, Byte, Tank, Nova, Hex.
   - New survivors:
     - `rift` (Rift Disc: piercing, returning disc; synergy: Event Horizon).
     - `fuse` (Pulse Mine: delayed positional mine; synergy: Chain Reaction).
     - `lux` (Light Lance: instant precision beam; synergy: Solar Refraction).
   - Distinct procedural models, animations, attack anticipation, damage reactions, and designed Lucide React fallback presentation.

7. **General Balance Pass**:
   - XP curve: Math.round(85 * Math.pow(1.19, level - 1)).
   - Enemy HP scaling (+9%/round) and damage scaling (+0.5/round).
   - Boss HP scaling (+60%/tier) and damage scaling (+40%/tier) for tiers > 1.
   - Build completion target shifted to Rounds 35–50.

8. **Expanded F8 Developer QA**:
   - Fast reproduction controls for all 8 characters, 20 upgrades (max/clear), 8 relics, 4 secret passives, chest spawning, lethal damage, and run reset.
   - Live combat stat inspector.

9. **Asset Staging Rules**:
   - Final external art assets deferred until gameplay validation.
   - Procedural 3D, CSS, and Lucide React fallbacks used for all new elements.

## Verification Plan
- `npm run lint` -> 0 errors, 0 warnings.
- `npm run build` -> production build exit 0.
- `git diff --check` -> no whitespace or conflict markers.
- F8 Dev QA validation across progression, chests, relics, secret passives, characters, and reset.
