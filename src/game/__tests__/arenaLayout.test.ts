import { describe, it, expect } from "vitest";
import { ARENA_RADIUS, ARENA_BOUNDARY_LIMIT } from "../config";
import {
  ARENA_V2_OBSTACLES,
  isArenaPositionValid,
  isArenaProjectilePathBlocked,
  isArenaSegmentBlocked,
  resolveArenaCollision,
  findValidArenaPosition,
  getArenaSteeringDirection,
} from "../arenaLayout";

describe("Arena V2 Layout & Collision Contracts", () => {
  it("enforces Arena V2 dimensions (radius 44, boundary 42.4)", () => {
    expect(ARENA_RADIUS).toBe(44);
    expect(ARENA_BOUNDARY_LIMIT).toBe(42.4);
  });

  it("contains standard Arena V2 obstacles with correct blocking flags", () => {
    expect(ARENA_V2_OBSTACLES.length).toBe(18);
    const nonBlocking = ARENA_V2_OBSTACLES.filter((o) => !o.blocksProjectiles);
    expect(nonBlocking.length).toBe(2);
    expect(nonBlocking.map((o) => o.id).sort()).toEqual(["crystal-beacon", "defense-beacon"]);
  });

  it("identifies center and open sectors as valid positions", () => {
    // Arena center (0, 0)
    expect(isArenaPositionValid(0, 0, 0.6)).toBe(true);
    // East corridor
    expect(isArenaPositionValid(15, 0, 0.6)).toBe(true);
    // West corridor
    expect(isArenaPositionValid(-15, 0, 0.6)).toBe(true);
    // North corridor
    expect(isArenaPositionValid(0, -15, 0.6)).toBe(true);
    // South corridor
    expect(isArenaPositionValid(0, 15, 0.6)).toBe(true);
  });

  it("identifies positions inside solid obstacles as invalid", () => {
    // Reactor block at (28, 0)
    expect(isArenaPositionValid(28, 0, 0.6)).toBe(false);
    // Crystal main at (0, -30)
    expect(isArenaPositionValid(0, -30, 0.6)).toBe(false);
    // Defense platform at (0, 30)
    expect(isArenaPositionValid(0, 30, 0.6)).toBe(false);
  });

  it("blocks projectiles passing through solid walls and platforms", () => {
    // Path passing directly through Reactor Block at (28, 0)
    expect(isArenaProjectilePathBlocked(20, 0, 35, 0, 0.2)).toBe(true);
    // Path passing directly through Crystal cluster at (0, -30)
    expect(isArenaProjectilePathBlocked(0, -25, 0, -35, 0.2)).toBe(true);
    // Path passing directly through Defense platform at (0, 30)
    expect(isArenaProjectilePathBlocked(0, 25, 0, 35, 0.2)).toBe(true);
  });

  it("does NOT block projectiles through non-projectile-blocking beacons", () => {
    // crystal-beacon is at (0, -38) and blocksProjectiles is false
    const beacon = ARENA_V2_OBSTACLES.find((o) => o.id === "crystal-beacon")!;
    expect(beacon.blocksProjectiles).toBe(false);
    // Shot passing across the beacon position
    expect(isArenaProjectilePathBlocked(-2, -38, 2, -38, 0.2)).toBe(false);

    // defense-beacon is at (0, 39) and blocksProjectiles is false
    const defBeacon = ARENA_V2_OBSTACLES.find((o) => o.id === "defense-beacon")!;
    expect(defBeacon.blocksProjectiles).toBe(false);
    expect(isArenaProjectilePathBlocked(-2, 39, 2, 39, 0.2)).toBe(false);
  });

  it("resolves player/enemy collision away from obstacles without getting trapped on corners", () => {
    // Player/tank stepping into reactor block (28, 0)
    const resolved = resolveArenaCollision(28, 0, 0.6);
    expect(isArenaPositionValid(resolved.x, resolved.z, 0.6)).toBe(true);

    // Stepping near corner of reactor wall
    const cornerTest = resolveArenaCollision(27.5, 14.5, 0.6);
    expect(isArenaPositionValid(cornerTest.x, cornerTest.z, 0.6)).toBe(true);

    // Stepping outside arena boundary
    const outTest = resolveArenaCollision(50, 0, 0.6);
    expect(Math.hypot(outTest.x, outTest.z)).toBeLessThanOrEqual(ARENA_BOUNDARY_LIMIT);
  });

  it("finds valid arena position for drops, chests, and bosses", () => {
    // Attempt spawn inside reactor block (28, 0)
    const validPos = findValidArenaPosition(28, 0, 1.2);
    expect(isArenaPositionValid(validPos.x, validPos.z, 1.2)).toBe(true);
    expect(Math.hypot(validPos.x, validPos.z)).toBeLessThanOrEqual(ARENA_BOUNDARY_LIMIT - 1.2);

    // Attempt spawn near crystal cluster
    const crystalDrop = findValidArenaPosition(0, -30, 0.8);
    expect(isArenaPositionValid(crystalDrop.x, crystalDrop.z, 0.8)).toBe(true);
  });

  it("steers enemies around obstacles", () => {
    // Enemy at (24, 0) moving East directly into reactor core at (28, 0)
    const steer = getArenaSteeringDirection(24, 0, 1, 0, 0.5, 1.8);
    // Steered direction must not point directly into the obstacle
    expect(steer.z).not.toBe(0);
  });

  it("checks line of sight (LOS) for Light Lance and Pulse Mine", () => {
    // Open path: player at (0, 0) to enemy at (10, 0) -> unblocked
    expect(isArenaSegmentBlocked(0, 0, 10, 0, 0.2)).toBe(false);
    // Blocked path: player at (20, 0) to enemy at (36, 0) -> blocked by reactor block
    expect(isArenaSegmentBlocked(20, 0, 36, 0, 0.2)).toBe(true);
  });
});
