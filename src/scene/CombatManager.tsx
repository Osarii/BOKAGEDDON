import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { damagePlayer, type GameRuntime } from "../game/runtime";
import { WEAPON_CONFIGS } from "../game/config";
import { useGameStore } from "../store/gameStore";
import { gameAudio } from "../audio/gameAudio";
import { hasSynergy } from "../game/weaponSynergies";
import type { WeaponType, CharacterId, EnemyType } from "../types/game";
import { isBossType } from "../game/progression";
import {
  findValidArenaPosition,
  isArenaPositionValid,
  isArenaSegmentBlocked,
} from "../game/arenaLayout";

function calculateOutgoingDamage(
  baseHitDamage: number,
  enemy: { type: EnemyType; health: number; maxHealth: number },
  isCrit: boolean,
  baseCritMultiplier: number,
  upgrades: Record<string, number>,
  passives: Record<string, number>,
  secretPassives: Record<string, boolean> | undefined
): number {
  let critMult = baseCritMultiplier;
  const isBoss = isBossType(enemy.type);
  if (isBoss && secretPassives?.apex_echo) {
    critMult += 0.25;
  }

  let finalDmg = isCrit ? baseHitDamage * critMult : baseHitDamage;

  // Execution Protocol: +6% direct damage per tier against enemies <= 35% HP
  if (enemy.maxHealth > 0 && enemy.health / enemy.maxHealth <= 0.35) {
    const execTier = upgrades.executioner || 0;
    if (execTier > 0) {
      finalDmg *= (1 + execTier * 0.06);
    }
  }

  // Boss Hunter (+7%/tier), Apex Lens (+6%/stack), Apex Echo (+15%)
  if (isBoss) {
    const bossHunterTier = upgrades.boss_hunter || 0;
    const apexStacks = passives.apex_lens || 0;
    const hasApexEcho = Boolean(secretPassives?.apex_echo);
    finalDmg *= (1 + bossHunterTier * 0.07 + apexStacks * 0.06 + (hasApexEcho ? 0.15 : 0));
  }

  return Math.max(1, Math.round(finalDmg));
}

function getMultishotExtra(tier: number): number {
  if (tier <= 0) return 0;
  if (tier <= 2) return 1;
  if (tier <= 4) return 2;
  return 3;
}

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
const tempDir = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);
const tempColor = new THREE.Color();

