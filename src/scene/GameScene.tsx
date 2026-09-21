import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Lighting } from "./Lighting";
import { Arena } from "./Arena";
import { PlayerPlaceholder } from "./PlayerPlaceholder";
import { CameraController } from "./CameraController";
import { EnemyManager } from "./EnemyManager";
import { CombatManager } from "./CombatManager";
import { PickupManager } from "./PickupManager";
import { useGameStore } from "../store/gameStore";
import type { GameRuntime } from "../game/runtime";

interface GameSceneProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

// Low-frequency timer component that updates visible UI time at most once per second
const SimulationTimer: React.FC<{ runtimeRef: React.RefObject<GameRuntime> }> = ({
  runtimeRef,
}) => {
  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    if (gameStatus !== "playing") return;

    runtime.elapsedSimulationTime += delta;
    const currentSecond = Math.floor(runtime.elapsedSimulationTime);
    if (currentSecond > runtime.lastSecondLogged) {
      runtime.lastSecondLogged = currentSecond;
      useGameStore.getState().setTimeSurvived(currentSecond);
    }
  });

  return null;
};

export const GameScene: React.FC<GameSceneProps> = ({ runtimeRef }) => {
  return (
    <div className="game-canvas-wrapper">
      <Canvas
        shadows
        camera={{
          position: [0, 15, 13],
          fov: 46,
          near: 0.1,
          far: 100,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <color attach="background" args={["#080b12"]} />
        <fog attach="fog" args={["#080b12", 18, 42]} />

        <Lighting />

        <Physics gravity={[0, -20, 0]}>
          <Arena />
          <PlayerPlaceholder runtimeRef={runtimeRef} />
        </Physics>

        {/* Gameplay Simulation Systems */}
        <EnemyManager runtimeRef={runtimeRef} />
        <CombatManager runtimeRef={runtimeRef} />
        <PickupManager runtimeRef={runtimeRef} />

        {/* Smooth camera follow controller */}
        <CameraController runtimeRef={runtimeRef} />

        {/* Throttled 1Hz timer updater */}
        <SimulationTimer runtimeRef={runtimeRef} />
      </Canvas>
    </div>
  );
};
