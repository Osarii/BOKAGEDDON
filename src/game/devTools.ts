import { ENEMY_CONFIGS, HARD_ENEMY_CAP, RECOVERY_CONFIG, SPECIAL_PICKUP_CONFIG, MAX_UPGRADE_LEVEL } from "./config";
import { damagePlayer, type EnemyEntity, type GameRuntime } from "./runtime";
import { useGameStore } from "../store/gameStore";
import { checkSecretPassiveUnlocks } from "./secretPassives";
import type { Character, CharacterId, ChestRarity, EnemyType, RecoveryPickupType, SpecialPickupType, UpgradeId, SecretPassiveId } from "../types/game";

export const QA_CHARACTERS: Record<CharacterId, Character> = {
  bonk: {
    id: "bonk",
    name: "BONK",
    role: "Balanced Bruiser",
    health: 110,
    speed: 5,
    damage: 28,
    attackCooldown: 0.9,
    weapon: "hammer",
    description: "Heavy hitter with steady balance and crushing blows.",
    color: "#FF6B35",
  },
  byte: {
    id: "byte",
    name: "BYTE",
    role: "Hovering Tech Caster",
    health: 80,
    speed: 6.5,
    damage: 18,
    attackCooldown: 0.55,
    weapon: "energy-orb",
    description: "Agile cyber caster firing rapid energy orbs.",
    color: "#00E5FF",
  },
  tank: {
    id: "tank",
    name: "TANK",
    role: "Cleaving Juggernaut",
    health: 160,
    speed: 4,
    damage: 32,
    attackCooldown: 1.1,
    weapon: "axe",
    description: "High durability titan controlling close quarters with an orbital axe.",
    color: "#FF3B5C",
  },
  nova: {
    id: "nova",
    name: "NOVA",
    role: "Astral Burst Mage",
    health: 95,
    speed: 6.1,
    damage: 23,
    attackCooldown: 0.75,
    weapon: "nova-burst",
    description: "Cosmic weaver releasing concentric pulse waves that repel swarms.",
    color: "#D946EF",
  },
  hex: {
    id: "hex",
    name: "HEX",
    role: "Void Chain Specialist",
    health: 100,
    speed: 5.7,
    damage: 20,
    attackCooldown: 0.65,
    weapon: "hex-chain",
    description: "Dark channeler launching homing void bolts that jump between targets.",
    color: "#22C55E",
  },
  rift: {
    id: "rift",
    name: "RIFT",
    role: "Phase Disc Skirmisher",
    health: 90,
    speed: 6.3,
    damage: 24,
    attackCooldown: 0.80,
    weapon: "rift-disc",
    description: "Agile phase skirmisher throwing a dimensional disc that tears through enemies before returning.",
    color: "#8B5CF6",
  },
  fuse: {
    id: "fuse",
    name: "FUSE",
    role: "Demolition Zone Controller",
    health: 115,
    speed: 4.9,
    damage: 36,
    attackCooldown: 1.20,
    weapon: "pulse-mine",
    description: "Demolition specialist planting unstable pulse mines that detonate across enemy clusters.",
    color: "#F59E0B",
  },
  lux: {
    id: "lux",
    name: "LUX",
    role: "Precision Light Striker",
    health: 75,
    speed: 6.7,
    damage: 16,
    attackCooldown: 0.50,
    weapon: "light-lance",
    description: "High-speed light striker firing precision lances that cut directly through priority targets.",
    color: "#FDE68A",
  },
};

const PASSIVE_ZERO: Record<SpecialPickupType, number> = {
  overclock_core: 0,
  tesla_cell: 0,
  toxic_relic: 0,
  phoenix_fragment: 0,
  aegis_capacitor: 0,
  apex_lens: 0,
  echo_prism: 0,
  gravity_seed: 0,
};

function nearPlayer(runtime: GameRuntime, distance = 1.4) {
  const p = runtime.playerPosition;
  return { x: p.x + distance, z: p.z };
}

