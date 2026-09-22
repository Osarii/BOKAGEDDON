import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../store/gameStore";

export const Lighting: React.FC = () => {
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const bossMoodLightRef = useRef<THREE.PointLight>(null);
  const bossRimLightRef = useRef<THREE.DirectionalLight>(null);

  const bossActive = useGameStore((s) => s.bossActive);
  const bossAccentColor = useGameStore((s) => s.bossAccentColor) || "#e11d48";
  const bossInfluenceRef = useRef<number>(0);

  const defaultAmbientColor = useMemo(() => new THREE.Color("#e2e8f0"), []);
  const defaultRimColor = useMemo(() => new THREE.Color("#38bdf8"), []);
  const tempBossColor = useMemo(() => new THREE.Color(), []);
  const tempTargetColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const targetInfluence = bossActive ? 1.0 : 0.0;
    bossInfluenceRef.current = THREE.MathUtils.lerp(
      bossInfluenceRef.current,
      targetInfluence,
      delta * 2.0
    );
    const influence = bossInfluenceRef.current;
    tempBossColor.set(bossAccentColor);

    // Subtle atmospheric ambient tint (max 22% blend to protect silhouette & projectile readability)
    if (ambientLightRef.current) {
      tempTargetColor.copy(defaultAmbientColor).lerp(tempBossColor, influence * 0.22);
      ambientLightRef.current.color.copy(tempTargetColor);
    }

    // Overhead atmospheric boss encounter mood light
    if (bossMoodLightRef.current) {
      bossMoodLightRef.current.color.copy(tempBossColor);
      bossMoodLightRef.current.intensity = influence * 0.75;
    }

    // Rim light subtle elemental resonance to outline silhouettes
    if (bossRimLightRef.current) {
      tempTargetColor.copy(defaultRimColor).lerp(tempBossColor, influence * 0.45);
      bossRimLightRef.current.color.copy(tempTargetColor);
      bossRimLightRef.current.intensity = 0.9 + influence * 0.3;
    }
  });

  return (
    <>
      {/* Soft ambient illumination with boss mood tint */}
      <ambientLight ref={ambientLightRef} intensity={0.7} color="#e2e8f0" />

      {/* Warm directional sun with crisp shadows - permanently stable for readability */}
      <directionalLight
        position={[14, 24, 12]}
        intensity={1.5}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={64}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0005}
      />

      {/* Crisp rim light outlining character silhouettes with subtle elemental bias */}
      <directionalLight
        ref={bossRimLightRef}
        position={[-14, 16, -12]}
        intensity={0.9}
        color="#38bdf8"
      />

      {/* Subtle violet/amber side fill to soften dark shadow crevices */}
      <directionalLight
        position={[-10, 8, 12]}
        intensity={0.4}
        color="#c084fc"
      />

      {/* Sky-to-ground hemisphere light grounding characters and props */}
      <hemisphereLight
        args={["#7dd3fc", "#080c14", 0.55]}
      />

      {/* Atmospheric overhead encounter light activated during boss phases */}
      <pointLight
        ref={bossMoodLightRef}
        position={[0, 14, 0]}
        intensity={0}
        distance={45}
        decay={2}
      />
    </>
  );
};
