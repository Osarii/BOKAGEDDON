import { BASE_ENEMY_CAP, ENEMIES_PER_LEVEL, HARD_ENEMY_CAP } from "./config";

/**
 * Calculates the maximum active enemy cap for a given player level.
 * Clamps level to >= 1 and enforces the HARD_ENEMY_CAP of 90.
 *
 * Examples:
 * Level 1  -> 18
 * Level 2  -> 22
 * Level 3  -> 26
 * Level 5  -> 34
 * Level 10 -> 54
 * Level 15 -> 74
 * Level 20 -> 90
 * Level 21+ -> 90
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
