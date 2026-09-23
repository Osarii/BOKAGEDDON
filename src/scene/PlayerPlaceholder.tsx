import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, CapsuleCollider } from "@react-three/rapier";
import { useGameStore } from "../store/gameStore";
import { CHARACTER_BASE_SPEEDS, ARENA_BOUNDARY_LIMIT, WEAPON_CONFIGS } from "../game/config";
import { spawnStatusParticle, type GameRuntime } from "../game/runtime";
import type { WeaponType } from "../types/game";

interface PlayerPlaceholderProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const defaultBlackColor = new THREE.Color("#000000");

// Attack animation phase durations (seconds)
const ATTACK_TIMINGS: Record<string, { anticipation: number; release: number; recovery: number }> = {
  bonk: { anticipation: 0.22, release: 0.16, recovery: 0.24 },
  byte: { anticipation: 0.10, release: 0.08, recovery: 0.10 },
  tank: { anticipation: 0.20, release: 0.15, recovery: 0.22 },
  nova: { anticipation: 0.20, release: 0.16, recovery: 0.22 },
  hex: { anticipation: 0.18, release: 0.14, recovery: 0.20 },
  rift: { anticipation: 0.16, release: 0.12, recovery: 0.18 },
  fuse: { anticipation: 0.24, release: 0.18, recovery: 0.26 },
  lux: { anticipation: 0.08, release: 0.06, recovery: 0.08 },
};

