import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";

interface CameraControllerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

// Module-scoped reusable vector instances to avoid per-frame GC allocations
const CAMERA_OFFSET = new THREE.Vector3(0, 16.5, 14.5);
const DESIRED_CAMERA_POS = new THREE.Vector3();
const LOOK_AT_TARGET = new THREE.Vector3();
const CAMERA_FOLLOW_SPEED = 7.5;

export const CameraController: React.FC<CameraControllerProps> = ({
  runtimeRef,
}) => {
  const previousPosRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useFrame((state, delta) => {
    const target = runtimeRef.current?.playerPosition;
    if (!target) return;

    // Subtle forward look-ahead in movement direction
    const velX = (target.x - previousPosRef.current.x) / Math.max(delta, 0.001);
    const velZ = (target.z - previousPosRef.current.z) / Math.max(delta, 0.001);
    previousPosRef.current.copy(target);

    const lookAheadX = THREE.MathUtils.clamp(velX * 0.1, -1.5, 1.5);
    const lookAheadZ = THREE.MathUtils.clamp(velZ * 0.1, -1.5, 1.5);

    DESIRED_CAMERA_POS.set(
      target.x + CAMERA_OFFSET.x + lookAheadX,
      target.y + CAMERA_OFFSET.y,
      target.z + CAMERA_OFFSET.z + lookAheadZ
    );

    // Frame-rate independent smooth exponential damping
    const t = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * Math.min(delta, 0.1));
    state.camera.position.lerp(DESIRED_CAMERA_POS, t);

    LOOK_AT_TARGET.set(target.x + lookAheadX * 0.4, target.y + 0.4, target.z + lookAheadZ * 0.4);
    state.camera.lookAt(LOOK_AT_TARGET);
  });

  return null;
};

