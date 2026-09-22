# Balance Contract

## 1. Scope & Philosophy

This document defines the balancing philosophy, pacing targets, and mathematical scaling rules for **BONKAGEDDON**.

---

## 2. Core Balancing Principles

1. **Holistic Combat Evaluation**:
   - Avoid balancing weapons and upgrades exclusively around theoretical paper DPS.
   - Evaluate practical DPS, effective range, area coverage, uptime, movement penalty, survivability, crowd control, horde clearing, and boss-killing reliability.
2. **No Strict Character Upgrades**:
   - Every survivor must have distinct advantages and vulnerabilities.
   - No new character (Rift, Fuse, Lux) may be strictly superior to any baseline character (Bonk, Byte, Tank, Nova, Hex) across speed, damage, survivability, and utility.
3. **No Mandatory Upgrades**:
   - Upgrade paths must offer balanced build variety. No single upgrade should be universally required to survive.
4. **Progression Pacing vs. Chests**:
   - Chest drops provide exciting power spikes but must never completely overshadow XP leveling.
   - Normal chests drop with modest base frequency (1.5%), scaling gently via the Fortune upgrade.

---

## 3. Progression Pacing & Build Completion Window

1. **XP Scaling Curve**:
   - `getRequiredXP(level) = Math.round(85 * Math.pow(1.19, level - 1))`
   - Preserves rapid early level-ups (Rounds 1–5) while creating a steady progression curve into late rounds.
2. **Build Completion Target**:
   - In earlier builds, players could max out the entire 12-upgrade pool before Round 18.
   - With the expanded 20-upgrade pool (100 total upgrade tiers), a near-complete build is targeted for substantially later:
     - **Initial Target Window**: Approximately **Round 35 – Round 50**, subject to active playtesting.
3. **Runtime Validation Rule**:
   - Balancing claims must be grounded in actual runtime playtesting rather than purely static arithmetic.
   - Avoid hardcoding temporary experimental numbers as permanent project rules before runtime validation.

---

## 4. Enemy & Boss Scaling Contracts

1. **Normal Enemy Population**:
   - `BASE_ENEMY_CAP = 12`
   - `HARD_ENEMY_CAP = 48`
   - Active enemy cap per round: `Math.min(BASE_ENEMY_CAP + (round - 1) * 3, HARD_ENEMY_CAP)`
   - The active cap of 48 is permanent and must not be exceeded.
2. **Normal Enemy Scaling**:
   - Health scaling per round: `+9%` compound per round (`Math.pow(1.09, round - 1)`).
   - Additive damage scaling per round: `+0.5` flat damage per round.
3. **Rotating Boss Scaling**:
   - Tier 1 bosses (Rounds 10, 20, 30, 40, 50) maintain baseline stats configured in `BOSS_CONFIGS` so early boss fights remain accessible and fair.
   - Higher Boss Tiers (Rounds 60+, repeating every 50 rounds):
     - HP scaling: `+60%` compound per additional tier (`Math.pow(1.60, tier - 1)`).
     - Damage scaling: `+40%` compound per additional tier (`Math.pow(1.40, tier - 1)`).

---

## 5. Upgrade Rebalance Targets

| Upgrade | Stat Formula Target | Max Tier (T5) Total |
| :--- | :--- | :--- |
| `damage` | +15% damage per tier | +75% damage |
| `haste` | Combat cooldown reduction calculation | ~57% base cooldown |
| `speed` | +10% movement speed per tier | +50% movement speed |
| `vitality` | +25 max HP per tier (+25 immediate heal) | +125 max HP |
| `armor` | 10% damage reduction per tier (capped at 50%) | 50% damage reduction |
| `magnet` | +30% pickup radius per tier | +150% pickup radius |
| `critical` | +10% crit chance per tier | +50% crit chance |
| `multishot` | Discrete bonus: T1=+1, T2=+1, T3=+2, T4=+2, T5=+3 | +3 bonus shots |
| `fire` | ~6 burn damage/sec per tier | 30 burn dmg/sec |
| `poison` | 4 + tier * 3 damage/sec | 19 poison dmg/sec |
| `shock` | 12% + 8% proc chance per tier | 52% proc chance |
| `frost` | 12% + 7% slow per tier | ~47% movement slow |
| `regeneration` | +0.30 HP/sec per tier | +1.50 HP/sec |
| `barrier` | +15 max Shield per tier (+15 immediate Shield) | +75 max Shield |
| `area` | +7% effective attack area per tier | +35% attack area |
| `recovery` | +12% HP/Shield pickup effect per tier | +60% pickup effect |
| `boss_hunter` | +7% outgoing boss damage per tier | +35% boss damage |
| `executioner` | +6% direct damage against targets <= 35% HP | +30% execute damage |
| `precision` | +0.15x critical damage multiplier per tier | 2.75x crit damage |
| `fortune` | +0.30% chest drop chance + rarity skew | 3.0% chest drop chance |
