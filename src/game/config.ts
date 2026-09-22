import type {
  BossType,
  ChestRarity,
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
  rift: 6.3,
  fuse: 4.9,
  lux: 6.7,
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
    baseHp: 5000,
    baseDamage: 31,
    speed: 2.6,
    attackCooldown: 3.5,
    description: "Titan warhammer & shockwave stomp",
  },
  cindermaw: {
    name: "cindermaw",
    displayName: "Cindermaw",
    accentColor: "#f97316",
    baseHp: 6000,
    baseDamage: 35,
    speed: 2.4,
    attackCooldown: 3.8,
    description: "Volcanic fire drake, meteor strikes & burning ground",
  },
  stormcoil: {
    name: "stormcoil",
    displayName: "Stormcoil",
    accentColor: "#00e5ff",
    baseHp: 4800,
    baseDamage: 27,
    speed: 3.0,
    attackCooldown: 3.2,
    description: "Levitating electrical construct & radial volt pulses",
  },
  venomatrix: {
    name: "venomatrix",
    displayName: "Venomatrix",
    accentColor: "#22c55e",
    baseHp: 5500,
    baseDamage: 30,
    speed: 2.7,
    attackCooldown: 3.4,
    description: "Acidic chitin hydra, toxic volleys & poison pools",
  },
  cryovex: {
    name: "cryovex",
    displayName: "Cryovex",
    accentColor: "#38bdf8",
    baseHp: 6500,
    baseDamage: 25,
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
  "rift-disc": {
    type: "rift-disc",
    name: "Rift Disc",
    baseDamage: 24,
    baseCooldown: 0.80,
    range: 10.5,
    areaRadius: 0.65,
    color: "#8B5CF6",
  },
  "pulse-mine": {
    type: "pulse-mine",
    name: "Pulse Mine",
    baseDamage: 36,
    baseCooldown: 1.20,
    range: 9.0,
    areaRadius: 3.2,
    color: "#F59E0B",
  },
  "light-lance": {
    type: "light-lance",
    name: "Light Lance",
    baseDamage: 16,
    baseCooldown: 0.50,
    range: 13.0,
    areaRadius: 0.35,
    color: "#FDE68A",
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
    description: (t) => `+${t * 15}% attack damage to all weapons`,
    type: "offense",
  },
  haste: {
    name: "Haste",
    description: (t) => `Reduces attack cooldown by ${t * 15}%`,
    type: "utility",
  },
  speed: {
    name: "Speed Surge",
    description: (t) => `Increases movement speed by +${t * 10}%`,
    type: "mobility",
  },
  vitality: {
    name: "Vitality",
    description: (t) => `+${t * 25} Max HP and restores +25 HP immediately`,
    type: "defense",
  },
  armor: {
    name: "Reinforced Armor",
    description: (t) => `Reduces incoming enemy damage by ${Math.min(50, t * 10)}%`,
    type: "defense",
  },
  magnet: {
    name: "XP Magnet",
    description: (t) => `Increases XP gem pickup range by +${t * 30}%`,
    type: "utility",
  },
  critical: {
    name: "Critical Strike",
    description: (t) => `+${t * 10}% chance to deal critical damage`,
    type: "offense",
  },
  multishot: {
    name: "Multishot",
    description: (t) => `Fires +${t >= 5 ? 3 : t >= 3 ? 2 : 1} additional projectile / cleaving strike`,
    type: "offense",
  },
  fire: {
    name: "Inferno (Fire)",
    description: (t) => `Attacks ignite foes for ~${t * 6} burn dmg/s for ${2 + t * 0.5}s`,
    type: "offense",
  },
  poison: {
    name: "Venom (Poison)",
    description: (t) => `Attacks poison foes for ${4 + t * 3} dmg/s for ${3 + t}s`,
    type: "offense",
  },
  shock: {
    name: "Volt (Shock)",
    description: (t) => `${12 + t * 8}% chance on hit to arc electric damage to nearby foes`,
    type: "offense",
  },
  frost: {
    name: "Glacier (Frost)",
    description: (t) => `Chills enemies, slowing movement by ${12 + t * 7}% for ${2 + t * 0.5}s`,
    type: "utility",
  },
  regeneration: {
    name: "Regeneration",
    description: (t) => `+${(t * 0.30).toFixed(2)} HP/sec health regeneration while playing`,
    type: "defense",
  },
  barrier: {
    name: "Barrier Matrix",
    description: (t) => `+${t * 15} Max Shield and restores +15 Shield immediately`,
    type: "defense",
  },
  area: {
    name: "Area Amplifier",
    description: (t) => `+${t * 7}% effective attack area and blast radius`,
    type: "offense",
  },
  recovery: {
    name: "Field Medic",
    description: (t) => `+${t * 12}% HP and Shield recovery from world pickups`,
    type: "defense",
  },
  boss_hunter: {
    name: "Boss Hunter",
    description: (t) => `+${t * 7}% outgoing damage against boss adversaries`,
    type: "offense",
  },
  executioner: {
    name: "Execution Protocol",
    description: (t) => `+${t * 6}% direct damage to enemies at or below 35% HP`,
    type: "offense",
  },
  precision: {
    name: "Critical Power",
    description: (t) => `+${(t * 0.15).toFixed(2)}x critical damage multiplier (base 2.0x)`,
    type: "offense",
  },
  fortune: {
    name: "Fortune",
    description: (t) => `+${(t * 0.30).toFixed(2)}% chest drop chance and shifts chest rarity higher`,
    type: "utility",
  },
};

