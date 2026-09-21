import type { CharacterId, EnemyType, UpgradeId, WeaponType } from "../types/game";

export const BASE_ENEMY_CAP = 12;
export const ENEMIES_PER_LEVEL = 3;
export const HARD_ENEMY_CAP = 48;

export const ARENA_RADIUS = 30;
export const ARENA_BOUNDARY_LIMIT = 28.8;

export const CHARACTER_BASE_SPEEDS: Record<CharacterId, number> = {
  bonk: 5.0,
  byte: 6.5,
  tank: 4.0,
  nova: 6.1,
  hex: 5.7,
};

export const MAX_UPGRADE_LEVEL = 5;

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  health: number;
  speed: number;
  damage: number;
  radius: number;
  height: number;
  color: string;
  scoreValue: number;
  xpValue: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  slime: {
    type: "slime",
    name: "Slime Bot",
    health: 30,
    speed: 2.8,
    damage: 8,
    radius: 0.45,
    height: 0.8,
    color: "#a855f7",
    scoreValue: 10,
    xpValue: 10,
  },
  runner: {
    type: "runner",
    name: "Runner Drone",
    health: 22,
    speed: 4.8,
    damage: 6,
    radius: 0.35,
    height: 0.9,
    color: "#f97316",
    scoreValue: 15,
    xpValue: 12,
  },
  brute: {
    type: "brute",
    name: "Iron Brute",
    health: 95,
    speed: 1.8,
    damage: 18,
    radius: 0.8,
    height: 1.6,
    color: "#ef4444",
    scoreValue: 30,
    xpValue: 35,
  },
  shooter: {
    type: "shooter",
    name: "Beam Sentry",
    health: 40,
    speed: 2.2,
    damage: 10,
    radius: 0.45,
    height: 1.1,
    color: "#06b6d4",
    scoreValue: 25,
    xpValue: 25,
  },
  bonklord: {
    type: "bonklord",
    name: "THE BONKLORD",
    health: 1200,
    speed: 2.6,
    damage: 25,
    radius: 1.4,
    height: 3.0,
    color: "#e11d48",
    scoreValue: 500,
    xpValue: 100,
  },
};

export interface WeaponConfig {
  type: WeaponType;
  name: string;
  baseDamage: number;
  baseCooldown: number;
  range: number;
  areaRadius: number;
  color: string;
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  hammer: {
    type: "hammer",
    name: "Mega Hammer",
    baseDamage: 28,
    baseCooldown: 0.9,
    range: 5.5,
    areaRadius: 4.2,
    color: "#ffb020",
  },
  "energy-orb": {
    type: "energy-orb",
    name: "Energy Orb",
    baseDamage: 18,
    baseCooldown: 0.55,
    range: 12.0,
    areaRadius: 0.5,
    color: "#23d5ff",
  },
  axe: {
    type: "axe",
    name: "Cleaving Axe",
    baseDamage: 32,
    baseCooldown: 1.1,
    range: 4.0,
    areaRadius: 3.5,
    color: "#ff3b5c",
  },
  "nova-burst": {
    type: "nova-burst",
    name: "Nova Burst",
    baseDamage: 23,
    baseCooldown: 0.75,
    range: 6.0,
    areaRadius: 4.5,
    color: "#d946ef",
  },
  "hex-chain": {
    type: "hex-chain",
    name: "Hex Chain",
    baseDamage: 20,
    baseCooldown: 0.65,
    range: 11.0,
    areaRadius: 0.6,
    color: "#22c55e",
  },
};

export const UPGRADE_DETAILS: Record<
  UpgradeId,
  {
    name: string;
    description: (tier: number) => string;
    type: "offense" | "defense" | "utility" | "mobility";
  }
> = {
  damage: {
    name: "Damage Boost",
    description: (t) => `+${t * 20}% attack damage to all weapons`,
    type: "offense",
  },
  haste: {
    name: "Haste",
    description: (t) => `Reduces attack cooldown by ${t * 15}%`,
    type: "utility",
  },
  speed: {
    name: "Speed Surge",
    description: (t) => `Increases movement speed by +${t * 15}%`,
    type: "mobility",
  },
  vitality: {
    name: "Vitality",
    description: (t) => `+${t * 30} Max HP and restores +30 HP immediately`,
    type: "defense",
  },
  armor: {
    name: "Reinforced Armor",
    description: (t) => `Reduces incoming enemy damage by ${t * 15}%`,
    type: "defense",
  },
  magnet: {
    name: "XP Magnet",
    description: (t) => `Increases XP gem pickup range by +${t * 40}%`,
    type: "utility",
  },
  critical: {
    name: "Critical Strike",
    description: (t) => `+${t * 20}% chance to deal 2x critical damage`,
    type: "offense",
  },
  multishot: {
    name: "Multishot",
    description: (t) => `Fires +${t} additional projectile / cleaving strike`,
    type: "offense",
  },
};

export const RECOVERY_CONFIG = {
  maxActivePickups: 24,
  normalEnemyDropChance: 0.07,
  pickupEffects: {
    medkit_emergency: { hp: 35, shield: 0 },
    medkit_case: { hp: 70, shield: 0 },
    shield_potion: { hp: 0, shield: 25 },
    shield_battery: { hp: 0, shield: 50 },
  },
} as const;

export const GAME_CONFIG = {
  baseEnemyCap: BASE_ENEMY_CAP,
  enemiesPerLevel: ENEMIES_PER_LEVEL,
  hardEnemyCap: HARD_ENEMY_CAP,
  arenaRadius: ARENA_RADIUS,
  arenaBoundaryLimit: ARENA_BOUNDARY_LIMIT,
  defaultLevel: 1,
  defaultRound: 1,
  baseSpawnIntervalMs: 1400,
  minSpawnIntervalMs: 700,
  maxSpawnBatch: 3,
  bossIntervalRounds: 10,
  basePickupRadius: 2.5,
  playerInvulnerableDuration: 0.6,
  intermissionDurationSec: 3.5,
} as const;
