import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime, EnemyEntity } from "../game/runtime";
import {
  ENEMY_CONFIGS,
  HARD_ENEMY_CAP,
  ARENA_BOUNDARY_LIMIT,
  GAME_CONFIG,
} from "../game/config";
import { getEnemyCap } from "../game/progression";
import { getSpawnInterval, getSpawnBatch } from "../game/spawnRules";
import { useGameStore } from "../store/gameStore";
import type { EnemyType } from "../types/game";

interface EnemyManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

// Temporary transformation matrices and vectors reused every frame
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempRotation = new THREE.Euler();
const tempScale = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

export const EnemyManager: React.FC<EnemyManagerProps> = ({ runtimeRef }) => {
  // InstancedMesh references for the 4 standard archetypes
  const slimeMeshRef = useRef<THREE.InstancedMesh>(null);
  const runnerMeshRef = useRef<THREE.InstancedMesh>(null);
  const bruteMeshRef = useRef<THREE.InstancedMesh>(null);
  const shooterMeshRef = useRef<THREE.InstancedMesh>(null);

  // Dedicated mesh ref for the unique Bonklord boss
  const bossGroupRef = useRef<THREE.Group>(null);

  // Shared reusable geometries and materials
  const geometries = useMemo(() => {
    return {
      slime: new THREE.SphereGeometry(ENEMY_CONFIGS.slime.radius, 12, 10),
      runner: new THREE.ConeGeometry(ENEMY_CONFIGS.runner.radius, ENEMY_CONFIGS.runner.height, 6),
      brute: new THREE.BoxGeometry(
        ENEMY_CONFIGS.brute.radius * 1.6,
        ENEMY_CONFIGS.brute.height,
        ENEMY_CONFIGS.brute.radius * 1.6
      ),
      shooter: new THREE.OctahedronGeometry(ENEMY_CONFIGS.shooter.radius),
    };
  }, []);

  const materials = useMemo(() => {
    return {
      slime: new THREE.MeshStandardMaterial({
        color: ENEMY_CONFIGS.slime.color,
        roughness: 0.3,
        metalness: 0.1,
      }),
      runner: new THREE.MeshStandardMaterial({
        color: ENEMY_CONFIGS.runner.color,
        roughness: 0.4,
        metalness: 0.3,
      }),
      brute: new THREE.MeshStandardMaterial({
        color: ENEMY_CONFIGS.brute.color,
        roughness: 0.6,
        metalness: 0.5,
      }),
      shooter: new THREE.MeshStandardMaterial({
        color: ENEMY_CONFIGS.shooter.color,
        emissive: "#0891b2",
        emissiveIntensity: 0.5,
        roughness: 0.2,
      }),
    };
  }, []);

  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    const level = useGameStore.getState().level;
    const enemyCap = getEnemyCap(level);
    const spawnIntervalSec = getSpawnInterval(level) / 1000;

    // Player contact damage cooldown
    if (runtime.playerInvulnerableTimer > 0) {
      runtime.playerInvulnerableTimer -= delta;
    }

    // =========================================================================
    // 1. Spawning System (with Bonklord slot reservation at level 10)
    // =========================================================================
    runtime.spawnTimer += delta;

    // Check if Bonklord boss is due to spawn
    const isBossDue = level >= GAME_CONFIG.bossLevel && !runtime.bossSpawned;
    const reservedSlots = isBossDue ? 1 : 0;
    const effectiveCap = Math.min(enemyCap, HARD_ENEMY_CAP) - reservedSlots;

    if (isBossDue && runtime.enemies.length <= effectiveCap) {
      // Spawn the Bonklord
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = ARENA_BOUNDARY_LIMIT - 1.0;
      const bossConfig = ENEMY_CONFIGS.bonklord;

      const bossEntity: EnemyEntity = {
        id: runtime.nextEntityId++,
        type: "bonklord",
        x: Math.cos(angle) * spawnDist,
        y: bossConfig.height / 2,
        z: Math.sin(angle) * spawnDist,
        vx: 0,
        vz: 0,
        health: bossConfig.health,
        maxHealth: bossConfig.health,
        speed: bossConfig.speed,
        damage: bossConfig.damage,
        radius: bossConfig.radius,
        color: bossConfig.color,
        scoreValue: bossConfig.scoreValue,
        xpValue: bossConfig.xpValue,
        stompCooldown: 4.0,
        hitFlashTimer: 0,
        scaleY: 1,
      };

      runtime.enemies.push(bossEntity);
      runtime.bossSpawned = true;
      useGameStore.getState().setBossActive(true);
      useGameStore.getState().updateBossHealth(bossConfig.health, bossConfig.health);
    }

    // Normal horde spawning
    if (runtime.spawnTimer >= spawnIntervalSec) {
      runtime.spawnTimer = 0;
      const availableSlots = Math.max(0, effectiveCap - runtime.enemies.length);

      if (availableSlots > 0) {
        const batchSize = Math.min(getSpawnBatch(level), availableSlots);

        for (let b = 0; b < batchSize; b++) {
          // Select archetype based on level progression
          let type: EnemyType;
          const roll = Math.random();

          if (level >= 7) {
            if (roll < 0.3) type = "slime";
            else if (roll < 0.6) type = "runner";
            else if (roll < 0.8) type = "shooter";
            else type = "brute";
          } else if (level >= 5) {
            if (roll < 0.4) type = "slime";
            else if (roll < 0.7) type = "runner";
            else type = "shooter";
          } else if (level >= 3) {
            type = roll < 0.6 ? "slime" : "runner";
          } else {
            type = "slime";
          }

          const config = ENEMY_CONFIGS[type];
          // Spawn around the arena perimeter
          const angle = Math.random() * Math.PI * 2;
          const spawnDist = ARENA_BOUNDARY_LIMIT - 0.5;

          const enemy: EnemyEntity = {
            id: runtime.nextEntityId++,
            type,
            x: Math.cos(angle) * spawnDist,
            y: config.height / 2,
            z: Math.sin(angle) * spawnDist,
            vx: 0,
            vz: 0,
            health: config.health + (level - 1) * 3, // gradual level scaling
            maxHealth: config.health + (level - 1) * 3,
            speed: config.speed,
            damage: config.damage,
            radius: config.radius,
            color: config.color,
            scoreValue: config.scoreValue,
            xpValue: config.xpValue,
            shootCooldown: type === "shooter" ? Math.random() * 2 + 1 : undefined,
            hitFlashTimer: 0,
            scaleY: 1,
          };

          runtime.enemies.push(enemy);
        }
      }
    }

    // =========================================================================
    // 2. AI Update & Movement Loop
    // =========================================================================
    const playerPos = runtime.playerPosition;
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
          x: enemy.x,
          y: 0.35,
          z: enemy.z,
          xpValue: enemy.xpValue,
          radius: 0.4,
        });

        // Award kill & score in Zustand store
        useGameStore.getState().addKill(enemy.scoreValue);

        if (enemy.type === "bonklord") {
          runtime.bossDefeated = true;
          useGameStore.getState().setBossActive(false);
          useGameStore.getState().setGameStatus("victory");
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
        }
      }
    }

    // =========================================================================
    // 3. Render Batching into InstancedMeshes
    // =========================================================================
    let slimeCount = 0;
    let runnerCount = 0;
    let bruteCount = 0;
    let shooterCount = 0;
    let bossEntity: EnemyEntity | null = null;

    for (let i = 0; i < runtime.enemies.length; i++) {
      const e = runtime.enemies[i];
      const meshRef =
        e.type === "slime"
          ? slimeMeshRef
          : e.type === "runner"
          ? runnerMeshRef
          : e.type === "brute"
          ? bruteMeshRef
          : e.type === "shooter"
          ? shooterMeshRef
          : null;

      if (e.type === "bonklord") {
        bossEntity = e;
        continue;
      }

      if (!meshRef || !meshRef.current) continue;

      let index = 0;
      if (e.type === "slime") index = slimeCount++;
      else if (e.type === "runner") index = runnerCount++;
      else if (e.type === "brute") index = bruteCount++;
      else if (e.type === "shooter") index = shooterCount++;

      if (index >= HARD_ENEMY_CAP) continue;

      tempPosition.set(e.x, e.y, e.z);

      // Rotate towards player
      const angle = Math.atan2(playerPos.x - e.x, playerPos.z - e.z);
      tempRotation.set(0, angle, 0);
      tempQuaternion.setFromEuler(tempRotation);

      // Hit flash squash effect
      const flashScale = e.hitFlashTimer > 0 ? 1.25 : 1.0;
      tempScale.set(flashScale, flashScale, flashScale);

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      meshRef.current.setMatrixAt(index, tempMatrix);
    }

    // Hide remaining unused instance slots
    if (slimeMeshRef.current) {
      for (let i = slimeCount; i < HARD_ENEMY_CAP; i++) {
        slimeMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      slimeMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (runnerMeshRef.current) {
      for (let i = runnerCount; i < HARD_ENEMY_CAP; i++) {
        runnerMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      runnerMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (bruteMeshRef.current) {
      for (let i = bruteCount; i < HARD_ENEMY_CAP; i++) {
        bruteMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      bruteMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (shooterMeshRef.current) {
      for (let i = shooterCount; i < HARD_ENEMY_CAP; i++) {
        shooterMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      shooterMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update Boss visual representation
    if (bossGroupRef.current) {
      if (bossEntity) {
        bossGroupRef.current.visible = true;
        bossGroupRef.current.position.set(bossEntity.x, 0, bossEntity.z);
        const bossAngle = Math.atan2(playerPos.x - bossEntity.x, playerPos.z - bossEntity.z);
        bossGroupRef.current.rotation.y = bossAngle;
      } else {
        bossGroupRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {/* 4 Archetype Instanced Meshes */}
      <instancedMesh
        ref={slimeMeshRef}
        args={[geometries.slime, materials.slime, HARD_ENEMY_CAP]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={runnerMeshRef}
        args={[geometries.runner, materials.runner, HARD_ENEMY_CAP]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={bruteMeshRef}
        args={[geometries.brute, materials.brute, HARD_ENEMY_CAP]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={shooterMeshRef}
        args={[geometries.shooter, materials.shooter, HARD_ENEMY_CAP]}
        castShadow
        receiveShadow
      />

      {/* Procedural 3D Boss Bonklord */}
      <group ref={bossGroupRef} visible={false}>
        {/* Massive Body Capsule */}
        <mesh castShadow position={[0, 1.6, 0]}>
          <capsuleGeometry args={[1.2, 1.2, 8, 16]} />
          <meshStandardMaterial color="#991b1b" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Glowing Lava Core */}
        <mesh position={[0, 1.7, 0.9]}>
          <boxGeometry args={[0.8, 0.5, 0.4]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.8} />
        </mesh>

        {/* Left Horn / Spikes */}
        <mesh position={[-0.9, 2.5, 0]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.3, 1.2, 6]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} />
        </mesh>

        {/* Right Horn */}
        <mesh position={[0.9, 2.5, 0]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.3, 1.2, 6]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} />
        </mesh>

        {/* Massive Boss Hammer Weapon */}
        <group position={[1.6, 1.2, 0.5]} rotation={[0.4, 0, -0.3]}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 2.5, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[1.0, 0.8, 0.8]} />
            <meshStandardMaterial color="#e11d48" emissive="#991b1b" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
