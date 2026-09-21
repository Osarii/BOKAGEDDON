import { getEnemyCap } from "./progression";

/**
 * Calculates spawn interval in milliseconds based on player level.
 * Starts at ~1400ms at Level 1, decreasing smoothly to a minimum of ~700ms.
 */
export function getSpawnInterval(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.max(1400 - (safeLevel - 1) * 70, 700);
}

/**
 * Calculates how many enemies can be spawned in a single batch.
 * Batch 1 in early levels (1-4), batch 2 in mid/late levels (5-8), and batch 3 near boss/endgame (9+).
 */
export function getSpawnBatch(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel < 5) return 1;
  if (safeLevel < 9) return 2;
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
 * Ensures the hard/dynamic enemy cap is never exceeded.
 */
export function getAmountToSpawn(level: number, currentEnemyCount: number): number {
  const cap = getEnemyCap(level);
  const availableSlots = getAvailableSpawnSlots(cap, currentEnemyCount);
  const spawnBatch = getSpawnBatch(level);
  return Math.min(spawnBatch, availableSlots);
}
