import React, { useMemo } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { ARENA_RADIUS } from "../game/config";

const PILLAR_COUNT = 8;
const EMBER_COUNT = 75;

// Deterministic ember particle distribution generated once at module scope
const emberPositions = new Float32Array(EMBER_COUNT * 3);
for (let i = 0; i < EMBER_COUNT; i++) {
  const angle = i * 2.39996323; // Golden angle for even circular distribution
  const dist = (i / EMBER_COUNT) * (ARENA_RADIUS - 2.5) + 1.5;
  emberPositions[i * 3] = Math.cos(angle) * dist;
  emberPositions[i * 3 + 1] = ((i * 17) % 50) / 10 + 0.5;
  emberPositions[i * 3 + 2] = Math.sin(angle) * dist;
}
const emberGeometry = new THREE.BufferGeometry();
emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));

export const Arena: React.FC = () => {
  // Precompute pillar positions along the circular arena perimeter
  const pillars = useMemo(() => {
    const list: Array<{ x: number; z: number; angle: number }> = [];
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const angle = (i / PILLAR_COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * (ARENA_RADIUS - 0.6);
      const z = Math.sin(angle) * (ARENA_RADIUS - 0.6);
      list.push({ x, z, angle });
    }
    return list;
  }, []);

  return (
    <group>
      {/* Rapier Physics Collider for the Floor */}
      <RigidBody type="fixed" colliders={false} position={[0, -0.25, 0]}>
        <CuboidCollider args={[ARENA_RADIUS, 0.25, ARENA_RADIUS]} />
      </RigidBody>

      {/* Visual Arena Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial
          color="#0b0f19"
          roughness={0.7}
          metalness={0.3}
        />
      </mesh>

      {/* Center Tactical Platform */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <circleGeometry args={[3.2, 32]} />
        <meshStandardMaterial
          color="#131b2e"
          roughness={0.6}
          metalness={0.4}
        />
      </mesh>

      {/* Outer Glow Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.35, ARENA_RADIUS, 64]} />
        <meshBasicMaterial color="#ff6b35" opacity={0.65} transparent />
      </mesh>

      {/* Concentric Tactical Rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[3.15, 3.25, 48]} />
        <meshBasicMaterial color="#ffb020" opacity={0.5} transparent />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[7.8, 8.0, 48]} />
        <meshBasicMaterial color="#23d5ff" opacity={0.25} transparent />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[13.8, 14.0, 48]} />
        <meshBasicMaterial color="#23d5ff" opacity={0.2} transparent />
      </mesh>

      {/* Subtle Coordinate Grid */}
      <gridHelper
        args={[ARENA_RADIUS * 2, 28, "#1e293b", "#0f172a"]}
        position={[0, 0.01, 0]}
      />

      {/* 8 Procedural Perimeter Obelisks */}
      {pillars.map((p, idx) => (
        <group key={idx} position={[p.x, 0, p.z]} rotation={[0, -p.angle, 0]}>
          {/* Main Stone Pillar */}
          <mesh castShadow receiveShadow position={[0, 1.6, 0]}>
            <boxGeometry args={[0.9, 3.2, 0.9]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* Pillar Base */}
          <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
            <boxGeometry args={[1.3, 0.5, 1.3]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} />
          </mesh>
          {/* Glowing Crystal Torch */}
          <mesh position={[0, 3.6, 0]}>
            <octahedronGeometry args={[0.4]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? "#ff6b35" : "#23d5ff"}
              emissive={idx % 2 === 0 ? "#ff6b35" : "#23d5ff"}
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      ))}

      {/* Floating Ambient Embers */}
      <points geometry={emberGeometry}>
        <pointsMaterial
          size={0.12}
          color="#ffb020"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
