# BONKAGEDDON — Performance Audit V1

## 1. Executive Summary & Audit Scope

This document details the **Performance Audit V1** for BONKAGEDDON, conducted on branch `feature/performance-audit-v1`.

In strict adherence to the project contract:
- **Instrumentation & Measurement Only**: Zero optimizations have been implemented in this pass.
- **Gameplay Integrity**: Zero balance changes, stat adjustments, or mechanics modifications were introduced.
- **Dependency Guard**: Zero external dependencies were added.
- **DEV-Only Isolation**: All profiling probes and harness UI are gated by `import.meta.env.DEV` and will be tree-shaken in production.

---

## 2. Test Environment & Methodology

### 2.1 Hardware & Runtime Environment
- **Platform**: macOS Darwin (Apple Silicon MacBook Pro)
- **Browser Runtime**: Brave Browser (Chromium engine 153.0.8010.53, V8 15.3.76.13)
- **Execution Mode**: Headless Chrome DevTools Protocol (CDP) session with hardware-accelerated WebGL enabled (`--enable-webgl --ignore-gpu-blocklist`)
- **Viewport**: 1280 × 800 pixels
- **Device Pixel Ratio (DPR)**: Clamped to 1.0
- **Graphics / Physics Engine**: Three.js r170+, `@react-three/fiber` 9.0.4, `@react-three/drei` 10.7.8, `@react-three/rapier` 2.2.0

### 2.2 Instrumentation Architecture
The audit relies on a non-invasive, high-frequency probe module:
- `src/game/devPerformance.ts`: Maintains a 120-frame rolling ring buffer of exact delta timestamps (`performance.now()`), calculating instantaneous FPS, moving average FPS, average frame time (ms), and **1% Low FPS** (99th percentile slowest frame). Collects `renderer.info` counters (draw calls, triangles, geometries, textures), `GameRuntime` entity counts (enemies, projectiles, pickups, particles), and V8 heap size via `performance.memory.usedJSHeapSize`.
- `src/scene/PerformanceProbe.tsx`: Headless React component mounted inside the R3F `<Canvas>` during DEV runs. Samples the WebGL context and mutable runtime ref on every frame tick without dispatching Zustand actions or triggering React re-renders.
- `src/components/game/DevToolsOverlay.tsx`: F8 developer overlay equipped with live performance telemetry, single-click benchmark sampling, reproducible scenario presets, and an automated 8-scenario suite runner.

### 2.3 Automated Measurement Methodology
An automated Node.js CDP harness (`run_audit_headless.mjs`) was used to execute the 8 mandated reproducible scenarios:
1. Target scenario is instantiated via reproducible QA helpers.
2. A 600 ms stabilization window elapses to allow entities to spawn, physics to register, and matrices to populate.
3. High-frequency per-frame sampling commences for exactly 3,000 ms (~180 frames at 60 FPS).
4. All sample metrics are summarized into a deterministic report and written to console logs.

---

## 3. Baseline Scenario Measurements

