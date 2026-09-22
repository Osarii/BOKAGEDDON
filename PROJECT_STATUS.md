# BONKAGEDDON Project Status

## Current Phase
Post-Merge Integration Complete & Verified

## Completed

- **Phase 0 Foundation**:
  - Initialized Vite + React 19 + TypeScript with strict typing.
  - Configured `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `three`, `zustand`, `react-router-dom`, `lucide-react`, and `json-server`.
  - Discovered and integrated local SVG assets (88 KB) and centralized in `src/config/assets.ts`.
  - Configured JSON Server (`db.json`) with 5 characters, 8 base upgrades, and persistent scores.
  - Implemented typed `src/services/api.ts` with `AbortSignal`.
  - Implemented React Router with 5 primary routes and dynamic validation.
  - Configured minimal Zustand store with selectors.
  - Verified R3F Canvas, Rapier physics floor, lighting, and initial arena.

- **Phase 1 Movement & Camera Follow**:
  - Implemented keyboard input handling for WASD (`KeyW`, `KeyA`, `KeyS`, `KeyD`) and Arrow keys (`ArrowUp`, `ArrowLeft`, `ArrowDown`, `ArrowRight`).
  - Added window blur event listener to instantly clear pressed keys and eliminate stuck movement on tab switch.
  - Implemented diagonal input normalization to ensure diagonal speed equals cardinal speed.
  - Hooked movement into R3F `useFrame(delta)` for frame-rate independence.
  - Wired character-specific base speeds (`bonk`: 5.0, `byte`: 6.5, `tank`: 4.0).
  - Applied movement via Rapier `setLinvel` preserving natural vertical gravity.
  - Implemented circular arena boundary clamping (`ARENA_RADIUS = 30`, `ARENA_BOUNDARY_LIMIT = 28.8`).
  - Added smooth player facing rotation toward movement direction.
  - Implemented `CameraController` using exponential decay lerp from elevated perspective without OrbitControls.
  - Reused module/ref `THREE.Vector3` instances, ensuring zero garbage collection overhead per frame.
  - Updated HUD banner with `"WASD / Arrow Keys — Move"`.

- **Phase 2 Playable Core Gameplay Loop**:
  - Implemented lightweight `GameRuntime` mutable entity architecture in `src/game/runtime.ts` shared via React `useRef`, preventing 60 FPS transform churn in React or Zustand.
  - Implemented 4 enemy archetypes (`slime`, `runner`, `brute`, `shooter`) pooled with Three.js `InstancedMesh` with shared geometries and materials.
  - Built pure vector chase AI, collision repulsion, and shooter projectile firing.
  - Implemented boss **BONKLORD** spawning at Level 10 with dedicated procedural mesh, crown, stomp shockwaves, slot reservation (never exceeding cap), and boss health bar.
  - Implemented 3 character-specific automatic weapons: BONK (Hammer shockwave slam), BYTE (Energy Orb seeking projectiles), TANK (Axe orbital cleave).
  - Implemented XP gem drops, instanced rendering, magnet vacuum attraction, and exact XP overflow preservation.
  - Implemented queued level-up upgrade selection modal displaying 3 random valid choices (max tier 5) with deterministic seeded shuffle.
  - Implemented throttled 1Hz survival timer in `SimulationTimer`.
  - Implemented `GameOverOverlay` and `VictoryOverlay` with stats breakdown and single-submission `hasSavedScoreRef` guard posting to JSON Server (`/scores`).
  - Implemented full clean run restart with `handlePlayAgain`.

- **Workstream A — 3D Visual Quality & Enemy Identity**:
  - Rebuilt all 4 normal enemy archetypes (`slime`, `runner`, `brute`, `shooter`) with rich, silhouette-differentiated multi-part 3D geometries merged cleanly using `three/examples/jsm/utils/BufferGeometryUtils.js`.
  - Loaded official enemy SVG assets (`public/assets/enemies/`) as shared `THREE.Texture` instances and projected them as front-facing/dorsal decal quads via secondary `InstancedMesh`.
  - Implemented per-instance hit feedback using `InstancedMesh.setColorAt`: damaged enemies flash incandescent white (`#ffffff`) with a dynamic 1.3x scale pop.
  - Added lightweight enemy death dissipation rings via `InstancedMesh` with expanding radius and fading opacity.
  - Rebuilt **BONKLORD** boss model: 3.5-unit obsidian titan with 5-spire golden crown (`#fbbf24`), glowing lava skull chest (`bonklord.svg`), golden pauldrons, spiked legendary warhammer, and pulsating fiery ground aura ring.
  - Upgraded lighting in `Lighting.tsx` with a secondary cool-toned rim/fill light (`#38bdf8`) highlighting 3D entity silhouettes against the dark arena.
  - Expanded camera fog in `GameScene.tsx` from `[18, 42]` to `[26, 56]`, eliminating darkness clipping in the combat arena.
  - Refined perimeter spawning in `EnemyManager.tsx` to camera-relative 11.5–13.5 units from player, ensuring enemies appear on screen within 1–2 seconds.

