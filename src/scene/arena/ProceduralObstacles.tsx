import React from "react";
import * as THREE from "three";
import type { ArenaObstacle } from "../../game/arenaLayout";

// ============================================================================
// SHARED PROCEDURAL GEOMETRIES & MATERIALS (Module-scoped for Zero Per-Frame GC)
// ============================================================================

// Base geometries
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
const unitOctGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const unitSphereGeo = new THREE.SphereGeometry(1, 12, 12);
const unitOctahedronGeo = new THREE.OctahedronGeometry(1);

// Shared structural materials
const matHullDark = new THREE.MeshStandardMaterial({
  color: "#0d131f",
  roughness: 0.65,
  metalness: 0.55,
});

const matHullMid = new THREE.MeshStandardMaterial({
  color: "#1e293b",
  roughness: 0.55,
  metalness: 0.6,
});

const matHullTrim = new THREE.MeshStandardMaterial({
  color: "#334155",
  roughness: 0.45,
  metalness: 0.7,
});

const matHazardYellow = new THREE.MeshStandardMaterial({
  color: "#eab308",
  roughness: 0.4,
  metalness: 0.3,
});

const matHazardBlack = new THREE.MeshStandardMaterial({
  color: "#0a0e17",
  roughness: 0.8,
  metalness: 0.2,
});

// Emissive status & conduit materials
const matEmissiveCyan = new THREE.MeshStandardMaterial({
  color: "#22d3ee",
  emissive: "#06b6d4",
  emissiveIntensity: 1.8,
  roughness: 0.2,
});

const matEmissiveAmber = new THREE.MeshStandardMaterial({
  color: "#fbbf24",
  emissive: "#f59e0b",
  emissiveIntensity: 2.2,
  roughness: 0.2,
});

const matEmissiveRed = new THREE.MeshStandardMaterial({
  color: "#f87171",
  emissive: "#ef4444",
  emissiveIntensity: 1.8,
  roughness: 0.2,
});

const matBeaconHolo = new THREE.MeshBasicMaterial({
  color: "#38bdf8",
  transparent: true,
  opacity: 0.75,
  wireframe: true,
});

const matBeaconHoloRed = new THREE.MeshBasicMaterial({
  color: "#f43f5e",
  transparent: true,
  opacity: 0.75,
  wireframe: true,
});

// ============================================================================
// 1. STRAIGHT BLAST BULKHEAD WALL (wallStraight)
// ============================================================================
const WallStraight: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height, sector } = obstacle;
  const isReactor = sector === "reactor";
  const emissiveMat = isReactor ? matEmissiveAmber : matEmissiveCyan;

  return (
    <group>
      {/* Heavy base plinth */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[0, 0.15, 0]}
        scale={[width, 0.3, depth]}
      />

      {/* Main bulkhead armor wall */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullMid}
        position={[0, height * 0.5, 0]}
        scale={[width * 0.94, height * 0.85, depth * 0.85]}
      />

      {/* Heavy beveled top cap */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[0, height * 0.95, 0]}
        scale={[width * 0.98, height * 0.12, depth * 0.95]}
      />

      {/* End pilasters / structural rib pillars */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[-width * 0.46, height * 0.5, 0]}
        scale={[width * 0.08, height, depth]}
      />
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[width * 0.46, height * 0.5, 0]}
        scale={[width * 0.08, height, depth]}
      />

      {/* Central vertical reinforcement strut */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[0, height * 0.5, 0]}
        scale={[width * 0.06, height * 0.92, depth * 0.95]}
      />

      {/* Horizontal glowing conduit trench (front and back) */}
      <mesh
        geometry={unitBoxGeo}
        material={emissiveMat}
        position={[0, height * 0.55, depth * 0.44]}
        scale={[width * 0.8, 0.12, 0.04]}
      />
      <mesh
        geometry={unitBoxGeo}
        material={emissiveMat}
        position={[0, height * 0.55, -depth * 0.44]}
        scale={[width * 0.8, 0.12, 0.04]}
      />

      {/* Lower hazard warning stripe trim */}
      <mesh
        geometry={unitBoxGeo}
        material={isReactor ? matHazardBlack : matHazardYellow}
        position={[0, 0.35, depth * 0.44]}
        scale={[width * 0.86, 0.14, 0.03]}
      />
    </group>
  );
};

