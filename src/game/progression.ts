import { BASE_ENEMY_CAP, ENEMIES_PER_LEVEL, HARD_ENEMY_CAP } from "./config";

/**
 * Calculates the maximum active enemy cap for a given player level.
 * Clamps level to >= 1 and enforces the HARD_ENEMY_CAP of 48.
 *
 * Examples:
 * Level 1  -> 12
 * Level 2  -> 15
 * Level 3  -> 18
 * Level 5  -> 24
 * Level 10 -> 39
 * Level 13 -> 48
 * Level 14+ -> 48
 */
export function getEnemyCap(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.min(
    BASE_ENEMY_CAP + (safeLevel - 1) * ENEMIES_PER_LEVEL,
    HARD_ENEMY_CAP
  );
}

/**
 * Calculates XP required to reach the next level.
 */
export function getXpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.floor(100 * Math.pow(1.25, safeLevel - 1));
}
