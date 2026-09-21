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
  // Required React hook: useRef for Three.js and Rapier instances
  const bodyRef = useRef<RapierRigidBody>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  // High-frequency input state kept in ref to prevent React re-renders
  const keysRef = useRef<Record<string, boolean>>({});

  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);

  // Character-specific visual attributes
  const characterConfig = {
    bonk: {
      color: "#FF6B35",
      accentColor: "#FFB020",
      height: 1.4,
      radius: 0.45,
    },
    byte: {
      color: "#23D5FF",
      accentColor: "#A8FF60",
      height: 1.25,
      radius: 0.38,
    },
    tank: {
      color: "#FF3B5C",
      accentColor: "#991B1B",
      height: 1.55,
      radius: 0.6,
    },
  }[selectedCharacterId || "bonk"] || {
    color: "#FF6B35",
    accentColor: "#FFB020",
    height: 1.4,
    radius: 0.45,
  };

  // Setup keyboard input listeners with blur protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scrolling with arrow keys
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

    // Prevent stuck keys when user switches tabs or window blurs
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

  // Frame-rate independent movement simulation loop
  useFrame((_, delta) => {
    if (!bodyRef.current) return;

    const runtime = runtimeRef.current;
    const gameStatus = useGameStore.getState().gameStatus;

    // Halt physics velocity when paused / level-up / game over
    if (gameStatus !== "playing") {
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    const upgrades = useGameStore.getState().upgrades;
    const baseSpeed = CHARACTER_BASE_SPEEDS[selectedCharacterId || "bonk"] || 5.0;
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

    // Normalize diagonal movement so diagonals aren't faster
    const inputLength = Math.hypot(moveX, moveZ);
    if (inputLength > 0) {
      moveX /= inputLength;
      moveZ /= inputLength;
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

    // Enforce circular arena boundary clamping
    const currentPos = bodyRef.current.translation();
    const distanceFromCenter = Math.hypot(currentPos.x, currentPos.z);
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

    // Smoothly rotate player mesh to face movement direction
    if (meshGroupRef.current && inputLength > 0) {
      const targetRotation = Math.atan2(moveX, moveZ);
      let diff = targetRotation - meshGroupRef.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const t = 1 - Math.exp(-14 * Math.min(delta, 0.1));
      meshGroupRef.current.rotation.y += diff * t;
    }

    // Visual i-frame hit flash effect
    if (bodyMaterialRef.current && runtime) {
      if (runtime.playerInvulnerableTimer > 0) {
        bodyMaterialRef.current.emissive.set("#ef4444");
        bodyMaterialRef.current.emissiveIntensity = 0.8;
      } else {
        bodyMaterialRef.current.emissive.set("#000000");
        bodyMaterialRef.current.emissiveIntensity = 0;
      }
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders="hull"
      position={[0, 1.2, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={2}
    >
      <group ref={meshGroupRef}>
        {/* Main Body Capsule */}
        <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry
            args={[
              characterConfig.radius,
              characterConfig.height - characterConfig.radius * 2,
              8,
              16,
            ]}
          />
          <meshStandardMaterial
            ref={bodyMaterialRef}
            color={characterConfig.color}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>

        {/* Visor / Eye */}
        <mesh position={[0, 0.35, characterConfig.radius * 0.85]}>
          <boxGeometry args={[0.36, 0.12, 0.1]} />
          <meshStandardMaterial
            color={characterConfig.accentColor}
            emissive={characterConfig.accentColor}
            emissiveIntensity={0.6}
          />
        </mesh>

        {/* Procedural Character Weapon Attachment */}
        {selectedCharacterId === "bonk" && (
          <group position={[0.55, 0.1, 0.1]} rotation={[0.2, 0, -0.2]}>
            {/* Hammer Handle */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Hammer Head */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[0.3, 0.22, 0.22]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        )}

        {selectedCharacterId === "byte" && (
          <group position={[0.5, 0.2, 0.2]}>
            {/* Floating Energy Orb */}
            <mesh>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial
                color="#23d5ff"
                emissive="#23d5ff"
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        )}

        {selectedCharacterId === "tank" && (
          <group>
            {/* Left Shoulder Armor */}
            <mesh position={[-0.65, 0.3, 0]}>
              <boxGeometry args={[0.28, 0.28, 0.35]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
            </mesh>
            {/* Right Shoulder Armor */}
            <mesh position={[0.65, 0.3, 0]}>
              <boxGeometry args={[0.28, 0.28, 0.35]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>
        )}
      </group>
    </RigidBody>
  );
};
