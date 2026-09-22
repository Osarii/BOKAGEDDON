import { ARENA_BOUNDARY_LIMIT } from "./config";

export type ArenaAssetKey =
  | "wallStraight"
  | "wallCorner"
  | "barricadeShort"
  | "reactorBlock"
  | "crystalCluster"
  | "defensePlatform"
  | "energyPylon"
  | "sectorBeacon";

export interface ArenaObstacle {
  id: string;
  sector: "core" | "industrial" | "reactor" | "crystal" | "defense";
  asset: ArenaAssetKey;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  blocksProjectiles: boolean;
}

export interface ArenaDecal {
  id: string;
  asset: "warningRingDecal" | "laneConnectorDecal";
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
}

const DEG = Math.PI / 180;

export const ARENA_V2_OBSTACLES: ArenaObstacle[] = [
  { id: "industrial-wall-n", sector: "industrial", asset: "wallStraight", x: -27, z: -8, width: 8, depth: 1.4, height: 2.4, rotation: 18 * DEG, blocksProjectiles: true },
  { id: "industrial-wall-s", sector: "industrial", asset: "wallStraight", x: -27, z: 8, width: 8, depth: 1.4, height: 2.4, rotation: -18 * DEG, blocksProjectiles: true },
  { id: "industrial-corner", sector: "industrial", asset: "wallCorner", x: -34, z: 0, width: 4.8, depth: 4.8, height: 2.7, rotation: 0, blocksProjectiles: true },
  { id: "industrial-barricade", sector: "industrial", asset: "barricadeShort", x: -21, z: 14, width: 5.8, depth: 1.5, height: 1.5, rotation: 35 * DEG, blocksProjectiles: true },

  { id: "reactor-core", sector: "reactor", asset: "reactorBlock", x: 28, z: 0, width: 5.4, depth: 5.4, height: 3.2, rotation: 0, blocksProjectiles: true },
  { id: "reactor-wall-n", sector: "reactor", asset: "wallStraight", x: 24, z: -13, width: 7.2, depth: 1.4, height: 2.4, rotation: -24 * DEG, blocksProjectiles: true },
  { id: "reactor-wall-s", sector: "reactor", asset: "wallStraight", x: 24, z: 13, width: 7.2, depth: 1.4, height: 2.4, rotation: 24 * DEG, blocksProjectiles: true },
  { id: "reactor-pylon", sector: "reactor", asset: "energyPylon", x: 36, z: 8, width: 2.8, depth: 2.8, height: 4.2, rotation: 0, blocksProjectiles: true },

  { id: "crystal-main", sector: "crystal", asset: "crystalCluster", x: 0, z: -30, width: 5.6, depth: 5.6, height: 3.4, rotation: 0, blocksProjectiles: true },
  { id: "crystal-east", sector: "crystal", asset: "crystalCluster", x: 10, z: -26, width: 3.8, depth: 3.8, height: 2.8, rotation: 20 * DEG, blocksProjectiles: true },
  { id: "crystal-west", sector: "crystal", asset: "crystalCluster", x: -11, z: -25, width: 3.8, depth: 3.8, height: 2.8, rotation: -20 * DEG, blocksProjectiles: true },
  { id: "crystal-beacon", sector: "crystal", asset: "sectorBeacon", x: 0, z: -38, width: 2.4, depth: 2.4, height: 3.3, rotation: 0, blocksProjectiles: false },

  { id: "defense-platform", sector: "defense", asset: "defensePlatform", x: 0, z: 30, width: 7.2, depth: 5.2, height: 2.2, rotation: 0, blocksProjectiles: true },
  { id: "defense-barricade-e", sector: "defense", asset: "barricadeShort", x: 11, z: 25, width: 5.8, depth: 1.5, height: 1.5, rotation: -28 * DEG, blocksProjectiles: true },
  { id: "defense-barricade-w", sector: "defense", asset: "barricadeShort", x: -11, z: 25, width: 5.8, depth: 1.5, height: 1.5, rotation: 28 * DEG, blocksProjectiles: true },
  { id: "defense-beacon", sector: "defense", asset: "sectorBeacon", x: 0, z: 39, width: 2.4, depth: 2.4, height: 3.3, rotation: Math.PI, blocksProjectiles: false },

  { id: "core-pylon-ne", sector: "core", asset: "energyPylon", x: 12, z: -12, width: 2.4, depth: 2.4, height: 4.0, rotation: 45 * DEG, blocksProjectiles: true },
  { id: "core-pylon-sw", sector: "core", asset: "energyPylon", x: -12, z: 12, width: 2.4, depth: 2.4, height: 4.0, rotation: -135 * DEG, blocksProjectiles: true },
];

export const ARENA_V2_DECALS: ArenaDecal[] = [
  { id: "core-warning", asset: "warningRingDecal", x: 0, z: 0, width: 14, depth: 14, rotation: 0 },
  { id: "reactor-warning", asset: "warningRingDecal", x: 28, z: 0, width: 11, depth: 11, rotation: 0 },
  { id: "crystal-warning", asset: "warningRingDecal", x: 0, z: -30, width: 11, depth: 11, rotation: 0 },
  { id: "defense-warning", asset: "warningRingDecal", x: 0, z: 30, width: 12, depth: 10, rotation: 0 },
  { id: "east-lane", asset: "laneConnectorDecal", x: 15, z: 0, width: 18, depth: 4, rotation: 0 },
  { id: "west-lane", asset: "laneConnectorDecal", x: -15, z: 0, width: 18, depth: 4, rotation: Math.PI },
  { id: "north-lane", asset: "laneConnectorDecal", x: 0, z: -15, width: 18, depth: 4, rotation: Math.PI / 2 },
  { id: "south-lane", asset: "laneConnectorDecal", x: 0, z: 15, width: 18, depth: 4, rotation: -Math.PI / 2 },
];

