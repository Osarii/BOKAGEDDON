# Progression Contract

## 1. Scope & Purpose

This document defines the permanent rules governing player leveling, XP curve math, normal upgrades, upgrade selection, and terminal-state progression behavior in **BONKAGEDDON**.

---

## 2. XP & Leveling Mathematics

1. **XP Requirement Formula**:
   ```typescript
   export function getRequiredXP(level: number): number {
     return Math.round(85 * Math.pow(1.19, level - 1));
   }
   ```
2. **XP Preservation & Overflow**:
   - Exact XP overflow must ALWAYS be preserved across level-ups:
     `excessXP = currentXP + gainedXP - requiredXP`
   - When a large XP drop causes multiple level advances in a single frame/event, all levels and remaining overflow must calculate deterministically.
3. **Uncapped Numerical Leveling**:
   - The numerical player level can continue indefinitely (Level 1, 2, ..., 100+).
   - Endless survival runs continue to track level milestones and score multipliers regardless of whether upgrade choices remain.

---

## 3. Normal Upgrades System

1. **Pool Size & Tiers**:
   - Total Normal Upgrades: **20**.
   - `MAX_UPGRADE_LEVEL = 5` per upgrade path (unless explicitly changed by a future architectural decision).
   - Maximum total upgrade tiers across a complete build: `20 * 5 = 100` upgrade selections.
2. **Exhaustive Upgrade Roster**:
   - **Baseline (8)**: `damage`, `haste`, `speed`, `vitality`, `armor`, `magnet`, `critical`, `multishot`.
   - **Elemental (4)**: `fire`, `poison`, `shock`, `frost`.
   - **Expanded (8)**:
     - `regeneration`: HP/sec regeneration (0.30 HP/s per tier, max 1.50 HP/s).
     - `barrier`: Max Shield bonus (+15 max Shield per tier, immediately granted).
     - `area`: Effective attack area/radius (+7% per tier, max +35%).
     - `recovery`: Recovery pickup effectiveness (+12% per tier, max +60%).
     - `boss_hunter`: Outgoing damage bonus against bosses (+7% per tier, max +35%).
     - `executioner`: Direct damage bonus against enemies <= 35% HP (+6% per tier, max +30%).
     - `precision`: Critical damage multiplier bonus (+0.15x per tier; base 2.0x, max 2.75x).
     - `fortune`: Normal-enemy chest drop chance (+0.30% per tier; base 1.5%, max 3.0%) and dynamic rarity skew.
3. **Data Separation**:
   - Normal upgrades are stored in `upgrades: Record<UpgradeId, number>` on `useGameStore`.
   - Normal upgrades are strictly separated from `passives` (Relics) and `secretPassives`.
4. **Description & Math Parity**:
   - All upgrade descriptions in `UPGRADE_DETAILS` and `db.json` must exactly match the implemented combat mathematics.

---

## 4. Level-Up Selection & Terminal Max-State Contract

1. **Valid Selection Filter**:
   - Upgrade choices offered during a level-up or normal chest event must ONLY be drawn from upgrades where `currentTier < MAX_UPGRADE_LEVEL`.
   - Maxed upgrades (`tier >= 5`) must NEVER appear as selectable choices.
2. **Terminal Maxed Upgrade State (Progression Lock Prevention)**:
   - When all 20 normal upgrades have reached Tier 5 (100 total upgrades):
     - `pendingLevelUps` MUST be clamped to `0`.
     - Future XP accumulation continues to advance `level` and preserve XP overflow, but MUST NOT set `gameStatus = "levelup"`.
     - Gameplay must remain completely uninterrupted.
3. **Transition to Maxed State**:
   - If selecting the final remaining upgrade reaches the all-maxed condition while `pendingLevelUps > 0`:
     - Clear all remaining pending level-ups (`pendingLevelUps = 0`).
     - Immediately resume active gameplay (`gameStatus = "playing"`).
4. **Defensive Level-Up Overlay Fallback**:
   - If `LevelUpOverlay` ever renders with zero valid choices (e.g. due to edge-case queuing):
     - The Resume Battle action must permanently clear `pendingLevelUps` to 0.
     - The overlay must close cleanly without reopening on subsequent XP collection.

---

## 5. Architectural Separation

- **Pure Math Layer**:
  - XP curve calculations, available upgrade filtering, probability weighting, and stat calculations belong in pure TypeScript under `src/game/progression.ts` (or `src/game/combatMath.ts`).
  - No gameplay progression formulas may be hidden inside React UI components.
- **State Layer**:
  - Zustand `useGameStore` holds authoritative progression state (`level`, `xp`, `xpRequirement`, `pendingLevelUps`, `upgrades`).

---

## 6. Terminal-State QA Acceptance Cases

1. **Case A (Final Upgrade Acquired)**:
   - With 19/20 upgrades maxed and 1 upgrade at T4, level up to acquire final T5 upgrade.
   - Result: All upgrades maxed, pending queue cleared, gameplay resumes seamlessly.
2. **Case B (XP Gain at Max State)**:
   - With all upgrades maxed, collect XP pickups without crossing level threshold.
   - Result: XP bar updates, no modal appears, gameplay uninterrupted.
3. **Case C (Multi-Level XP Crossing at Max State)**:
   - With all upgrades maxed, collect a massive XP chunk crossing 2+ levels.
   - Result: Level increments accurately, XP overflow preserved, `pendingLevelUps == 0`, no modal opens.
4. **Case D (Defensive Resume Button)**:
   - If an empty Level Up modal appears, clicking Resume permanently purges pending queue and returns to battle.
