import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { ARENA_RADIUS } from "../game/config";
import { useGameStore } from "../store/gameStore";
import { ARENA_V2_OBSTACLES } from "../game/arenaLayout";
import { ProceduralObstacleMesh } from "./arena/ProceduralObstacles";
import { CombatDeckPlating } from "./arena/CombatDeckPlating";
import { PerimeterHull } from "./arena/PerimeterHull";

const EMBER_COUNT = 32;

// Module-level precomputed deterministic positions and properties
const EMBER_CONFIG = (() => {
  const pos = new Float32Array(EMBER_COUNT * 3);
  const initialAngles = new Float32Array(EMBER_COUNT);
  const speeds = new Float32Array(EMBER_COUNT);
  const radii = new Float32Array(EMBER_COUNT);

  for (let i = 0; i < EMBER_COUNT; i++) {
    const angle = i * 2.39996323; // Golden angle distribution
    const dist = (i / EMBER_COUNT) * (ARENA_RADIUS - 6) + 3.0;
    const speed = 0.2 + (i % 4) * 0.1;

    pos[i * 3] = Math.cos(angle) * dist;
    pos[i * 3 + 1] = 0.4 + (i % 5) * 0.45;
    pos[i * 3 + 2] = Math.sin(angle) * dist;

    initialAngles[i] = angle;
    radii[i] = dist;
    speeds[i] = speed;
  }

  return { pos, initialAngles, speeds, radii };
})();

export const Arena: React.FC = () => {
  const embersRef = useRef<THREE.Points>(null);
  const emberMatRef = useRef<THREE.PointsMaterial>(null);
  const anglesRef = useRef<Float32Array>(new Float32Array(EMBER_CONFIG.initialAngles));

  // Boss atmosphere tracking
  const bossActive = useGameStore((s) => s.bossActive);
  const bossAccentColor = useGameStore((s) => s.bossAccentColor) || "#e11d48";

  const emberGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(EMBER_CONFIG.pos), 3));
    return geo;
  }, []);

  // Gentle drift for atmospheric particles without allocations or hook mutation
  useFrame((_, delta) => {
    if (!embersRef.current) return;
    const positions = embersRef.current.geometry.attributes.position.array as Float32Array;
    const angles = anglesRef.current;

    for (let i = 0; i < EMBER_COUNT; i++) {
      angles[i] += delta * EMBER_CONFIG.speeds[i] * 0.15;
      const angle = angles[i];
      const radius = EMBER_CONFIG.radii[i];

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] += delta * 0.12;
      if (positions[i * 3 + 1] > 3.2) {
        positions[i * 3 + 1] = 0.3;
      }
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    embersRef.current.geometry.attributes.position.needsUpdate = true;
    if (emberMatRef.current) {
      const time = performance.now() * 0.001;
      emberMatRef.current.opacity = bossActive ? 0.9 + Math.sin(time * 6) * 0.08 : 0.65;
      emberMatRef.current.size = bossActive ? 0.19 : 0.14;
      emberMatRef.current.color.set(bossActive ? bossAccentColor : "#38bdf8");
    }
  });

  return (
    <group>
      {/* ===================================================================== */}
      {/* 1. PRIMARY COMBAT DECK FLOOR & RAPIER PHYSICS COLLIDER               */}
      {/* ===================================================================== */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[ARENA_RADIUS, 0.5, ARENA_RADIUS]} position={[0, -0.5, 0]} />
        <mesh receiveShadow position={[0, -0.3, 0]}>
          <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS + 0.8, 0.6, 64]} />
          <meshStandardMaterial
            color="#080c14"
            roughness={0.65}
            metalness={0.6}
          />
        </mesh>
      </RigidBody>

      {/* ===================================================================== */}
      {/* 2. PROCEDURAL COMBAT DECK PLATING & SECTOR MARKINGS                  */}
      {/* ===================================================================== */}
      <CombatDeckPlating />

      {/* ===================================================================== */}
      {/* 3. PROCEDURAL MODULAR 3D OBSTACLES & RAPIER COLLIDERS                 */}
      {/* Driven by authoritative ARENA_V2_OBSTACLES layout                     */}
      {/* ===================================================================== */}
      {ARENA_V2_OBSTACLES.map((obstacle) => (
        <React.Fragment key={obstacle.id}>
          <RigidBody
            type="fixed"
            colliders={false}
            position={[obstacle.x, obstacle.height / 2, obstacle.z]}
            rotation={[0, obstacle.rotation, 0]}
          >
            <CuboidCollider args={[obstacle.width / 2, obstacle.height / 2, obstacle.depth / 2]} />
          </RigidBody>
          <group
            position={[obstacle.x, 0, obstacle.z]}
            rotation={[0, obstacle.rotation, 0]}
          >
            <ProceduralObstacleMesh obstacle={obstacle} />
          </group>
        </React.Fragment>
      ))}

      {/* ===================================================================== */}
      {/* 4. PERIMETER STARSHIP HULL & CONFINEMENT FORCEFIELD                   */}
      {/* ===================================================================== */}
      <PerimeterHull />

      {bossActive && (
        <pointLight
          position={[0, 9, 0]}
          color={bossAccentColor}
          intensity={1.6}
          distance={70}
        />
      )}

      {/* ===================================================================== */}
      {/* 5. FLOATING ATMOSPHERIC SPARKS / PARTICLES                           */}
      {/* ===================================================================== */}
      <points ref={embersRef} geometry={emberGeometry}>
        <pointsMaterial
          ref={emberMatRef}
          size={0.14}
          color={bossActive ? bossAccentColor : "#38bdf8"}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
