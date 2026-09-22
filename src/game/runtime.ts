import * as THREE from "three";
import type { ChestRarity, ElementalEffectType, EnemyType, HazardZoneType, PickupType } from "../types/game";
import { useGameStore } from "../store/gameStore";

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  radius: number;
  color: string;
  scoreValue: number;
  xpValue: number;
  shootCooldown?: number;
  stompCooldown?: number;
  bossAttackTimer?: number;
  bossAttackCooldown?: number;
  bossSubAttackTimer?: number;
  hitFlashTimer: number;
  scaleY: number; // for squash/stretch

  // Minimal elemental status effects (runtime-only)
  burnTimer?: number;
  burnDps?: number;
  burnTickAcc?: number;
  poisonTimer?: number;
  poisonDps?: number;
  poisonTickAcc?: number;
  frostTimer?: number;
  frostSlowPercent?: number;
  frenzyHpBonus?: number;
}

export interface ProjectileEntity {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  radius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  isEnemy: boolean;
  pierce: number;
  homing?: boolean;
  chainRemaining?: number;
  hitEnemyIds?: number[];
  isPrism?: boolean;
  isCrit?: boolean;
  isRiftDisc?: boolean;
  isReturning?: boolean;
  returnDamageBonus?: number;
  effectType?: ElementalEffectType;
}

export interface PickupEntity {
  id: number;
  type: PickupType;
  x: number;
  y: number;
  z: number;
  value: number; // For xp: xpValue; for medkit: HP heal; for shield: shield amount; for special: buff duration
  radius: number;
  lifetime?: number;
  maxLifetime?: number;
}

export interface ChestEntity {
  id: number;
  rarity: ChestRarity;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface ShockwaveEffect {
  id: number;
  x: number;
  z: number;
  radius: number;
  maxRadius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface DelayedBurstEffect {
  id: number;
  x: number;
  z: number;
  delayTimer: number;
  damage: number;
  radius: number;
  color: string;
  isFuseMine?: boolean;
  secondaryOnDetonate?: boolean;
}

export interface HazardZone {
  id: number;
  type: HazardZoneType;
  x: number;
  z: number;
  radius: number;
  duration: number;
  maxDuration: number;
  damagePerSec: number;
  slowPercent?: number;
}

export type ParticleType = "burn" | "poison" | "shock" | "frost" | "hit" | "weapon";

export interface StatusParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
}

export interface GameRuntime {
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  pickups: PickupEntity[];
  chests: ChestEntity[];
  shockwaves: ShockwaveEffect[];
  delayedBursts: DelayedBurstEffect[];
  hazardZones: HazardZone[];
  particles: StatusParticle[];
  particlePool: StatusParticle[];
  playerPosition: THREE.Vector3;
  playerInvulnerableTimer: number;
  lastAttackTimer: number;
  axeAngle: number;
  nextEntityId: number;
  bossSpawned: boolean;
  bossDefeated: boolean;
  spawnTimer: number;
  elapsedSimulationTime: number;
  lastSecondLogged: number;

  // Round progression state kept in runtime (high-frequency)
  currentRound: number;
  roundSpawnedCount: number;
  roundQuota: number;
  intermissionTimer: number;

  // Cryovex frost player slow
  playerSlowTimer: number;
  playerSlowFactor: number;

  normalEnemyKillsForChest: number;
  normalEnemyKillsForFrenzy: number;
  nextFrenzyKillThreshold: number;
  frenzyActive: boolean;
  frenzyTimer: number;

