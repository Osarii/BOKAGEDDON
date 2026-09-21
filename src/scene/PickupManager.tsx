import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";
import { GAME_CONFIG } from "../game/config";
import { useGameStore } from "../store/gameStore";
import { gameAudio } from "../audio/gameAudio";

interface PickupManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const MAX_PICKUPS = 200;
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempRotation = new THREE.Euler();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

export const PickupManager: React.FC<PickupManagerProps> = ({ runtimeRef }) => {
  const pickupMeshRef = useRef<THREE.InstancedMesh>(null);

  // Emerald gem geometry & material with computed bounds
  const gemGeometry = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(0.26);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    geo.computeVertexNormals();
    return geo;
  }, []);

  const gemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4ade80",
        emissive: "#22c55e",
        emissiveIntensity: 1.0,
        roughness: 0.15,
        metalness: 0.25,
      }),
    []
  );

  // Initialize instance count to 0 at mount
  useEffect(() => {
    if (pickupMeshRef.current) {
      pickupMeshRef.current.count = 0;
    }
  }, []);

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    const magnetTier = useGameStore.getState().upgrades.magnet || 0;
    const magnetRadius = GAME_CONFIG.basePickupRadius * (1 + magnetTier * 0.4);
    const playerPos = runtime.playerPosition;

    const time = state.clock.getElapsedTime();

    // =========================================================================
    // Vacuum Attraction & Collection Loop
    // =========================================================================
    for (let i = runtime.pickups.length - 1; i >= 0; i--) {
      const gem = runtime.pickups[i];
      const dx = playerPos.x - gem.x;
      const dz = playerPos.z - gem.z;
      const dist = Math.hypot(dx, dz);

      // Vacuum attraction when within magnet radius
      if (dist < magnetRadius) {
        const pullSpeed = Math.max(8.0, 16.0 / (dist + 0.1));
        gem.x += (dx / (dist || 1)) * pullSpeed * delta;
        gem.z += (dz / (dist || 1)) * pullSpeed * delta;
      }

      // Collected by player
      if (dist < 0.7) {
        const previousLevel = useGameStore.getState().level;
        useGameStore.getState().addXp(gem.xpValue);
        gameAudio.play(useGameStore.getState().level > previousLevel ? "levelUp" : "xpPickup");
        runtime.pickups.splice(i, 1);
      }
    }

    // =========================================================================
    // Instanced Rendering
    // =========================================================================
    if (pickupMeshRef.current) {
      const count = Math.min(runtime.pickups.length, MAX_PICKUPS);
      pickupMeshRef.current.count = count;

      for (let i = 0; i < count; i++) {
        const gem = runtime.pickups[i];
        // Bobbing & rotating effect
        const bob = Math.sin(time * 5 + i * 0.5) * 0.08;
        tempPosition.set(gem.x, 0.35 + bob, gem.z);
        tempRotation.set(0.3, time * 3.5 + i, 0);
        tempQuaternion.setFromEuler(tempRotation);
        tempScale.set(1, 1.3, 1);

        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        pickupMeshRef.current.setMatrixAt(i, tempMatrix);
      }

      for (let i = count; i < MAX_PICKUPS; i++) {
        pickupMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      pickupMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={pickupMeshRef}
      args={[gemGeometry, gemMaterial, MAX_PICKUPS]}
      frustumCulled={false}
      castShadow
    />
  );
};
