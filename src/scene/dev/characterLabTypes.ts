import type * as THREE from "three";

export const DEFAULT_ASSET_PATH = "/assets/characters/tank-v2.glb";
export const STANDARD_CLIPS = ["Idle", "Run", "Attack", "Hit", "Death"];
export const DUMMY_CLIPS = ["Idle", "Run", "Attack", "Hit", "Death"];

export type CameraPreset = "isometric" | "front" | "side" | "back" | "free";

export interface ModelTelemetry {
  width: number;
  height: number;
  depth: number;
  minY: number;
  maxY: number;
  feetMinY: number;
  meshCount: number;
  clipCount: number;
  vertexCount: number;
  triangleCount: number;
}

export interface LoadedGLBData {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}