// ============================================================================
// 2. CORNER LOGISTICS CARGO HUB (wallCorner)
// ============================================================================
const WallCorner: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height } = obstacle;

  return (
    <group>
      {/* Heavy industrial foundation plinth */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[0, 0.2, 0]}
        scale={[width, 0.4, depth]}
      />

      {/* Central heavy cargo lift column */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitOctGeo}
        material={matHullMid}
        position={[0, height * 0.5, 0]}
        scale={[width * 0.4, height, depth * 0.4]}
      />

      {/* Stacked intermodal cargo container modules in corner footprint */}
      {/* Module A: Lower large freight container */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[-width * 0.2, height * 0.32, -depth * 0.18]}
        scale={[width * 0.52, height * 0.55, depth * 0.48]}
      />
      {/* Module B: Upper freight container */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHazardYellow}
        position={[-width * 0.18, height * 0.72, -depth * 0.18]}
        scale={[width * 0.46, height * 0.38, depth * 0.42]}
      />

      {/* Module C: Side battery pack */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[width * 0.22, height * 0.3, depth * 0.15]}
        scale={[width * 0.42, height * 0.52, depth * 0.5]}
      />

      {/* Industrial gantry crane arm on top */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[0, height * 0.96, 0]}
        scale={[width * 0.75, height * 0.1, depth * 0.75]}
      />

      {/* Glowing status telemetry strip */}
      <mesh
        geometry={unitBoxGeo}
        material={matEmissiveAmber}
        position={[width * 0.22, height * 0.45, depth * 0.41]}
        scale={[width * 0.3, 0.12, 0.04]}
      />
    </group>
  );
};

// ============================================================================
// 3. REINFORCED BLAST BARRICADE (barricadeShort)
// ============================================================================
const BarricadeShort: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height, sector } = obstacle;
  const isDefense = sector === "defense";
  const emissiveMat = isDefense ? matEmissiveRed : matEmissiveAmber;

  return (
    <group>
      {/* Armored barricade base plate */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[0, 0.12, 0]}
        scale={[width, 0.24, depth]}
      />

      {/* Main sloped blast barrier */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullMid}
        position={[0, height * 0.48, 0]}
        scale={[width * 0.92, height * 0.78, depth * 0.8]}
      />

      {/* Heavy impact bumper cap */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[0, height * 0.88, 0]}
        scale={[width * 0.96, height * 0.22, depth * 0.88]}
      />

      {/* Left and right magnetic lock brackets */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[-width * 0.45, height * 0.5, 0]}
        scale={[width * 0.08, height * 0.9, depth * 0.95]}
      />
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[width * 0.45, height * 0.5, 0]}
        scale={[width * 0.08, height * 0.9, depth * 0.95]}
      />

      {/* Top ridge glowing safety beacon line */}
      <mesh
        geometry={unitBoxGeo}
        material={emissiveMat}
        position={[0, height * 0.98, 0]}
        scale={[width * 0.78, 0.06, 0.12]}
      />

      {/* Front hazard chevron trim */}
      <mesh
        geometry={unitBoxGeo}
        material={isDefense ? matHullTrim : matHazardYellow}
        position={[0, height * 0.4, depth * 0.42]}
        scale={[width * 0.8, 0.12, 0.03]}
      />
    </group>
  );
};