- **Workstream B (Codex) — Audio & n8n Integration**:
  - Built centralized procedural Web Audio API service in `src/audio/gameAudio.ts` with oscillators, sweeps, envelopes, volume/mute state persistence, and anti-spam cooldowns.
  - Integrated HUD audio controls (mute button, volume slider).
  - Built production-ready n8n completed-run workflow in `n8n/bonkageddon-run-workflow.json` with 8 nodes: Webhook, Validate and Normalize, Run Analysis, Classify Run, 3 Action branches, and Respond to Webhook.
  - Built `src/services/webhook.ts` dispatching run telemetry to `VITE_N8N_WEBHOOK_URL` with separate execution guard.

- **Cross-Workstream Integration & Audio Glue**:
  - Connected missing audio events directly in `src/scene/EnemyManager.tsx`:
    - `enemyDeath`: procedural 260->75Hz sawtooth sweep + square pop
    - `bossDeath`: deep 160->35Hz decaying sawtooth rumble
    - `bossSpawn`: low ominous 70->180Hz siren sweep
    - `playerDamage`: connected on player contact damage and Bonklord stomp damage
  - Updated `README.md`, `PROJECT_STATUS.md`, `CURRENT_TASK.md`, and `docs/DECISIONS.md`.
  - `npm run build` and `npm run lint` pass with 0 errors and 0 warnings.

- **Workstream: Endless Rounds, Shield & Recovery System**:
  - Separated `level` (XP-driven player progression & upgrades) and `round` (run pacing, enemy quotas, composition scaling, boss rounds).
  - Implemented endless rounds starting at Round 1 with finite enemy quotas (14 to 40) and 3.5s intermission intervals between waves.
  - Implemented circular arena boundary enforcement at 28.8 units (radius 30) with tangential velocity deflection.
  - Implemented Shield absorption mechanic (`shield` starting at 0, max 100): mitigated damage hits shield first; remainder damages HP.
  - Integrated WebP recovery asset pack under `public/assets/v2/items/`: `medkit-emergency.webp` (+35 HP), `medkit-case.webp` (+70 HP), `shield-potion.webp` (+25 shield), `shield-battery.webp` (+50 shield).
  - Recovery pickups feature a 25-second lifetime expiration (warning at 5 seconds) and contact-based collection with consumption guards.
  - Fixed camera and movement vibration across straight movement, diagonal movement, turns, and arena boundaries using exponential low-pass filtering.

- **Workstream: Project-Aware Professor AI Assistant**:
  - Implemented local in-memory codebase indexing (`src/services/projectContext.ts`) using Vite `import.meta.glob` (`?raw` eager imports) ingesting `.ts`, `.tsx`, `.css`, `.md`, `.json`, and config files with line-level chunking.
  - Implemented direct Google Gemini REST service (`src/services/professorAi.ts`) with dual-level Spanish output (`### 🎓 Respuesta corta para el profesor` and `### 🛠️ Explicación técnica`), strict grounding, and exact file:line citations.
  - Built `/profesor-ia` interactive page with chat stream, suggested evaluator questions, expandable "Archivos consultados" snippets, conversation reset, and API key management with security notices.
  - Integrated `/profesor-ia` into `Routing.tsx` and main `NavBar.tsx`.
  - Documented Gemini environment variables in `.env.example` and added ADR-020 in `docs/DECISIONS.md`.

- **Workstream: Combat Variety, Pause Menu, Elemental Upgrades & Progression**:
  - Implemented clearly visible red projectile identity (`#ef4444`) for all hostile shooter attacks, cleanly distinguishing enemy fire from player projectiles.
  - Implemented pause menu with `Escape` keyboard shortcut, freezing Rapier physics simulation and gameplay updates, with options to resume, restart run, or exit to character selection.
  - Accelerated XP curve with 75 baseline (`Math.round(75 * Math.pow(1.18, level - 1))`) preserving overflow.
  - All 5 playable characters and weapons implemented: Bonk (Hammer), Byte (Energy Orb), Tank (Axe), Nova (Nova Burst), Hex (Hex Chain), with weapon synergies.
  - Added 4 elemental upgrade paths (`fire`, `poison`, `shock`, `frost`) bringing total upgrade paths to 12 (8 base + 4 elemental) with Burn DoT, Poison DoT, Shock chain arcs, Frost slow, and rich elemental VFX status particles.