| # | Scenario | Samples | Duration | Avg FPS | 1% Low FPS | Min FPS | Max FPS | Avg Frame Time | Max Frame Time | Draw Calls | Triangles | Geometries | Textures | Enemies (Avg) | Proj. (Avg) | Pickups (Avg) | Particles (Avg) | DPR | JS Heap |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S1** | **Normal Gameplay (Low Foes)** | 181 | 3,016 ms | **60.0** | **39.2** | 38.3 | 200.0 | 16.66 ms | 26.1 ms | 87 | 5,071 | 124 | 17 | 4 | 0 | 2 | 6 | 1.0 | 71.9 MB |
| **S2** | **Medium Pressure (~25 Foes)** | 180 | 3,016 ms | **59.7** | **38.9** | 38.5 | 153.8 | 16.76 ms | 26.0 ms | 87 | 7,257 | 124 | 17 | 16 | 2 | 8 | 19 | 1.0 | 73.8 MB |
| **S3** | **Enemy Hard-Cap Stress (~48)** | 181 | 3,016 ms | **60.0** | **41.5** | 41.3 | 116.3 | 16.66 ms | 24.2 ms | 86 | 10,248 | 124 | 17 | 32 | 4 | 14 | 38 | 1.0 | 72.8 MB |
| **S4** | **48 Foes + Frenzy Horde** | 168 | 3,018 ms | **55.7** | **12.7** | 7.2 | 212.8 | 17.96 ms | 139.7 ms | 91 | 11,794 | 124 | 17 | 37 | 3 | 5 | 57 | 1.0 | 70.1 MB |
| **S5** | **Boss Pressure (Cindermaw + 20)** | 169 | 3,017 ms | **56.0** | **34.4** | 4.5 | 333.3 | 17.85 ms | 221.3 ms | 94 | 6,937 | 135 | 18 | 14 | 2 | 7 | 17 | 1.0 | 69.0 MB |
| **S6** | **Projectile Swarm (Lux Max Upgrades)** | 124 | 3,432 ms | **36.1** | **3.6** | 1.2 | 238.1 | 27.68 ms | 854.7 ms | 56 | 6,479 | 104 | 18 | 26 | 0 | 1 | 37 | 1.0 | 67.6 MB |
| **S7** | **35+ Pickups / Relic Billboards** | 180 | 3,015 ms | **59.7** | **40.0** | 37.9 | 123.5 | 16.75 ms | 26.4 ms | 64 | 1,981 | 104 | 18 | 1 | 0 | 36 | 0 | 1.0 | 89.0 MB |
| **S8** | **Late-Game Max Upgrades + Status VFX** | 133 | 3,007 ms | **44.2** | **22.1** | 20.8 | 370.4 | 22.61 ms | 48.1 ms | 57 | 8,513 | 104 | 18 | 30 | 4 | 3 | 45 | 1.0 | 85.1 MB |

---

## 4. Scenario Breakdown & Findings

### Scenario 1 — Normal Gameplay (Low Foes)
- **Observations**: Excellent performance baseline. 60.0 FPS average, 16.66 ms frame time, and 39.2 FPS 1% low. Draw calls hold at 87 with 5,071 triangles.
- **Assessment**: The core game loop, camera follow, and base lighting operate with minimal overhead.

### Scenario 2 — Medium Pressure (~25 Foes)
- **Observations**: Stable 59.7 FPS average. Triangles scale modestly to 7,257 (+43%). Draw calls remain flat at 87 due to `InstancedMesh` enemy pooling.
- **Assessment**: Instancing prevents CPU draw call growth as horde count climbs.

### Scenario 3 — Enemy Hard-Cap Stress (~48 Foes)
- **Observations**: 60.0 FPS average maintained under 48 active enemies. Triangles reach 10,248. 1% Low is healthy at 41.5 FPS.
- **Assessment**: ADR-006 bounded cap (48 enemies) proves effective for standard enemy movement and billboard decals.

### Scenario 4 — 48 Foes + Frenzy Horde
- **Observations**: Average FPS drops slightly to 55.7 FPS, but **1% Low FPS plunges to 12.7 FPS** with a maximum frame spike of **139.7 ms**. Particles climb to 57.
- **Assessment**: The 1.35x speed boost, frenzy HP mutations, and rapid shooter projectile cooldowns in `EnemyManager.tsx` trigger sudden collision and projectile allocation bursts.

### Scenario 5 — Boss Pressure (Cindermaw + 20 Foes)
- **Observations**: Average FPS is 56.0 FPS. However, min FPS drops to 4.5 FPS and maximum frame time reaches **221.3 ms**. Geometries rise to 135 and textures to 18.
- **Assessment**: Boss introduction creates temporary initialization and shockwave/hazard pool spikes, specifically when Cindermaw triggers ground fire hazards.

### Scenario 6 — Projectile Swarm (Lux Max Upgrades) — [CRITICAL BOTTLENECK]
- **Observations**: **Severe performance degradation.** Average FPS crashes to **36.1 FPS**, 1% Low drops to **3.6 FPS**, and min FPS reaches **1.2 FPS** with a massive frame hitch of **854.7 ms**.
- **Assessment**: Lux with Haste 5, Multishot, and Solar Refraction synergy triggers a nested $O(N^2)$ enemy scan on every hit inside `CombatManager.tsx`, accompanied by unthrottled Web Audio calls and transient beam object allocations.

