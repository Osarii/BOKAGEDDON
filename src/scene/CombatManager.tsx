import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";
import { WEAPON_CONFIGS } from "../game/config";
import { useGameStore } from "../store/gameStore";
import { gameAudio } from "../audio/gameAudio";
import { hasSynergy } from "../game/weaponSynergies";
import type { WeaponType, CharacterId } from "../types/game";

interface CombatManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const MAX_PROJECTILES = 60;
const MAX_SHOCKWAVES = 16;
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempRotation = new THREE.Euler();
const tempQuaternion = new THREE.Quaternion();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

// Pre-defined palette colors for instanced rendering
const defaultProjColor = new THREE.Color("#23d5ff");
const critProjColor = new THREE.Color("#a8ff60");
const enemyProjColor = new THREE.Color("#06b6d4");
const prismProjColor = new THREE.Color("#f43f5e");
const hexProjColor = new THREE.Color("#22c55e");

const defaultShockColor = new THREE.Color("#ffb020");
const critShockColor = new THREE.Color("#ff3b5c");
const bossShockColor = new THREE.Color("#e11d48");
const novaShockColor = new THREE.Color("#d946ef");
const supernovaShockColor = new THREE.Color("#f43f5e");

export const CombatManager: React.FC<CombatManagerProps> = ({ runtimeRef }) => {
  const projectileMeshRef = useRef<THREE.InstancedMesh>(null);
  const shockwaveMeshRef = useRef<THREE.InstancedMesh>(null);
  const axesGroupRef = useRef<THREE.Group>(null);

  // Instanced projectile geometry and material with computed bounds
  const projGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.26, 12, 10);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    geo.computeVertexNormals();
    return geo;
  }, []);

  const projMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#23d5ff",
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
    []
  );

  // Instanced shockwave geometry and material with computed bounds
  const shockGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(0.85, 1.0, 32);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }, []);

  const shockMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      }),
    []
  );

  // Initialize instance counts to 0 and pre-populate hiddenMatrix once at mount
  useEffect(() => {
    if (projectileMeshRef.current) {
      projectileMeshRef.current.count = 0;
      const colors = new Float32Array(MAX_PROJECTILES * 3);
      for (let i = 0; i < MAX_PROJECTILES; i++) {
        projectileMeshRef.current.setMatrixAt(i, hiddenMatrix);
        colors[i * 3] = defaultProjColor.r;
        colors[i * 3 + 1] = defaultProjColor.g;
        colors[i * 3 + 2] = defaultProjColor.b;
      }
      projectileMeshRef.current.instanceMatrix.needsUpdate = true;
      projectileMeshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      projectileMeshRef.current.instanceColor.needsUpdate = true;
    }

    if (shockwaveMeshRef.current) {
      shockwaveMeshRef.current.count = 0;
      const colors = new Float32Array(MAX_SHOCKWAVES * 3);
      for (let i = 0; i < MAX_SHOCKWAVES; i++) {
        shockwaveMeshRef.current.setMatrixAt(i, hiddenMatrix);
        colors[i * 3] = defaultShockColor.r;
        colors[i * 3 + 1] = defaultShockColor.g;
        colors[i * 3 + 2] = defaultShockColor.b;
      }
      shockwaveMeshRef.current.instanceMatrix.needsUpdate = true;
      shockwaveMeshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
      shockwaveMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    const selectedCharacterId = (useGameStore.getState().selectedCharacterId || "bonk") as CharacterId;
    const upgrades = useGameStore.getState().upgrades;

    // Determine weapon type based on character
    const weaponType: WeaponType =
      selectedCharacterId === "byte"
        ? "energy-orb"
        : selectedCharacterId === "tank"
        ? "axe"
        : selectedCharacterId === "nova"
        ? "nova-burst"
        : selectedCharacterId === "hex"
        ? "hex-chain"
        : "hammer";

    const weaponConfig = WEAPON_CONFIGS[weaponType];

    // Compute active upgrade bonuses
    const damageMultiplier = 1 + (upgrades.damage || 0) * 0.2;
    const hasteMultiplier = 1 + (upgrades.haste || 0) * 0.15;
    const effectiveCooldown = weaponConfig.baseCooldown / hasteMultiplier;
    const critChance = (upgrades.critical || 0) * 0.2;
    const multishotCount = 1 + (upgrades.multishot || 0);

    // Active weapon synergies
    const hasMeteorSlam = hasSynergy("meteor-slam", selectedCharacterId, upgrades);
    const hasPrismBarrage = hasSynergy("prism-barrage", selectedCharacterId, upgrades);
    const hasCycloneEdge = hasSynergy("cyclone-edge", selectedCharacterId, upgrades);
    const hasSupernova = hasSynergy("supernova", selectedCharacterId, upgrades);
    const hasHexstorm = hasSynergy("hexstorm", selectedCharacterId, upgrades);

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

      if (hasTarget || weaponType === "axe" || weaponType === "nova-burst") {
        runtime.lastAttackTimer = 0;
        const sfx =
          weaponType === "hammer"
            ? "hammer"
            : weaponType === "axe"
            ? "axe"
            : "energyOrb";
        gameAudio.play(sfx);

        const isCrit = Math.random() < critChance;
        const totalDamage = Math.round(weaponConfig.baseDamage * damageMultiplier * (isCrit ? 2 : 1));

        // ---------------------------------------------------------------------
        // BONK: Mega Hammer Ground Slam / Shockwave + METEOR SLAM synergy
        // ---------------------------------------------------------------------
        if (weaponType === "hammer") {
          for (let s = 0; s < multishotCount; s++) {
            if (runtime.shockwaves.length < MAX_SHOCKWAVES) {
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
          }

          // METEOR SLAM: Critical hammer attacks spawn a secondary smaller shockwave
          if (isCrit && hasMeteorSlam && runtime.shockwaves.length < MAX_SHOCKWAVES) {
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: playerPos.x + (targetX - playerPos.x) * 0.5,
              z: playerPos.z + (targetZ - playerPos.z) * 0.5,
              radius: 0.3,
              maxRadius: 2.8,
              color: "#f43f5e",
              lifetime: 0,
              maxLifetime: 0.45,
            });
          }

          // Damage enemies inside hammer slam radius
          const hitRadius = weaponConfig.areaRadius + (multishotCount - 1) * 0.5;
          const hitRadiusSq = hitRadius * hitRadius;

          for (let i = 0; i < runtime.enemies.length; i++) {
            const e = runtime.enemies[i];
            const distSq = (e.x - playerPos.x) ** 2 + (e.z - playerPos.z) ** 2;
            if (distSq <= hitRadiusSq) {
              const bonusCritDamage = isCrit && hasMeteorSlam ? Math.round(totalDamage * 0.35) : 0;
              e.health -= totalDamage + bonusCritDamage;
              e.hitFlashTimer = 0.15;
              gameAudio.play("enemyHit");
              const dist = Math.sqrt(distSq) || 1;
              e.x += ((e.x - playerPos.x) / dist) * 1.5;
              e.z += ((e.z - playerPos.z) / dist) * 1.5;
            }
          }
        }

        // ---------------------------------------------------------------------
        // BYTE: Energy Orbs + PRISM BARRAGE synergy
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
            if (runtime.projectiles.length >= MAX_PROJECTILES) break;
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

          // PRISM BARRAGE: Additional central piercing prism orb
          if (hasPrismBarrage && runtime.projectiles.length < MAX_PROJECTILES) {
            runtime.projectiles.push({
              id: runtime.nextEntityId++,
              x: playerPos.x,
              y: 0.8,
              z: playerPos.z,
              vx: Math.cos(baseAngle) * (projSpeed * 1.2),
              vz: Math.sin(baseAngle) * (projSpeed * 1.2),
              damage: Math.round(totalDamage * 1.6),
              radius: 0.45,
              color: "#f43f5e",
              lifetime: 0,
              maxLifetime: 2.5,
              isEnemy: false,
              pierce: 3 + multishotCount,
              isPrism: true,
            });
          }
        }

        // ---------------------------------------------------------------------
        // NOVA: Radial Magical Burst + SUPERNOVA synergy
        // ---------------------------------------------------------------------
        else if (weaponType === "nova-burst") {
          const burstRadius = weaponConfig.areaRadius + (multishotCount - 1) * 0.4;
          const burstRadiusSq = burstRadius * burstRadius;

          // Immediate primary radial shockwave
          if (runtime.shockwaves.length < MAX_SHOCKWAVES) {
            runtime.shockwaves.push({
              id: runtime.nextEntityId++,
              x: playerPos.x,
              z: playerPos.z,
              radius: 0.6,
              maxRadius: burstRadius,
              color: "#d946ef",
              lifetime: 0,
              maxLifetime: 0.48,
            });
          }

          // Damage all enemies in radial burst
          for (let i = 0; i < runtime.enemies.length; i++) {
            const e = runtime.enemies[i];
            const distSq = (e.x - playerPos.x) ** 2 + (e.z - playerPos.z) ** 2;
            if (distSq <= burstRadiusSq) {
              e.health -= totalDamage;
              e.hitFlashTimer = 0.15;
              gameAudio.play("enemyHit");
              const dist = Math.sqrt(distSq) || 1;
              e.x += ((e.x - playerPos.x) / dist) * 1.2;
              e.z += ((e.z - playerPos.z) / dist) * 1.2;
            }
          }

          // SUPERNOVA: Radial attack gains a second delayed outer burst
          if (hasSupernova) {
            runtime.delayedBursts.push({
              id: runtime.nextEntityId++,
              x: playerPos.x,
              z: playerPos.z,
              delayTimer: 0.28,
              damage: Math.round(totalDamage * 0.85),
              radius: 7.5,
              color: "#f43f5e",
            });
          }
        }

        // ---------------------------------------------------------------------
        // HEX: Seeking Void Projectile + HEXSTORM chain synergy
        // ---------------------------------------------------------------------
        else if (weaponType === "hex-chain") {
          const baseDx = targetX - playerPos.x;
          const baseDz = targetZ - playerPos.z;
          const baseDist = Math.hypot(baseDx, baseDz) || 1;
          const projSpeed = 15.0;

          // HEXSTORM: can jump to an additional enemy (2 jumps total vs 1 base)
          const maxJumps = hasHexstorm ? 2 : 1;

          for (let m = 0; m < multishotCount; m++) {
            if (runtime.projectiles.length >= MAX_PROJECTILES) break;
            const angleOffset = (m - (multishotCount - 1) / 2) * 0.18;
            const cosO = Math.cos(angleOffset);
            const sinO = Math.sin(angleOffset);
            const dirX = (baseDx / baseDist) * cosO - (baseDz / baseDist) * sinO;
            const dirZ = (baseDx / baseDist) * sinO + (baseDz / baseDist) * cosO;

            runtime.projectiles.push({
              id: runtime.nextEntityId++,
              x: playerPos.x,
              y: 0.8,
              z: playerPos.z,
              vx: dirX * projSpeed,
              vz: dirZ * projSpeed,
              damage: totalDamage,
              radius: 0.35,
              color: "#22c55e",
              lifetime: 0,
              maxLifetime: 2.2,
              isEnemy: false,
              pierce: 1,
              homing: true,
              chainRemaining: maxJumps,
              hitEnemyIds: [],
            });
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // TANK: Orbital Cleaving Axe Rotation + CYCLONE EDGE synergy
    // -------------------------------------------------------------------------
    if (weaponType === "axe") {
      const rotSpeed = (hasCycloneEdge ? 5.2 : 3.5) * hasteMultiplier;
      runtime.axeAngle += rotSpeed * delta;

      const axeRadius = hasCycloneEdge ? 4.8 : weaponConfig.range;
      const totalDamage = Math.round(weaponConfig.baseDamage * damageMultiplier * (hasCycloneEdge ? 1.4 : 1.0));

      // Hit enemies that collide with any orbital axe
      for (let m = 0; m < multishotCount; m++) {
        const offsetAngle = runtime.axeAngle + (m * Math.PI * 2) / multishotCount;
        const axeX = playerPos.x + Math.cos(offsetAngle) * axeRadius;
        const axeZ = playerPos.z + Math.sin(offsetAngle) * axeRadius;

        for (let i = 0; i < runtime.enemies.length; i++) {
          const e = runtime.enemies[i];
          const distSq = (e.x - axeX) ** 2 + (e.z - axeZ) ** 2;
          const hitDistance = (hasCycloneEdge ? 0.85 : 0.6) + e.radius;
          if (distSq < hitDistance * hitDistance) {
            e.health -= Math.max(1, Math.round(totalDamage * 0.22));
            e.hitFlashTimer = 0.08;
            gameAudio.play("enemyHit");
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
    // 2. Delayed Bursts Simulation (SUPERNOVA synergy)
    // =========================================================================
    for (let b = runtime.delayedBursts.length - 1; b >= 0; b--) {
      const burst = runtime.delayedBursts[b];
      burst.delayTimer -= delta;

      if (burst.delayTimer <= 0) {
        if (runtime.shockwaves.length < MAX_SHOCKWAVES) {
          runtime.shockwaves.push({
            id: runtime.nextEntityId++,
            x: burst.x,
            z: burst.z,
            radius: 2.5,
            maxRadius: burst.radius,
            color: burst.color,
            lifetime: 0,
            maxLifetime: 0.5,
          });
        }

        const burstRadiusSq = burst.radius * burst.radius;
        for (let i = 0; i < runtime.enemies.length; i++) {
          const e = runtime.enemies[i];
          const distSq = (e.x - burst.x) ** 2 + (e.z - burst.z) ** 2;
          if (distSq <= burstRadiusSq) {
            e.health -= burst.damage;
            e.hitFlashTimer = 0.15;
            gameAudio.play("enemyHit");
          }
        }

        runtime.delayedBursts.splice(b, 1);
      }
    }

    // =========================================================================
    // 3. Projectile Simulation & Collisions
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
            gameAudio.play("playerDamage");
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
          if (proj.hitEnemyIds && proj.hitEnemyIds.includes(enemy.id)) continue;

          const distSq = (enemy.x - proj.x) ** 2 + (enemy.z - proj.z) ** 2;
          if (distSq < (proj.radius + enemy.radius) ** 2) {
            enemy.health -= proj.damage;
            enemy.hitFlashTimer = 0.15;
            gameAudio.play("enemyHit");
            proj.pierce -= 1;

            // Handle HEX chain jump
            if (proj.chainRemaining && proj.chainRemaining > 0) {
              if (!proj.hitEnemyIds) proj.hitEnemyIds = [];
              proj.hitEnemyIds.push(enemy.id);
              proj.chainRemaining -= 1;

              // Find closest other enemy within 6.5m
              let nextTargetDistSq = Infinity;
              let nextTargetX = 0;
              let nextTargetZ = 0;
              let foundNext = false;

              for (let o = 0; o < runtime.enemies.length; o++) {
                const other = runtime.enemies[o];
                if (proj.hitEnemyIds.includes(other.id)) continue;
                const dSq = (other.x - enemy.x) ** 2 + (other.z - enemy.z) ** 2;
                if (dSq <= 6.5 * 6.5 && dSq < nextTargetDistSq) {
                  nextTargetDistSq = dSq;
                  nextTargetX = other.x;
                  nextTargetZ = other.z;
                  foundNext = true;
                }
              }

              if (foundNext) {
                const chainSpeed = 16.0;
                const cdx = nextTargetX - enemy.x;
                const cdz = nextTargetZ - enemy.z;
                const cdist = Math.hypot(cdx, cdz) || 1;
                proj.x = enemy.x;
                proj.z = enemy.z;
                proj.vx = (cdx / cdist) * chainSpeed;
                proj.vz = (cdz / cdist) * chainSpeed;
                proj.lifetime = 0;
                proj.pierce = 1;
              }
            }

            if (proj.pierce <= 0) break;
          }
        }
      }
    }

    // =========================================================================
    // 4. Shockwaves Simulation & Instanced Rendering
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
      shockwaveMeshRef.current.count = count;

      for (let i = 0; i < count; i++) {
        const sw = runtime.shockwaves[i];
        tempPosition.set(sw.x, 0.04, sw.z);
        tempRotation.set(-Math.PI / 2, 0, 0);
        tempQuaternion.setFromEuler(tempRotation);
        const scale = Math.max(0.1, sw.radius);
        tempScale.set(scale, scale, 1);
        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        shockwaveMeshRef.current.setMatrixAt(i, tempMatrix);

        if (sw.color === "#e11d48") {
          shockwaveMeshRef.current.setColorAt(i, bossShockColor);
        } else if (sw.color === "#ff3b5c") {
          shockwaveMeshRef.current.setColorAt(i, critShockColor);
        } else if (sw.color === "#d946ef") {
          shockwaveMeshRef.current.setColorAt(i, novaShockColor);
        } else if (sw.color === "#f43f5e") {
          shockwaveMeshRef.current.setColorAt(i, supernovaShockColor);
        } else {
          shockwaveMeshRef.current.setColorAt(i, defaultShockColor);
        }
      }

      if (count > 0) {
        shockwaveMeshRef.current.instanceMatrix.needsUpdate = true;
        if (shockwaveMeshRef.current.instanceColor) {
          shockwaveMeshRef.current.instanceColor.needsUpdate = true;
        }
      }
    }

    // =========================================================================
    // 5. Instanced Projectiles Rendering
    // =========================================================================
    if (projectileMeshRef.current) {
      const count = Math.min(runtime.projectiles.length, MAX_PROJECTILES);
      projectileMeshRef.current.count = count;

      for (let i = 0; i < count; i++) {
        const proj = runtime.projectiles[i];
        tempPosition.set(proj.x, proj.y, proj.z);
        const scale = proj.radius * 2;
        tempScale.set(scale, scale, scale);
        tempMatrix.makeTranslation(proj.x, proj.y, proj.z);
        tempMatrix.scale(tempScale);
        projectileMeshRef.current.setMatrixAt(i, tempMatrix);

        if (proj.isEnemy) {
          projectileMeshRef.current.setColorAt(i, enemyProjColor);
        } else if (proj.isPrism) {
          projectileMeshRef.current.setColorAt(i, prismProjColor);
        } else if (proj.color === "#22c55e") {
          projectileMeshRef.current.setColorAt(i, hexProjColor);
        } else if (proj.color === "#a8ff60") {
          projectileMeshRef.current.setColorAt(i, critProjColor);
        } else {
          projectileMeshRef.current.setColorAt(i, defaultProjColor);
        }
      }

      if (count > 0) {
        projectileMeshRef.current.instanceMatrix.needsUpdate = true;
        if (projectileMeshRef.current.instanceColor) {
          projectileMeshRef.current.instanceColor.needsUpdate = true;
        }
      }
    }
  });

  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const multishotTier = useGameStore((s) => s.upgrades.multishot || 0);
  const damageTier = useGameStore((s) => s.upgrades.damage || 0);
  const hasCycloneEdge = selectedCharacterId === "tank" && damageTier >= 2 && multishotTier >= 2;
  const axeCount = 1 + multishotTier;
  const visualAxeRadius = hasCycloneEdge ? 4.8 : 4.0;

  return (
    <group>
      {/* Projectiles Instanced Mesh */}
      <instancedMesh
        ref={projectileMeshRef}
        args={[projGeometry, projMaterial, MAX_PROJECTILES]}
        frustumCulled={false}
      />

      {/* Shockwaves Instanced Mesh */}
      <instancedMesh
        ref={shockwaveMeshRef}
        args={[shockGeometry, shockMaterial, MAX_SHOCKWAVES]}
        frustumCulled={false}
      />

      {/* Visual Orbital Axes for TANK (enhanced with CYCLONE EDGE) */}
      {selectedCharacterId === "tank" && (
        <group ref={axesGroupRef}>
          {Array.from({ length: axeCount }).map((_, idx) => {
            const angle = (idx * Math.PI * 2) / axeCount;
            return (
              <group
                key={idx}
                position={[Math.cos(angle) * visualAxeRadius, 0, Math.sin(angle) * visualAxeRadius]}
                rotation={[0, -angle, 1.2]}
              >
                {/* Axe Handle */}
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, hasCycloneEdge ? 1.5 : 1.2, 8]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
                {/* Axe Blade */}
                <mesh position={[0, hasCycloneEdge ? 0.55 : 0.45, 0]}>
                  <boxGeometry args={[hasCycloneEdge ? 0.65 : 0.45, hasCycloneEdge ? 0.48 : 0.35, 0.08]} />
                  <meshStandardMaterial
                    color={hasCycloneEdge ? "#ff0055" : "#ff3b5c"}
                    emissive={hasCycloneEdge ? "#ff0055" : "#ff3b5c"}
                    emissiveIntensity={hasCycloneEdge ? 1.4 : 0.8}
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
