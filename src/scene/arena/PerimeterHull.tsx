import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ARENA_RADIUS, ARENA_BOUNDARY_LIMIT } from "../../game/config";
import { useGameStore } from "../../store/gameStore";

// Number of structural bulkhead ribs around the perimeter
const RIB_COUNT = 24;

// Reusable unit geometry
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);

// Shared materials
const matHullFrame = new THREE.MeshStandardMaterial({
  color: "#0a0f1d",
  roughness: 0.7,
  metalness: 0.6,
});

const matHullTrim = new THREE.MeshStandardMaterial({
  color: "#1e293b",
  roughness: 0.5,
  metalness: 0.7,
});

export const PerimeterHull: React.FC = () => {
  const forcefieldMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const bossActive = useGameStore((s) => s.bossActive);
  const bossAccentColor = useGameStore((s) => s.bossAccentColor) || "#e11d48";

  // Precompute rib configurations around the circumference
  // Camera sits in the South (+Z), so ribs on the south (+Z) are kept low-profile
  // to guarantee 100% camera visibility without any foreground occlusion.
  const ribs = useMemo(() => {
    const list: Array<{
      x: number;
      z: number;
      angle: number;
      height: number;
      depth: number;
      isCameraFacing: boolean;
    }> = [];

    for (let i = 0; i < RIB_COUNT; i++) {
      const angle = (i / RIB_COUNT) * Math.PI * 2;
      const x = Math.sin(angle) * (ARENA_RADIUS - 0.4);
      const z = Math.cos(angle) * (ARENA_RADIUS - 0.4);

      // cos(angle) > 0 corresponds to positive Z (South / camera-facing quadrant)
      const southFactor = Math.max(0, Math.cos(angle)); // 0 in North, 1 in South
      const isCameraFacing = Math.cos(angle) > 0.15;

      // North ribs rise up to 6.2m, South ribs scale down to 1.1m (below camera sightline)
      const height = THREE.MathUtils.lerp(6.2, 1.1, southFactor);
      const depth = THREE.MathUtils.lerp(3.2, 1.8, southFactor);

      list.push({ x, z, angle, height, depth, isCameraFacing });
    }
    return list;
  }, []);

  // Frame animation for subtle forcefield pulse
  useFrame((state) => {
    if (forcefieldMatRef.current) {
      const time = state.clock.getElapsedTime();
      const pulse = 0.28 + Math.sin(time * 2.5) * 0.08;
      forcefieldMatRef.current.opacity = bossActive ? 0.45 : pulse;
      if (bossActive) {
        forcefieldMatRef.current.color.set(bossAccentColor);
      } else {
        forcefieldMatRef.current.color.set("#06b6d4");
      }
    }
  });

  return (
    <group>
      {/* =================================================================== */}
      {/* 1. OUTER HULL BULKHEAD PLINTH RING (Deck Perimeter Collar)          */}
      {/* =================================================================== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <ringGeometry args={[ARENA_BOUNDARY_LIMIT - 0.2, ARENA_RADIUS + 2.5, 64]} />
        <meshStandardMaterial color="#080c16" roughness={0.8} metalness={0.5} />
      </mesh>

      {/* Outer Armor Rim Lip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[ARENA_BOUNDARY_LIMIT + 0.1, ARENA_BOUNDARY_LIMIT + 0.9, 64]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.7} />
      </mesh>

      {/* =================================================================== */}
      {/* 2. VISUAL FORCEFIELD BOUNDARY CONDUIT (At ARENA_BOUNDARY_LIMIT = 42.4)*/}
      {/* Explains in-world boundary deflection without extra collision bodies */}
      {/* =================================================================== */}
      {/* Floor Emitter Trench */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[ARENA_BOUNDARY_LIMIT - 0.25, ARENA_BOUNDARY_LIMIT + 0.05, 96]} />
        <meshBasicMaterial
          ref={forcefieldMatRef}
          color="#06b6d4"
          transparent
          opacity={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Low-profile Forcefield Cylinder Curtain (Height 0.75m, transparent) */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry
          args={[ARENA_BOUNDARY_LIMIT, ARENA_BOUNDARY_LIMIT, 0.75, 64, 1, true]}
        />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* =================================================================== */}
      {/* 3. STRUCTURAL BULKHEAD RIBS (Curved Starship Hull Frame)            */}
      {/* =================================================================== */}
      {ribs.map((rib, idx) => (
        <group
          key={idx}
          position={[rib.x, 0, rib.z]}
          rotation={[0, -rib.angle + Math.PI / 2, 0]}
        >
          {/* Deck Anchor Foundation */}
          <mesh
            castShadow
            receiveShadow
            geometry={unitBoxGeo}
            material={matHullFrame}
            position={[0, 0.35, 0]}
            scale={[1.6, 0.7, rib.depth]}
          />

          {/* Vertical Rib Column */}
          <mesh
            castShadow
            receiveShadow
            geometry={unitBoxGeo}
            material={matHullTrim}
            position={[0, rib.height * 0.5, 0]}
            scale={[1.1, rib.height, rib.depth * 0.7]}
          />

          {/* Inboard Hydraulic Strut / Inward Angle Bracket */}
          {!rib.isCameraFacing && (
            <mesh
              castShadow
              geometry={unitBoxGeo}
              material={matHullFrame}
              position={[0, rib.height * 0.85, -rib.depth * 0.25]}
              rotation={[0.35, 0, 0]}
              scale={[0.8, rib.height * 0.3, rib.depth * 0.5]}
            />
          )}

          {/* Vertical Status Light Strip on Inboard Face */}
          <mesh
            position={[0, rib.height * 0.45, -rib.depth * 0.36]}
            geometry={unitBoxGeo}
          >
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#06b6d4"
              emissiveIntensity={1.4}
            />
          </mesh>
        </group>
      ))}

      {/* =================================================================== */}
      {/* 4. SUB-DECK STARSHIP HULL VOID PLATING (Visible Below Deck)         */}
      {/* =================================================================== */}
      <mesh position={[0, -4.5, 0]}>
        <cylinderGeometry
          args={[ARENA_RADIUS + 1, ARENA_RADIUS + 6, 8, 48, 1, true]}
        />
        <meshStandardMaterial
          color="#050811"
          roughness={0.9}
          metalness={0.4}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};