export function prepareBossRound(runtime: GameRuntime, round: number) {
  runtime.enemies = [];
  runtime.projectiles = [];
  runtime.shockwaves = [];
  runtime.delayedBursts = [];
  runtime.hazardZones = [];
  runtime.bossSpawned = false;
  runtime.bossDefeated = false;
  runtime.currentRound = round;
  runtime.roundSpawnedCount = 0;
  runtime.roundQuota = 1;
  runtime.spawnTimer = 0;
  runtime.intermissionTimer = 0;
  useGameStore.setState({
    round,
    roundStatus: "wave",
    bossActive: false,
    bossHealth: 0,
    bossMaxHealth: 0,
    bossType: null,
    gameStatus: "playing",
  });
}

export function clearEnemies(runtime: GameRuntime) {
  runtime.enemies = [];
  useGameStore.getState().setBossActive(false);
}

export function setFrenzyKills(runtime: GameRuntime, kills: number) {
  runtime.normalEnemyKillsForFrenzy = kills;
  runtime.nextFrenzyKillThreshold = 75;
  useGameStore.getState().setFrenzyState({
    active: runtime.frenzyActive,
    timer: Math.ceil(runtime.frenzyTimer),
    kills,
    nextThreshold: runtime.nextFrenzyKillThreshold,
  });
}

export function startFrenzy(runtime: GameRuntime) {
  runtime.frenzyActive = true;
  runtime.frenzyTimer = 90;
  useGameStore.getState().setFrenzyState({
    active: true,
    timer: 90,
    kills: runtime.normalEnemyKillsForFrenzy,
    nextThreshold: runtime.nextFrenzyKillThreshold,
  });
}

export function endFrenzy(runtime: GameRuntime) {
  runtime.frenzyActive = false;
  runtime.frenzyTimer = 0;
  useGameStore.getState().setFrenzyState({
    active: false,
    timer: 0,
    kills: runtime.normalEnemyKillsForFrenzy,
    nextThreshold: runtime.nextFrenzyKillThreshold,
  });
}

export function spawnChest(runtime: GameRuntime, rarity: ChestRarity) {
  const pos = nearPlayer(runtime);
  runtime.chests.push({
    id: runtime.nextEntityId++,
    rarity,
    x: pos.x,
    y: 0.45,
    z: pos.z,
    radius: 0.85,
  });
}

export function spawnPickup(runtime: GameRuntime, type: RecoveryPickupType | SpecialPickupType, fastExpire = false) {
  const pos = nearPlayer(runtime, fastExpire ? 1.8 : 1.4);
  const recovery = RECOVERY_CONFIG.pickupEffects[type as RecoveryPickupType];
  runtime.pickups.push({
    id: runtime.nextEntityId++,
    type,
    x: pos.x,
    y: 0.45,
    z: pos.z,
    value: recovery ? recovery.hp || recovery.shield : 1,
    radius: recovery ? 0.5 : 0.8,
    lifetime: recovery ? (fastExpire ? 6 : RECOVERY_CONFIG.lifetimeSec) : undefined,
    maxLifetime: recovery ? RECOVERY_CONFIG.lifetimeSec : undefined,
  });
}

export function addPassive(type: SpecialPickupType) {
  if (useGameStore.getState().passives[type] < SPECIAL_PICKUP_CONFIG.maxStacks) {
    useGameStore.getState().addPassive(type);
  }
}

export function resetPassives() {
  useGameStore.setState({ passives: { ...PASSIVE_ZERO } });
}

export function setHp(value: number) {
  useGameStore.getState().setHealth(value);
}

export function applyDamage(runtime: GameRuntime, amount: number) {
  damagePlayer(runtime, amount, 0.6);
}

export function spawnNormalEnemies(runtime: GameRuntime, count: number) {
  const available = Math.max(0, HARD_ENEMY_CAP - runtime.enemies.length);
  const total = Math.min(count, available);
  const types: EnemyType[] = ["slime", "runner", "brute", "shooter"];
  const p = runtime.playerPosition;

  for (let i = 0; i < total; i++) {
    const type = types[i % types.length];
    const cfg = ENEMY_CONFIGS[type];
    const angle = (i / Math.max(1, total)) * Math.PI * 2;
    const distance = 5 + (i % 5) * 0.8;
    const enemy: EnemyEntity = {
      id: runtime.nextEntityId++,
      type,
      x: p.x + Math.cos(angle) * distance,
      y: cfg.height / 2,
      z: p.z + Math.sin(angle) * distance,
      vx: 0,
      vz: 0,
      health: cfg.health,
      maxHealth: cfg.health,
      speed: cfg.speed,
      damage: cfg.damage,
      radius: cfg.radius,
      color: cfg.color,
      scoreValue: cfg.scoreValue,
      xpValue: cfg.xpValue,
      shootCooldown: type === "shooter" ? 1 : undefined,
      hitFlashTimer: 0,
      scaleY: 1,
    };
    runtime.enemies.push(enemy);
  }
}

