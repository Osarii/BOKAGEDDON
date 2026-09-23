import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ASSETS } from "../config/assets";
import { useGameStore } from "../store/gameStore";

const RIFT_MODEL_URL = ASSETS.models.rift;
const RIFT_VISUAL_SCALE = 1.0;
// Rapier capsule bottom is at -0.88m relative to actor origin.
// Placing RIFT at -0.88m positions its root at floor level,
// allowing its authored floating shards (Y=0.185m) to hover gracefully above the floor deck.
const RIFT_GROUND_OFFSET = -0.88;
type ClipName = "Idle" | "Run" | "Attack" | "Hit" | "Death";

export interface RiftMotion {
  phase: "idle" | "movement" | "anticipation" | "release" | "recovery";
  moving: boolean;
  speed: number;
  attackDuration: number;
  hitSerial: number;
  slowed: boolean;
}

export function RiftModel({ motionRef }: { motionRef: React.RefObject<RiftMotion> }) {
  const { scene, animations } = useGLTF(RIFT_MODEL_URL);
  const { model, materials } = useMemo(() => {
    const model = scene.clone(true);
    const materialCopies = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (!(object.material instanceof THREE.MeshStandardMaterial)) return;
      let copy = materialCopies.get(object.material);
      if (!copy) {
        copy = object.material.clone();
        copy.userData.baseEmissive = copy.emissive.clone();
        copy.userData.baseIntensity = copy.emissiveIntensity;
        materialCopies.set(object.material, copy);
      }
      object.material = copy;
    });
    return { model, materials: [...materialCopies.values()] };
  }, [scene]);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Partial<Record<ClipName, THREE.AnimationAction>>>({});
  const modelRef = useRef<THREE.Object3D>(null);
  const activeRef = useRef<ClipName>("Idle");
  const previousPhaseRef = useRef<RiftMotion["phase"]>("idle");
  const hitSerialRef = useRef(0);
  const flashTimerRef = useRef(0);
  const tintRef = useRef("normal");

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(
      animations.map((clip) => [clip.name, mixer.clipAction(clip)])
    ) as Partial<Record<ClipName, THREE.AnimationAction>>;
    mixerRef.current = mixer;
    actionsRef.current = actions;
    actions.Idle?.play();
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      mixerRef.current = null;
      actionsRef.current = {};
      materials.forEach((material) => material.dispose());
    };
  }, [animations, model, materials]);

  const play = (name: ClipName, once = false, restart = false) => {
    const actions = actionsRef.current;
    if (name === "Death" && activeRef.current === "Death") return;
    const next = actions[name];
    if (!next) return;
    if (activeRef.current === name && next.isRunning() && !restart) return;
    if (activeRef.current !== name) actions[activeRef.current]?.fadeOut(0.1);
    next.reset().fadeIn(0.1);
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.play();
    activeRef.current = name;
  };

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (!mixer) return;
    const status = useGameStore.getState().gameStatus;
    if (status === "gameover") {
      play("Death", true);
      mixer.update(delta);
      return;
    }
    if (status !== "playing") return;

    const actions = actionsRef.current;
    const motion = motionRef.current;
    // Dynamic hover speed scaling during Run (hover locomotion)
    actions.Run?.setEffectiveTimeScale(Math.max(0.7, motion.speed / 2.8));
    flashTimerRef.current = Math.max(0, flashTimerRef.current - delta);
    if (motion.hitSerial !== hitSerialRef.current) {
      hitSerialRef.current = motion.hitSerial;
      flashTimerRef.current = 0.18;
      play("Hit", true, true);
    } else {
      const attackStarted =
        (motion.phase === "anticipation" && previousPhaseRef.current !== "anticipation") ||
        (motion.phase === "release" &&
          previousPhaseRef.current !== "anticipation" &&
          previousPhaseRef.current !== "release");
      if (attackStarted) {
        actions.Attack?.setDuration(motion.attackDuration);
        play("Attack", true, true);
      } else if (
        (activeRef.current !== "Hit" && activeRef.current !== "Attack") ||
        !actions[activeRef.current]?.isRunning()
      ) {
        play(motion.moving ? "Run" : "Idle");
      }
    }
    previousPhaseRef.current = motion.phase;

    const tint = flashTimerRef.current > 0 ? "hit" : motion.slowed ? "frost" : "normal";
    if (tint !== tintRef.current) {
      tintRef.current = tint;
      modelRef.current?.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
        const material = object.material;
        if (tint === "normal") material.emissive.copy(material.userData.baseEmissive);
        else material.emissive.set(tint === "hit" ? "#ffffff" : "#38bdf8");
        material.emissiveIntensity =
          tint === "normal" ? material.userData.baseIntensity : tint === "hit" ? 0.8 : 0.35;
      });
    }
    mixer.update(delta);
  });

  return (
    <group position={[0, RIFT_GROUND_OFFSET, 0]}>
      <primitive ref={modelRef} object={model} scale={RIFT_VISUAL_SCALE} />
      {/* Ground Dimensional Contact Shadow — visually grounds the floating character */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]} renderOrder={1}>
        <planeGeometry args={[1.8, 1.8]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader="varying vec2 uv0; void main(){uv0=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
          fragmentShader="varying vec2 uv0; void main(){float r=length((uv0-.5)*2.0); gl_FragColor=vec4(0.0,0.0,0.0,0.42*(1.0-smoothstep(0.1,1.0,r)));}"
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(RIFT_MODEL_URL);
