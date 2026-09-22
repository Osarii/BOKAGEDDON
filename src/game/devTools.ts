import { ENEMY_CONFIGS, HARD_ENEMY_CAP, RECOVERY_CONFIG, SPECIAL_PICKUP_CONFIG } from "./config";
import { damagePlayer, type EnemyEntity, type GameRuntime } from "./runtime";
import { useGameStore } from "../store/gameStore";
import type { ChestRarity, EnemyType, RecoveryPickupType, SpecialPickupType } from "../types/game";

const PASSIVE_ZERO: Record<SpecialPickupType, number> = {
  overclock_core: 0,
  tesla_cell: 0,
  toxic_relic: 0,
  phoenix_fragment: 0,
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

export function resetQaRun(runtime: GameRuntime) {
  runtime.reset();
  useGameStore.getState().resetRun();
}
