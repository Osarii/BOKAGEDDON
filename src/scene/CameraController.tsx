import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../store/gameStore";
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

  // Restrained event-driven combat camera impulses
  const impulseOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const prevAttackTimerRef = useRef<number>(0);
  const prevInvulnerableTimerRef = useRef<number>(0);

  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId) || "bonk";

  useFrame((state, delta) => {
    const runtime = runtimeRef.current;
    const target = runtime?.playerPosition;
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

    // =========================================================================
    // Event-driven Combat Camera Feedback (Restrained & Non-continuous)
    // =========================================================================
    const safeDelta = Math.max(delta, 0.001);

    // 1. Player Damage Impulse: Short, stronger response on taking damage
    const currentInvuln = runtime.playerInvulnerableTimer;
    if (currentInvuln > prevInvulnerableTimerRef.current + 0.25) {
      const angle = Math.random() * Math.PI * 2;
      impulseOffsetRef.current.set(
        Math.cos(angle) * 0.22,
        -0.26,
        Math.sin(angle) * 0.22
      );
    }
    prevInvulnerableTimerRef.current = currentInvuln;

    // 2. Attack Impulse: Heavier for Bonk/Tank, lighter for Byte/Nova/Hex
    const currentAttack = runtime.lastAttackTimer;
    if (currentAttack < prevAttackTimerRef.current && prevAttackTimerRef.current > 0.08) {
      const isHeavy = selectedCharacterId === "bonk" || selectedCharacterId === "tank";
      const intensity = isHeavy ? 0.15 : 0.07;
      impulseOffsetRef.current.x += (Math.random() - 0.5) * intensity * 0.8;
      impulseOffsetRef.current.y -= intensity;
      impulseOffsetRef.current.z += (Math.random() - 0.5) * intensity * 0.8;
    }
    prevAttackTimerRef.current = currentAttack;

    // 3. Rapid exponential decay ensuring impulse terminates cleanly
    const decay = Math.exp(-15 * Math.min(delta, 0.1));
    impulseOffsetRef.current.multiplyScalar(decay);
    if (impulseOffsetRef.current.lengthSq() < 0.00001) {
      impulseOffsetRef.current.set(0, 0, 0);
    }

    // =========================================================================
    // Position Tracking & Filtered Lookahead
    // =========================================================================
    const rawVelX = (target.x - previousPosRef.current.x) / safeDelta;
    const rawVelZ = (target.z - previousPosRef.current.z) / safeDelta;
    previousPosRef.current.copy(target);

    // Target look-ahead with bounded range
    const targetLookX = THREE.MathUtils.clamp(rawVelX * 0.12, -1.2, 1.2);
    const targetLookZ = THREE.MathUtils.clamp(rawVelZ * 0.12, -1.2, 1.2);

    // Filter look-ahead with exponential decay to eliminate jitter
    const lookSmoothT = 1 - Math.exp(-LOOKAHEAD_SMOOTH_SPEED * Math.min(delta, 0.1));
    smoothedLookAheadRef.current.x += (targetLookX - smoothedLookAheadRef.current.x) * lookSmoothT;
    smoothedLookAheadRef.current.z += (targetLookZ - smoothedLookAheadRef.current.z) * lookSmoothT;

    DESIRED_CAMERA_POS.set(
      target.x + CAMERA_OFFSET.x + smoothedLookAheadRef.current.x + impulseOffsetRef.current.x,
      target.y + CAMERA_OFFSET.y + impulseOffsetRef.current.y,
      target.z + CAMERA_OFFSET.z + smoothedLookAheadRef.current.z + impulseOffsetRef.current.z
    );

    // Frame-rate independent smooth exponential damping for camera position
    const posT = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * Math.min(delta, 0.1));
    state.camera.position.lerp(DESIRED_CAMERA_POS, posT);

    // Smoothly damped look-at target orientation
    DESIRED_LOOK_TARGET.set(
      target.x + smoothedLookAheadRef.current.x * 0.3 + impulseOffsetRef.current.x * 0.3,
      target.y + 0.4 + impulseOffsetRef.current.y * 0.3,
      target.z + smoothedLookAheadRef.current.z * 0.3 + impulseOffsetRef.current.z * 0.3
    );
    currentLookTargetRef.current.lerp(DESIRED_LOOK_TARGET, posT);
    state.camera.lookAt(currentLookTargetRef.current);
  });

  return null;
};
