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
const DESIRED_LOOK_TARGET = new THREE.Vector3();
const CAMERA_FOLLOW_SPEED = 7.5;
const LOOKAHEAD_SMOOTH_SPEED = 3.5;

export const CameraController: React.FC<CameraControllerProps> = ({
  runtimeRef,
}) => {
  const initializedRef = useRef<boolean>(false);
  const previousPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const smoothedLookAheadRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const currentLookTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useFrame((state, delta) => {
    const target = runtimeRef.current?.playerPosition;
    if (!target) return;

    // First-frame initialization to prevent jump from origin
    if (!initializedRef.current) {
      previousPosRef.current.copy(target);
      currentLookTargetRef.current.set(target.x, target.y + 0.4, target.z);
      state.camera.position.set(
        target.x + CAMERA_OFFSET.x,
        target.y + CAMERA_OFFSET.y,
        target.z + CAMERA_OFFSET.z
      );
      state.camera.lookAt(currentLookTargetRef.current);
      initializedRef.current = true;
      return;
    }

    // Compute raw displacement velocity across frames
    const safeDelta = Math.max(delta, 0.001);
    const rawVelX = (target.x - previousPosRef.current.x) / safeDelta;
    const rawVelZ = (target.z - previousPosRef.current.z) / safeDelta;
    previousPosRef.current.copy(target);

    // Target look-ahead with bounded range
    const targetLookX = THREE.MathUtils.clamp(rawVelX * 0.12, -1.2, 1.2);
    const targetLookZ = THREE.MathUtils.clamp(rawVelZ * 0.12, -1.2, 1.2);

    // Filter look-ahead with exponential decay to completely eliminate physics jitter
    const lookSmoothT = 1 - Math.exp(-LOOKAHEAD_SMOOTH_SPEED * Math.min(delta, 0.1));
    smoothedLookAheadRef.current.x += (targetLookX - smoothedLookAheadRef.current.x) * lookSmoothT;
    smoothedLookAheadRef.current.z += (targetLookZ - smoothedLookAheadRef.current.z) * lookSmoothT;

    DESIRED_CAMERA_POS.set(
      target.x + CAMERA_OFFSET.x + smoothedLookAheadRef.current.x,
      target.y + CAMERA_OFFSET.y,
      target.z + CAMERA_OFFSET.z + smoothedLookAheadRef.current.z
    );

    // Frame-rate independent smooth exponential damping for camera position
    const posT = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * Math.min(delta, 0.1));
    state.camera.position.lerp(DESIRED_CAMERA_POS, posT);

    // Smoothly damped look-at target orientation
    DESIRED_LOOK_TARGET.set(
      target.x + smoothedLookAheadRef.current.x * 0.3,
      target.y + 0.4,
      target.z + smoothedLookAheadRef.current.z * 0.3
    );
    currentLookTargetRef.current.lerp(DESIRED_LOOK_TARGET, posT);
    state.camera.lookAt(currentLookTargetRef.current);
  });

  return null;
};
