import React from "react";

export const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.65} color="#dbeafe" />
      <directionalLight
        position={[12, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <hemisphereLight
        args={["#23d5ff", "#080b12", 0.4]}
      />
    </>
  );
};
