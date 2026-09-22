import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, RapierRigidBody, CapsuleCollider } from "@react-three/rapier";
import { useGameStore } from "../store/gameStore";
import { CHARACTER_BASE_SPEEDS, ARENA_BOUNDARY_LIMIT } from "../game/config";
import type { GameRuntime } from "../game/runtime";

interface PlayerPlaceholderProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const defaultBlackColor = new THREE.Color("#000000");

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

    // Decrement player slow timer during active gameplay
    if (runtime) {
      if (runtime.playerSlowTimer > 0) {
        runtime.playerSlowTimer = Math.max(0, runtime.playerSlowTimer - delta);
        if (runtime.playerSlowTimer === 0) {
          runtime.playerSlowFactor = 1.0;
        } else if (Math.random() < 0.1 && runtime.particles.length < 250) {
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
    }

    const slowFactor = runtime && runtime.playerSlowTimer > 0 ? runtime.playerSlowFactor : 1.0;
    const speed = baseSpeed * (1 + (upgrades.speed || 0) * 0.15) * slowFactor;

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
    if (selectedCharacterId === "bonk") {
      if (weaponGroupRef.current) {
        // Hammer idle ready sway
        const hammerSway = Math.sin(time * 3) * 0.08;
        weaponGroupRef.current.rotation.z = -0.25 + hammerSway;
        weaponGroupRef.current.rotation.x = 0.2 + hammerSway * 0.5;
      }
      if (coreMeshRef.current) {
        // Subtle gold chest crest pulse
        const crestGlow = 0.8 + Math.sin(time * 3.5) * 0.3;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = crestGlow;
      }
    } else if (selectedCharacterId === "byte") {
      if (weaponGroupRef.current) {
        // Orbiting energy satellite
        weaponGroupRef.current.rotation.y = time * 3.2;
        weaponGroupRef.current.position.y = 0.2 + Math.sin(time * 4) * 0.06;
      }
      if (coreMeshRef.current) {
        // Pulsing chest core
        const coreGlow = 1.3 + Math.sin(time * 6) * 0.5;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = coreGlow;
      }
    } else if (selectedCharacterId === "tank") {
      if (weaponGroupRef.current) {
        // Heavy ready stance / subtle battleaxe sway
        const axeSway = Math.sin(time * 2.5) * 0.05;
        weaponGroupRef.current.rotation.z = 0.15 + axeSway;
        weaponGroupRef.current.rotation.x = -0.1 + axeSway * 0.4;
      }
      if (coreMeshRef.current) {
        // Pulsing crimson visor slit
        const slitGlow = 1.4 + Math.sin(time * 3.2) * 0.4;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = slitGlow;
      }
    } else if (selectedCharacterId === "nova") {
      if (weaponGroupRef.current) {
        // Rotating astral focus ring
        weaponGroupRef.current.rotation.y = time * 2.4;
        weaponGroupRef.current.rotation.z = Math.sin(time * 2.0) * 0.15;
      }
      if (coreMeshRef.current) {
        // Pulsing cosmic star core
        const coreGlow = 1.5 + Math.sin(time * 5.0) * 0.5;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = coreGlow;
      }
    } else if (selectedCharacterId === "hex") {
      if (weaponGroupRef.current) {
        // Orbiting triad of void runic shards
        weaponGroupRef.current.rotation.y = -time * 2.6;
        weaponGroupRef.current.position.y = 0.12 + Math.sin(time * 3.2) * 0.06;
      }
      if (coreMeshRef.current && (coreMeshRef.current as THREE.Mesh).material) {
        // Eerie void eye pulse
        const eyeGlow = 1.4 + Math.sin(time * 4.0) * 0.5;
        (coreMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeGlow;
        const parent = coreMeshRef.current.parent;
        if (parent) {
          const children = parent.children;
          for (let i = 0; i < children.length; i++) {
            const childMesh = children[i] as THREE.Mesh;
            if (childMesh !== coreMeshRef.current && childMesh.material) {
              (childMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = eyeGlow;
            }
          }
        }
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
          mat.emissive.copy(mat.userData.baseEmissive || defaultBlackColor);
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
                    ref={(m) => registerFlashMaterial(m, "#fbbf24", 0.8)}
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
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.8)}
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
                    ref={(m) => registerFlashMaterial(m, "#22d3ee", 1.8)}
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
                    ref={(m) => registerFlashMaterial(m, "#ef4444", 1.8)}
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
                    ref={(m) => registerFlashMaterial(m, "#f472b6", 1.8)}
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
                      ref={(m) => registerFlashMaterial(m, "#22c55e", 2.0)}
                      color="#22c55e"
                      emissive="#22c55e"
                      emissiveIntensity={2.0}
                    />
                  </mesh>
                  {/* Right Diamond Hex Eye */}
                  <mesh position={[0.085, 0, 0]}>
                    <octahedronGeometry args={[0.06]} />
                    <meshStandardMaterial
                      ref={(m) => registerFlashMaterial(m, "#22c55e", 2.0)}
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
      </group>
    </RigidBody>
  );
};
