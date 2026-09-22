import type { EnemyType } from "../types/game";
import { getRoundEnemyCap } from "./progression";

/**
 * Calculates spawn interval in milliseconds based on round.
 * Starts at ~1400ms at Round 1, decreasing smoothly to a minimum of ~700ms.
 */
export function getSpawnInterval(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return Math.max(1400 - (safeRound - 1) * 75, 700);
}

/**
 * Calculates how many enemies can be spawned in a single batch based on round.
 * Batch 1 in early rounds (1-3), batch 2 in mid rounds (4-7), and batch 3 in later rounds (8+).
 */
export function getSpawnBatch(round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  if (safeRound < 4) return 1;
  if (safeRound < 8) return 2;
  return 3;
}

/**
 * Computes available enemy slots without exceeding the active cap.
 */
export function getAvailableSpawnSlots(cap: number, currentEnemyCount: number): number {
  return Math.max(0, cap - currentEnemyCount);
}

/**
 * Pure helper determining the exact number of enemies to spawn.
 * Ensures active cap and remaining round quota are never exceeded.
 */
export function getAmountToSpawn(
  round: number,
  currentEnemyCount: number,
  remainingQuota?: number
): number {
  const cap = getRoundEnemyCap(round);
  const availableSlots = getAvailableSpawnSlots(cap, currentEnemyCount);
  const spawnBatch = getSpawnBatch(round);
  let amount = Math.min(spawnBatch, availableSlots);
  if (remainingQuota !== undefined) {
    amount = Math.min(amount, Math.max(0, remainingQuota));
  }
  return Math.max(0, amount);
}

/**
 * Selects an enemy archetype based on round progression.
 * Normal enemy difficulty scales through composition rather than player level.
 */
export function getEnemyTypeForRound(round: number): EnemyType {
  const safeRound = Math.max(1, Math.floor(round));
  const roll = Math.random();

  if (safeRound >= 11) {
    if (roll < 0.15) return "slime";
    if (roll < 0.40) return "runner";
    if (roll < 0.70) return "shooter";
    return "brute";
  }
  if (safeRound >= 8) {
    if (roll < 0.20) return "slime";
    if (roll < 0.45) return "runner";
    if (roll < 0.75) return "shooter";
    return "brute";
  }
  if (safeRound >= 5) {
    if (roll < 0.30) return "slime";
    if (roll < 0.60) return "runner";
    if (roll < 0.85) return "shooter";
    return "brute";
  }
  if (safeRound >= 3) {
    if (roll < 0.45) return "slime";
    if (roll < 0.80) return "runner";
    return "shooter";
  }
  if (safeRound >= 2) {
    return roll < 0.65 ? "slime" : "runner";
  }
  return "slime";
}

/**
 * Calculates scaled normal enemy health for a round.
 */
export function getEnemyHealthForRound(baseHealth: number, round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return Math.round(baseHealth * (1 + (safeRound - 1) * 0.09));
}

/**
 * Calculates scaled normal enemy damage for a round.
 */
export function getEnemyDamageForRound(baseDamage: number, round: number): number {
  const safeRound = Math.max(1, Math.floor(round));
  return Math.round(baseDamage + (safeRound - 1) * 0.5);
}
