import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime, StatusParticle } from "../game/runtime";
import { useGameStore } from "../store/gameStore";

interface StatusParticleManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const MAX_PARTICLES = 250;

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempColor = new THREE.Color();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

export const StatusParticleManager: React.FC<StatusParticleManagerProps> = ({ runtimeRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Lightweight geometric particle mesh (octahedron)
  const particleGeometry = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(0.12, 0);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }, []);

  const particleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.9,
      }),
    []
  );

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.count = 0;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        meshRef.current.setMatrixAt(i, hiddenMatrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const gameStatus = useGameStore.getState().gameStatus;
    // Particles freeze when gameplay is paused or in levelup modal
    if (gameStatus !== "playing") return;

    // 1. Simulation loop: move and decay particles
    for (let i = runtime.particles.length - 1; i >= 0; i--) {
      const p = runtime.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        runtime.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      // Particle specific kinematics
      if (p.type === "burn") {
        p.vy += delta * 1.8; // Rising embers
        p.vx *= 0.98;
        p.vz *= 0.98;
      } else if (p.type === "poison") {
        p.vy += delta * 0.4; // Slowly floating bubbles
        p.vx += Math.sin(p.life * 10) * delta * 0.5;
      } else if (p.type === "hit" || p.type === "frost") {
        p.vy -= delta * 4.5; // Gravity drop
      } else if (p.type === "shock") {
        p.vx += (Math.random() - 0.5) * delta * 6;
        p.vz += (Math.random() - 0.5) * delta * 6;
      }
    }

    // 2. Instanced mesh rendering
    if (meshRef.current) {
      const activeCount = Math.min(runtime.particles.length, MAX_PARTICLES);
      meshRef.current.count = activeCount;

      for (let i = 0; i < activeCount; i++) {
        const p: StatusParticle = runtime.particles[i];
        const remaining = Math.max(0, 1 - p.life / p.maxLife);
        const scaleFactor = p.size * remaining;

        tempPosition.set(p.x, Math.max(0.1, p.y), p.z);
        tempScale.set(scaleFactor, scaleFactor, scaleFactor);
        tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z);
        tempMatrix.scale(tempScale);

        meshRef.current.setMatrixAt(i, tempMatrix);
        tempColor.set(p.color);
        meshRef.current.setColorAt(i, tempColor);
      }

      if (activeCount > 0) {
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
          meshRef.current.instanceColor.needsUpdate = true;
        }
      }
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[particleGeometry, particleMaterial, MAX_PARTICLES]}
      frustumCulled={false}
    />
  );
};