export const SPECIAL_PICKUP_CONFIG = {
  maxActiveSpecialPickups: 4,
  normalEnemyDropChance: 0, // Normal enemies never drop special items per contract
  bruteDropChance: 0,
  maxStacks: 5,
  visuals: {
    overclock_core: { name: "Overclock Core", subtitle: "+15% permanent attack speed per stack", color: "#ffb020", emissive: "#f59e0b" },
    tesla_cell: { name: "Tesla Cell", subtitle: "Permanent chain-lightning chance & damage", color: "#00e5ff", emissive: "#06b6d4" },
    toxic_relic: { name: "Toxic Relic", subtitle: "+20% poison DoT damage & duration", color: "#22c55e", emissive: "#10b981" },
    phoenix_fragment: { name: "Phoenix Fragment", subtitle: "Permanent revive charge", color: "#f43f5e", emissive: "#e11d48" },
    aegis_capacitor: { name: "Aegis Capacitor", subtitle: "+15 Max Shield & +15 Shield immediately", color: "#06b6d4", emissive: "#22d3ee" },
    apex_lens: { name: "Apex Lens", subtitle: "+6% damage to bosses per stack", color: "#f59e0b", emissive: "#ef4444" },
    echo_prism: { name: "Echo Prism", subtitle: "+0.10x critical damage multiplier", color: "#a855f7", emissive: "#8b5cf6" },
    gravity_seed: { name: "Gravity Seed", subtitle: "+8% attack area & +10% pickup radius", color: "#6366f1", emissive: "#4338ca" },
  },
} as const;

export const CHEST_CONFIG = {
  normalDropChance: 0.015,
  guaranteedNormalKills: 30,
  maxActiveChests: 10,
  weights: {
    common: 75,
    rare: 22,
    legendary: 3,
  },
} as const;

export function getFortuneChestDropChance(fortuneTier: number = 0): number {
  return 0.015 + Math.min(5, Math.max(0, fortuneTier)) * 0.003;
}

export function rollChestRarityWithFortune(fortuneTier: number = 0): ChestRarity {
  const t = Math.min(5, Math.max(0, fortuneTier));
  // At T0: Common 75, Rare 22, Legendary 3
  // At T5: Common 69, Rare 25, Legendary 6
  const legendaryWeight = 3 + t * 0.6;
  const rareWeight = 22 + t * 0.6;
  const commonWeight = 100 - legendaryWeight - rareWeight;

  const roll = Math.random() * 100;
  if (roll < commonWeight) return "common";
  if (roll < commonWeight + rareWeight) return "rare";
  return "legendary";
}

export function rollChestRarity(): ChestRarity {
  return rollChestRarityWithFortune(0);
}

/**
 * Exactly one item dropped per boss defeat using one weighted roll (100% total).
 * 15% each recovery item (60% total recovery) + 10% each rare special item (40% total special).
 */
export const BOSS_LOOT_TABLE: Array<{
  type: RecoveryPickupType | SpecialPickupType;
  weight: number;
}> = [
  { type: "medkit_emergency", weight: 5 },
  { type: "medkit_case", weight: 5 },
  { type: "shield_potion", weight: 5 },
  { type: "shield_battery", weight: 5 },
  { type: "overclock_core", weight: 10 },
  { type: "tesla_cell", weight: 10 },
  { type: "toxic_relic", weight: 10 },
  { type: "phoenix_fragment", weight: 10 },
  { type: "aegis_capacitor", weight: 10 },
  { type: "apex_lens", weight: 10 },
  { type: "echo_prism", weight: 10 },
  { type: "gravity_seed", weight: 10 },
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
  lifetimeSec: 25,
  warningSec: 5,
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
