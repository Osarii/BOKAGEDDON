import React from "react";

export const Lighting: React.FC = () => {
  return (
    <>
      {/* Soft ambient illumination */}
      <ambientLight intensity={0.7} color="#e2e8f0" />

      {/* Warm directional sun with crisp shadows */}
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

      {/* Crisp electric cyan rim light from opposite angle to outline silhouettes */}
      <directionalLight
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
    </>
  );
};

