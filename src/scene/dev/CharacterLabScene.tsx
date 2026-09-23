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
  onClipsDetected: (clips: string[]) => void;
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
      maxPolarAngle={Math.PI / 2 + 0.12} // Allow looking slightly below the ground plane to inspect feet soles
      onStart={() => {
        if (isTransitioning.current) isTransitioning.current = false;
        onCameraMovedToFree();
      }}
    />
  );
};

// Ground and horizon visuals
const GroundStage: React.FC<{
  showGrid: boolean;
  showOrigin: boolean;
  showHorizonRing: boolean;
}> = ({ showGrid, showOrigin, showHorizonRing }) => {
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
          {/* Origin central marker */}
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
};

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
      {/* Vertical line connecting floor to lowest vertex */}
      <mesh position={[0, midY, 0]}>
        <cylinderGeometry args={[0.006, 0.006, height, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* End caps */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[0, feetMinY, 0]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Numeric callout in 3D */}
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

// Model Content Host: Clones GLTF scene or renders Procedural Dummy, handles AnimationMixer and Box3 telemetry
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
  onTelemetryUpdate: (telemetry: ModelTelemetry) => void;
  onTimeUpdate: (time: number, duration: number) => void;
  onClipsDetected: (clips: string[]) => void;
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
  onTelemetryUpdate,
  onTimeUpdate,
  onClipsDetected,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const boxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const lastTelemetryTick = useRef<number>(0);
  const box3 = useMemo(() => new THREE.Box3(), []);
  const sizeVec = useMemo(() => new THREE.Vector3(), []);

  // Process GLB model whenever modelData changes
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

    const clipNames = modelData.animations.map((a) => a.name);
    onClipsDetected(clipNames);

    return {
      scene: clone,
      meshCount,
      vertexCount,
      triangleCount,
      clips: modelData.animations,
    };
  }, [modelData, useDummy, onClipsDetected]);

  // Notify clips if using dummy
  useEffect(() => {
    if (useDummy) {
      onClipsDetected(DUMMY_CLIPS);
    }
  }, [useDummy, onClipsDetected]);

  // Setup AnimationMixer for cloned GLB
  useEffect(() => {
    if (!clonedScene) {
      mixerRef.current = null;
      currentActionRef.current = null;
      return;
    }

    const mixer = new THREE.AnimationMixer(clonedScene.scene);
    mixerRef.current = mixer;

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      currentActionRef.current = null;
    };
  }, [clonedScene]);

  // Handle active clip switching
  useEffect(() => {
    if (!mixerRef.current || !clonedScene) return;

    const clips = clonedScene.clips;
    if (clips.length === 0) return;

    // Find clip by exact or case-insensitive match
    const targetClip =
      clips.find((c) => c.name.toLowerCase() === activeClip.toLowerCase()) ||
      clips.find((c) => c.name.toLowerCase().includes(activeClip.toLowerCase())) ||
      clips[0];

    if (!targetClip) return;

    const nextAction = mixerRef.current.clipAction(targetClip);
    const prevAction = currentActionRef.current;

    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(0.2);
    }

    nextAction.reset().fadeIn(0.2).play();
    currentActionRef.current = nextAction;
    onTimeUpdate(0, targetClip.duration);
  }, [activeClip, clonedScene, onTimeUpdate]);

  // Handle Scrubbing when paused
  useEffect(() => {
    if (isPlaying || !currentActionRef.current || !mixerRef.current) return;
    currentActionRef.current.time = animTime;
    mixerRef.current.update(0);
  }, [animTime, isPlaying]);

  // Frame simulation loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Auto rotate
    if (autoRotate) {
      groupRef.current.rotation.y += delta * 0.8;
    }

    // Mixer update
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta * animSpeed);

      if (currentActionRef.current) {
        const clip = currentActionRef.current.getClip();
        onTimeUpdate(currentActionRef.current.time % clip.duration, clip.duration);
      }
    } else if (useDummy && isPlaying) {
      // Dummy has standard 2.0s loop cycle
      onTimeUpdate((Date.now() / 1000 * animSpeed) % 2.0, 2.0);
    }

    // Calculate model world bounding box and grounding metrics (throttled to ~15Hz for high performance)
    const now = performance.now();
    if (now - lastTelemetryTick.current > 66) {
      lastTelemetryTick.current = now;

      box3.setFromObject(groupRef.current, true);
      box3.getSize(sizeVec);

      const minY = box3.min.y;
      const maxY = box3.max.y;
      const feetMinY = minY;

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
        feetMinY: Math.round(feetMinY * 1000) / 1000,
        meshCount,
        clipCount,
        vertexCount,
        triangleCount,
      });

      // Update box helper wireframe
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
    </>
  );
};

export const CharacterLabScene: React.FC<CharacterLabSceneProps> = ({
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
  onClipsDetected,
  onCameraMovedToFree,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [currentFeetMinY, setCurrentFeetMinY] = useState<number>(0);

  const handleTelemetry = (t: ModelTelemetry) => {
    setCurrentFeetMinY(t.feetMinY);
    onTelemetryUpdate(t);
  };

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

      {/* Ambient Lighting */}
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

      {/* Grounding vertical distance indicator */}
      <GroundingDistanceHelper
        feetMinY={currentFeetMinY}
        visible={showGroundingLine}
      />

      {/* Model renderer & animator */}
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
        onTelemetryUpdate={handleTelemetry}
        onTimeUpdate={onTimeUpdate}
        onClipsDetected={onClipsDetected}
      />

      {/* Camera Presets & Interactive Orbit Controls */}
      <CameraDirector
        cameraPreset={cameraPreset}
        controlsRef={controlsRef}
        onCameraMovedToFree={onCameraMovedToFree}
      />
    </Canvas>
  );
};
