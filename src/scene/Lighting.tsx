import React from "react";

export const Lighting: React.FC = () => {
  return (
    <>
      {/* Soft ambient illumination */}
      <ambientLight intensity={0.75} color="#e2e8f0" />

      {/* Main directional sun with crisp shadows */}
      <directionalLight
        position={[14, 24, 12]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0005}
      />

      {/* Cool rim/fill light from opposite angle to outline 3D silhouettes */}
      <directionalLight
        position={[-14, 16, -12]}
        intensity={0.85}
        color="#38bdf8"
      />

      {/* Hemisphere fill to ground characters and enemies */}
      <hemisphereLight
        args={["#38bdf8", "#0f172a", 0.55]}
      />
    </>
  );
};
