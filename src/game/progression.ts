import { BASE_ENEMY_CAP, ENEMIES_PER_LEVEL, HARD_ENEMY_CAP } from "./config";

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
 * Computes the boss tier based on round number (round / 10).
 */
export function getBossTier(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return Math.max(1, Math.floor(safeRound / 10));
}

/**
 * Calculates scaled Bonklord boss stats by boss tier with no maximum round.
 */
export function getBossStats(tier: number): { health: number; damage: number; speed: number } {
  const safeTier = Math.max(1, Math.floor(tier));
  return {
    health: Math.round(1200 * (1 + (safeTier - 1) * 0.5)),
    damage: Math.round(25 * (1 + (safeTier - 1) * 0.3)),
    speed: Math.min(3.8, 2.6 + (safeTier - 1) * 0.12),
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
  return Math.floor(100 * Math.pow(1.25, safeLevel - 1));
}
