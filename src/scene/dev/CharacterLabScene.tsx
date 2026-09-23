import React, { useRef, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, ContactShadows, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ProceduralTestDummy } from "./ProceduralTestDummy";
import {
  DUMMY_CLIPS,
  type ModelTelemetry,
  type CameraPreset,
  type LoadedGLBData,
} from "./characterLabTypes";

interface CharacterLabSceneProps {
  modelData: LoadedGLBData | null;
  useDummy: boolean;
  activeClip: string;
  isPlaying: boolean;
  animSpeed: number;
  animTime: number;
  modelScale: number;
  visualYOffset: number;
  rotationY: number;
  autoRotate: boolean;
  cameraPreset: CameraPreset;
  showGrid: boolean;
  showOrigin: boolean;
  showBoundingBox: boolean;
  showGroundingLine: boolean;
  showShadows: boolean;
  onTelemetryUpdate: (telemetry: ModelTelemetry) => void;
  onTimeUpdate: (time: number, duration: number) => void;
  onCameraMovedToFree: () => void;
}

// Camera director handling presets and OrbitControls
const CameraDirector: React.FC<{
  cameraPreset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onCameraMovedToFree: () => void;
}> = ({ cameraPreset, controlsRef, onCameraMovedToFree }) => {
  const { camera } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const targetLook = useRef<THREE.Vector3 | null>(null);
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    if (cameraPreset === "free") return;

    let pos: [number, number, number];
    let look: [number, number, number];

    switch (cameraPreset) {
      case "isometric":
        pos = [3.4, 3.2, 3.4];
        look = [0, 1.0, 0];
        break;
      case "front":
        pos = [0, 1.15, 3.8];
        look = [0, 1.15, 0];
        break;
      case "side":
        pos = [3.8, 1.15, 0];
        look = [0, 1.15, 0];
        break;
      case "back":
        pos = [0, 1.15, -3.8];
        look = [0, 1.15, 0];
        break;
      default:
        return;
    }

    targetPos.current = new THREE.Vector3(...pos);
    targetLook.current = new THREE.Vector3(...look);
    isTransitioning.current = true;
  }, [cameraPreset]);

  useFrame((_, delta) => {
    if (!isTransitioning.current || !targetPos.current || !targetLook.current) return;

    const lerpFactor = Math.min(1, delta * 8);
    camera.position.lerp(targetPos.current, lerpFactor);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, lerpFactor);
      controlsRef.current.update();
    }

    if (camera.position.distanceTo(targetPos.current) < 0.02) {
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLook.current);
        controlsRef.current.update();
      }
      isTransitioning.current = false;
      targetPos.current = null;
      targetLook.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.5}
      maxDistance={25}
      maxPolarAngle={Math.PI / 2 + 0.12} // Allow inspecting feet soles
      onStart={() => {
        if (isTransitioning.current) isTransitioning.current = false;
        if (cameraPreset !== "free") {
          onCameraMovedToFree();
        }
      }}
    />
  );
};

// Ground stage visuals: floor disk, Y=0 horizon ring, and grid
const GroundStage: React.FC<{
  showGrid: boolean;
  showOrigin: boolean;
  showHorizonRing: boolean;
}> = React.memo(({ showGrid, showOrigin, showHorizonRing }) => {
  return (
    <group name="GroundStage">
      {/* Dark metallic floor disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial
          color="#060c18"
          roughness={0.65}
          metalness={0.4}
        />
      </mesh>

      {/* Outer border rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <ringGeometry args={[11.8, 12, 64]} />
        <meshBasicMaterial color="#00e5ff" opacity={0.25} transparent />
      </mesh>

      {/* Horizon Y=0 reference ring */}
      {showHorizonRing && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[1.78, 1.82, 64]} />
          <meshBasicMaterial color="#00e5ff" opacity={0.5} transparent />
        </mesh>
      )}

      {/* Measurement Grid on Y=0 */}
      {showGrid && (
        <Grid
          position={[0, 0, 0]}
          args={[20, 20]}
          cellSize={0.25}
          cellThickness={0.7}
          cellColor="#172554"
          sectionSize={1.0}
          sectionThickness={1.4}
          sectionColor="#00e5ff"
          fadeDistance={18}
          fadeStrength={1.5}
        />
      )}

      {/* Root / Origin Coordinate Gizmo */}
      {showOrigin && (
        <group position={[0, 0.002, 0]} name="OriginGizmo">
          <mesh position={[0, 0.02, 0]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* X axis (Red) */}
          <mesh position={[0.25, 0.005, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Y axis (Green) */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5, 8]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          {/* Z axis (Blue) */}
          <mesh position={[0, 0.005, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.5, 8]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>
      )}
    </group>
  );
});

