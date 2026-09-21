import * as THREE from "three";
import type { EnemyType } from "../types/game";

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
  hitFlashTimer: number;
  scaleY: number; // for squash/stretch
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
}

export interface PickupEntity {
  id: number;
  x: number;
  y: number;
  z: number;
  xpValue: number;
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

export interface GameRuntime {
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  pickups: PickupEntity[];
  shockwaves: ShockwaveEffect[];
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
  reset: () => void;
}

export function createGameRuntime(): GameRuntime {
  const runtime: GameRuntime = {
    enemies: [],
    projectiles: [],
    pickups: [],
    shockwaves: [],
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
    reset: () => {
      runtime.enemies = [];
      runtime.projectiles = [];
      runtime.pickups = [];
      runtime.shockwaves = [];
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
    },
  };

  return runtime;
}