export function maxAllUpgrades() {
  const maxed: Record<UpgradeId, number> = {
    damage: MAX_UPGRADE_LEVEL,
    haste: MAX_UPGRADE_LEVEL,
    speed: MAX_UPGRADE_LEVEL,
    vitality: MAX_UPGRADE_LEVEL,
    armor: MAX_UPGRADE_LEVEL,
    magnet: MAX_UPGRADE_LEVEL,
    critical: MAX_UPGRADE_LEVEL,
    multishot: MAX_UPGRADE_LEVEL,
    fire: MAX_UPGRADE_LEVEL,
    poison: MAX_UPGRADE_LEVEL,
    shock: MAX_UPGRADE_LEVEL,
    frost: MAX_UPGRADE_LEVEL,
    regeneration: MAX_UPGRADE_LEVEL,
    barrier: MAX_UPGRADE_LEVEL,
    area: MAX_UPGRADE_LEVEL,
    recovery: MAX_UPGRADE_LEVEL,
    boss_hunter: MAX_UPGRADE_LEVEL,
    executioner: MAX_UPGRADE_LEVEL,
    precision: MAX_UPGRADE_LEVEL,
    fortune: MAX_UPGRADE_LEVEL,
  };
  const store = useGameStore.getState();
  useGameStore.setState({
    upgrades: maxed,
    pendingLevelUps: 0,
    gameStatus: store.gameStatus === "levelup" ? "playing" : store.gameStatus,
  });
}

export function addXpAfterMax(amount = 500) {
  useGameStore.getState().addXp(amount);
}

export function clearUpgrades() {
  useGameStore.setState({
    upgrades: {
      damage: 0,
      haste: 0,
      speed: 0,
      vitality: 0,
      armor: 0,
      magnet: 0,
      critical: 0,
      multishot: 0,
      fire: 0,
      poison: 0,
      shock: 0,
      frost: 0,
      regeneration: 0,
      barrier: 0,
      area: 0,
      recovery: 0,
      boss_hunter: 0,
      executioner: 0,
      precision: 0,
      fortune: 0,
    },
    pendingLevelUps: 0,
  });
}

export function unlockSecretRecipe(recipe: SecretPassiveId) {
  const store = useGameStore.getState();
  const currentPassives = { ...store.passives };
  if (recipe === "storm_engine") {
    currentPassives.overclock_core = Math.max(2, currentPassives.overclock_core);
    currentPassives.tesla_cell = Math.max(2, currentPassives.tesla_cell);
  } else if (recipe === "venom_singularity") {
    currentPassives.toxic_relic = Math.max(2, currentPassives.toxic_relic);
    currentPassives.gravity_seed = Math.max(2, currentPassives.gravity_seed);
  } else if (recipe === "radiant_bastion") {
    currentPassives.phoenix_fragment = Math.max(1, currentPassives.phoenix_fragment);
    currentPassives.aegis_capacitor = Math.max(2, currentPassives.aegis_capacitor);
  } else if (recipe === "apex_echo") {
    currentPassives.apex_lens = Math.max(2, currentPassives.apex_lens);
    currentPassives.echo_prism = Math.max(2, currentPassives.echo_prism);
  }
  useGameStore.setState({ passives: currentPassives });
  const { newlyUnlocked, updatedSecrets } = checkSecretPassiveUnlocks(currentPassives, store.secretPassives);
  if (newlyUnlocked.length > 0) {
    useGameStore.setState({ secretPassives: updatedSecrets });
  }
}

export function switchQaCharacter(charId: CharacterId) {
  const char = QA_CHARACTERS[charId];
  if (char) {
    useGameStore.getState().initializeCharacterRun(char);
  }
}

export function resetQaRun(runtime: GameRuntime) {
  runtime.reset();
  const currentChar = useGameStore.getState().selectedCharacterId;
  const char = QA_CHARACTERS[currentChar || "bonk"] || QA_CHARACTERS.bonk;
  useGameStore.getState().initializeCharacterRun(char);
}
