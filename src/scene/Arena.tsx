import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { ARENA_RADIUS, ARENA_BOUNDARY_LIMIT } from "../game/config";
import { useGameStore } from "../store/gameStore";

const PILLAR_COUNT = 12;
const EMBER_COUNT = 36;

export const Arena: React.FC = () => {
  const embersRef = useRef<THREE.Points>(null);
  const crystalGroupRef = useRef<THREE.Group>(null);
  const outerBoundaryMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const innerCombatRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const midTacticalRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const centerDaisMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Boss atmosphere tracking
  const bossActive = useGameStore((s) => s.bossActive);
  const bossAccentColor = useGameStore((s) => s.bossAccentColor) || "#e11d48";
  const bossInfluenceRef = useRef<number>(0);

  // Scratch colors for smooth zero-allocation lerping
  const defaultBoundaryColor = useMemo(() => new THREE.Color("#ef4444"), []);
  const defaultTacticalColor = useMemo(() => new THREE.Color("#06b6d4"), []);
  const defaultMidTacticalColor = useMemo(() => new THREE.Color("#38bdf8"), []);
  const defaultDaisEmissive = useMemo(() => new THREE.Color("#06b6d4"), []);
  const defaultAmberEmissive = useMemo(() => new THREE.Color("#f59e0b"), []);
  const defaultCyanEmissive = useMemo(() => new THREE.Color("#06b6d4"), []);
  const tempBossColor = useMemo(() => new THREE.Color(), []);
  const tempTargetColor = useMemo(() => new THREE.Color(), []);

  // Deterministic initial particle distribution
  const [emberPositions, initialData] = useMemo(() => {
    const pos = new Float32Array(EMBER_COUNT * 3);
    const data: Array<{ speed: number; radius: number; angle: number }> = [];

    for (let i = 0; i < EMBER_COUNT; i++) {
      const angle = i * 2.39996323; // Golden angle distribution
      const dist = (i / EMBER_COUNT) * (ARENA_RADIUS - 3.5) + 2.0;
      const speed = 0.25 + (i % 4) * 0.12;
      const y = ((i * 19) % 50) / 10 + 0.3;

      pos[i * 3] = Math.cos(angle) * dist;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * dist;

      data.push({ speed, radius: dist, angle });
    }
    return [pos, data];
  }, []);

  const emberGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
    return geo;
  }, [emberPositions]);

  // Precompute pillar positions along the circular arena perimeter
  const pillars = useMemo(() => {
    const list: Array<{ x: number; z: number; angle: number; isAmber: boolean }> = [];
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const angle = (i / PILLAR_COUNT) * Math.PI * 2;
      const x = Math.cos(angle) * (ARENA_RADIUS - 0.8);
      const z = Math.sin(angle) * (ARENA_RADIUS - 0.8);
      list.push({ x, z, angle, isAmber: i % 2 === 0 });
    }
    return list;
  }, []);

  // Cardinal directional floor markers scaled for radius 30
  const cardinalMarkers = useMemo(() => {
    return [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => {
      const dist = 20.0;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        rotY: -angle,
      };
    });
  }, []);

  // Subtle ambient animation for floating embers, hovering crystal beacons, and boss atmosphere
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Smooth boss influence transitions (1.0 during active encounter, 0.0 during regular gameplay)
    const targetInfluence = bossActive ? 1.0 : 0.0;
    bossInfluenceRef.current = THREE.MathUtils.lerp(
      bossInfluenceRef.current,
      targetInfluence,
      delta * 2.2
    );
    const influence = bossInfluenceRef.current;
    tempBossColor.set(bossAccentColor);

    // Slowly rise and loop embers (accelerated by boss presence)
    if (embersRef.current) {
      const positions = embersRef.current.geometry.attributes.position.array as Float32Array;
      const speedMult = 1.0 + influence * 1.6;
      for (let i = 0; i < EMBER_COUNT; i++) {
        const idx = i * 3 + 1;
        positions[idx] += delta * initialData[i].speed * speedMult;
        if (positions[idx] > 5.5) {
          positions[idx] = 0.2;
        }
      }
      embersRef.current.geometry.attributes.position.needsUpdate = true;

      const emberMat = embersRef.current.material as THREE.PointsMaterial;
      if (emberMat) {
        tempTargetColor.set("#fbbf24").lerp(tempBossColor, influence * 0.7);
        emberMat.color.copy(tempTargetColor);
        emberMat.opacity = 0.7 + influence * 0.25;
      }
    }

    // Animate levitating pylon crystals with boss thematic resonance
    if (crystalGroupRef.current) {
      const children = crystalGroupRef.current.children;
      const spinSpeed = 0.8 + influence * 2.2;
      const hoverPulse = influence * Math.sin(time * 6.0) * 0.15;

      for (let i = 0; i < children.length; i++) {
        const c = children[i] as THREE.Mesh;
        c.rotation.y = time * spinSpeed + i;
        c.position.y = 4.6 + Math.sin(time * 2.5 + i * 1.2) * 0.12 + hoverPulse;

        // Shift emissive glow toward boss accent color during encounters
        if (c.material) {
          const mat = c.material as THREE.MeshStandardMaterial;
          const defaultBase = pillars[i]?.isAmber ? defaultAmberEmissive : defaultCyanEmissive;
          tempTargetColor.copy(defaultBase).lerp(tempBossColor, influence * 0.85);
          mat.emissive.copy(tempTargetColor);
          mat.emissiveIntensity = 1.8 + influence * (0.8 + Math.sin(time * 8.0 + i) * 0.4);
        }
      }
    }

    // Reactive tactical ground rings
    if (outerBoundaryMatRef.current) {
      tempTargetColor.copy(defaultBoundaryColor).lerp(tempBossColor, influence);
      outerBoundaryMatRef.current.color.copy(tempTargetColor);
      outerBoundaryMatRef.current.opacity = 0.6 + influence * 0.25 * Math.sin(time * 4.0);
    }

    if (innerCombatRingMatRef.current) {
      tempTargetColor.copy(defaultTacticalColor).lerp(tempBossColor, influence * 0.75);
      innerCombatRingMatRef.current.color.copy(tempTargetColor);
      innerCombatRingMatRef.current.opacity = 0.35 + influence * 0.2;
    }

    if (midTacticalRingMatRef.current) {
      tempTargetColor.copy(defaultMidTacticalColor).lerp(tempBossColor, influence * 0.6);
      midTacticalRingMatRef.current.color.copy(tempTargetColor);
    }

    if (centerDaisMatRef.current) {
      tempTargetColor.copy(defaultDaisEmissive).lerp(tempBossColor, influence * 0.8);
      centerDaisMatRef.current.emissive.copy(tempTargetColor);
      centerDaisMatRef.current.emissiveIntensity = 1.4 + influence * 0.8;
    }
  });

  return (
    <group>
      {/* Rapier Physics Collider for the Floor */}
      <RigidBody type="fixed" colliders={false} position={[0, -0.25, 0]}>
        <CuboidCollider args={[ARENA_RADIUS, 0.25, ARENA_RADIUS]} />
      </RigidBody>

      {/* ===================================================================== */}
      {/* 1. LAYERED ARENA FLOOR WITH RICH CONTRAST                             */}
      {/* ===================================================================== */}

      {/* Main Basalt Arena Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial
          color="#080c14"
          roughness={0.75}
          metalness={0.25}
        />
      </mesh>

      {/* Outer Raised Perimeter Curbs / Retaining Wall Rim */}
      <mesh receiveShadow position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.4, ARENA_RADIUS + 0.6, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>

      {/* Outer Boundary Warning Perimeter Line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[ARENA_BOUNDARY_LIMIT - 0.35, ARENA_BOUNDARY_LIMIT, 64]} />
        <meshBasicMaterial ref={outerBoundaryMatRef} color="#ef4444" opacity={0.6} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 0]}>
        <ringGeometry args={[ARENA_BOUNDARY_LIMIT - 0.45, ARENA_BOUNDARY_LIMIT - 0.38, 64]} />
        <meshBasicMaterial color="#f97316" opacity={0.4} transparent />
      </mesh>

      {/* ===================================================================== */}
      {/* 2. TACTICAL COMBAT RINGS & DIRECTIONAL MARKERS                       */}
      {/* ===================================================================== */}

      {/* Inner Combat Ring (~9.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[9.4, 9.65, 64]} />
        <meshBasicMaterial ref={innerCombatRingMatRef} color="#06b6d4" opacity={0.35} transparent />
      </mesh>

      {/* Mid-Range Tactical Perimeter (~18.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[18.4, 18.65, 64]} />
        <meshBasicMaterial ref={midTacticalRingMatRef} color="#38bdf8" opacity={0.25} transparent />
      </mesh>

      {/* Outer Tactical Perimeter (~25.5m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[25.4, 25.65, 64]} />
        <meshBasicMaterial color="#a855f7" opacity={0.2} transparent />
      </mesh>

      {/* 4 Cardinal Floor Runes (N, S, E, W Navigation Guides) */}
      {cardinalMarkers.map((m, idx) => (
        <group key={idx} position={[m.x, 0.008, m.z]} rotation={[0, m.rotY, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.8, 1.6, 3]} />
            <meshBasicMaterial color="#06b6d4" opacity={0.4} transparent />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.9]}>
            <boxGeometry args={[0.25, 0.7, 0.02]} />
            <meshBasicMaterial color="#38bdf8" opacity={0.45} transparent />
          </mesh>
        </group>
      ))}

      {/* ===================================================================== */}
      {/* 3. CENTER TACTICAL PLATFORM (Central Colosseum Dais)                   */}
      {/* ===================================================================== */}

      {/* Layer 1: Octagonal Outer Dais */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, 0.003, 0]}>
        <circleGeometry args={[5.2, 8]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.65}
          metalness={0.45}
        />
      </mesh>

      {/* Layer 2: Circular Inner Combat Platform */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[3.5, 48]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.5}
          metalness={0.5}
        />
      </mesh>

      {/* Center Dais Golden Accent Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[3.4, 3.55, 48]} />
        <meshBasicMaterial color="#fbbf24" opacity={0.6} transparent />
      </mesh>

      {/* Center Energy Well / Inset Core */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.3, 1.55, 36]} />
        <meshBasicMaterial color="#06b6d4" opacity={0.7} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[1.2, 24]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <octahedronGeometry args={[0.38]} />
        <meshStandardMaterial
          ref={centerDaisMatRef}
          color="#22d3ee"
          emissive="#06b6d4"
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* Subtle Coordinate Grid */}
      <gridHelper
        args={[ARENA_RADIUS * 2, 48, "#1e293b", "#090d16"]}
        position={[0, 0.007, 0]}
      />

      {/* ===================================================================== */}
      {/* 4. 8 HIGH-TECH PERIMETER COLOSSEUM PYLONS                             */}
      {/* ===================================================================== */}
      {pillars.map((p, idx) => (
        <group key={idx} position={[p.x, 0, p.z]} rotation={[0, -p.angle, 0]}>
          {/* Stepped Pedestal Base (2-Tier) */}
          <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
            <boxGeometry args={[1.6, 0.5, 1.6]} />
            <meshStandardMaterial color="#0b0f19" roughness={0.7} metalness={0.4} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
            <boxGeometry args={[1.3, 0.35, 1.3]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.5} />
          </mesh>

          {/* Main Monolith Column */}
          <mesh castShadow receiveShadow position={[0, 2.4, 0]}>
            <boxGeometry args={[0.95, 3.2, 0.95]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* Vertical Glowing Energy Seam on Column Front Face */}
          <mesh position={[0, 2.4, 0.49]}>
            <boxGeometry args={[0.16, 2.8, 0.02]} />
            <meshStandardMaterial
              color={p.isAmber ? "#f59e0b" : "#06b6d4"}
              emissive={p.isAmber ? "#f59e0b" : "#06b6d4"}
              emissiveIntensity={1.6}
            />
          </mesh>

          {/* Capital Crown Platform */}
          <mesh castShadow position={[0, 4.15, 0]}>
            <boxGeometry args={[1.2, 0.3, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Floating Levitating Pylon Crystal Beacons */}
      <group ref={crystalGroupRef}>
        {pillars.map((p, idx) => (
          <mesh key={idx} position={[p.x, 4.6, p.z]}>
            <octahedronGeometry args={[0.48]} />
            <meshStandardMaterial
              color={p.isAmber ? "#ff6b35" : "#22d3ee"}
              emissive={p.isAmber ? "#ff6b35" : "#06b6d4"}
              emissiveIntensity={1.8}
              roughness={0.15}
            />
          </mesh>
        ))}
      </group>

      {/* ===================================================================== */}
      {/* 5. FLOATING ANIMATED AMBIENT EMBERS                                   */}
      {/* ===================================================================== */}
      <points ref={embersRef} geometry={emberGeometry}>
        <pointsMaterial
          size={0.16}
          color="#fbbf24"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