### Scenario 7 — 35+ Pickups / Relic Billboards
- **Observations**: 59.7 FPS average, 40.0 FPS 1% Low. Triangles remain low (1,981). Memory increases to 89.0 MB due to multiple texture billboard instances.
- **Assessment**: Pickup rendering itself is efficient; however, memory footprint grows linearly with distinct sprite textures.

### Scenario 8 — Late-Game Max Upgrades + Status VFX — [MAJOR BOTTLENECK]
- **Observations**: Average FPS drops to **44.2 FPS**, 1% Low drops to **22.1 FPS**, and average frame time stretches to **22.61 ms**. Triangles are 8,513 and particles average 45.
- **Assessment**: Simultaneous evaluation of 4 elemental DoTs (Fire burn, Poison ticks, Frost slow, Shock chain arcs) across 30+ enemies combined with unpooled particle instantiation produces heavy CPU and GC churn.

---

## 5. Technical Bottleneck Diagnosis

The following findings represent the largest confirmed bottlenecks identified during the audit:

### Finding 1: Lux Light Lance Nested $O(N^2)$ Loop & Audio Flooding
- **Classification**: CPU / Simulation & Allocation / GC
- **Evidence**: Scenario 6 suffered an 854.7 ms max frame spike, dropping average FPS to 36.1 and 1% low to 3.6 FPS.
- **Affected Scenario**: Scenario 6 (Projectile Swarm / Lux Max).
- **Likely Subsystem / File**: `src/scene/CombatManager.tsx` (lines 860–930).
- **Root Cause**:
  1. For every attack tick of Lux, an outer loop iterates over all enemies; upon a critical hit with `SolarRefraction`, an inner loop iterates over all enemies again to find the nearest second target ($O(N^2)$).
  2. With max Haste and Multishot, this fires multiple times per frame.
  3. `gameAudio.play("enemyHit")` is invoked for every individual hit without per-frame batching.
  4. `lanceBeamsRef.current` allocates new objects on every strike.
- **Optimization Opportunity**: Spatial index / grid for secondary target search, attack rate clamping, audio trigger throttling, and beam buffer pooling.
- **Risk of Changing**: Low risk to visual identity; must ensure Solar Refraction targeting logic remains accurate.

### Finding 2: Status Particle Allocation & Array Splice Thrashing
- **Classification**: Allocation / GC & CPU / Simulation
- **Evidence**: Scenarios 4, 6, and 8 display high particle activity (37–57 active particles) with noticeable frame time jitter.
- **Affected Scenarios**: Scenario 4 (Frenzy), Scenario 6 (Lux), Scenario 8 (Late-Game VFX).
- **Likely Subsystem / File**: `src/scene/StatusParticleManager.tsx` & `src/scene/CombatManager.tsx` (`applyElementalOnHit`).
- **Root Cause**:
  1. Particles are created via `runtime.particles.push({ ... })` (new object allocation per particle).
  2. Expired particles are removed using `runtime.particles.splice(i, 1)` within `useFrame`, forcing full array re-indexing on every expired entity.
  3. Embers, bubbles, sparks, and shock arcs allocate up to 250 objects per second during heavy elemental combat.
- **Optimization Opportunity**: Static particle object pool (ring buffer with active flags) eliminating both `push` and `splice`.
- **Risk of Changing**: Very low risk; internal to `StatusParticleManager`.

### Finding 3: Multi-Elemental DoT & Shock Arc Cascades
- **Classification**: CPU / Simulation
- **Evidence**: Scenario 8 degrades to 44.2 FPS with 22.61 ms frame time despite moderate enemy count (~30).
- **Affected Scenario**: Scenario 8 (Late-Game Max Upgrades).
- **Likely Subsystem / File**: `src/scene/EnemyManager.tsx` (lines 550–600) & `src/scene/CombatManager.tsx`.
- **Root Cause**:
  1. Per-frame decrement and floating-point accumulation for `burnTimer`, `poisonTimer`, `frostTimer`, and `shock`.
  2. Shock arcs trigger nested searches for nearby targets within jump distance on random chance.
