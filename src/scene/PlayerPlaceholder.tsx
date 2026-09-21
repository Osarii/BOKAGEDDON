import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useGameStore } from "../store/gameStore";
import { CHARACTER_BASE_SPEEDS, ARENA_BOUNDARY_LIMIT } from "../game/config";
import type { GameRuntime } from "../game/runtime";

interface PlayerPlaceholderProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

export const PlayerPlaceholder: React.FC<PlayerPlaceholderProps> = ({
  runtimeRef,
}) => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const modelAnchorRef = useRef<THREE.Group>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);

  // References for dynamic hit-flash material tints
  const flashMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  // High-frequency input state kept in ref to prevent React re-renders
  const keysRef = useRef<Record<string, boolean>>({});
  const lastFacingRef = useRef<number>(0);
  const walkCycleRef = useRef<number>(0);

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
  useFrame((state, delta) => {
    if (!bodyRef.current) return;

    const runtime = runtimeRef.current;
    const gameStatus = useGameStore.getState().gameStatus;
    const time = state.clock.elapsedTime;

    // Halt physics velocity when paused / level-up / game over
    if (gameStatus !== "playing") {
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const upgrades = useGameStore.getState().upgrades;
    const baseSpeed = CHARACTER_BASE_SPEEDS[selectedCharacterId] || 5.0;
    const speed = baseSpeed * (1 + (upgrades.speed || 0) * 0.15);

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
    // When near or against the boundary, cancel any outward velocity component so the player
    // glides smoothly along the perimeter without vibrating or snapping.
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
      walkCycleRef.current += delta * speed * 2.8;
    }

    if (meshGroupRef.current) {
      let diff = lastFacingRef.current - meshGroupRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const t = 1 - Math.exp(-15 * Math.min(delta, 0.1));
      meshGroupRef.current.rotation.y += diff * t;
    }

    // Subtle walk stride / breathing idle animation on the inner visual anchor
    if (modelAnchorRef.current) {
      const isInvulnerable = !!(runtime && runtime.playerInvulnerableTimer > 0);
      const isMoving = inputLength > 0;

      if (isMoving) {
        // Dynamic walking stride with subtle banking tilt
        const strideBob = Math.abs(Math.sin(walkCycleRef.current)) * 0.1;
        const strideRoll = Math.sin(walkCycleRef.current) * 0.06;
        modelAnchorRef.current.position.y = strideBob;
        modelAnchorRef.current.rotation.z = -strideRoll;
        modelAnchorRef.current.rotation.x = 0.08; // Lean forward into motion
      } else {
        // Idle breathing motion
        if (selectedCharacterId === "byte") {
          // BYTE floats smoothly on hover repulsors
          const hover = Math.sin(time * 3.5) * 0.08;
          modelAnchorRef.current.position.y = 0.06 + hover;
          modelAnchorRef.current.rotation.z = Math.sin(time * 2.0) * 0.03;
          modelAnchorRef.current.rotation.x = 0;
        } else if (selectedCharacterId === "nova") {
          // NOVA floats on radiant cosmic repulsion
          const hover = Math.sin(time * 3.8) * 0.09;
          modelAnchorRef.current.position.y = 0.08 + hover;
          modelAnchorRef.current.rotation.z = Math.sin(time * 1.8) * 0.04;
          modelAnchorRef.current.rotation.x = 0;
        } else if (selectedCharacterId === "hex") {
          // HEX hovers with eerie void levitation
          const hover = Math.sin(time * 2.6) * 0.07;
          modelAnchorRef.current.position.y = 0.05 + hover;
          modelAnchorRef.current.rotation.z = Math.sin(time * 2.2) * 0.03;
          modelAnchorRef.current.rotation.x = 0;
        } else {
          // Grounded subtle breath
          const breath = Math.sin(time * 4) * 0.03;
          modelAnchorRef.current.position.y = breath;
          modelAnchorRef.current.rotation.z = 0;
          modelAnchorRef.current.rotation.x = 0;
        }
      }

      // Hit feedback: squash & stretch pulse on damage
      if (isInvulnerable) {
        const pulse = 1.0 + Math.sin(runtime!.playerInvulnerableTimer * 25) * 0.14;
        modelAnchorRef.current.scale.set(pulse, 2 - pulse, pulse);
      } else {
        modelAnchorRef.current.scale.set(1, 1, 1);
      }
    }

    // Character-specific weapon/core subtle animations
    if (selectedCharacterId === "bonk" && weaponGroupRef.current) {
      // Hammer idle ready sway
      const hammerSway = Math.sin(time * 3) * 0.08;
      weaponGroupRef.current.rotation.z = -0.25 + hammerSway;
      weaponGroupRef.current.rotation.x = 0.2 + hammerSway * 0.5;
    } else if (selectedCharacterId === "byte") {
      if (weaponGroupRef.current) {
        // Orbiting energy satellite
        weaponGroupRef.current.rotation.y = time * 3.2;
        weaponGroupRef.current.position.y = 0.2 + Math.sin(time * 4) * 0.06;
      }
      if (coreMeshRef.current) {
        // Pulsing chest core
        const coreGlow = 1.2 + Math.sin(time * 6) * 0.4;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = coreGlow;
      }
    } else if (selectedCharacterId === "nova") {
      if (weaponGroupRef.current) {
        // Rotating astral focus ring
        weaponGroupRef.current.rotation.y = time * 2.4;
        weaponGroupRef.current.rotation.z = Math.sin(time * 2.0) * 0.15;
      }
      if (coreMeshRef.current) {
        // Pulsing cosmic star core
        const coreGlow = 1.4 + Math.sin(time * 5.0) * 0.5;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = coreGlow;
      }
    } else if (selectedCharacterId === "hex") {
      if (weaponGroupRef.current) {
        // Orbiting triad of void runic shards
        weaponGroupRef.current.rotation.y = -time * 2.6;
        weaponGroupRef.current.position.y = 0.12 + Math.sin(time * 3.2) * 0.06;
      }
      if (coreMeshRef.current) {
        // Eerie void eye pulse
        const eyeGlow = 1.2 + Math.sin(time * 4.0) * 0.4;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeGlow;
      }
    }

    // Visual i-frame hit flash effect across registered materials
    const isFlashing = !!(runtime && runtime.playerInvulnerableTimer > 0);
    flashMaterialsRef.current.forEach((mat) => {
      if (mat) {
        if (isFlashing) {
          mat.emissive.set("#ef4444");
          mat.emissiveIntensity = 0.9;
        } else {
          mat.emissive.copy(mat.userData.baseEmissive || new THREE.Color("#000000"));
          mat.emissiveIntensity = mat.userData.baseIntensity || 0;
        }
      }
    });
  });

  // Helper to register materials for dynamic hit flashes
  const registerFlashMaterial = (mat: THREE.MeshStandardMaterial | null, baseEmissive = "#000000", baseIntensity = 0) => {
    if (mat && !flashMaterialsRef.current.includes(mat)) {
      mat.userData.baseEmissive = new THREE.Color(baseEmissive);
      mat.userData.baseIntensity = baseIntensity;
      flashMaterialsRef.current.push(mat);
    }
  };

  return (
    <RigidBody
      ref={bodyRef}
      colliders="hull"
      position={[0, 1.2, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={2}
    >
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
                  color="#ea580c"
                  roughness={0.35}
                  metalness={0.3}
                />
              </mesh>

              {/* Heavy Golden Shoulder Pauldrons */}
              <mesh castShadow position={[-0.62, 0.28, 0]} rotation={[0, 0, 0.25]}>
                <boxGeometry args={[0.38, 0.3, 0.48]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)}
                  color="#f59e0b"
                  roughness={0.25}
                  metalness={0.8}
                />
              </mesh>
              <mesh castShadow position={[0.62, 0.28, 0]} rotation={[0, 0, -0.25]}>
                <boxGeometry args={[0.38, 0.3, 0.48]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#f59e0b", 0.3)}
                  color="#f59e0b"
                  roughness={0.25}
                  metalness={0.8}
                />
              </mesh>

              {/* Reinforced Bruiser Helmet with Golden Brow & Horn Antennas */}
              <group position={[0, 0.52, 0.05]}>
                {/* Main Helmet Dome */}
                <mesh castShadow>
                  <sphereGeometry args={[0.36, 16, 14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#1e293b"
                    metalness={0.6}
                    roughness={0.3}
                  />
                </mesh>
                {/* Prominent Forward-Pointing Golden Visor (Top-Down Facing Readability) */}
                <mesh position={[0, 0.02, 0.32]}>
                  <boxGeometry args={[0.42, 0.14, 0.12]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.9)}
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={0.9}
                  />
                </mesh>
                {/* Dual Bruiser Horn Exhausts */}
                <mesh position={[-0.32, 0.2, -0.05]} rotation={[0, 0, 0.5]}>
                  <coneGeometry args={[0.1, 0.32, 5]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} />
                </mesh>
                <mesh position={[0.32, 0.2, -0.05]} rotation={[0, 0, -0.5]}>
                  <coneGeometry args={[0.1, 0.32, 5]} />
                  <meshStandardMaterial color="#f59e0b" metalness={0.9} />
                </mesh>
              </group>

              {/* Heavy Chest Chevron Crest (Directional Facing Indicator) */}
              <mesh position={[0, 0.08, 0.48]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[0.36, 0.24, 0.12]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.5)}
                  color="#fbbf24"
                  metalness={0.85}
                  roughness={0.25}
                />
              </mesh>

              {/* Iconic Kinetic Mega Warhammer Attachment */}
              <group ref={weaponGroupRef} position={[0.68, 0.1, 0.15]} rotation={[0.2, 0, -0.2]}>
                {/* Dark Textured Titanium Haft */}
                <mesh position={[0, 0.15, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, 1.15, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
                </mesh>
                {/* Massive Double Hammer Head */}
                <mesh castShadow position={[0, 0.65, 0]}>
                  <boxGeometry args={[0.48, 0.34, 0.32]} />
                  <meshStandardMaterial
                    color="#ea580c"
                    emissive="#c2410c"
                    emissiveIntensity={0.4}
                    roughness={0.25}
                    metalness={0.7}
                  />
                </mesh>
                {/* Front Heavy Impact Strike Plate */}
                <mesh position={[0, 0.65, 0.2]}>
                  <boxGeometry args={[0.38, 0.26, 0.1]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
                </mesh>
                {/* Glowing Hammer Energy Core Conduit */}
                <mesh position={[0, 0.65, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 0.36, 8]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={1.4}
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
              {/* Sleek Aerodynamic Torso */}
              <mesh castShadow position={[0, 0, 0]}>
                <capsuleGeometry args={[0.38, 0.44, 8, 16]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#06b6d4"
                  roughness={0.25}
                  metalness={0.4}
                />
              </mesh>

              {/* Violet Winglets / Aerodynamic Shoulder Plates */}
              <mesh castShadow position={[-0.45, 0.15, -0.05]} rotation={[0.2, 0.3, 0.4]}>
                <boxGeometry args={[0.2, 0.4, 0.3]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#a855f7", 0.4)}
                  color="#a855f7"
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>
              <mesh castShadow position={[0.45, 0.15, -0.05]} rotation={[0.2, -0.3, -0.4]}>
                <boxGeometry args={[0.2, 0.4, 0.3]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#a855f7", 0.4)}
                  color="#a855f7"
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>

              {/* Pulsing Arc Reactor Chest Core */}
              <mesh ref={coreMeshRef} position={[0, 0.05, 0.36]}>
                <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
                <meshStandardMaterial
                  color="#22d3ee"
                  emissive="#06b6d4"
                  emissiveIntensity={1.5}
                />
              </mesh>

              {/* Sleek Cybernetic Helmet with Wrap-around Neon Cyan Visor */}
              <group position={[0, 0.48, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.3, 16, 14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0f172a"
                    metalness={0.8}
                    roughness={0.25}
                  />
                </mesh>
                {/* Wide Cyber Visor (Dominant Facing Readability) */}
                <mesh position={[0, 0.02, 0.25]}>
                  <boxGeometry args={[0.44, 0.1, 0.14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.2)}
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={1.3}
                  />
                </mesh>
                {/* Swept Dorsal Fin pointing backward */}
                <mesh position={[0, 0.22, -0.15]} rotation={[-0.45, 0, 0]}>
                  <boxGeometry args={[0.06, 0.25, 0.32]} />
                  <meshStandardMaterial color="#a855f7" metalness={0.85} />
                </mesh>
              </group>

              {/* Dual Rear Mag-Lev Thrusters (Emitting Soft Blue Glow) */}
              <group position={[0, -0.15, -0.32]}>
                <mesh position={[-0.2, 0, 0]} rotation={[0.3, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} />
                </mesh>
                <mesh position={[0.2, 0, 0]} rotation={[0.3, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.9} />
                </mesh>
                <mesh position={[-0.2, -0.14, -0.04]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
                <mesh position={[0.2, -0.14, -0.04]}>
                  <sphereGeometry args={[0.06, 8, 8]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
              </group>

              {/* Floating Orbiting Energy Orb Satellite */}
              <group ref={weaponGroupRef} position={[0.55, 0.25, 0.15]}>
                {/* Glowing Plasma Sphere */}
                <mesh>
                  <sphereGeometry args={[0.16, 16, 16]} />
                  <meshStandardMaterial
                    color="#22d3ee"
                    emissive="#22d3ee"
                    emissiveIntensity={1.8}
                    roughness={0.1}
                  />
                </mesh>
                {/* Rotating Mag-Ring Gimbal */}
                <mesh rotation={[Math.PI / 3, 0, 0]}>
                  <torusGeometry args={[0.26, 0.03, 8, 24]} />
                  <meshStandardMaterial
                    color="#a855f7"
                    emissive="#a855f7"
                    emissiveIntensity={0.8}
                    metalness={0.9}
                  />
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
                  metalness={0.7}
                  roughness={0.35}
                />
              </mesh>

              {/* Colossal Bastion Shoulder Shields (Heavy Defensive Silhouette) */}
              <mesh castShadow position={[-0.78, 0.25, 0]} rotation={[0, 0, 0.35]}>
                <boxGeometry args={[0.42, 0.52, 0.62]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#dc2626", 0.4)}
                  color="#dc2626"
                  roughness={0.3}
                  metalness={0.6}
                />
              </mesh>
              <mesh castShadow position={[0.78, 0.25, 0]} rotation={[0, 0, -0.35]}>
                <boxGeometry args={[0.42, 0.52, 0.62]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#dc2626", 0.4)}
                  color="#dc2626"
                  roughness={0.3}
                  metalness={0.6}
                />
              </mesh>

              {/* Heavy Reinforced Frontal Prow / Chest Chevron (Instant Forward Facing) */}
              <mesh position={[0, 0.08, 0.58]} rotation={[0.25, 0, 0]}>
                <boxGeometry args={[0.54, 0.38, 0.16]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#dc2626", 0.4)}
                  color="#dc2626"
                  metalness={0.75}
                  roughness={0.25}
                />
              </mesh>

              {/* Heavy Fortress Knight Visor & Helm */}
              <group position={[0, 0.55, 0.05]}>
                <mesh castShadow>
                  <boxGeometry args={[0.54, 0.42, 0.54]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#0f172a"
                    metalness={0.85}
                    roughness={0.3}
                  />
                </mesh>
                {/* Glowing Crimson Armor Slit Visor (Facing & Intimidation) */}
                <mesh position={[0, 0.02, 0.29]}>
                  <boxGeometry args={[0.44, 0.08, 0.06]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#ef4444", 1.4)}
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={1.4}
                  />
                </mesh>
                {/* Top Helm Ridge Plating */}
                <mesh position={[0, 0.24, 0]}>
                  <boxGeometry args={[0.16, 0.14, 0.58]} />
                  <meshStandardMaterial color="#dc2626" metalness={0.8} />
                </mesh>
              </group>

              {/* Dual Heavy Back Exhaust Stacks */}
              <group position={[0, 0.4, -0.42]}>
                <mesh position={[-0.32, 0.1, 0]}>
                  <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[0.32, 0.1, 0]}>
                  <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Heat Glow inside exhausts */}
                <mesh position={[-0.32, 0.36, 0]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="#f59e0b" />
                </mesh>
                <mesh position={[0.32, 0.36, 0]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="#f59e0b" />
                </mesh>
              </group>
            </group>
          )}

          {/* ================================================================= */}
          {/* CHARACTER 4: NOVA — Arcane Burst Specialist, Violet/Magenta/Gold  */}
          {/* ================================================================= */}
          {selectedCharacterId === "nova" && (
            <group>
              {/* Star-Faceted Arcane Torso */}
              <mesh castShadow position={[0, 0, 0]}>
                <cylinderGeometry args={[0.36, 0.44, 0.82, 6]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#7e22ce"
                  roughness={0.25}
                  metalness={0.45}
                />
              </mesh>

              {/* Radiant Star Pauldrons */}
              <mesh castShadow position={[-0.52, 0.22, 0]} rotation={[0, 0, 0.35]}>
                <octahedronGeometry args={[0.26]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#d946ef", 0.5)}
                  color="#d946ef"
                  metalness={0.65}
                  roughness={0.25}
                />
              </mesh>
              <mesh castShadow position={[0.52, 0.22, 0]} rotation={[0, 0, -0.35]}>
                <octahedronGeometry args={[0.26]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#d946ef", 0.5)}
                  color="#d946ef"
                  metalness={0.65}
                  roughness={0.25}
                />
              </mesh>

              {/* Astral Crown & Head */}
              <group position={[0, 0.55, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[0.3, 16, 14]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#2e1065"
                    metalness={0.5}
                    roughness={0.3}
                  />
                </mesh>
                {/* Glowing Magenta Visor */}
                <mesh position={[0, 0.02, 0.26]}>
                  <boxGeometry args={[0.38, 0.12, 0.1]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#d946ef", 1.4)}
                    color="#d946ef"
                    emissive="#d946ef"
                    emissiveIntensity={1.4}
                  />
                </mesh>
                {/* Gold Astral Crown Spire */}
                <mesh position={[0, 0.3, 0]}>
                  <coneGeometry args={[0.12, 0.32, 5]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
                </mesh>
              </group>

              {/* Pulsing Arcane Heart Core */}
              <mesh ref={coreMeshRef} position={[0, 0.06, 0.34]}>
                <octahedronGeometry args={[0.2]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#f472b6", 1.4)}
                  color="#f472b6"
                  emissive="#f472b6"
                  emissiveIntensity={1.4}
                />
              </mesh>

              {/* Floating Astral Focus Ring */}
              <group ref={weaponGroupRef} position={[0, 0.3, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.72, 0.025, 8, 32]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#fbbf24"
                    emissiveIntensity={0.6}
                    metalness={0.9}
                  />
                </mesh>
                {/* Orbiting Star Crystal Fragments */}
                <mesh position={[0.72, 0, 0]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshBasicMaterial color="#d946ef" />
                </mesh>
                <mesh position={[-0.36, 0, 0.62]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshBasicMaterial color="#fbbf24" />
                </mesh>
                <mesh position={[-0.36, 0, -0.62]}>
                  <octahedronGeometry args={[0.1]} />
                  <meshBasicMaterial color="#d946ef" />
                </mesh>
              </group>
            </group>
          )}

          {/* ================================================================= */}
          {/* CHARACTER 5: HEX — Void Chain Controller, Black/Neon Green/Violet */}
          {/* ================================================================= */}
          {selectedCharacterId === "hex" && (
            <group>
              {/* Dark Void Robe Mantle */}
              <mesh castShadow position={[0, -0.05, 0]}>
                <cylinderGeometry args={[0.34, 0.46, 0.85, 7]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m)}
                  color="#09090b"
                  roughness={0.8}
                  metalness={0.3}
                />
              </mesh>

              {/* Shoulder Mantle Pauldrons with Emerald Runic Trim */}
              <mesh castShadow position={[-0.48, 0.18, 0]} rotation={[0.1, 0, 0.3]}>
                <boxGeometry args={[0.26, 0.35, 0.38]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#22c55e", 0.4)}
                  color="#15803d"
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>
              <mesh castShadow position={[0.48, 0.18, 0]} rotation={[0.1, 0, -0.3]}>
                <boxGeometry args={[0.26, 0.35, 0.38]} />
                <meshStandardMaterial
                  ref={(m) => registerFlashMaterial(m, "#22c55e", 0.4)}
                  color="#15803d"
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>

              {/* Masked Dark Hood with Void Horns */}
              <group position={[0, 0.52, 0.02]}>
                <mesh castShadow>
                  <boxGeometry args={[0.44, 0.44, 0.44]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m)}
                    color="#09090b"
                    metalness={0.7}
                    roughness={0.4}
                  />
                </mesh>
                {/* Glowing Emerald Twin Eye Slits */}
                <mesh ref={coreMeshRef} position={[0, 0.02, 0.24]}>
                  <boxGeometry args={[0.34, 0.08, 0.06]} />
                  <meshStandardMaterial
                    ref={(m) => registerFlashMaterial(m, "#22c55e", 1.4)}
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={1.4}
                  />
                </mesh>
                {/* Sharp Void Horn Antennas */}
                <mesh position={[-0.22, 0.28, 0.05]} rotation={[0.2, 0, 0.4]}>
                  <coneGeometry args={[0.08, 0.38, 4]} />
                  <meshStandardMaterial
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={0.8}
                  />
                </mesh>
                <mesh position={[0.22, 0.28, 0.05]} rotation={[0.2, 0, -0.4]}>
                  <coneGeometry args={[0.08, 0.38, 4]} />
                  <meshStandardMaterial
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={0.8}
                  />
                </mesh>
              </group>

              {/* Floating Void Runic Shards */}
              <group ref={weaponGroupRef} position={[0, 0.25, 0]}>
                {/* Triad of Orbiting Runic Glyph Tablets */}
                {Array.from({ length: 3 }).map((_, idx) => {
                  const angle = (idx * Math.PI * 2) / 3;
                  const r = 0.65;
                  return (
                    <group
                      key={idx}
                      position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
                      rotation={[0, -angle, 0.3]}
                    >
                      <mesh>
                        <boxGeometry args={[0.12, 0.28, 0.04]} />
                        <meshStandardMaterial
                          color="#09090b"
                          roughness={0.4}
                          metalness={0.8}
                        />
                      </mesh>
                      <mesh position={[0, 0, 0.025]}>
                        <boxGeometry args={[0.06, 0.16, 0.01]} />
                        <meshStandardMaterial
                          color="#22c55e"
                          emissive="#22c55e"
                          emissiveIntensity={1.2}
                        />
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
      </group>
    </RigidBody>
  );
};