GroundStage.displayName = "GroundStage";

// Grounding Distance Indicator (3D vertical line + metric callout when feetMinY != 0)
const GroundingDistanceHelper: React.FC<{
  feetMinY: number;
  visible: boolean;
}> = ({ feetMinY, visible }) => {
  if (!visible || Math.abs(feetMinY) < 0.008) return null;

  const isFloating = feetMinY > 0;
  const color = isFloating ? "#f59e0b" : "#ef4444";
  const height = Math.abs(feetMinY);
  const midY = feetMinY / 2;

  return (
    <group position={[0.45, 0, 0]} name="GroundingDistanceHelper">
      <mesh position={[0, midY, 0]}>
        <cylinderGeometry args={[0.006, 0.006, height, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[0, feetMinY, 0]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0.1, midY, 0]} center>
        <div
          className="grounding-distance-label"
          style={{ borderColor: color, color: color }}
        >
          {isFloating ? `+${(feetMinY * 100).toFixed(1)} cm` : `${(feetMinY * 100).toFixed(1)} cm`}
        </div>
      </Html>
    </group>
  );
};

// Model Content Host: Clones GLTF once per loaded asset, caches AnimationMixer actions, and drives frame updates
const ModelHost: React.FC<{
  modelData: LoadedGLBData | null;
  useDummy: boolean;
  activeClip: string;
  isPlaying: boolean;
  animSpeed: number;
  animTime: number;
  modelScale: number;
  visualYOffset: number;
  rotationY: number;
  autoRotate: boolean;
  showBoundingBox: boolean;
  showGroundingLine: boolean;
  onTelemetryUpdate: (telemetry: ModelTelemetry) => void;
  onTimeUpdate: (time: number, duration: number) => void;
}> = ({
  modelData,
  useDummy,
  activeClip,
  isPlaying,
  animSpeed,
  animTime,
  modelScale,
  visualYOffset,
  rotationY,
  autoRotate,
  showBoundingBox,
  showGroundingLine,
  onTelemetryUpdate,
  onTimeUpdate,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const boxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const activeClipNameRef = useRef<string>("");
  const lastTelemetryTick = useRef<number>(0);
  const lastTimeTick = useRef<number>(0);
  const box3 = useMemo(() => new THREE.Box3(), []);
  const sizeVec = useMemo(() => new THREE.Vector3(), []);
  const [feetMinY, setFeetMinY] = useState<number>(0);

  // 1. Process GLB model ONLY when modelData or useDummy changes
  const clonedScene = useMemo(() => {
    if (!modelData || useDummy) return null;

    const clone = modelData.scene.clone(true);
    let meshCount = 0;
    let vertexCount = 0;
    let triangleCount = 0;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshCount++;

        const geometry = mesh.geometry;
        if (geometry) {
          const pos = geometry.attributes.position;
          if (pos) vertexCount += pos.count;
          if (geometry.index) {
            triangleCount += geometry.index.count / 3;
          } else if (pos) {
            triangleCount += pos.count / 3;
          }
        }
      }
    });

    return {
      scene: clone,
      meshCount,
      vertexCount,
      triangleCount,
      clips: modelData.animations,
    };
  }, [modelData, useDummy]);

  // 2. Setup AnimationMixer and Action Cache ONCE per clonedScene
  useEffect(() => {
    if (!clonedScene) {
      mixerRef.current = null;
      actionsRef.current = {};
      activeActionRef.current = null;
      activeClipNameRef.current = "";
      return;
    }

    const mixer = new THREE.AnimationMixer(clonedScene.scene);
    const actions: Record<string, THREE.AnimationAction> = {};

    for (const clip of clonedScene.clips) {
      actions[clip.name] = mixer.clipAction(clip);
    }

    mixerRef.current = mixer;
    actionsRef.current = actions;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(clonedScene.scene);
      mixerRef.current = null;
      actionsRef.current = {};
      activeActionRef.current = null;
      activeClipNameRef.current = "";
    };
  }, [clonedScene]); // ONLY clonedScene!

  // 3. Switch active clip: ONLY crossfade actions without recreating mixer
  useEffect(() => {
    const mixer = mixerRef.current;
    const actions = actionsRef.current;
    if (!mixer || !actions || !clonedScene) return;

    const targetName =
      Object.keys(actions).find((k) => k.toLowerCase() === activeClip.toLowerCase()) ||
      Object.keys(actions).find((k) => k.toLowerCase().includes(activeClip.toLowerCase())) ||
      Object.keys(actions)[0];

    if (!targetName || !actions[targetName]) return;
    if (targetName === activeClipNameRef.current && activeActionRef.current?.isRunning()) return;

    const nextAction = actions[targetName];
    const prevAction = activeActionRef.current;

    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(0.15);
    }

    nextAction.reset().fadeIn(0.15).play();
    activeActionRef.current = nextAction;
    activeClipNameRef.current = targetName;
    onTimeUpdate(0, nextAction.getClip().duration);
  }, [activeClip, clonedScene, onTimeUpdate]);

  // 4. Scrubbing when paused
  useEffect(() => {
    if (isPlaying) return;
    const action = activeActionRef.current;
    const mixer = mixerRef.current;
    if (!action || !mixer) return;

    action.time = animTime;
    mixer.update(0);
  }, [animTime, isPlaying]);

  // 5. High-frequency frame simulation loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Auto rotate (pure Three.js property mutation)
    if (autoRotate) {
      groupRef.current.rotation.y += delta * 0.8;
    }

    // Mixer update (pure Three.js simulation)
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta * animSpeed);
    }

    const now = performance.now();

    // Throttle playback time update to ~5 Hz (every 200ms)
    if (isPlaying && now - lastTimeTick.current >= 200) {
      lastTimeTick.current = now;
      if (activeActionRef.current) {
        const clip = activeActionRef.current.getClip();
        onTimeUpdate(activeActionRef.current.time % clip.duration, clip.duration);
      } else if (useDummy) {
        onTimeUpdate((Date.now() / 1000 * animSpeed) % 2.0, 2.0);
      }
    }

    // Throttle telemetry update to ~6 Hz (every 160ms) using fast bounds
    if (now - lastTelemetryTick.current >= 160) {
      lastTelemetryTick.current = now;

      box3.setFromObject(groupRef.current, false);
      box3.getSize(sizeVec);

      const minY = box3.min.y;
      const maxY = box3.max.y;
      const currentFeet = Math.round(minY * 1000) / 1000;

      // Update visual grounding line state only if delta exceeds 3mm
      if (Math.abs(feetMinY - currentFeet) > 0.003) {
        setFeetMinY(currentFeet);
      }

      const meshCount = clonedScene ? clonedScene.meshCount : 12;
      const clipCount = clonedScene ? clonedScene.clips.length : DUMMY_CLIPS.length;
      const vertexCount = clonedScene ? clonedScene.vertexCount : 1420;
      const triangleCount = clonedScene ? clonedScene.triangleCount : 1180;

      onTelemetryUpdate({
        width: Math.round(sizeVec.x * 1000) / 1000,
        height: Math.round(sizeVec.y * 1000) / 1000,
        depth: Math.round(sizeVec.z * 1000) / 1000,
        minY: Math.round(minY * 1000) / 1000,
        maxY: Math.round(maxY * 1000) / 1000,
        feetMinY: currentFeet,
        meshCount,
        clipCount,
        vertexCount,
        triangleCount,
      });

      if (boxHelperRef.current) {
        boxHelperRef.current.box.copy(box3);
      }
    }
  });

  const radY = (rotationY * Math.PI) / 180;

  return (
    <>
      <group
        ref={groupRef}
        position={[0, visualYOffset, 0]}
        rotation={[0, radY, 0]}
        scale={[modelScale, modelScale, modelScale]}
        name="ModelTransformRoot"
      >
        {useDummy ? (
          <ProceduralTestDummy
            activeClip={activeClip}
            isPlaying={isPlaying}
            animSpeed={animSpeed}
            animTime={animTime}
          />
        ) : clonedScene ? (
          <primitive object={clonedScene.scene} />
        ) : null}
      </group>

      {/* Wireframe Bounding Box Helper */}
      {showBoundingBox && (
        <box3Helper
          ref={boxHelperRef}
          args={[box3, new THREE.Color("#00e5ff")]}
        />
      )}

      {/* Grounding vertical distance indicator */}
      <GroundingDistanceHelper
        feetMinY={feetMinY}
        visible={showGroundingLine}
      />
    </>
  );
};

