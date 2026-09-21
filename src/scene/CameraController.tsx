import React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";

interface CameraControllerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

// Module-scoped reusable vector instances to avoid per-frame GC allocations
const CAMERA_OFFSET = new THREE.Vector3(0, 15, 13);
const DESIRED_CAMERA_POS = new THREE.Vector3();
const LOOK_AT_TARGET = new THREE.Vector3();
const CAMERA_FOLLOW_SPEED = 7.0;

export const CameraController: React.FC<CameraControllerProps> = ({
  runtimeRef,
}) => {
  useFrame((state, delta) => {
    const target = runtimeRef.current?.playerPosition;
    if (!target) return;

    DESIRED_CAMERA_POS.set(
      target.x + CAMERA_OFFSET.x,
      target.y + CAMERA_OFFSET.y,
      target.z + CAMERA_OFFSET.z
    );

    // Frame-rate independent smooth exponential damping
    const t = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * Math.min(delta, 0.1));
    state.camera.position.lerp(DESIRED_CAMERA_POS, t);

    LOOK_AT_TARGET.set(target.x, target.y + 0.4, target.z);
    state.camera.lookAt(LOOK_AT_TARGET);
  });

  return null;
};
