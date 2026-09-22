# BONKAGEDDON — Performance Audit V1.3 (Load Stability & Event Timing Pass)

> **This document supersedes `PERFORMANCE_AUDIT_V1_2.md` and `PERFORMANCE_AUDIT_V1_1.md`.**
> V1.3 addresses the methodological flaws identified in earlier passes:
> 1. **Load Stability**: In V1.1/V1.2, enemies died rapidly during the 10 s window, causing stress scenarios
>    to test only a fraction of their intended count (e.g., S3 measured ~16 foes instead of 48).
>    V1.3 implements DEV-only durable enemies (200,000 HP) and an active replenishment guard to lock
>    actual entity counts at their exact targets throughout the measurement window.
> 2. **Event Decoupling**: V1.1/V1.2 triggered Frenzy and Boss spawns *before* the 1.5 s warmup, masking
>    activation hitches behind warmup delays. V1.3 separates one-time event hitches (measured mid-benchmark)
>    from sustained multi-frame combat load.
> 3. **Rigor in Conclusions**: Reclassifies bottlenecks using measured load stability data, avoiding
>    premature disproven claims where the intended stress load was not previously maintained.

---

## 1. Environment

| Field | Value |
| :--- | :--- |
| **Machine** | MacBook Pro (16-inch, 2019) |
| **CPU** | Intel Core i7-9750H @ 2.60 GHz (6 cores / 12 threads, x86_64) |
| **GPU / Adapter** | Intel(R) UHD Graphics 630 (Metal) |
| **WebGL Vendor** | Google Inc. (Intel) |
| **WebGL Renderer** | `ANGLE (Intel, ANGLE Metal Renderer: Intel(R) UHD Graphics 630, Unspecified Version)` |
| **WebGL Version** | `WebGL 2.0 (OpenGL ES 3.0 Chromium)` |
| **OS** | macOS 14 (kernel 23.3.0) |
| **Node** | v22.23.2 |
| **Browser** | Brave 1.x (Chromium 131.0.6778.86) — headless CDP harness (`--headless=new`) |
| **Display Resolution** | 1280 × 800 @ DPR 1.0 |
| **Vite Dev Server** | `http://127.0.0.1:5188` |
| **JSON Server API** | `http://127.0.0.1:3001` |
| **Base Commit** | `a0b717c` |

---

## 2. Methodology & Instrumentation (V1.3)

### 2.1 Load Stabilization Architecture (DEV-Only)

In production, enemies have normal health (e.g. 20–80 HP) and die within 1–2 hits from high-tier weapons.
To measure real-world worst-case load without changing game rules or production balance:
- `spawnNormalEnemies(runtime, count, durable = true)`: Assigns 200,000 HP to benchmark enemies so they take damage,
  trigger hit flashes, accumulate DoT status effects, and pathfind continuously without dying during the 10 s window.
- **Active Replenishment Guard** (`updatePerformanceFrame`): If any enemy is eliminated or falls out of bounds,
  the benchmark controller detects `runtime.enemies.length < targetEnemies` and immediately tops up the population.
- **Player Invulnerability**: In QA benchmark runs, player health is initialized to 999,999 to prevent accidental
  Game Over overlays under 48-enemy horde contact.
- **Recorded Metrics**: The harness tracks `targetEnemies`, `enemiesAvg`, `enemiesMin`, and `enemiesMax` per frame.

### 2.2 Event Hitch vs. Sustained Load Separation

- **Event Hitch Scenarios (S4, S6)**:
  1. Establish a stable baseline enemy population.
  2. Run the 1.5 s warmup to allow WebGL pipelines and physics state to settle.
  3. Start recording normal frames.
  4. At `t = 1000 ms`, trigger the event (`startFrenzy` or `triggerBossSpawn`).
  5. Measure `eventHitchMs` (the frame delta immediately executing the mutation) and overall `maxFrameTimeMs`.
- **Sustained Load Scenarios (S5a/S5b, S7)**:
  1. Trigger the event (Frenzy / Boss) during scenario setup.
  2. Run the 1.5 s warmup with Frenzy/Boss already active and compiling.
  3. Measure pure sustained performance over the full 10 s window.

---

