import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ARENA_RADIUS } from "../../game/config";
import { ASSETS } from "../../config/assets";
import { ARENA_V2_DECALS } from "../../game/arenaLayout";

const decalPlaneGeo = new THREE.PlaneGeometry(1, 1);

// Textures loaded once at module scope
const textureLoader = new THREE.TextureLoader();
const warningDecalTex = textureLoader.load(ASSETS.arenaV2.warningRingDecal);
warningDecalTex.colorSpace = THREE.SRGBColorSpace;
warningDecalTex.anisotropy = 4;

const laneDecalTex = textureLoader.load(ASSETS.arenaV2.laneConnectorDecal);
laneDecalTex.colorSpace = THREE.SRGBColorSpace;
laneDecalTex.anisotropy = 4;

export const CombatDeckPlating: React.FC = () => {
  const holoMapRef = useRef<THREE.Group>(null);
  const holoRingsRef = useRef<THREE.Mesh>(null);

  const decalMaterials = useMemo(() => {
    return {
      warningRingDecal: new THREE.MeshBasicMaterial({
        map: warningDecalTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      laneConnectorDecal: new THREE.MeshBasicMaterial({
        map: laneDecalTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }, []);

  // Subtle rotation for Central Command hologram
  useFrame((_, delta) => {
    if (holoMapRef.current) {
      holoMapRef.current.rotation.y += delta * 0.4;
    }
    if (holoRingsRef.current) {
      holoRingsRef.current.rotation.z -= delta * 0.6;
    }
  });

  return (
    <group>
      {/* =================================================================== */}
      {/* 1. SECTOR COLOR IDENTIFIERS (Under-deck Glow Accents)               */}
      {/* =================================================================== */}
      {/* Reactor Bay (East: +X) Warm Amber Floor Zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[28, 0.003, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.06} transparent depthWrite={false} />
      </mesh>

      {/* Cargo Logistics (West: -X) Industrial Slate / Yellow Floor Zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-27, 0.003, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#eab308" opacity={0.04} transparent depthWrite={false} />
      </mesh>

      {/* Hangar Deck (North: -Z) Flight Teal Floor Zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -30]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#06b6d4" opacity={0.06} transparent depthWrite={false} />
      </mesh>

      {/* Defense Battery (South: +Z) Tactical Crimson Floor Zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 30]}>
        <circleGeometry args={[12, 32]} />
        <meshBasicMaterial color="#ef4444" opacity={0.05} transparent depthWrite={false} />
      </mesh>

      {/* =================================================================== */}
      {/* 2. CARDINAL POWER CONDUIT RUNS (Routing from Core to 4 Sectors)     */}
      {/* =================================================================== */}
      {/* East Conduit (Core to Reactor) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0.006, 0]}>
        <planeGeometry args={[18, 0.35]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>

      {/* West Conduit (Core to Cargo) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-14, 0.006, 0]}>
        <planeGeometry args={[18, 0.35]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} />
      </mesh>

      {/* North Conduit (Core to Hangar) */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.006, -14]}>
        <planeGeometry args={[18, 0.35]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.7} />
      </mesh>

      {/* South Conduit (Core to Defense) */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.006, 14]}>
        <planeGeometry args={[18, 0.35]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>

      {/* =================================================================== */}
      {/* 3. TACTICAL COMBAT RINGS                                             */}
      {/* =================================================================== */}
      {/* Inner Combat Ring (~9.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
        <ringGeometry args={[9.4, 9.65, 64]} />
        <meshBasicMaterial color="#06b6d4" opacity={0.35} transparent depthWrite={false} />
      </mesh>

      {/* Mid-Range Tactical Perimeter (~18.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
        <ringGeometry args={[18.4, 18.65, 64]} />
        <meshBasicMaterial color="#38bdf8" opacity={0.25} transparent depthWrite={false} />
      </mesh>

      {/* Outer Tactical Perimeter (~25.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
        <ringGeometry args={[25.4, 25.65, 64]} />
        <meshBasicMaterial color="#a855f7" opacity={0.2} transparent depthWrite={false} />
      </mesh>

      {/* Floor Coordinate Grid */}
      <gridHelper
        args={[ARENA_RADIUS * 2, 48, "#1e293b", "#090d16"]}
        position={[0, 0.008, 0]}
      />

      {/* =================================================================== */}
      {/* 4. PRESERVED FLOOR DECALS (Warning Rings & Lane Connectors)          */}
      {/* =================================================================== */}
      {ARENA_V2_DECALS.map((decal) => (
        <group key={decal.id} position={[decal.x, 0.016, decal.z]} rotation={[0, decal.rotation, 0]}>
          <mesh
            geometry={decalPlaneGeo}
            material={decalMaterials[decal.asset]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[decal.width, decal.depth, 1]}
          />
        </group>
      ))}

      {/* =================================================================== */}
      {/* 5. CENTRAL COMMAND CORE (Deck Dais & Hologram)                      */}
      {/* =================================================================== */}
      {/* Outer Octagonal Command Dais */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, 0.012, 0]}>
        <circleGeometry args={[5.2, 8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.5} />
      </mesh>

      {/* Inner Circular Command Deck */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[3.6, 48]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Dais Golden Accent Trim Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <ringGeometry args={[3.45, 3.6, 48]} />
        <meshBasicMaterial color="#fbbf24" opacity={0.65} transparent depthWrite={false} />
      </mesh>

      {/* Center Holographic Projector Well */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
        <ringGeometry args={[1.3, 1.55, 36]} />
        <meshBasicMaterial color="#06b6d4" opacity={0.7} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshStandardMaterial color="#0a0f1d" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Central Command Holographic Star-Map (Animated Procedural Wireframe) */}
      <group position={[0, 0.45, 0]}>
        {/* Projector Base Ring */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.65, 0.75, 0.15, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Rotating Holographic Star-Map Wireframe */}
        <group ref={holoMapRef}>
          <mesh>
            <icosahedronGeometry args={[0.5, 1]} />
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.65} />
          </mesh>
          <mesh>
            <octahedronGeometry args={[0.28]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.85} />
          </mesh>
        </group>

        {/* Rotating Orbital Telemetry Ring */}
        <mesh ref={holoRingsRef} rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[0.7, 0.74, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};
