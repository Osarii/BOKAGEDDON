import type {
  BossType,
  CharacterId,
  EnemyType,
  RecoveryPickupType,
  SpecialPickupType,
  UpgradeId,
  WeaponType,
} from "../types/game";

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
  cindermaw: {
    type: "cindermaw",
    name: "CINDERMAW",
    health: 1350,
    speed: 2.4,
    damage: 28,
    radius: 1.5,
    height: 3.2,
    color: "#f97316",
    scoreValue: 600,
    xpValue: 120,
  },
  stormcoil: {
    type: "stormcoil",
    name: "STORMCOIL",
    health: 1100,
    speed: 3.0,
    damage: 22,
    radius: 1.3,
    height: 2.8,
    color: "#00e5ff",
    scoreValue: 600,
    xpValue: 120,
  },
  venomatrix: {
    type: "venomatrix",
    name: "VENOMATRIX",
    health: 1250,
    speed: 2.7,
    damage: 24,
    radius: 1.4,
    height: 2.9,
    color: "#22c55e",
    scoreValue: 600,
    xpValue: 120,
  },
  cryovex: {
    type: "cryovex",
    name: "CRYOVEX",
    health: 1400,
    speed: 2.2,
    damage: 20,
    radius: 1.4,
    height: 3.4,
    color: "#38bdf8",
    scoreValue: 600,
    xpValue: 120,
  },
};

export const BOSS_CONFIGS: Record<
  BossType,
  {
    name: BossType;
    displayName: string;
    accentColor: string;
    baseHp: number;
    baseDamage: number;
    speed: number;
    attackCooldown: number;
    description: string;
  }
> = {
  bonklord: {
    name: "bonklord",
    displayName: "Bonklord",
    accentColor: "#e11d48",
    baseHp: 1200,
    baseDamage: 25,
    speed: 2.6,
    attackCooldown: 3.5,
    description: "Titan warhammer & shockwave stomp",
  },
  cindermaw: {
    name: "cindermaw",
    displayName: "Cindermaw",
    accentColor: "#f97316",
    baseHp: 1350,
    baseDamage: 28,
    speed: 2.4,
    attackCooldown: 3.8,
    description: "Volcanic fire drake, meteor strikes & burning ground",
  },
  stormcoil: {
    name: "stormcoil",
    displayName: "Stormcoil",
    accentColor: "#00e5ff",
    baseHp: 1100,
    baseDamage: 22,
    speed: 3.0,
    attackCooldown: 3.2,
    description: "Levitating electrical construct & radial volt pulses",
  },
  venomatrix: {
    name: "venomatrix",
    displayName: "Venomatrix",
    accentColor: "#22c55e",
    baseHp: 1250,
    baseDamage: 24,
    speed: 2.7,
    attackCooldown: 3.4,
    description: "Acidic chitin hydra, toxic volleys & poison pools",
  },
  cryovex: {
    name: "cryovex",
    displayName: "Cryovex",
    accentColor: "#38bdf8",
    baseHp: 1400,
    baseDamage: 20,
    speed: 2.2,
    attackCooldown: 3.6,
    description: "Glacial crystal spire, ice shards & frost slow",
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
  fire: {
    name: "Inferno (Fire)",
    description: (t) => `Attacks ignite foes for ${t * 8} burn dmg/s for ${2 + t * 0.5}s`,
    type: "offense",
  },
  poison: {
    name: "Venom (Poison)",
    description: (t) => `Attacks poison foes for ${4 + t * 4} dmg/s for ${3 + t}s`,
    type: "offense",
  },
  shock: {
    name: "Volt (Shock)",
    description: (t) => `${20 + t * 15}% chance on hit to arc ${t * 12} electric dmg to nearby foes`,
    type: "offense",
  },
  frost: {
    name: "Glacier (Frost)",
    description: (t) => `Chills enemies, slowing movement by ${15 + t * 10}% for ${2 + t * 0.5}s`,
    type: "utility",
  },
};

export const SPECIAL_PICKUP_CONFIG = {
  maxActiveSpecialPickups: 4,
  normalEnemyDropChance: 0, // Normal enemies never drop special items per contract
  bruteDropChance: 0,
  buffDurations: {
    overclock_core: 8.0,
    tesla_cell: 10.0,
    toxic_relic: 10.0,
    phoenix_fragment: 8.0,
  },
  visuals: {
    overclock_core: { name: "Overclock Core", subtitle: "Attack Speed Overdrive (+50%)!", color: "#ffb020", emissive: "#f59e0b" },
    tesla_cell: { name: "Tesla Cell", subtitle: "Overcharged Electric Chain Arcs!", color: "#00e5ff", emissive: "#06b6d4" },
    toxic_relic: { name: "Toxic Relic", subtitle: "2x Poison Toxicity Amplification!", color: "#22c55e", emissive: "#10b981" },
    phoenix_fragment: { name: "Phoenix Fragment", subtitle: "+50 HP Healed & Flame Damage Surge (+40%)!", color: "#f43f5e", emissive: "#e11d48" },
  },
} as const;

/**
 * Exactly one item dropped per boss defeat using one weighted roll (100% total).
 * 15% each recovery item (60% total recovery) + 10% each rare special item (40% total special).
 */
export const BOSS_LOOT_TABLE: Array<{
  type: RecoveryPickupType | SpecialPickupType;
  weight: number;
}> = [
  { type: "medkit_emergency", weight: 15 },
  { type: "medkit_case", weight: 15 },
  { type: "shield_potion", weight: 15 },
  { type: "shield_battery", weight: 15 },
  { type: "overclock_core", weight: 10 },
  { type: "tesla_cell", weight: 10 },
  { type: "toxic_relic", weight: 10 },
  { type: "phoenix_fragment", weight: 10 },
];

export function rollBossLoot(): RecoveryPickupType | SpecialPickupType {
  const rand = Math.random() * 100;
  let accumulated = 0;
  for (const entry of BOSS_LOOT_TABLE) {
    accumulated += entry.weight;
    if (rand < accumulated) {
      return entry.type;
    }
  }
  return "medkit_case";
}

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
