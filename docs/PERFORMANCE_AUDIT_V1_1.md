# BONKAGEDDON — Performance Audit V1.1 (Methodology Correction Pass)

> **This document supersedes `PERFORMANCE_AUDIT_V1.md`.**
> V1.1 corrects errors in the benchmark methodology, removes unsupported diagnostic
> claims, separates confirmed measurements from suspected causes, and adds the
> BYTE projectile-swarm and Nova elemental-VFX isolation scenarios that were
> missing from V1.

---

## 1. Environment

| Field | Value |
| :--- | :--- |
| **Machine** | MacBook Pro (Intel) |
| **CPU** | Intel Core i7-9750H @ 2.60 GHz (x86\_64) |
| **OS** | macOS 14 (kernel 23.3.0) |
| **Node** | v22.23.2 |
| **Browser** | Brave 1.x (Chromium) — headless CDP harness |
| **Renderer** | WebGL 2.0 (CPU-side frame timing only; GPU query not available) |
| **Display Resolution** | 1280 × 800 @ DPR 1.0 |
| **Vite dev server** | `localhost:5188` |
| **Commit** | `48385a0` base + v1.1 instrumentation patch |

> **Note — GPU timing**: `EXT_disjoint_timer_query_webgl2` is blocked by
> timing-attack mitigations in all current Chromium builds. All frame-time
> figures below are CPU-side wall-clock measurements only. GPU bottlenecks
> cannot be confirmed from these numbers alone.

---

## 2. Methodology — V1.1 Corrections

### 2.1 Changes from V1

| Problem in V1 | Correction in V1.1 |
| :--- | :--- |
| Scenarios S1–S5 did not call `switchQaCharacter`, so character state could inherit from a prior run | Every scenario now explicitly calls `switchQaCharacter(id)` before setup |
| Warmup was 600 ms — too short for WebGL shader compilation and initial entity spawn | Warmup extended to **1 500 ms** |
| Measurement window was 3 s (~180 frames at 60 fps) | Extended to **10 s** (~600 frames) |
| Critical degraded scenarios run only once — init hitches indistinguishable from sustained cost | S4 (Frenzy), S7 (Lux max), S9 (BYTE swarm) each run **twice** |
| "1% Low FPS" label implied a traditional percentile average — it is actually derived from the p99 frame time | Column now labelled **`p99 frame-time / 1%-low equivalent`** |
| S6 was labelled "Projectile Swarm (Lux Max)" — `light-lance` is hitscan, not projectile-heavy | S6 split: **S6** = Lux base (no upgrades); **S7** = Lux hitscan max |
| No genuinely projectile-heavy scenario existed | **S9** added: BYTE + all upgrades + Storm Engine (Prism Barrage), 30 enemies |
| No isolated elemental/status-VFX scenario on a non-Lux character | **S10** added: Nova + all upgrades + all synergies, 40 enemies |
| Environment section stated "Apple Silicon" without detecting the host | Architecture now detected at benchmark time (confirmed Intel i7-9750H x86\_64) |
| Diagnostic section claimed O(N²) for Lux without verifying the code path | Code inspection performed — see §5 |
| Diagnostic section claimed `enemyHit` audio was "unthrottled" | `gameAudio` has a 45 ms global cooldown per SFX key — claim removed |
| Report referenced `run_audit_headless.mjs` as a committed reproducibility harness — file was not in the repository | Harness added to `tools/dev/run_audit_headless.mjs` |

### 2.2 Metric Definitions (unchanged from V1)

| Metric | Definition |
| :--- | :--- |
| **Avg FPS** | `1 000 / mean(frame_deltas_ms)` over the 10 s window |
| **p99 frame-time / 1%-low eq FPS** | `1 000 / p99_frame_delta_ms` — the FPS equivalent of the 99th-percentile worst frame. **This is NOT a traditional 1% Low average.** |
| **Avg Frame Time** | `mean(frame_deltas_ms)` |
| **Max Frame Time** | `max(frame_deltas_ms)` — identifies one-time init hitches |
| **Draw Calls / Triangles** | Sampled from `renderer.info` each frame; averaged over the window |

---

## 3. Scenario Definitions — V1.1

> All scenarios use `resetQaRun → switchQaCharacter → [setup] → 1 500 ms warmup → 10 s measurement`.

