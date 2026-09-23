import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface ProceduralTestDummyProps {
  activeClip: string;
  isPlaying: boolean;
  animSpeed: number;
  animTime: number;
}

/**
 * Articulated procedural 3D mannequin for GLB Visual QA validation.
 * Features realistic proportions (height ~1.85m), articulated limbs, and
 * simulated Idle, Run, Attack, Hit, and Death cycles.
 * Soles of boots are calibrated exactly to Y=0 at origin.
 */
export const ProceduralTestDummy: React.FC<ProceduralTestDummyProps> = ({
  activeClip,
  isPlaying,
  animSpeed,
  animTime,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const pelvisRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  // Time accumulator for animation cycles
  const timeRef = useRef<number>(0);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * animSpeed;
    } else {
      timeRef.current = animTime;
    }

    const t = timeRef.current;
    const clip = activeClip.toLowerCase();

    // Reset base transforms
    if (pelvisRef.current) pelvisRef.current.position.set(0, 0.95, 0);
    if (pelvisRef.current) pelvisRef.current.rotation.set(0, 0, 0);
    if (torsoRef.current) torsoRef.current.rotation.set(0, 0, 0);
    if (headRef.current) headRef.current.rotation.set(0, 0, 0);
    if (leftArmRef.current) leftArmRef.current.rotation.set(0, 0, 0);
    if (rightArmRef.current) rightArmRef.current.rotation.set(0, 0, 0);
    if (leftLegRef.current) leftLegRef.current.rotation.set(0, 0, 0);
    if (rightLegRef.current) rightLegRef.current.rotation.set(0, 0, 0);

    if (clip.includes("idle")) {
      // Breathing & subtle weight shift
      const breath = Math.sin(t * 2.5);
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.35 + breath * 0.015;
        torsoRef.current.rotation.x = breath * 0.02;
      }
      if (headRef.current) headRef.current.rotation.x = -breath * 0.015;
      if (leftArmRef.current) leftArmRef.current.rotation.z = 0.15 + breath * 0.02;
      if (rightArmRef.current) rightArmRef.current.rotation.z = -0.15 - breath * 0.02;
      if (pelvisRef.current) pelvisRef.current.position.y = 0.95 + Math.sin(t * 1.5) * 0.005;
    } else if (clip.includes("run")) {
      // Articulated running cycle: opposite arms and legs
      const runCycle = t * 9.0;
      const legStride = Math.sin(runCycle) * 0.75;
      const armSwing = -legStride * 0.85;
      const bounce = Math.abs(Math.sin(runCycle)) * 0.08;

      if (pelvisRef.current) {
        pelvisRef.current.position.y = 0.95 + bounce;
        pelvisRef.current.rotation.y = Math.sin(runCycle) * 0.12;
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.2; // Forward lean
        torsoRef.current.rotation.y = -Math.sin(runCycle) * 0.15;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = legStride;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legStride;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = armSwing;
        leftArmRef.current.rotation.z = 0.2;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -armSwing;
        rightArmRef.current.rotation.z = -0.2;
      }
    } else if (clip.includes("attack")) {
      // Heavy forward slam / punch attack
      const atkPhase = (t * 4.0) % (Math.PI * 2);
      const windup = Math.sin(atkPhase);

      if (pelvisRef.current) {
        pelvisRef.current.position.y = 0.90 + Math.max(0, -windup) * 0.05;
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = windup > 0 ? -0.3 : 0.45;
        torsoRef.current.rotation.y = windup * 0.3;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = windup > 0 ? -1.8 : 1.2;
        rightArmRef.current.rotation.z = -0.3;
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = windup > 0 ? 0.4 : -0.6;
      }
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0.3;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.25;
    } else if (clip.includes("hit")) {
      // Flinch / knockback
      const hitPulse = Math.sin(t * 12.0) * Math.exp(-(t % 1.5) * 3);
      if (pelvisRef.current) pelvisRef.current.position.z = -hitPulse * 0.15;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = -hitPulse * 0.4;
        torsoRef.current.rotation.z = hitPulse * 0.2;
      }
      if (headRef.current) headRef.current.rotation.x = -hitPulse * 0.3;
      if (leftArmRef.current) leftArmRef.current.rotation.z = 0.4 + hitPulse * 0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.z = -0.4 - hitPulse * 0.3;
    } else if (clip.includes("death")) {
      // Collapse to floor
      const deathProgress = Math.min(1.0, (t * 0.8) % 3.0);
      const easeFall = deathProgress * deathProgress;

      if (pelvisRef.current) {
        pelvisRef.current.position.y = 0.95 - easeFall * 0.75;
        pelvisRef.current.position.z = -easeFall * 0.4;
        pelvisRef.current.rotation.x = -easeFall * (Math.PI / 2.2);
      }
      if (torsoRef.current) torsoRef.current.rotation.x = easeFall * 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -easeFall * 1.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -easeFall * 1.4;
      if (leftLegRef.current) leftLegRef.current.rotation.x = easeFall * 0.8;
      if (rightLegRef.current) rightLegRef.current.rotation.x = easeFall * 0.6;
    }
  });

  return (
    <group ref={rootRef} name="ProceduralTestDummy">
      {/* Pelvis / Root Pivot */}
      <group ref={pelvisRef} position={[0, 0.95, 0]}>
        {/* Pelvis Armor */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.18, 0.26]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
        </mesh>

        {/* Torso & Upper Body */}
        <group ref={torsoRef} position={[0, 0.2, 0]}>
          {/* Abdomen / Midsection */}
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.17, 0.18, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.7} />
          </mesh>

          {/* Chest Rig / Armor */}
          <mesh position={[0, 0.28, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.28, 0.3]} />
            <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.85} />
          </mesh>

          {/* Glowing Cyber Core */}
          <mesh position={[0, 0.28, 0.18]}>
            <circleGeometry args={[0.06, 16]} />
            <meshBasicMaterial color="#00e5ff" />
          </mesh>

          {/* Head & Helmet */}
          <group ref={headRef} position={[0, 0.52, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.22, 0.24, 0.24]} />
              <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Visor */}
            <mesh position={[0, 0.02, 0.13]}>
              <boxGeometry args={[0.18, 0.07, 0.02]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>

          {/* Left Shoulder & Arm */}
          <group ref={leftArmRef} position={[0.32, 0.36, 0]}>
            {/* Shoulder Pauldron */}
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.8} />
            </mesh>
            {/* Upper Arm */}
            <mesh position={[0.04, -0.16, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.06, 0.05, 0.22, 8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
            </mesh>
            {/* Forearm & Gauntlet */}
            <mesh position={[0.05, -0.36, 0.02]} castShadow receiveShadow>
              <boxGeometry args={[0.1, 0.22, 0.12]} />
              <meshStandardMaterial color="#0369a1" roughness={0.3} metalness={0.85} />
            </mesh>
          </group>

          {/* Right Shoulder & Arm */}
          <group ref={rightArmRef} position={[-0.32, 0.36, 0]}>
            {/* Shoulder Pauldron */}
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.8} />
            </mesh>
            {/* Upper Arm */}
            <mesh position={[-0.04, -0.16, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.06, 0.05, 0.22, 8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
            </mesh>
            {/* Forearm & Heavy Weapon/Fist */}
            <mesh position={[-0.05, -0.36, 0.02]} castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.24, 0.14]} />
              <meshStandardMaterial color="#0369a1" roughness={0.3} metalness={0.85} />
            </mesh>
          </group>
        </group>

        {/* Left Leg (Hip Pivot at y=0 relative to pelvis) */}
        <group ref={leftLegRef} position={[0.14, -0.06, 0]}>
          {/* Thigh */}
          <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.065, 0.36, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
          </mesh>
          {/* Knee Armor */}
          <mesh position={[0, -0.42, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.1, 0.08]} />
            <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Shin / Calf */}
          <mesh position={[0, -0.58, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.065, 0.075, 0.32, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
          </mesh>
          {/* Armored Boot (bottom aligns precisely with Y = 0 when standing) */}
          <mesh position={[0, -0.82, 0.04]} castShadow receiveShadow>
            <boxGeometry args={[0.13, 0.14, 0.26]} />
            <meshStandardMaterial color="#0284c7" roughness={0.35} metalness={0.85} />
          </mesh>
        </group>

        {/* Right Leg (Hip Pivot) */}
        <group ref={rightLegRef} position={[-0.14, -0.06, 0]}>
          {/* Thigh */}
          <mesh position={[0, -0.22, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.08, 0.065, 0.36, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
          </mesh>
          {/* Knee Armor */}
          <mesh position={[0, -0.42, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.1, 0.08]} />
            <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Shin / Calf */}
          <mesh position={[0, -0.58, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.065, 0.075, 0.32, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
          </mesh>
          {/* Armored Boot (bottom aligns precisely with Y = 0 when standing) */}
          <mesh position={[0, -0.82, 0.04]} castShadow receiveShadow>
            <boxGeometry args={[0.13, 0.14, 0.26]} />
            <meshStandardMaterial color="#0284c7" roughness={0.35} metalness={0.85} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
