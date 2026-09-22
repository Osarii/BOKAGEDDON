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
const tempColor = new THREE.Color();

// Pre-defined palette colors for instanced rendering
const defaultProjColor = new THREE.Color("#23d5ff");
const critProjColor = new THREE.Color("#a8ff60");
const enemyProjColor = new THREE.Color("#ef4444"); // Clearly visible hostile red
const prismProjColor = new THREE.Color("#f43f5e");
const fireProjColor = new THREE.Color("#ff5722");
const frostProjColor = new THREE.Color("#38bdf8");
const poisonProjColor = new THREE.Color("#84cc16");
const shockProjColor = new THREE.Color("#00e5ff");

const defaultShockColor = new THREE.Color("#ffb020");
const critShockColor = new THREE.Color("#ff3b5c");
const bossShockColor = new THREE.Color("#e11d48");
const novaShockColor = new THREE.Color("#d946ef");
const supernovaShockColor = new THREE.Color("#f43f5e");

// Helper to get highest active elemental color for weapon VFX
function getStrongestElementalColor(upgrades: Record<string, number>, fallback: string): string {
  const elements = [
    { type: "fire", count: upgrades.fire || 0, color: "#f97316" },
    { type: "shock", count: upgrades.shock || 0, color: "#00e5ff" },
    { type: "poison", count: upgrades.poison || 0, color: "#22c55e" },
    { type: "frost", count: upgrades.frost || 0, color: "#38bdf8" },
  ];
  elements.sort((a, b) => b.count - a.count);
  return elements[0].count > 0 ? elements[0].color : fallback;
}