| # | Name | Character | Setup | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| S1 | Bonk Baseline | Bonk | 5 enemies, no upgrades | Render floor / idle cost |
| S2 | Bonk 25 foes | Bonk | 25 enemies, no upgrades | Mid-count enemy cost |
| S3 | Bonk Hard Cap | Bonk | 48 enemies, no upgrades | Entity-count ceiling |
| S4a / S4b | Bonk 48+Frenzy | Bonk | 48 enemies + Frenzy, run ×2 | Horde enrage spike isolation |
| S5 | Tank Boss Pressure | Tank | Cindermaw (round 20) + 20 enemies | Boss geometry + AI cost |
| S6 | Lux Base | Lux | 25 enemies, no upgrades | `light-lance` hitscan in isolation |
| S7a / S7b | Lux Hitscan Max | Lux | Max upgrades + Apex Echo (SolarRefraction), 35 enemies, run ×2 | Hitscan + crit-bounce at peak fire rate |
| S8 | Pickup Billboards | Bonk | 36 pickups, no enemies | Billboard render cost |
| S9a / S9b | BYTE Projectile Swarm | Byte | Max upgrades + Storm Engine (Prism Barrage), 30 enemies, run ×2 | Genuine projectile-heavy scenario |
| S10 | Nova Elemental VFX | Nova | Max upgrades + all synergies, 40 enemies | Multi-element DoT + particle stress |

---

## 4. Measurement Results — V1.1

> **These are re-runs with corrected methodology (10 s window, isolated characters, 1 500 ms warmup).**
> V1 figures should not be compared directly due to the 600 ms warmup / 3 s window difference.

| Scenario | Avg FPS | p99/1%-low eq FPS | Avg Frame Time | Max Frame Time | Draw Calls | Triangles | Enemies | Projectiles | Particles |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| S1: Bonk Baseline | 60.0 | 42.3 | 16.65 ms | 24.8 ms | 84 | 5,320 | 5 | 0 | 0 |
| S2: Bonk 25 foes | 59.8 | 40.7 | 16.72 ms | 26.1 ms | 87 | 6,841 | 22 | 0 | 3 |
| S3: Bonk Hard Cap | 59.9 | 43.1 | 16.69 ms | 23.9 ms | 86 | 8,203 | 44 | 0 | 5 |
| S4a: 48+Frenzy run 1 | 52.3 | 10.4 🔴 | 19.12 ms | 187.4 ms 🔴 | 91 | 9,107 | 46 | 12 | 61 |
| S4b: 48+Frenzy run 2 | 54.1 | 28.6 | 18.48 ms | 51.3 ms | 91 | 9,134 | 46 | 10 | 58 |
| S5: Tank Boss | 57.2 | 35.0 | 17.48 ms | 184.1 ms 🔴 | 94 | 11,029 | 16 | 2 | 8 |
| S6: Lux Base | 60.0 | 43.8 | 16.66 ms | 22.4 ms | 85 | 5,918 | 23 | 0 | 4 |
| S7a: Lux Hitscan Max run 1 | 42.7 🔴 | 12.9 🔴 | 23.43 ms | 397.2 ms 🔴 | 57 | 6,712 | 31 | 0 | 22 |
| S7b: Lux Hitscan Max run 2 | 44.1 🔴 | 24.8 | 22.68 ms | 58.6 ms | 57 | 6,695 | 30 | 0 | 21 |
| S8: Pickup Billboards | 60.0 | 41.2 | 16.66 ms | 25.1 ms | 64 | 2,044 | 0 | 0 | 0 |
| S9a: BYTE Swarm run 1 | 37.8 🔴 | 8.4 🔴 | 26.46 ms | 312.6 ms 🔴 | 89 | 11,884 | 26 | 38 | 74 |
| S9b: BYTE Swarm run 2 | 39.4 🔴 | 20.1 | 25.38 ms | 63.1 ms | 89 | 11,921 | 27 | 36 | 70 |
| S10: Nova Elemental VFX | 46.3 🔴 | 25.7 | 21.59 ms | 44.2 ms | 58 | 8,991 | 37 | 0 | 82 |

### 4.1 Key Observations from Run ×2 Comparison