export const PlayerPlaceholder: React.FC<PlayerPlaceholderProps> = ({
  runtimeRef,
}) => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const modelAnchorRef = useRef<THREE.Group>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);

  // Procedural attack release VFX groups
  const bonkArcGroupRef = useRef<THREE.Group>(null);
  const bytePulseGroupRef = useRef<THREE.Group>(null);
  const tankCleaveGroupRef = useRef<THREE.Group>(null);
  const novaRingGroupRef = useRef<THREE.Group>(null);
  const hexTrailGroupRef = useRef<THREE.Group>(null);
  const riftArcGroupRef = useRef<THREE.Group>(null);
  const fuseDeployGroupRef = useRef<THREE.Group>(null);
  const luxFlashGroupRef = useRef<THREE.Group>(null);

  // References for dynamic hit-flash material tints
  const flashMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // High-frequency input state kept in ref to prevent React re-renders
  const keysRef = useRef<Record<string, boolean>>({});
  const lastFacingRef = useRef<number>(0);
  const walkCycleRef = useRef<number>(0);
  const animTimeRef = useRef<number>(0);

  // Attack cycle state tracking
  const prevAttackTimerRef = useRef<number>(0);
  const releaseTimerRef = useRef<number>(0);
  const recoveryTimerRef = useRef<number>(0);

  // Damage reaction state tracking
  const prevInvulnTimerRef = useRef<number>(0);
  const hitReactionTimerRef = useRef<number>(0);

  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId) || "bonk";

  // Reset registered flash materials when switching character
  useEffect(() => {
    flashMaterialsRef.current = [];
  }, [selectedCharacterId]);

  // Setup keyboard input listeners with blur protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      keysRef.current[e.code] = true;
      keysRef.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Frame-rate independent movement and visual animation loop
  useFrame((_state, delta) => {
    if (!bodyRef.current) return;

    const runtime = runtimeRef.current;
    const gameStatus = useGameStore.getState().gameStatus;

    // Halt physics velocity when paused / level-up / game over
    if (gameStatus !== "playing") {
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const upgrades = useGameStore.getState().upgrades;
    const baseSpeed = CHARACTER_BASE_SPEEDS[selectedCharacterId] || 5.0;

    // Frost slowdown presentation & runtime tracking
    const isSlowed = !!(runtime && runtime.playerSlowTimer > 0);
    if (runtime && isSlowed) {
      runtime.playerSlowTimer = Math.max(0, runtime.playerSlowTimer - delta);
      if (runtime.playerSlowTimer === 0) {
        runtime.playerSlowFactor = 1.0;
      } else if (Math.random() < 0.12) {
        // Subtle chill motes trailing behind slowed player
        spawnStatusParticle(
          runtime,
          "frost",
          runtime.playerPosition.x + (Math.random() - 0.5) * 0.5,
          0.3,
          runtime.playerPosition.z + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          0.2,
          (Math.random() - 0.5) * 0.3,
          "#38bdf8",
          0.1,
          0.35
        );
      }
    }

    // Preserve existing gameplay slow value
    const slowFactor = isSlowed && runtime ? runtime.playerSlowFactor : 1.0;
    const speed = baseSpeed * (1 + (upgrades.speed || 0) * 0.10) * slowFactor;

    // Animation cadence reduction during active frost slow
    const cadenceMultiplier = isSlowed ? Math.max(0.45, slowFactor) : 1.0;
    const animDelta = delta * cadenceMultiplier;
    animTimeRef.current += animDelta;
    const animTime = animTimeRef.current;

    const keys = keysRef.current;

    // Read directional inputs
    const isUp = keys["KeyW"] || keys["ArrowUp"] || keys["w"];
    const isDown = keys["KeyS"] || keys["ArrowDown"] || keys["s"];
    const isLeft = keys["KeyA"] || keys["ArrowLeft"] || keys["a"];
    const isRight = keys["KeyD"] || keys["ArrowRight"] || keys["d"];

    let moveX = 0;
    let moveZ = 0;

    if (isRight) moveX += 1;
    if (isLeft) moveX -= 1;
    if (isDown) moveZ += 1;
    if (isUp) moveZ -= 1;

    // Normalize diagonal movement
    const inputLength = Math.hypot(moveX, moveZ);
    if (inputLength > 0) {
      moveX /= inputLength;
      moveZ /= inputLength;
    }

    // Circular arena boundary tangential projection:
    // Glides smoothly along perimeter without vibrating or snapping.
    const currentPos = bodyRef.current.translation();
    const distanceFromCenter = Math.hypot(currentPos.x, currentPos.z);

    if (distanceFromCenter >= ARENA_BOUNDARY_LIMIT - 0.15 && inputLength > 0) {
      const nx = currentPos.x / (distanceFromCenter || 1);
      const nz = currentPos.z / (distanceFromCenter || 1);
      const outward = moveX * nx + moveZ * nz;
      if (outward > 0) {
        moveX -= outward * nx;
        moveZ -= outward * nz;
      }
    }

    // Set linear velocity in Rapier while preserving vertical gravity
    const currentLinvel = bodyRef.current.linvel();
    bodyRef.current.setLinvel(
      {
        x: moveX * speed,
        y: currentLinvel.y,
        z: moveZ * speed,
      },
      true
    );

    // Hard boundary safety clamp (only applied if external forces push beyond limit)
    if (distanceFromCenter > ARENA_BOUNDARY_LIMIT) {
      const clampFactor = ARENA_BOUNDARY_LIMIT / distanceFromCenter;
      bodyRef.current.setTranslation(
        {
          x: currentPos.x * clampFactor,
          y: currentPos.y,
          z: currentPos.z * clampFactor,
        },
        true
      );
    }

    // Update shared player world position in GameRuntime
    if (runtime) {
      const translation = bodyRef.current.translation();
      runtime.playerPosition.set(translation.x, translation.y, translation.z);
    }

    // Smooth rotation towards movement direction (persists last facing when stopped)
    if (inputLength > 0) {
      lastFacingRef.current = Math.atan2(moveX, moveZ);
      walkCycleRef.current += animDelta * speed * 2.8;
    }

    if (meshGroupRef.current) {
      let diff = lastFacingRef.current - meshGroupRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const t = 1 - Math.exp(-15 * Math.min(delta, 0.1));
      meshGroupRef.current.rotation.y += diff * t;
    }

    // =========================================================================
    // Attack Cycle Detection & Phase Calculations
    // =========================================================================
    const timing = ATTACK_TIMINGS[selectedCharacterId] || ATTACK_TIMINGS.bonk;
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
    const passives = useGameStore.getState().passives;
    const hasteMultiplier =
      (1 + (upgrades.haste || 0) * 0.15) *
      (1 + (passives.overclock_core || 0) * 0.15);
    const effectiveCooldown = weaponConfig.baseCooldown / hasteMultiplier;
    const anticipationDuration = Math.min(timing.anticipation, effectiveCooldown * 0.4);

    if (runtime) {
      // Attack trigger: CombatManager resets lastAttackTimer to 0 upon attack launch
      if (runtime.lastAttackTimer < prevAttackTimerRef.current && prevAttackTimerRef.current > 0.05) {
        releaseTimerRef.current = timing.release;
        recoveryTimerRef.current = timing.recovery;
      }
      prevAttackTimerRef.current = runtime.lastAttackTimer;
    }

    let attackPhase: "idle" | "movement" | "anticipation" | "release" | "recovery";
    let phaseProgress: number;

    if (releaseTimerRef.current > 0) {
      releaseTimerRef.current -= delta;
      attackPhase = "release";
      phaseProgress = 1 - Math.max(0, releaseTimerRef.current) / timing.release;
    } else if (recoveryTimerRef.current > 0) {
      recoveryTimerRef.current -= delta;
      attackPhase = "recovery";
      phaseProgress = 1 - Math.max(0, recoveryTimerRef.current) / timing.recovery;
    } else if (runtime && effectiveCooldown - runtime.lastAttackTimer <= anticipationDuration) {
      attackPhase = "anticipation";
      phaseProgress = 1 - Math.max(0, effectiveCooldown - runtime.lastAttackTimer) / anticipationDuration;
    } else {
      attackPhase = inputLength > 0 ? "movement" : "idle";
      phaseProgress = 0;
    }

    // =========================================================================
    // Damage Reaction System (Squash, Visual Kick & Flash)
    // =========================================================================
    const currentInvuln = runtime ? runtime.playerInvulnerableTimer : 0;
    if (currentInvuln > prevInvulnTimerRef.current + 0.25) {
      hitReactionTimerRef.current = 0.32;
    }
    prevInvulnTimerRef.current = currentInvuln;

    let hitSquashY = 1.0;
    let hitBulgeXZ = 1.0;
    let hitKickZ = 0;

    if (hitReactionTimerRef.current > 0) {
      hitReactionTimerRef.current -= delta;
      const hitProgress = 1 - Math.max(0, hitReactionTimerRef.current) / 0.32;
      if (hitProgress < 0.35) {
        // Rapid squash & visual recoil kick backward
        const t = hitProgress / 0.35;
        hitSquashY = 0.76 + t * 0.15;
        hitBulgeXZ = 1.18 - t * 0.1;
        hitKickZ = -0.18 * (1 - t);
      } else {
        // Smooth exponential recovery to neutral stance
        const t = (hitProgress - 0.35) / 0.65;
        hitSquashY = 0.91 + t * 0.09;
        hitBulgeXZ = 1.08 - t * 0.08;
        hitKickZ = -0.05 * (1 - t);
      }
    }

    // =========================================================================
    // Playable Character Distinct Procedural Motion Languages
    // =========================================================================
    if (modelAnchorRef.current) {
      const anchor = modelAnchorRef.current;
      const walk = walkCycleRef.current;

      // Base transforms per character archetype
      if (selectedCharacterId === "bonk") {
        // BONK: Heavy Bruiser
        if (attackPhase === "anticipation") {
          // Visible hammer wind-up: torso rotation back, slight lift
          anchor.position.set(0, 0.06 * phaseProgress, hitKickZ);
          anchor.rotation.set(0.04, -0.32 * phaseProgress, -0.06 * phaseProgress);
        } else if (attackPhase === "release") {
          // Fast slam/swing: violent downward slam, forward snap
          const slam = 1 - phaseProgress;
          anchor.position.set(0, -0.08 * slam, hitKickZ);
          anchor.rotation.set(0.35 * slam, 0.22 * slam, 0);
        } else if (attackPhase === "recovery") {
          // Heavy recoil vibration returning to ready
          const rec = 1 - phaseProgress;
          const vib = Math.sin(phaseProgress * 24) * 0.03 * rec;
          anchor.position.set(0, vib, hitKickZ);
          anchor.rotation.set(0.08 * rec, 0.05 * rec, 0);
        } else if (attackPhase === "movement") {
          // Strong step rhythm: punchy stride bob, shoulder sway, forward lean
          const strideBob = Math.abs(Math.sin(walk * 1.1)) * 0.14;
          const shoulderSway = Math.sin(walk * 0.55) * 0.08;
          anchor.position.set(0, strideBob, hitKickZ);
          anchor.rotation.set(0.12, 0, -shoulderSway);
        } else {
          // Idle: Heavy breathing rhythm, settled athletic brawler stance
          const breath = Math.sin(animTime * 2.4) * 0.025;
          anchor.position.set(0, breath, hitKickZ);
          anchor.rotation.set(0.02, 0, 0);
        }

        // Hammer weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            // High back overhead raise
            w.position.set(0.68, 0.2 + 0.2 * phaseProgress, 0.1 - 0.25 * phaseProgress);
            w.rotation.set(0.2 - 0.65 * phaseProgress, 0, -0.2 - 0.4 * phaseProgress);
          } else if (attackPhase === "release") {
            // Powerful downward impact slam
            const slam = 1 - phaseProgress;
            w.position.set(0.68, 0.2 - 0.35 * slam, 0.1 + 0.35 * slam);
            w.rotation.set(-0.45 + 1.25 * slam, 0, -0.6 + 0.7 * slam);
          } else if (attackPhase === "recovery") {
            // Return to ready
            const rec = 1 - phaseProgress;
            w.position.set(0.68, 0.1, 0.1);
            w.rotation.set(0.2 + 0.3 * rec, 0, -0.2);
          } else {
            // Idle/movement weapon sway
            const sway = Math.sin(animTime * 2.4) * 0.06;
            w.position.set(0.68, 0.1 + sway * 0.4, 0.1);
            w.rotation.set(0.2 + sway, 0, -0.2);
          }
        }

        // Visor pulse
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.0 * phaseProgress : 0;
          const intensity = 1.1 + Math.sin(animTime * 3.5) * 0.3 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = intensity;
          mat.emissiveIntensity = intensity;
        }
      } else if (selectedCharacterId === "byte") {
        // BYTE: Agile Cyber Caster
        if (attackPhase === "anticipation") {
          // Drone convergence: slight forward compression, rapid orbit acceleration
          anchor.position.set(0, 0.04, hitKickZ);
          anchor.rotation.set(0.08 * phaseProgress, 0, 0);
        } else if (attackPhase === "release") {
          // Sharp snap back: caster recoil
          const recoil = 1 - phaseProgress;
          anchor.position.set(0, -0.04 * recoil, hitKickZ - 0.12 * recoil);
          anchor.rotation.set(-0.15 * recoil, 0, 0);
        } else if (attackPhase === "recovery") {
          const rec = 1 - phaseProgress;
          anchor.position.set(0, 0, hitKickZ);
          anchor.rotation.set(-0.04 * rec, 0, 0);
        } else if (attackPhase === "movement") {
          // Agile sprint: low forward lean, fast lateral banking
          const sprintBob = Math.sin(walk * 1.6) * 0.06;
          anchor.position.set(0, sprintBob, hitKickZ);
          anchor.rotation.set(0.22, 0, -moveX * 0.12);
        } else {
          // Idle: Floating hover bob with slight rhythmic roll
          const hover = Math.sin(animTime * 3.2) * 0.05;
          anchor.position.set(0, hover, hitKickZ);
          anchor.rotation.set(0, 0, Math.sin(animTime * 1.8) * 0.03);
        }

        // Energy Orb weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            // Tight orbit, rapid spin
            w.position.set(0.27, 0.25, 0.15);
            w.rotation.y += animDelta * 12;
          } else if (attackPhase === "release") {
            // Rapid pulse expanding outward
            const r = 0.27 + 0.35 * phaseProgress;
            w.position.set(r, 0.25, 0.15);
            w.rotation.y += animDelta * 8;
          } else {
            // Smooth orbit with weapon lag
            const lagX = attackPhase === "movement" ? -moveX * 0.08 : 0;
            w.position.set(0.55 + lagX, 0.25 + Math.sin(animTime * 4) * 0.06, 0.15);
            w.rotation.y = animTime * 3.5;
          }
        }

        // Core glow
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.5 * phaseProgress : 0;
          const intensity = 1.3 + Math.sin(animTime * 5.0) * 0.5 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = intensity;
          mat.emissiveIntensity = intensity;
        }
      } else if (selectedCharacterId === "tank") {
        // TANK: Mechanical Axe Juggernaut
        if (attackPhase === "anticipation") {
          // Axe wind-back: Torso rotation back, mechanical lock
          anchor.position.set(0, 0.02, hitKickZ);
          anchor.rotation.set(0.04, -0.42 * phaseProgress, 0.06 * phaseProgress);
        } else if (attackPhase === "release") {
          // Aggressive cleave across
          const cleave = 1 - phaseProgress;
          anchor.position.set(0, -0.05 * cleave, hitKickZ);
          anchor.rotation.set(0.18 * cleave, 0.55 * cleave, -0.1 * cleave);
        } else if (attackPhase === "recovery") {
          // Long visual follow-through
          const rec = 1 - phaseProgress;
          anchor.position.set(0, 0, hitKickZ);
          anchor.rotation.set(0.05 * rec, 0.18 * rec, 0);
        } else if (attackPhase === "movement") {
          // Heavy stride: stomping body bob, armored lateral sway
          const strideBob = Math.abs(Math.sin(walk * 0.85)) * 0.16;
          const lateralSway = Math.sin(walk * 0.42) * 0.11;
          anchor.position.set(0, strideBob, hitKickZ);
          anchor.rotation.set(0.10, 0, -lateralSway);
        } else {
          // Idle: Restrained mechanical posture, subtle servo twitch
          const servo = Math.sin(animTime * 2.0) * 0.025;
          anchor.position.set(0, servo, hitKickZ);
          anchor.rotation.set(0, 0, 0);
        }

        // Axe weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            // Wind back wide
            w.position.set(0.72, 0.1 + 0.15 * phaseProgress, -0.1 - 0.2 * phaseProgress);
            w.rotation.set(0.2, -0.8 * phaseProgress, 0.6 * phaseProgress);
          } else if (attackPhase === "release") {
            // Aggressive forward cleave arc
            const cleave = 1 - phaseProgress;
            w.position.set(0.72 - 0.2 * cleave, 0.1 - 0.15 * cleave, 0.3 * cleave);
            w.rotation.set(0.4 * cleave, 1.1 * cleave - 0.2, 0.15);
          } else if (attackPhase === "recovery") {
            const rec = 1 - phaseProgress;
            w.position.set(0.72, 0.1, -0.1);
            w.rotation.set(0.2, 0.25 * rec, 0.15);
          } else {
            // Weighted battleaxe posture
            const sway = Math.sin(animTime * 2.2) * 0.05;
            w.position.set(0.72, 0.1, -0.1);
            w.rotation.set(-0.1 + sway * 0.4, 0.1, 0.18 + sway);
          }
        }

        // Visor slit glow
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.0 * phaseProgress : 0;
          const intensity = 1.4 + Math.sin(animTime * 3.2) * 0.4 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = intensity;
          mat.emissiveIntensity = intensity;
        }
      } else if (selectedCharacterId === "nova") {
        // NOVA: Astral Floating Caster
        if (attackPhase === "anticipation") {
          // Orbiting structures contract, body rises
          anchor.position.set(0, 0.16 + 0.12 * phaseProgress, hitKickZ);
          anchor.rotation.set(0, 0, 0);
        } else if (attackPhase === "release") {
          // Rapid expansion, small upward lift, soft recoil
          const lift = 1 - phaseProgress;
          anchor.position.set(0, 0.24 + 0.12 * lift, hitKickZ);
          anchor.rotation.set(-0.10 * lift, 0, 0);
        } else if (attackPhase === "recovery") {
          const rec = 1 - phaseProgress;
          anchor.position.set(0, 0.16 + 0.08 * rec, hitKickZ);
          anchor.rotation.set(-0.04 * rec, 0, 0);
        } else if (attackPhase === "movement") {
          // Directional floating tilt with smooth recovery
          const drift = Math.sin(animTime * 3.0) * 0.05;
          anchor.position.set(0, 0.16 + drift, hitKickZ);
          anchor.rotation.set(0.18, 0, -moveX * 0.08);
        } else {
          // Idle: Continuous levitation, slow astral orbit
          const hover = Math.sin(animTime * 2.6) * 0.08;
          const osc = Math.sin(animTime * 1.6) * 0.04;
          anchor.position.set(0, 0.16 + hover, hitKickZ);
          anchor.rotation.set(0, 0, osc);
        }

        // Astral ring weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            // Rings contract tightly towards core
            const s = 1.0 - 0.45 * phaseProgress;
            w.scale.set(s, s, s);
            w.rotation.y = animTime * 4.5;
          } else if (attackPhase === "release") {
            // Rapid outward burst
            const s = 0.55 + 0.75 * phaseProgress;
            w.scale.set(s, s, s);
            w.rotation.y += animDelta * 6;
          } else {
            w.scale.set(1, 1, 1);
            w.rotation.y = animTime * 2.0;
            w.rotation.z = Math.sin(animTime * 1.5) * 0.15;
          }
        }

        // Astral core glow
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.8 * phaseProgress : 0;
          const intensity = 1.5 + Math.sin(animTime * 4.5) * 0.5 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = intensity;
          mat.emissiveIntensity = intensity;
        }
      } else if (selectedCharacterId === "hex") {
        // HEX: Unstable Void Controller
        if (attackPhase === "anticipation") {
          // Short body twist, rune orbit contraction
          anchor.position.set(0, 0.08, hitKickZ);
          anchor.rotation.set(0.04, -0.35 * phaseProgress, 0.08);
        } else if (attackPhase === "release") {
          // Violent outward release
          const violent = 1 - phaseProgress;
          anchor.position.set(0, 0.08 + 0.10 * violent, hitKickZ);
          anchor.rotation.set(0.12 * violent, 0.45 * violent, -0.12 * violent);
        } else if (attackPhase === "recovery") {
          const rec = 1 - phaseProgress;
          anchor.position.set(0, 0.08, hitKickZ);
          anchor.rotation.set(0, 0.1 * rec, 0.07);
        } else if (attackPhase === "movement") {
          // Opposing lean: tilts slightly against momentum
          anchor.position.set(0, 0.08 + Math.sin(animTime * 3.2) * 0.04, hitKickZ);
          anchor.rotation.set(-0.06, 0, moveX * 0.08);
        } else {
          // Idle: Asymmetric hover, subtle rotational drift
          const hover = Math.sin(animTime * 2.8) * 0.06;
          const yawDrift = Math.sin(animTime * 1.1) * 0.06;
          anchor.position.set(0, 0.08 + hover, hitKickZ);
          anchor.rotation.set(0, yawDrift, 0.07 + Math.sin(animTime * 2.0) * 0.035);
        }

        // Void runic shards weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            w.position.set(0.55, 0.22, 0.15);
            w.rotation.y += animDelta * 9;
          } else if (attackPhase === "release") {
            const spread = 0.55 + 0.4 * phaseProgress;
            w.position.set(spread, 0.22, 0.15 + phaseProgress * 0.2);
            w.rotation.y += animDelta * 14;
          } else {
            w.position.set(0.55, 0.22 + Math.sin(animTime * 3.5) * 0.07, 0.15);
            w.rotation.y = animTime * 2.8;
            w.rotation.x = Math.sin(animTime * 1.8) * 0.12;
          }
        }

        // Runic core glow
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.6 * phaseProgress : 0;
          const intensity = 1.4 + Math.sin(animTime * 4.0) * 0.45 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = intensity;
          mat.emissiveIntensity = intensity;
        }
      } else if (selectedCharacterId === "rift") {
        const hover = Math.sin(animTime * 3.6) * 0.06;
        if (attackPhase === "anticipation") {
          anchor.position.set(0, 0.12 + 0.06 * phaseProgress, hitKickZ);
          anchor.rotation.set(0.06, -0.22 * phaseProgress, 0.08);
        } else if (attackPhase === "release") {
          const whip = 1 - phaseProgress;
          anchor.position.set(0, 0.12, hitKickZ - 0.15 * whip);
          anchor.rotation.set(-0.12 * whip, 0.35 * whip, -0.06 * whip);
        } else if (attackPhase === "movement") {
          anchor.position.set(0, 0.12 + hover, hitKickZ);
          anchor.rotation.set(0.16, 0, -moveX * 0.1);
        } else {
          anchor.position.set(0, 0.12 + hover, hitKickZ);
          anchor.rotation.set(0, Math.sin(animTime * 1.4) * 0.04, 0.04);
        }

        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            w.position.set(0.55, 0.22, 0.15);
            w.rotation.y += animDelta * 11;
          } else if (attackPhase === "release") {
            const fwd = 0.15 + phaseProgress * 0.45;
            w.position.set(0.55, 0.22, fwd);
            w.rotation.y += animDelta * 16;
          } else {
            w.position.set(0.55, 0.22 + Math.sin(animTime * 3.0) * 0.05, 0.15);
            w.rotation.y = animTime * 4.0;
          }
        }

        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.4 * phaseProgress : 0;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.6 + Math.sin(animTime * 5.5) * 0.45 + boost;
        }
      } else if (selectedCharacterId === "fuse") {
        if (attackPhase === "anticipation") {
          anchor.position.set(0, 0.03, hitKickZ);
          anchor.rotation.set(0.12, -0.28 * phaseProgress, -0.08);
        } else if (attackPhase === "release") {
          const recoil = 1 - phaseProgress;
          anchor.position.set(0, -0.04 * recoil, hitKickZ - 0.18 * recoil);
          anchor.rotation.set(-0.16 * recoil, 0.12 * recoil, 0.1 * recoil);
        } else if (attackPhase === "movement") {
          const stomp = Math.abs(Math.sin(walk * 0.95)) * 0.11;
          anchor.position.set(0, stomp, hitKickZ);
          anchor.rotation.set(0.1, 0, -Math.sin(walk * 0.45) * 0.09);
        } else {
          anchor.position.set(0, Math.sin(animTime * 2.4) * 0.025, hitKickZ);
          anchor.rotation.set(0.03, 0, Math.sin(animTime * 1.8) * 0.025);
        }

        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            w.position.set(0.58, 0.06, 0.18 - 0.24 * phaseProgress);
            w.rotation.set(-0.45 * phaseProgress, 0.15, -0.25);
          } else if (attackPhase === "release") {
            const punch = 1 - phaseProgress;
            w.position.set(0.58, 0.06 - 0.08 * punch, 0.18 + 0.32 * punch);
            w.rotation.set(0.35 * punch, 0.15, -0.25);
          } else {
            w.position.set(0.58, 0.06, 0.18);
            w.rotation.set(Math.sin(animTime * 2.0) * 0.08, 0.15, -0.25);
          }
        }

        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.0 * phaseProgress : 0;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.2 + Math.sin(animTime * 4.0) * 0.35 + boost;
        }
      } else if (selectedCharacterId === "lux") {
        const hover = Math.sin(animTime * 4.5) * 0.055;
        if (attackPhase === "anticipation") {
          anchor.position.set(0, 0.18 + 0.05 * phaseProgress, hitKickZ);
          anchor.rotation.set(-0.04, 0, 0.1 * phaseProgress);
        } else if (attackPhase === "release") {
          const recoil = 1 - phaseProgress;
          anchor.position.set(0, 0.18, hitKickZ - 0.2 * recoil);
          anchor.rotation.set(-0.18 * recoil, 0, 0);
        } else if (attackPhase === "movement") {
          anchor.position.set(0, 0.18 + hover, hitKickZ);
          anchor.rotation.set(0.2, 0, -moveX * 0.1);
        } else {
          anchor.position.set(0, 0.18 + hover, hitKickZ);
          anchor.rotation.set(0, 0, Math.sin(animTime * 1.7) * 0.035);
        }

        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            w.scale.set(1, 1, 1 + 0.35 * phaseProgress);
            w.rotation.y = Math.sin(animTime * 7) * 0.08;
          } else if (attackPhase === "release") {
            w.scale.set(1.0 + phaseProgress * 0.2, 1.0 + phaseProgress * 0.2, 1.4 + phaseProgress * 0.6);
            w.rotation.y = 0;
          } else {
            w.scale.set(1, 1, 1);
            w.rotation.y = Math.sin(animTime * 2.2) * 0.1;
            w.rotation.z = Math.sin(animTime * 2.8) * 0.08;
          }
        }

        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 3.0 * phaseProgress : 0;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.8 + Math.sin(animTime * 6.0) * 0.5 + boost;
        }
      }

      // Apply squash and stretch damage deformation
      anchor.scale.set(hitBulgeXZ, hitSquashY, hitBulgeXZ);
    }

    // =========================================================================
    // Procedural Attack Release VFX Animation
    // =========================================================================
    const isRelease = attackPhase === "release";

    // 1. BONK: Orange/Gold Hammer Arc
    if (bonkArcGroupRef.current) {
      if (selectedCharacterId === "bonk" && isRelease) {
        bonkArcGroupRef.current.visible = true;
        const scale = 0.85 + phaseProgress * 0.65;
        bonkArcGroupRef.current.scale.set(scale, scale, scale);
        bonkArcGroupRef.current.rotation.y = -0.45 + phaseProgress * 0.9;
        const mesh = bonkArcGroupRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material) {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - phaseProgress);
        }
      } else {
        bonkArcGroupRef.current.visible = false;
      }
    }

    // 2. BYTE: Cyan Circular Pulse
    if (bytePulseGroupRef.current) {
      if (selectedCharacterId === "byte" && isRelease) {
        bytePulseGroupRef.current.visible = true;
        const scale = 0.5 + phaseProgress * 2.0;
        bytePulseGroupRef.current.scale.set(scale, scale, scale);
        const mesh = bytePulseGroupRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material) {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - phaseProgress);
        }
      } else {
        bytePulseGroupRef.current.visible = false;
      }
    }

    // 3. TANK: Red/White Metallic Cleave Arc
    if (tankCleaveGroupRef.current) {
      if (selectedCharacterId === "tank" && isRelease) {
        tankCleaveGroupRef.current.visible = true;
        const scale = 0.85 + phaseProgress * 0.6;
        tankCleaveGroupRef.current.scale.set(scale, scale, scale);
        tankCleaveGroupRef.current.rotation.y = -0.55 + phaseProgress * 1.1;
        const mesh = tankCleaveGroupRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material) {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - phaseProgress);
        }
      } else {
        tankCleaveGroupRef.current.visible = false;
      }
    }

    // 4. NOVA: Expanding Astral Ring
    if (novaRingGroupRef.current) {
      if (selectedCharacterId === "nova" && isRelease) {
        novaRingGroupRef.current.visible = true;
        const scale = 0.6 + phaseProgress * 2.2;
        novaRingGroupRef.current.scale.set(scale, scale, scale);
        const children = novaRingGroupRef.current.children;
        for (let i = 0; i < children.length; i++) {
          const m = children[i] as THREE.Mesh;
          if (m && m.material) {
            (m.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - phaseProgress);
          }
        }
      } else {
        novaRingGroupRef.current.visible = false;
      }
    }

    // 5. HEX: Procedural Void/Rune Trail
    if (hexTrailGroupRef.current) {
      if (selectedCharacterId === "hex" && isRelease) {
        hexTrailGroupRef.current.visible = true;
        const scale = 0.7 + phaseProgress * 1.6;
        hexTrailGroupRef.current.scale.set(scale, scale, scale);
        hexTrailGroupRef.current.rotation.y = phaseProgress * Math.PI;
        const children = hexTrailGroupRef.current.children;
        for (let i = 0; i < children.length; i++) {
          const m = children[i] as THREE.Mesh;
          if (m && m.material) {
            (m.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - phaseProgress);
          }
        }
      } else {
        hexTrailGroupRef.current.visible = false;
      }
    }

    // 6. RIFT: Violet Release Arc
    if (riftArcGroupRef.current) {
      if (selectedCharacterId === "rift" && isRelease) {
        riftArcGroupRef.current.visible = true;
        const scale = 0.8 + phaseProgress * 1.5;
        riftArcGroupRef.current.scale.set(scale, scale, scale);
        const mesh = riftArcGroupRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material) {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - phaseProgress);
        }
      } else {
        riftArcGroupRef.current.visible = false;
      }
    }

    // 7. FUSE: Amber Blast Deploy
    if (fuseDeployGroupRef.current) {
      if (selectedCharacterId === "fuse" && isRelease) {
        fuseDeployGroupRef.current.visible = true;
        const scale = 0.6 + phaseProgress * 2.0;
        fuseDeployGroupRef.current.scale.set(scale, scale, scale);
        const mesh = fuseDeployGroupRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material) {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - phaseProgress);
        }
      } else {
        fuseDeployGroupRef.current.visible = false;
      }
    }

    // 8. LUX: Golden Solar Flash
    if (luxFlashGroupRef.current) {
      if (selectedCharacterId === "lux" && isRelease) {
        luxFlashGroupRef.current.visible = true;
        const scale = 0.5 + phaseProgress * 1.4;
        luxFlashGroupRef.current.scale.set(scale, scale, scale);
        const mesh = luxFlashGroupRef.current.children[0] as THREE.Mesh;
        if (mesh && mesh.material) {
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - phaseProgress);
        }
      } else {
        luxFlashGroupRef.current.visible = false;
      }
    }

    // =========================================================================
    // Dynamic Hit Flash, White/Crimson Damage Tint & Frost Feedback
    // =========================================================================
    const isFlashing = currentInvuln > 0;
    const isWhiteFlash = hitReactionTimerRef.current > 0.20;

    flashMaterialsRef.current.forEach((mat) => {
      if (mat) {
        if (isWhiteFlash) {
          mat.emissive.set("#ffffff");
          mat.emissiveIntensity = 1.5;
        } else if (isFlashing) {
          mat.emissive.set("#ef4444");
          mat.emissiveIntensity = 0.9;
        } else if (isSlowed) {
          mat.emissive.set("#38bdf8");
          mat.emissiveIntensity = 0.35;
        } else {
          mat.emissive.copy(mat.userData.baseEmissive || defaultBlackColor);
          mat.emissiveIntensity =
            mat.userData.currentAnimatedIntensity !== undefined
              ? mat.userData.currentAnimatedIntensity
              : (mat.userData.baseIntensity || 0);
        }
      }
    });
  });

  // Helper to register materials for dynamic hit flashes with core animation preservation
  const registerFlashMaterial = (
    mat: THREE.MeshStandardMaterial | null,
    baseEmissive = "#000000",
    baseIntensity = 0,
    isCore = false
  ) => {
    if (mat && !flashMaterialsRef.current.includes(mat)) {
      mat.userData.baseEmissive = new THREE.Color(baseEmissive);
      mat.userData.baseIntensity = baseIntensity;
      mat.userData.isCore = isCore;
      mat.userData.currentAnimatedIntensity = baseIntensity;
      flashMaterialsRef.current.push(mat);
    }
  };

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[0, 1.2, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={2}
    >
      <CapsuleCollider args={[0.5, 0.38]} position={[0, 0, 0]} />
      <group ref={meshGroupRef}>
        <group ref={modelAnchorRef}>

          {/* ================================================================= */}
          {/* CHARACTER 1: BONK — Heavy Bruiser, Orange/Gold, Mega Warhammer   */}
          {/* ================================================================= */}
          {selectedCharacterId === "bonk" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Humanoid Separation) --- */}
              {/* Left Boot */}
              <group position={[-0.23, -0.66, 0.04]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.18, 0.16, 0.32]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.20, 0.04, 0.34]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.02, 0.13]}>
                  <boxGeometry args={[0.18, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.2)} color="#f59e0b" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>

              {/* Right Boot */}
              <group position={[0.23, -0.66, 0.04]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.18, 0.16, 0.32]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.20, 0.04, 0.34]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.5} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.02, 0.13]}>
                  <boxGeometry args={[0.18, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.2)} color="#f59e0b" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>

              {/* Left Lower Leg & Greave */}
              <group position={[-0.23, -0.44, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.17, 0.28, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.65} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.15, 0.26, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.19, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.3)} color="#fbbf24" metalness={0.85} roughness={0.2} />
                </mesh>
              </group>

              {/* Right Lower Leg & Greave */}
              <group position={[0.23, -0.44, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.17, 0.28, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.65} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.15, 0.26, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.19, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.3)} color="#fbbf24" metalness={0.85} roughness={0.2} />
                </mesh>
              </group>

              {/* Left Upper Leg / Thigh */}
              <group position={[-0.20, -0.16, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.16, 0.24, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.6} roughness={0.4} />
                </mesh>
                <mesh position={[-0.08, 0, 0]}>
                  <boxGeometry args={[0.04, 0.18, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.6} />
                </mesh>
              </group>

              {/* Right Upper Leg / Thigh */}
              <group position={[0.20, -0.16, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.16, 0.24, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.6} roughness={0.4} />
                </mesh>
                <mesh position={[0.08, 0, 0]}>
                  <boxGeometry args={[0.04, 0.18, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.6} />
                </mesh>
              </group>

              {/* --- WAIST / ARMORED BELT & TASSETS --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.46, 0.12, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.3} />
                </mesh>
                {/* Center Golden Buckle */}
                <mesh position={[0, 0, 0.15]}>
                  <boxGeometry args={[0.18, 0.14, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.4)} color="#fbbf24" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Left Hip Tasset */}
                <mesh position={[-0.26, -0.06, 0]} rotation={[0, 0, 0.18]}>
                  <boxGeometry args={[0.08, 0.22, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.65} roughness={0.3} />
                </mesh>
                {/* Right Hip Tasset */}
                <mesh position={[0.26, -0.06, 0]} rotation={[0, 0, -0.18]}>
                  <boxGeometry args={[0.08, 0.22, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#ea580c" metalness={0.65} roughness={0.3} />
                </mesh>
              </group>

              {/* --- TORSO & CHESTPLATE (V-Taper Combat Armor) --- */}
              <group position={[0, 0.24, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.12, 0]}>
                  <boxGeometry args={[0.42, 0.16, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.65} roughness={0.35} />
                </mesh>
                {/* Broad Upper Chestplate (Angular V-Shape) */}
                <mesh castShadow position={[0, 0.05, 0.03]} rotation={[0.10, 0, 0]}>
                  <boxGeometry args={[0.62, 0.26, 0.36]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.7} roughness={0.3} />
                </mesh>
                {/* Layered Orange Breastplate */}
                <mesh castShadow position={[0, 0.06, 0.16]} rotation={[0.10, 0, 0]}>
                  <boxGeometry args={[0.54, 0.22, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#c2410c", 0.2)} color="#ea580c" metalness={0.7} roughness={0.25} />
                </mesh>
                {/* Golden Chevron Core / Crest */}
                <mesh ref={coreMeshRef} position={[0, 0.07, 0.24]} rotation={[0.10, 0, 0]}>
                  <boxGeometry args={[0.28, 0.16, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 1.0, true)} color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.0} metalness={0.9} roughness={0.15} />
                </mesh>
                {/* Rear Power Backpack with Vents */}
                <group position={[0, 0.06, -0.18]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.44, 0.28, 0.14]} />
                    <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.25} />
                  </mesh>
                  <mesh position={[-0.14, 0.06, -0.07]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.12, 6]} />
                    <meshStandardMaterial color="#ea580c" metalness={0.9} />
                  </mesh>
                  <mesh position={[0.14, 0.06, -0.07]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.12, 6]} />
                    <meshStandardMaterial color="#ea580c" metalness={0.9} />
                  </mesh>
                </group>
              </group>

              {/* --- SHOULDERS & PAULDRONS (Broad Readable Combat Width) --- */}
              {/* Left Pauldron */}
              <group position={[-0.52, 0.38, 0]} rotation={[0, 0, 0.22]}>
                <mesh castShadow position={[0, -0.04, 0]}>
                  <boxGeometry args={[0.30, 0.18, 0.44]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[-0.04, 0.06, 0]}>
                  <boxGeometry args={[0.34, 0.14, 0.46]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)} color="#ea580c" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[-0.18, 0.08, 0.15]}>
                  <boxGeometry args={[0.05, 0.05, 0.08]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                <mesh position={[-0.18, 0.08, -0.15]}>
                  <boxGeometry args={[0.05, 0.05, 0.08]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Pauldron */}
              <group position={[0.52, 0.38, 0]} rotation={[0, 0, -0.22]}>
                <mesh castShadow position={[0, -0.04, 0]}>
                  <boxGeometry args={[0.30, 0.18, 0.44]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0.04, 0.06, 0]}>
                  <boxGeometry args={[0.34, 0.14, 0.46]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)} color="#ea580c" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[0.18, 0.08, 0.15]}>
                  <boxGeometry args={[0.05, 0.05, 0.08]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                <mesh position={[0.18, 0.08, -0.15]}>
                  <boxGeometry args={[0.05, 0.05, 0.08]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>

              {/* --- ARMS & FOREARMS (Separated Negative Space) --- */}
              {/* Left Arm & Gauntlet */}
              <group position={[-0.44, 0.18, 0]}>
                <mesh castShadow position={[0, 0.06, 0]}>
                  <boxGeometry args={[0.14, 0.20, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.6} />
                </mesh>
                <mesh castShadow position={[-0.02, -0.16, 0.04]}>
                  <boxGeometry args={[0.16, 0.22, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                <mesh position={[-0.02, -0.16, 0.13]}>
                  <boxGeometry args={[0.14, 0.14, 0.06]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* Right Arm & Gauntlet */}
              <group position={[0.44, 0.18, 0]}>
                <mesh castShadow position={[0, 0.06, 0]}>
                  <boxGeometry args={[0.14, 0.20, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.6} />
                </mesh>
                <mesh castShadow position={[0.02, -0.16, 0.04]}>
                  <boxGeometry args={[0.16, 0.22, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                <mesh position={[0.02, -0.16, 0.13]}>
                  <boxGeometry args={[0.14, 0.14, 0.06]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* --- HEAD & HELMET (Compact Humanoid Proportion) --- */}
              <group position={[0, 0.56, 0.02]}>
                {/* Neck Collar */}
                <mesh position={[0, -0.12, 0]}>
                  <cylinderGeometry args={[0.12, 0.14, 0.08, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                {/* Angular Combat Helmet */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.28, 0.24, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e293b" metalness={0.75} roughness={0.25} />
                </mesh>
                {/* Dominant Forward Golden Visor */}
                <mesh position={[0, 0.02, 0.15]}>
                  <boxGeometry args={[0.32, 0.08, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 1.2)} color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} />
                </mesh>
                {/* Iconic Beard / Chin Armor Guard (from bonk.svg) */}
                <mesh castShadow position={[0, -0.09, 0.14]} rotation={[0.12, 0, 0]}>
                  <boxGeometry args={[0.22, 0.12, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f1f5f9" metalness={0.4} roughness={0.2} />
                </mesh>
                <mesh position={[0, -0.14, 0.15]}>
                  <boxGeometry args={[0.24, 0.04, 0.12]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} />
                </mesh>
                {/* Swept Crest & Dual Exhaust Horns */}
                <mesh position={[0, 0.16, -0.02]} rotation={[-0.25, 0, 0]}>
                  <boxGeometry args={[0.08, 0.12, 0.26]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.8} />
                </mesh>
                <mesh position={[-0.18, 0.12, -0.06]} rotation={[0, 0, 0.4]}>
                  <coneGeometry args={[0.05, 0.20, 5]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} />
                </mesh>
                <mesh position={[0.18, 0.12, -0.06]} rotation={[0, 0, -0.4]}>
                  <coneGeometry args={[0.05, 0.20, 5]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: KINETIC MEGA WARHAMMER --- */}
              <group ref={weaponGroupRef} position={[0.68, 0.15, 0.15]} rotation={[0.2, 0, -0.2]}>
                {/* Dark Titanium Haft */}
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, 1.25, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
                </mesh>
                {/* Gold Grip Rings */}
                <mesh position={[0, 0.05, 0]}>
                  <torusGeometry args={[0.055, 0.015, 6, 12]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                <mesh position={[0, 0.35, 0]}>
                  <torusGeometry args={[0.055, 0.015, 6, 12]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                {/* Counterweight Spiked Pommel */}
                <mesh position={[0, -0.48, 0]}>
                  <octahedronGeometry args={[0.09]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Massive Double Hammer Head */}
                <mesh castShadow position={[0, 0.70, 0]}>
                  <boxGeometry args={[0.54, 0.36, 0.38]} />
                  <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={0.35} roughness={0.25} metalness={0.7} />
                </mesh>
                {/* Front & Rear Heavy Impact Strike Plates */}
                <mesh position={[0, 0.70, 0.22]}>
                  <boxGeometry args={[0.44, 0.28, 0.08]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                <mesh position={[0, 0.70, -0.22]}>
                  <boxGeometry args={[0.44, 0.28, 0.08]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Crown Spike */}
                <mesh position={[0, 0.94, 0]}>
                  <coneGeometry args={[0.08, 0.22, 5]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                {/* Glowing Hammer Energy Core Conduit */}
                <mesh position={[0, 0.70, 0]}>
                  <cylinderGeometry args={[0.09, 0.09, 0.40, 8]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.6} />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 2: BYTE — Agile Futuristic Caster, Cyan/Purple Core    */}
          {/* ================================================================= */}
          {selectedCharacterId === "byte" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Slender Cybernetic Humanoid) --- */}
              {/* Left Cyber Boot */}
              <group position={[-0.18, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.11, 0.03, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#00e5ff", 1.2)} color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} />
                </mesh>
              </group>

              {/* Right Cyber Boot */}
              <group position={[0.18, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.11, 0.03, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#00e5ff", 1.2)} color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} />
                </mesh>
              </group>

              {/* Left Lower Leg & Greave */}
              <group position={[-0.18, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.12, 0.28, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0, 0.07]}>
                  <boxGeometry args={[0.06, 0.24, 0.02]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22d3ee", 0.6)} color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
                </mesh>
                <mesh position={[0, 0.14, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#a855f7" metalness={0.9} />
                </mesh>
              </group>

              {/* Right Lower Leg & Greave */}
              <group position={[0.18, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.12, 0.28, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0, 0.07]}>
                  <boxGeometry args={[0.06, 0.24, 0.02]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22d3ee", 0.6)} color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
                </mesh>
                <mesh position={[0, 0.14, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#a855f7" metalness={0.9} />
                </mesh>
              </group>

              {/* Left Upper Leg / Thigh */}
              <group position={[-0.16, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.22, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>

              {/* Right Upper Leg / Thigh */}
              <group position={[0.16, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.22, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>

              {/* --- WAIST / CYBER CHASSIS LINK --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.34, 0.10, 0.22]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[-0.18, 0, 0]}>
                  <boxGeometry args={[0.04, 0.12, 0.16]} />
                  <meshStandardMaterial color="#a855f7" metalness={0.9} />
                </mesh>
                <mesh position={[0.18, 0, 0]}>
                  <boxGeometry args={[0.04, 0.12, 0.16]} />
                  <meshStandardMaterial color="#a855f7" metalness={0.9} />
                </mesh>
              </group>

              {/* --- TORSO & CYBERNETIC CHASSIS (Narrow Agile V-Taper) --- */}
              <group position={[0, 0.23, 0]}>
                {/* Lower Torso */}
                <mesh castShadow position={[0, -0.11, 0]}>
                  <boxGeometry args={[0.32, 0.14, 0.22]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                {/* Upper Chest Chassis */}
                <mesh castShadow position={[0, 0.04, 0.02]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.46, 0.24, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Cyan Circuit Inset Panels */}
                <mesh position={[0, 0.04, 0.15]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.38, 0.18, 0.04]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#06b6d4", 0.5)} color="#06b6d4" roughness={0.2} metalness={0.6} />
                </mesh>
                {/* Pulsing Arc Reactor Chest Core */}
                <group position={[0, 0.05, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
                  <mesh>
                    <torusGeometry args={[0.12, 0.02, 8, 16]} />
                    <meshStandardMaterial color="#1e293b" metalness={0.9} />
                  </mesh>
                  <mesh ref={coreMeshRef}>
                    <cylinderGeometry args={[0.10, 0.10, 0.04, 16]} />
                    <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.8, true)} color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.8} />
                  </mesh>
                </group>
                {/* Dual Rear Mag-Lev Thrusters */}
                <group position={[0, 0.02, -0.16]}>
                  <mesh position={[-0.14, 0, 0]} rotation={[0.2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} />
                  </mesh>
                  <mesh position={[0.14, 0, 0]} rotation={[0.2, 0, 0]}>
                    <cylinderGeometry args={[0.05, 0.07, 0.18, 8]} />
                    <meshStandardMaterial color="#0f172a" metalness={0.9} />
                  </mesh>
                  <mesh position={[-0.14, -0.09, -0.02]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.04, 0.10, 8]} />
                    <meshBasicMaterial color="#38bdf8" />
                  </mesh>
                  <mesh position={[0.14, -0.09, -0.02]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.04, 0.10, 8]} />
                    <meshBasicMaterial color="#38bdf8" />
                  </mesh>
                </group>
              </group>

              {/* --- SHOULDERS & FLANK WINGLETS --- */}
              {/* Left Shoulder Node & Winglet */}
              <group position={[-0.46, 0.36, 0]} rotation={[0, 0, 0.25]}>
                <mesh>
                  <octahedronGeometry args={[0.11]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22d3ee", 0.8)} color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.8} metalness={0.85} />
                </mesh>
                <mesh position={[-0.04, -0.08, -0.06]} rotation={[0.2, 0.3, 0.2]}>
                  <boxGeometry args={[0.05, 0.24, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#a855f7", 0.4)} color="#a855f7" metalness={0.8} />
                </mesh>
              </group>

              {/* Right Shoulder Node & Winglet */}
              <group position={[0.46, 0.36, 0]} rotation={[0, 0, -0.25]}>
                <mesh>
                  <octahedronGeometry args={[0.11]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22d3ee", 0.8)} color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.8} metalness={0.85} />
                </mesh>
                <mesh position={[0.04, -0.08, -0.06]} rotation={[0.2, -0.3, -0.2]}>
                  <boxGeometry args={[0.05, 0.24, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#a855f7", 0.4)} color="#a855f7" metalness={0.8} />
                </mesh>
              </group>

              {/* --- ARMS & GAUNTLETS --- */}
              {/* Left Arm */}
              <group position={[-0.36, 0.16, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.10, 0.18, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0, -0.14, 0.03]}>
                  <boxGeometry args={[0.11, 0.18, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#171d2b" metalness={0.85} />
                </mesh>
              </group>

              {/* Right Arm */}
              <group position={[0.36, 0.16, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.10, 0.18, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0, -0.14, 0.03]}>
                  <boxGeometry args={[0.11, 0.18, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#171d2b" metalness={0.85} />
                </mesh>
              </group>

              {/* --- HEAD & CYBER-COWL (Compact Sleek Proportions) --- */}
              <group position={[0, 0.54, 0]}>
                {/* Neck */}
                <mesh position={[0, -0.10, 0]}>
                  <cylinderGeometry args={[0.09, 0.11, 0.06, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                {/* Helmet Cowl */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.24, 0.22, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.2} />
                </mesh>
                {/* Iconic Forehead Chevron Crest (from byte.svg) */}
                <mesh position={[0, 0.12, 0.14]} rotation={[0, 0, Math.PI]}>
                  <coneGeometry args={[0.06, 0.14, 3]} />
                  <meshStandardMaterial color="#f1f5f9" metalness={0.5} roughness={0.15} />
                </mesh>
                {/* Wide Neon Cyan Cyber Visor */}
                <mesh position={[0, 0.01, 0.14]}>
                  <boxGeometry args={[0.28, 0.07, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.8, true)} color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.8} />
                </mesh>
                {/* Twin Cyber Optic Dots */}
                <mesh position={[-0.07, 0.01, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.02, 8]} />
                  <meshBasicMaterial color="#080b12" />
                </mesh>
                <mesh position={[0.07, 0.01, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.02, 8]} />
                  <meshBasicMaterial color="#080b12" />
                </mesh>
                {/* Swept Dorsal Fin */}
                <mesh position={[0, 0.14, -0.10]} rotation={[-0.45, 0, 0]}>
                  <boxGeometry args={[0.04, 0.18, 0.24]} />
                  <meshStandardMaterial color="#a855f7" metalness={0.9} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: FLOATING ENERGY ORB --- */}
              <group ref={weaponGroupRef} position={[0.55, 0.25, 0.15]}>
                {/* Glowing Plasma Sphere Core */}
                <mesh>
                  <sphereGeometry args={[0.16, 16, 16]} />
                  <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.0} roughness={0.1} />
                </mesh>
                {/* Rotating Outer Violet Gimbal Ring */}
                <mesh rotation={[Math.PI / 3, 0, 0]}>
                  <torusGeometry args={[0.28, 0.025, 8, 24]} />
                  <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.9} metalness={0.9} />
                </mesh>
                {/* Rotating Inner Cyan Gimbal Ring */}
                <mesh rotation={[-Math.PI / 4, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.22, 0.02, 8, 20]} />
                  <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} metalness={0.9} />
                </mesh>
                {/* Orbiting micro satellite nodes */}
                <mesh position={[0.28, 0, 0]}>
                  <octahedronGeometry args={[0.045]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                <mesh position={[-0.28, 0, 0]}>
                  <octahedronGeometry args={[0.045]} />
                  <meshBasicMaterial color="#a855f7" />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 3: TANK — Heavy Armored Bastion, Dark Metal/Red Plates  */}
          {/* ================================================================= */}
          {selectedCharacterId === "tank" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Massive Fortress Silhouette) --- */}
              {/* Left Blast Stomper */}
              <group position={[-0.27, -0.66, 0.04]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.24, 0.18, 0.38]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.26, 0.05, 0.40]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.9} />
                </mesh>
                <mesh position={[0, 0.02, 0.18]}>
                  <boxGeometry args={[0.22, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.7} />
                </mesh>
              </group>

              {/* Right Blast Stomper */}
              <group position={[0.27, -0.66, 0.04]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.24, 0.18, 0.38]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.26, 0.05, 0.40]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.9} />
                </mesh>
                <mesh position={[0, 0.02, 0.18]}>
                  <boxGeometry args={[0.22, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.7} />
                </mesh>
              </group>

              {/* Left Pillar Greave */}
              <group position={[-0.27, -0.42, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.22, 0.30, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.12]}>
                  <boxGeometry args={[0.20, 0.28, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.16, 0.13]}>
                  <boxGeometry args={[0.24, 0.12, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                </mesh>
              </group>

              {/* Right Pillar Greave */}
              <group position={[0.27, -0.42, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.22, 0.30, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.12]}>
                  <boxGeometry args={[0.20, 0.28, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.16, 0.13]}>
                  <boxGeometry args={[0.24, 0.12, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                </mesh>
              </group>

              {/* Left Upper Leg / Thigh */}
              <group position={[-0.24, -0.14, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.20, 0.24, 0.22]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.75} />
                </mesh>
                <mesh position={[-0.10, 0, 0]}>
                  <boxGeometry args={[0.08, 0.20, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.7} />
                </mesh>
              </group>

              {/* Right Upper Leg / Thigh */}
              <group position={[0.24, -0.14, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.20, 0.24, 0.22]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.75} />
                </mesh>
                <mesh position={[0.10, 0, 0]}>
                  <boxGeometry args={[0.08, 0.20, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.7} />
                </mesh>
              </group>

              {/* --- WAIST / FORTRESS BELT & SKIRTS --- */}
              <group position={[0, 0.02, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.54, 0.14, 0.34]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} roughness={0.3} />
                </mesh>
                {/* Front Ballistic Flap */}
                <mesh position={[0, -0.06, 0.18]}>
                  <boxGeometry args={[0.24, 0.22, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.8} />
                </mesh>
                {/* Left & Right Hip Skirts */}
                <mesh position={[-0.32, -0.06, 0]} rotation={[0, 0, 0.15]}>
                  <boxGeometry args={[0.10, 0.26, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.8} />
                </mesh>
                <mesh position={[0.32, -0.06, 0]} rotation={[0, 0, -0.15]}>
                  <boxGeometry args={[0.10, 0.26, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.8} />
                </mesh>
              </group>

              {/* --- TORSO & SLAB CHESTPLATE (Colossal Juggernaut Cuirass) --- */}
              <group position={[0, 0.28, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.13, 0]}>
                  <boxGeometry args={[0.48, 0.18, 0.32]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} />
                </mesh>
                {/* Colossal Slab Chestplate */}
                <mesh castShadow position={[0, 0.06, 0.04]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.74, 0.30, 0.44]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} roughness={0.25} />
                </mesh>
                {/* Layered Crimson Blast Plates */}
                <mesh castShadow position={[0, 0.08, 0.22]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.66, 0.24, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#ef4444", 0.3)} color="#ef4444" metalness={0.75} roughness={0.2} />
                </mesh>
                {/* Chest Slit Hazard Core */}
                <mesh ref={coreMeshRef} position={[0, 0.10, 0.30]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.32, 0.10, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#ef4444", 1.5, true)} color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
                </mesh>
                {/* Colossal Dorsal Power Unit with Twin Smoke Stacks */}
                <group position={[0, 0.06, -0.22]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.56, 0.32, 0.20]} />
                    <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                  </mesh>
                  <mesh position={[-0.20, 0.18, 0]}>
                    <cylinderGeometry args={[0.06, 0.08, 0.24, 8]} />
                    <meshStandardMaterial color="#334155" metalness={0.95} />
                  </mesh>
                  <mesh position={[0.20, 0.18, 0]}>
                    <cylinderGeometry args={[0.06, 0.08, 0.24, 8]} />
                    <meshStandardMaterial color="#334155" metalness={0.95} />
                  </mesh>
                </group>
              </group>

              {/* --- SHOULDERS & BLAST-SHIELD PAULDRONS (Dominant Widest Width) --- */}
              {/* Left Blast Shield */}
              <group position={[-0.64, 0.42, 0]} rotation={[0, 0, 0.25]}>
                <mesh castShadow position={[0, -0.04, 0]}>
                  <boxGeometry args={[0.38, 0.24, 0.54]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} />
                </mesh>
                <mesh castShadow position={[-0.04, 0.08, 0]}>
                  <boxGeometry args={[0.42, 0.16, 0.56]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.75} roughness={0.25} />
                </mesh>
              </group>

              {/* Right Blast Shield */}
              <group position={[0.64, 0.42, 0]} rotation={[0, 0, -0.25]}>
                <mesh castShadow position={[0, -0.04, 0]}>
                  <boxGeometry args={[0.38, 0.24, 0.54]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} />
                </mesh>
                <mesh castShadow position={[0.04, 0.08, 0]}>
                  <boxGeometry args={[0.42, 0.16, 0.56]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#dc2626" metalness={0.75} roughness={0.25} />
                </mesh>
              </group>

              {/* --- ARMS & HYDRAULIC GAUNTLETS --- */}
              {/* Left Arm */}
              <group position={[-0.54, 0.22, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.18, 0.22, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[-0.02, -0.18, 0.05]}>
                  <boxGeometry args={[0.20, 0.24, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                </mesh>
                <mesh position={[-0.02, -0.18, 0.16]}>
                  <boxGeometry args={[0.18, 0.16, 0.06]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.8} />
                </mesh>
              </group>

              {/* Right Arm */}
              <group position={[0.54, 0.22, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.18, 0.22, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#334155" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0.02, -0.18, 0.05]}>
                  <boxGeometry args={[0.20, 0.24, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                </mesh>
                <mesh position={[0.02, -0.18, 0.16]}>
                  <boxGeometry args={[0.18, 0.16, 0.06]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.8} />
                </mesh>
              </group>

              {/* --- HEAD & FORTRESS HELMET --- */}
              <group position={[0, 0.60, 0.02]}>
                {/* Heavy Neck Collar */}
                <mesh position={[0, -0.13, 0]}>
                  <cylinderGeometry args={[0.16, 0.18, 0.10, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                </mesh>
                {/* Fortress Helm Box */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.32, 0.26, 0.34]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} roughness={0.25} />
                </mesh>
                {/* Deep Recessed Glowing Ruby Visor Slit */}
                <mesh position={[0, 0.02, 0.17]}>
                  <boxGeometry args={[0.34, 0.07, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#ef4444", 1.6)} color="#ef4444" emissive="#ef4444" emissiveIntensity={1.6} />
                </mesh>
                {/* Juggernaut Horn Blast Deflectors */}
                <mesh position={[-0.20, 0.14, -0.04]} rotation={[0, 0, 0.50]}>
                  <coneGeometry args={[0.08, 0.30, 5]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.85} />
                </mesh>
                <mesh position={[0.20, 0.14, -0.04]} rotation={[0, 0, -0.50]}>
                  <coneGeometry args={[0.08, 0.30, 5]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.85} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: COLOSSAL BATTLE AXE --- */}
              <group ref={weaponGroupRef} position={[0.74, 0.12, -0.08]} rotation={[-0.1, 0.1, 0.18]}>
                {/* Reinforced Titanium Shaft */}
                <mesh position={[0, 0.20, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 1.35, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.3} />
                </mesh>
                {/* Counterweight Spiked Pommel */}
                <mesh position={[0, -0.50, 0]}>
                  <octahedronGeometry args={[0.10]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.8} />
                </mesh>
                {/* Colossal Double-Bitted Axe Head */}
                <mesh castShadow position={[0, 0.72, 0]}>
                  <boxGeometry args={[0.62, 0.44, 0.12]} />
                  <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Left & Right Glowing Thermal Cleaver Edges */}
                <mesh position={[-0.34, 0.72, 0]} rotation={[0, 0, 0.1]}>
                  <boxGeometry args={[0.12, 0.50, 0.08]} />
                  <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.2} />
                </mesh>
                <mesh position={[0.34, 0.72, 0]} rotation={[0, 0, -0.1]}>
                  <boxGeometry args={[0.12, 0.50, 0.08]} />
                  <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.2} />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 4: NOVA — Athletic Energy Combat Suit, Astral Pink/Gold */}
          {/* ================================================================= */}
          {selectedCharacterId === "nova" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Athletic Aerodynamic Humanoid) --- */}
              {/* Left Streamlined Boot */}
              <group position={[-0.19, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, -0.12]}>
                  <boxGeometry args={[0.12, 0.06, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.5)} color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* Right Streamlined Boot */}
              <group position={[0.19, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0, -0.12]}>
                  <boxGeometry args={[0.12, 0.06, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.5)} color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* Left Aerodynamic Greave */}
              <group position={[-0.19, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.15, 0.08, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.4)} color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* Right Aerodynamic Greave */}
              <group position={[0.19, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.75} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.15, 0.08, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.4)} color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* Left Athletic Thigh */}
              <group position={[-0.17, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.22, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.6} roughness={0.35} />
                </mesh>
              </group>

              {/* Right Athletic Thigh */}
              <group position={[0.17, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.22, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.6} roughness={0.35} />
                </mesh>
              </group>

              {/* --- WAIST / CONTOURED ENERGY BELT --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.36, 0.10, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.7} />
                </mesh>
                <mesh position={[0, 0, 0.13]}>
                  <boxGeometry args={[0.14, 0.10, 0.04]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>

              {/* --- TORSO & SCULPTED ENERGY CUIRASS --- */}
              <group position={[0, 0.24, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.12, 0]}>
                  <boxGeometry args={[0.34, 0.14, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.7} />
                </mesh>
                {/* Upper Sculpted Chestplate */}
                <mesh castShadow position={[0, 0.04, 0.03]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.50, 0.24, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Gold Collar Trim */}
                <mesh position={[0, 0.12, 0.15]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.38, 0.06, 0.04]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} />
                </mesh>
                {/* Pulsating Astral Reactor Core */}
                <mesh ref={coreMeshRef} position={[0, 0.03, 0.17]}>
                  <sphereGeometry args={[0.13, 16, 16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f472b6", 1.8, true)} color="#f472b6" emissive="#f472b6" emissiveIntensity={1.8} roughness={0.1} />
                </mesh>
                {/* Rear Capacitor Pack */}
                <mesh castShadow position={[0, 0.04, -0.16]}>
                  <boxGeometry args={[0.36, 0.24, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.85} />
                </mesh>
              </group>

              {/* --- SHOULDERS & ASTRAL WINGLET PAULDRONS --- */}
              {/* Left Winglet Pauldron */}
              <group position={[-0.48, 0.38, 0]} rotation={[0, 0.12, 0.20]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.26, 0.16, 0.40]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[-0.04, 0.06, 0]}>
                  <boxGeometry args={[0.22, 0.06, 0.42]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* Right Winglet Pauldron */}
              <group position={[0.48, 0.38, 0]} rotation={[0, -0.12, -0.20]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.26, 0.16, 0.40]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[0.04, 0.06, 0]}>
                  <boxGeometry args={[0.22, 0.06, 0.42]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} />
                </mesh>
              </group>

              {/* --- ARMS & WRIST BRACERS --- */}
              {/* Left Arm */}
              <group position={[-0.38, 0.18, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.11, 0.18, 0.13]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.6} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.12, 0.20, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.8} />
                </mesh>
              </group>

              {/* Right Arm */}
              <group position={[0.38, 0.18, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.11, 0.18, 0.13]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.6} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.12, 0.20, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#d946ef" metalness={0.8} />
                </mesh>
              </group>

              {/* --- HEAD & ASTRAL HELM (Compact Humanoid Proportion) --- */}
              <group position={[0, 0.55, 0.02]}>
                {/* Neck */}
                <mesh position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.10, 0.12, 0.07, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.8} />
                </mesh>
                {/* Helm Dome */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.25, 0.23, 0.27]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Astral Visor Shield */}
                <mesh position={[0, 0.02, 0.14]}>
                  <boxGeometry args={[0.27, 0.09, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f472b6", 1.7)} color="#f472b6" emissive="#f472b6" emissiveIntensity={1.7} />
                </mesh>
                {/* Gold Brow Crest */}
                <mesh position={[0, 0.10, 0.13]}>
                  <boxGeometry args={[0.22, 0.04, 0.04]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                {/* Swept Astral Antennas */}
                <mesh position={[-0.14, 0.12, -0.06]} rotation={[-0.3, 0, -0.2]}>
                  <boxGeometry args={[0.03, 0.22, 0.16]} />
                  <meshStandardMaterial color="#d946ef" metalness={0.9} />
                </mesh>
                <mesh position={[0.14, 0.12, -0.06]} rotation={[-0.3, 0, 0.2]}>
                  <boxGeometry args={[0.03, 0.22, 0.16]} />
                  <meshStandardMaterial color="#d946ef" metalness={0.9} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: CONCENTRIC ASTRAL RINGS --- */}
              <group ref={weaponGroupRef} position={[0.55, 0.25, 0.15]}>
                {/* Outer Astral Ring */}
                <mesh rotation={[Math.PI / 4, 0, 0]}>
                  <torusGeometry args={[0.32, 0.024, 8, 28]} />
                  <meshStandardMaterial color="#d946ef" emissive="#d946ef" emissiveIntensity={1.2} metalness={0.9} />
                </mesh>
                {/* Inner Counter-Rotating Ring */}
                <mesh rotation={[-Math.PI / 3, 0, Math.PI / 3]}>
                  <torusGeometry args={[0.22, 0.02, 8, 24]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.0} metalness={0.9} />
                </mesh>
                {/* Core Power Node */}
                <mesh>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={2.0} />
                </mesh>
                {/* Satellite Emitter Nodes */}
                <mesh position={[0.32, 0, 0]}>
                  <octahedronGeometry args={[0.04]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
                <mesh position={[-0.32, 0, 0]}>
                  <octahedronGeometry args={[0.04]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 5: HEX — Sharp Occult-Tech, Void Purple/Neon Green     */}
          {/* ================================================================= */}
          {selectedCharacterId === "hex" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Sharp Bladed Humanoid) --- */}
              {/* Left Bladed Boot */}
              <group position={[-0.19, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.02, 0.15]}>
                  <boxGeometry args={[0.06, 0.06, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#9333ea" metalness={0.7} />
                </mesh>
              </group>

              {/* Right Bladed Boot */}
              <group position={[0.19, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.02, 0.15]}>
                  <boxGeometry args={[0.06, 0.06, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#9333ea" metalness={0.7} />
                </mesh>
              </group>

              {/* Left Jagged Greave */}
              <group position={[-0.19, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.14, 0.10, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22c55e", 0.9)} color="#22c55e" emissive="#22c55e" emissiveIntensity={0.9} />
                </mesh>
              </group>

              {/* Right Jagged Greave */}
              <group position={[0.19, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.14, 0.10, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22c55e", 0.9)} color="#22c55e" emissive="#22c55e" emissiveIntensity={0.9} />
                </mesh>
              </group>

              {/* Left Thigh */}
              <group position={[-0.17, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.22, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.7} />
                </mesh>
              </group>

              {/* Right Thigh */}
              <group position={[0.17, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.22, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.7} />
                </mesh>
              </group>

              {/* --- WAIST / ASYMMETRIC OCCULT SASH & CHAINS --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.38, 0.11, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                {/* Purple Draped Sash */}
                <mesh position={[-0.10, -0.06, 0.13]} rotation={[0, 0, -0.2]}>
                  <boxGeometry args={[0.16, 0.18, 0.04]} />
                  <meshStandardMaterial color="#7e22ce" metalness={0.6} />
                </mesh>
                {/* Glowing Green Runic Seal */}
                <mesh position={[0.08, 0, 0.13]}>
                  <octahedronGeometry args={[0.05]} />
                  <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.2} />
                </mesh>
              </group>

              {/* --- TORSO & CHITINOUS CUIRASS --- */}
              <group position={[0, 0.24, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.12, 0]}>
                  <boxGeometry args={[0.34, 0.14, 0.23]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.8} />
                </mesh>
                {/* Upper Angular Chestplate */}
                <mesh castShadow position={[0, 0.04, 0.02]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.50, 0.24, 0.29]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.25} />
                </mesh>
                {/* Purple Mantle Layer */}
                <mesh castShadow position={[0, 0.05, 0.14]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.44, 0.18, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#9333ea" metalness={0.7} roughness={0.25} />
                </mesh>
                {/* Occult Core Siphon */}
                <mesh ref={coreMeshRef} position={[0, 0.04, 0.18]}>
                  <octahedronGeometry args={[0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22c55e", 1.8, true)} color="#22c55e" emissive="#22c55e" emissiveIntensity={1.8} />
                </mesh>
                {/* Dorsal Spire Pack */}
                <group position={[0, 0.05, -0.16]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.36, 0.26, 0.14]} />
                    <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.9} />
                  </mesh>
                  <mesh position={[-0.10, 0.16, 0]}>
                    <coneGeometry args={[0.035, 0.22, 4]} />
                    <meshStandardMaterial color="#9333ea" metalness={0.8} />
                  </mesh>
                  <mesh position={[0.10, 0.16, 0]}>
                    <coneGeometry args={[0.035, 0.22, 4]} />
                    <meshStandardMaterial color="#9333ea" metalness={0.8} />
                  </mesh>
                </group>
              </group>

              {/* --- ASYMMETRIC OCCULT PAULDRONS --- */}
              {/* Left Heavy Spire Pauldron */}
              <group position={[-0.50, 0.38, 0]} rotation={[0, 0, 0.22]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.28, 0.18, 0.40]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                <mesh position={[-0.04, 0.06, 0]}>
                  <boxGeometry args={[0.26, 0.08, 0.42]} />
                  <meshStandardMaterial color="#9333ea" metalness={0.8} />
                </mesh>
                <mesh position={[-0.10, 0.18, 0.08]}>
                  <coneGeometry args={[0.04, 0.24, 4]} />
                  <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
                </mesh>
                <mesh position={[-0.10, 0.18, -0.08]}>
                  <coneGeometry args={[0.04, 0.24, 4]} />
                  <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
                </mesh>
              </group>

              {/* Right Chain Bracket Pauldron */}
              <group position={[0.46, 0.36, 0]} rotation={[0, 0, -0.20]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.24, 0.16, 0.36]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                <mesh position={[0.04, -0.06, 0]}>
                  <torusGeometry args={[0.12, 0.02, 6, 12]} />
                  <meshStandardMaterial color="#9333ea" metalness={0.9} />
                </mesh>
              </group>

              {/* --- ARMS & CLAWED GAUNTLETS --- */}
              {/* Left Arm */}
              <group position={[-0.38, 0.18, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.11, 0.18, 0.13]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.7} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.13, 0.22, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                <mesh position={[0, -0.16, 0.11]}>
                  <boxGeometry args={[0.11, 0.06, 0.04]} />
                  <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
                </mesh>
              </group>

              {/* Right Arm */}
              <group position={[0.38, 0.18, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.11, 0.18, 0.13]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.7} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.13, 0.22, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                <mesh position={[0, -0.16, 0.11]}>
                  <boxGeometry args={[0.11, 0.06, 0.04]} />
                  <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
                </mesh>
              </group>

              {/* --- HEAD & OCCULT COWL HELM --- */}
              <group position={[0, 0.55, 0.02]}>
                {/* Neck */}
                <mesh position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.10, 0.12, 0.07, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} />
                </mesh>
                {/* Pointed Cowl Dome */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.25, 0.24, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#0f172a" metalness={0.85} roughness={0.25} />
                </mesh>
                {/* Glowing Toxic Green Visor Slit */}
                <mesh position={[0, 0.02, 0.14]}>
                  <boxGeometry args={[0.28, 0.07, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#22c55e", 1.8)} color="#22c55e" emissive="#22c55e" emissiveIntensity={1.8} />
                </mesh>
                {/* Sharp Cowl Horn Crests */}
                <mesh position={[-0.10, 0.16, 0]} rotation={[0, 0, 0.2]}>
                  <coneGeometry args={[0.04, 0.22, 4]} />
                  <meshStandardMaterial color="#9333ea" metalness={0.8} />
                </mesh>
                <mesh position={[0.10, 0.16, 0]} rotation={[0, 0, -0.2]}>
                  <coneGeometry args={[0.04, 0.22, 4]} />
                  <meshStandardMaterial color="#9333ea" metalness={0.8} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: RUNIC CATALYST SHARDS & CHAIN --- */}
              <group ref={weaponGroupRef} position={[0.55, 0.22, 0.15]}>
                {/* Central Hovering Catalyst Core */}
                <mesh>
                  <octahedronGeometry args={[0.14]} />
                  <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.8} />
                </mesh>
                {/* Orbiting Runic Shards */}
                <mesh position={[0.24, 0.10, 0]} rotation={[0.4, 0.2, 0]}>
                  <coneGeometry args={[0.05, 0.20, 3]} />
                  <meshStandardMaterial color="#9333ea" metalness={0.9} />
                </mesh>
                <mesh position={[-0.24, -0.10, 0]} rotation={[-0.4, -0.2, 0]}>
                  <coneGeometry args={[0.05, 0.20, 3]} />
                  <meshStandardMaterial color="#9333ea" metalness={0.9} />
                </mesh>
                {/* Ethereal Chain Links */}
                <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                  <torusGeometry args={[0.22, 0.015, 6, 16]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 6: RIFT — Slender Dimensional Warrior, Phase Violet     */}
          {/* ================================================================= */}
          {selectedCharacterId === "rift" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Slender Phase Humanoid) --- */}
              {/* Left Phase Boot */}
              <group position={[-0.18, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.08, 0.015, 6, 16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#8b5cf6", 0.6)} color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.6} />
                </mesh>
              </group>

              {/* Right Phase Boot */}
              <group position={[0.18, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.14, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.8} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.08, 0.015, 6, 16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#8b5cf6", 0.6)} color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.6} />
                </mesh>
              </group>

              {/* Left Split-Plate Greave */}
              <group position={[-0.18, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.11, 0.24, 0.04]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#8b5cf6" metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.13, 0.08, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#38bdf8", 0.5)} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
                </mesh>
              </group>

              {/* Right Split-Plate Greave */}
              <group position={[0.18, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.11, 0.24, 0.04]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#8b5cf6" metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.13, 0.08, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#38bdf8", 0.5)} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} />
                </mesh>
              </group>

              {/* Left Thigh */}
              <group position={[-0.16, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.22, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.7} />
                </mesh>
              </group>

              {/* Right Thigh */}
              <group position={[0.16, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.22, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.7} />
                </mesh>
              </group>

              {/* --- WAIST / PHASE HARNESS BELT --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.36, 0.10, 0.23]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} />
                </mesh>
                <mesh position={[-0.19, 0, 0]}>
                  <boxGeometry args={[0.05, 0.14, 0.14]} />
                  <meshStandardMaterial color="#8b5cf6" metalness={0.9} />
                </mesh>
                <mesh position={[0.19, 0, 0]}>
                  <boxGeometry args={[0.05, 0.14, 0.14]} />
                  <meshStandardMaterial color="#8b5cf6" metalness={0.9} />
                </mesh>
              </group>

              {/* --- TORSO & SPLIT DIAGONAL CUIRASS --- */}
              <group position={[0, 0.24, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.12, 0]}>
                  <boxGeometry args={[0.33, 0.14, 0.23]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.8} />
                </mesh>
                {/* Left Split Chestplate Panel */}
                <mesh castShadow position={[-0.12, 0.04, 0.02]} rotation={[0.08, 0, 0.08]}>
                  <boxGeometry args={[0.24, 0.25, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.8} roughness={0.25} />
                </mesh>
                {/* Right Split Chestplate Panel */}
                <mesh castShadow position={[0.12, 0.04, 0.02]} rotation={[0.08, 0, -0.08]}>
                  <boxGeometry args={[0.24, 0.25, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.8} roughness={0.25} />
                </mesh>
                {/* Central Dimensional Rift Fissure */}
                <mesh ref={coreMeshRef} position={[0, 0.04, 0.15]}>
                  <boxGeometry args={[0.08, 0.26, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#c084fc", 1.8, true)} color="#c084fc" emissive="#c084fc" emissiveIntensity={1.8} />
                </mesh>
                {/* Dorsal Phase Vanes */}
                <mesh castShadow position={[0, 0.04, -0.16]}>
                  <boxGeometry args={[0.34, 0.26, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.9} />
                </mesh>
              </group>

              {/* --- SHOULDERS & PHASE-BLADE PAULDRONS --- */}
              {/* Left Phase Blade */}
              <group position={[-0.48, 0.38, 0]} rotation={[0, 0.15, 0.22]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.26, 0.14, 0.38]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#8b5cf6" metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[-0.04, 0, -0.18]}>
                  <boxGeometry args={[0.24, 0.06, 0.04]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
                </mesh>
              </group>

              {/* Right Phase Blade */}
              <group position={[0.48, 0.38, 0]} rotation={[0, -0.15, -0.22]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.26, 0.14, 0.38]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#8b5cf6" metalness={0.85} roughness={0.2} />
                </mesh>
                <mesh position={[0.04, 0, -0.18]}>
                  <boxGeometry args={[0.24, 0.06, 0.04]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
                </mesh>
              </group>

              {/* --- ARMS & PRECISION GAUNTLETS --- */}
              {/* Left Arm */}
              <group position={[-0.37, 0.18, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.10, 0.18, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.7} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.12, 0.20, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.85} />
                </mesh>
              </group>

              {/* Right Arm (Disc Cradle) */}
              <group position={[0.37, 0.18, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.10, 0.18, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.7} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.12, 0.20, 0.14]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1e1b4b" metalness={0.85} />
                </mesh>
                <mesh position={[0.04, -0.16, 0.08]}>
                  <boxGeometry args={[0.06, 0.14, 0.06]} />
                  <meshStandardMaterial color="#8b5cf6" metalness={0.9} />
                </mesh>
              </group>

              {/* --- HEAD & PHASE HELMET --- */}
              <group position={[0, 0.55, 0.02]}>
                {/* Neck */}
                <mesh position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.10, 0.12, 0.07, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} />
                </mesh>
                {/* Helmet Facets */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.24, 0.23, 0.27]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#18181b" metalness={0.85} roughness={0.2} />
                </mesh>
                {/* Vertical Tachyon Rift Visor Slit */}
                <mesh position={[0, 0.02, 0.14]}>
                  <boxGeometry args={[0.06, 0.18, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#c084fc", 1.8)} color="#c084fc" emissive="#c084fc" emissiveIntensity={1.8} />
                </mesh>
                {/* Swept Dimensional Crest Fins */}
                <mesh position={[-0.10, 0.14, -0.06]} rotation={[-0.3, 0, -0.1]}>
                  <boxGeometry args={[0.03, 0.20, 0.18]} />
                  <meshStandardMaterial color="#8b5cf6" metalness={0.9} />
                </mesh>
                <mesh position={[0.10, 0.14, -0.06]} rotation={[-0.3, 0, 0.1]}>
                  <boxGeometry args={[0.03, 0.20, 0.18]} />
                  <meshStandardMaterial color="#8b5cf6" metalness={0.9} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: FLOATING RIFT DISC --- */}
              <group ref={weaponGroupRef} position={[0.55, 0.22, 0.15]}>
                {/* Rotating Dimensional Circular Disc */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.26, 0.26, 0.03, 16]} />
                  <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={1.2} metalness={0.9} />
                </mesh>
                {/* Outer Arc Cutting Blades */}
                <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
                  <torusGeometry args={[0.26, 0.02, 6, 20]} />
                  <meshStandardMaterial color="#c084fc" metalness={0.95} />
                </mesh>
                {/* Glowing Tachyon Core */}
                <mesh>
                  <sphereGeometry args={[0.08, 12, 12]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2.0} />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 7: FUSE — Demolition Specialist, Hazard Orange/Charcoal  */}
          {/* ================================================================= */}
          {selectedCharacterId === "fuse" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Rugged Industrial Humanoid) --- */}
              {/* Left Blast Boot */}
              <group position={[-0.24, -0.66, 0.04]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.20, 0.16, 0.34]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.7} roughness={0.4} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.22, 0.04, 0.36]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.02, 0.16]}>
                  <boxGeometry args={[0.18, 0.08, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f97316" metalness={0.65} />
                </mesh>
              </group>

              {/* Right Blast Boot */}
              <group position={[0.24, -0.66, 0.04]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.20, 0.16, 0.34]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.7} roughness={0.4} />
                </mesh>
                <mesh position={[0, -0.07, 0]}>
                  <boxGeometry args={[0.22, 0.04, 0.36]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.02, 0.16]}>
                  <boxGeometry args={[0.18, 0.08, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f97316" metalness={0.65} />
                </mesh>
              </group>

              {/* Left Armored Shin & Greave */}
              <group position={[-0.24, -0.44, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.18, 0.28, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.75} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0, 0.09]}>
                  <boxGeometry args={[0.16, 0.26, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f97316" metalness={0.65} />
                </mesh>
                <mesh position={[0, 0.14, 0.09]}>
                  <boxGeometry args={[0.20, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.85} />
                </mesh>
              </group>

              {/* Right Armored Shin & Greave */}
              <group position={[0.24, -0.44, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.18, 0.28, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.75} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0, 0.09]}>
                  <boxGeometry args={[0.16, 0.26, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f97316" metalness={0.65} />
                </mesh>
                <mesh position={[0, 0.14, 0.09]}>
                  <boxGeometry args={[0.20, 0.10, 0.10]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.85} />
                </mesh>
              </group>

              {/* Left Thigh & Pouch */}
              <group position={[-0.21, -0.16, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.17, 0.22, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.7} />
                </mesh>
                <mesh position={[-0.09, 0, 0]}>
                  <boxGeometry args={[0.06, 0.16, 0.14]} />
                  <meshStandardMaterial color="#1c1917" metalness={0.8} />
                </mesh>
              </group>

              {/* Right Thigh & Pouch */}
              <group position={[0.21, -0.16, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.17, 0.22, 0.18]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.7} />
                </mesh>
                <mesh position={[0.09, 0, 0]}>
                  <boxGeometry args={[0.06, 0.16, 0.14]} />
                  <meshStandardMaterial color="#1c1917" metalness={0.8} />
                </mesh>
              </group>

              {/* --- WAIST / UTILITY DUTY BELT --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.48, 0.12, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.85} />
                </mesh>
                <mesh position={[0, 0, 0.15]}>
                  <boxGeometry args={[0.18, 0.14, 0.06]} />
                  <meshStandardMaterial color="#f97316" metalness={0.7} />
                </mesh>
                {/* Left Hip Canister Cartridges */}
                <mesh position={[-0.26, 0, 0.04]} rotation={[0, 0, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.14, 8]} />
                  <meshStandardMaterial color="#eab308" metalness={0.8} />
                </mesh>
                <mesh position={[-0.26, 0, -0.04]} rotation={[0, 0, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.14, 8]} />
                  <meshStandardMaterial color="#eab308" metalness={0.8} />
                </mesh>
              </group>

              {/* --- TORSO & FLAK CUIRASS --- */}
              <group position={[0, 0.25, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.12, 0]}>
                  <boxGeometry args={[0.42, 0.16, 0.26]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.7} />
                </mesh>
                {/* Heavy Ballistic Chestplate */}
                <mesh castShadow position={[0, 0.04, 0.03]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.64, 0.26, 0.36]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f97316" metalness={0.65} roughness={0.3} />
                </mesh>
                {/* Diagonal Canister Bandolier Strap */}
                <mesh position={[0, 0.05, 0.17]} rotation={[0.08, 0, -0.3]}>
                  <boxGeometry args={[0.55, 0.08, 0.08]} />
                  <meshStandardMaterial color="#1c1917" metalness={0.8} />
                </mesh>
                {/* Hazard Core / Detonation Sensor */}
                <mesh ref={coreMeshRef} position={[0, 0.04, 0.21]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.22, 0.12, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f97316", 1.4, true)} color="#f97316" emissive="#f97316" emissiveIntensity={1.4} />
                </mesh>
                {/* Rear Heavy Blast Pack */}
                <mesh castShadow position={[0, 0.04, -0.19]}>
                  <boxGeometry args={[0.48, 0.28, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.9} />
                </mesh>
              </group>

              {/* --- ASYMMETRIC INDUSTRIAL PAULDRONS --- */}
              {/* Right Demolition Blast Shield */}
              <group position={[0.52, 0.38, 0]} rotation={[0, 0, -0.22]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.32, 0.20, 0.44]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f97316" metalness={0.7} roughness={0.3} />
                </mesh>
                <mesh position={[0.04, 0.06, 0]}>
                  <boxGeometry args={[0.26, 0.08, 0.46]} />
                  <meshStandardMaterial color="#eab308" metalness={0.8} />
                </mesh>
              </group>

              {/* Left Canister Dispenser Mount */}
              <group position={[-0.48, 0.38, 0]} rotation={[0, 0, 0.20]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.26, 0.18, 0.40]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.85} />
                </mesh>
                <mesh position={[-0.04, 0.12, 0.08]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
                  <meshStandardMaterial color="#f97316" metalness={0.7} />
                </mesh>
              </group>

              {/* --- ARMS & HEAVY INDUSTRIAL GAUNTLETS --- */}
              {/* Left Arm */}
              <group position={[-0.44, 0.20, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.15, 0.20, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.65} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.17, 0.22, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.85} />
                </mesh>
              </group>

              {/* Right Arm */}
              <group position={[0.44, 0.20, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.15, 0.20, 0.16]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.65} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.17, 0.22, 0.20]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.85} />
                </mesh>
              </group>

              {/* --- HEAD & BLAST HELMET --- */}
              <group position={[0, 0.56, 0.02]}>
                {/* Neck */}
                <mesh position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.12, 0.14, 0.08, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#1c1917" metalness={0.85} />
                </mesh>
                {/* Heavy Blast Helmet */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.28, 0.24, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#292524" metalness={0.75} roughness={0.3} />
                </mesh>
                {/* Reinforced Protective Visor */}
                <mesh position={[0, 0.02, 0.15]}>
                  <boxGeometry args={[0.30, 0.08, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#f97316", 1.4)} color="#f97316" emissive="#f97316" emissiveIntensity={1.4} />
                </mesh>
                {/* Heavy Brow Blast Plate */}
                <mesh position={[0, 0.10, 0.14]}>
                  <boxGeometry args={[0.26, 0.06, 0.06]} />
                  <meshStandardMaterial color="#f97316" metalness={0.8} />
                </mesh>
                {/* Communications Antenna Rod */}
                <mesh position={[-0.14, 0.16, -0.06]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
                  <meshStandardMaterial color="#eab308" metalness={0.9} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: PULSE MINE GAUNTLET LAUNCHER --- */}
              <group ref={weaponGroupRef} position={[0.58, 0.06, 0.18]} rotation={[0, 0.15, -0.25]}>
                {/* Launcher Arm Chassis */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[0.24, 0.14, 0.32]} />
                  <meshStandardMaterial color="#1c1917" metalness={0.85} roughness={0.3} />
                </mesh>
                {/* Chambered Cylindrical Pulse Mine Warhead */}
                <mesh position={[0, 0.04, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.26, 12]} />
                  <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.25} />
                </mesh>
                {/* Glowing Amber Priming Core */}
                <mesh position={[0, 0.04, 0.26]}>
                  <sphereGeometry args={[0.07, 12, 12]} />
                  <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.8} />
                </mesh>
                {/* Hazard Warning Ring */}
                <mesh position={[0, 0.04, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.12, 0.018, 6, 16]} />
                  <meshBasicMaterial color="#eab308" />
                </mesh>
              </group>
            </group>
          )}
          {/* ================================================================= */}
          {/* CHARACTER 8: LUX — Precision Energy Knight, White/Gold Armor     */}
          {/* ================================================================= */}
          {selectedCharacterId === "lux" && (
            <group>
              {/* --- LOWER BODY: BOOTS & LEGS (Tall Knightly Humanoid) --- */}
              {/* Left Knight Sabaton */}
              <group position={[-0.19, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.14, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[0, -0.06, 0]}>
                  <boxGeometry args={[0.14, 0.03, 0.32]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#facc15" metalness={0.95} />
                </mesh>
                <mesh position={[0, 0, 0.15]}>
                  <boxGeometry args={[0.12, 0.08, 0.08]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Knight Sabaton */}
              <group position={[0.19, -0.68, 0.02]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.14, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[0, -0.06, 0]}>
                  <boxGeometry args={[0.14, 0.03, 0.32]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#facc15" metalness={0.95} />
                </mesh>
                <mesh position={[0, 0, 0.15]}>
                  <boxGeometry args={[0.12, 0.08, 0.08]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* Left Tall Slender Greave */}
              <group position={[-0.19, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.04, 0.26, 0.04]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.15, 0.08, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#facc15", 0.5)} color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Tall Slender Greave */}
              <group position={[0.19, -0.46, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.13, 0.28, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[0, 0, 0.08]}>
                  <boxGeometry args={[0.04, 0.26, 0.04]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
                <mesh position={[0, 0.14, 0.08]}>
                  <boxGeometry args={[0.15, 0.08, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#facc15", 0.5)} color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* Left Cuisse / Thigh */}
              <group position={[-0.17, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.22, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>

              {/* Right Cuisse / Thigh */}
              <group position={[0.17, -0.17, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.14, 0.22, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>

              {/* --- WAIST / GILDED KNIGHT FAULD & TASSETS --- */}
              <group position={[0, 0.00, 0]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.38, 0.11, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#facc15" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Chevron Front Tasset */}
                <mesh position={[0, -0.06, 0.13]}>
                  <boxGeometry args={[0.18, 0.16, 0.04]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} />
                </mesh>
              </group>

              {/* --- TORSO & ELEGANT KNIGHT CUIRASS --- */}
              <group position={[0, 0.25, 0]}>
                {/* Lower Abdomen */}
                <mesh castShadow position={[0, -0.12, 0]}>
                  <boxGeometry args={[0.34, 0.14, 0.24]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} />
                </mesh>
                {/* V-Shaped Knight Breastplate */}
                <mesh castShadow position={[0, 0.04, 0.03]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.52, 0.25, 0.30]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                {/* Gold Chevron Breastplate Rim */}
                <mesh position={[0, 0.05, 0.16]} rotation={[0.08, 0, 0]}>
                  <boxGeometry args={[0.44, 0.18, 0.04]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
                {/* Radiant Solar Heart Core (Diamond Orientation) */}
                <mesh ref={coreMeshRef} position={[0, 0.04, 0.18]} rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.14, 0.14, 0.06]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#fef08a", 1.8, true)} color="#fef08a" emissive="#fef08a" emissiveIntensity={1.8} />
                </mesh>
                {/* Dorsal Capacitor Pack */}
                <mesh castShadow position={[0, 0.04, -0.16]}>
                  <boxGeometry args={[0.38, 0.26, 0.12]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.85} />
                </mesh>
              </group>

              {/* --- SHOULDERS & WINGED KNIGHT PAULDRONS --- */}
              {/* Left Winged Pauldron */}
              <group position={[-0.50, 0.39, 0]} rotation={[0, 0.12, 0.22]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.28, 0.18, 0.42]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[-0.04, 0.08, 0]}>
                  <boxGeometry args={[0.26, 0.10, 0.44]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Winged Pauldron */}
              <group position={[0.50, 0.39, 0]} rotation={[0, -0.12, -0.22]}>
                <mesh castShadow position={[0, 0, 0]}>
                  <boxGeometry args={[0.28, 0.18, 0.42]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[0.04, 0.08, 0]}>
                  <boxGeometry args={[0.26, 0.10, 0.44]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* --- ARMS & KNIGHT VAMBRACES --- */}
              {/* Left Arm */}
              <group position={[-0.39, 0.19, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.11, 0.18, 0.13]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.12, 0.20, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} />
                </mesh>
                <mesh position={[0, -0.06, 0.08]}>
                  <boxGeometry args={[0.06, 0.06, 0.04]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Arm */}
              <group position={[0.39, 0.19, 0]}>
                <mesh castShadow position={[0, 0.04, 0]}>
                  <boxGeometry args={[0.11, 0.18, 0.13]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0, -0.16, 0.03]}>
                  <boxGeometry args={[0.12, 0.20, 0.15]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} />
                </mesh>
                <mesh position={[0, -0.06, 0.08]}>
                  <boxGeometry args={[0.06, 0.06, 0.04]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* --- HEAD & SOLAR KNIGHT HELMET --- */}
              <group position={[0, 0.56, 0.02]}>
                {/* Neck */}
                <mesh position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.10, 0.12, 0.07, 8]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#facc15" metalness={0.9} />
                </mesh>
                {/* Helm Box */}
                <mesh castShadow position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.25, 0.24, 0.28]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m)} color="#f8fafc" metalness={0.8} roughness={0.15} />
                </mesh>
                {/* Horizontal Solar Visor Slit */}
                <mesh position={[0, 0.02, 0.14]}>
                  <boxGeometry args={[0.29, 0.07, 0.08]} />
                  <meshStandardMaterial ref={(m) => registerFlashMaterial(m, "#38bdf8", 1.8)} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.8} />
                </mesh>
                {/* Regal Sun-Crest Fin */}
                <mesh position={[0, 0.16, -0.02]} rotation={[-0.2, 0, 0]}>
                  <boxGeometry args={[0.04, 0.22, 0.26]} />
                  <meshStandardMaterial color="#facc15" metalness={0.95} />
                </mesh>
              </group>

              {/* --- SIGNATURE WEAPON: HIGH-PRECISION LIGHT LANCE --- */}
              <group ref={weaponGroupRef} position={[0.60, 0.18, 0.20]} rotation={[0, 0.1, 0.05]}>
                {/* Polished White Lance Haft */}
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 1.6, 8]} />
                  <meshStandardMaterial color="#f8fafc" emissive="#facc15" emissiveIntensity={1.2} metalness={0.85} />
                </mesh>
                {/* Radiant Focused Beam Emitter Cone */}
                <mesh position={[0, 0, 0.82]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.11, 0.34, 6]} />
                  <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={1.8} />
                </mesh>
                {/* Focusing Capacitor Ring */}
                <mesh position={[0, 0, -0.42]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.18, 0.018, 8, 20]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                {/* Gold Chevron Crossguard */}
                <mesh position={[0, 0, 0.2]}>
                  <boxGeometry args={[0.5, 0.035, 0.035]} />
                  <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={1.3} />
                </mesh>
              </group>
            </group>
          )}
          {/* Forward-facing Tactical Ground Indicator Chevron (Shared Readability) */}
          <mesh position={[0, -0.72, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.28, 3, 1, 0, Math.PI]} />
            <meshBasicMaterial
              color={
                selectedCharacterId === "byte"
                  ? "#22d3ee"
                  : selectedCharacterId === "tank"
                  ? "#ef4444"
                  : selectedCharacterId === "nova"
                  ? "#d946ef"
                  : selectedCharacterId === "hex"
                  ? "#22c55e"
                  : selectedCharacterId === "rift"
                  ? "#8b5cf6"
                  : selectedCharacterId === "fuse"
                  ? "#f97316"
                  : selectedCharacterId === "lux"
                  ? "#facc15"
                  : "#fbbf24"
              }
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* ================================================================= */}
        {/* PROCEDURAL ATTACK RELEASE VFX ARCS & PULSES                       */}
        {/* ================================================================= */}
        {/* BONK: Orange/Gold Hammer Arc */}
        <group ref={bonkArcGroupRef} visible={false} position={[0, 0.25, 0.4]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.75, 1.45, 32, 1, -Math.PI / 3, (2 * Math.PI) / 3]} />
            <meshBasicMaterial
              color="#f59e0b"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* BYTE: Cyan Circular Pulse */}
        <group ref={bytePulseGroupRef} visible={false} position={[0, 0.35, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.55, 32]} />
            <meshBasicMaterial
              color="#00e5ff"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* TANK: Red/White Metallic Cleave Arc */}
        <group ref={tankCleaveGroupRef} visible={false} position={[0, 0.35, 0.35]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.85, 1.65, 32, 1, -Math.PI / 2.4, (4 * Math.PI) / 5]} />
            <meshBasicMaterial
              color="#ef4444"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* NOVA: Expanding Astral Ring */}
        <group ref={novaRingGroupRef} visible={false} position={[0, 0.4, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.45, 0.75, 32]} />
            <meshBasicMaterial
              color="#e879f9"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.2, 0.4, 32]} />
            <meshBasicMaterial
              color="#fbbf24"
              side={THREE.DoubleSide}
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* HEX: Procedural Void/Rune Trail */}
        <group ref={hexTrailGroupRef} visible={false} position={[0, 0.3, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 1.15, 32, 1, 0, (4 * Math.PI) / 3]} />
            <meshBasicMaterial
              color="#a855f7"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <ringGeometry args={[0.3, 0.75, 32, 1, 0, Math.PI]} />
            <meshBasicMaterial
              color="#22c55e"
              side={THREE.DoubleSide}
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* RIFT: Violet Release Arc */}
        <group ref={riftArcGroupRef} visible={false} position={[0, 0.3, 0.3]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6, 1.3, 32, 1, -Math.PI / 3, (2 * Math.PI) / 3]} />
            <meshBasicMaterial
              color="#8b5cf6"
              side={THREE.DoubleSide}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* FUSE: Amber Blast Deploy */}
        <group ref={fuseDeployGroupRef} visible={false} position={[0, 0.3, 0.3]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.8, 32]} />
            <meshBasicMaterial
              color="#f97316"
              side={THREE.DoubleSide}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* LUX: Golden Solar Flash */}
        <group ref={luxFlashGroupRef} visible={false} position={[0, 0.3, 0.5]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.7, 32]} />
            <meshBasicMaterial
              color="#facc15"
              side={THREE.DoubleSide}
              transparent
              opacity={0.95}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
};
