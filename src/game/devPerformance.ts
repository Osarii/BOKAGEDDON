import type * as THREE from "three";
import type { GameRuntime } from "./runtime";
import { isBossType } from "./progression";
import { spawnNormalEnemies } from "./devTools";

export interface PerformanceSnapshot {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  onePercentLowFps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  enemies: number;
  projectiles: number;
  pickups: number;
  particles: number;
  dpr: number;
  memoryMb: number | null;
  timestamp: number;
}

export interface ScenarioSample {
  dtMs: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  enemies: number;
  projectiles: number;
  pickups: number;
  particles: number;
  dpr: number;
  memoryMb: number | null;
}

export interface BenchmarkOptions {
  targetEnemies?: number;
  onEvent?: (runtime: GameRuntime) => void;
  eventDelayMs?: number;
}

export interface ScenarioReport {
  scenarioName: string;
  durationMs: number;
  sampleCount: number;
  avgFps: number;
  onePercentLowFps: number;
  minFps: number;
  maxFps: number;
  avgFrameTimeMs: number;
  maxFrameTimeMs: number;
  eventHitchMs?: number;
  drawCallsAvg: number;
  trianglesAvg: number;
  geometries: number;
  textures: number;
  targetEnemies: number;
  enemiesAvg: number;
  enemiesMin: number;
  enemiesMax: number;
  projectilesAvg: number;
  pickupsAvg: number;
  particlesAvg: number;
  dpr: number;
  memoryMb: number | null;
  timestamp: string;
}

// 120-frame rolling window for real-time display
const BUFFER_SIZE = 120;
const frameDeltasMs: number[] = [];
let bufferIndex = 0;
let lastPerfNow = 0;

const currentSnapshot: PerformanceSnapshot = {
  fps: 60,
  avgFps: 60,
  frameTimeMs: 16.6,
  onePercentLowFps: 60,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  enemies: 0,
  projectiles: 0,
  pickups: 0,
  particles: 0,
  dpr: 1,
  memoryMb: null,
  timestamp: 0,
};

// Benchmark recorder state
interface ActiveBenchmark {
  scenarioName: string;
  targetDurationMs: number;
  startTime: number;
  targetEnemies?: number;
  onEvent?: (runtime: GameRuntime) => void;
  eventDelayMs?: number;
  eventTriggered?: boolean;
  eventSampleIndex?: number;
  eventHitchMs?: number;
  samples: ScenarioSample[];
  resolve: (report: ScenarioReport) => void;
}

let activeBenchmark: ActiveBenchmark | null = null;
let lastScenarioReport: ScenarioReport | null = null;
const allScenarioReports: ScenarioReport[] = [];