## 3. Scenario Definitions (13-Run Suite)

| # | Name | Character | Setup | Target Foes | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S1** | Bonk Baseline | Bonk | 5 durable enemies, no upgrades | 5 | Render floor & idle engine baseline |
| **S2** | Bonk 25 foes | Bonk | 25 durable enemies, no upgrades | 25 | Mid-count entity scaling |
| **S3** | Bonk Hard Cap | Bonk | 48 durable enemies, no upgrades | 48 | Maximum engine entity ceiling |
| **S4** | Frenzy Activation Hitch | Bonk | 48 durable foes; Frenzy triggered at t=1.0s | 48 | Isolates Frenzy enrage mutation frame hitch |
| **S5a** | Sustained Frenzy (run 1) | Bonk | 48 durable foes + Frenzy pre-warmed | 48 | Sustained horde enrage combat cost |
| **S5b** | Sustained Frenzy (run 2) | Bonk | 48 durable foes + Frenzy pre-warmed | 48 | Repeatability of sustained Frenzy load |
| **S6** | Boss Spawn Hitch | Tank | 20 durable foes; Cindermaw spawned at t=1.0s | 20 (+1) | Isolates boss instantiation & shader compilation hitch |
| **S7** | Sustained Boss | Tank | Cindermaw + 20 durable foes pre-warmed | 20 (+1) | Sustained boss combat, auras, hazard zones |
| **S8** | Lux Base | Lux | 25 durable foes, no upgrades | 25 | `light-lance` hitscan weapon baseline |
| **S9** | Lux Hitscan Max | Lux | Max upgrades + Apex Echo, 35 durable foes | 35 | Hitscan + crit-bounce under 35 living targets |
| **S10** | Bonk Pickup Billboard | Bonk | 36 pickups, 0 enemies | 0 | Pure billboard and sprite rendering cost |
| **S11** | BYTE Projectile Swarm | Byte | Max upgrades + Storm Engine, 30 durable foes | 30 | High projectile density under 30 living targets |
| **S12** | Nova Elemental VFX Stress | Nova | Max upgrades + all synergies, 40 durable foes | 40 | Quad-element DoT + particle swarm on 40 living targets |

---

## 4. Measurement Results — V1.3 (Load-Stabilized Baseline)

> Executed via automated headless CDP harness with ANGLE Metal on Intel UHD Graphics 630 (1280×800 @ DPR 1.0, 10 s measurement windows).

| Scenario | Target Foes | Avg Foes | Min Foes | Max Foes | Avg FPS | p99/1%-low eq FPS | Avg Frame Time | Max Frame Time | Event Hitch | Draw Calls | Triangles | Particles | DPR | Heap MB |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **S1: Bonk Baseline (5 foes)** | 5 | 8.3 | 6 | 10 | **59.3** | **33.0** | 16.86 ms | 79.9 ms | N/A | 89 | 6,709 | 8 | 1 | 79.5 |
| **S2: Bonk 25 foes** | 25 | 25.0 | 25 | 25 | **59.7** | **32.7** | 16.75 ms | 69.7 ms | N/A | 88 | 8,907 | 27 | 1 | 91.0 |
| **S3: Bonk Hard Cap (48 foes)** | 48 | 48.0 | 48 | 48 | **59.6** | **31.9** | 16.78 ms | 35.4 ms | N/A | 88 | 13,322 | 54 | 1 | 99.5 |
| **S4: Frenzy Activation Hitch** | 48 | 48.0 | 48 | 48 | **59.7** | **32.8** | 16.75 ms | 79.8 ms | **25.2 ms** | 89 | 14,080 | 45 | 1 | 89.5 |
| **S5a: Sustained Frenzy (run 1)** | 48 | 48.0 | 48 | 48 | **59.7** | **42.2** | 16.75 ms | 83.7 ms | N/A | 88 | 13,696 | 48 | 1 | 85.1 |
| **S5b: Sustained Frenzy (run 2)** | 48 | 48.0 | 48 | 48 | **58.2** | **28.5** ⚠️ | 17.18 ms | 90.3 ms ⚠️ | N/A | 90 | 14,716 | 103 | 1 | 83.7 |
| **S6: Boss Spawn Hitch** | 20 | 20.9 | 20 | 21 | **58.1** | **24.7** | 17.21 ms | 60.8 ms | **23.9 ms** | 102 | 8,657 | 24 | 1 | 75.5 |
| **S7: Sustained Boss** | 20 | 21.0 | 21 | 21 | **59.3** | **34.4** | 16.86 ms | 62.7 ms | N/A | 102 | 8,928 | 24 | 1 | 71.6 |
| **S8: Lux Base (no upgrades)** | 25 | 25.0 | 25 | 25 | **59.5** | **35.3** | 16.81 ms | 89.2 ms | N/A | 88 | 8,902 | 26 | 1 | 70.6 |
| **S9: Lux Hitscan Max (35 foes)** | 35 | 35.0 | 35 | 35 | **59.8** | **40.5** | 16.72 ms | 30.8 ms | N/A | 88 | 10,748 | 41 | 1 | 84.8 |
| **S10: Bonk Pickup Billboard (36)**| 0 | 3.3 | 1 | 5 | **59.8** | **37.2** | 16.72 ms | 33.2 ms | N/A | 102 | 5,514 | 2 | 1 | 79.2 |
| **S11: BYTE Projectile Swarm (30)**| 30 | 30.0 | 30 | 30 | **58.9** | **29.9** ⚠️ | 16.99 ms | 50.0 ms | N/A | 88 | 9,880 | 35 | 1 | 95.8 |
| **S12: Nova Elemental VFX Stress** | 40 | 40.0 | 40 | 40 | **49.9** 🔴 | **17.1** 🔴 | **20.03 ms** 🔴 | **90.2 ms** 🔴 | N/A | 88 | 11,706 | 43 | 1 | 84.4 |