  reset: () => void;
}

export function createGameRuntime(): GameRuntime {
  const initialPool: StatusParticle[] = [];
  for (let i = 0; i < 250; i++) {
    initialPool.push({
      id: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1,
      color: "#ffffff",
      size: 0.1,
      type: "hit",
    });
  }

  const runtime: GameRuntime = {
    enemies: [],
    projectiles: [],
    pickups: [],
    chests: [],
    shockwaves: [],
    delayedBursts: [],
    hazardZones: [],
    particles: [],
    particlePool: initialPool,
    playerPosition: new THREE.Vector3(0, 1.2, 0),
    playerInvulnerableTimer: 0,
    lastAttackTimer: 0,
    axeAngle: 0,
    nextEntityId: 1,
    bossSpawned: false,
    bossDefeated: false,
    spawnTimer: 0,
    elapsedSimulationTime: 0,
    lastSecondLogged: 0,
    currentRound: 1,
    roundSpawnedCount: 0,
    roundQuota: 14,
    intermissionTimer: 0,
    playerSlowTimer: 0,
    playerSlowFactor: 1.0,
    normalEnemyKillsForChest: 0,
    normalEnemyKillsForFrenzy: 0,
    nextFrenzyKillThreshold: 75,
    frenzyActive: false,
    frenzyTimer: 0,
    reset: () => {
      runtime.enemies = [];
      runtime.projectiles = [];
      runtime.pickups = [];
      runtime.chests = [];
      runtime.shockwaves = [];
      runtime.delayedBursts = [];
      runtime.hazardZones = [];
      while (runtime.particles.length > 0 && runtime.particlePool.length < 250) {
        runtime.particlePool.push(runtime.particles.pop()!);
      }
      runtime.particles.length = 0;
      runtime.playerPosition.set(0, 1.2, 0);
      runtime.playerInvulnerableTimer = 0;
      runtime.lastAttackTimer = 0;
      runtime.axeAngle = 0;
      runtime.nextEntityId = 1;
      runtime.bossSpawned = false;
      runtime.bossDefeated = false;
      runtime.spawnTimer = 0;
      runtime.elapsedSimulationTime = 0;
      runtime.lastSecondLogged = 0;
      runtime.currentRound = 1;
      runtime.roundSpawnedCount = 0;
      runtime.roundQuota = 14;
      runtime.intermissionTimer = 0;
      runtime.playerSlowTimer = 0;
      runtime.playerSlowFactor = 1.0;
      runtime.normalEnemyKillsForChest = 0;
      runtime.normalEnemyKillsForFrenzy = 0;
      runtime.nextFrenzyKillThreshold = 75;
      runtime.frenzyActive = false;
      runtime.frenzyTimer = 0;
    },
  };

  return runtime;
}

export function spawnStatusParticle(
  runtime: GameRuntime,
  type: ParticleType,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  color: string,
  size: number,
  maxLife: number
): void {
  if (runtime.particles.length >= 250) return;

  const p = runtime.particlePool.pop();
  if (p) {
    p.id = runtime.nextEntityId++;
    p.type = type;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.color = color;
    p.size = size;
    p.life = 0;
    p.maxLife = maxLife;
    runtime.particles.push(p);
  } else {
    runtime.particles.push({
      id: runtime.nextEntityId++,
      type,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      color,
      size,
      life: 0,
      maxLife,
    });
  }
}

export function damagePlayer(runtime: GameRuntime, amount: number, invulnerableSeconds: number): void {
  const beforePhoenix = useGameStore.getState().passives.phoenix_fragment;
  useGameStore.getState().takeDamage(amount);
  const afterPhoenix = useGameStore.getState().passives.phoenix_fragment;
  const revived = afterPhoenix < beforePhoenix;
  const hasRadiantBastion = Boolean(useGameStore.getState().secretPassives?.radiant_bastion);
  runtime.playerInvulnerableTimer = Math.max(
    runtime.playerInvulnerableTimer,
    revived ? (hasRadiantBastion ? 3.5 : 2.0) : invulnerableSeconds
  );

  if (revived) {
    const p = runtime.playerPosition;
    for (let i = 0; i < 28 && runtime.particles.length < 250; i++) {
      const a = (i / 28) * Math.PI * 2;
      spawnStatusParticle(
        runtime,
        "burn",
        p.x,
        0.8,
        p.z,
        Math.cos(a) * (2.5 + Math.random() * 2),
        1.2 + Math.random() * 2,
        Math.sin(a) * (2.5 + Math.random() * 2),
        i % 2 ? "#f97316" : "#f43f5e",
        0.32,
        0.9
      );
    }
  }
}