// Pre-defined palette colors for instanced rendering
const defaultProjColor = new THREE.Color("#23d5ff");
const critProjColor = new THREE.Color("#a8ff60");
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
  passives: Record<string, number>,
  secretPassives: Record<string, boolean> | undefined,
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

  // 1. FIRE (Burn) ~6 burn damage/sec per tier
  if (upgrades.fire > 0) {
    const tier = upgrades.fire;
    enemy.burnTimer = Math.max(enemy.burnTimer || 0, 2.0 + tier * 0.5);
    enemy.burnDps = Math.max(enemy.burnDps || 0, tier * 6);
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

  // 2. POISON (4 + tier * 3 damage/sec, scaled by Toxic Relic and Venom Singularity)
  if (upgrades.poison > 0 || passives.toxic_relic > 0) {
    const tier = upgrades.poison || 0;
    const toxicStacks = passives.toxic_relic || 0;
    const hasVenomSingularity = Boolean(secretPassives?.venom_singularity);
    const poisonDuration = (3.0 + tier * 1.0 + toxicStacks * 1.0) * (hasVenomSingularity ? 1.20 : 1.0);
    const poisonDps = (4 + tier * 3) * (1 + toxicStacks * 0.20) * (hasVenomSingularity ? 1.25 : 1.0);
    enemy.poisonTimer = Math.max(enemy.poisonTimer || 0, poisonDuration);
    enemy.poisonDps = Math.max(enemy.poisonDps || 0, poisonDps);
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
          size: 0.24,
          life: 0,
          maxLife: 0.65,
        });
      }
    }
  }

  // 3. FROST (Movement Slow ~12% + 7% per tier, bound around 47% at T5)
  if (upgrades.frost > 0) {
    const tier = upgrades.frost;
    enemy.frostTimer = Math.max(enemy.frostTimer || 0, 2.0 + tier * 0.5);
    const slowTarget = Math.min(0.47, 0.12 + tier * 0.07);
    enemy.frostSlowPercent = Math.max(enemy.frostSlowPercent || 0, slowTarget);
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

  // 4. SHOCK (12% + 8% proc per tier, Tesla Cell separate, Storm Engine +10% proc & +25% chain dmg)
  const teslaStacks = passives.tesla_cell || 0;
  const teslaChance = teslaStacks > 0 ? 0.20 + (teslaStacks - 1) * 0.10 : 0;
  const upgradeShockChance = upgrades.shock > 0 ? 0.12 + upgrades.shock * 0.08 : 0;
  let totalShockChance = Math.max(teslaChance, upgradeShockChance);
  if (secretPassives?.storm_engine && totalShockChance > 0) {
    totalShockChance += 0.10;
  }

  if (totalShockChance > 0 && Math.random() < totalShockChance) {
    const shockDmg = (upgrades.shock || 1) * 12 * (1 + teslaStacks * 0.25) * (secretPassives?.storm_engine ? 1.25 : 1.0);
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
  const hostileProjectileMeshRef = useRef<THREE.InstancedMesh>(null);
  const shockwaveMeshRef = useRef<THREE.InstancedMesh>(null);
  const axesGroupRef = useRef<THREE.Group>(null);
  const lanceBeamGroupRef = useRef<THREE.Group>(null);
  const lanceBeamsRef = useRef<{ x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; color: string; life: number; maxLife: number; width: number }[]>([]);

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
        emissive: "#ffffff",
        emissiveIntensity: 0.65,
        roughness: 0.2,
      }),
    []
  );

  const hostileProjMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#ef4444",
        emissiveIntensity: 1.4,
        roughness: 0.18,
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

    if (hostileProjectileMeshRef.current) {
      hostileProjectileMeshRef.current.count = 0;
      for (let i = 0; i < MAX_PROJECTILES; i++) {
        hostileProjectileMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      hostileProjectileMeshRef.current.instanceMatrix.needsUpdate = true;
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
    const passives = useGameStore.getState().passives;
    const secretPassives = useGameStore.getState().secretPassives;

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
        : selectedCharacterId === "rift"
        ? "rift-disc"
        : selectedCharacterId === "fuse"
        ? "pulse-mine"
        : selectedCharacterId === "lux"
        ? "light-lance"
        : "hammer";

    const weaponConfig = WEAPON_CONFIGS[weaponType];

    // Compute active upgrade bonuses and special item multipliers
    const damageMultiplier = 1 + (upgrades.damage || 0) * 0.15;
    const hasteMultiplier =
      (1 + (upgrades.haste || 0) * 0.15) *
      (1 + (passives.overclock_core || 0) * 0.15) *
      (secretPassives?.storm_engine ? 1.10 : 1.0);
    const effectiveCooldown = weaponConfig.baseCooldown / hasteMultiplier;
    const critChance = (upgrades.critical || 0) * 0.10;
    const baseCritMultiplier =
      2.0 + (upgrades.precision || 0) * 0.15 + (passives.echo_prism || 0) * 0.10;
    const multishotCount = 1 + getMultishotExtra(upgrades.multishot || 0);
    const areaMultiplier =
      (1 + (upgrades.area || 0) * 0.07) *
      (1 + (passives.gravity_seed || 0) * 0.08) *
      (secretPassives?.venom_singularity ? 1.10 : 1.0);

    // Active weapon synergies
    const hasMeteorSlam = hasSynergy("meteor-slam", selectedCharacterId, upgrades);
    const hasPrismBarrage = hasSynergy("prism-barrage", selectedCharacterId, upgrades);
    const hasCycloneEdge = hasSynergy("cyclone-edge", selectedCharacterId, upgrades);
    const hasSupernova = hasSynergy("supernova", selectedCharacterId, upgrades);
    const hasHexstorm = hasSynergy("hexstorm", selectedCharacterId, upgrades);
    const hasEventHorizon = hasSynergy("event-horizon", selectedCharacterId, upgrades);
    const hasChainReaction = hasSynergy("chain-reaction", selectedCharacterId, upgrades);
    const hasSolarRefraction = hasSynergy("solar-refraction", selectedCharacterId, upgrades);

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
            : weaponType === "energy-orb" || weaponType === "rift-disc"
            ? "energyOrb"
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
          const hitRadius = (weaponConfig.areaRadius * areaMultiplier) + (multishotCount - 1) * 0.5;
          const hitRadiusSq = hitRadius * hitRadius;

          for (let i = 0; i < runtime.enemies.length; i++) {
            const e = runtime.enemies[i];
            const distSq = (e.x - playerPos.x) ** 2 + (e.z - playerPos.z) ** 2;
            if (distSq <= hitRadiusSq) {
              const baseDmg = weaponConfig.baseDamage * damageMultiplier;
              const dmg = calculateOutgoingDamage(baseDmg, e, isCrit, baseCritMultiplier, upgrades, passives, secretPassives);
              const bonusCritDamage = isCrit && hasMeteorSlam ? Math.round(dmg * 0.35) : 0;
              e.health -= (dmg + bonusCritDamage);
              e.hitFlashTimer = 0.15;
              applyElementalOnHit(e, upgrades, passives, secretPassives, runtime);
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
              damage: weaponConfig.baseDamage * damageMultiplier,
              radius: 0.3,
              color: isCrit ? "#a8ff60" : "#23d5ff",
              lifetime: 0,
              maxLifetime: 2.2,
              isEnemy: false,
              pierce: 1 + Math.floor((upgrades.multishot || 0) / 2),
              isCrit: isCrit,
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
              damage: Math.round(weaponConfig.baseDamage * damageMultiplier * 1.6),
              radius: 0.45,
              color: "#f43f5e",
              lifetime: 0,
              maxLifetime: 2.5,
              isEnemy: false,
              pierce: 3 + multishotCount,
              isPrism: true,
              isCrit: isCrit,
            });
          }
        }

        // ---------------------------------------------------------------------
        // NOVA: Radial Magical Burst + SUPERNOVA synergy
        // ---------------------------------------------------------------------
        else if (weaponType === "nova-burst") {
          const burstRadius = (weaponConfig.areaRadius * areaMultiplier) + (multishotCount - 1) * 0.4;
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
              const baseDmg = weaponConfig.baseDamage * damageMultiplier;
              const dmg = calculateOutgoingDamage(baseDmg, e, isCrit, baseCritMultiplier, upgrades, passives, secretPassives);
              e.health -= dmg;
              e.hitFlashTimer = 0.15;
              applyElementalOnHit(e, upgrades, passives, secretPassives, runtime);
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
              damage: weaponConfig.baseDamage * damageMultiplier,
              radius: 0.35,
              color: "#22c55e",
              lifetime: 0,
              maxLifetime: 2.2,
              isEnemy: false,
              pierce: 1,
              homing: true,
              chainRemaining: maxJumps,
              hitEnemyIds: [],
              isCrit: isCrit,
            });
          }
        }

        // ---------------------------------------------------------------------
        // RIFT: Dimensional Phase Disc + EVENT HORIZON synergy
        // ---------------------------------------------------------------------
        else if (weaponType === "rift-disc") {
          const baseDx = targetX - playerPos.x;
          const baseDz = targetZ - playerPos.z;
          const baseAngle = Math.atan2(baseDz, baseDx);
          const projSpeed = 16.0;

          if (runtime.particles.length < 250) {
            const elemColor = getStrongestElementalColor(upgrades, "#8b5cf6");
            for (let k = 0; k < 4; k++) {
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "hit",
                x: playerPos.x + (Math.random() - 0.5) * 0.4,
                y: 0.8,
                z: playerPos.z + (Math.random() - 0.5) * 0.4,
                vx: (Math.random() - 0.5) * 1.5,
                vy: Math.random() * 1.2,
                vz: (Math.random() - 0.5) * 1.5,
                color: elemColor,
                size: 0.16,
                life: 0,
                maxLife: 0.35,
              });
            }
          }

          const spreadArc = 0.22;
          const startAngle = baseAngle - ((multishotCount - 1) * spreadArc) / 2;
          const discRadius = (weaponConfig.areaRadius * areaMultiplier) * (hasEventHorizon ? 1.25 : 1.0);
          const basePierce = (hasEventHorizon ? 3 : 2) + Math.floor((upgrades.multishot || 0) / 2);

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
              damage: weaponConfig.baseDamage * damageMultiplier,
              radius: discRadius,
              color: "#8B5CF6",
              lifetime: 0,
              maxLifetime: 1.4,
              isEnemy: false,
              pierce: basePierce,
              isCrit: isCrit,
              isRiftDisc: true,
              isReturning: false,
              returnDamageBonus: hasEventHorizon ? 0.25 : 0,
              hitEnemyIds: [],
            });
          }
        }

        // ---------------------------------------------------------------------
        // FUSE: Pulse Mine Area Controller + CHAIN REACTION synergy
        // ---------------------------------------------------------------------
        else if (weaponType === "pulse-mine") {
          const mineRadius = weaponConfig.areaRadius * areaMultiplier;
          const baseDmg = weaponConfig.baseDamage * damageMultiplier;
          const spreadArc = 0.35;
          const baseAngle = Math.atan2(targetZ - playerPos.z, targetX - playerPos.x);

          for (let m = 0; m < multishotCount; m++) {
            const offsetDist = m === 0 ? 0 : 0.8 + m * 0.4;
            const angle = baseAngle + (m - (multishotCount - 1) / 2) * spreadArc;
            const minePos = findValidArenaPosition(
              targetX + Math.cos(angle) * offsetDist,
              targetZ + Math.sin(angle) * offsetDist,
              0.75
            );

            runtime.delayedBursts.push({
              id: runtime.nextEntityId++,
              x: minePos.x,
              z: minePos.z,
              delayTimer: 0.65,
              damage: Math.round(baseDmg * (isCrit ? baseCritMultiplier : 1)),
              radius: mineRadius,
              color: isCrit ? "#ff9800" : "#f59e0b",
              isFuseMine: true,
              secondaryOnDetonate: hasChainReaction,
            });

            if (runtime.particles.length < 250) {
              runtime.particles.push({
                id: runtime.nextEntityId++,
                type: "hit",
                x: minePos.x,
                y: 0.2,
                z: minePos.z,
                vx: 0,
                vy: 0.8,
                vz: 0,
                color: "#f59e0b",
                size: 0.22,
                life: 0,
                maxLife: 0.65,
              });
            }
          }
        }

        // ---------------------------------------------------------------------
        // LUX: Instant Precision Light Lance + SOLAR REFRACTION synergy
        // ---------------------------------------------------------------------
        else if (weaponType === "light-lance") {
          for (let i = 0; i < runtime.enemies.length; i++) {
            const e = runtime.enemies[i];
            const distSq = (e.x - targetX) ** 2 + (e.z - targetZ) ** 2;
            if (distSq < 0.3) {
              if (isArenaSegmentBlocked(playerPos.x, playerPos.z, e.x, e.z, 0.2)) {
                break;
              }
              const baseDmg = weaponConfig.baseDamage * damageMultiplier;
              const hitDmg = calculateOutgoingDamage(baseDmg, e, isCrit, baseCritMultiplier, upgrades, passives, secretPassives);
              e.health -= hitDmg;
              e.hitFlashTimer = 0.15;
              applyElementalOnHit(e, upgrades, passives, secretPassives, runtime);
              gameAudio.play("enemyHit");

              if (lanceBeamsRef.current.length < 8) {
                lanceBeamsRef.current.push({
                  x1: playerPos.x,
                  y1: 0.8,
                  z1: playerPos.z,
                  x2: e.x,
                  y2: 0.6,
                  z2: e.z,
                  color: isCrit ? "#ffffff" : "#fde68a",
                  life: 0.12,
                  maxLife: 0.12,
                  width: 0.08 * (1 + (upgrades.multishot || 0) * 0.2),
                });
              }

              if (isCrit && hasSolarRefraction) {
                let secondTargetDistSq = 5.5 * 5.5;
                let secondIdx = -1;
                for (let o = 0; o < runtime.enemies.length; o++) {
                  if (o === i) continue;
                  const other = runtime.enemies[o];
                  const dSq = (other.x - e.x) ** 2 + (other.z - e.z) ** 2;
                  if (
                    dSq < secondTargetDistSq &&
                    !isArenaSegmentBlocked(e.x, e.z, other.x, other.z, 0.2)
                  ) {
                    secondTargetDistSq = dSq;
                    secondIdx = o;
                  }
                }
                if (secondIdx >= 0) {
                  const secondEnemy = runtime.enemies[secondIdx];
                  const secondDmg = Math.max(1, Math.round(hitDmg * 0.60));
                  secondEnemy.health -= secondDmg;
                  secondEnemy.hitFlashTimer = 0.15;
                  applyElementalOnHit(secondEnemy, upgrades, passives, secretPassives, runtime);

                  if (lanceBeamsRef.current.length < 8) {
                    lanceBeamsRef.current.push({
                      x1: e.x,
                      y1: 0.6,
                      z1: e.z,
                      x2: secondEnemy.x,
                      y2: 0.6,
                      z2: secondEnemy.z,
                      color: "#fef08a",
                      life: 0.12,
                      maxLife: 0.12,
                      width: 0.06,
                    });
                  }
                }
              }
              break;
            }
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
      const axeBaseDamage = weaponConfig.baseDamage * damageMultiplier * (hasCycloneEdge ? 1.4 : 1.0);

      // Hit enemies that collide with any orbital axe
      for (let m = 0; m < multishotCount; m++) {
        const offsetAngle = runtime.axeAngle + (m * Math.PI * 2) / multishotCount;
        const axeX = playerPos.x + Math.cos(offsetAngle) * axeRadius;
        const axeZ = playerPos.z + Math.sin(offsetAngle) * axeRadius;

        for (let i = 0; i < runtime.enemies.length; i++) {
          const e = runtime.enemies[i];
          const distSq = (e.x - axeX) ** 2 + (e.z - axeZ) ** 2;
          const hitDistance = ((hasCycloneEdge ? 0.85 : 0.6) * Math.sqrt(areaMultiplier)) + e.radius;
          if (distSq < hitDistance * hitDistance) {
            const isAxeCrit = Math.random() < critChance;
            const rawAxeDmg = axeBaseDamage * 0.22;
            const dmg = calculateOutgoingDamage(rawAxeDmg, e, isAxeCrit, baseCritMultiplier, upgrades, passives, secretPassives);
            e.health -= dmg;
            e.hitFlashTimer = 0.08;
            applyElementalOnHit(e, upgrades, passives, secretPassives, runtime);
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
          if (
            distSq <= burstRadiusSq &&
            (!burst.isFuseMine || !isArenaSegmentBlocked(burst.x, burst.z, e.x, e.z, 0.25))
          ) {
            e.health -= burst.damage;
            e.hitFlashTimer = 0.15;
            applyElementalOnHit(e, upgrades, passives, secretPassives, runtime);
            gameAudio.play("enemyHit");
          }
        }

        // FUSE CHAIN REACTION: Detonations trigger secondary shockwave after 0.28s
        if (burst.secondaryOnDetonate) {
          runtime.delayedBursts.push({
            id: runtime.nextEntityId++,
            x: burst.x + (Math.random() - 0.5) * 0.4,
            z: burst.z + (Math.random() - 0.5) * 0.4,
            delayTimer: 0.28,
            damage: Math.round(burst.damage * 0.45),
            radius: burst.radius * 0.70,
            color: "#f59e0b",
            isFuseMine: true,
            secondaryOnDetonate: false,
          });
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

      if (!isArenaPositionValid(proj.x, proj.z, proj.radius)) {
        runtime.projectiles.splice(p, 1);
        continue;
      }

      // RIFT: Outbound disc reverses direction toward player at half lifetime
      if (proj.isRiftDisc) {
        if (!proj.isReturning && (proj.lifetime >= proj.maxLifetime * 0.5 || proj.pierce <= 0)) {
          proj.isReturning = true;
          proj.hitEnemyIds = [];
          proj.pierce = 99;
        }
        if (proj.isReturning) {
          const rdx = playerPos.x - proj.x;
          const rdz = playerPos.z - proj.z;
          const rdist = Math.hypot(rdx, rdz) || 1;
          if (rdist < 1.0) {
            runtime.projectiles.splice(p, 1);
            continue;
          }
          proj.vx = (rdx / rdist) * 16.0;
          proj.vz = (rdz / rdist) * 16.0;
        }
      }

      // Expired lifetime
      if (proj.lifetime >= proj.maxLifetime || (!proj.isReturning && proj.pierce <= 0)) {
        runtime.projectiles.splice(p, 1);
        continue;
      }

      // Enemy projectile -> check hit against player
      if (proj.isEnemy) {
        const distToPlayer = Math.hypot(proj.x - playerPos.x, proj.z - playerPos.z);
        if (distToPlayer < proj.radius + 0.45) {
          if (runtime.playerInvulnerableTimer <= 0) {
            damagePlayer(runtime, proj.damage, 0.6);
            gameAudio.play("playerDamage");

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
            let hitBase = proj.damage;
            if (proj.isRiftDisc && proj.isReturning && proj.returnDamageBonus) {
              hitBase *= (1 + proj.returnDamageBonus);
            }
            const projDmg = calculateOutgoingDamage(hitBase, enemy, Boolean(proj.isCrit), baseCritMultiplier, upgrades, passives, secretPassives);
            enemy.health -= projDmg;
            enemy.hitFlashTimer = 0.15;
            applyElementalOnHit(enemy, upgrades, passives, secretPassives, runtime);
            gameAudio.play("enemyHit");
            if (!proj.isReturning) {
              proj.pierce -= 1;
            }
            if (!proj.hitEnemyIds) proj.hitEnemyIds = [];
            proj.hitEnemyIds.push(enemy.id);

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
            damagePlayer(runtime, Math.round(hz.damagePerSec * 0.4), 0.4);
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
      let count = 0;
      let hostileCount = 0;

      for (let i = 0; i < runtime.projectiles.length && count < MAX_PROJECTILES; i++) {
        const proj = runtime.projectiles[i];
        if (proj.isEnemy && !proj.effectType) {
          if (hostileProjectileMeshRef.current && hostileCount < MAX_PROJECTILES) {
            tempPosition.set(proj.x, proj.y, proj.z);
            tempScale.set(proj.radius * 2.25, proj.radius * 2.25, proj.radius * 2.25);
            tempMatrix.makeTranslation(proj.x, proj.y, proj.z);
            tempMatrix.scale(tempScale);
            hostileProjectileMeshRef.current.setMatrixAt(hostileCount, tempMatrix);
            hostileCount++;
          }
          continue;
        }

        tempPosition.set(proj.x, proj.y, proj.z);
        const scale = proj.radius * 2;
        tempScale.set(scale, scale, scale);
        tempMatrix.makeTranslation(proj.x, proj.y, proj.z);
        tempMatrix.scale(tempScale);
        projectileMeshRef.current.setMatrixAt(count, tempMatrix);

        if (proj.isEnemy) {
          tempColor.set(proj.color || "#ef4444");
          projectileMeshRef.current.setColorAt(count, tempColor);
        } else if (proj.isRiftDisc) {
          tempColor.set(proj.color || "#8B5CF6");
          projectileMeshRef.current.setColorAt(count, tempColor);
        } else if (proj.isPrism) {
          projectileMeshRef.current.setColorAt(count, prismProjColor);
        } else if (proj.color === "#22c55e" || upgrades.poison > 0) {
          projectileMeshRef.current.setColorAt(count, poisonProjColor);
        } else if (upgrades.fire > 0) {
          projectileMeshRef.current.setColorAt(count, fireProjColor);
        } else if (upgrades.frost > 0) {
          projectileMeshRef.current.setColorAt(count, frostProjColor);
        } else if (upgrades.shock > 0) {
          projectileMeshRef.current.setColorAt(count, shockProjColor);
        } else if (proj.color === "#a8ff60") {
          projectileMeshRef.current.setColorAt(count, critProjColor);
        } else {
          projectileMeshRef.current.setColorAt(count, defaultProjColor);
        }
        count++;
      }

      projectileMeshRef.current.count = count;
      if (hostileProjectileMeshRef.current) {
        hostileProjectileMeshRef.current.count = hostileCount;
      }

      if (count > 0) {
        projectileMeshRef.current.instanceMatrix.needsUpdate = true;
        if (projectileMeshRef.current.instanceColor) {
          projectileMeshRef.current.instanceColor.needsUpdate = true;
        }
      }
      if (hostileProjectileMeshRef.current && hostileCount > 0) {
        hostileProjectileMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
    // LUX: Update light lance beams lifetime and visual transforms
    for (let b = lanceBeamsRef.current.length - 1; b >= 0; b--) {
      lanceBeamsRef.current[b].life -= delta;
      if (lanceBeamsRef.current[b].life <= 0) {
        lanceBeamsRef.current.splice(b, 1);
      }
    }

    if (lanceBeamGroupRef.current) {
      const group = lanceBeamGroupRef.current;
      const beams = lanceBeamsRef.current;
      for (let i = 0; i < group.children.length; i++) {
        const mesh = group.children[i] as THREE.Mesh;
        if (i < beams.length) {
          const b = beams[i];
          mesh.visible = true;
          const midX = (b.x1 + b.x2) / 2;
          const midY = (b.y1 + b.y2) / 2;
          const midZ = (b.z1 + b.z2) / 2;
          mesh.position.set(midX, midY, midZ);
          const dx = b.x2 - b.x1;
          const dy = b.y2 - b.y1;
          const dz = b.z2 - b.z1;
          const len = Math.hypot(dx, dy, dz) || 0.1;
          mesh.scale.set(b.width, len, b.width);
          tempDir.set(dx, dy, dz).normalize();
          tempQuaternion.setFromUnitVectors(upVector, tempDir);
          mesh.quaternion.copy(tempQuaternion);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.set(b.color);
          mat.emissive.set(b.color);
          mat.opacity = b.life / b.maxLife;
          mat.transparent = true;
        } else {
          mesh.visible = false;
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

      <instancedMesh
        ref={hostileProjectileMeshRef}
        args={[projGeometry, hostileProjMaterial, MAX_PROJECTILES]}
        frustumCulled={false}
      />

      {/* Shockwaves Instanced Mesh */}
      <instancedMesh
        ref={shockwaveMeshRef}
        args={[shockGeometry, shockMaterial, MAX_SHOCKWAVES]}
        frustumCulled={false}
      />

      {/* LUX: Procedural Light Lance Beams */}
      <group ref={lanceBeamGroupRef}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <mesh key={idx} visible={false}>
            <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive="#fde68a"
              emissiveIntensity={2.5}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>

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