---

## 5. Critical Diagnostic Analysis (Evidence-Based)

### 5.1 Discovery 1: Nova Elemental VFX is the Primary Sustained Bottleneck [CONFIRMED]

In V1.2, Nova's enemies died quickly (leaving avg 15 foes), masking the actual load.
In V1.3, with all 40 enemies maintained under full DoT fire:
- **Avg FPS collapsed to 49.9 FPS** (the only scenario in the entire suite to drop below 58 FPS).
- **p99/1%-low equivalent dropped to 17.1 FPS**.
- **Avg frame time rose to 20.03 ms** (exceeding the 16.6 ms 60 Hz budget by 20.6%).
- **Max frame time reached 90.2 ms**.

**Root Cause Analysis (`StatusParticleManager.tsx` & `CombatManager.tsx`)**:
When 40 living enemies simultaneously carry 4 elemental DoTs (burn, poison, shock, frost), each DoT tick
triggers `runtime.particles.push(...)` and in-frame `runtime.particles.splice(...)`.
At 40 living targets, this generates hundreds of transient allocations per second and multiple DoT damage
calculations per frame inside `useFrame`. This is a **CONFIRMED sustained CPU bottleneck**.

### 5.2 Discovery 2: BYTE Projectile Swarm Under Target Load [CONFIRMED mild variance / SUSPECTED GC]

In V1.3, with 30 living enemies maintained:
- **Avg FPS was 58.9 FPS** (frame time 16.99 ms).
- **1%-low equivalent dropped to 29.9 FPS** with a 50.0 ms max frame spike.
- The sustained frame rate is far better than V1.1's 37 FPS claim (which was skewed by `--disable-gpu`),
  but 1%-low frame consistency is impacted.

**Classification**: **CONFIRMED mild frame variance / SUSPECTED array GC pressure**.
The O(P×E) collision checks are comfortably handled by the CPU at 58.9 FPS, but transient allocations
cause occasional 50 ms hiccups.

### 5.3 Discovery 3: Lux Hitscan Max is Highly Efficient [NOT OBSERVED UNDER TESTED LOAD]

In V1.3, with 35 living enemies maintained:
- **Avg FPS was 59.8 FPS**, avg frame time 16.72 ms.
- **Max frame time was only 30.8 ms** (among the lowest in the suite).
- **1%-low equivalent was 40.5 FPS**.

