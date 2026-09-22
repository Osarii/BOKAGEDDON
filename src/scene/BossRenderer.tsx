import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime, HazardZone } from "../game/runtime";
import { isBossType } from "../game/progression";
import { useGameStore } from "../store/gameStore";
import { ASSETS } from "../config/assets";
import type { BossType } from "../types/game";

interface BossRendererProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

export const BossRenderer: React.FC<BossRendererProps> = ({ runtimeRef }) => {
  const bossGroupRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);
  const coilRing1Ref = useRef<THREE.Group>(null);
  const coilRing2Ref = useRef<THREE.Group>(null);
  const crystalSpireRef = useRef<THREE.Group>(null);

  // Textures safely loaded with fallback to bonklord if new boss assets are pending integration
  const bossTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const enemies = ASSETS.enemies as Record<string, string | undefined>;
    const loadSafe = (key: string) => {
      const url = enemies[key] || ASSETS.enemies.bonklord;
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    return {
      bonklord: loadSafe("bonklord"),
      cindermaw: loadSafe("cindermaw"),
      stormcoil: loadSafe("stormcoil"),
      venomatrix: loadSafe("venomatrix"),
      cryovex: loadSafe("cryovex"),
    };
  }, []);

  // Shared geometries for hazard ground representations
  const hazardCircleGeo = useMemo(() => new THREE.CircleGeometry(1, 32), []);
  const hazardRingGeo = useMemo(() => new THREE.RingGeometry(0.85, 1.0, 32), []);

  // Materials for hazard pools
  const hazardMaterials = useMemo(
    () => ({
      fire: new THREE.MeshBasicMaterial({
        color: "#f97316",
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      fireRing: new THREE.MeshBasicMaterial({
        color: "#ff5722",
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      poison: new THREE.MeshBasicMaterial({
        color: "#22c55e",
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      poisonRing: new THREE.MeshBasicMaterial({
        color: "#16a34a",
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      frost: new THREE.MeshBasicMaterial({
        color: "#38bdf8",
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      frostRing: new THREE.MeshBasicMaterial({
        color: "#0284c7",
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    }),
    []
  );

  // Group for active hazard zone meshes
  const hazardGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const time = state.clock.elapsedTime;

    // Locate active boss in runtime entities
    const boss = runtime.enemies.find((e) => isBossType(e.type));

    if (!boss || !bossGroupRef.current) {
      if (bossGroupRef.current) bossGroupRef.current.visible = false;
    } else {
      bossGroupRef.current.visible = true;

      // Smooth position synchronization with ground clamping
      bossGroupRef.current.position.set(boss.x, 0, boss.z);

      // Face towards player position
      const dx = runtime.playerPosition.x - boss.x;
      const dz = runtime.playerPosition.z - boss.z;
      const facing = Math.atan2(dx, dz);
      bossGroupRef.current.rotation.y = facing;

      // Pulsing boss ground aura
      if (auraRef.current) {
        const pulse = 1.0 + Math.sin(time * 3.5) * 0.12;
        auraRef.current.scale.set(pulse, pulse, pulse);
        auraRef.current.rotation.z += delta * 0.5;
      }

      // Attack animations per archetype
      if (boss.type === "bonklord" && weaponGroupRef.current) {
        const isStomping = (boss.stompCooldown || 0) < 0.8;
        const targetPitch = isStomping ? -1.2 : 0.4;
        weaponGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          weaponGroupRef.current.rotation.x,
          targetPitch,
          delta * 8
        );
      }

      if (boss.type === "stormcoil") {
        if (coilRing1Ref.current) {
          coilRing1Ref.current.rotation.x += delta * 2.2;
          coilRing1Ref.current.rotation.y += delta * 1.5;
        }
        if (coilRing2Ref.current) {
          coilRing2Ref.current.rotation.y -= delta * 2.5;
          coilRing2Ref.current.rotation.z += delta * 1.8;
        }
      }

      if (boss.type === "cryovex" && crystalSpireRef.current) {
        crystalSpireRef.current.position.y = 1.8 + Math.sin(time * 2.5) * 0.2;
        crystalSpireRef.current.rotation.y += delta * 0.8;
      }
    }

    // Hazard Zones rendering update
    if (hazardGroupRef.current) {
      const hazards = runtime.hazardZones;
      const children = hazardGroupRef.current.children;

      for (let i = 0; i < children.length; i++) {
        const meshGroup = children[i] as THREE.Group;
        if (i < hazards.length) {
          const hz: HazardZone = hazards[i];
          meshGroup.visible = true;
          meshGroup.position.set(hz.x, 0.04, hz.z);
          const currentScale = hz.radius;
          meshGroup.scale.set(currentScale, currentScale, currentScale);

          // Alpha fade near expiration
          const progress = hz.duration / Math.max(0.1, hz.maxDuration);
          const opacity = Math.min(1, progress * 1.5);

          const disc = meshGroup.children[0] as THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
          const ring = meshGroup.children[1] as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

          if (disc && disc.material) {
            disc.material.opacity = (hz.type === "fire" ? 0.55 : hz.type === "poison" ? 0.5 : 0.45) * opacity;
          }
          if (ring && ring.material) {
            ring.material.opacity = 0.85 * opacity;
          }
        } else {
          meshGroup.visible = false;
        }
      }
    }
  });

  const activeBossType: BossType = (useGameStore((s) => s.bossType) as BossType) || "bonklord";

  return (
    <group>
      {/* Dynamic Boss Hierarchy */}
      <group ref={bossGroupRef} visible={false}>
        {/* Ground Fiery/Elemental Aura */}
        <mesh ref={auraRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.5, 36]} />
          <meshBasicMaterial
            color={
              activeBossType === "cindermaw"
                ? "#f97316"
                : activeBossType === "stormcoil"
                ? "#00e5ff"
                : activeBossType === "venomatrix"
                ? "#22c55e"
                : activeBossType === "cryovex"
                ? "#38bdf8"
                : "#e11d48"
            }
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* ------------------------------------------------------------- */}
        {/* 1. BONKLORD MODEL                                             */}
        {/* ------------------------------------------------------------- */}
        {activeBossType === "bonklord" && (
          <group position={[0, 0, 0]}>
            {/* Massive Obsidian Torso */}
            <mesh castShadow position={[0, 1.8, 0]}>
              <capsuleGeometry args={[1.3, 1.5, 8, 16]} />
              <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* Heavy Golden Shoulder Pauldrons */}
            <mesh castShadow position={[-1.5, 2.4, 0]} rotation={[0, 0, 0.4]}>
              <boxGeometry args={[0.8, 0.6, 1.1]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
            </mesh>
            <mesh castShadow position={[1.5, 2.4, 0]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.8, 0.6, 1.1]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
            </mesh>

            {/* 5-Spire Royal Golden Crown */}
            <group position={[0, 3.6, 0]}>
              <mesh position={[0, 0.4, 0]}>
                <coneGeometry args={[0.3, 0.9, 6]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
              </mesh>
              <mesh position={[-0.45, 0.25, 0]}>
                <coneGeometry args={[0.2, 0.6, 5]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
              </mesh>
              <mesh position={[0.45, 0.25, 0]}>
                <coneGeometry args={[0.2, 0.6, 5]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.15} metalness={0.95} />
              </mesh>
            </group>

            {/* Glowing Face Emblem Decal */}
            <mesh position={[0, 2.2, 1.1]}>
              <planeGeometry args={[1.5, 1.5]} />
              <meshBasicMaterial
                map={bossTextures.bonklord}
                transparent
                alphaTest={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Massive Legendary Bonk Warhammer */}
            <group ref={weaponGroupRef} position={[1.9, 1.6, 0.5]} rotation={[0.4, 0, -0.2]}>
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 3.2, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.8} />
              </mesh>
              <mesh position={[0, 1.4, 0]}>
                <boxGeometry args={[1.3, 1.1, 1.1]} />
                <meshStandardMaterial color="#e11d48" roughness={0.2} metalness={0.85} emissive="#881337" emissiveIntensity={0.5} />
              </mesh>
            </group>
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. CINDERMAW MODEL                                            */}
        {/* ------------------------------------------------------------- */}
        {activeBossType === "cindermaw" && (
          <group position={[0, 0, 0]}>
            {/* Volcanic Magma Rock Core */}
            <mesh castShadow position={[0, 1.7, 0]}>
              <dodecahedronGeometry args={[1.4, 1]} />
              <meshStandardMaterial color="#1c1917" roughness={0.8} metalness={0.3} />
            </mesh>

            {/* Glowing Internal Molten Lava Core */}
            <mesh position={[0, 1.7, 0]}>
              <sphereGeometry args={[1.1, 16, 16]} />
              <meshStandardMaterial color="#ff5722" emissive="#f97316" emissiveIntensity={1.8} roughness={0.2} />
            </mesh>

            {/* Molten Volcanic Horns */}
            <mesh position={[-0.9, 2.9, 0.3]} rotation={[0.2, 0, 0.6]}>
              <coneGeometry args={[0.35, 1.4, 6]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0.9, 2.9, 0.3]} rotation={[0.2, 0, -0.6]}>
              <coneGeometry args={[0.35, 1.4, 6]} />
              <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.2} />
            </mesh>

            {/* Burning Spines along Back */}
            <mesh position={[0, 2.7, -0.8]} rotation={[-0.6, 0, 0]}>
              <coneGeometry args={[0.3, 0.9, 5]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} />
            </mesh>
            <mesh position={[0, 1.9, -1.1]} rotation={[-0.7, 0, 0]}>
              <coneGeometry args={[0.25, 0.8, 5]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} />
            </mesh>

            {/* Face Decal Emblem */}
            <mesh position={[0, 1.9, 1.25]}>
              <planeGeometry args={[1.4, 1.4]} />
              <meshBasicMaterial map={bossTextures.cindermaw} transparent alphaTest={0.1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3. STORMCOIL MODEL                                            */}
        {/* ------------------------------------------------------------- */}
        {activeBossType === "stormcoil" && (
          <group position={[0, 0, 0]}>
            {/* Levitating High-Voltage Core */}
            <mesh castShadow position={[0, 2.0, 0]}>
              <octahedronGeometry args={[0.9, 2]} />
              <meshStandardMaterial color="#00e5ff" emissive="#06b6d4" emissiveIntensity={2.0} roughness={0.1} metalness={0.9} />
            </mesh>

            {/* Rotating Outer Gyroscopic Coil Ring 1 */}
            <group ref={coilRing1Ref} position={[0, 2.0, 0]}>
              <mesh>
                <torusGeometry args={[1.7, 0.12, 12, 32]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} emissive="#00e5ff" emissiveIntensity={0.6} />
              </mesh>
              <mesh position={[1.7, 0, 0]}>
                <boxGeometry args={[0.3, 0.5, 0.3]} />
                <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} />
              </mesh>
              <mesh position={[-1.7, 0, 0]}>
                <boxGeometry args={[0.3, 0.5, 0.3]} />
                <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.5} />
              </mesh>
            </group>

            {/* Rotating Counter-Ring 2 */}
            <group ref={coilRing2Ref} position={[0, 2.0, 0]}>
              <mesh>
                <torusGeometry args={[1.3, 0.1, 12, 32]} />
                <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.15} />
              </mesh>
            </group>

            {/* Decal */}
            <mesh position={[0, 2.0, 1.1]}>
              <planeGeometry args={[1.3, 1.3]} />
              <meshBasicMaterial map={bossTextures.stormcoil} transparent alphaTest={0.1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. VENOMATRIX MODEL                                           */}
        {/* ------------------------------------------------------------- */}
        {activeBossType === "venomatrix" && (
          <group position={[0, 0, 0]}>
            {/* Chitinous Armored Thorax */}
            <mesh castShadow position={[0, 1.5, 0]}>
              <capsuleGeometry args={[1.0, 1.2, 8, 16]} />
              <meshStandardMaterial color="#064e3b" roughness={0.35} metalness={0.6} />
            </mesh>

            {/* Luminescent Green Venom Sacs */}
            <mesh position={[-0.8, 1.8, -0.4]}>
              <sphereGeometry args={[0.55, 12, 12]} />
              <meshStandardMaterial color="#22c55e" emissive="#10b981" emissiveIntensity={1.6} roughness={0.2} transparent opacity={0.9} />
            </mesh>
            <mesh position={[0.8, 1.8, -0.4]}>
              <sphereGeometry args={[0.55, 12, 12]} />
              <meshStandardMaterial color="#22c55e" emissive="#10b981" emissiveIntensity={1.6} roughness={0.2} transparent opacity={0.9} />
            </mesh>

            {/* Poison Stinger Tail */}
            <mesh position={[0, 2.6, -0.9]} rotation={[-0.5, 0, 0]}>
              <coneGeometry args={[0.35, 1.3, 6]} />
              <meshStandardMaterial color="#84cc16" emissive="#65a30d" emissiveIntensity={1.2} />
            </mesh>

            {/* Decal */}
            <mesh position={[0, 1.8, 1.1]}>
              <planeGeometry args={[1.4, 1.4]} />
              <meshBasicMaterial map={bossTextures.venomatrix} transparent alphaTest={0.1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 5. CRYOVEX MODEL                                              */}
        {/* ------------------------------------------------------------- */}
        {activeBossType === "cryovex" && (
          <group ref={crystalSpireRef} position={[0, 1.8, 0]}>
            {/* Towering Glacial Crystal Core */}
            <mesh castShadow>
              <cylinderGeometry args={[0.2, 1.1, 2.6, 6]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.4} roughness={0.1} metalness={0.9} />
            </mesh>

            {/* Orbiting Ice Shards */}
            <mesh position={[1.4, 0.5, 0]} rotation={[0.4, 0.4, 0]}>
              <octahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[-1.4, -0.4, 0]} rotation={[0.2, -0.4, 0.3]}>
              <octahedronGeometry args={[0.35, 0]} />
              <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, 0.8, -1.3]} rotation={[0.5, 0, 0.5]}>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={1.2} />
            </mesh>

            {/* Decal */}
            <mesh position={[0, 0.2, 0.95]}>
              <planeGeometry args={[1.4, 1.4]} />
              <meshBasicMaterial map={bossTextures.cryovex} transparent alphaTest={0.1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>

      {/* Persistent Hazard Pools (Burning ground, poison pools, frost patches) */}
      <group ref={hazardGroupRef}>
        {Array.from({ length: 12 }).map((_, index) => (
          <group key={index} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh geometry={hazardCircleGeo} material={hazardMaterials.fire} />
            <mesh geometry={hazardRingGeo} material={hazardMaterials.fireRing} position={[0, 0, 0.01]} />
          </group>
        ))}
      </group>
    </group>
  );
};