- **Workstream: Rotating Bosses, Permanent Passives, Chests & Frenzy Mode**:
  - Implemented rotating 5-boss roster every 10 rounds:
    - Round 10: Bonklord (hammer slam & radial shockwaves)
    - Round 20: Cindermaw (fire rings, meteor strikes, burning ground)
    - Round 30: Stormcoil (radial electric bursts, chain lightning, charged pulse)
    - Round 40: Venomatrix (toxic volleys, poison pools, acidic spray)
    - Round 50: Cryovex (frost novae, ice shards, blizzards)
    - Roster repeats every 50 rounds with incremented boss tiers and scaled HP/damage.
  - Implemented boss animation and telegraph pass with distinct anticipations, attacks, and recovery states across the full 5-boss visual asset roster: Bonklord SVG plus four WebP boss identities.
  - Boss loot system: boss defeats spawn exactly one item from `BOSS_LOOT_TABLE` (a recovery item or a permanent special passive pickup: `Overclock Core`, `Tesla Cell`, `Toxic Relic`, `Phoenix Fragment`) plus one separate Legendary Chest.
  - Chest reward architecture: interactive chests drop from boss defeats (guaranteed Legendary) and normal enemies (2.5% random chance, guaranteed Common every 20 normal kills; weighted Common 70 / Rare 25 / Legendary 5). Opening a chest displays `ChestRewardOverlay` offering upgrade choice selections (not passives) plus rarity bonuses (Common: upgrade choice; Rare: upgrade + 25 shield; Legendary: upgrade + 50 shield + 35 HP + 500 score).
  - Permanent special passives stored in `gameStore.passives` with up to 5 stacks: Overclock Core (+15% attack speed/stack), Tesla Cell (chain-lightning chance, 20% at stack 1, +10% per stack, cap 50%), Toxic Relic (enables poison, +25% poison DoT/stack), and Phoenix Fragment (stackable revive charges restoring 40% max HP with 2s temporary invulnerability).
  - Frenzy Mode: runtime horde mode featuring heightened spawn pressure and event-driven low-frequency HUD banner notifications.

- **Workstream: Progression Expansion, Balance, Relics, Secret Passives & Roster Expansion**:
  - Max-upgrade progression lock fixed: continuous uncapped player leveling, exact XP overflow preservation, safe clearing of impossible pending level-up selections, empty fallback defensive resume.
  - Expanded normal upgrades from 12 to 20 paths (MAX_UPGRADE_LEVEL = 5): added `regeneration`, `barrier`, `area`, `recovery`, `boss_hunter`, `executioner`, `precision`, `fortune` with full math-to-UI synchronization.
  - Redesigned Legendary Chests into dedicated Relic Vaults: offering up to 3 non-maxed special relics (never normal upgrades) + stat bonuses (+50 Shield, +35 HP, +500 Score). Automatic heal/shield/score fallback when all relics are maxed.
  - Expanded special relics from 4 to 8: retained Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment; added Aegis Capacitor (+15 max shield/stack), Apex Lens (+6% boss damage/stack), Echo Prism (+0.10x crit damage/stack), Gravity Seed (+8% area, +10% magnet/stack). Max stack = 5.
  - Secret passive fusions (4): event-driven binary unlocks with non-blocking toast notifications: Storm Engine, Venom Singularity, Radiant Bastion, Apex Echo.
  - Expanded playable roster from 5 to 8 survivors: added `rift` (Rift Disc, synergy Event Horizon), `fuse` (Pulse Mine, synergy Chain Reaction), and `lux` (Light Lance, synergy Solar Refraction) with procedural 3D models, animation timing, and designed Lucide React fallback presentation.
  - General balance pass: XP curve `Math.round(85 * Math.pow(1.19, level - 1))`, normal enemy HP scaling 9%/round, damage scaling +0.5/round, boss tier scaling 60% HP / 40% damage, Fortune-based chest drop scaling.
  - Expanded F8 Developer QA harness: controls for max/clear upgrades, XP after max, chest spawning, 8 relics (+1/reset), 4 secret recipe triggers, 8-character roster quick switch, live combat math inspector, and clean run reset.

## Current
- Progression Expansion, Balance, Relics, Secret Passives & Roster Expansion: Implementation complete; manual balance and runtime visual validation pending. Final external art asset pass deferred.


## Next
- Full Integration, End-to-End Verification & Academic Rubric Audit

## Known Issues
- Antigravity browser sandbox Playwright binary download returns 404 from upstream CDN; local Vite dev server and JSON Server fully verified via CLI and curl.


