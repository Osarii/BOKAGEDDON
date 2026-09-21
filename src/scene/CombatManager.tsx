import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";
import { WEAPON_CONFIGS } from "../game/config";
import { useGameStore } from "../store/gameStore";
import type { WeaponType } from "../types/game";

interface CombatManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const MAX_PROJECTILES = 120;
const MAX_SHOCKWAVES = 24;
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempRotation = new THREE.Euler();
const tempQuaternion = new THREE.Quaternion();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

export const CombatManager: React.FC<CombatManagerProps> = ({ runtimeRef }) => {
  const projectileMeshRef = useRef<THREE.InstancedMesh>(null);
  const shockwaveMeshRef = useRef<THREE.InstancedMesh>(null);
  const axesGroupRef = useRef<THREE.Group>(null);

  // Instanced projectile geometry and material
  const projGeometry = useMemo(() => new THREE.SphereGeometry(0.24, 8, 8), []);
  const projMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#23d5ff",
        emissive: "#23d5ff",
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    []
  );

  // Instanced shockwave geometry and material
  const shockGeometry = useMemo(() => new THREE.RingGeometry(0.85, 1.0, 32), []);
  const shockMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffb020",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    const selectedCharacterId = useGameStore.getState().selectedCharacterId || "bonk";
    const upgrades = useGameStore.getState().upgrades;

    // Determine weapon type based on character
    const weaponType: WeaponType =
      selectedCharacterId === "byte"
        ? "energy-orb"
        : selectedCharacterId === "tank"
        ? "axe"
        : "hammer";

    const weaponConfig = WEAPON_CONFIGS[weaponType];

    // Compute active upgrade bonuses
    const damageMultiplier = 1 + (upgrades.damage || 0) * 0.2;
    const hasteMultiplier = 1 + (upgrades.haste || 0) * 0.15;
    const effectiveCooldown = weaponConfig.baseCooldown / hasteMultiplier;
    const critChance = (upgrades.critical || 0) * 0.2;
    const multishotCount = 1 + (upgrades.multishot || 0);

    const playerPos = runtime.playerPosition;

    // =========================================================================
    // 1. Automatic Weapon Attacks
    // =========================================================================
    runtime.lastAttackTimer += delta;

    if (runtime.lastAttackTimer >= effectiveCooldown) {
      // Check nearest enemy within weapon range
      let nearestDistSq = Infinity;
      let targetX = 0;
      let targetZ = 0;
      let hasTarget = false;

      const rangeSq = weaponConfig.range * weaponConfig.range;

      for (let i = 0; i < runtime.enemies.length; i++) {
        const e = runtime.enemies[i];
        const distSq = (e.x - playerPos.x) ** 2 + (e.z - playerPos.z) ** 2;
        if (distSq <= rangeSq && distSq < nearestDistSq) {
          nearestDistSq = distSq;
          targetX = e.x;
          targetZ = e.z;
          hasTarget = true;
        }
      }

      if (hasTarget || weaponType === "axe") {
        runtime.lastAttackTimer = 0;

        const isCrit = Math.random() < critChance;
        const totalDamage = Math.round(weaponConfig.baseDamage * damageMultiplier * (isCrit ? 2 : 1));

        // ---------------------------------------------------------------------
        // BONK: Mega Hammer Ground Slam / Shockwave
        // ---------------------------------------------------------------------
        if (weaponType === "hammer") {
          // Trigger shockwave effect
          for (let s = 0; s < multishotCount; s++) {
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: playerPos.x,
              z: playerPos.z,
              radius: 0.5 + s * 0.6,
              maxRadius: weaponConfig.areaRadius + s * 0.8,
              color: isCrit ? "#ff3b5c" : "#ffb020",
              lifetime: 0,
              maxLifetime: 0.6 + s * 0.1,
            });
          }

          // Damage all enemies inside hammer slam radius
          const hitRadius = weaponConfig.areaRadius + (multishotCount - 1) * 0.5;
          const hitRadiusSq = hitRadius * hitRadius;

          for (let i = 0; i < runtime.enemies.length; i++) {
            const e = runtime.enemies[i];
            const distSq = (e.x - playerPos.x) ** 2 + (e.z - playerPos.z) ** 2;
            if (distSq <= hitRadiusSq) {
              e.health -= totalDamage;
              e.hitFlashTimer = 0.15;
              // Apply knockback
              const dist = Math.sqrt(distSq) || 1;
              e.x += ((e.x - playerPos.x) / dist) * 1.5;
              e.z += ((e.z - playerPos.z) / dist) * 1.5;
            }
          }
        }

        // ---------------------------------------------------------------------
        // BYTE: High-Speed Energy Orb Projectiles
        // ---------------------------------------------------------------------
        else if (weaponType === "energy-orb") {
          const baseDx = targetX - playerPos.x;
          const baseDz = targetZ - playerPos.z;
          const baseAngle = Math.atan2(baseDz, baseDx);
          const projSpeed = 16.0;

          // Fan spread for multishot
          const spreadArc = 0.22;
          const startAngle = baseAngle - ((multishotCount - 1) * spreadArc) / 2;

          for (let m = 0; m < multishotCount; m++) {
            const angle = startAngle + m * spreadArc;
            runtime.projectiles.push({
              id: runtime.nextEntityId++,
              x: playerPos.x,
              y: 0.8,
              z: playerPos.z,
              vx: Math.cos(angle) * projSpeed,
              vz: Math.sin(angle) * projSpeed,
              damage: totalDamage,
              radius: 0.3,
              color: isCrit ? "#a8ff60" : "#23d5ff",
              lifetime: 0,
              maxLifetime: 2.2,
              isEnemy: false,
              pierce: 1 + Math.floor((upgrades.multishot || 0) / 2),
            });
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // TANK: Orbital Cleaving Axe Rotation & Continuous Damage
    // -------------------------------------------------------------------------
    if (weaponType === "axe") {
      const rotSpeed = 3.5 * hasteMultiplier;
      runtime.axeAngle += rotSpeed * delta;

      const axeRadius = weaponConfig.range;
      const totalDamage = Math.round(weaponConfig.baseDamage * damageMultiplier);

      // Hit enemies that collide with any orbital axe
      for (let m = 0; m < multishotCount; m++) {
        const offsetAngle = runtime.axeAngle + (m * Math.PI * 2) / multishotCount;
        const axeX = playerPos.x + Math.cos(offsetAngle) * axeRadius;
        const axeZ = playerPos.z + Math.sin(offsetAngle) * axeRadius;

        for (let i = 0; i < runtime.enemies.length; i++) {
          const e = runtime.enemies[i];
          const distSq = (e.x - axeX) ** 2 + (e.z - axeZ) ** 2;
          if (distSq < (0.6 + e.radius) ** 2) {
            // Apply slight tick damage per hit
            e.health -= Math.max(1, Math.round(totalDamage * 0.2));
            e.hitFlashTimer = 0.08;
          }
        }
      }

      // Update axes visual group
      if (axesGroupRef.current) {
        axesGroupRef.current.position.set(playerPos.x, 0.8, playerPos.z);
        axesGroupRef.current.rotation.y = -runtime.axeAngle;
      }
    }

    // =========================================================================
    // 2. Projectile Simulation & Collisions
    // =========================================================================
    for (let p = runtime.projectiles.length - 1; p >= 0; p--) {
      const proj = runtime.projectiles[p];
      proj.x += proj.vx * delta;
      proj.z += proj.vz * delta;
      proj.lifetime += delta;

      // Expired lifetime
      if (proj.lifetime >= proj.maxLifetime || proj.pierce <= 0) {
        runtime.projectiles.splice(p, 1);
        continue;
      }

      // Enemy projectile -> check hit against player
      if (proj.isEnemy) {
        const distToPlayer = Math.hypot(proj.x - playerPos.x, proj.z - playerPos.z);
        if (distToPlayer < proj.radius + 0.45) {
          if (runtime.playerInvulnerableTimer <= 0) {
            useGameStore.getState().takeDamage(proj.damage);
            runtime.playerInvulnerableTimer = 0.6;
          }
          runtime.projectiles.splice(p, 1);
          continue;
        }
      }
      // Player projectile -> check hit against enemies
      else {
        for (let e = 0; e < runtime.enemies.length; e++) {
          const enemy = runtime.enemies[e];
          const distSq = (enemy.x - proj.x) ** 2 + (enemy.z - proj.z) ** 2;
          if (distSq < (proj.radius + enemy.radius) ** 2) {
            enemy.health -= proj.damage;
            enemy.hitFlashTimer = 0.15;
            proj.pierce -= 1;
            if (proj.pierce <= 0) break;
          }
        }
      }
    }

    // =========================================================================
    // 3. Shockwaves Simulation & Instanced Rendering
    // =========================================================================
    for (let s = runtime.shockwaves.length - 1; s >= 0; s--) {
      const sw = runtime.shockwaves[s];
      sw.lifetime += delta;
      const progress = sw.lifetime / sw.maxLifetime;
      sw.radius = THREE.MathUtils.lerp(sw.radius, sw.maxRadius, 8 * delta);

      if (progress >= 1.0) {
        runtime.shockwaves.splice(s, 1);
      }
    }

    if (shockwaveMeshRef.current) {
      const count = Math.min(runtime.shockwaves.length, MAX_SHOCKWAVES);
      for (let i = 0; i < count; i++) {
        const sw = runtime.shockwaves[i];
        tempPosition.set(sw.x, 0.04, sw.z);
        tempRotation.set(-Math.PI / 2, 0, 0);
        tempQuaternion.setFromEuler(tempRotation);
        const scale = Math.max(0.1, sw.radius);
        tempScale.set(scale, scale, 1);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        shockwaveMeshRef.current.setMatrixAt(i, tempMatrix);
      }

      for (let i = count; i < MAX_SHOCKWAVES; i++) {
        shockwaveMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      shockwaveMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // =========================================================================
    // 4. Instanced Projectiles Rendering
    // =========================================================================
    if (projectileMeshRef.current) {
      const count = Math.min(runtime.projectiles.length, MAX_PROJECTILES);
      for (let i = 0; i < count; i++) {
        const proj = runtime.projectiles[i];
        tempPosition.set(proj.x, proj.y, proj.z);
        const scale = proj.radius * 2;
        tempScale.set(scale, scale, scale);
        tempMatrix.makeTranslation(proj.x, proj.y, proj.z);
        tempMatrix.scale(tempScale);
        projectileMeshRef.current.setMatrixAt(i, tempMatrix);
      }

      for (let i = count; i < MAX_PROJECTILES; i++) {
        projectileMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      projectileMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const multishotTier = useGameStore((s) => s.upgrades.multishot || 0);
  const axeCount = 1 + multishotTier;

  return (
    <group>
      {/* Projectiles Instanced Mesh */}
      <instancedMesh
        ref={projectileMeshRef}
        args={[projGeometry, projMaterial, MAX_PROJECTILES]}
      />

      {/* Shockwaves Instanced Mesh */}
      <instancedMesh
        ref={shockwaveMeshRef}
        args={[shockGeometry, shockMaterial, MAX_SHOCKWAVES]}
      />

      {/* Visual Orbital Axes for TANK */}
      {selectedCharacterId === "tank" && (
        <group ref={axesGroupRef}>
          {Array.from({ length: axeCount }).map((_, idx) => {
            const angle = (idx * Math.PI * 2) / axeCount;
            const radius = 4.0;
            return (
              <group
                key={idx}
                position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                rotation={[0, -angle, 1.2]}
              >
                {/* Axe Handle */}
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
                {/* Axe Blade */}
                <mesh position={[0, 0.45, 0]}>
                  <boxGeometry args={[0.45, 0.35, 0.08]} />
                  <meshStandardMaterial
                    color="#ff3b5c"
                    emissive="#ff3b5c"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};