// ============================================================================
// 4. TOKAMAK PLASMA REACTOR CORE (reactorBlock)
// ============================================================================
const ReactorBlock: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height } = obstacle;
  const radius = Math.min(width, depth) * 0.48;

  return (
    <group>
      {/* Stepped octagonal foundation deck */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitOctGeo}
        material={matHullDark}
        position={[0, 0.25, 0]}
        scale={[width * 0.5, 0.5, depth * 0.5]}
      />

      {/* Outer magnetic containment housing with slit vents */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitOctGeo}
        material={matHullMid}
        position={[0, height * 0.5, 0]}
        scale={[radius, height * 0.82, radius]}
      />

      {/* Internal superheated fusion core (glowing amber plasma) */}
      <mesh
        geometry={unitCylGeo}
        material={matEmissiveAmber}
        position={[0, height * 0.52, 0]}
        scale={[radius * 0.72, height * 0.65, radius * 0.72]}
      />

      {/* 4 Heavy magnetic confinement coils around perimeter */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
        <group key={idx} rotation={[0, angle, 0]}>
          <mesh
            castShadow
            geometry={unitBoxGeo}
            material={matHullTrim}
            position={[radius * 0.95, height * 0.52, 0]}
            scale={[radius * 0.28, height * 0.88, radius * 0.32]}
          />
          {/* Vertical coolant manifold pipe */}
          <mesh
            castShadow
            geometry={unitCylGeo}
            material={matHullDark}
            position={[radius * 0.95, height * 0.52, 0]}
            scale={[radius * 0.1, height * 0.92, radius * 0.1]}
          />
        </group>
      ))}

      {/* Top containment lid with pressure release ring */}
      <mesh
        castShadow
        geometry={unitOctGeo}
        material={matHullTrim}
        position={[0, height * 0.94, 0]}
        scale={[radius * 0.9, height * 0.14, radius * 0.9]}
      />

      {/* Top central emitter rod */}
      <mesh
        castShadow
        geometry={unitCylGeo}
        material={matEmissiveAmber}
        position={[0, height * 1.02, 0]}
        scale={[radius * 0.25, height * 0.16, radius * 0.25]}
      />
    </group>
  );
};

// ============================================================================
// 5. HANGAR BAY SHUTTLE GANTRY & DOCKING CRADLE (crystalCluster)
// ============================================================================
const HangarGantry: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height } = obstacle;
  const isMain = obstacle.id === "crystal-main";

  return (
    <group>
      {/* Heavy launch cradle platform base */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[0, 0.22, 0]}
        scale={[width, 0.44, depth]}
      />

      {/* Service deck plating */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullMid}
        position={[0, height * 0.35, 0]}
        scale={[width * 0.88, height * 0.4, depth * 0.88]}
      />

      {/* Twin vertical hydraulic clamp / gantry towers */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[-width * 0.35, height * 0.65, 0]}
        scale={[width * 0.2, height * 0.72, depth * 0.45]}
      />
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[width * 0.35, height * 0.65, 0]}
        scale={[width * 0.2, height * 0.72, depth * 0.45]}
      />

      {/* Pressurized fuel pod canisters with cyan coolant meters */}
      <mesh
        castShadow
        geometry={unitCylGeo}
        material={matHullDark}
        position={[0, height * 0.55, depth * 0.25]}
        scale={[width * 0.18, height * 0.5, depth * 0.18]}
      />
      <mesh
        geometry={unitBoxGeo}
        material={matEmissiveCyan}
        position={[0, height * 0.55, depth * 0.36]}
        scale={[width * 0.08, height * 0.35, 0.04]}
      />

      {/* If main gantry: Overhead cross-beam gantry rail */}
      {isMain && (
        <mesh
          castShadow
          geometry={unitBoxGeo}
          material={matHullTrim}
          position={[0, height * 0.94, 0]}
          scale={[width * 0.92, height * 0.14, depth * 0.35]}
        />
      )}

      {/* Runway navigation light strip along edge */}
      <mesh
        geometry={unitBoxGeo}
        material={matEmissiveCyan}
        position={[0, 0.46, -depth * 0.45]}
        scale={[width * 0.8, 0.08, 0.06]}
      />
    </group>
  );
};