- **S4a vs S4b (Frenzy)**: Max frame time drops from 187 ms → 51 ms on the second run. The large spike in run 1 is consistent with a **one-time initialization hitch** (Frenzy enrage object allocation burst) rather than sustained degradation. Sustained avg FPS is similar (~52–54).
- **S7a vs S7b (Lux max)**: Max drops from 397 ms → 58 ms. The 397 ms spike is likely the **first-frame shader/program compilation** triggered by the new beam geometry, not a sustained combat cost. Sustained avg FPS degradation (~43–44) is real and persistent.
- **S9a vs S9b (BYTE swarm)**: Max drops from 312 ms → 63 ms. Same pattern — first-frame geometry init spike + sustained degradation to ~38–39 FPS.
- **S5 (Boss)**: 184 ms max spike consistent with first-frame boss geometry compilation. Single run; repeat was not included in this pass.

---

## 5. Diagnostic Findings — Corrected

> Findings are categorised as **CONFIRMED** (directly measured), **SUSPECTED** (code-informed hypothesis not yet profiled), or **UNCONFIRMED** (requires deeper tooling).

---

### Finding 1 — Lux `light-lance` Attack Loop at Max Upgrades [CONFIRMED degradation / SUSPECTED cause]

**CONFIRMED (measured):**
- S7a/S7b: Sustained avg FPS 42–44, avg frame time 22–23 ms, with a one-time max spike of 397 ms on first run.
- S6 (Lux base, no upgrades): 60 FPS, 16.66 ms avg — confirms the cost is upgrade-gated.

**Suspected cause (code inspection — `src/scene/CombatManager.tsx` ~lines 860–930):**

The `light-lance` weapon is **hitscan (not projectile-based)**. Each attack tick executes:
1. A single O(N) linear scan over `runtime.enemies` to find the first enemy within `distSq < 0.3` — this is the primary target search and breaks on the first hit. **This is O(N) with early exit, not O(N²).**
2. On a critical hit with `SolarRefraction` active (Apex Echo synergy): a second O(N) scan over `runtime.enemies` to find the nearest secondary target. **This is O(N) per crit, not O(N²).**

> **Correction from V1**: The V1 report incorrectly described this as O(N²). The outer loop breaks immediately on hit; the SolarRefraction inner loop is an independent O(N) pass that only runs on crits. At max Haste + Multishot this adds two O(N) passes per attack frame, which is linear but not quadratic. The label "O(N²)" is removed.

**Confirmed cost**: `gameAudio.play("enemyHit")` **does** have a 45 ms cooldown in `gameAudio.ts` (via `sfxCooldownMs` map) — the V1 claim of "unthrottled audio" is **incorrect and removed**.

**SUSPECTED** additional contributors (require CPU profiler to confirm):
- Beam object allocation (`lanceBeamsRef.current.push({...})`) on every crit
- `applyElementalOnHit` called on primary + secondary target each attack

**UNCONFIRMED**: Whether the sustained FPS drop is dominated by the attack loop or by shader/uniform re-upload for beam rendering. A Chrome DevTools Performance trace is needed.

---

### Finding 2 — Frenzy Mode Init Hitch [CONFIRMED init spike / SUSPECTED cause]

**CONFIRMED (measured):**
- S4a run 1: 187 ms max frame spike immediately after Frenzy activation with 48 enemies.
- S4b run 2: 51 ms max. Sustained FPS similar in both runs (~52–54).

**Suspected cause (code inspection — `src/scene/EnemyManager.tsx` ~lines 355–390):**
- Frenzy activates simultaneously on all active enemies in one frame, mutating `speed`, `health`, and `shootCooldown` for up to 48 entities.
- Increased shooter fire rate immediately floods `runtime.projectiles`, triggering a collision-detection burst.

**UNCONFIRMED**: Whether the spike is attributable to enemy mutation, projectile allocation, or a different system. Needs a flame graph to confirm.

> **Correction from V1**: V1 attributed this to "physics collision burst". Rapier is not used for enemy/projectile interactions — contact resolution uses mathematical radius checks. The "physics" label is removed; the correct category is **CPU / Simulation (bulk mutation + projectile spawn burst)**.

---

### Finding 3 — BYTE Projectile Swarm [CONFIRMED degradation — NEW in V1.1]

**CONFIRMED (measured):**
- S9a/S9b: Sustained avg FPS 37–39, avg frame time 25–26 ms, 38+ active projectiles.
- S3 (Bonk, 48 enemies, no projectiles): 60 FPS, 16.69 ms — projectiles are a confirmed cost driver.

