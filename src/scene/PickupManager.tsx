import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";
import { GAME_CONFIG } from "../game/config";
import { useGameStore } from "../store/gameStore";
import { gameAudio } from "../audio/gameAudio";
import { ASSETS } from "../config/assets";
import type { PickupType } from "../types/game";

interface PickupManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const MAX_XP_PICKUPS = 120;
const MAX_ITEM_INSTANCES = 24;

// Reusable scratch objects to avoid per-frame GC allocations
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempRotation = new THREE.Euler();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

// Shared textures loaded once at module scope
const textureLoader = new THREE.TextureLoader();
const itemTextures: Record<Exclude<PickupType, "xp">, THREE.Texture> = {
  medkit_emergency: textureLoader.load(ASSETS.items.medkitEmergency),
  medkit_case: textureLoader.load(ASSETS.items.medkitCase),
  shield_potion: textureLoader.load(ASSETS.items.shieldPotion),
  shield_battery: textureLoader.load(ASSETS.items.shieldBattery),
};
Object.values(itemTextures).forEach((t) => {
  t.colorSpace = THREE.SRGBColorSpace;
});

export const PickupManager: React.FC<PickupManagerProps> = ({ runtimeRef }) => {
  // InstancedMesh for XP Gems
  const xpMeshRef = useRef<THREE.InstancedMesh>(null);

  // InstancedMeshes for the 4 Recovery Items
  const medkitEmergencyRef = useRef<THREE.InstancedMesh>(null);
  const medkitCaseRef = useRef<THREE.InstancedMesh>(null);
  const shieldPotionRef = useRef<THREE.InstancedMesh>(null);
  const shieldBatteryRef = useRef<THREE.InstancedMesh>(null);

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

  // Shared billboard plane geometry for recovery items
  const itemPlaneGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.8, 0.8);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Dedicated basic materials for each recovery item archetype
  const itemMaterials = useMemo(
    () => ({
      medkit_emergency: new THREE.MeshBasicMaterial({
        map: itemTextures.medkit_emergency,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      medkit_case: new THREE.MeshBasicMaterial({
        map: itemTextures.medkit_case,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      shield_potion: new THREE.MeshBasicMaterial({
        map: itemTextures.shield_potion,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      shield_battery: new THREE.MeshBasicMaterial({
        map: itemTextures.shield_battery,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    }),
    []
  );

  // Initialize instance counts and hidden matrices once at mount
  useEffect(() => {
    if (xpMeshRef.current) {
      xpMeshRef.current.count = 0;
      for (let i = 0; i < MAX_XP_PICKUPS; i++) {
        xpMeshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      xpMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    const itemRefs = [
      medkitEmergencyRef,
      medkitCaseRef,
      shieldPotionRef,
      shieldBatteryRef,
    ];
    itemRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.count = 0;
        for (let i = 0; i < MAX_ITEM_INSTANCES; i++) {
          ref.current.setMatrixAt(i, hiddenMatrix);
        }
        ref.current.instanceMatrix.needsUpdate = true;
      }
    });
  }, []);

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    const magnetTier = useGameStore.getState().upgrades.magnet || 0;
    const magnetRadius = GAME_CONFIG.basePickupRadius * (1 + magnetTier * 0.4);
    const playerPos = runtime.playerPosition;

    const health = useGameStore.getState().health;
    const maxHealth = useGameStore.getState().maxHealth;
    const shield = useGameStore.getState().shield;
    const maxShield = useGameStore.getState().maxShield;

    const time = state.clock.getElapsedTime();

    // =========================================================================
    // 1. Pickup Collection & Vacuum Loop
    // =========================================================================
    let collectedXp = 0;

    for (let i = runtime.pickups.length - 1; i >= 0; i--) {
      const pickup = runtime.pickups[i];
      const dx = playerPos.x - pickup.x;
      const dz = playerPos.z - pickup.z;
      const dist = Math.hypot(dx, dz);

      if (pickup.type === "xp") {
        // XP Gems: Vacuum attraction when within magnet radius
        if (dist < magnetRadius) {
          const pullSpeed = Math.max(8.0, 16.0 / (dist + 0.1));
          pickup.x += (dx / (dist || 1)) * pullSpeed * delta;
          pickup.z += (dz / (dist || 1)) * pullSpeed * delta;
        }

        // Collected by player — accumulate for single batched dispatch
        if (dist < 0.7) {
          collectedXp += pickup.value;
          runtime.pickups.splice(i, 1);
        }
      } else {
        // Recovery Items: Collected strictly by contact (no vacuum magnet attraction)
        const isHealing = pickup.type === "medkit_emergency" || pickup.type === "medkit_case";
        const isShield = pickup.type === "shield_potion" || pickup.type === "shield_battery";

        if (dist < 0.85) {
          if (isHealing) {
            // A full HP player must not consume healing
            if (health < maxHealth) {
              useGameStore.getState().heal(pickup.value);
              gameAudio.play("ui");
              runtime.pickups.splice(i, 1);
            }
          } else if (isShield) {
            // A full shield player must not consume shield recovery
            if (shield < maxShield) {
              useGameStore.getState().addShield(pickup.value);
              gameAudio.play("ui");
              runtime.pickups.splice(i, 1);
            }
          }
        }
      }
    }

    // Single batched XP store dispatch and audio trigger per frame
    if (collectedXp > 0) {
      const previousLevel = useGameStore.getState().level;
      useGameStore.getState().addXp(collectedXp);
      gameAudio.play(useGameStore.getState().level > previousLevel ? "levelUp" : "xpPickup");
    }

    // =========================================================================
    // 2. XP Gems Instanced Rendering
    // =========================================================================
    if (xpMeshRef.current) {
      let xpIndex = 0;

      for (let i = 0; i < runtime.pickups.length && xpIndex < MAX_XP_PICKUPS; i++) {
        const p = runtime.pickups[i];
        if (p.type === "xp") {
          const bob = Math.sin(time * 5 + xpIndex * 0.5) * 0.08;
          tempPosition.set(p.x, 0.35 + bob, p.z);
          tempRotation.set(0.3, time * 3.5 + xpIndex, 0);
          tempQuaternion.setFromEuler(tempRotation);
          tempScale.set(1, 1.3, 1);

          tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
          xpMeshRef.current.setMatrixAt(xpIndex, tempMatrix);
          xpIndex++;
        }
      }

      xpMeshRef.current.count = xpIndex;
      if (xpIndex > 0) {
        xpMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // =========================================================================
    // 3. Recovery Items Instanced Rendering (Camera Billboard Sprites)
    // =========================================================================
    const itemCounts = {
      medkit_emergency: 0,
      medkit_case: 0,
      shield_potion: 0,
      shield_battery: 0,
    };

    const itemRefs: Record<Exclude<PickupType, "xp">, React.RefObject<THREE.InstancedMesh | null>> = {
      medkit_emergency: medkitEmergencyRef,
      medkit_case: medkitCaseRef,
      shield_potion: shieldPotionRef,
      shield_battery: shieldBatteryRef,
    };

    for (let i = 0; i < runtime.pickups.length; i++) {
      const p = runtime.pickups[i];
      if (p.type !== "xp") {
        const type = p.type;
        const count = itemCounts[type];
        const meshRef = itemRefs[type];

        if (meshRef.current && count < MAX_ITEM_INSTANCES) {
          // Floating bobbing effect
          const bob = Math.sin(time * 4 + i * 0.7) * 0.08;
          tempPosition.set(p.x, 0.45 + bob, p.z);

          // Billboard facing the camera directly
          tempQuaternion.copy(state.camera.quaternion);

          // Major pickups are slightly larger
          const scale = type === "medkit_case" || type === "shield_battery" ? 1.15 : 0.95;
          tempScale.set(scale, scale, scale);

          tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
          meshRef.current.setMatrixAt(count, tempMatrix);
          itemCounts[type]++;
        }
      }
    }

    // Update active counts and flag matrices for update
    (Object.keys(itemCounts) as Array<Exclude<PickupType, "xp">>).forEach((type) => {
      const ref = itemRefs[type];
      if (ref.current) {
        ref.current.count = itemCounts[type];
        if (itemCounts[type] > 0) {
          ref.current.instanceMatrix.needsUpdate = true;
        }
      }
    });
  });

  return (
    <group>
      {/* XP Gems Instanced Mesh */}
      <instancedMesh
        ref={xpMeshRef}
        args={[gemGeometry, gemMaterial, MAX_XP_PICKUPS]}
        frustumCulled={false}
      />

      {/* Emergency Medkit (+35 HP) */}
      <instancedMesh
        ref={medkitEmergencyRef}
        args={[itemPlaneGeometry, itemMaterials.medkit_emergency, MAX_ITEM_INSTANCES]}
        frustumCulled={false}
      />

      {/* Medkit Case (+70 HP) */}
      <instancedMesh
        ref={medkitCaseRef}
        args={[itemPlaneGeometry, itemMaterials.medkit_case, MAX_ITEM_INSTANCES]}
        frustumCulled={false}
      />

      {/* Shield Potion (+25 Shield) */}
      <instancedMesh
        ref={shieldPotionRef}
        args={[itemPlaneGeometry, itemMaterials.shield_potion, MAX_ITEM_INSTANCES]}
        frustumCulled={false}
      />

      {/* Shield Battery (+50 Shield) */}
      <instancedMesh
        ref={shieldBatteryRef}
        args={[itemPlaneGeometry, itemMaterials.shield_battery, MAX_ITEM_INSTANCES]}
        frustumCulled={false}
      />
    </group>
  );
};
