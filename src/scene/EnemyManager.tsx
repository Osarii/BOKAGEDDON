import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { damagePlayer, type GameRuntime, type EnemyEntity } from "../game/runtime";
import {
  ENEMY_CONFIGS,
  BOSS_CONFIGS,
  HARD_ENEMY_CAP,
  ARENA_BOUNDARY_LIMIT,
  GAME_CONFIG,
  RECOVERY_CONFIG,
  CHEST_CONFIG,
  rollChestRarity,
  rollBossLoot,
} from "../game/config";
import {
  getRoundEnemyCap,
  getRoundEnemyQuota,
  isBossRound,
  getBossTypeForRound,
  getBossCycleTier,
  isBossType,
} from "../game/progression";
import {
  getSpawnInterval,
  getSpawnBatch,
  getEnemyTypeForRound,
  getEnemyHealthForRound,
  getEnemyDamageForRound,
} from "../game/spawnRules";
import { useGameStore } from "../store/gameStore";
import { ASSETS } from "../config/assets";
import { gameAudio } from "../audio/gameAudio";
import type { ChestRarity, EnemyType, BossType, RecoveryPickupType } from "../types/game";

interface EnemyManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

interface DeathRing {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  currentRadius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

const MAX_DEATH_RINGS = 32;
const FRENZY_DURATION = 90;

// Shared SVG Textures loaded once at module scope
const textureLoader = new THREE.TextureLoader();
const enemyTextures = {
  slime: textureLoader.load(ASSETS.enemies.slime),
  runner: textureLoader.load(ASSETS.enemies.runner),
  brute: textureLoader.load(ASSETS.enemies.brute),
  shooter: textureLoader.load(ASSETS.enemies.shooter),
  bonklord: textureLoader.load(ASSETS.enemies.bonklord),
};
Object.values(enemyTextures).forEach((tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
});

// Temporary transformation matrices and vectors reused every frame
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempRotation = new THREE.Euler();
const tempScale = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const decalMatrix = new THREE.Matrix4();
const decalPosition = new THREE.Vector3();
const decalRotation = new THREE.Euler();
const decalQuaternion = new THREE.Quaternion();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

// Base, flash, and status colors for InstancedMesh.setColorAt
const flashColor = new THREE.Color("#ffffff");
const burnStatusColor = new THREE.Color("#f97316"); // warm fiery orange
const poisonStatusColor = new THREE.Color("#22c55e"); // toxic green
const frostStatusColor = new THREE.Color("#38bdf8"); // icy blue
const baseColors: Record<EnemyType, THREE.Color> = {
  slime: new THREE.Color("#c084fc"),
  runner: new THREE.Color("#ff6b35"),
  brute: new THREE.Color("#ef4444"),
  shooter: new THREE.Color("#22d3ee"),
  bonklord: new THREE.Color("#e11d48"),
  cindermaw: new THREE.Color("#f97316"),
  stormcoil: new THREE.Color("#00e5ff"),
  venomatrix: new THREE.Color("#22c55e"),
  cryovex: new THREE.Color("#38bdf8"),
};

// Safe geometry merger normalizing indexed and non-indexed buffers and computing bounds/normals
function safeMerge(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(normalized);
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  merged.computeVertexNormals();
  return merged;
}

function getConfiguredBossStats(tier: number, bossType: BossType) {
  const safeTier = Math.max(1, Math.floor(tier));
  const boss = BOSS_CONFIGS[bossType];
  return {
    health: Math.round(boss.baseHp * (1 + (safeTier - 1) * 0.55)),
    damage: Math.round(boss.baseDamage * (1 + (safeTier - 1) * 0.35)),
    speed: Math.min(4.0, boss.speed + (safeTier - 1) * 0.12),
  };
}

function spawnChest(runtime: GameRuntime, x: number, z: number, rarity: ChestRarity) {
  if (runtime.chests.length >= CHEST_CONFIG.maxActiveChests) return;
  runtime.chests.push({
    id: runtime.nextEntityId++,
    rarity,
    x,
    y: 0.45,
    z,
    radius: 0.85,
  });
}

export const EnemyManager: React.FC<EnemyManagerProps> = ({ runtimeRef }) => {
  // InstancedMesh references for the 4 standard archetypes (Body + Face Decals)
  const slimeMeshRef = useRef<THREE.InstancedMesh>(null);
  const runnerMeshRef = useRef<THREE.InstancedMesh>(null);
  const bruteMeshRef = useRef<THREE.InstancedMesh>(null);
  const shooterMeshRef = useRef<THREE.InstancedMesh>(null);

  const slimeDecalRef = useRef<THREE.InstancedMesh>(null);
  const runnerDecalRef = useRef<THREE.InstancedMesh>(null);
  const bruteDecalRef = useRef<THREE.InstancedMesh>(null);
  const shooterDecalRef = useRef<THREE.InstancedMesh>(null);

  // InstancedMesh for death dissipation rings
  const deathMeshRef = useRef<THREE.InstancedMesh>(null);
  const deathRingsRef = useRef<DeathRing[]>([]);

  // Last synced boss HP
  const lastBossHpRef = useRef<number>(-1);
  const lastFrenzySyncRef = useRef({
    active: false,
    seconds: 0,
    kills: 0,
    nextThreshold: 75,
  });

  // Shared reusable 3D geometries with distinct silhouettes
  const geometries = useMemo(() => {
    // 1. Slime: Bouncy dome body with dual crown nubs
    const sBody = new THREE.SphereGeometry(0.55, 16, 12).scale(1.0, 0.85, 1.0).translate(0, 0.45, 0);
    const sNubL = new THREE.SphereGeometry(0.14, 8, 6).translate(-0.28, 0.88, 0);
    const sNubR = new THREE.SphereGeometry(0.14, 8, 6).translate(0.28, 0.88, 0);
    const slimeGeo = safeMerge([sBody, sNubL, sNubR]);

    // 2. Runner: Supersonic stealth dart with swept wings and top fin
    const rNose = new THREE.ConeGeometry(0.35, 1.25, 4).rotateX(Math.PI / 2).translate(0, 0.45, 0.1);
    const rWingL = new THREE.BoxGeometry(0.75, 0.07, 0.45).rotateY(-0.35).translate(-0.48, 0.42, -0.2);
    const rWingR = new THREE.BoxGeometry(0.75, 0.07, 0.45).rotateY(0.35).translate(0.48, 0.42, -0.2);
    const rFin = new THREE.BoxGeometry(0.06, 0.35, 0.35).translate(0, 0.65, -0.25);
    const runnerGeo = safeMerge([rNose, rWingL, rWingR, rFin]);

    // 3. Brute: Heavy armored tank chassis with dual shoulder horns and visor brow
    const bTorso = new THREE.BoxGeometry(1.45, 1.35, 1.15).translate(0, 0.75, 0);
    const bHornL = new THREE.ConeGeometry(0.24, 0.75, 5).rotateZ(-0.4).translate(-0.7, 1.65, 0);
    const bHornR = new THREE.ConeGeometry(0.24, 0.75, 5).rotateZ(0.4).translate(0.7, 1.65, 0);
    const bBrow = new THREE.BoxGeometry(1.15, 0.3, 0.25).translate(0, 1.05, 0.6);
    const bruteGeo = safeMerge([bTorso, bHornL, bHornR, bBrow]);

    // 4. Shooter: Floating arcane diamond core with barrel and 4 stabilizer spires
    const shCore = new THREE.OctahedronGeometry(0.55);
    const shBarrel = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 8).rotateX(Math.PI / 2).translate(0, 0, 0.4);
    const shSpireTop = new THREE.ConeGeometry(0.15, 0.5, 4).translate(0, 0.65, 0);
    const shSpireBot = new THREE.ConeGeometry(0.15, 0.5, 4).rotateX(Math.PI).translate(0, -0.65, 0);
    const shSpireL = new THREE.ConeGeometry(0.14, 0.45, 4).rotateZ(Math.PI / 2).translate(-0.65, 0, 0);
    const shSpireR = new THREE.ConeGeometry(0.14, 0.45, 4).rotateZ(-Math.PI / 2).translate(0.65, 0, 0);
    const shooterGeo = safeMerge([shCore, shBarrel, shSpireTop, shSpireBot, shSpireL, shSpireR]);

    // Decal quads for official SVG facial identities
    const decals = {
      slime: new THREE.PlaneGeometry(0.7, 0.7),
      runner: new THREE.PlaneGeometry(0.75, 0.75),
      brute: new THREE.PlaneGeometry(1.1, 1.1),
      shooter: new THREE.PlaneGeometry(0.85, 0.85),
    };
    Object.values(decals).forEach((d) => {
      d.computeBoundingSphere();
      d.computeBoundingBox();
    });

    const deathRing = new THREE.RingGeometry(0.7, 0.95, 32).rotateX(-Math.PI / 2);
    deathRing.computeBoundingSphere();
    deathRing.computeBoundingBox();

    return {
      slime: slimeGeo,
      runner: runnerGeo,
      brute: bruteGeo,
      shooter: shooterGeo,
      decals,
      deathRing,
    };
  }, []);

