import { getEnemyCap } from "./progression";

/**
 * Calculates spawn interval in milliseconds based on player level.
 * Decreases as level rises, capped at a minimum of 250ms.
 */
export function getSpawnInterval(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.max(850 - safeLevel * 30, 250);
}

/**
 * Calculates how many enemies can be spawned in a single batch.
 * Clamped between 1 and 3.
 */
export function getSpawnBatch(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.min(1 + Math.floor((safeLevel - 1) / 5), 3);
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
