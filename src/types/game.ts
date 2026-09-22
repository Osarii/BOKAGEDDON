export type CharacterId = "bonk" | "byte" | "tank" | "nova" | "hex" | "rift" | "fuse" | "lux";

export type WeaponType = "hammer" | "energy-orb" | "axe" | "nova-burst" | "hex-chain" | "rift-disc" | "pulse-mine" | "light-lance";

export interface CharacterStats {
  health: number;
  speed: number;
  damage: number;
  attackCooldown: number;
}

export interface Character extends CharacterStats {
  id: CharacterId;
  name: string;
  role: string;
  weapon: WeaponType;
  description: string;
  color: string;
}

export type UpgradeId =
  | "damage"
  | "haste"
  | "speed"
  | "vitality"
  | "armor"
  | "magnet"
  | "critical"
  | "multishot"
  | "fire"
  | "poison"
  | "shock"
  | "frost"
  | "regeneration"
  | "barrier"
  | "area"
  | "recovery"
  | "boss_hunter"
  | "executioner"
  | "precision"
  | "fortune";

export type UpgradeType = "offense" | "defense" | "utility" | "mobility";

export interface Upgrade {
  id: UpgradeId;
  name: string;
  description: string;
  type: UpgradeType;
  icon: string;
}

export interface ScoreEntry {
  id?: string | number;
  playerName: string;
  characterId: CharacterId;
  score: number;
  kills: number;
  level: number;
  timeSurvivedSeconds: number;
  date: string;
}

export type GameStatus =
  | "idle"
  | "ready"
  | "playing"
  | "paused"
  | "chest"
  | "levelup"
  | "gameover"
  | "victory";

export type RoundStatus = "wave" | "intermission";

export type BossType =
  | "bonklord"
  | "cindermaw"
  | "stormcoil"
  | "venomatrix"
  | "cryovex";

export type EnemyType =
  | "slime"
  | "runner"
  | "brute"
  | "shooter"
  | BossType;

export type HazardZoneType = "fire" | "poison" | "frost";

export type ElementalEffectType = "fire" | "poison" | "shock" | "frost";

export type RecoveryPickupType =
  | "medkit_emergency"
  | "medkit_case"
  | "shield_potion"
  | "shield_battery";

export type SpecialPickupType =
  | "overclock_core"
  | "tesla_cell"
  | "toxic_relic"
  | "phoenix_fragment"
  | "aegis_capacitor"
  | "apex_lens"
  | "echo_prism"
  | "gravity_seed";

export type SecretPassiveId =
  | "storm_engine"
  | "venom_singularity"
  | "radiant_bastion"
  | "apex_echo";

export interface PendingNormalChestReward {
  type: "upgrade";
  rarity: "common" | "rare";
  choices: UpgradeId[];
}

export interface PendingLegendaryChestReward {
  type: "relic";
  rarity: "legendary";
  choices: SpecialPickupType[];
}

export type PendingChestReward = PendingNormalChestReward | PendingLegendaryChestReward;

export type PickupType = "xp" | RecoveryPickupType | SpecialPickupType;

export type ChestRarity = "common" | "rare" | "legendary";
