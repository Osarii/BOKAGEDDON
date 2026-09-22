import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GameRuntime } from "../game/runtime";
import { useGameStore } from "../store/gameStore";

interface StatusParticleManagerProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const MAX_PARTICLES = 250;

const tempMatrix = new THREE.Matrix4();
const hiddenMatrix = new THREE.Matrix4().makeTranslation(0, -999, 0);

// Pre-cached THREE.Color instances to avoid per-frame hex string parsing in the hot loop
const COLOR_CACHE: Record<string, THREE.Color> = {};
function getCachedColor(hex: string): THREE.Color {
  let c = COLOR_CACHE[hex];
  if (!c) {
    c = new THREE.Color(hex);
    COLOR_CACHE[hex] = c;
  }
  return c;
}

export const StatusParticleManager: React.FC<StatusParticleManagerProps> = ({ runtimeRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Lightweight geometric particle mesh (octahedron)
  const particleGeometry = useMemo(() => {
    const geo = new THREE.OctahedronGeometry(0.18, 0);
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    return geo;
  }, []);

  const particleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
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

    const particles = runtime.particles;
    const pool = runtime.particlePool;

    // 1. Simulation loop: move and decay particles (O(1) swap-and-pop + pool recycling)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        // Recycle to object pool
        if (pool && pool.length < MAX_PARTICLES) {
          pool.push(p);
        }
        // O(1) swap-with-last removal to eliminate array shifting (splice overhead)
        const last = particles.pop()!;
        if (i < particles.length) {
          particles[i] = last;
        }
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

    // 2. Instanced mesh rendering with direct matrix composition
    if (meshRef.current) {
      const activeCount = Math.min(particles.length, MAX_PARTICLES);
      meshRef.current.count = activeCount;

      for (let i = 0; i < activeCount; i++) {
        const p = particles[i];
        const progress = p.life / p.maxLife;
        const remaining = 1 - progress > 0 ? 1 - progress : 0;
        const sinProg = Math.sin(progress * Math.PI);
        const pop = p.type === "shock" ? 1.25 + sinProg : 1 + sinProg * 0.55;
        const scaleFactor = p.size * 1.9 * remaining * pop;
        const finalScale = scaleFactor > 0.08 ? scaleFactor : 0.08;
        const py = p.y > 0.1 ? p.y : 0.1;

        // Direct matrix setting (replaces makeTranslation + scale matrix multiplication)
        tempMatrix.set(
          finalScale, 0, 0, p.x,
          0, finalScale, 0, py,
          0, 0, finalScale, p.z,
          0, 0, 0, 1
        );

        meshRef.current.setMatrixAt(i, tempMatrix);
        meshRef.current.setColorAt(i, getCachedColor(p.color));
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
