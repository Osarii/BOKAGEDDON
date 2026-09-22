import * as THREE from "three";
import type { ElementalEffectType, EnemyType, HazardZoneType, PickupType } from "../types/game";

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
  shockwaves: ShockwaveEffect[];
  delayedBursts: DelayedBurstEffect[];
  hazardZones: HazardZone[];
  particles: StatusParticle[];
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

  // Temporary Special Item Buff Timers (decrement only during active gameplay)
  overclockTimer: number;
  teslaTimer: number;
  toxicRelicTimer: number;
  phoenixTimer: number;

  reset: () => void;
}

export function createGameRuntime(): GameRuntime {
  const runtime: GameRuntime = {
    enemies: [],
    projectiles: [],
    pickups: [],
    shockwaves: [],
    delayedBursts: [],
    hazardZones: [],
    particles: [],
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
    overclockTimer: 0,
    teslaTimer: 0,
    toxicRelicTimer: 0,
    phoenixTimer: 0,
    reset: () => {
      runtime.enemies = [];
      runtime.projectiles = [];
      runtime.pickups = [];
      runtime.shockwaves = [];
      runtime.delayedBursts = [];
      runtime.hazardZones = [];
      runtime.particles = [];
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
      runtime.overclockTimer = 0;
      runtime.teslaTimer = 0;
      runtime.toxicRelicTimer = 0;
      runtime.phoenixTimer = 0;
    },
  };

  return runtime;
}
