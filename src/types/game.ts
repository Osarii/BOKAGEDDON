export type CharacterId = "bonk" | "byte" | "tank" | "nova" | "hex";

export type WeaponType = "hammer" | "energy-orb" | "axe" | "nova-burst" | "hex-chain";

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
  | "multishot";

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
  | "levelup"
  | "gameover"
  | "victory";

export type RoundStatus = "wave" | "intermission";

export type EnemyType =
  | "slime"
  | "runner"
  | "brute"
  | "shooter"
  | "bonklord";

export type PickupType =
  | "xp"
  | "medkit_emergency"
  | "medkit_case"
  | "shield_potion"
  | "shield_battery";