export const CharacterLabScene: React.FC<CharacterLabSceneProps> = React.memo(({
  modelData,
  useDummy,
  activeClip,
  isPlaying,
  animSpeed,
  animTime,
  modelScale,
  visualYOffset,
  rotationY,
  autoRotate,
  cameraPreset,
  showGrid,
  showOrigin,
  showBoundingBox,
  showGroundingLine,
  showShadows,
  onTelemetryUpdate,
  onTimeUpdate,
  onCameraMovedToFree,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      shadows
      camera={{ position: [3.4, 3.2, 3.4], fov: 42, near: 0.1, far: 80 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
    >
      <color attach="background" args={["#030712"]} />

      {/* Ambient & Hemisphere Lighting */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#7dd3fc", "#030712", 0.4]} />

      {/* Key Light (warm directional, casts shadow) */}
      <directionalLight
        position={[4, 6.5, 4.5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Fill Light (cool directional, opposite angle) */}
      <directionalLight
        position={[-4.5, 3.5, -2.5]}
        intensity={0.65}
        color="#bae6fd"
      />

      {/* Rim / Back Light (cyberpunk cyan accent) */}
      <directionalLight
        position={[0, 5, -5.5]}
        intensity={1.0}
        color="#00e5ff"
      />

      {/* Ground plane, Grid, Origin Gizmo */}
      <GroundStage
        showGrid={showGrid}
        showOrigin={showOrigin}
        showHorizonRing={showGroundingLine}
      />

      {/* Contact Shadows beneath the model */}
      {showShadows && (
        <ContactShadows
          position={[0, -0.001, 0]}
          opacity={0.7}
          scale={5}
          blur={1.4}
          far={2.5}
          color="#000000"
        />
      )}

      {/* Model renderer, animator, and grounding diagnostics */}
      <ModelHost
        modelData={modelData}
        useDummy={useDummy}
        activeClip={activeClip}
        isPlaying={isPlaying}
        animSpeed={animSpeed}
        animTime={animTime}
        modelScale={modelScale}
        visualYOffset={visualYOffset}
        rotationY={rotationY}
        autoRotate={autoRotate}
        showBoundingBox={showBoundingBox}
        showGroundingLine={showGroundingLine}
        onTelemetryUpdate={onTelemetryUpdate}
        onTimeUpdate={onTimeUpdate}
      />

      {/* Camera Presets & Interactive Orbit Controls */}
      <CameraDirector
        cameraPreset={cameraPreset}
        controlsRef={controlsRef}
        onCameraMovedToFree={onCameraMovedToFree}
      />
    </Canvas>
  );
});

CharacterLabScene.displayName = "CharacterLabScene";