function toLocal(x: number, z: number, obstacle: ArenaObstacle) {
  const dx = x - obstacle.x;
  const dz = z - obstacle.z;
  const cos = Math.cos(-obstacle.rotation);
  const sin = Math.sin(-obstacle.rotation);
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos,
  };
}

function toWorld(localX: number, localZ: number, obstacle: ArenaObstacle) {
  const cos = Math.cos(obstacle.rotation);
  const sin = Math.sin(obstacle.rotation);
  return {
    x: obstacle.x + localX * cos - localZ * sin,
    z: obstacle.z + localX * sin + localZ * cos,
  };
}

function collidesObstacle(x: number, z: number, radius: number, obstacle: ArenaObstacle): boolean {
  const local = toLocal(x, z, obstacle);
  const halfW = obstacle.width / 2;
  const halfD = obstacle.depth / 2;
  const nearestX = Math.max(-halfW, Math.min(halfW, local.x));
  const nearestZ = Math.max(-halfD, Math.min(halfD, local.z));
  return (local.x - nearestX) ** 2 + (local.z - nearestZ) ** 2 < radius ** 2;
}

export function isArenaPositionValid(x: number, z: number, radius = 0.6): boolean {
  if (Math.hypot(x, z) > ARENA_BOUNDARY_LIMIT - radius) return false;
  return !ARENA_V2_OBSTACLES.some((obstacle) => collidesObstacle(x, z, radius, obstacle));
}

export function isArenaProjectilePathBlocked(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  radius = 0.2
): boolean {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(2, Math.ceil(length / 0.5));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const z = z1 + (z2 - z1) * t;
    if (Math.hypot(x, z) > ARENA_BOUNDARY_LIMIT - radius) return true;
    if (
      ARENA_V2_OBSTACLES.some(
        (obstacle) => obstacle.blocksProjectiles && collidesObstacle(x, z, radius, obstacle)
      )
    ) {
      return true;
    }
  }
  return false;
}

export function resolveArenaCollision(x: number, z: number, radius = 0.6): { x: number; z: number } {
  let nextX = x;
  let nextZ = z;

  const dist = Math.hypot(nextX, nextZ);
  if (dist > ARENA_BOUNDARY_LIMIT - radius) {
    const factor = (ARENA_BOUNDARY_LIMIT - radius) / (dist || 1);
    nextX *= factor;
    nextZ *= factor;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (const obstacle of ARENA_V2_OBSTACLES) {
      const local = toLocal(nextX, nextZ, obstacle);
      const halfW = obstacle.width / 2;
      const halfD = obstacle.depth / 2;
      const nearestX = Math.max(-halfW, Math.min(halfW, local.x));
      const nearestZ = Math.max(-halfD, Math.min(halfD, local.z));
      const dx = local.x - nearestX;
      const dz = local.z - nearestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radius * radius) continue;

      if (distSq > 0.0001) {
        const distLocal = Math.sqrt(distSq);
        const push = radius - distLocal + 0.02;
        const pushed = toWorld(local.x + (dx / distLocal) * push, local.z + (dz / distLocal) * push, obstacle);
        nextX = pushed.x;
        nextZ = pushed.z;
      } else {
        const pushX = halfW - Math.abs(local.x);
        const pushZ = halfD - Math.abs(local.z);
        const signX = local.x >= 0 ? 1 : -1;
        const signZ = local.z >= 0 ? 1 : -1;
        const pushed =
          pushX < pushZ
            ? toWorld((halfW + radius + 0.02) * signX, local.z, obstacle)
            : toWorld(local.x, (halfD + radius + 0.02) * signZ, obstacle);
        nextX = pushed.x;
        nextZ = pushed.z;
      }
    }
  }

  return { x: nextX, z: nextZ };
}

export function findValidArenaPosition(
  preferredX: number,
  preferredZ: number,
  radius = 0.7,
  attempts = 18
): { x: number; z: number } {
  if (isArenaPositionValid(preferredX, preferredZ, radius)) return { x: preferredX, z: preferredZ };

  for (let i = 0; i < attempts; i++) {
    const angle = i * 2.39996323;
    const dist = 1.2 + Math.floor(i / 6) * 2.1;
    const x = preferredX + Math.cos(angle) * dist;
    const z = preferredZ + Math.sin(angle) * dist;
    if (isArenaPositionValid(x, z, radius)) return { x, z };
  }

  return resolveArenaCollision(preferredX, preferredZ, radius);
}

export function getArenaSteeringDirection(
  x: number,
  z: number,
  dirX: number,
  dirZ: number,
  radius: number,
  lookAhead = 1.8
): { x: number; z: number } {
  const len = Math.hypot(dirX, dirZ);
  if (len === 0) return { x: 0, z: 0 };
  const nx = dirX / len;
  const nz = dirZ / len;
  if (isArenaPositionValid(x + nx * lookAhead, z + nz * lookAhead, radius)) {
    return { x: nx, z: nz };
  }

  const left = { x: -nz, z: nx };
  const right = { x: nz, z: -nx };
  const leftOk = isArenaPositionValid(x + left.x * lookAhead, z + left.z * lookAhead, radius);
  const rightOk = isArenaPositionValid(x + right.x * lookAhead, z + right.z * lookAhead, radius);
  if (leftOk && !rightOk) return left;
  if (rightOk && !leftOk) return right;

  return x * nz - z * nx > 0 ? left : right;
}

export function isArenaSegmentBlocked(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  radius = 0.2
): boolean {
  return isArenaProjectilePathBlocked(x1, z1, x2, z2, radius);
}