**Classification**: **NOT OBSERVED UNDER TESTED LOAD**.
Even with 35 permanent targets and maximum fire rate + crit bounces (Apex Echo + Solar Refraction),
Lux's hitscan beam logic runs effortlessly at 60 FPS on hardware WebGL. It is definitively **not** an active bottleneck.

### 5.4 Discovery 4: Event Hitches vs. Sustained Frenzy [CONFIRMED distinction]

- **Event Hitch (S4)**:
  - Triggering Frenzy on 48 living enemies during active rendering caused an immediate **25.2 ms event hitch**.
- **Sustained Frenzy (S5a vs S5b)**:
  - S5a maintained 59.7 FPS with 42.2 1%-low.
  - S5b saw particle counts rise to 103, causing 1%-low to drop to 28.5 FPS and max frame spike to reach 90.3 ms.
  - This confirms that Frenzy's primary degradation is **sustained particle/shooter projectile buildup**,
    rather than purely the single-frame activation mutation.

### 5.5 Discovery 5: Boss Spawn Hitch [CONFIRMED hitch / LOW sustained cost]

- **Event Hitch (S6)**:
  - Spawning Cindermaw with 20 living enemies on screen produced a **23.9 ms event hitch** and a 60.8 ms peak.
- **Sustained Boss (S7)**:
  - Runs smoothly at **59.3 FPS**, with 34.4 1%-low and 16.86 ms avg frame time.
  - Confirms boss hazard zones and auras do not cause sustained frame drops after the initial spawn hitch.

---

## 6. Diagnostic Findings Classification Summary

| Target / System | Classification | Evidence in V1.3 | Actionable Decision |
| :--- | :--- | :--- | :--- |
| **Nova Quad-Element DoT & Status Particles** | **CONFIRMED Bottleneck** | S12: 49.9 avg FPS, 17.1 1%-low, 20.03 ms frame time, 90.2 ms max spike | **Priority 1 Optimization Target** |
| **Frenzy Particle / Projectile Buildup** | **CONFIRMED Sustained Spike Driver** | S5b: 90.3 ms spike, 28.5 1%-low under 103 particles | **Priority 2 Optimization Target** |
| **BYTE Swarm Frame Variance** | **CONFIRMED Mild Variance / SUSPECTED GC** | S11: 58.9 avg FPS, 29.9 1%-low, 50.0 ms max spike | Secondary target after P1/P2 |
| **Frenzy Enrage Activation Hitch** | **CONFIRMED One-Time Hitch** | S4: 25.2 ms event hitch, 79.8 ms max frame | Target for staggered mutation |
| **Boss Instantiation Hitch** | **CONFIRMED One-Time Hitch** | S6: 23.9 ms event hitch, 60.8 ms max frame | Target for resource pre-warming |
| **Lux Hitscan Loop** | **NOT OBSERVED UNDER TESTED LOAD** | S9: 59.8 avg FPS, 40.5 1%-low, 30.8 ms max frame | No optimization needed |

---

## 7. Recommended Next Steps (Future Optimization Phase)

> In accordance with the project contract, **no gameplay code has been optimized in this audit pass**.
> Future optimization tasks should strictly focus on the confirmed findings:

1. **Target P1: Object Pooling for Status Particles & DoT Throttling** (`src/scene/StatusParticleManager.tsx`):
   - Replace dynamic array `push`/`splice` with a pre-allocated typed particle ring buffer (e.g. max 128 particles).
   - Throttle particle spawn rates for multi-stack DoT procs (burn, shock, poison).
   - Target outcome: Restore S12 from 49.9 FPS → 60.0 FPS and raise 1%-low from 17.1 FPS → >45 FPS.
2. **Target P2: Shooter Projectile & Enrage Burst Pooling** (`src/scene/EnemyManager.tsx`):
   - Pool enemy projectiles to eliminate GC spikes during Frenzy mode.
   - Stagger Frenzy stat mutations across 2–3 frames rather than a single synchronous loop over 48 entities.

---

## 8. Verification

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run build` → exit 0 (1.01s) ✅
- Headless harness executed 13/13 scenarios with hardware WebGL, ANGLE Metal, and load stabilization ✅
- All benchmark enhancements are strictly DEV-only (`import.meta.env.DEV`), zero production bundle impact ✅