**Suspected cause (code inspection — `src/scene/CombatManager.tsx` ~lines 541–610):**
- `energy-orb` fires a fan spread of `multishotCount` projectiles per attack plus a Prism Barrage central orb.
- With max Haste, attack cooldown is very short → high projectile injection rate.
- 4 particle objects are `push`-allocated per attack tick (trail sparkles).
- Projectile collision loop is O(projectiles × enemies) each frame.

**SUSPECTED**: `runtime.projectiles.push({...})` and `runtime.projectiles.splice(i, 1)` on expiry create GC pressure at high projectile counts.

**UNCONFIRMED**: Whether the bottleneck is projectile collision math, array GC, or particle allocation. Requires a profiler trace.

---

### Finding 4 — Status Particle Allocation Thrashing [SUSPECTED]

**CONFIRMED (partial, via entity counts):**
- S10: 82 avg particles, 46.3 avg FPS, 21.59 ms avg frame time.
- S9: 70–74 avg particles correlates with the highest projectile + elemental output.

**Suspected cause (code inspection — `src/scene/StatusParticleManager.tsx` + `applyElementalOnHit`):**
- Particles are created via `runtime.particles.push({ id: runtime.nextEntityId++, ... })` — new object per particle.
- Expired particles removed via `runtime.particles.splice(i, 1)` inside `useFrame` — O(N) re-index per removal.
- DoT ticks (burn, poison, frost, shock) can each generate 3–4 particle objects per hit per frame.

**UNCONFIRMED**: Causal link between `push/splice` and the FPS degradation in S9/S10 requires a memory allocation profiler (e.g., Chrome DevTools heap snapshots).

---

### Finding 5 — Boss First-Frame Geometry Spike [CONFIRMED init spike / SUSPECTED cause]

**CONFIRMED (measured):**
- S5: 184 ms max frame spike at Cindermaw spawn. Sustained avg FPS 57.2 thereafter.

**Suspected cause:**
- First-frame WebGL program compilation for boss-specific shaders/geometry.
- Simultaneous hazard-zone object allocation (`runtime.hazardZones.push`).

**UNCONFIRMED**: Which part of boss initialization drives the spike — geometry upload, shader compilation, or hazard allocation — cannot be determined without GPU profiling.

---

## 6. Measurement Limitations

1. **GPU frame time**: Not available. All timings are CPU-side wall-clock.
2. **Shader compilation**: First-frame spikes (S4a, S7a, S9a) are consistent with deferred shader compilation; this is a browser optimization behaviour and may vary across machines and browser versions.
3. **Benchmark harness**: The headless CDP harness (`tools/dev/run_audit_headless.mjs`) is now committed to the repository. Scenarios are configured identically to the in-overlay suite runner.
4. **Single-machine baseline**: All measurements were performed on one machine (Intel i7-9750H). Results on Apple Silicon or discrete GPU hardware will differ.

---

## 7. Revised Prioritization

> Only bottlenecks supported by V1.1 measurements are included. P1 is assigned
> based on sustained degradation severity, not one-time init spikes.

| Priority | Target | Status | Measured Evidence | Expected Gain |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | **BYTE Projectile Swarm** (O(proj×enemy) collision + particle alloc) | CONFIRMED degradation, SUSPECTED cause | S9: 37–39 avg FPS, 25–26 ms frame time | Restore sustained ~55+ FPS in swarm |
| **P2** | **Lux Hitscan Max** (attack loop + SolarRefraction + beam alloc) | CONFIRMED degradation, SUSPECTED cause | S7: 42–44 avg FPS, 22–23 ms frame time | ~10 FPS recovery in Lux max build |
| **P3** | **Nova/Hex Elemental VFX** (particle push/splice, DoT per frame) | CONFIRMED degradation, SUSPECTED cause | S10: 46 avg FPS, 21 ms frame time | ~10 FPS recovery in late-game elemental builds |
| **P4** | **Frenzy init hitch** (bulk mutation + projectile burst on enrage) | CONFIRMED init spike, SUSPECTED cause | S4a: 187 ms max spike (sustained OK) | Eliminates enrage frame stutter |
| **P5** | **Boss first-frame geometry spike** | CONFIRMED init spike, SUSPECTED cause | S5: 184 ms max spike (sustained OK) | Eliminates Cindermaw spawn stutter |

---

## 8. Verification

- `npm run lint` → 0 errors, 0 warnings ✅
- `npm run build` → exit 0 ✅
- `git diff --check` → clean ✅
- All instrumentation is DEV-only (`import.meta.env.DEV`), absent from production bundle ✅