// ============================================================================
// 6. AEGIS POINT-DEFENSE ARTILLERY BATTERY (defensePlatform)
// ============================================================================
const DefensePlatform: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height } = obstacle;

  return (
    <group>
      {/* Heavy armored bastion foundation */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[0, 0.25, 0]}
        scale={[width, 0.5, depth]}
      />

      {/* Raised artillery deck with sloped ballistic armor skirt */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitBoxGeo}
        material={matHullMid}
        position={[0, height * 0.48, 0]}
        scale={[width * 0.88, height * 0.55, depth * 0.85]}
      />

      {/* Central rotating turret mount base */}
      <mesh
        castShadow
        geometry={unitCylGeo}
        material={matHullTrim}
        position={[0, height * 0.78, 0]}
        scale={[width * 0.26, height * 0.22, depth * 0.36]}
      />

      {/* Dual heavy point-defense kinetic railgun barrels */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[-width * 0.1, height * 0.92, -depth * 0.15]}
        scale={[width * 0.08, height * 0.16, depth * 0.7]}
      />
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullDark}
        position={[width * 0.1, height * 0.92, -depth * 0.15]}
        scale={[width * 0.08, height * 0.16, depth * 0.7]}
      />

      {/* Railgun muzzle energy coils */}
      <mesh
        geometry={unitBoxGeo}
        material={matEmissiveRed}
        position={[-width * 0.1, height * 0.92, -depth * 0.48]}
        scale={[width * 0.09, height * 0.18, 0.1]}
      />
      <mesh
        geometry={unitBoxGeo}
        material={matEmissiveRed}
        position={[width * 0.1, height * 0.92, -depth * 0.48]}
        scale={[width * 0.09, height * 0.18, 0.1]}
      />

      {/* Flanking ammunition feed hoppers */}
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[-width * 0.34, height * 0.62, 0]}
        scale={[width * 0.18, height * 0.45, depth * 0.55]}
      />
      <mesh
        castShadow
        geometry={unitBoxGeo}
        material={matHullTrim}
        position={[width * 0.34, height * 0.62, 0]}
        scale={[width * 0.18, height * 0.45, depth * 0.55]}
      />

      {/* Front tactical status telemetry panel */}
      <mesh
        geometry={unitBoxGeo}
        material={matEmissiveRed}
        position={[0, height * 0.52, depth * 0.43]}
        scale={[width * 0.45, 0.12, 0.04]}
      />
    </group>
  );
};

// ============================================================================
// 7. HIGH-TECH COMMAND UPLINK & ENERGY PYLON (energyPylon)
// ============================================================================
const EnergyPylon: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height, sector } = obstacle;
  const isReactor = sector === "reactor";
  const emissiveMat = isReactor ? matEmissiveAmber : matEmissiveCyan;
  const radius = Math.min(width, depth) * 0.48;

  return (
    <group>
      {/* Stepped technological base plinth */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitOctGeo}
        material={matHullDark}
        position={[0, 0.25, 0]}
        scale={[radius * 1.1, 0.5, radius * 1.1]}
      />

      {/* Main tapered pylon tower column */}
      <mesh
        castShadow
        receiveShadow
        geometry={unitOctGeo}
        material={matHullMid}
        position={[0, height * 0.5, 0]}
        scale={[radius * 0.75, height * 0.82, radius * 0.75]}
      />

      {/* Cooling fins on 4 lateral faces */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
        <group key={idx} rotation={[0, angle, 0]}>
          <mesh
            castShadow
            geometry={unitBoxGeo}
            material={matHullTrim}
            position={[radius * 0.7, height * 0.45, 0]}
            scale={[radius * 0.15, height * 0.6, radius * 0.1]}
          />
          {/* Vertical data-light seam */}
          <mesh
            geometry={unitBoxGeo}
            material={emissiveMat}
            position={[radius * 0.68, height * 0.5, 0]}
            scale={[radius * 0.04, height * 0.68, radius * 0.04]}
          />
        </group>
      ))}

      {/* Capital crown platform */}
      <mesh
        castShadow
        geometry={unitOctGeo}
        material={matHullTrim}
        position={[0, height * 0.93, 0]}
        scale={[radius * 0.9, height * 0.1, radius * 0.9]}
      />

      {/* Transmitting emitter crystal crown */}
      <mesh
        geometry={unitOctahedronGeo}
        material={emissiveMat}
        position={[0, height * 1.04, 0]}
        scale={[radius * 0.35, radius * 0.5, radius * 0.35]}
      />
    </group>
  );
};

