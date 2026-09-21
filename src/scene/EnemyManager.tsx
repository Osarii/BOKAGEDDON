import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GameRuntime, EnemyEntity } from "../game/runtime";
import {
  ENEMY_CONFIGS,
  HARD_ENEMY_CAP,
  ARENA_BOUNDARY_LIMIT,
  GAME_CONFIG,
  RECOVERY_CONFIG,
} from "../game/config";
import {
  getRoundEnemyCap,
  getRoundEnemyQuota,
  isBossRound,
  getBossTier,
  getBossStats,
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
import type { EnemyType, PickupType } from "../types/game";

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

// Base and flash colors for InstancedMesh.setColorAt
const flashColor = new THREE.Color("#ffffff");
const baseColors: Record<EnemyType, THREE.Color> = {
  slime: new THREE.Color("#c084fc"),
  runner: new THREE.Color("#ff6b35"),
  brute: new THREE.Color("#ef4444"),
  shooter: new THREE.Color("#22d3ee"),
  bonklord: new THREE.Color("#e11d48"),
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

  // Dedicated mesh ref for the unique Bonklord boss
  const bossGroupRef = useRef<THREE.Group>(null);
  const bossAuraRef = useRef<THREE.Mesh>(null);

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
          const bossConfig = ENEMY_CONFIGS.bonklord;
          const bossTier = getBossTier(round);
          const bossStats = getBossStats(bossTier);

          const bossEntity: EnemyEntity = {
            id: runtime.nextEntityId++,
            type: "bonklord",
            x: Math.cos(angle) * spawnDist,
            y: bossConfig.height / 2,
            z: Math.sin(angle) * spawnDist,
            vx: 0,
            vz: 0,
            health: bossStats.health,
            maxHealth: bossStats.health,
            speed: bossStats.speed,
            damage: bossStats.damage,
            radius: bossConfig.radius,
            color: bossConfig.color,
            scoreValue: bossConfig.scoreValue * bossTier,
            xpValue: bossConfig.xpValue * bossTier,
            stompCooldown: 3.5,
            hitFlashTimer: 0,
            scaleY: 1,
          };

          runtime.enemies.push(bossEntity);
          runtime.bossSpawned = true;
          runtime.roundSpawnedCount = 1;
          useGameStore.getState().setBossActive(true);
          useGameStore.getState().updateBossHealth(bossStats.health, bossStats.health);
          gameAudio.play("bossSpawn");
        }
      } else {
        // Normal Round Spawning with finite quota
        const remainingQuota = Math.max(0, runtime.roundQuota - runtime.roundSpawnedCount);

        if (remainingQuota > 0) {
          runtime.spawnTimer += delta;
          const spawnIntervalSec = getSpawnInterval(round) / 1000;

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

    for (let i = runtime.enemies.length - 1; i >= 0; i--) {
      const enemy = runtime.enemies[i];

      // Decrease hit flash
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= delta;
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

        // Award kill & score in Zustand store
        useGameStore.getState().addKill(enemy.scoreValue);

        if (enemy.type === "bonklord") {
          runtime.bossDefeated = true;
          useGameStore.getState().setBossActive(false);
          gameAudio.play("bossDeath");

          // Boss recovery rewards:
          // Guaranteed useful major recovery pickup + optional weighted secondary drop
          const currentHp = useGameStore.getState().health;
          const currentMaxHp = useGameStore.getState().maxHealth;
          const guaranteedType: PickupType = currentHp < currentMaxHp ? "medkit_case" : "shield_battery";
          const guaranteedVal = guaranteedType === "medkit_case" ? 70 : 50;

          runtime.pickups.push({
            id: runtime.nextEntityId++,
            type: guaranteedType,
            x: enemy.x - 0.5,
            y: 0.35,
            z: enemy.z,
            value: guaranteedVal,
            radius: 0.6,
          });

          // Optional additional weighted recovery drop (75% chance)
          if (Math.random() < 0.75) {
            const secondType: PickupType = Math.random() < 0.5 ? "shield_potion" : "medkit_emergency";
            const secondVal = secondType === "shield_potion" ? 25 : 35;
            runtime.pickups.push({
              id: runtime.nextEntityId++,
              type: secondType,
              x: enemy.x + 0.5,
              y: 0.35,
              z: enemy.z,
              value: secondVal,
              radius: 0.5,
            });
          }

          // Boss round complete! Enter intermission to advance to next round (e.g. 10 -> 11)
          runtime.intermissionTimer = 0;
          useGameStore.getState().setRoundStatus("intermission");
        } else {
          gameAudio.play("enemyDeath");

          // Normal enemy recovery item drop (bounded by maxActivePickups)
          const activeRecoveryCount = runtime.pickups.filter((p) => p.type !== "xp").length;
          if (
            activeRecoveryCount < RECOVERY_CONFIG.maxActivePickups &&
            Math.random() < RECOVERY_CONFIG.normalEnemyDropChance
          ) {
            const roll = Math.random();
            let dropType: PickupType;
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
          enemy.x += (dx / distToPlayer) * enemy.speed * delta;
          enemy.z += (dz / distToPlayer) * enemy.speed * delta;
        } else if (distToPlayer < 6.0) {
          // Back away
          enemy.x -= (dx / distToPlayer) * enemy.speed * 0.7 * delta;
          enemy.z -= (dz / distToPlayer) * enemy.speed * 0.7 * delta;
        }

        // Shoot projectile
        if (enemy.shootCooldown !== undefined) {
          enemy.shootCooldown -= delta;
          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = 2.4;
            const projSpeed = 7.0;
            runtime.projectiles.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              y: 0.8,
              z: enemy.z,
              vx: (dx / distToPlayer) * projSpeed,
              vz: (dz / distToPlayer) * projSpeed,
              damage: enemy.damage,
              radius: 0.28,
              color: "#22d3ee",
              lifetime: 0,
              maxLifetime: 3.5,
              isEnemy: true,
              pierce: 1,
            });
          }
        }
      } else if (enemy.type === "bonklord") {
        // Boss moves steadily toward player
        if (distToPlayer > 0.1) {
          enemy.x += (dx / distToPlayer) * enemy.speed * delta;
          enemy.z += (dz / distToPlayer) * enemy.speed * delta;
        }

        // Boss Stomp AOE every 4 seconds
        if (enemy.stompCooldown !== undefined) {
          enemy.stompCooldown -= delta;
          if (enemy.stompCooldown <= 0) {
            enemy.stompCooldown = 4.2;
            // Spawn shockwave ring
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: enemy.x,
              z: enemy.z,
              radius: 0.5,
              maxRadius: 8.0,
              color: "#e11d48",
              lifetime: 0,
              maxLifetime: 1.2,
            });
            // If player inside stomp initial burst, knockback & damage
            if (distToPlayer < 4.0 && runtime.playerInvulnerableTimer <= 0) {
              useGameStore.getState().takeDamage(15);
              runtime.playerInvulnerableTimer = GAME_CONFIG.playerInvulnerableDuration;
              gameAudio.play("playerDamage");
            }
          }
        }

        // Keep boss health synced with HUD
        useGameStore.getState().updateBossHealth(enemy.health, enemy.maxHealth);
      } else {
        // Standard chase
        if (distToPlayer > 0.1) {
          enemy.x += (dx / distToPlayer) * enemy.speed * delta;
          enemy.z += (dz / distToPlayer) * enemy.speed * delta;
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
          useGameStore.getState().takeDamage(enemy.damage);
          runtime.playerInvulnerableTimer = GAME_CONFIG.playerInvulnerableDuration;
          gameAudio.play("playerDamage");
        }
      }
    }

    // =========================================================================
    // 3. Render Batching into InstancedMeshes (Body + Decals + Hit Flash)
    // =========================================================================
    let slimeCount = 0;
    let runnerCount = 0;
    let bruteCount = 0;
    let shooterCount = 0;
    let bossEntity: EnemyEntity | null = null;

    for (let i = 0; i < runtime.enemies.length; i++) {
      const e = runtime.enemies[i];
      if (e.type === "bonklord") {
        bossEntity = e;
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
          (1 - 0.1 * bounce) * flashScale,
          (1 + 0.16 * bounce) * flashScale,
          (1 - 0.1 * bounce) * flashScale
        );
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Decal on front surface of slime
        decalPosition.set(e.x + sinA * 0.58, 0.5 + bounce * 0.05, e.z + cosA * 0.58);
        decalMatrix.compose(decalPosition, tempQuaternion, tempScale);
      } else if (e.type === "runner") {
        // High-speed jet banking tilt
        const bank = Math.sin(time * 12 + e.id) * 0.15;
        tempPosition.set(e.x, 0.15, e.z);
        tempRotation.set(0, angle, bank);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(flashScale, flashScale, flashScale);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

        // Decal on dorsal surface of runner drone tilted toward overhead camera
        decalRotation.set(-0.35, angle, bank);
        decalQuaternion.setFromEuler(decalRotation);
        decalPosition.set(e.x + sinA * 0.15, 0.62, e.z + cosA * 0.15);
        decalMatrix.compose(decalPosition, decalQuaternion, tempScale);
      } else if (e.type === "brute") {
        // Heavy lumbering stomp sway
        const sway = Math.sin(time * 5 + e.id) * 0.08;
        tempPosition.set(e.x, 0.05, e.z);
        tempRotation.set(0, angle, sway);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(flashScale, flashScale, flashScale);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

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

      // Per-instance Hit Flash Color
      const activeColor = isFlashing ? flashColor : baseColors[e.type];
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

    // =========================================================================
    // 5. Update Bonklord Boss 3D Group
    // =========================================================================
    if (bossGroupRef.current) {
      if (bossEntity) {
        bossGroupRef.current.visible = true;
        bossGroupRef.current.position.set(bossEntity.x, 0, bossEntity.z);
        const bossAngle = Math.atan2(playerPos.x - bossEntity.x, playerPos.z - bossEntity.z);
        bossGroupRef.current.rotation.y = bossAngle;

        // Animate fiery ground aura
        if (bossAuraRef.current) {
          bossAuraRef.current.rotation.z += delta * 1.5;
          const pulse = 1.0 + Math.sin(time * 6) * 0.12;
          bossAuraRef.current.scale.set(pulse, pulse, pulse);
        }
      } else {
        bossGroupRef.current.visible = false;
      }
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

      {/* ===================================================================== */}
      {/* THE BONKLORD — Level 10 Royal Titan Boss */}
      {/* ===================================================================== */}
      <group ref={bossGroupRef} visible={false}>
        {/* Pulsating Fiery Boss Ground Aura */}
        <mesh ref={bossAuraRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[2.0, 2.45, 48]} />
          <meshBasicMaterial color="#e11d48" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[1.5, 1.75, 36]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>

        {/* Massive Obsidian Body Armor */}
        <mesh castShadow position={[0, 1.8, 0]}>
          <capsuleGeometry args={[1.3, 1.5, 8, 16]} />
          <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Heavy Golden Shoulder Pauldrons */}
        <mesh castShadow position={[-1.5, 2.4, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.8, 0.6, 1.1]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
        </mesh>
        <mesh castShadow position={[1.5, 2.4, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.8, 0.6, 1.1]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
        </mesh>

        {/* 5-Spire Royal Golden Crown */}
        <group position={[0, 3.6, 0]}>
          {/* Central Tall Spire */}
          <mesh position={[0, 0.4, 0]}>
            <coneGeometry args={[0.3, 0.9, 6]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
          </mesh>
          {/* 4 Perimeter Spires */}
          <mesh position={[-0.45, 0.25, 0]}>
            <coneGeometry args={[0.2, 0.6, 5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
          </mesh>
          <mesh position={[0.45, 0.25, 0]}>
            <coneGeometry args={[0.2, 0.6, 5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
          </mesh>
          <mesh position={[0, 0.25, -0.45]}>
            <coneGeometry args={[0.2, 0.6, 5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
          </mesh>
          <mesh position={[0, 0.25, 0.45]}>
            <coneGeometry args={[0.2, 0.6, 5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
          </mesh>
        </group>

        {/* Glowing Lava Skull Face & Official SVG Emblem */}
        <mesh position={[0, 2.2, 1.1]}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial
            map={enemyTextures.bonklord}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Menacing Horns */}
        <mesh position={[-0.95, 3.1, 0.2]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.3, 1.3, 6]} />
          <meshStandardMaterial color="#1f2937" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0.95, 3.1, 0.2]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.3, 1.3, 6]} />
          <meshStandardMaterial color="#1f2937" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* Massive Legendary Bonk Warhammer */}
        <group position={[1.9, 1.6, 0.5]} rotation={[0.4, 0, -0.2]}>
          {/* Titanium Shaft */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 3.2, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          {/* Double Hammer Head */}
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[1.3, 1.1, 1.1]} />
            <meshStandardMaterial
              color="#e11d48"
              emissive="#be123c"
              emissiveIntensity={0.6}
              metalness={0.6}
              roughness={0.3}
            />
          </mesh>
          {/* Front Hammer Spike */}
          <mesh position={[0, 1.4, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.25, 0.6, 6]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