// Helper to apply elemental status effects and electric shock arcs across all weapons
function applyElementalOnHit(
  enemy: { id: number; x: number; z: number; health: number; hitFlashTimer: number; burnTimer?: number; burnDps?: number; poisonTimer?: number; poisonDps?: number; frostTimer?: number; frostSlowPercent?: number },
  upgrades: Record<string, number>,
  runtime: GameRuntime
) {
  // Generic impact spark
  if (runtime.particles.length < 250) {
    runtime.particles.push({
      id: runtime.nextEntityId++,
      type: "hit",
      x: enemy.x,
      y: 0.6,
      z: enemy.z,
      vx: (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 1.2 + 0.3,
      vz: (Math.random() - 0.5) * 1.5,
      color: "#ffffff",
      size: 0.12,
      life: 0,
      maxLife: 0.22,
    });
  }

  // 1. FIRE (Burn)
  if (upgrades.fire > 0) {
    const tier = upgrades.fire;
    enemy.burnTimer = Math.max(enemy.burnTimer || 0, 2.0 + tier * 0.5);
    enemy.burnDps = Math.max(enemy.burnDps || 0, tier * 8);
    // Ignition burst
    if (runtime.particles.length < 250) {
      for (let k = 0; k < 2; k++) {
        runtime.particles.push({
          id: runtime.nextEntityId++,
          type: "burn",
          x: enemy.x + (Math.random() - 0.5) * 0.3,
          y: 0.6 + Math.random() * 0.3,
          z: enemy.z + (Math.random() - 0.5) * 0.3,
          vx: (Math.random() - 0.5) * 1.0,
          vy: Math.random() * 1.5 + 0.5,
          vz: (Math.random() - 0.5) * 1.0,
          color: "#f97316",
          size: 0.14,
          life: 0,
          maxLife: 0.35,
        });
      }
    }
  }

  // 2. POISON (Sustained DoT, boosted 2x by Toxic Relic)
  if (upgrades.poison > 0) {
    const tier = upgrades.poison;
    const isAmped = runtime.toxicRelicTimer > 0;
    enemy.poisonTimer = Math.max(enemy.poisonTimer || 0, 3.0 + tier * 1.0);
    enemy.poisonDps = Math.max(enemy.poisonDps || 0, (4 + tier * 4) * (isAmped ? 2.0 : 1.0));
    // Poison splash bubbles
    if (runtime.particles.length < 250) {
      for (let k = 0; k < 2; k++) {
        runtime.particles.push({
          id: runtime.nextEntityId++,
          type: "poison",
          x: enemy.x + (Math.random() - 0.5) * 0.3,
          y: 0.5 + Math.random() * 0.3,
          z: enemy.z + (Math.random() - 0.5) * 0.3,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * 0.8 + 0.2,
          vz: (Math.random() - 0.5) * 0.8,
          color: "#22c55e",
          size: 0.12,
          life: 0,
          maxLife: 0.4,
        });
      }
    }
  }

  // 3. FROST (Movement Slow)
  if (upgrades.frost > 0) {
    const tier = upgrades.frost;
    enemy.frostTimer = Math.max(enemy.frostTimer || 0, 2.0 + tier * 0.5);
    enemy.frostSlowPercent = Math.max(enemy.frostSlowPercent || 0, Math.min(0.65, 0.15 + tier * 0.1));
    // Crystalline frost burst
    if (runtime.particles.length < 250) {
      for (let k = 0; k < 2; k++) {
        runtime.particles.push({
          id: runtime.nextEntityId++,
          type: "frost",
          x: enemy.x + (Math.random() - 0.5) * 0.3,
          y: 0.6 + Math.random() * 0.3,
          z: enemy.z + (Math.random() - 0.5) * 0.3,
          vx: (Math.random() - 0.5) * 1.2,
          vy: Math.random() * 0.8,
          vz: (Math.random() - 0.5) * 1.2,
          color: "#38bdf8",
          size: 0.13,
          life: 0,
          maxLife: 0.35,
        });
      }
    }
  }

  // 4. SHOCK (Chain electrical arcs, guaranteed by Tesla Cell)
  const isTeslaActive = runtime.teslaTimer > 0;
  const shockChance = isTeslaActive ? 0.9 : (upgrades.shock > 0 ? 0.20 + upgrades.shock * 0.15 : 0);

  if (shockChance > 0 && Math.random() < shockChance) {
    const shockDmg = (upgrades.shock || 1) * 12 * (isTeslaActive ? 1.5 : 1.0);
    const rangeSq = (5.0 + (upgrades.shock || 0) * 1.5) ** 2;

    for (let i = 0; i < runtime.enemies.length; i++) {
      const other = runtime.enemies[i];
      if (other.id === enemy.id || other.health <= 0) continue;
      const dSq = (other.x - enemy.x) ** 2 + (other.z - enemy.z) ** 2;
      if (dSq <= rangeSq) {
        other.health -= Math.round(shockDmg);
        other.hitFlashTimer = 0.15;
        if (runtime.shockwaves.length < MAX_SHOCKWAVES) {
          runtime.shockwaves.push({
            id: runtime.nextEntityId++,
            x: (enemy.x + other.x) * 0.5,
            z: (enemy.z + other.z) * 0.5,
            radius: 0.3,
            maxRadius: 1.6,
            color: "#00e5ff",
            lifetime: 0,
            maxLifetime: 0.25,
          });
        }
        // Shock arc sparks
        if (runtime.particles.length < 250) {
          for (let k = 0; k < 3; k++) {
            runtime.particles.push({
              id: runtime.nextEntityId++,
              type: "shock",
              x: other.x,
              y: 0.7,
              z: other.z,
              vx: (Math.random() - 0.5) * 2.0,
              vy: Math.random() * 1.5,
              vz: (Math.random() - 0.5) * 2.0,
              color: "#00e5ff",
              size: 0.14,
              life: 0,
              maxLife: 0.25,
            });
          }
        }
        break; // arc to 1 nearest enemy
      }
    }
  }
}

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

    // Decrement temporary special item buff timers during active gameplay
    if (runtime.overclockTimer > 0) runtime.overclockTimer = Math.max(0, runtime.overclockTimer - delta);
    if (runtime.teslaTimer > 0) runtime.teslaTimer = Math.max(0, runtime.teslaTimer - delta);
    if (runtime.toxicRelicTimer > 0) runtime.toxicRelicTimer = Math.max(0, runtime.toxicRelicTimer - delta);
    if (runtime.phoenixTimer > 0) runtime.phoenixTimer = Math.max(0, runtime.phoenixTimer - delta);

    // Compute active upgrade bonuses and special item multipliers
    const isOverclocked = runtime.overclockTimer > 0;
    const isPhoenixBuffed = runtime.phoenixTimer > 0;
    const damageMultiplier = (1 + (upgrades.damage || 0) * 0.2) * (isPhoenixBuffed ? 1.4 : 1.0);
    const hasteMultiplier = (1 + (upgrades.haste || 0) * 0.15) * (isOverclocked ? 1.5 : 1.0);
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

          // BONK Combat Polish: hammer trail & heavy ground impact debris
          if (runtime.particles.length < 250) {
            const elemColor = getStrongestElementalColor(upgrades, "#fbbf24");
            for (let k = 0; k < 6; k++) {
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "hit",
                x: playerPos.x + (Math.random() - 0.5) * 1.5,
                y: 0.15,
                z: playerPos.z + (Math.random() - 0.5) * 1.5,
                vx: (Math.random() - 0.5) * 3.0,
                vy: Math.random() * 2.2 + 0.8,
                vz: (Math.random() - 0.5) * 3.0,
                color: elemColor,
                size: 0.18,
                life: 0,
                maxLife: 0.35,
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
              applyElementalOnHit(e, upgrades, runtime);
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

          // BYTE Combat Polish: energy-orb trail & cyan tech particles
          if (runtime.particles.length < 250) {
            const elemColor = getStrongestElementalColor(upgrades, "#23d5ff");
            for (let k = 0; k < 4; k++) {
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "shock",
                x: playerPos.x + (Math.random() - 0.5) * 0.4,
                y: 0.8,
                z: playerPos.z + (Math.random() - 0.5) * 0.4,
                vx: (Math.random() - 0.5) * 1.5,
                vy: Math.random() * 1.2,
                vz: (Math.random() - 0.5) * 1.5,
                color: elemColor,
                size: 0.14,
                life: 0,
                maxLife: 0.3,
              });
            }
          }

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

          // NOVA Combat Polish: astral particles & luminous cosmic flash
          if (runtime.particles.length < 250) {
            const elemColor = getStrongestElementalColor(upgrades, "#d946ef");
            for (let k = 0; k < 6; k++) {
              const pAngle = Math.random() * Math.PI * 2;
              const pSpeed = Math.random() * 3.5 + 1.5;
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "shock",
                x: playerPos.x,
                y: 0.7,
                z: playerPos.z,
                vx: Math.cos(pAngle) * pSpeed,
                vy: (Math.random() - 0.3) * 1.5,
                vz: Math.sin(pAngle) * pSpeed,
                color: elemColor,
                size: 0.18,
                life: 0,
                maxLife: 0.42,
              });
            }
          }

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
              applyElementalOnHit(e, upgrades, runtime);
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

          // HEX Combat Polish: void motes & purple/green chain energy
          if (runtime.particles.length < 250) {
            const elemColor = getStrongestElementalColor(upgrades, "#a855f7");
            for (let k = 0; k < 4; k++) {
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "poison",
                x: playerPos.x + (Math.random() - 0.5) * 0.6,
                y: 0.8,
                z: playerPos.z + (Math.random() - 0.5) * 0.6,
                vx: (Math.random() - 0.5) * 1.8,
                vy: Math.random() * 1.5,
                vz: (Math.random() - 0.5) * 1.8,
                color: elemColor,
                size: 0.15,
                life: 0,
                maxLife: 0.4,
              });
            }
          }

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
            applyElementalOnHit(e, upgrades, runtime);
            gameAudio.play("enemyHit");

            // TANK Combat Polish: metallic sparks & heavier cleave impact
            if (runtime.particles.length < 250 && Math.random() < 0.35) {
              const elemColor = getStrongestElementalColor(upgrades, "#fb923c");
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "hit",
                x: axeX,
                y: 0.8,
                z: axeZ,
                vx: (Math.random() - 0.5) * 2.0,
                vy: Math.random() * 1.5,
                vz: (Math.random() - 0.5) * 2.0,
                color: elemColor,
                size: 0.16,
                life: 0,
                maxLife: 0.25,
              });
            }
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
            applyElementalOnHit(e, upgrades, runtime);
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

            // Handle Cryovex frost chill slow
            if (proj.effectType === "frost") {
              runtime.playerSlowTimer = 2.5;
              runtime.playerSlowFactor = 0.55;
            }

            // Elemental hit feedback particles on player
            if (runtime.particles.length < 250) {
              const pType =
                proj.effectType === "fire"
                  ? "burn"
                  : proj.effectType === "poison"
                  ? "poison"
                  : proj.effectType === "shock"
                  ? "shock"
                  : proj.effectType === "frost"
                  ? "frost"
                  : "hit";
              const pColor = proj.color || "#ef4444";
              for (let k = 0; k < 4; k++) {
                runtime.particles.push({
                  id: runtime.nextEntityId++,
                  type: pType,
                  x: proj.x,
                  y: 0.8,
                  z: proj.z,
                  vx: (Math.random() - 0.5) * 1.6,
                  vy: Math.random() * 1.5,
                  vz: (Math.random() - 0.5) * 1.6,
                  color: pColor,
                  size: 0.14,
                  life: 0,
                  maxLife: 0.35,
                });
              }
            }
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
            applyElementalOnHit(enemy, upgrades, runtime);
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
    // 4. Hazard Zones Simulation & Damage (Cindermaw Fire, Venomatrix Poison, Cryovex Frost)
    // =========================================================================
    for (let h = runtime.hazardZones.length - 1; h >= 0; h--) {
      const hz = runtime.hazardZones[h];
      hz.duration -= delta;
      if (hz.duration <= 0) {
        runtime.hazardZones.splice(h, 1);
        continue;
      }

      // Check player inside hazard
      const distSq = (playerPos.x - hz.x) ** 2 + (playerPos.z - hz.z) ** 2;
      if (distSq < hz.radius * hz.radius) {
        if (hz.type === "fire" || hz.type === "poison") {
          if (runtime.playerInvulnerableTimer <= 0) {
            useGameStore.getState().takeDamage(Math.round(hz.damagePerSec * 0.4));
            runtime.playerInvulnerableTimer = 0.4;
            gameAudio.play("playerDamage");
          }
        } else if (hz.type === "frost") {
          runtime.playerSlowTimer = Math.max(runtime.playerSlowTimer, 1.2);
          runtime.playerSlowFactor = Math.min(runtime.playerSlowFactor, hz.slowPercent || 0.5);
        }
      }
    }

    // =========================================================================
    // 5. Shockwaves Simulation & Instanced Rendering
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
          tempColor.set(sw.color || "#ffb020");
          shockwaveMeshRef.current.setColorAt(i, tempColor);
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
        } else if (proj.color === "#22c55e" || upgrades.poison > 0) {
          projectileMeshRef.current.setColorAt(i, poisonProjColor);
        } else if (upgrades.fire > 0) {
          projectileMeshRef.current.setColorAt(i, fireProjColor);
        } else if (upgrades.frost > 0) {
          projectileMeshRef.current.setColorAt(i, frostProjColor);
        } else if (upgrades.shock > 0) {
          projectileMeshRef.current.setColorAt(i, shockProjColor);
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
