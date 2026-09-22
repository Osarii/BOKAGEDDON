import { BASE_ENEMY_CAP, ENEMIES_PER_LEVEL, HARD_ENEMY_CAP, MAX_UPGRADE_LEVEL } from "./config";
import type { BossType } from "../types/game";

export const BOSS_ROSTER: BossType[] = [
  "bonklord",
  "cindermaw",
  "stormcoil",
  "venomatrix",
  "cryovex",
];

/**
 * Type guard to check if an enemy type string corresponds to any boss archetype.
 */
export function isBossType(type: string): type is BossType {
  return (BOSS_ROSTER as string[]).includes(type);
}

/**
 * Calculates the maximum active enemy cap for a given round.
 * Clamps round to >= 1 and strictly enforces the HARD_ENEMY_CAP of 48.
 */
export function getRoundEnemyCap(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return Math.min(
    BASE_ENEMY_CAP + (safeRound - 1) * ENEMIES_PER_LEVEL,
    HARD_ENEMY_CAP
  );
}

/**
 * Backwards compatibility alias for getRoundEnemyCap.
 */
export function getEnemyCap(roundOrLevel: number): number {
  return getRoundEnemyCap(roundOrLevel);
}

/**
 * Determines if a round is a boss round (10, 20, 30, 40...).
 */
export function isBossRound(round: number): boolean {
  const safeRound = Math.max(1, Math.floor(round));
  return safeRound % 10 === 0;
}

/**
 * Determines which boss spawns for a given boss round.
 * Round 10 -> Bonklord, Round 20 -> Cindermaw, Round 30 -> Stormcoil,
 * Round 40 -> Venomatrix, Round 50 -> Cryovex, then repeats with higher tiers.
 */
export function getBossTypeForRound(round: number): BossType {
  const safeRound = Math.max(1, Math.floor(round));
  const bossNumber = Math.max(0, Math.floor(safeRound / 10) - 1);
  const bossIndex = bossNumber % BOSS_ROSTER.length;
  return BOSS_ROSTER[bossIndex];
}

/**
 * Computes the boss tier based on complete 5-boss cycles:
 * Rounds 10-50 -> Tier 1
 * Rounds 60-100 -> Tier 2
 * Rounds 110-150 -> Tier 3
 */
export function getBossCycleTier(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  const bossNumber = Math.max(0, Math.floor(safeRound / 10) - 1);
  return Math.floor(bossNumber / BOSS_ROSTER.length) + 1;
}

/**
 * Backwards compatibility alias for getBossCycleTier.
 */
export function getBossTier(round: number): number {
  return getBossCycleTier(round);
}

/**
 * Calculates scaled boss stats by boss tier and archetype with no maximum round.
 */
export function getBossStats(
  tier: number,
  bossType: BossType = "bonklord"
): { health: number; damage: number; speed: number } {
  const safeTier = Math.max(1, Math.floor(tier));
  const baseStats: Record<BossType, { health: number; damage: number; speed: number }> = {
    bonklord: { health: 1200, damage: 25, speed: 2.6 },
    cindermaw: { health: 1350, damage: 28, speed: 2.4 },
    stormcoil: { health: 1100, damage: 22, speed: 3.0 },
    venomatrix: { health: 1250, damage: 24, speed: 2.7 },
    cryovex: { health: 1400, damage: 20, speed: 2.2 },
  };

  const base = baseStats[bossType] || baseStats.bonklord;
  return {
    health: Math.round(base.health * (1 + (safeTier - 1) * 0.60)),
    damage: Math.round(base.damage * (1 + (safeTier - 1) * 0.40)),
    speed: Math.min(4.0, base.speed + (safeTier - 1) * 0.12),
  };
}

/**
 * Calculates the total enemy quota to spawn for a given round.
 * Early rounds: ~14-20
 * Pre-boss rounds: ~23-33
 * Later normal rounds: bounded at ~36-40
 * Boss rounds: 1 (Bonklord boss-focused)
 */
export function getRoundEnemyQuota(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  if (isBossRound(safeRound)) {
    return 1; // Boss-focused round
  }

  // Bounded quota scaling
  if (safeRound <= 3) {
    return 14 + (safeRound - 1) * 3; // 14, 17, 20
  }
  if (safeRound < 10) {
    return 20 + (safeRound - 3) * 2; // 22, 24, 26, 28, 30, 32
  }
  // Round 11+ bounded at max 40
  return Math.min(36 + Math.floor((safeRound - 11) * 0.5), 40);
}

/**
 * Calculates XP required to reach the next character level.
 * Separated from round progression: level remains strictly player XP & upgrade driven.
 */
export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(85 * Math.pow(1.19, safeLevel - 1));
}

/**
 * Checks whether any upgrade in the upgrades map is still below max level.
 * If all tracked upgrades have reached max level, returns false.
 */
export function hasAvailableUpgrades(
  upgrades: Record<string, number>,
  maxLevel: number = MAX_UPGRADE_LEVEL
): boolean {
  const ids = Object.keys(upgrades);
  if (ids.length === 0) return true;
  return ids.some((id) => (upgrades[id] || 0) < maxLevel);
}
