import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime, HazardZone } from "../game/runtime";
import { isBossType } from "../game/progression";
import { BOSS_CONFIGS } from "../game/config";
import { useGameStore } from "../store/gameStore";
import { ASSETS } from "../config/assets";
import type { BossType } from "../types/game";

interface BossRendererProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

// Shared geometries for hazard ground representations
const hazardCircleGeo = new THREE.CircleGeometry(1, 32);
const hazardRingGeo = new THREE.RingGeometry(0.85, 1.0, 32);

// Dedicated Materials for each hazard type (fire, poison, frost) at module scope
const hazardMaterials = {
  fire: new THREE.MeshBasicMaterial({
    color: "#f97316",
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  fireRing: new THREE.MeshBasicMaterial({
    color: "#ff5722",
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  poison: new THREE.MeshBasicMaterial({
    color: "#22c55e",
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  poisonRing: new THREE.MeshBasicMaterial({
    color: "#16a34a",
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  frost: new THREE.MeshBasicMaterial({
    color: "#38bdf8",
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  frostRing: new THREE.MeshBasicMaterial({
    color: "#e0f2fe",
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
};

export const BossRenderer: React.FC<BossRendererProps> = ({ runtimeRef }) => {
  // Master Boss Group & Root
  const bossGroupRef = useRef<THREE.Group>(null);
  const modelRootRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);

  // Boss Combat Animation Part Refs
  // 1. Bonklord
  const bonkTorsoRef = useRef<THREE.Mesh>(null);
  const bonkPauldronsRef = useRef<THREE.Group>(null);
  const bonkCrownRef = useRef<THREE.Group>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);
  const bonkHammerHeadMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // 2. Cindermaw
  const cinderRockRef = useRef<THREE.Mesh>(null);
  const cinderCoreRef = useRef<THREE.Mesh>(null);
  const cinderCoreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const cinderHornsRef = useRef<THREE.Group>(null);
  const cinderSpinesRef = useRef<THREE.Group>(null);

  // 3. Stormcoil
  const coilCoreRef = useRef<THREE.Mesh>(null);
  const coilCoreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const coilRing1Ref = useRef<THREE.Group>(null);
  const coilRing2Ref = useRef<THREE.Group>(null);

  // 4. Venomatrix
  const venomThoraxRef = useRef<THREE.Mesh>(null);
  const venomSacLeftRef = useRef<THREE.Mesh>(null);
  const venomSacRightRef = useRef<THREE.Mesh>(null);
  const venomSacsMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const venomStingerRef = useRef<THREE.Mesh>(null);

  // 5. Cryovex
  const crystalSpireRef = useRef<THREE.Group>(null);
  const crystalCoreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const iceShard1Ref = useRef<THREE.Mesh>(null);
  const iceShard2Ref = useRef<THREE.Mesh>(null);
  const iceShard3Ref = useRef<THREE.Mesh>(null);

  // Attack Telegraph Group
  const telegraphGroupRef = useRef<THREE.Group>(null);
  const telegraphDiscRef = useRef<THREE.Mesh>(null);
  const telegraphRingRef = useRef<THREE.Mesh>(null);
  const telegraphRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const telegraphDiscMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Spawn Animation FX
  const spawnFxGroupRef = useRef<THREE.Group>(null);
  const spawnGroundRingRef = useRef<THREE.Mesh>(null);
  const spawnGroundRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const spawnBeamRef = useRef<THREE.Mesh>(null);
  const spawnBeamMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Death Animation FX
  const deathFxGroupRef = useRef<THREE.Group>(null);
  const deathRingRef = useRef<THREE.Mesh>(null);
  const deathRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const deathFlashRef = useRef<THREE.Mesh>(null);
  const deathFlashMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const deathShardsGroupRef = useRef<THREE.Group>(null);

  // Lifecycle state tracking (pure visual only, no gameplay timers)
  const lastBossIdRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number>(0);
  const lastBossPosRef = useRef<{ x: number; z: number; type: BossType } | null>(null);
  const deathTimerRef = useRef<number>(0);
  const deathDataRef = useRef<{ x: number; z: number; color: string; type: BossType } | null>(null);

  // Registered boss textures
  const bossTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const loadTex = (url: string) => {
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    return {
      bonklord: loadTex(ASSETS.enemies.bonklord),
      cindermaw: loadTex(ASSETS.enemies.cindermaw),
      stormcoil: loadTex(ASSETS.enemies.stormcoil),
      venomatrix: loadTex(ASSETS.enemies.venomatrix),
      cryovex: loadTex(ASSETS.enemies.cryovex),
    };
  }, []);

  // Group for active hazard zone meshes
  const hazardGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const time = state.clock.elapsedTime;

    // =========================================================================
    // 1. BOSS DETECTION & LIFECYCLE (Spawn & Death)
    // =========================================================================
    const boss = runtime.enemies.find((e) => isBossType(e.type));

    if (boss) {
      const bossType = boss.type as BossType;
      const bCfg = BOSS_CONFIGS[bossType];

      // New Boss Spawn Detection
      if (boss.id !== lastBossIdRef.current) {
        lastBossIdRef.current = boss.id;
        spawnTimerRef.current = 1.3; // 1.3s visual-only spawn animation
      }

      // Record position while alive
      lastBossPosRef.current = { x: boss.x, z: boss.z, type: bossType };

      if (bossGroupRef.current) {
        bossGroupRef.current.visible = true;
        bossGroupRef.current.position.set(boss.x, 0, boss.z);

        // Face player
        const dx = runtime.playerPosition.x - boss.x;
        const dz = runtime.playerPosition.z - boss.z;
        bossGroupRef.current.rotation.y = Math.atan2(dx, dz);
      }

      // Pulsing boss ground aura
      if (auraRef.current) {
        const pulse = 1.0 + Math.sin(time * 3.5) * 0.12;
        auraRef.current.scale.set(pulse, pulse, pulse);
        auraRef.current.rotation.z += delta * 0.5;
      }

      // =======================================================================
      // 2. SPAWN ANIMATION (65–75% scale -> 100%, ground pulse, vertical flash)
      // =======================================================================
      if (spawnTimerRef.current > 0) {
        spawnTimerRef.current = Math.max(0, spawnTimerRef.current - delta);
        const spawnProgress = 1 - spawnTimerRef.current / 1.3; // 0 to 1
        // Smooth scale: 0.7 to 1.0
        const currentScale = 0.7 + 0.3 * Math.min(1, Math.sin(spawnProgress * Math.PI * 0.5));
        if (modelRootRef.current) {
          modelRootRef.current.scale.set(currentScale, currentScale, currentScale);
        }

        if (spawnFxGroupRef.current) {
          spawnFxGroupRef.current.visible = true;
          spawnFxGroupRef.current.position.set(boss.x, 0.05, boss.z);

          // Expanding ground pulse ring
          if (spawnGroundRingRef.current && spawnGroundRingMatRef.current) {
            const ringRadius = 0.8 + spawnProgress * 3.2;
            spawnGroundRingRef.current.scale.set(ringRadius, ringRadius, 1);
            spawnGroundRingMatRef.current.color.set(bCfg.accentColor);
            spawnGroundRingMatRef.current.opacity = (1 - spawnProgress) * 0.9;
          }

          // Vertical elemental flash beam
          if (spawnBeamRef.current && spawnBeamMatRef.current) {
            const beamAlpha = Math.max(0, 1 - spawnProgress * 2.2);
            spawnBeamMatRef.current.color.set(bCfg.accentColor);
            spawnBeamMatRef.current.opacity = beamAlpha * 0.8;
            spawnBeamRef.current.scale.set(1 + spawnProgress * 0.5, 1, 1 + spawnProgress * 0.5);
          }
        }
      } else {
        if (modelRootRef.current) {
          modelRootRef.current.scale.set(1, 1, 1);
        }
        if (spawnFxGroupRef.current) {
          spawnFxGroupRef.current.visible = false;
        }
      }

      // =======================================================================
      // 3. COMBAT ANIMATIONS & ATTACK STATES
      // =======================================================================
      const cooldown = bCfg.attackCooldown;
      const attackTimer = boss.bossAttackTimer !== undefined ? boss.bossAttackTimer : cooldown;
      // Anticipation window: ~1.1s before attack fires
      const isAnticipating = attackTimer <= 1.1 && attackTimer > 0;
      const anticipationProgress = isAnticipating ? 1 - attackTimer / 1.1 : 0;
      // Recoil window: immediately after attack fires
      const isRecoiling = attackTimer > cooldown - 0.4;
      const recoilProgress = isRecoiling ? (attackTimer - (cooldown - 0.4)) / 0.4 : 0;

      // -----------------------------------------------------------------------
      // A. BONKLORD ANIMATION
      // -----------------------------------------------------------------------
      if (bossType === "bonklord") {
        const breath = Math.sin(time * 3.0) * 0.08;
        if (bonkTorsoRef.current) {
          bonkTorsoRef.current.position.y = 1.8 + breath;
          bonkTorsoRef.current.scale.set(1 + breath * 0.15, 1 - breath * 0.15, 1 + breath * 0.15);
        }
        if (bonkPauldronsRef.current) {
          bonkPauldronsRef.current.position.y = 2.4 + breath * 0.5;
        }
        if (bonkCrownRef.current) {
          bonkCrownRef.current.position.y = 3.6 + breath * 0.6;
        }

        if (weaponGroupRef.current) {
          if (isAnticipating) {
            // Hammer wind-up: raise high back with anticipation jitter
            const targetPitch = -1.6 - anticipationProgress * 0.4;
            const jitter = (Math.random() - 0.5) * anticipationProgress * 0.08;
            weaponGroupRef.current.rotation.x = targetPitch + jitter;
            weaponGroupRef.current.rotation.z = -0.2 - anticipationProgress * 0.2;
            if (bonkHammerHeadMatRef.current) {
              bonkHammerHeadMatRef.current.emissiveIntensity =
                0.5 + anticipationProgress * 2.2 + Math.sin(time * 24) * 0.4;
            }
          } else if (isRecoiling) {
            // Fast downward strike animation & heavy ground dip
            weaponGroupRef.current.rotation.x = THREE.MathUtils.lerp(
              weaponGroupRef.current.rotation.x,
              1.35,
              delta * 22
            );
            if (bossGroupRef.current) {
              bossGroupRef.current.position.y = -0.25 * recoilProgress;
            }
            if (bonkHammerHeadMatRef.current) {
              bonkHammerHeadMatRef.current.emissiveIntensity = 2.5 * recoilProgress;
            }
          } else {
            // Idle sway
            weaponGroupRef.current.rotation.x = THREE.MathUtils.lerp(
              weaponGroupRef.current.rotation.x,
              0.4 + Math.sin(time * 2.2) * 0.12,
              delta * 6
            );
            weaponGroupRef.current.rotation.z = -0.2 + Math.cos(time * 2.0) * 0.05;
            if (bonkHammerHeadMatRef.current) {
              bonkHammerHeadMatRef.current.emissiveIntensity = 0.5;
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // B. CINDERMAW ANIMATION
      // -----------------------------------------------------------------------
      if (bossType === "cindermaw") {
        const volcanicBreath = Math.sin(time * 2.0) * 0.09;
        if (cinderRockRef.current) {
          cinderRockRef.current.scale.set(
            1 + volcanicBreath * 0.25,
            1 - volcanicBreath * 0.2,
            1 + volcanicBreath * 0.25
          );
        }

        if (cinderCoreRef.current) {
          const coreBreathe = 1.0 + Math.sin(time * 3.0) * 0.12;
          const chargeExpansion = isAnticipating ? 1.0 + anticipationProgress * 0.4 : 1.0;
          const s = coreBreathe * chargeExpansion;
          cinderCoreRef.current.scale.set(s, s, s);
        }

        if (cinderCoreMatRef.current) {
          if (isAnticipating) {
            cinderCoreMatRef.current.emissiveIntensity =
              1.8 + anticipationProgress * 2.4 + (Math.sin(time * 18) > 0 ? 0.5 : -0.2);
          } else if (isRecoiling) {
            cinderCoreMatRef.current.emissiveIntensity = 3.8 * recoilProgress;
          } else {
            cinderCoreMatRef.current.emissiveIntensity = 1.8;
          }
        }

        if (cinderSpinesRef.current && isAnticipating) {
          cinderSpinesRef.current.rotation.x =
            -0.6 + Math.sin(time * 16) * 0.12 * anticipationProgress;
        }

        // Recoil on attack
        if (bossGroupRef.current && isRecoiling) {
          bossGroupRef.current.rotation.x = -0.25 * recoilProgress;
        }
      }

      // -----------------------------------------------------------------------
      // C. STORMCOIL ANIMATION
      // -----------------------------------------------------------------------
      if (bossType === "stormcoil") {
        // Rings acceleration while charging
        const speedMult = isAnticipating ? 1.0 + anticipationProgress * 4.0 : 1.0;
        if (coilRing1Ref.current) {
          coilRing1Ref.current.rotation.x += delta * 2.2 * speedMult;
          coilRing1Ref.current.rotation.y += delta * 1.5 * speedMult;
        }
        if (coilRing2Ref.current) {
          coilRing2Ref.current.rotation.y -= delta * 2.5 * speedMult;
          coilRing2Ref.current.rotation.z += delta * 1.8 * speedMult;
        }

        // Core contracts then flashes before radial discharge
        if (coilCoreRef.current) {
          if (isAnticipating) {
            const contraction = 1.0 - anticipationProgress * 0.35;
            coilCoreRef.current.scale.set(contraction, contraction, contraction);
          } else if (isRecoiling) {
            coilCoreRef.current.scale.set(1.3, 1.3, 1.3);
          } else {
            coilCoreRef.current.scale.set(1.0, 1.0, 1.0);
          }
        }

        if (coilCoreMatRef.current) {
          if (isAnticipating) {
            coilCoreMatRef.current.emissiveIntensity =
              2.0 + (anticipationProgress > 0.8 ? 2.8 : anticipationProgress * 1.6);
          } else if (isRecoiling) {
            coilCoreMatRef.current.emissiveIntensity = 4.2 * recoilProgress;
          } else {
            coilCoreMatRef.current.emissiveIntensity = 2.0;
          }
        }
      }

      // -----------------------------------------------------------------------
      // D. VENOMATRIX ANIMATION
      // -----------------------------------------------------------------------
      if (bossType === "venomatrix") {
        const venomBreath = Math.sin(time * 3.2) * 0.08;
        if (venomThoraxRef.current) {
          venomThoraxRef.current.position.y = 1.5 + venomBreath;
          if (isRecoiling) {
            venomThoraxRef.current.rotation.z = Math.sin(time * 35) * 0.14 * recoilProgress;
          } else {
            venomThoraxRef.current.rotation.z = Math.sin(time * 2.2) * 0.04;
          }
        }

        // Venom sacs swelling during attack anticipation
        if (venomSacLeftRef.current && venomSacRightRef.current) {
          const baseSac = 1.0 + Math.sin(time * 2.5) * 0.08;
          const sacScale = isAnticipating
            ? baseSac + anticipationProgress * 0.5 + Math.sin(time * 14) * 0.07
            : baseSac;
          venomSacLeftRef.current.scale.set(sacScale, sacScale, sacScale);
          venomSacRightRef.current.scale.set(sacScale, sacScale, sacScale);
        }

        if (venomSacsMatRef.current) {
          if (isAnticipating) {
            venomSacsMatRef.current.emissiveIntensity = 1.6 + anticipationProgress * 2.2;
          } else {
            venomSacsMatRef.current.emissiveIntensity = 1.6;
          }
        }

        if (venomStingerRef.current) {
          if (isAnticipating) {
            venomStingerRef.current.rotation.x = -0.5 - anticipationProgress * 0.55;
          } else if (isRecoiling) {
            venomStingerRef.current.rotation.x = 0.25 * recoilProgress;
          } else {
            venomStingerRef.current.rotation.x = -0.5 + Math.sin(time * 2.5) * 0.1;
          }
        }
      }

      // -----------------------------------------------------------------------
      // E. CRYOVEX ANIMATION
      // -----------------------------------------------------------------------
      if (bossType === "cryovex") {
        if (crystalSpireRef.current) {
          crystalSpireRef.current.position.y = 1.8 + Math.sin(time * 2.2) * 0.18;
          crystalSpireRef.current.rotation.y += delta * 0.8;
          crystalSpireRef.current.rotation.z = Math.sin(time * 1.5) * 0.05;
        }

        // Orbiting ice shards draw inward during charge, burst outward on release
        const orbitSpeed = isAnticipating ? 2.5 + anticipationProgress * 5.0 : 2.0;
        const orbitRadius = isAnticipating
          ? THREE.MathUtils.lerp(1.4, 0.45, anticipationProgress)
          : isRecoiling
          ? 1.4 + 0.8 * recoilProgress
          : 1.4;

        if (iceShard1Ref.current) {
          const a1 = time * orbitSpeed;
          iceShard1Ref.current.position.set(Math.cos(a1) * orbitRadius, 0.5, Math.sin(a1) * orbitRadius);
          iceShard1Ref.current.rotation.x += delta * 3.0;
          iceShard1Ref.current.rotation.y += delta * 2.0;
        }
        if (iceShard2Ref.current) {
          const a2 = time * orbitSpeed + (Math.PI * 2) / 3;
          iceShard2Ref.current.position.set(Math.cos(a2) * orbitRadius, -0.4, Math.sin(a2) * orbitRadius);
          iceShard2Ref.current.rotation.y -= delta * 3.5;
        }
        if (iceShard3Ref.current) {
          const a3 = time * orbitSpeed + (Math.PI * 4) / 3;
          iceShard3Ref.current.position.set(Math.cos(a3) * orbitRadius, 0.7, Math.sin(a3) * orbitRadius);
          iceShard3Ref.current.rotation.z += delta * 2.8;
        }

        if (crystalCoreMatRef.current) {
          if (isAnticipating) {
            crystalCoreMatRef.current.emissiveIntensity = 1.4 + anticipationProgress * 2.4;
          } else if (isRecoiling) {
            crystalCoreMatRef.current.emissiveIntensity = 3.6 * recoilProgress;
          } else {
            crystalCoreMatRef.current.emissiveIntensity = 1.4;
          }
        }
      }

      // =======================================================================
      // 4. ANIMATED ATTACK TELEGRAPH (Anticipation -> Attack -> Disappearance)
      // =======================================================================
      if (telegraphGroupRef.current) {
        if (isAnticipating) {
          telegraphGroupRef.current.visible = true;
          telegraphGroupRef.current.position.set(boss.x, 0.04, boss.z);

          // Max telegraph radiuses per boss archetype
          const maxRadius =
            bossType === "bonklord"
              ? 8.0
              : bossType === "cindermaw"
              ? 7.5
              : bossType === "stormcoil"
              ? 5.5
              : bossType === "venomatrix"
              ? 4.5
              : 7.0;

          const currentRadius = 1.0 + (maxRadius - 1.0) * anticipationProgress;

          if (telegraphDiscRef.current && telegraphDiscMatRef.current) {
            telegraphDiscRef.current.scale.set(currentRadius, currentRadius, 1);
            telegraphDiscMatRef.current.color.set(bCfg.accentColor);
            telegraphDiscMatRef.current.opacity = 0.2 + anticipationProgress * 0.45;
          }

          if (telegraphRingRef.current && telegraphRingMatRef.current) {
            telegraphRingRef.current.scale.set(currentRadius, currentRadius, 1);
            telegraphRingMatRef.current.color.set(bCfg.accentColor);
            telegraphRingMatRef.current.opacity = 0.5 + anticipationProgress * 0.45;
            telegraphRingRef.current.rotation.z += delta * 3.5;
          }
        } else {
          telegraphGroupRef.current.visible = false;
        }
      }
    } else {
      // No active boss
      if (bossGroupRef.current) bossGroupRef.current.visible = false;
      if (telegraphGroupRef.current) telegraphGroupRef.current.visible = false;
      if (spawnFxGroupRef.current) spawnFxGroupRef.current.visible = false;

      // Boss Disappearance / Death Event Trigger
      if (lastBossPosRef.current) {
        deathDataRef.current = {
          x: lastBossPosRef.current.x,
          z: lastBossPosRef.current.z,
          type: lastBossPosRef.current.type,
          color: BOSS_CONFIGS[lastBossPosRef.current.type].accentColor,
        };
        deathTimerRef.current = 1.1; // 1.1s death sequence
        lastBossPosRef.current = null;
        lastBossIdRef.current = null;
      }
    }

    // =========================================================================
    // 5. BOSS DEATH ANIMATION (Flash, Expanding Ring, Shard Collapse)
    // =========================================================================
    if (deathTimerRef.current > 0) {
      deathTimerRef.current = Math.max(0, deathTimerRef.current - delta);
      const dp = 1 - deathTimerRef.current / 1.1; // 0 to 1

      if (deathFxGroupRef.current && deathDataRef.current) {
        deathFxGroupRef.current.visible = true;
        deathFxGroupRef.current.position.set(deathDataRef.current.x, 0.05, deathDataRef.current.z);

        // Outward expanding shock ring
        if (deathRingRef.current && deathRingMatRef.current) {
          const ringRad = 1.0 + dp * 6.5;
          deathRingRef.current.scale.set(ringRad, ringRad, 1);
          deathRingMatRef.current.color.set(deathDataRef.current.color);
          deathRingMatRef.current.opacity = Math.max(0, (1 - dp) * 0.9);
        }

        // Central elemental flash sphere
        if (deathFlashRef.current && deathFlashMatRef.current) {
          const flashRad = 1.0 + dp * 2.8;
          deathFlashRef.current.scale.set(flashRad, flashRad, flashRad);
          deathFlashMatRef.current.color.set(deathDataRef.current.color);
          deathFlashMatRef.current.opacity = Math.max(0, 1 - dp * 2.8);
        }

        // Collapsing identity burst shards
        if (deathShardsGroupRef.current) {
          const shards = deathShardsGroupRef.current.children;
          for (let s = 0; s < shards.length; s++) {
            const angle = (s / shards.length) * Math.PI * 2;
            const dist = (0.8 + dp * 2.2);
            shards[s].position.set(Math.cos(angle) * dist, 1.2 - dp * 1.2, Math.sin(angle) * dist);
            shards[s].scale.setScalar(Math.max(0.01, 1 - dp));
            shards[s].rotation.x += delta * 5.0;
            shards[s].rotation.y += delta * 4.0;
          }
        }
      }
    } else {
      if (deathFxGroupRef.current) {
        deathFxGroupRef.current.visible = false;
      }
    }

    // =========================================================================
    // 6. HAZARD ZONES (Correct Visual Identity: Fire, Poison, Frost)
    // =========================================================================
    if (hazardGroupRef.current) {
      const hazards = runtime.hazardZones;
      const slots = hazardGroupRef.current.children;

      for (let i = 0; i < slots.length; i++) {
        const slotGroup = slots[i] as THREE.Group;
        if (i < hazards.length) {
          const hz: HazardZone = hazards[i];
          slotGroup.visible = true;
          slotGroup.position.set(hz.x, 0.04, hz.z);
          const currentScale = hz.radius;
          slotGroup.scale.set(currentScale, currentScale, currentScale);

          // Sub-groups: child 0 = fire, child 1 = poison, child 2 = frost
          const fireGrp = slotGroup.children[0] as THREE.Group;
          const poisonGrp = slotGroup.children[1] as THREE.Group;
          const frostGrp = slotGroup.children[2] as THREE.Group;

          fireGrp.visible = hz.type === "fire";
          poisonGrp.visible = hz.type === "poison";
          frostGrp.visible = hz.type === "frost";

          // Rotating tactical edge
          slotGroup.rotation.z += delta * 0.4;
        } else {
          slotGroup.visible = false;
        }
      }
    }
  });

  const activeBossType: BossType = (useGameStore((s) => s.bossType) as BossType) || "bonklord";

  return (
    <group>
      {/* ------------------------------------------------------------- */}
      {/* ATTACK TELEGRAPH (Anticipation Ground Ring & Disc)             */}
      {/* ------------------------------------------------------------- */}
      <group ref={telegraphGroupRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={telegraphDiscRef}>
          <circleGeometry args={[1, 36]} />
          <meshBasicMaterial
            ref={telegraphDiscMatRef}
            color="#e11d48"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={telegraphRingRef} position={[0, 0, 0.01]}>
          <ringGeometry args={[0.9, 1.0, 36]} />
          <meshBasicMaterial
            ref={telegraphRingMatRef}
            color="#e11d48"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* SPAWN ANIMATION FX (Ground Pulse & Vertical Beam)              */}
      {/* ------------------------------------------------------------- */}
      <group ref={spawnFxGroupRef} visible={false}>
        {/* Ground Pulse Ring */}
        <mesh ref={spawnGroundRingRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 1.0, 36]} />
          <meshBasicMaterial
            ref={spawnGroundRingMatRef}
            color="#e11d48"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Vertical Elemental Beam */}
        <mesh ref={spawnBeamRef} position={[0, 5, 0]}>
          <cylinderGeometry args={[0.8, 1.4, 10, 16, 1, true]} />
          <meshBasicMaterial
            ref={spawnBeamMatRef}
            color="#e11d48"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* DEATH ANIMATION FX (Shock Ring, Flash Sphere, Debris Shards)   */}
      {/* ------------------------------------------------------------- */}
      <group ref={deathFxGroupRef} visible={false}>
        <mesh ref={deathRingRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.0, 36]} />
          <meshBasicMaterial
            ref={deathRingMatRef}
            color="#e11d48"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={deathFlashRef} position={[0, 1.5, 0]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            ref={deathFlashMatRef}
            color="#e11d48"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <group ref={deathShardsGroupRef} position={[0, 0, 0]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[0, 1, 0]}>
              <octahedronGeometry args={[0.25, 0]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* DYNAMIC BOSS HIERARCHY                                        */}
      {/* ------------------------------------------------------------- */}
      <group ref={bossGroupRef} visible={false}>
        {/* Ground Fiery/Elemental Aura */}
        <mesh ref={auraRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.5, 36]} />
          <meshBasicMaterial
            color={
              activeBossType === "cindermaw"
                ? "#f97316"
                : activeBossType === "stormcoil"
                ? "#00e5ff"
                : activeBossType === "venomatrix"
                ? "#22c55e"
                : activeBossType === "cryovex"
                ? "#38bdf8"
                : "#e11d48"
            }
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Model Root for smooth Spawn & Breathing scaling */}
        <group ref={modelRootRef}>
          {/* ----------------------------------------------------------- */}
          {/* 1. BONKLORD MODEL                                           */}
          {/* ----------------------------------------------------------- */}
          {activeBossType === "bonklord" && (
            <group position={[0, 0, 0]}>
              {/* Massive Obsidian Torso */}
              <mesh ref={bonkTorsoRef} castShadow position={[0, 1.8, 0]}>
                <capsuleGeometry args={[1.3, 1.5, 8, 16]} />
                <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
              </mesh>

              {/* Heavy Golden Shoulder Pauldrons */}
              <group ref={bonkPauldronsRef} position={[0, 0, 0]}>
                <mesh castShadow position={[-1.5, 2.4, 0]} rotation={[0, 0, 0.4]}>
                  <boxGeometry args={[0.8, 0.6, 1.1]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
                </mesh>
                <mesh castShadow position={[1.5, 2.4, 0]} rotation={[0, 0, -0.4]}>
                  <boxGeometry args={[0.8, 0.6, 1.1]} />
                  <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
                </mesh>
              </group>

              {/* 5-Spire Royal Golden Crown */}
              <group ref={bonkCrownRef} position={[0, 3.6, 0]}>
                <mesh position={[0, 0.4, 0]}>
                  <coneGeometry args={[0.3, 0.9, 6]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
                </mesh>
                <mesh position={[-0.45, 0.25, 0]}>
                  <coneGeometry args={[0.2, 0.6, 5]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
                </mesh>
                <mesh position={[0.45, 0.25, 0]}>
                  <coneGeometry args={[0.2, 0.6, 5]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
                </mesh>
              </group>

              {/* Glowing Face Emblem Decal */}
              <mesh position={[0, 2.2, 1.1]}>
                <planeGeometry args={[1.5, 1.5]} />
                <meshBasicMaterial
                  map={bossTextures.bonklord}
                  transparent
                  alphaTest={0.1}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Massive Legendary Bonk Warhammer */}
              <group ref={weaponGroupRef} position={[1.9, 1.6, 0.5]} rotation={[0.4, 0, -0.2]}>
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[0.12, 0.12, 3.2, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.8} />
                </mesh>
                <mesh position={[0, 1.4, 0]}>
                  <boxGeometry args={[1.3, 1.1, 1.1]} />
                  <meshStandardMaterial
                    ref={bonkHammerHeadMatRef}
                    color="#e11d48"
                    roughness={0.2}
                    metalness={0.85}
                    emissive="#881337"
                    emissiveIntensity={0.5}
                  />
                </mesh>
              </group>
            </group>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 2. CINDERMAW MODEL                                          */}
          {/* ----------------------------------------------------------- */}
          {activeBossType === "cindermaw" && (
            <group position={[0, 0, 0]}>
              {/* Volcanic Magma Rock Core */}
              <mesh ref={cinderRockRef} castShadow position={[0, 1.7, 0]}>
                <dodecahedronGeometry args={[1.4, 1]} />
                <meshStandardMaterial color="#1c1917" roughness={0.8} metalness={0.3} />
              </mesh>

              {/* Glowing Internal Molten Lava Core */}
              <mesh ref={cinderCoreRef} position={[0, 1.7, 0]}>
                <sphereGeometry args={[1.1, 16, 16]} />
                <meshStandardMaterial
                  ref={cinderCoreMatRef}
                  color="#ff5722"
                  emissive="#f97316"
                  emissiveIntensity={1.8}
                  roughness={0.2}
                />
              </mesh>

              {/* Molten Volcanic Horns */}
              <group ref={cinderHornsRef} position={[0, 0, 0]}>
                <mesh position={[-0.9, 2.9, 0.3]} rotation={[0.2, 0, 0.6]}>
                  <coneGeometry args={[0.35, 1.4, 6]} />
                  <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.2} />
                </mesh>
                <mesh position={[0.9, 2.9, 0.3]} rotation={[0.2, 0, -0.6]}>
                  <coneGeometry args={[0.35, 1.4, 6]} />
                  <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.2} />
                </mesh>
              </group>

              {/* Burning Spines along Back */}
              <group ref={cinderSpinesRef} position={[0, 0, 0]}>
                <mesh position={[0, 2.7, -0.8]} rotation={[-0.6, 0, 0]}>
                  <coneGeometry args={[0.3, 0.9, 5]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} />
                </mesh>
                <mesh position={[0, 1.9, -1.1]} rotation={[-0.7, 0, 0]}>
                  <coneGeometry args={[0.25, 0.8, 5]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} />
                </mesh>
              </group>

              {/* Face Decal Emblem */}
              <mesh position={[0, 1.9, 1.25]}>
                <planeGeometry args={[1.4, 1.4]} />
                <meshBasicMaterial map={bossTextures.cindermaw} transparent alphaTest={0.1} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 3. STORMCOIL MODEL                                          */}
          {/* ----------------------------------------------------------- */}
          {activeBossType === "stormcoil" && (
            <group position={[0, 0, 0]}>
              {/* Levitating High-Voltage Core */}
              <mesh ref={coilCoreRef} castShadow position={[0, 2.0, 0]}>
                <octahedronGeometry args={[0.9, 2]} />
                <meshStandardMaterial
                  ref={coilCoreMatRef}
                  color="#00e5ff"
                  emissive="#06b6d4"
                  emissiveIntensity={2.0}
                  roughness={0.1}
                  metalness={0.9}
                />
              </mesh>

              {/* Rotating Outer Gyroscopic Coil Ring 1 */}
              <group ref={coilRing1Ref} position={[0, 2.0, 0]}>
                <mesh>
                  <torusGeometry args={[1.7, 0.12, 12, 32]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} emissive="#00e5ff" emissiveIntensity={0.6} />
                </mesh>
                <mesh position={[1.7, 0, 0]}>
                  <boxGeometry args={[0.3, 0.5, 0.3]} />
                  <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} />
                </mesh>
                <mesh position={[-1.7, 0, 0]}>
                  <boxGeometry args={[0.3, 0.5, 0.3]} />
                  <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} />
                </mesh>
              </group>

              {/* Rotating Counter-Ring 2 */}
              <group ref={coilRing2Ref} position={[0, 2.0, 0]}>
                <mesh>
                  <torusGeometry args={[1.3, 0.1, 12, 32]} />
                  <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.15} />
                </mesh>
              </group>

              {/* Decal */}
              <mesh position={[0, 2.0, 1.1]}>
                <planeGeometry args={[1.3, 1.3]} />
                <meshBasicMaterial map={bossTextures.stormcoil} transparent alphaTest={0.1} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 4. VENOMATRIX MODEL                                         */}
          {/* ----------------------------------------------------------- */}
          {activeBossType === "venomatrix" && (
            <group position={[0, 0, 0]}>
              {/* Chitinous Armored Thorax */}
              <mesh ref={venomThoraxRef} castShadow position={[0, 1.5, 0]}>
                <capsuleGeometry args={[1.0, 1.2, 8, 16]} />
                <meshStandardMaterial color="#064e3b" roughness={0.35} metalness={0.6} />
              </mesh>

              {/* Luminescent Green Venom Sacs */}
              <mesh ref={venomSacLeftRef} position={[-0.8, 1.8, -0.4]}>
                <sphereGeometry args={[0.55, 12, 12]} />
                <meshStandardMaterial
                  ref={venomSacsMatRef}
                  color="#22c55e"
                  emissive="#10b981"
                  emissiveIntensity={1.6}
                  roughness={0.2}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              <mesh ref={venomSacRightRef} position={[0.8, 1.8, -0.4]}>
                <sphereGeometry args={[0.55, 12, 12]} />
                <meshStandardMaterial
                  color="#22c55e"
                  emissive="#10b981"
                  emissiveIntensity={1.6}
                  roughness={0.2}
                  transparent
                  opacity={0.9}
                />
              </mesh>

              {/* Poison Stinger Tail */}
              <mesh ref={venomStingerRef} position={[0, 2.6, -0.9]} rotation={[-0.5, 0, 0]}>
                <coneGeometry args={[0.35, 1.3, 6]} />
                <meshStandardMaterial color="#84cc16" emissive="#65a30d" emissiveIntensity={1.2} />
              </mesh>

              {/* Decal */}
              <mesh position={[0, 1.8, 1.1]}>
                <planeGeometry args={[1.4, 1.4]} />
                <meshBasicMaterial map={bossTextures.venomatrix} transparent alphaTest={0.1} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}

          {/* ----------------------------------------------------------- */}
          {/* 5. CRYOVEX MODEL                                            */}
          {/* ----------------------------------------------------------- */}
          {activeBossType === "cryovex" && (
            <group ref={crystalSpireRef} position={[0, 1.8, 0]}>
              {/* Towering Glacial Crystal Core */}
              <mesh castShadow>
                <cylinderGeometry args={[0.2, 1.1, 2.6, 6]} />
                <meshStandardMaterial
                  ref={crystalCoreMatRef}
                  color="#38bdf8"
                  emissive="#0284c7"
                  emissiveIntensity={1.4}
                  roughness={0.1}
                  metalness={0.9}
                />
              </mesh>

              {/* Orbiting Ice Shards */}
              <mesh ref={iceShard1Ref} position={[1.4, 0.5, 0]} rotation={[0.4, 0.4, 0]}>
                <octahedronGeometry args={[0.35, 0]} />
                <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={1.2} />
              </mesh>
              <mesh ref={iceShard2Ref} position={[-1.4, -0.4, 0]} rotation={[0.2, -0.4, 0.3]}>
                <octahedronGeometry args={[0.35, 0]} />
                <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={1.2} />
              </mesh>
              <mesh ref={iceShard3Ref} position={[0, 0.8, -1.3]} rotation={[0.5, 0, 0.5]}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={1.2} />
              </mesh>

              {/* Decal */}
              <mesh position={[0, 0.2, 0.95]}>
                <planeGeometry args={[1.4, 1.4]} />
                <meshBasicMaterial map={bossTextures.cryovex} transparent alphaTest={0.1} side={THREE.DoubleSide} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* PERSISTENT HAZARD POOLS (Dedicated Fire, Poison, Frost groups) */}
      {/* ------------------------------------------------------------- */}
      <group ref={hazardGroupRef}>
        {Array.from({ length: 12 }).map((_, index) => (
          <group key={index} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            {/* Fire Hazard Group */}
            <group visible={false}>
              <mesh geometry={hazardCircleGeo} material={hazardMaterials.fire} />
              <mesh geometry={hazardRingGeo} material={hazardMaterials.fireRing} position={[0, 0, 0.01]} />
            </group>

            {/* Poison Hazard Group */}
            <group visible={false}>
              <mesh geometry={hazardCircleGeo} material={hazardMaterials.poison} />
              <mesh geometry={hazardRingGeo} material={hazardMaterials.poisonRing} position={[0, 0, 0.01]} />
            </group>

            {/* Frost Hazard Group */}
            <group visible={false}>
              <mesh geometry={hazardCircleGeo} material={hazardMaterials.frost} />
              <mesh geometry={hazardRingGeo} material={hazardMaterials.frostRing} position={[0, 0, 0.01]} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};