- **Optimization Opportunity**: Group status effects into bitmasks or unified status structs; throttle DoT tick calculations to fixed intervals (e.g., 4 Hz instead of 60 Hz).
- **Risk of Changing**: Medium risk; damage formulas and visual feedback cadence must remain consistent.

### Finding 4: Frenzy Mode Enrage Mutation & Collision Burst
- **Classification**: CPU / Simulation & Physics
- **Evidence**: Scenario 4 experiences a severe 1% Low drop to 12.7 FPS and 139.7 ms max spike upon horde enrage.
- **Affected Scenario**: Scenario 4 (48 Foes + Frenzy Horde).
- **Likely Subsystem / File**: `src/scene/EnemyManager.tsx` (lines 355–390, 575–590, 750–785).
- **Root Cause**:
  1. Frenzy activates en-masse across up to 48 enemies, instantly mutating speed (+35%), HP (+30%), and shooter fire rates (1.5x).
  2. Increased shooter fire rates saturate `runtime.projectiles` with hostile projectiles, compounding contact collision checks.
- **Optimization Opportunity**: Stagger enrage application across multiple frames; pool hostile projectile allocations.
- **Risk of Changing**: Low risk; gameplay behavior remains preserved.

### Finding 5: Boss Spawning & Hazard Zone Allocation Spikes
- **Classification**: Three.js Draw / Render Cost & CPU / Simulation
- **Evidence**: Scenario 5 exhibits a 221.3 ms maximum frame spike upon Cindermaw activation.
- **Affected Scenario**: Scenario 5 (Boss Pressure).
- **Likely Subsystem / File**: `src/scene/BossRenderer.tsx`, `src/scene/EnemyManager.tsx` (lines 880–940).
- **Root Cause**:
  1. Dynamic allocation of shockwave and hazard zone objects (`runtime.hazardZones.push`).
  2. Instantiation of multi-part boss geometry and decals on the first frame of spawn.
- **Optimization Opportunity**: Pre-warm / pool boss geometries, shockwave rings, and hazard meshes during round intermissions.
- **Risk of Changing**: Low risk.

---

## 6. Measurements Limitations & Exclusions

In compliance with the project instructions, the following items are explicitly marked:
1. **GPU Frame Time**: **Unavailable in V1**. WebGL contexts restrict `EXT_disjoint_timer_query_webgl2` due to timing attack security mitigations in modern browsers. Measured frame times represent CPU-side frame budget and presentation delay.
2. **React VDOM Reconciliation Cost**: Excluded from per-frame metrics. Because the 3D game loop runs entirely within Three.js / R3F `useFrame` and bypasses React component re-rendering, React render profiling is not the primary driver of 60 FPS gameplay bottlenecks.

---

## 7. Prioritized Optimization Candidates (Future Passes)

The findings suggest the following prioritization for future optimization workstreams (do NOT implement in this pass):

| Priority | Target | Suspected Bottleneck | Expected Gain | Implementation Complexity / Risk |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | **Lux Light Lance / Secondary Target Search** | $O(N^2)$ enemy loop on crit + unthrottled hit SFX | Fixes 854 ms hitch; restores 60 FPS in Lux swarm | Low risk / High gain |
| **P2** | **Status Particle Pooling** | `push` and `splice` allocations per frame | Eliminates GC spikes in Frenzy and late-game | Very low risk / Medium gain |
| **P3** | **Elemental Status Tick Throttling** | 60 Hz per-enemy DoT evaluation | Smooths frame pacing in Scenario 8 | Medium risk / Medium gain |
| **P4** | **Projectile & Hazard Pooling** | Dynamic array allocation on attack/shoot | Reduces GC pressure during bullet swarms | Low risk / Medium gain |
| **P5** | **Boss Asset Pre-Warming** | Dynamic first-frame boss geometry compilation | Eliminates 220 ms spawn hitch | Low risk / Low gain |

---

## 8. Verification & Audit Conclusion

- `npm run lint`: **0 errors, 0 warnings**
- `npm run build`: **Production build exit 0** (1.30s)
- All 8 mandated scenarios measured deterministically via local Brave headless execution.
- All instrumentation is DEV-only and tree-shaken from production builds.