  // Shared materials supporting per-instance colors and rich emissives
  const materials = useMemo(() => {
    return {
      slime: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#7c3aed",
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.15,
      }),
      runner: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ea580c",
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.35,
      }),
      brute: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#991b1b",
        emissiveIntensity: 0.45,
        roughness: 0.5,
        metalness: 0.45,
      }),
      shooter: new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#0891b2",
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.3,
      }),
      // Decal materials mapped with official SVG assets
      decalSlime: new THREE.MeshBasicMaterial({
        map: enemyTextures.slime,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      }),
      decalRunner: new THREE.MeshBasicMaterial({
        map: enemyTextures.runner,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      }),
      decalBrute: new THREE.MeshBasicMaterial({
        map: enemyTextures.brute,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      }),
      decalShooter: new THREE.MeshBasicMaterial({
        map: enemyTextures.shooter,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        side: THREE.DoubleSide,
      }),
      deathRing: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    };
  }, []);

  // Initialize instance counts to 0 and pre-allocate instanceColor buffers
  useEffect(() => {
    const archetypes: Array<{
      mesh: THREE.InstancedMesh | null;
      decal: THREE.InstancedMesh | null;
      type: EnemyType;
    }> = [
      { mesh: slimeMeshRef.current, decal: slimeDecalRef.current, type: "slime" },
      { mesh: runnerMeshRef.current, decal: runnerDecalRef.current, type: "runner" },
      { mesh: bruteMeshRef.current, decal: bruteDecalRef.current, type: "brute" },
      { mesh: shooterMeshRef.current, decal: shooterDecalRef.current, type: "shooter" },
    ];

    archetypes.forEach(({ mesh, decal, type }) => {
      if (mesh) {
        mesh.count = 0;
        const colors = new Float32Array(HARD_ENEMY_CAP * 3);
        const base = baseColors[type];
        for (let i = 0; i < HARD_ENEMY_CAP; i++) {
          mesh.setMatrixAt(i, hiddenMatrix);
          colors[i * 3] = base.r;
          colors[i * 3 + 1] = base.g;
          colors[i * 3 + 2] = base.b;
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        mesh.instanceColor.needsUpdate = true;
      }
      if (decal) {
        decal.count = 0;
        for (let i = 0; i < HARD_ENEMY_CAP; i++) {
          decal.setMatrixAt(i, hiddenMatrix);
        }
        decal.instanceMatrix.needsUpdate = true;
      }
    });

    if (deathMeshRef.current) {
      deathMeshRef.current.count = 0;
      const colors = new Float32Array(MAX_DEATH_RINGS * 3);
      for (let i = 0; i < MAX_DEATH_RINGS; i++) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      }
      deathMeshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      deathMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const playerPos = runtime.playerPosition;
    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    const round = useGameStore.getState().round;
    const roundStatus = useGameStore.getState().roundStatus;
    const time = state.clock.elapsedTime;

    if (runtime.frenzyActive) {
      runtime.frenzyTimer = Math.max(0, runtime.frenzyTimer - delta);
      if (runtime.frenzyTimer <= 0) {
        runtime.frenzyActive = false;
        if (runtime.normalEnemyKillsForFrenzy >= runtime.nextFrenzyKillThreshold) {
          runtime.frenzyActive = true;
          runtime.frenzyTimer = FRENZY_DURATION;
          runtime.nextFrenzyKillThreshold += 75;
          useGameStore.getState().setNotification({
            title: "FRENZY MODE",
            subtitle: "Enemy horde enraged for 90 seconds",
          });
        }
      }
    }
    const frenzySeconds = Math.ceil(runtime.frenzyTimer);
    const lastFrenzy = lastFrenzySyncRef.current;
    if (
      lastFrenzy.active !== runtime.frenzyActive ||
      lastFrenzy.seconds !== frenzySeconds ||
      lastFrenzy.kills !== runtime.normalEnemyKillsForFrenzy ||
      lastFrenzy.nextThreshold !== runtime.nextFrenzyKillThreshold
    ) {
      lastFrenzySyncRef.current = {
        active: runtime.frenzyActive,
        seconds: frenzySeconds,
        kills: runtime.normalEnemyKillsForFrenzy,
        nextThreshold: runtime.nextFrenzyKillThreshold,
      };
      useGameStore.getState().setFrenzyState({
        active: runtime.frenzyActive,
        timer: frenzySeconds,
        kills: runtime.normalEnemyKillsForFrenzy,
        nextThreshold: runtime.nextFrenzyKillThreshold,
      });
    }

    // Player contact damage cooldown
    if (runtime.playerInvulnerableTimer > 0) {
      runtime.playerInvulnerableTimer -= delta;
    }

    // Synchronize round state if external reset or new run
    if (runtime.currentRound !== round) {
      runtime.currentRound = round;
      runtime.roundQuota = getRoundEnemyQuota(round);
      runtime.roundSpawnedCount = 0;
      runtime.bossSpawned = false;
      runtime.bossDefeated = false;
      runtime.intermissionTimer = 0;
    }

    // =========================================================================
    // 1. Endless Rounds & Spawning State Machine
    // =========================================================================
    if (roundStatus === "intermission") {
      runtime.intermissionTimer += delta;
      if (runtime.intermissionTimer >= GAME_CONFIG.intermissionDurationSec) {
        runtime.intermissionTimer = 0;
        const nextRound = round + 1;
        runtime.currentRound = nextRound;
        runtime.roundQuota = getRoundEnemyQuota(nextRound);
        runtime.roundSpawnedCount = 0;
        runtime.bossSpawned = false;
        runtime.bossDefeated = false;
        useGameStore.getState().advanceRound();
      }
    } else {
      // roundStatus === "wave"
      const isBoss = isBossRound(round);

      if (isBoss) {
        // Boss Round: Strictly boss-focused
        if (!runtime.bossSpawned) {
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = ARENA_BOUNDARY_LIMIT - 3.0;
          const bossType = getBossTypeForRound(round);
          const bossTier = getBossCycleTier(round);
          const bossStats = getConfiguredBossStats(bossTier, bossType);
          const bossConfig = BOSS_CONFIGS[bossType];
          const enemyConfig = ENEMY_CONFIGS[bossType];

          const bossEntity: EnemyEntity = {
            id: runtime.nextEntityId++,
            type: bossType,
            x: Math.cos(angle) * spawnDist,
            y: (enemyConfig?.height || 3.0) / 2,
            z: Math.sin(angle) * spawnDist,
            vx: 0,
            vz: 0,
            health: bossStats.health,
            maxHealth: bossStats.health,
            speed: bossStats.speed,
            damage: bossStats.damage,
            radius: enemyConfig?.radius || 1.4,
            color: bossConfig.accentColor,
            scoreValue: (enemyConfig?.scoreValue || 600) * bossTier,
            xpValue: (enemyConfig?.xpValue || 120) * bossTier,
            stompCooldown: 3.5,
            bossAttackTimer: 0,
            bossAttackCooldown: bossConfig.attackCooldown,
            bossSubAttackTimer: 0,
            hitFlashTimer: 0,
            scaleY: 1,
          };

          runtime.enemies.push(bossEntity);
          runtime.bossSpawned = true;
          runtime.roundSpawnedCount = 1;
          lastBossHpRef.current = bossStats.health;
          useGameStore.getState().setBossActive(true);
          useGameStore.getState().updateBossHealth(bossStats.health, bossStats.health, {
            name: bossConfig.displayName,
            tier: bossTier,
            type: bossType,
            color: bossConfig.accentColor,
          });
          gameAudio.play("bossSpawn");
        }
      } else {
        // Normal Round Spawning with finite quota
        const remainingQuota = Math.max(0, runtime.roundQuota - runtime.roundSpawnedCount);

        if (remainingQuota > 0) {
          runtime.spawnTimer += delta;
          const spawnIntervalSec = (getSpawnInterval(round) / 1000) * (runtime.frenzyActive ? 0.8 : 1);

          if (runtime.spawnTimer >= spawnIntervalSec) {
            runtime.spawnTimer = 0;
            const enemyCap = getRoundEnemyCap(round);
            const availableSlots = Math.max(0, enemyCap - runtime.enemies.length);
            const batchSize = Math.min(getSpawnBatch(round), availableSlots, remainingQuota);

            if (batchSize > 0) {
              for (let b = 0; b < batchSize; b++) {
                const type = getEnemyTypeForRound(round);
                const config = ENEMY_CONFIGS[type];

                const angle = Math.random() * Math.PI * 2;
                const spawnDist = 15.0 + Math.random() * 3.5;
                let spawnX = playerPos.x + Math.cos(angle) * spawnDist;
                let spawnZ = playerPos.z + Math.sin(angle) * spawnDist;

                const distFromCenter = Math.hypot(spawnX, spawnZ);
                if (distFromCenter > ARENA_BOUNDARY_LIMIT - 1.0) {
                  const clampRatio = (ARENA_BOUNDARY_LIMIT - 1.0) / distFromCenter;
                  spawnX *= clampRatio;
                  spawnZ *= clampRatio;
                }

                const enemyHealth = getEnemyHealthForRound(config.health, round);
                const enemyDamage = getEnemyDamageForRound(config.damage, round);

                const enemy: EnemyEntity = {
                  id: runtime.nextEntityId++,
                  type,
                  x: spawnX,
                  y: config.height / 2,
                  z: spawnZ,
                  vx: 0,
                  vz: 0,
                  health: enemyHealth,
                  maxHealth: enemyHealth,
                  speed: config.speed,
                  damage: enemyDamage,
                  radius: config.radius,
                  color: config.color,
                  scoreValue: config.scoreValue,
                  xpValue: config.xpValue,
                  shootCooldown: type === "shooter" ? Math.random() * 2 + 1 : undefined,
                  hitFlashTimer: 0,
                  scaleY: 1,
                };

                runtime.enemies.push(enemy);
                runtime.roundSpawnedCount++;
              }
            }
          }
        } else if (runtime.enemies.length === 0) {
          // All quota spawned and all remaining enemies defeated!
          runtime.intermissionTimer = 0;
          useGameStore.getState().setRoundStatus("intermission");
        }
      }
    }

    // =========================================================================
    // 2. AI Update & Movement Loop
    // =========================================================================
    const playerRadius = 0.5;
    let frameKills = 0;
    let frameScore = 0;

    for (let i = runtime.enemies.length - 1; i >= 0; i--) {
      const enemy = runtime.enemies[i];

      // Decrease hit flash
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= delta;
      }

      // Elemental status processing (Burn DoT, Poison DoT, Frost Slow)
      if (enemy.burnTimer && enemy.burnTimer > 0) {
        enemy.burnTimer -= delta;
        enemy.burnTickAcc = (enemy.burnTickAcc || 0) + delta;
        if (enemy.burnTickAcc >= 0.25) {
          enemy.health -= (enemy.burnDps || 8) * 0.25;
          enemy.burnTickAcc = 0;
        }
      }

      if (enemy.poisonTimer && enemy.poisonTimer > 0) {
        enemy.poisonTimer -= delta;
        enemy.poisonTickAcc = (enemy.poisonTickAcc || 0) + delta;
        if (enemy.poisonTickAcc >= 0.5) {
          enemy.health -= (enemy.poisonDps || 6) * 0.5;
          enemy.poisonTickAcc = 0;
        }
      }

      let currentSpeed = enemy.speed;
      const isFrenziedNormal = runtime.frenzyActive && !isBossType(enemy.type);
      if (isFrenziedNormal && !enemy.frenzyHpBonus) {
        enemy.frenzyHpBonus = Math.round(enemy.maxHealth * 0.3);
        enemy.maxHealth += enemy.frenzyHpBonus;
        enemy.health += enemy.frenzyHpBonus;
      } else if (!runtime.frenzyActive && enemy.frenzyHpBonus) {
        enemy.maxHealth -= enemy.frenzyHpBonus;
        enemy.health = Math.min(enemy.health, enemy.maxHealth);
        enemy.frenzyHpBonus = 0;
      }
      if (isFrenziedNormal) {
        currentSpeed *= 1.35;
      }
      if (enemy.frostTimer && enemy.frostTimer > 0) {
        enemy.frostTimer -= delta;
        currentSpeed *= (1 - (enemy.frostSlowPercent || 0.3));
      }

      // Check death
      if (enemy.health <= 0) {
        // Spawn XP pickup at death position
        runtime.pickups.push({
          id: runtime.nextEntityId++,
          type: "xp",
          x: enemy.x,
          y: 0.35,
          z: enemy.z,
          value: enemy.xpValue,
          radius: 0.4,
        });

        // Trigger lightweight death dissipation ring
        if (deathRingsRef.current.length < MAX_DEATH_RINGS) {
          deathRingsRef.current.push({
            x: enemy.x,
            y: 0.05,
            z: enemy.z,
            color: baseColors[enemy.type],
            currentRadius: enemy.radius * 0.7,
            maxRadius: enemy.radius * 2.6,
            life: 0.32,
            maxLife: 0.32,
          });
        }

        // Record kill & score for batched store dispatch
        frameKills++;
        frameScore += enemy.scoreValue;

        if (isBossType(enemy.type)) {
          runtime.bossDefeated = true;
          useGameStore.getState().setBossActive(false);
          gameAudio.play("bossDeath");

          // Exactly one item dropped per boss defeat using ONE weighted roll (100% total)
          const bossLoot = rollBossLoot();
          const lootValue =
            (RECOVERY_CONFIG.pickupEffects as Record<string, { hp: number; shield: number }>)[bossLoot]?.hp ||
              (RECOVERY_CONFIG.pickupEffects as Record<string, { hp: number; shield: number }>)[bossLoot]?.shield ||
              1;
          const isRecoveryLoot =
            bossLoot === "medkit_emergency" ||
            bossLoot === "medkit_case" ||
            bossLoot === "shield_potion" ||
            bossLoot === "shield_battery";

          runtime.pickups.push({
            id: runtime.nextEntityId++,
            type: bossLoot,
            x: enemy.x,
            y: 0.45,
            z: enemy.z,
            value: lootValue,
            radius: 0.8,
            lifetime: isRecoveryLoot ? RECOVERY_CONFIG.lifetimeSec : undefined,
            maxLifetime: isRecoveryLoot ? RECOVERY_CONFIG.lifetimeSec : undefined,
          });

          spawnChest(runtime, enemy.x + 1.1, enemy.z, "legendary");

          // Boss round complete! Enter intermission to advance to next round
          runtime.intermissionTimer = 0;
          useGameStore.getState().setRoundStatus("intermission");
        } else {
          gameAudio.play("enemyDeath");
          runtime.normalEnemyKillsForChest++;
          runtime.normalEnemyKillsForFrenzy++;

          if (!runtime.frenzyActive && runtime.normalEnemyKillsForFrenzy >= runtime.nextFrenzyKillThreshold) {
            runtime.frenzyActive = true;
            runtime.frenzyTimer = FRENZY_DURATION;
            runtime.nextFrenzyKillThreshold += 75;
            useGameStore.getState().setNotification({
              title: "FRENZY MODE",
              subtitle: "Enemy horde enraged for 90 seconds",
            });
          }

          if (runtime.normalEnemyKillsForChest % CHEST_CONFIG.guaranteedNormalKills === 0) {
            spawnChest(runtime, enemy.x + 0.7, enemy.z, "common");
          } else if (Math.random() < CHEST_CONFIG.normalDropChance) {
            spawnChest(runtime, enemy.x + 0.7, enemy.z, rollChestRarity());
          }

          // Normal enemies ONLY drop recovery items (can NEVER drop SpecialPickupType items)
          const activeRecoveryCount = runtime.pickups.filter((p) =>
            p.type === "medkit_emergency" ||
            p.type === "medkit_case" ||
            p.type === "shield_potion" ||
            p.type === "shield_battery"
          ).length;

          if (
            activeRecoveryCount < RECOVERY_CONFIG.maxActivePickups &&
            Math.random() < RECOVERY_CONFIG.normalEnemyDropChance
          ) {
            const roll = Math.random();
            let dropType: RecoveryPickupType;
            let dropVal: number;

            if (roll < 0.40) {
              dropType = "medkit_emergency";
              dropVal = 35;
            } else if (roll < 0.80) {
              dropType = "shield_potion";
              dropVal = 25;
            } else if (roll < 0.90) {
              dropType = "medkit_case";
              dropVal = 70;
            } else {
              dropType = "shield_battery";
              dropVal = 50;
            }

            runtime.pickups.push({
              id: runtime.nextEntityId++,
              type: dropType,
              x: enemy.x,
              y: 0.35,
              z: enemy.z,
              value: dropVal,
              radius: 0.5,
              lifetime: RECOVERY_CONFIG.lifetimeSec,
              maxLifetime: RECOVERY_CONFIG.lifetimeSec,
            });
          }
        }

        // Fast splice
        runtime.enemies.splice(i, 1);
        continue;
      }

      // Vector to player
      const dx = playerPos.x - enemy.x;
      const dz = playerPos.z - enemy.z;
      const distToPlayer = Math.hypot(dx, dz);

      // Archetype specific behaviors
      if (enemy.type === "shooter") {
        // Shooter maintains standoff distance (~7.5 units)
        if (distToPlayer > 8.0) {
          enemy.x += (dx / distToPlayer) * currentSpeed * delta;
          enemy.z += (dz / distToPlayer) * currentSpeed * delta;
        } else if (distToPlayer < 6.0) {
          // Back away
          enemy.x -= (dx / distToPlayer) * currentSpeed * 0.7 * delta;
          enemy.z -= (dz / distToPlayer) * currentSpeed * 0.7 * delta;
        }

        // Shoot hostile projectile (clearly visible red identity)
        if (enemy.shootCooldown !== undefined) {
          enemy.shootCooldown -= delta * (runtime.frenzyActive ? 1.5 : 1);

          // Visible charge-up particle feedback before firing
          if (enemy.shootCooldown <= 0.45 && enemy.shootCooldown > 0 && Math.random() < 0.25) {
            if (runtime.particles.length < 250) {
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "hit",
                x: enemy.x + (Math.random() - 0.5) * 0.3,
                y: 1.2 + (Math.random() - 0.5) * 0.3,
                z: enemy.z + (Math.random() - 0.5) * 0.3,
                vx: (Math.random() - 0.5) * 0.5,
                vy: 0.5,
                vz: (Math.random() - 0.5) * 0.5,
                color: "#ff2222",
                size: 0.12,
                life: 0,
                maxLife: 0.3,
              });
            }
          }

          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = 2.4;
            const projSpeed = 7.0 * (runtime.frenzyActive ? 1.2 : 1);
            runtime.projectiles.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              y: 0.8,
              z: enemy.z,
              vx: (dx / distToPlayer) * projSpeed,
              vz: (dz / distToPlayer) * projSpeed,
              damage: Math.round(enemy.damage * (isFrenziedNormal ? 1.35 : 1)),
              radius: 0.28,
              color: "#ef4444",
              lifetime: 0,
              maxLifetime: 3.5,
              isEnemy: true,
              pierce: 1,
            });

            // Muzzle flash particles
            if (runtime.particles.length < 250) {
              for (let p = 0; p < 3; p++) {
                runtime.particles.push({
                  id: runtime.nextEntityId++,
                  type: "hit",
                  x: enemy.x + (dx / distToPlayer) * 0.5,
                  y: 0.8,
                  z: enemy.z + (dz / distToPlayer) * 0.5,
                  vx: (dx / distToPlayer) * 2 + (Math.random() - 0.5),
                  vy: (Math.random() - 0.5) * 0.5,
                  vz: (dz / distToPlayer) * 2 + (Math.random() - 0.5),
                  color: "#ff4444",
                  size: 0.15,
                  life: 0,
                  maxLife: 0.25,
                });
              }
            }
          }
        }
      } else if (isBossType(enemy.type)) {
        // Boss moves steadily toward player
        if (distToPlayer > 0.1) {
          enemy.x += (dx / distToPlayer) * currentSpeed * delta;
          enemy.z += (dz / distToPlayer) * currentSpeed * delta;
        }

        const bossType = enemy.type as BossType;
        const bCfg = BOSS_CONFIGS[bossType];

        // Boss attack timer
        if (enemy.bossAttackTimer === undefined) {
          enemy.bossAttackTimer = bCfg.attackCooldown;
        }
        enemy.bossAttackTimer -= delta;

        if (enemy.bossAttackTimer <= 0) {
          enemy.bossAttackTimer = bCfg.attackCooldown;

          if (bossType === "bonklord") {
            // Stomp AOE shockwave
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              z: enemy.z,
              radius: 0.5,
              maxRadius: 8.0,
              color: bCfg.accentColor,
              lifetime: 0,
              maxLifetime: 1.2,
            });
            if (distToPlayer < 4.2 && runtime.playerInvulnerableTimer <= 0) {
              damagePlayer(runtime, Math.round(enemy.damage * 0.65), GAME_CONFIG.playerInvulnerableDuration);
              gameAudio.play("playerDamage");
            }
          } else if (bossType === "cindermaw") {
            // Expanding fire ring shockwave
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              z: enemy.z,
              radius: 0.5,
              maxRadius: 7.5,
              color: bCfg.accentColor,
              lifetime: 0,
              maxLifetime: 1.3,
            });
            // Temporary burning ground hazard zone
            runtime.hazardZones.push({
              id: runtime.nextEntityId++,
              type: "fire",
              x: enemy.x + (Math.random() - 0.5) * 3,
              z: enemy.z + (Math.random() - 0.5) * 3,
              radius: 3.0,
              duration: 4.5,
              maxDuration: 4.5,
              damagePerSec: 14,
            });
            if (distToPlayer < 3.8 && runtime.playerInvulnerableTimer <= 0) {
              damagePlayer(runtime, Math.round(enemy.damage * 0.6), GAME_CONFIG.playerInvulnerableDuration);
              gameAudio.play("playerDamage");
            }
          } else if (bossType === "stormcoil") {
            // Charged pulse shockwave
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              z: enemy.z,
              radius: 0.5,
              maxRadius: 5.5,
              color: bCfg.accentColor,
              lifetime: 0,
              maxLifetime: 0.8,
            });
            // Radial 8-way electric projectile burst
            const projSpeed = 7.5;
            for (let a = 0; a < 8; a++) {
              const angle = (a / 8) * Math.PI * 2;
              runtime.projectiles.push({
                id: runtime.nextEntityId++,
                x: enemy.x,
                y: 0.8,
                z: enemy.z,
                vx: Math.cos(angle) * projSpeed,
                vz: Math.sin(angle) * projSpeed,
                damage: Math.round(enemy.damage * 0.7),
                radius: 0.3,
                color: bCfg.accentColor,
                lifetime: 0,
                maxLifetime: 3.2,
                isEnemy: true,
                effectType: "shock",
                pierce: 1,
              });
            }
          } else if (bossType === "venomatrix") {
            // Persistent poison pool hazard zone
            runtime.hazardZones.push({
              id: runtime.nextEntityId++,
              type: "poison",
              x: enemy.x,
              z: enemy.z,
              radius: 2.6,
              duration: 5.5,
              maxDuration: 5.5,
              damagePerSec: 10,
            });
            // Toxic projectile volley (3 spread projectiles)
            const baseAngle = Math.atan2(dx, dz);
            const projSpeed = 7.0;
            [-0.26, 0, 0.26].forEach((offset) => {
              const a = baseAngle + offset;
              runtime.projectiles.push({
                id: runtime.nextEntityId++,
                x: enemy.x,
                y: 0.8,
                z: enemy.z,
                vx: Math.sin(a) * projSpeed,
                vz: Math.cos(a) * projSpeed,
                damage: Math.round(enemy.damage * 0.75),
                radius: 0.32,
                color: bCfg.accentColor,
                lifetime: 0,
                maxLifetime: 3.5,
                isEnemy: true,
                effectType: "poison",
                pierce: 1,
              });
            });
          } else if (bossType === "cryovex") {
            // Frost nova shockwave
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              z: enemy.z,
              radius: 0.5,
              maxRadius: 7.0,
              color: bCfg.accentColor,
              lifetime: 0,
              maxLifetime: 1.1,
            });
            // Ice shard volley (5 spread projectiles)
            const baseAngle = Math.atan2(dx, dz);
            const projSpeed = 8.0;
            [-0.35, -0.17, 0, 0.17, 0.35].forEach((offset) => {
              const a = baseAngle + offset;
              runtime.projectiles.push({
                id: runtime.nextEntityId++,
                x: enemy.x,
                y: 0.8,
                z: enemy.z,
                vx: Math.sin(a) * projSpeed,
                vz: Math.cos(a) * projSpeed,
                damage: Math.round(enemy.damage * 0.7),
                radius: 0.28,
                color: bCfg.accentColor,
                lifetime: 0,
                maxLifetime: 3.5,
                isEnemy: true,
                effectType: "frost",
                pierce: 1,
              });
            });
            // Frost nova slow on player if caught in burst
            if (distToPlayer < 7.0) {
              runtime.playerSlowTimer = 2.5;
              runtime.playerSlowFactor = 0.55;
            }
          }
        }

        // Keep boss health synced with HUD only on meaningful change
        if (lastBossHpRef.current !== enemy.health) {
          lastBossHpRef.current = enemy.health;
          useGameStore.getState().updateBossHealth(enemy.health, enemy.maxHealth, {
            name: bCfg.displayName,
            tier: getBossCycleTier(round),
            type: bossType,
            color: bCfg.accentColor,
          });
        }
      } else {
        // Standard chase
        if (distToPlayer > 0.1) {
          enemy.x += (dx / distToPlayer) * currentSpeed * delta;
          enemy.z += (dz / distToPlayer) * currentSpeed * delta;
        }
      }

      // Circular arena boundary clamp
      const distFromCenter = Math.hypot(enemy.x, enemy.z);
      if (distFromCenter > ARENA_BOUNDARY_LIMIT) {
        const factor = ARENA_BOUNDARY_LIMIT / distFromCenter;
        enemy.x *= factor;
        enemy.z *= factor;
      }

      // Check contact damage with player
      if (distToPlayer < playerRadius + enemy.radius) {
        if (runtime.playerInvulnerableTimer <= 0) {
          damagePlayer(runtime, Math.round(enemy.damage * (isFrenziedNormal ? 1.35 : 1)), GAME_CONFIG.playerInvulnerableDuration);
          gameAudio.play("playerDamage");
        }
      }
    }

    // Batch all enemy kills and score gains in a single Zustand action per frame
    if (frameKills > 0) {
      useGameStore.getState().addKills(frameKills, frameScore);
    }

    // =========================================================================
    // 3. Render Batching into InstancedMeshes (Body + Decals + Hit Flash)
    // =========================================================================
    let slimeCount = 0;
    let runnerCount = 0;
    let bruteCount = 0;
    let shooterCount = 0;

    for (let i = 0; i < runtime.enemies.length; i++) {
      const e = runtime.enemies[i];
      if (isBossType(e.type)) {
        continue;
      }

      const meshRef =
        e.type === "slime"
          ? slimeMeshRef
          : e.type === "runner"
          ? runnerMeshRef
          : e.type === "brute"
          ? bruteMeshRef
          : shooterMeshRef;

      const decalRef =
        e.type === "slime"
          ? slimeDecalRef
          : e.type === "runner"
          ? runnerDecalRef
          : e.type === "brute"
          ? bruteDecalRef
          : shooterDecalRef;

      if (!meshRef.current || !decalRef.current) continue;

      let index = 0;
      if (e.type === "slime") index = slimeCount++;
      else if (e.type === "runner") index = runnerCount++;
      else if (e.type === "brute") index = bruteCount++;
      else if (e.type === "shooter") index = shooterCount++;

      if (index >= HARD_ENEMY_CAP) continue;

      // Rotation towards player
      const angle = Math.atan2(playerPos.x - e.x, playerPos.z - e.z);
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      // Archetype-specific movement animation & squash
      const isFlashing = e.hitFlashTimer > 0;
      const flashScale = isFlashing ? 1.3 : 1.0;

      if (e.type === "slime") {
        // Bouncy squash & stretch
        const bounce = Math.sin(time * 8 + e.id);
        tempPosition.set(e.x, 0.05, e.z);
        tempRotation.set(0, angle, 0);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(
          (1 - 0.15 * bounce) * flashScale,
          (1 + 0.22 * bounce) * flashScale,
          (1 - 0.15 * bounce) * flashScale
        );
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Slime landing dust particles when bounce hits bottom
        if (bounce < -0.85 && Math.random() < 0.08 && runtime.particles.length < 250) {
          runtime.particles.push({
            id: runtime.nextEntityId++,
            type: "hit",
            x: e.x + (Math.random() - 0.5) * 0.4,
            y: 0.1,
            z: e.z + (Math.random() - 0.5) * 0.4,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.3,
            vz: (Math.random() - 0.5) * 0.8,
            color: "#c084fc",
            size: 0.1,
            life: 0,
            maxLife: 0.25,
          });
        }

        // Decal on front surface of slime
        decalPosition.set(e.x + sinA * 0.58, 0.5 + bounce * 0.05, e.z + cosA * 0.58);
        decalMatrix.compose(decalPosition, tempQuaternion, tempScale);
      } else if (e.type === "runner") {
        // High-speed jet banking tilt + forward sprint lean
        const bank = Math.sin(time * 12 + e.id) * 0.15;
        const forwardLean = 0.25;
        tempPosition.set(e.x, 0.15, e.z);
        tempRotation.set(forwardLean, angle, bank);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(flashScale, flashScale, flashScale);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Speed trail particle behind runner
        if (Math.random() < 0.15 && runtime.particles.length < 250) {
          runtime.particles.push({
            id: runtime.nextEntityId++,
            type: "hit",
            x: e.x - sinA * 0.4,
            y: 0.2,
            z: e.z - cosA * 0.4,
            vx: -sinA * 0.6 + (Math.random() - 0.5) * 0.2,
            vy: 0.2,
            vz: -cosA * 0.6 + (Math.random() - 0.5) * 0.2,
            color: "#ff6b35",
            size: 0.1,
            life: 0,
            maxLife: 0.2,
          });
        }

        // Decal on dorsal surface of runner drone tilted toward overhead camera
        decalRotation.set(-0.35 + forwardLean, angle, bank);
        decalQuaternion.setFromEuler(decalRotation);
        decalPosition.set(e.x + sinA * 0.15, 0.62, e.z + cosA * 0.15);
        decalMatrix.compose(decalPosition, decalQuaternion, tempScale);
      } else if (e.type === "brute") {
        // Heavy lumbering stomp sway
        const sway = Math.sin(time * 5 + e.id) * 0.12;
        tempPosition.set(e.x, 0.05, e.z);
        tempRotation.set(0, angle, sway);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(flashScale, flashScale, flashScale);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Footstep impact particles
        if (Math.abs(sway) > 0.1 && Math.random() < 0.08 && runtime.particles.length < 250) {
          runtime.particles.push({
            id: runtime.nextEntityId++,
            type: "hit",
            x: e.x + (Math.random() - 0.5) * 0.6,
            y: 0.1,
            z: e.z + (Math.random() - 0.5) * 0.6,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.25,
            vz: (Math.random() - 0.5) * 0.6,
            color: "#ef4444",
            size: 0.12,
            life: 0,
            maxLife: 0.25,
          });
        }

        // Decal on front armored chest plate
        decalPosition.set(e.x + sinA * 0.66, 0.85, e.z + cosA * 0.66);
        decalMatrix.compose(decalPosition, tempQuaternion, tempScale);
      } else {
        // Shooter: Floating bob with subtle hovering spin
        const bob = Math.sin(time * 3.5 + e.id) * 0.15;
        tempPosition.set(e.x, 1.15 + bob, e.z);
        tempRotation.set(0, angle, 0);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(flashScale, flashScale, flashScale);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Decal on front face of shooter
        decalPosition.set(e.x + sinA * 0.58, 1.15 + bob, e.z + cosA * 0.58);
        decalMatrix.compose(decalPosition, tempQuaternion, tempScale);
      }

      meshRef.current.setMatrixAt(index, tempMatrix);
      decalRef.current.setMatrixAt(index, decalMatrix);

      // Per-instance Hit Flash & Elemental Status Color
      let activeColor = baseColors[e.type];
      if (isFlashing) {
        activeColor = flashColor;
      } else if (e.burnTimer && e.burnTimer > 0) {
        activeColor = burnStatusColor;
        // Burning status embers
        if (Math.random() < 0.12 && runtime.particles.length < 250) {
          runtime.particles.push({
            id: runtime.nextEntityId++,
            type: "burn",
            x: e.x + (Math.random() - 0.5) * 0.5,
            y: 0.6 + Math.random() * 0.4,
            z: e.z + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: 1.0,
            vz: (Math.random() - 0.5) * 0.3,
            color: "#f97316",
            size: 0.12,
            life: 0,
            maxLife: 0.45,
          });
        }
      } else if (e.poisonTimer && e.poisonTimer > 0) {
        activeColor = poisonStatusColor;
        // Poison status bubbles
        if (Math.random() < 0.12 && runtime.particles.length < 250) {
          runtime.particles.push({
            id: runtime.nextEntityId++,
            type: "poison",
            x: e.x + (Math.random() - 0.5) * 0.5,
            y: 0.5 + Math.random() * 0.3,
            z: e.z + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 0.2,
            vy: 0.5,
            vz: (Math.random() - 0.5) * 0.2,
            color: "#22c55e",
            size: 0.1,
            life: 0,
            maxLife: 0.5,
          });
        }
      } else if (e.frostTimer && e.frostTimer > 0) {
        activeColor = frostStatusColor;
        // Frost status crystalline motes
        if (Math.random() < 0.08 && runtime.particles.length < 250) {
          runtime.particles.push({
            id: runtime.nextEntityId++,
            type: "frost",
            x: e.x + (Math.random() - 0.5) * 0.5,
            y: 0.6 + Math.random() * 0.3,
            z: e.z + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.2,
            vz: (Math.random() - 0.5) * 0.3,
            color: "#38bdf8",
            size: 0.1,
            life: 0,
            maxLife: 0.4,
          });
        }
      }
      meshRef.current.setColorAt(index, activeColor);
    }

    // Set instance counts and update instance buffers efficiently
    const updateBatch = (
      mesh: THREE.InstancedMesh | null,
      decal: THREE.InstancedMesh | null,
      count: number
    ) => {
      if (mesh) {
        mesh.count = count;
        if (count > 0) {
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
      if (decal) {
        decal.count = count;
        if (count > 0) {
          decal.instanceMatrix.needsUpdate = true;
          if (decal.instanceColor) decal.instanceColor.needsUpdate = true;
        }
      }
    };

    updateBatch(slimeMeshRef.current, slimeDecalRef.current, slimeCount);
    updateBatch(runnerMeshRef.current, runnerDecalRef.current, runnerCount);
    updateBatch(bruteMeshRef.current, bruteDecalRef.current, bruteCount);
    updateBatch(shooterMeshRef.current, shooterDecalRef.current, shooterCount);

    // =========================================================================
    // 4. Update Death Dissipation Rings
    // =========================================================================
    const deathRings = deathRingsRef.current;
    let activeRingCount = 0;

    for (let d = deathRings.length - 1; d >= 0; d--) {
      const ring = deathRings[d];
      ring.life -= delta;

      if (ring.life <= 0) {
        deathRings.splice(d, 1);
        continue;
      }

      if (activeRingCount >= MAX_DEATH_RINGS || !deathMeshRef.current) continue;

      const progress = 1 - ring.life / ring.maxLife;
      const r = ring.currentRadius + (ring.maxRadius - ring.currentRadius) * progress;

      tempPosition.set(ring.x, ring.y, ring.z);
      tempRotation.set(0, 0, 0);
      tempQuaternion.setFromEuler(tempRotation);
      tempScale.set(r, 1, r);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

      deathMeshRef.current.setMatrixAt(activeRingCount, tempMatrix);
      deathMeshRef.current.setColorAt(activeRingCount, ring.color);
      activeRingCount++;
    }

    if (deathMeshRef.current) {
      deathMeshRef.current.count = activeRingCount;
      for (let i = activeRingCount; i < MAX_DEATH_RINGS; i++) {
        deathMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      deathMeshRef.current.instanceMatrix.needsUpdate = true;
      if (deathMeshRef.current.instanceColor) deathMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 4 Archetype Volumetric 3D Instanced Meshes */}
      <instancedMesh
        ref={slimeMeshRef}
        args={[geometries.slime, materials.slime, HARD_ENEMY_CAP]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={runnerMeshRef}
        args={[geometries.runner, materials.runner, HARD_ENEMY_CAP]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={bruteMeshRef}
        args={[geometries.brute, materials.brute, HARD_ENEMY_CAP]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={shooterMeshRef}
        args={[geometries.shooter, materials.shooter, HARD_ENEMY_CAP]}
        frustumCulled={false}
        castShadow
        receiveShadow
      />

      {/* 4 Archetype Official SVG Face Decal Instanced Meshes */}
      <instancedMesh
        ref={slimeDecalRef}
        args={[geometries.decals.slime, materials.decalSlime, HARD_ENEMY_CAP]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={runnerDecalRef}
        args={[geometries.decals.runner, materials.decalRunner, HARD_ENEMY_CAP]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bruteDecalRef}
        args={[geometries.decals.brute, materials.decalBrute, HARD_ENEMY_CAP]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={shooterDecalRef}
        args={[geometries.decals.shooter, materials.decalShooter, HARD_ENEMY_CAP]}
        frustumCulled={false}
      />

      {/* Lightweight Death Dissipation Ring InstancedMesh */}
      <instancedMesh
        ref={deathMeshRef}
        args={[geometries.deathRing, materials.deathRing, MAX_DEATH_RINGS]}
        frustumCulled={false}
      />
    </group>
  );
};
