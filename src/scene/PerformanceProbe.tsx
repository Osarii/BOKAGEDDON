import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";
import { updatePerformanceFrame } from "../game/devPerformance";

interface PerformanceProbeProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

export const PerformanceProbe: React.FC<PerformanceProbeProps> = ({ runtimeRef }) => {
  const gl = useThree((state) => state.gl);

  useFrame((_, delta) => {
    updatePerformanceFrame(gl, runtimeRef.current, delta);
  });

  return null;
};