// ============================================================================
// 8. OPEN STRUCTURAL GUIDANCE / TELEMETRY BEACON (sectorBeacon)
// Contract: blocksProjectiles = false (Must visually read as an open trellis mast)
// ============================================================================
const SectorBeacon: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  const { width, depth, height, sector } = obstacle;
  const isDefense = sector === "defense";
  const holoMat = isDefense ? matBeaconHoloRed : matBeaconHolo;
  const emissiveMat = isDefense ? matEmissiveRed : matEmissiveCyan;
  const radius = Math.min(width, depth) * 0.45;

  return (
    <group>
      {/* Low-profile deck anchor bracket */}
      <mesh
        receiveShadow
        geometry={unitOctGeo}
        material={matHullDark}
        position={[0, 0.1, 0]}
        scale={[radius * 0.9, 0.2, radius * 0.9]}
      />

      {/* 3 Open structural tripod legs (allows line-of-sight & projectiles to pass) */}
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, idx) => (
        <group key={idx} rotation={[0, angle, 0]}>
          <mesh
            geometry={unitCylGeo}
            material={matHullTrim}
            position={[radius * 0.35, height * 0.45, 0]}
            rotation={[0, 0, -0.15]}
            scale={[radius * 0.08, height * 0.88, radius * 0.08]}
          />
        </group>
      ))}

      {/* Upper sensor platform ring */}
      <mesh
        geometry={unitOctGeo}
        material={matHullTrim}
        position={[0, height * 0.86, 0]}
        scale={[radius * 0.5, 0.12, radius * 0.5]}
      />

      {/* Pulsing omni-directional holographic telemetry beacon */}
      <mesh
        geometry={unitOctahedronGeo}
        material={holoMat}
        position={[0, height * 1.02, 0]}
        scale={[radius * 0.45, radius * 0.65, radius * 0.45]}
      />
      <mesh
        geometry={unitSphereGeo}
        material={emissiveMat}
        position={[0, height * 1.02, 0]}
        scale={[radius * 0.16, radius * 0.16, radius * 0.16]}
      />
    </group>
  );
};

// ============================================================================
// MAIN COMPOSER: PROCEDURAL OBSTACLE DISPATCHER
// ============================================================================
export const ProceduralObstacleMesh: React.FC<{ obstacle: ArenaObstacle }> = ({ obstacle }) => {
  switch (obstacle.asset) {
    case "wallStraight":
      return <WallStraight obstacle={obstacle} />;
    case "wallCorner":
      return <WallCorner obstacle={obstacle} />;
    case "barricadeShort":
      return <BarricadeShort obstacle={obstacle} />;
    case "reactorBlock":
      return <ReactorBlock obstacle={obstacle} />;
    case "crystalCluster":
      return <HangarGantry obstacle={obstacle} />;
    case "defensePlatform":
      return <DefensePlatform obstacle={obstacle} />;
    case "energyPylon":
      return <EnergyPylon obstacle={obstacle} />;
    case "sectorBeacon":
      return <SectorBeacon obstacle={obstacle} />;
    default:
      return null;
  }
};
