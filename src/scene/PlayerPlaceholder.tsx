import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, CapsuleCollider } from "@react-three/rapier";
import { useGameStore } from "../store/gameStore";
import { CHARACTER_BASE_SPEEDS, ARENA_BOUNDARY_LIMIT, WEAPON_CONFIGS } from "../game/config";
import type { GameRuntime } from "../game/runtime";
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
      } else if (Math.random() < 0.12 && runtime.particles.length < 250) {
        // Subtle chill motes trailing behind slowed player
        runtime.particles.push({
          id: runtime.nextEntityId++,
          type: "frost",
          x: runtime.playerPosition.x + (Math.random() - 0.5) * 0.5,
          y: 0.3,
          z: runtime.playerPosition.z + (Math.random() - 0.5) * 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.2,
          vz: (Math.random() - 0.5) * 0.3,
          color: "#38bdf8",
          size: 0.1,
          life: 0,
          maxLife: 0.35,
        });
      }
    }

    // Preserve existing gameplay slow value
    const slowFactor = isSlowed && runtime ? runtime.playerSlowFactor : 1.0;
    const speed = baseSpeed * (1 + (upgrades.speed || 0) * 0.15) * slowFactor;

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
          // Idle: Heavy breathing, body weight shift, relaxed posture
          const breath = Math.sin(animTime * 2.8) * 0.045;
          const weightShift = Math.sin(animTime * 1.4) * 0.035;
          anchor.position.set(0, breath, hitKickZ);
          anchor.rotation.set(0.02, 0, weightShift);
        }

        // Hammer weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            // Hammer lifted high over right shoulder
            w.position.set(0.7, 0.1 + 0.35 * phaseProgress, 0.15 - 0.2 * phaseProgress);
            w.rotation.set(-0.85 * phaseProgress, -0.2 * phaseProgress, -0.45);
          } else if (attackPhase === "release") {
            // Violent slam downward and forward
            const slam = 1 - phaseProgress;
            w.position.set(0.7, 0.1 - 0.25 * slam, 0.15 + 0.35 * slam);
            w.rotation.set(1.2 * slam + 0.3, 0.25 * slam, -0.25);
          } else if (attackPhase === "recovery") {
            // Recoil bounce slowly settling back
            const rec = 1 - phaseProgress;
            const bounce = Math.sin(phaseProgress * 16) * 0.12 * rec;
            w.position.set(0.7, 0.1 + bounce, 0.15);
            w.rotation.set(0.2 + bounce, 0, -0.25);
          } else if (attackPhase === "movement") {
            // Hammer inertia trailing step cadence
            const inertia = Math.sin(walk * 0.55) * 0.10;
            w.position.set(0.7, 0.1, 0.15);
            w.rotation.set(0.28 + inertia, 0, -0.22);
          } else {
            // Slow idle hammer sway
            const sway = Math.sin(animTime * 1.8) * 0.08;
            w.position.set(0.7, 0.1, 0.15);
            w.rotation.set(0.18 + sway * 0.5, 0, -0.25 + sway);
          }
        }

        // Chest crest glow
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.2 * phaseProgress : 0;
          const intensity = 0.8 + Math.sin(animTime * 3.5) * 0.3 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = intensity;
          mat.emissiveIntensity = intensity;
        }
      } else if (selectedCharacterId === "byte") {
        // BYTE: Hovering Energy Caster
        if (attackPhase === "anticipation") {
          // Hover contraction: lifts slightly, slight back pitch
          anchor.position.set(0, 0.14 + 0.06 * phaseProgress, hitKickZ);
          anchor.rotation.set(-0.06 * phaseProgress, 0, 0);
        } else if (attackPhase === "release") {
          // Rapid release pulse: lightweight recoil kick
          const rec = 1 - phaseProgress;
          anchor.position.set(0, 0.14, hitKickZ - 0.12 * rec);
          anchor.rotation.set(-0.12 * rec, 0, 0);
        } else if (attackPhase === "recovery") {
          const rec = 1 - phaseProgress;
          anchor.position.set(0, 0.10 + 0.04 * rec, hitKickZ);
          anchor.rotation.set(-0.04 * rec, 0, 0);
        } else if (attackPhase === "movement") {
          // Directional hover lean with banking
          const hoverWave = Math.sin(animTime * 4.5) * 0.04;
          anchor.position.set(0, 0.12 + hoverWave, hitKickZ);
          anchor.rotation.set(0.18, 0, -moveX * 0.12);
        } else {
          // Idle: Smooth hover, vertical oscillation
          const hover = Math.sin(animTime * 3.5) * 0.08;
          const osc = Math.sin(animTime * 2.0) * 0.035;
          anchor.position.set(0, 0.10 + hover, hitKickZ);
          anchor.rotation.set(0, 0, osc);
        }

        // Energy orb satellite weapon motion
        if (weaponGroupRef.current) {
          const w = weaponGroupRef.current;
          if (attackPhase === "anticipation") {
            // Orb contracts inward closer to chest, spins 3x faster
            const r = 0.55 - 0.28 * phaseProgress;
            w.position.set(r, 0.25 + 0.05 * phaseProgress, 0.15);
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
            // Accelerated rotation & orbit contraction
            const s = 1.0 - 0.4 * phaseProgress;
            w.scale.set(s, s, s);
            w.rotation.y = -animTime * 8.0;
          } else if (attackPhase === "release") {
            // Violent fling outward
            const s = 0.6 + 0.8 * phaseProgress;
            w.scale.set(s, s, s);
            w.rotation.y -= animDelta * 10;
          } else {
            w.scale.set(1, 1, 1);
            w.position.y = 0.12 + Math.sin(animTime * 3.2) * 0.06;
            w.rotation.y = -animTime * 2.6;
          }
        }

        // Void eye glow
        if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
          const boost = attackPhase === "anticipation" ? 2.5 * phaseProgress : 0;
          const eyeGlow = 1.4 + Math.sin(animTime * 4.0) * 0.5 + boost;
          const mat = coreMeshRef.current.material as THREE.MeshStandardMaterial;
          mat.userData.currentAnimatedIntensity = eyeGlow;
          mat.emissiveIntensity = eyeGlow;
          const parent = coreMeshRef.current.parent;
          if (parent) {
            const children = parent.children;
            for (let i = 0; i < children.length; i++) {
              const childMesh = children[i] as THREE.Mesh;
              if (childMesh.material) {
                const cm = childMesh.material as THREE.MeshStandardMaterial;
                cm.userData.currentAnimatedIntensity = eyeGlow;
                cm.emissiveIntensity = eyeGlow;
              }
            }
          }
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

    // =========================================================================
    // Dynamic Hit Flash, White/Crimson Damage Tint & Frost Feedback
    // =========================================================================
    const isFlashing = currentInvuln > 0;
    const isWhiteFlash = hitReactionTimerRef.current > 0.20;

    flashMaterialsRef.current.forEach((mat) => {
      if (mat) {
        if (isWhiteFlash) {
          // Strong brief emissive white flash on initial damage impact
          mat.emissive.set("#ffffff");
          mat.emissiveIntensity = 1.5;
        } else if (isFlashing) {
          // Sustained damage reaction flash
          mat.emissive.set("#ef4444");
          mat.emissiveIntensity = 0.9;
        } else if (isSlowed) {
          // Subtle frosty blue/cyan feedback while preserving gameplay slow
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
              {/* Torso: Broad heavy armored chassis */}
              <mesh castShadow position={[0, 0, 0]}>
                <capsuleGeometry args={[0.5, 0.48, 8, 16]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#1e293b"
                  roughness={0.35}
                  metalness={0.5}
                />
              </mesh>

              {/* Layered Heavy Orange Breastplate */}
              <mesh castShadow position={[0, 0.06, 0.12]} rotation={[0.12, 0, 0]}>
                <boxGeometry args={[0.74, 0.44, 0.48]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#c2410c", 0.2)}
                  color="#ea580c"
                  roughness={0.28}
                  metalness={0.65}
                />
              </mesh>

              {/* Heavy Armored Belt & Hip Tassets */}
              <group position={[0, -0.22, 0]}>
                {/* Belt hoop */}
                <mesh position={[0, 0, 0]}>
                  <cylinderGeometry args={[0.52, 0.54, 0.16, 12]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0f172a"
                    metalness={0.8}
                    roughness={0.3}
                  />
                </mesh>
                {/* Center Gold Buckle */}
                <mesh position={[0, 0, 0.5]}>
                  <boxGeometry args={[0.22, 0.14, 0.1]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)}
                    color="#f59e0b"
                    metalness={0.9}
                    roughness={0.2}
                  />
                </mesh>
                {/* Left Hip Tasset */}
                <mesh position={[-0.5, -0.1, 0.05]} rotation={[0, 0, 0.2]}>
                  <boxGeometry args={[0.14, 0.28, 0.38]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#ea580c"
                    metalness={0.6}
                    roughness={0.3}
                  />
                </mesh>
                {/* Right Hip Tasset */}
                <mesh position={[0.5, -0.1, 0.05]} rotation={[0, 0, -0.2]}>
                  <boxGeometry args={[0.14, 0.28, 0.38]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#ea580c"
                    metalness={0.6}
                    roughness={0.3}
                  />
                </mesh>
              </group>

              {/* Double-Tiered Chunky Bruiser Pauldrons */}
              {/* Left Pauldron */}
              <group position={[-0.66, 0.26, 0]} rotation={[0, 0, 0.25]}>
                {/* Base tier dark plate */}
                <mesh castShadow position={[0, -0.06, 0]}>
                  <boxGeometry args={[0.36, 0.2, 0.52]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#1e293b"
                    metalness={0.8}
                  />
                </mesh>
                {/* Upper heavy gold-trimmed plate */}
                <mesh castShadow position={[-0.04, 0.08, 0]}>
                  <boxGeometry args={[0.42, 0.28, 0.54]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)}
                    color="#f59e0b"
                    roughness={0.2}
                    metalness={0.85}
                  />
                </mesh>
                {/* Pauldron studs */}
                <mesh position={[-0.24, 0.1, 0.18]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                <mesh position={[-0.24, 0.1, -0.18]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Pauldron */}
              <group position={[0.66, 0.26, 0]} rotation={[0, 0, -0.25]}>
                {/* Base tier dark plate */}
                <mesh castShadow position={[0, -0.06, 0]}>
                  <boxGeometry args={[0.36, 0.2, 0.52]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#1e293b"
                    metalness={0.8}
                  />
                </mesh>
                {/* Upper heavy gold-trimmed plate */}
                <mesh castShadow position={[0.04, 0.08, 0]}>
                  <boxGeometry args={[0.42, 0.28, 0.54]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)}
                    color="#f59e0b"
                    roughness={0.2}
                    metalness={0.85}
                  />
                </mesh>
                {/* Pauldron studs */}
                <mesh position={[0.24, 0.1, 0.18]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
                <mesh position={[0.24, 0.1, -0.18]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>

              {/* Bruiser Helmet with Spiky Hair Crest, Iconic Beard Guard & Horn Exhausts */}
              <group position={[0, 0.52, 0.05]}>
                {/* Main Helmet Dome */}
                <mesh castShadow>
                  <sphereGeometry args={[0.36, 16, 14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#1e293b"
                    metalness={0.7}
                    roughness={0.25}
                  />
                </mesh>

                {/* Swept-Back Hair / Crest Silhouette (Front, Mid, Rear) */}
                <group position={[0, 0.24, -0.02]}>
                  {/* Front hair lock */}
                  <mesh position={[0, 0.08, 0.18]} rotation={[-0.35, 0, 0]}>
                    <coneGeometry args={[0.08, 0.26, 4]} />
                    <meshStandardMaterial color="#f59e0b" metalness={0.65} roughness={0.3} />
                  </mesh>
                  {/* Mid hair lock (tallest) */}
                  <mesh position={[0, 0.14, 0]} rotation={[-0.1, 0, 0]}>
                    <coneGeometry args={[0.09, 0.32, 4]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
                  </mesh>
                  {/* Rear swept hair lock */}
                  <mesh position={[0, 0.06, -0.2]} rotation={[0.4, 0, 0]}>
                    <coneGeometry args={[0.09, 0.28, 4]} />
                    <meshStandardMaterial color="#ea580c" metalness={0.65} roughness={0.3} />
                  </mesh>
                </group>

                {/* Iconic Silver-White Beard / Chin Armor Guard (from bonk.svg) */}
                <group position={[0, -0.18, 0.26]} rotation={[0.15, 0, 0]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.34, 0.22, 0.18]} />
                    <meshStandardMaterial
                      ref={(m) => registerFlashMaterial(m)}
                      color="#f4f7fb"
                      roughness={0.2}
                      metalness={0.4}
                    />
                  </mesh>
                  {/* Golden Beard Plate Bottom Rim */}
                  <mesh position={[0, -0.11, 0.02]}>
                    <boxGeometry args={[0.36, 0.06, 0.2]} />
                    <meshStandardMaterial
                      ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)}
                      color="#f59e0b"
                      metalness={0.85}
                      roughness={0.25}
                    />
                  </mesh>
                </group>

                {/* Dominant Forward-Pointing Golden Visor (Top-Down Facing Readability) */}
                <mesh position={[0, 0.04, 0.33]}>
                  <boxGeometry args={[0.44, 0.13, 0.14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#fbbf24", 1.1)}
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.1}
                  />
                </mesh>

                {/* Dual Bruiser Horn Exhausts */}
                <mesh position={[-0.32, 0.2, -0.05]} rotation={[0, 0, 0.5]}>
                  <coneGeometry args={[0.1, 0.34, 6]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[0.32, 0.2, -0.05]} rotation={[0, 0, -0.5]}>
                  <coneGeometry args={[0.1, 0.34, 6]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>

              {/* Heavy Chest Chevron Crest (Directional Facing Indicator with subtle pulse) */}
              <group position={[0, 0.08, 0.46]} rotation={[0.2, 0, 0]}>
                <mesh ref={coreMeshRef}>
                  <boxGeometry args={[0.38, 0.24, 0.14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.8, true)}
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={0.8}
                    metalness={0.9}
                    roughness={0.2}
                  />
                </mesh>
                {/* Flanking gold collar plates */}
                <mesh position={[-0.24, 0.08, -0.04]} rotation={[0, 0, -0.3]}>
                  <boxGeometry args={[0.12, 0.18, 0.1]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.85} />
                </mesh>
                <mesh position={[0.24, 0.08, -0.04]} rotation={[0, 0, 0.3]}>
                  <boxGeometry args={[0.12, 0.18, 0.1]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.85} />
                </mesh>
              </group>

              {/* Ornate Kinetic Mega Warhammer Attachment */}
              <group ref={weaponGroupRef} position={[0.7, 0.1, 0.15]} rotation={[0.2, 0, -0.2]}>
                {/* Dark Textured Titanium Haft */}
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, 1.25, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
                </mesh>
                {/* Gold Grip Rings */}
                <mesh position={[0, 0.05, 0]}>
                  <torusGeometry args={[0.055, 0.015, 6, 12]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.95} />
                </mesh>
                <mesh position={[0, 0.35, 0]}>
                  <torusGeometry args={[0.055, 0.015, 6, 12]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.95} />
                </mesh>
                {/* Counterweight Spiked Pommel at base */}
                <mesh position={[0, -0.48, 0]}>
                  <octahedronGeometry args={[0.09]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Massive Double Hammer Head */}
                <mesh castShadow position={[0, 0.7, 0]}>
                  <boxGeometry args={[0.52, 0.36, 0.36]} />
                  <meshStandardMaterial
                    color="#ea580c"
                    emissive="#c2410c"
                    emissiveIntensity={0.35}
                    roughness={0.25}
                    metalness={0.7}
                  />
                </mesh>
                {/* Front Heavy Impact Strike Plate */}
                <mesh position={[0, 0.7, 0.22]}>
                  <boxGeometry args={[0.42, 0.28, 0.1]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Rear Heavy Impact Strike Plate */}
                <mesh position={[0, 0.7, -0.22]}>
                  <boxGeometry args={[0.42, 0.28, 0.1]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Crown Top Spike */}
                <mesh position={[0, 0.94, 0]}>
                  <coneGeometry args={[0.08, 0.22, 5]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Glowing Hammer Energy Core Conduit */}
                <mesh position={[0, 0.7, 0]}>
                  <cylinderGeometry args={[0.09, 0.09, 0.4, 8]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.6}
                  />
                </mesh>
              </group>
            </group>
          )}

          {/* ================================================================= */}
          {/* CHARACTER 2: BYTE — Agile Futuristic Caster, Cyan/Purple Core    */}
          {/* ================================================================= */}
          {selectedCharacterId === "byte" && (
            <group>
              {/* Sleek Aerodynamic Caster-Tech Chassis */}
              <mesh castShadow position={[0, 0, 0]}>
                <capsuleGeometry args={[0.38, 0.46, 8, 16]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#0f172a"
                  roughness={0.25}
                  metalness={0.75}
                />
              </mesh>

              {/* Cyan Circuit Inset Panels */}
              <mesh position={[0, 0.02, 0.12]}>
                <boxGeometry args={[0.42, 0.44, 0.38]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#06b6d4", 0.5)}
                  color="#06b6d4"
                  roughness={0.2}
                  metalness={0.6}
                />
              </mesh>

              {/* Violet Aerodynamic Flank Winglets */}
              <mesh castShadow position={[-0.46, 0.14, -0.06]} rotation={[0.2, 0.3, 0.4]}>
                <boxGeometry args={[0.14, 0.42, 0.28]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#a855f7", 0.5)}
                  color="#a855f7"
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
              <mesh castShadow position={[0.46, 0.14, -0.06]} rotation={[0.2, -0.3, -0.4]}>
                <boxGeometry args={[0.14, 0.42, 0.28]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#a855f7", 0.5)}
                  color="#a855f7"
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>

              {/* Floating Tech Diamond Shoulder Nodes */}
              <group position={[-0.56, 0.26, 0]} rotation={[0, 0, 0.3]}>
                <mesh>
                  <octahedronGeometry args={[0.15]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 0.8)}
                    color="#0f172a"
                    emissive="#22d3ee"
                    emissiveIntensity={0.8}
                    metalness={0.85}
                  />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <torusGeometry args={[0.18, 0.015, 6, 16]} />
                  <meshBasicMaterial color="#a855f7" />
                </mesh>
              </group>
              <group position={[0.56, 0.26, 0]} rotation={[0, 0, -0.3]}>
                <mesh>
                  <octahedronGeometry args={[0.15]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 0.8)}
                    color="#0f172a"
                    emissive="#22d3ee"
                    emissiveIntensity={0.8}
                    metalness={0.85}
                  />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <torusGeometry args={[0.18, 0.015, 6, 16]} />
                  <meshBasicMaterial color="#a855f7" />
                </mesh>
              </group>

              {/* Pulsing Arc Reactor Chest Core */}
              <group position={[0, 0.06, 0.36]}>
                {/* Outer tech bezel */}
                <mesh>
                  <torusGeometry args={[0.18, 0.025, 8, 20]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.9} />
                </mesh>
                {/* Glowing reactor core */}
                <mesh ref={coreMeshRef}>
                  <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.8, true)}
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={1.8}
                  />
                </mesh>
              </group>

              {/* Sleek Cybernetic Helmet with Sharp Tech Hood & Forehead Chevron */}
              <group position={[0, 0.5, 0]}>
                {/* Inner head base */}
                <mesh castShadow>
                  <sphereGeometry args={[0.29, 16, 14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0b0f19"
                    metalness={0.85}
                    roughness={0.2}
                  />
                </mesh>

                {/* Sharp Tech Cowl / Hood (framing the head) */}
                <mesh position={[0, 0.06, -0.04]} rotation={[-0.15, 0, 0]}>
                  <cylinderGeometry args={[0.34, 0.38, 0.38, 6]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#171d2b"
                    metalness={0.8}
                    roughness={0.3}
                  />
                </mesh>

                {/* Iconic Forehead Chevron Crest (direct from byte.svg) */}
                <mesh position={[0, 0.22, 0.26]} rotation={[0, 0, Math.PI]}>
                  <coneGeometry args={[0.08, 0.18, 3]} />
                  <meshStandardMaterial
                    color="#f4f7fb"
                    metalness={0.5}
                    roughness={0.15}
                  />
                </mesh>

                {/* Wide Neon Cyan Cyber Visor (Dominant Facing Readability) */}
                <mesh position={[0, 0.02, 0.25]}>
                  <boxGeometry args={[0.44, 0.12, 0.14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.8, true)}
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={1.8}
                  />
                </mesh>

                {/* Twin Cyber Optic Pupils (direct from byte.svg) */}
                <mesh position={[-0.1, 0.02, 0.31]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.04, 8]} />
                  <meshBasicMaterial color="#080b12" />
                </mesh>
                <mesh position={[0.1, 0.02, 0.31]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.04, 8]} />
                  <meshBasicMaterial color="#080b12" />
                </mesh>

                {/* Swept Dorsal Fin pointing backward */}
                <mesh position={[0, 0.24, -0.16]} rotation={[-0.45, 0, 0]}>
                  <boxGeometry args={[0.06, 0.28, 0.36]} />
                  <meshStandardMaterial color="#a855f7" metalness={0.9} />
                </mesh>
              </group>

              {/* Dual Rear Mag-Lev Thrusters with Ion Cones */}
              <group position={[0, -0.15, -0.32]}>
                <mesh position={[-0.2, 0, 0]} rotation={[0.3, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} />
                </mesh>
                <mesh position={[0.2, 0, 0]} rotation={[0.3, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} />
                </mesh>
                {/* Glowing Ion Exhaust Cones */}
                <mesh position={[-0.2, -0.15, -0.05]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.07, 0.16, 8]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                <mesh position={[0.2, -0.15, -0.05]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.07, 0.16, 8]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
              </group>

              {/* Floating Nested-Gimbal Energy Orb Satellite */}
              <group ref={weaponGroupRef} position={[0.55, 0.25, 0.15]}>
                {/* Glowing Plasma Sphere Core */}
                <mesh>
                  <sphereGeometry args={[0.16, 16, 16]} />
                  <meshStandardMaterial
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={2.0}
                    roughness={0.1}
                  />
                </mesh>
                {/* Rotating Outer Violet Gimbal Ring */}
                <mesh rotation={[Math.PI / 3, 0, 0]}>
                  <torusGeometry args={[0.28, 0.025, 8, 24]} />
                  <meshStandardMaterial
                    color="#a855f7"
                    emissive="#a855f7"
                    emissiveIntensity={0.9}
                    metalness={0.9}
                  />
                </mesh>
                {/* Rotating Inner Cyan Gimbal Ring */}
                <mesh rotation={[-Math.PI / 4, 0, Math.PI / 2]}>
                  <torusGeometry args={[0.22, 0.02, 8, 20]} />
                  <meshStandardMaterial
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={1.2}
                    metalness={0.9}
                  />
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
              {/* Massive Armored Obsidian Body Chassis */}
              <mesh castShadow position={[0, 0, 0]}>
                <capsuleGeometry args={[0.58, 0.44, 8, 16]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#1e293b"
                  metalness={0.75}
                  roughness={0.35}
                />
              </mesh>

              {/* Colossal Double-Tiered Bastion Shoulder Shields */}
              {/* Left Bastion Shoulder */}
              <group position={[-0.84, 0.25, 0]} rotation={[0, 0, 0.35]}>
                {/* Base heavy dark mount */}
                <mesh castShadow position={[0.06, -0.04, 0]}>
                  <boxGeometry args={[0.36, 0.44, 0.58]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0f172a"
                    metalness={0.85}
                  />
                </mesh>
                {/* Massive outer crimson bastion shield plate */}
                <mesh castShadow position={[-0.04, 0.06, 0]}>
                  <boxGeometry args={[0.44, 0.6, 0.72]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#dc2626", 0.5)}
                    color="#dc2626"
                    roughness={0.28}
                    metalness={0.65}
                  />
                </mesh>
                {/* Shield silver rim armor band */}
                <mesh position={[-0.24, 0.06, 0]}>
                  <boxGeometry args={[0.06, 0.62, 0.74]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Industrial bolt studs */}
                <mesh position={[-0.25, 0.28, 0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
                <mesh position={[-0.25, -0.18, 0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
                <mesh position={[-0.25, 0.28, -0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
                <mesh position={[-0.25, -0.18, -0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
              </group>

              {/* Right Bastion Shoulder */}
              <group position={[0.84, 0.25, 0]} rotation={[0, 0, -0.35]}>
                {/* Base heavy dark mount */}
                <mesh castShadow position={[-0.06, -0.04, 0]}>
                  <boxGeometry args={[0.36, 0.44, 0.58]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0f172a"
                    metalness={0.85}
                  />
                </mesh>
                {/* Massive outer crimson bastion shield plate */}
                <mesh castShadow position={[0.04, 0.06, 0]}>
                  <boxGeometry args={[0.44, 0.6, 0.72]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#dc2626", 0.5)}
                    color="#dc2626"
                    roughness={0.28}
                    metalness={0.65}
                  />
                </mesh>
                {/* Shield silver rim armor band */}
                <mesh position={[0.24, 0.06, 0]}>
                  <boxGeometry args={[0.06, 0.62, 0.74]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Industrial bolt studs */}
                <mesh position={[0.25, 0.28, 0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
                <mesh position={[0.25, -0.18, 0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
                <mesh position={[0.25, 0.28, -0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
                <mesh position={[0.25, -0.18, -0.26]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.06, 6]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
                </mesh>
              </group>

              {/* Heavy Reinforced Frontal Prow / Chest Chevron */}
              <mesh position={[0, 0.08, 0.56]} rotation={[0.25, 0, 0]}>
                <boxGeometry args={[0.56, 0.4, 0.18]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#dc2626", 0.5)}
                  color="#dc2626"
                  metalness={0.75}
                  roughness={0.25}
                />
              </mesh>

              {/* Iconic Fortress Chin / Lower Chest Plate (direct from tank.svg) */}
              <group position={[0, -0.14, 0.62]} rotation={[0.15, 0, 0]}>
                <mesh>
                  <boxGeometry args={[0.38, 0.18, 0.12]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#f4f7fb"
                    metalness={0.5}
                    roughness={0.2}
                  />
                </mesh>
              </group>

              {/* Heavy Segmented Skirt / Thigh Tassets */}
              <group position={[0, -0.25, 0]}>
                <mesh position={[-0.45, -0.08, 0.1]} rotation={[0, 0, 0.15]}>
                  <boxGeometry args={[0.18, 0.3, 0.44]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.8} />
                </mesh>
                <mesh position={[0.45, -0.08, 0.1]} rotation={[0, 0, -0.15]}>
                  <boxGeometry args={[0.18, 0.3, 0.44]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.8} />
                </mesh>
              </group>

              {/* Heavy Fortress Knight Greathelm with Aggressive Swept-Forward Horns */}
              <group position={[0, 0.55, 0.05]}>
                {/* Helm block */}
                <mesh castShadow>
                  <boxGeometry args={[0.54, 0.44, 0.54]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0f172a"
                    metalness={0.85}
                    roughness={0.25}
                  />
                </mesh>

                {/* Aggressive Swept-Forward Horns (Menacing Silhouette) */}
                <group position={[-0.34, 0.24, 0.14]} rotation={[0.55, 0, 0.4]}>
                  <mesh>
                    <coneGeometry args={[0.11, 0.44, 6]} />
                    <meshStandardMaterial color="#991b1b" metalness={0.8} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.22, 0]}>
                    <coneGeometry args={[0.06, 0.18, 6]} />
                    <meshStandardMaterial color="#ef4444" metalness={0.85} />
                  </mesh>
                </group>
                <group position={[0.34, 0.24, 0.14]} rotation={[0.55, 0, -0.4]}>
                  <mesh>
                    <coneGeometry args={[0.11, 0.44, 6]} />
                    <meshStandardMaterial color="#991b1b" metalness={0.8} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, 0.22, 0]}>
                    <coneGeometry args={[0.06, 0.18, 6]} />
                    <meshStandardMaterial color="#ef4444" metalness={0.85} />
                  </mesh>
                </group>

                {/* Glowing Crimson Armor Slit Visor (Facing & Intimidation) */}
                <mesh ref={coreMeshRef} position={[0, 0.02, 0.29]}>
                  <boxGeometry args={[0.46, 0.09, 0.08]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#ef4444", 1.8, true)}
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={1.8}
                  />
                </mesh>
                {/* White hot horizontal center visor slit (from tank.svg) */}
                <mesh position={[0, 0.02, 0.33]}>
                  <boxGeometry args={[0.24, 0.04, 0.04]} />
                  <meshStandardMaterial color="#f4f7fb" roughness={0.1} />
                </mesh>

                {/* Top Helm Ridge Plating */}
                <mesh position={[0, 0.25, 0]}>
                  <boxGeometry args={[0.18, 0.16, 0.6]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.85} />
                </mesh>
              </group>

              {/* Dual Heavy Back Exhaust Stacks with Heat Glow */}
              <group position={[0, 0.4, -0.42]}>
                <mesh position={[-0.32, 0.12, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.54, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[0.32, 0.12, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.54, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Internal heat glow */}
                <mesh position={[-0.32, 0.38, 0]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="#f59e0b" />
                </mesh>
                <mesh position={[0.32, 0.38, 0]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="#f59e0b" />
                </mesh>
              </group>

              {/* Aggressive Cleaving Battleaxe Attachment */}
              <group ref={weaponGroupRef} position={[0.72, 0.1, -0.1]} rotation={[0.2, 0.1, 0.15]}>
                {/* Reinforced Shaft */}
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, 1.25, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
                </mesh>
                {/* Heavy Crescent Axe Blade */}
                <mesh castShadow position={[0, 0.65, 0.22]}>
                  <boxGeometry args={[0.09, 0.62, 0.42]} />
                  <meshStandardMaterial
                    color="#dc2626"
                    roughness={0.25}
                    metalness={0.7}
                  />
                </mesh>
                {/* Honed Razor Chrome Cutting Edge */}
                <mesh position={[0, 0.65, 0.44]}>
                  <boxGeometry args={[0.03, 0.66, 0.14]} />
                  <meshStandardMaterial color="#f1f5f9" metalness={0.95} roughness={0.1} />
                </mesh>
                {/* Rear Armor-Piercing Back Spike */}
                <mesh position={[0, 0.65, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.09, 0.3, 4]} />
                  <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Central Ruby Energy Socket */}
                <mesh position={[0, 0.65, 0.02]}>
                  <sphereGeometry args={[0.07, 8, 8]} />
                  <meshStandardMaterial
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={1.8}
                  />
                </mesh>
              </group>
            </group>
          )}

          {/* ================================================================= */}
          {/* CHARACTER 4: NOVA — Arcane Burst Specialist, Violet/Magenta/Gold  */}
          {/* ================================================================= */}
          {selectedCharacterId === "nova" && (
            <group>
              {/* Star-Faceted Arcane Robe Chassis */}
              <mesh castShadow position={[0, 0, 0]}>
                <cylinderGeometry args={[0.36, 0.46, 0.86, 6]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#3b0764"
                  roughness={0.35}
                  metalness={0.45}
                />
              </mesh>

              {/* Layered Radiant Magenta Chevron Chest Plates */}
              <mesh position={[0, 0.08, 0.1]}>
                <cylinderGeometry args={[0.38, 0.44, 0.48, 3]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#d946ef", 0.6)}
                  color="#c084fc"
                  metalness={0.65}
                  roughness={0.25}
                />
              </mesh>

              {/* Gold Astral Corset & Floating Arcane Ribbons */}
              <group position={[0, -0.16, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.39, 0.43, 0.16, 12]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.4)}
                    color="#fbbf24"
                    metalness={0.9}
                    roughness={0.2}
                  />
                </mesh>
                {/* Left Arcane Ribbon */}
                <mesh position={[-0.38, -0.2, 0.05]} rotation={[0.1, 0, 0.2]}>
                  <boxGeometry args={[0.08, 0.4, 0.18]} />
                  <meshStandardMaterial color="#d946ef" metalness={0.7} />
                </mesh>
                {/* Right Arcane Ribbon */}
                <mesh position={[0.38, -0.2, 0.05]} rotation={[0.1, 0, -0.2]}>
                  <boxGeometry args={[0.08, 0.4, 0.18]} />
                  <meshStandardMaterial color="#d946ef" metalness={0.7} />
                </mesh>
              </group>

              {/* Floating 8-Point Arcane Star Crest (Back Silhouette from nova.svg) */}
              <group position={[0, 0.28, -0.42]}>
                {/* Central Star Hub */}
                <mesh>
                  <cylinderGeometry args={[0.16, 0.16, 0.05, 8]} />
                  <meshStandardMaterial color="#171d2b" metalness={0.8} />
                </mesh>
                {/* Cardinal Primary Gold Star Spires */}
                <mesh position={[0, 0.28, 0]}>
                  <coneGeometry args={[0.08, 0.46, 4]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                <mesh position={[0, -0.28, 0]} rotation={[0, 0, Math.PI]}>
                  <coneGeometry args={[0.08, 0.46, 4]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                <mesh position={[0.28, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.08, 0.46, 4]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <coneGeometry args={[0.08, 0.46, 4]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Diagonal Secondary Magenta Star Spires */}
                <mesh position={[0.2, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
                  <coneGeometry args={[0.06, 0.36, 4]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#c084fc"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                  />
                </mesh>
                <mesh position={[-0.2, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
                  <coneGeometry args={[0.06, 0.36, 4]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#c084fc"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                  />
                </mesh>
                <mesh position={[0.2, -0.2, 0]} rotation={[0, 0, -3 * Math.PI / 4]}>
                  <coneGeometry args={[0.06, 0.36, 4]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#c084fc"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                  />
                </mesh>
                <mesh position={[-0.2, -0.2, 0]} rotation={[0, 0, 3 * Math.PI / 4]}>
                  <coneGeometry args={[0.06, 0.36, 4]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#c084fc"
                    emissiveIntensity={0.8}
                    metalness={0.8}
                  />
                </mesh>
              </group>

              {/* Radiant Star Octahedron Pauldrons */}
              <group position={[-0.56, 0.24, 0]} rotation={[0, 0, 0.35]}>
                <mesh castShadow>
                  <octahedronGeometry args={[0.26]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#d946ef", 0.6)}
                    color="#d946ef"
                    metalness={0.7}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[-0.14, 0.08, 0]}>
                  <coneGeometry args={[0.06, 0.2, 4]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>
              <group position={[0.56, 0.24, 0]} rotation={[0, 0, -0.35]}>
                <mesh castShadow>
                  <octahedronGeometry args={[0.26]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#d946ef", 0.6)}
                    color="#d946ef"
                    metalness={0.7}
                    roughness={0.2}
                  />
                </mesh>
                <mesh position={[0.14, 0.08, 0]}>
                  <coneGeometry args={[0.06, 0.2, 4]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} />
                </mesh>
              </group>

              {/* Astral Crown & Head with 5 Golden Spires & Flowing Locks */}
              <group position={[0, 0.55, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.29, 16, 14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#2e1065"
                    metalness={0.5}
                    roughness={0.3}
                  />
                </mesh>

                {/* Flowing Astral Magenta Locks */}
                <group position={[0, -0.05, -0.15]}>
                  <mesh position={[-0.16, -0.1, 0]} rotation={[0.2, 0, -0.1]}>
                    <coneGeometry args={[0.07, 0.32, 4]} />
                    <meshStandardMaterial color="#d946ef" metalness={0.6} />
                  </mesh>
                  <mesh position={[0.16, -0.1, 0]} rotation={[0.2, 0, 0.1]}>
                    <coneGeometry args={[0.07, 0.32, 4]} />
                    <meshStandardMaterial color="#d946ef" metalness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.14, -0.05]} rotation={[0.3, 0, 0]}>
                    <coneGeometry args={[0.08, 0.36, 4]} />
                    <meshStandardMaterial color="#c084fc" metalness={0.6} />
                  </mesh>
                </group>

                {/* Glowing Magenta Visor */}
                <mesh position={[0, 0.02, 0.26]}>
                  <boxGeometry args={[0.4, 0.12, 0.12]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#f472b6", 1.6)}
                    color="#f472b6"
                    emissive="#f472b6"
                    emissiveIntensity={1.6}
                  />
                </mesh>

                {/* 5-Spire Gold Astral Crown (direct from nova.svg) */}
                <group position={[0, 0.26, 0.04]}>
                  {/* Center Tall Spire */}
                  <mesh position={[0, 0.12, 0]}>
                    <coneGeometry args={[0.08, 0.36, 5]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                  </mesh>
                  {/* Flanking Mid Spires */}
                  <mesh position={[-0.14, 0.06, 0]} rotation={[0, 0, 0.2]}>
                    <coneGeometry args={[0.06, 0.28, 4]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                  </mesh>
                  <mesh position={[0.14, 0.06, 0]} rotation={[0, 0, -0.2]}>
                    <coneGeometry args={[0.06, 0.28, 4]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                  </mesh>
                  {/* Outer Short Spires */}
                  <mesh position={[-0.24, 0, -0.04]} rotation={[0, 0, 0.35]}>
                    <coneGeometry args={[0.05, 0.22, 4]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                  </mesh>
                  <mesh position={[0.24, 0, -0.04]} rotation={[0, 0, -0.35]}>
                    <coneGeometry args={[0.05, 0.22, 4]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                  </mesh>
                </group>
              </group>

              {/* Magical Centerpiece: Star Frame + Glowing White-Hot Heart Gem (direct from nova.svg) */}
              <group position={[0, 0.06, 0.36]}>
                {/* Gold Star Frame Setting */}
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.26, 0.26, 0.06]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.2} />
                </mesh>
                {/* Glowing White-Hot Heart Gem */}
                <mesh ref={coreMeshRef}>
                  <octahedronGeometry args={[0.16]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#f472b6", 1.8, true)}
                    color="#ffffff"
                    emissive="#f472b6"
                    emissiveIntensity={1.8}
                    roughness={0.1}
                  />
                </mesh>
              </group>

              {/* Floating Concentric Astral Focus Ring Weapon with Star Crystals */}
              <group ref={weaponGroupRef} position={[0, 0.3, 0]}>
                {/* Outer Gold Ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.76, 0.024, 8, 32]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={0.7}
                    metalness={0.95}
                  />
                </mesh>
                {/* Inner Magenta Ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.54, 0.02, 8, 32]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#d946ef"
                    emissiveIntensity={0.9}
                    metalness={0.9}
                  />
                </mesh>
                {/* 4 Orbiting Star Crystal Fragments */}
                <mesh position={[0.76, 0, 0]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#d946ef"
                    emissiveIntensity={1.2}
                  />
                </mesh>
                <mesh position={[-0.76, 0, 0]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshStandardMaterial
                    color="#d946ef"
                    emissive="#d946ef"
                    emissiveIntensity={1.2}
                  />
                </mesh>
                <mesh position={[0, 0, 0.76]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.2}
                  />
                </mesh>
                <mesh position={[0, 0, -0.76]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.2}
                  />
                </mesh>
              </group>
            </group>
          )}

          {/* ================================================================= */}
          {/* CHARACTER 5: HEX — Void Chain Controller, Black/Neon Green/Violet */}
          {/* ================================================================= */}
          {selectedCharacterId === "hex" && (
            <group>
              {/* Dark Void Robe Mantle Chassis */}
              <mesh castShadow position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.34, 0.48, 0.88, 7]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#09090b"
                  roughness={0.85}
                  metalness={0.35}
                />
              </mesh>

              {/* Deep Void Purple Mantle Collar with Emerald Trim */}
              <mesh position={[0, 0.12, 0.02]}>
                <cylinderGeometry args={[0.4, 0.36, 0.28, 6]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#22c55e", 0.5)}
                  color="#2e1065"
                  metalness={0.65}
                  roughness={0.3}
                />
              </mesh>

              {/* Tattered Lower Void Ribbons */}
              <group position={[0, -0.38, 0]}>
                <mesh position={[-0.24, -0.1, 0.1]} rotation={[0.15, 0, 0.1]}>
                  <boxGeometry args={[0.08, 0.35, 0.2]} />
                  <meshStandardMaterial color="#1e1035" roughness={0.8} />
                </mesh>
                <mesh position={[0.24, -0.1, 0.1]} rotation={[0.15, 0, -0.1]}>
                  <boxGeometry args={[0.08, 0.35, 0.2]} />
                  <meshStandardMaterial color="#1e1035" roughness={0.8} />
                </mesh>
                <mesh position={[0, -0.12, -0.2]} rotation={[-0.2, 0, 0]}>
                  <boxGeometry args={[0.16, 0.38, 0.08]} />
                  <meshStandardMaterial color="#1e1035" roughness={0.8} />
                </mesh>
              </group>

              {/* Chest Void Talisman Sigil */}
              <mesh position={[0, 0.06, 0.36]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.14, 0.14, 0.06]} />
                <meshStandardMaterial
                  color="#22c55e"
                  emissive="#22c55e"
                  emissiveIntensity={1.8}
                />
              </mesh>

              {/* Tiered Void Mantle Pauldrons with Emerald Runic Thorns */}
              <group position={[-0.52, 0.18, 0]} rotation={[0.1, 0, 0.3]}>
                <mesh castShadow>
                  <boxGeometry args={[0.28, 0.38, 0.42]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22c55e", 0.4)}
                    color="#15803d"
                    metalness={0.7}
                    roughness={0.3}
                  />
                </mesh>
                {/* Runic thorn spike */}
                <mesh position={[-0.14, 0.16, 0]} rotation={[0, 0, 0.4]}>
                  <coneGeometry args={[0.06, 0.24, 4]} />
                  <meshStandardMaterial
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={1.2}
                  />
                </mesh>
              </group>
              <group position={[0.52, 0.18, 0]} rotation={[0.1, 0, -0.3]}>
                <mesh castShadow>
                  <boxGeometry args={[0.28, 0.38, 0.42]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22c55e", 0.4)}
                    color="#15803d"
                    metalness={0.7}
                    roughness={0.3}
                  />
                </mesh>
                {/* Runic thorn spike */}
                <mesh position={[0.14, 0.16, 0]} rotation={[0, 0, -0.4]}>
                  <coneGeometry args={[0.06, 0.24, 4]} />
                  <meshStandardMaterial
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={1.2}
                  />
                </mesh>
              </group>

              {/* Masked Peaked Dark Cowl with Curved Emerald Horn Antennas & Hex Eyes */}
              <group position={[0, 0.52, 0.02]}>
                {/* Cowl Base */}
                <mesh castShadow>
                  <boxGeometry args={[0.44, 0.46, 0.46]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#09090b"
                    metalness={0.75}
                    roughness={0.4}
                  />
                </mesh>

                {/* Peaked Hood Crown Crest */}
                <mesh position={[0, 0.26, -0.06]} rotation={[-0.2, 0, 0]}>
                  <coneGeometry args={[0.24, 0.34, 4]} />
                  <meshStandardMaterial
                    color="#2e1065"
                    metalness={0.65}
                    roughness={0.35}
                  />
                </mesh>

                {/* Prominent Curved Emerald Void Horn Antennas (exact from hex.svg) */}
                <group position={[-0.25, 0.32, 0.06]} rotation={[0.25, 0, 0.45]}>
                  <mesh>
                    <coneGeometry args={[0.1, 0.48, 4]} />
                    <meshStandardMaterial
                      color="#22c55e"
                      emissive="#22c55e"
                      emissiveIntensity={1.4}
                      metalness={0.8}
                      roughness={0.2}
                    />
                  </mesh>
                  {/* Horn tip */}
                  <mesh position={[0, 0.24, 0]}>
                    <coneGeometry args={[0.05, 0.2, 4]} />
                    <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={1.5} />
                  </mesh>
                </group>
                <group position={[0.25, 0.32, 0.06]} rotation={[0.25, 0, -0.45]}>
                  <mesh>
                    <coneGeometry args={[0.1, 0.48, 4]} />
                    <meshStandardMaterial
                      color="#22c55e"
                      emissive="#22c55e"
                      emissiveIntensity={1.4}
                      metalness={0.8}
                      roughness={0.2}
                    />
                  </mesh>
                  {/* Horn tip */}
                  <mesh position={[0, 0.24, 0]}>
                    <coneGeometry args={[0.05, 0.2, 4]} />
                    <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={1.5} />
                  </mesh>
                </group>

                {/* Void Mask Faceplate with Violet Rim (direct from hex.svg) */}
                <mesh position={[0, -0.02, 0.24]}>
                  <boxGeometry args={[0.36, 0.3, 0.08]} />
                  <meshStandardMaterial
                    color="#050508"
                    metalness={0.9}
                    roughness={0.2}
                  />
                </mesh>
                {/* Violet Mask Border Frame */}
                <mesh position={[0, -0.02, 0.26]}>
                  <torusGeometry args={[0.17, 0.018, 6, 16]} />
                  <meshStandardMaterial
                    color="#8b5cf6"
                    emissive="#8b5cf6"
                    emissiveIntensity={0.9}
                  />
                </mesh>

                {/* Glowing Twin Diamond Hex Eyes (direct from hex.svg) */}
                <group position={[0, 0.02, 0.28]}>
                  {/* Left Diamond Hex Eye */}
                  <mesh ref={coreMeshRef} position={[-0.085, 0, 0]}>
                    <octahedronGeometry args={[0.06]} />
                    <meshStandardMaterial
                      ref={(m) => registerFlashMaterial(m, "#22c55e", 2.0, true)}
                      color="#22c55e"
                      emissive="#22c55e"
                      emissiveIntensity={2.0}
                    />
                  </mesh>
                  {/* Right Diamond Hex Eye */}
                  <mesh position={[0.085, 0, 0]}>
                    <octahedronGeometry args={[0.06]} />
                    <meshStandardMaterial
                      ref={(m) => registerFlashMaterial(m, "#22c55e", 2.0, true)}
                      color="#22c55e"
                      emissive="#22c55e"
                      emissiveIntensity={2.0}
                    />
                  </mesh>
                </group>
              </group>

              {/* Floating Orbiting Void Runic Shards Weapon with Emerald Glyphs */}
              <group ref={weaponGroupRef} position={[0, 0.25, 0]}>
                {/* Triad of Orbiting Runic Glyph Tablets */}
                {Array.from({ length: 3 }).map((_, idx) => {
                  const angle = (idx * Math.PI * 2) / 3;
                  const r = 0.68;
                  return (
                    <group
                      key={idx}
                      position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
                      rotation={[0, -angle, 0.3]}
                    >
                      {/* Dark Runic Tablet */}
                      <mesh>
                        <boxGeometry args={[0.14, 0.32, 0.045]} />
                        <meshStandardMaterial
                          color="#09090b"
                          roughness={0.4}
                          metalness={0.8}
                        />
                      </mesh>
                      {/* Violet Tablet Border Rim */}
                      <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.15, 0.33, 0.03]} />
                        <meshStandardMaterial color="#6b21a8" metalness={0.7} />
                      </mesh>
                      {/* Glowing Emerald Glyph Core */}
                      <mesh position={[0, 0, 0.028]}>
                        <boxGeometry args={[0.07, 0.2, 0.015]} />
                        <meshStandardMaterial
                          color="#22c55e"
                          emissive="#22c55e"
                          emissiveIntensity={1.6}
                        />
                      </mesh>
                      {/* Floating Void Link Particle */}
                      <mesh position={[0, 0.2, 0]}>
                        <octahedronGeometry args={[0.035]} />
                        <meshBasicMaterial color="#22c55e" />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            </group>
          )}

          {/* Forward-facing Tactical Ground Indicator Chevron (Shared Readability) */}
          <mesh position={[0, -0.5, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
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
      </group>
    </RigidBody>
  );
};