export function updatePerformanceFrame(
  renderer: THREE.WebGLRenderer,
  runtime: GameRuntime | null,
  delta: number
): void {
  const now = performance.now();
  let dtMs = delta * 1000;
  if (lastPerfNow > 0) {
    const measuredDt = now - lastPerfNow;
    if (measuredDt > 0 && measuredDt < 1000) {
      dtMs = measuredDt;
    }
  }
  lastPerfNow = now;

  // Update ring buffer
  if (frameDeltasMs.length < BUFFER_SIZE) {
    frameDeltasMs.push(dtMs);
  } else {
    frameDeltasMs[bufferIndex] = dtMs;
    bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;
  }

  // Calculate stats from buffer
  const sampleCount = frameDeltasMs.length;
  let sumDt = 0;
  for (let i = 0; i < sampleCount; i++) {
    sumDt += frameDeltasMs[i];
  }
  const avgFrameTimeMs = sampleCount > 0 ? sumDt / sampleCount : 16.6;
  const avgFps = avgFrameTimeMs > 0 ? 1000 / avgFrameTimeMs : 60;
  const currentFps = dtMs > 0 ? 1000 / dtMs : 60;

  // 1% Low FPS: sort deltas ascending. The 99th percentile frame time corresponds to 1% low FPS.
  const sorted = [...frameDeltasMs].sort((a, b) => a - b);
  const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
  const p99FrameTime = sorted[p99Index] || avgFrameTimeMs;
  const onePercentLowFps = p99FrameTime > 0 ? 1000 / p99FrameTime : currentFps;

  // Renderer info
  const info = renderer.info;
  const drawCalls = info.render.calls;
  const triangles = info.render.triangles;
  const geometries = info.memory.geometries;
  const textures = info.memory.textures;
  const dpr = renderer.getPixelRatio();

  // Runtime counts
  const enemies = runtime ? runtime.enemies.length : 0;
  const projectiles = runtime ? runtime.projectiles.length : 0;
  const pickups = runtime ? runtime.pickups.length : 0;
  const particles = runtime ? runtime.particles.length : 0;

  // Memory (Chrome/Blink API if supported)
  const perfAny = performance as unknown as { memory?: { usedJSHeapSize?: number } };
  const memoryMb = perfAny.memory?.usedJSHeapSize
    ? Math.round((perfAny.memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10
    : null;

  // Update singleton snapshot
  currentSnapshot.fps = Math.round(currentFps);
  currentSnapshot.avgFps = Math.round(avgFps * 10) / 10;
  currentSnapshot.frameTimeMs = Math.round(avgFrameTimeMs * 10) / 10;
  currentSnapshot.onePercentLowFps = Math.round(onePercentLowFps * 10) / 10;
  currentSnapshot.drawCalls = drawCalls;
  currentSnapshot.triangles = triangles;
  currentSnapshot.geometries = geometries;
  currentSnapshot.textures = textures;
  currentSnapshot.enemies = enemies;
  currentSnapshot.projectiles = projectiles;
  currentSnapshot.pickups = pickups;
  currentSnapshot.particles = particles;
  currentSnapshot.dpr = dpr;
  currentSnapshot.memoryMb = memoryMb;
  currentSnapshot.timestamp = now;

  // Handle active benchmark recording
  if (activeBenchmark) {
    const elapsed = now - activeBenchmark.startTime;

    // Trigger scheduled mid-benchmark event (e.g. Frenzy activation or Boss spawn)
    if (
      activeBenchmark.onEvent &&
      !activeBenchmark.eventTriggered &&
      runtime &&
      elapsed >= (activeBenchmark.eventDelayMs ?? 1000)
    ) {
      activeBenchmark.eventTriggered = true;
      activeBenchmark.eventSampleIndex = activeBenchmark.samples.length;
      activeBenchmark.onEvent(runtime);
    } else if (
      activeBenchmark.eventSampleIndex != null &&
      activeBenchmark.samples.length === activeBenchmark.eventSampleIndex + 1 &&
      activeBenchmark.eventHitchMs == null
    ) {
      // The frame delta immediately reflecting the event execution
      activeBenchmark.eventHitchMs = Math.round(dtMs * 100) / 100;
    }

    // Benchmark load stabilizer: maintain target normal enemy count throughout measurement
    if (activeBenchmark.targetEnemies != null && activeBenchmark.targetEnemies > 0 && runtime) {
      const normalEnemies = runtime.enemies.filter((e) => !isBossType(e.type)).length;
      const deficit = activeBenchmark.targetEnemies - normalEnemies;
      if (deficit > 0) {
        spawnNormalEnemies(runtime, deficit, true);
      }
    }

    activeBenchmark.samples.push({
      dtMs,
      fps: currentFps,
      drawCalls,
      triangles,
      geometries,
      textures,
      enemies,
      projectiles,
      pickups,
      particles,
      dpr,
      memoryMb,
    });

    if (now - activeBenchmark.startTime >= activeBenchmark.targetDurationMs) {
      const b = activeBenchmark;
      activeBenchmark = null;
      const report = finalizeBenchmark(b);
      lastScenarioReport = report;
      allScenarioReports.push(report);
      b.resolve(report);
    }
  }
}

function finalizeBenchmark(b: ActiveBenchmark): ScenarioReport {
  const samples = b.samples;
  const count = samples.length;
  if (count === 0) {
    return {
      scenarioName: b.scenarioName,
      durationMs: 0,
      sampleCount: 0,
      avgFps: 60,
      onePercentLowFps: 60,
      minFps: 60,
      maxFps: 60,
      avgFrameTimeMs: 16.6,
      maxFrameTimeMs: 16.6,
      drawCallsAvg: 0,
      trianglesAvg: 0,
      geometries: 0,
      textures: 0,
      targetEnemies: b.targetEnemies ?? 0,
      enemiesAvg: 0,
      enemiesMin: 0,
      enemiesMax: 0,
      projectilesAvg: 0,
      pickupsAvg: 0,
      particlesAvg: 0,
      dpr: 1,
      memoryMb: null,
      timestamp: new Date().toISOString(),
    };
  }

  let totalDt = 0;
  let maxDt = 0;
  let minFps = Infinity;
  let maxFps = 0;
  let totalCalls = 0;
  let totalTriangles = 0;
  let totalEnemies = 0;
  let minEnemies = Infinity;
  let maxEnemies = 0;
  let totalProjectiles = 0;
  let totalPickups = 0;
  let totalParticles = 0;
  const dts: number[] = [];

  for (const s of samples) {
    totalDt += s.dtMs;
    dts.push(s.dtMs);
    if (s.dtMs > maxDt) maxDt = s.dtMs;
    if (s.fps < minFps) minFps = s.fps;
    if (s.fps > maxFps) maxFps = s.fps;
    totalCalls += s.drawCalls;
    totalTriangles += s.triangles;
    totalEnemies += s.enemies;
    if (s.enemies < minEnemies) minEnemies = s.enemies;
    if (s.enemies > maxEnemies) maxEnemies = s.enemies;
    totalProjectiles += s.projectiles;
    totalPickups += s.pickups;
    totalParticles += s.particles;
  }

  const avgFrameTimeMs = totalDt / count;
  const avgFps = totalDt > 0 ? (count / totalDt) * 1000 : 60;

  // 1% Low frame time
  dts.sort((a, b) => a - b);
  const p99Index = Math.min(dts.length - 1, Math.floor(dts.length * 0.99));
  const p99Dt = dts[p99Index] || avgFrameTimeMs;
  const onePercentLowFps = p99Dt > 0 ? 1000 / p99Dt : avgFps;

  const lastSample = samples[count - 1];

  return {
    scenarioName: b.scenarioName,
    durationMs: Math.round(totalDt),
    sampleCount: count,
    avgFps: Math.round(avgFps * 10) / 10,
    onePercentLowFps: Math.round(onePercentLowFps * 10) / 10,
    minFps: Math.round(minFps * 10) / 10,
    maxFps: Math.round(maxFps * 10) / 10,
    avgFrameTimeMs: Math.round(avgFrameTimeMs * 100) / 100,
    maxFrameTimeMs: Math.round(maxDt * 100) / 100,
    drawCallsAvg: Math.round(totalCalls / count),
    trianglesAvg: Math.round(totalTriangles / count),
    geometries: lastSample.geometries,
    textures: lastSample.textures,
    targetEnemies: b.targetEnemies ?? 0,
    enemiesAvg: Math.round((totalEnemies / count) * 10) / 10,
    enemiesMin: minEnemies === Infinity ? 0 : minEnemies,
    enemiesMax: maxEnemies,
    eventHitchMs: b.eventHitchMs,
    projectilesAvg: Math.round(totalProjectiles / count),
    pickupsAvg: Math.round(totalPickups / count),
    particlesAvg: Math.round(totalParticles / count),
    dpr: lastSample.dpr,
    memoryMb: lastSample.memoryMb,
    timestamp: new Date().toISOString(),
  };
}

export function getPerformanceSnapshot(): PerformanceSnapshot {
  return currentSnapshot;
}

export function startScenarioBenchmark(
  scenarioName: string,
  durationSec = 3,
  options?: BenchmarkOptions
): Promise<ScenarioReport> {
  return new Promise((resolve) => {
    activeBenchmark = {
      scenarioName,
      targetDurationMs: durationSec * 1000,
      startTime: performance.now(),
      targetEnemies: options?.targetEnemies,
      onEvent: options?.onEvent,
      eventDelayMs: options?.eventDelayMs,
      samples: [],
      resolve,
    };
  });
}

export function getActiveBenchmarkStatus(): { isRunning: boolean; scenarioName?: string } {
  return {
    isRunning: Boolean(activeBenchmark),
    scenarioName: activeBenchmark?.scenarioName,
  };
}

export function getLastScenarioReport(): ScenarioReport | null {
  return lastScenarioReport;
}

export function getAllScenarioReports(): ScenarioReport[] {
  return allScenarioReports;
}

export function clearScenarioReports(): void {
  allScenarioReports.length = 0;
  lastScenarioReport = null;
}

// Global hook in DEV mode
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __BONK_PERF__: unknown }).__BONK_PERF__ = {
    getSnapshot: getPerformanceSnapshot,
    startBenchmark: startScenarioBenchmark,
    getLastReport: getLastScenarioReport,
    getAllReports: getAllScenarioReports,
    clearReports: clearScenarioReports,
  };
}
