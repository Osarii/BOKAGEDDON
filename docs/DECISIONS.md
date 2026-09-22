# Architecture Decision Records (ADRs)

## ADR-001: React + TypeScript Foundation
- **Context**: The academic quiz project requires strict typing, scalable domain models, and maintainable state.
- **Decision**: Adopt React with TypeScript and strict compiler settings.
- **Consequences**: Compile-time safety across game mechanics, store actions, and API payloads; build failures enforce code quality.

## ADR-002: React Three Fiber (R3F) for 3D Game World
- **Context**: The game requires 3D rendering within a React single-page application.
- **Decision**: Use `@react-three/fiber` and `@react-three/drei` instead of managing raw WebGL contexts manually.
- **Consequences**: Declarative scene graph, seamless component composition, and integration with the React lifecycle.

## ADR-003: State Separation (React State vs. Zustand)
- **Context**: The rubric mandates visible demonstration of `useState` and `useEffect`, but shared session data needs cross-component coordination.
- **Decision**: Use `useState` for local component lifecycle (fetch loading, fetch errors, menu UI) and Zustand (`useGameStore`) with selective subscriptions for shared session state.
- **Consequences**: Complies with the academic rubric while preventing unnecessary rerenders.

## ADR-004: Isolation of High-Frequency Simulation Data
- **Context**: 60 FPS gameplay transforms and collision ticks trigger performance bottlenecks if stored in React state.
- **Decision**: High-frequency data (transforms, velocities, mutable cooldowns) lives in `useRef` and internal simulation structures; React state is updated only for low-frequency events (level up, death).
- **Consequences**: High, stable frame rates without React render churn.

## ADR-005: Selective Rapier Physics & Mathematical Arena Boundary
- **Context**: Rapier dynamic rigid bodies and collision meshes are computationally expensive when duplicated across hordes of enemies or complex circular wall segments.
- **Decision**: Apply `@react-three/rapier` selectively to the player character and flat arena floor collider. The circular arena boundary is enforced mathematically in X/Z space (`ARENA_BOUNDARY_LIMIT = 28.8`) with tangential outward velocity deflection to eliminate boundary vibration. Enemies and projectiles use lightweight vector distance math.
- **Consequences**: Optimal physics accuracy for player locomotion and vertical gravity without choking CPU cycles or risking tunneling through thin collider meshes.

## ADR-006: Bounded Enemy Population Scaling (Cap = 48)
- **Context**: Survivor-likes can easily experience memory and render degradation if spawns are uncapped.
- **Decision**: Enforce dynamic formula `Math.min(12 + (round - 1) * 3, 48)` with a strict hard cap of 48 concurrent enemies, scaled by round instead of player level.
- **Consequences**: Guarantees frame rate stability on standard desktop browsers while decoupling enemy pacing from player upgrade level.

## ADR-007: JSON Server for Academic Persistence
- **Context**: The MVP requires genuine GET and POST data consumption without complex cloud configurations.
- **Decision**: Use `json-server` on port 3001 pointing to `db.json`. Explicitly exclude Supabase, Firebase, and custom Express backends.
- **Consequences**: Fully local, reproducible, and compliant with academic grading standards.

## ADR-008: Local Player Identity Without Authentication
- **Context**: The project does not require authentication systems.
- **Decision**: Do not introduce login, sign-up, JWTs, or session cookies. Players enter an arcade handle on the game over screen.
- **Consequences**: Zero friction, zero security surface, focused entirely on gameplay.

## ADR-009: Pure Single-Player Scope
- **Context**: Multiplayer, WebSockets, or Socket.io introduce unnecessary complexity for a survivor-like quiz project.
- **Decision**: Restrict BONKAGEDDON strictly to single-player arena runs.
- **Consequences**: Clean deterministic game loops without network synchronization overhead.

## ADR-010: Original Visual Identity & Asset Integrity
- **Context**: The project must not copy Megabonk or commercial assets.
- **Decision**: All assets (characters, enemies, weapons, upgrades, audio, UI) are original creations stored in `public/assets/` under an optimized asset bundle of approximately 3.16 MB.
- **Consequences**: Full legal safety, unique branding, and minimal download footprint well below the 5 MB project limit.

## ADR-011: Original AI-Assisted Art Pipeline
- **Context**: Rapid creation of stylized arcade assets without violating third-party copyrights.
- **Decision**: Generated visual assets created specifically for BONKAGEDDON are approved for UI cards, HUD, and icons, with procedural low-poly primitives for 3D gameplay.
- **Consequences**: High visual polish, rapid iteration, and cohesive arcade styling.

## ADR-012: Mutable GameRuntime Architecture for 60 FPS Simulation
- **Context**: High-frequency entity transforms (enemies, projectiles, pickups, player position) cause severe React render thrashing if stored in Zustand or React state.
- **Decision**: Centralize all mutable 60 FPS gameplay data in a lightweight `GameRuntime` instance accessed via React `useRef`. Zustand is strictly reserved for session events and visible HUD state.
- **Consequences**: Eliminates React render overhead during entity updates while maintaining pure TypeScript math logic in `src/game/`.

## ADR-013: InstancedMesh Pooling for Enemies & Projectiles
- **Context**: Duplicating meshes and geometries across dozens of enemies and projectiles degrades WebGL draw call performance.
- **Decision**: Pool enemies across 4 archetypes (`slime`, `runner`, `brute`, `shooter`) and projectiles using Three.js `InstancedMesh`. Update instance matrices during `useFrame` using module-scoped matrix scratchpads.
- **Consequences**: Constant minimal draw calls, reusable geometries and materials, zero GC pressure.

## ADR-014: Exact XP Overflow & Queued Upgrade Selection
- **Context**: Large XP gains can bridge multiple levels simultaneously; dropping excess XP ruins pacing and violates progression expectations.
- **Decision**: Exact XP surplus is preserved across level thresholds. Multiple level-ups are queued via `pendingLevelUps`, with `gameStatus` maintaining `"levelup"` one upgrade selection at a time until all pending choices are consumed.
- **Consequences**: Fair, transparent player progression without loss of earned experience.

## ADR-015: Per-Run Score Save Guard with Reset Lifecycle
- **Context**: Game Over or Victory screens can trigger re-renders or repeat submissions, duplicating scores in `db.json`.
- **Decision**: Protect score submissions using a per-run `hasSavedScoreRef` guard that is reset upon `handlePlayAgain`.
- **Consequences**: Exactly one score record per completed run is transmitted to `POST /scores`.

## ADR-016: Procedural Web Audio API Sound Synthesizers
- **Context**: External audio packs and MP3/WAV assets bloat repository size, incur HTTP latency, and risk browser autoplay lockouts.
- **Decision**: Implement a zero-dependency procedural audio synthesizer in `src/audio/gameAudio.ts` using the browser's native Web Audio API (oscillators, sweeps, exponential gain envelopes). Include user volume/mute controls persisted to `localStorage` and anti-spam cooldown throttles per SFX.
- **Consequences**: Instantaneous audio playback, zero external asset weight, guaranteed failure-safe operation under browser autoplay policies.

## ADR-017: n8n Completed-Run Webhook Telemetry
- **Context**: Academic evaluation requires integration with automation tooling (n8n) without introducing a permanent custom backend or blocking local gameplay.
- **Decision**: Dispatch completed run payloads (`characterId`, `score`, `kills`, `level`, `timeSurvivedSeconds`, computed `classification`) asynchronously to an importable n8n webhook workflow (`n8n/bonkageddon-run-workflow.json`). Decouple webhook dispatch from local JSON Server persistence with dedicated execution guards.
- **Consequences**: Clean separation of concerns; if n8n is offline or unconfigured, single-player runs and local leaderboard persistence continue completely uninterrupted.

## ADR-018: Endless Rounds, Shield & Recovery System
- **Context**: Decoupling player progression (XP/Level/Upgrades) from world progression (enemy pacing, scaling, boss rounds) requires an endless round progression system with bounded wave lengths, shield absorption mechanics, and contact recovery items.
- **Decision**:
  1. Separate `level` (XP-driven) and `round` (run-progression-driven).
  2. Implement finite round quotas (early: 14-20, pre-boss: 22-32, late: capped at 40) followed by 3.5s intermissions.
  3. [Superseded by ADR-021] Tiered boss encounters every 10 rounds across a rotating 5-boss roster with scaled HP and damage. Defeating a boss continues the endless run without triggering `victory`.
  4. Mitigated damage is absorbed by `shield` first (max 100), remainder damages health.
  5. Recovery pickups (`medkit-emergency`, `medkit-case`, `shield-potion`, `shield-battery`) collected strictly by contact without magnet pull, with full-HP/shield consumption guards.
  6. Camera look-ahead smoothed with exponential damping and boundary tangential movement deflection to eliminate physics jitter.
- **Consequences**: Endless replayability with bounded frame-time budgets, stable camera tracking, and fair survivability mechanics.

## ADR-020: Project-Aware Professor AI Assistant with Local Vite Raw Ingestion
- **Context**: Evaluators and professors need an interactive way to inspect, query, and verify the codebase architecture and academic rubric requirements without heavy backend infrastructure or external SDK overhead.
- **Decision**:
  1. Build a client-side `/profesor-ia` interface using direct REST `fetch` to Google Gemini API (`generateContent`) with zero SDK dependencies.
  2. Implement an in-memory retrieval engine (`src/services/projectContext.ts`) using Vite `import.meta.glob` with `{ query: '?raw', eager: true }` ingesting source files, documentation, and configuration.
  3. Divide files into line-indexed chunks (40-line window, 10-line overlap) and rank by lexical, synonym, and path relevance.
  4. Enforce dual-level Spanish output (`### 🎓 Respuesta corta para el profesor` and `### 🛠️ Explicación técnica`), explicit fact-checking disclaimers for unverified elements, and exact file:line citations.
  5. Clearly document browser-side API key exposure; prioritize `.env.local` (git-ignored) for local classroom demos or ephemeral manual entry in the UI.
- **Consequences**: Grounded, transparent code analysis in real-time with zero backend infrastructure requirements and strict academic accountability.

## ADR-021: Rotating Five-Boss Roster and 50-Round Tier Cycle
- **Context**: Relying exclusively on Bonklord every 10 rounds created visual and gameplay monotony in late-game endless survival.
- **Decision**:
  1. Implement a rotating 5-boss encounter cycle: Round 10 (Bonklord), Round 20 (Cindermaw), Round 30 (Stormcoil), Round 40 (Venomatrix), Round 50 (Cryovex).
  2. Repeat the entire 50-round roster cyclically at incrementing boss tiers (`bossTier = Math.floor((round - 1) / 50) + 1`), scaling HP, damage, and projectile frequency.
  3. Provide each boss archetype with unique procedural 3D models, telegraph visual effects, attack sequences, and official asset decals.
- **Consequences**: Rich encounter variety across endless runs while preserving bounded enemy population caps.

## ADR-022: Boss-Exclusive Permanent Passive Item System
- **Context**: Player progression beyond standard upgrades benefits from high-impact milestone rewards from boss defeats (`BOSS_LOOT_TABLE`) rather than temporary timed buffs.
- **Decision**:
  1. Convert special items (`Overclock Core`, `Tesla Cell`, `Toxic Relic`, `Phoenix Fragment`) into permanent passive collectibles stored in `gameStore.passives` (stacking up to 5 times).
  2. Overclock Core provides +15% attack speed per stack; Tesla Cell grants chain-lightning chance (20% at stack 1, +10% per additional stack, cap 50%); Toxic Relic enables poison DoT and adds +25% poison damage per stack; Phoenix Fragment grants stackable revives restoring 40% max HP with 2s invulnerability.
  3. Special passives drop as 3D world pickups via `BOSS_LOOT_TABLE` rolls on boss defeat, rendered with official WebP billboards and tracked in the HUD passive inventory.
- **Consequences**: Meaningful boss victory incentives with durable run progression without breaking existing stat calculations.

## ADR-023: Chest Reward Architecture
- **Context**: Boss defeats and combat milestones need an engaging, rewarding loot presentation that does not interfere with 60 FPS physics.
- **Decision**:
  1. Introduce interactive chests with exact rarity tiers: Common, Rare, Legendary. Boss defeats drop one guaranteed Legendary Chest (alongside one `BOSS_LOOT_TABLE` pickup). Normal enemies have a 2.5% drop chance and guaranteed Common every 20 kills (weighted Common 70 / Rare 25 / Legendary 5).
  2. Opening a chest pauses active simulation and displays `ChestRewardOverlay` offering upgrade choice selections (not passives) plus rarity bonuses (Common: upgrade; Rare: upgrade + 25 shield; Legendary: upgrade + 50 shield + 35 HP + 500 score).
  3. Rewards cleanly integrate with Zustand player state and resume gameplay seamlessly.
- **Consequences**: Polished arcade feel, clear milestone gratification, and zero frame stutter.

## ADR-024: Frenzy Runtime Mode with Simulation-Driven State and Low-Frequency UI Sync
- **Context**: Extended rounds require dynamic pacing spikes ("Horde/Frenzy" waves) without creating React render overhead.
- **Decision**:
  1. Maintain Frenzy state (active status, timer, enemy spawn multiplier) directly inside `GameRuntime` mutable simulation refs.
  2. Synchronize visible UI indicators (HUD banner notification) at low frequency rather than per-frame.
  3. Elevate enemy movement speed and spawn pacing during Frenzy intervals.
- **Consequences**: High-intensity survival spikes at full 60 FPS without garbage collection or React thrashing.

## ADR-025: Expanded Progression and Terminal Max-State Behavior
- **Context**: Reaching maximum tiers on all normal upgrades previously resulted in an empty Level Up overlay loop, blocking game progression. In addition, 12 upgrade paths capped build variety prematurely around Round 18.
- **Decision**:
  1. Expand normal upgrade paths from 12 to 20 (MAX_UPGRADE_LEVEL = 5), adding Regeneration, Barrier Matrix, Area Amplifier, Field Medic, Boss Hunter, Execution Protocol, Critical Power, and Fortune.
  2. Enforce continuous, uncapped numerical player leveling while preserving exact XP overflow.
  3. When all available normal upgrades are maxed, clamp `pendingLevelUps = 0` and do not transition `gameStatus` to `"levelup"`.
  4. Provide defensive cleanup in `LevelUpOverlay` so that any stale empty state clears cleanly upon resume.
  5. Rebalance XP curve: `Math.round(85 * Math.pow(1.19, level - 1))`, shifting near-complete normal build targets to Rounds 35–50.
- **Consequences**: Continuous endless progression, zero modal progression locks, and rich late-game build diversity.

## ADR-026: Legendary Relic Vault and Secret Passive Fusion Architecture
- **Context**: Legendary Chests previously offered standard upgrades, failing to differentiate late-game milestone rewards from normal level-ups. In addition, relic synergies were implicit rather than rewarded.
- **Decision**:
  1. Redesign Legendary Chests into dedicated Relic Vaults offering up to 3 non-maxed special relics (never normal upgrades) + grants +50 Shield, +35 HP, +500 Score.
  2. Expand special relics from 4 to 8: add Aegis Capacitor, Apex Lens, Echo Prism, Gravity Seed (all max 5 stacks).
  3. Add 4 binary Secret Passive Fusions (Storm Engine, Venom Singularity, Radiant Bastion, Apex Echo) evaluated in an event-driven manner when relic stacks change.
  4. Keep locked recipes hidden from HUD; show prominent non-blocking unlock toasts and active icons once unlocked.
  5. Provide automatic full-heal/shield/score fallback when all relics are maxed.
- **Consequences**: Clear distinction between upgrades and relics, exciting emergent build combos, and robust terminal reward states.

## ADR-027: Eight-Survivor Signature Weapon Roster
- **Context**: A 5-character roster limited tactical diversity across survivor playstyles.
- **Decision**:
  1. Expand roster to 8 survivors by adding RIFT (Phase Disc Skirmisher / Rift Disc / Event Horizon), FUSE (Demolition Zone Controller / Pulse Mine / Chain Reaction), and LUX (Precision Light Striker / Light Lance / Solar Refraction).
  2. Implement each weapon with distinct combat geometry: RIFT (piercing & returning disc), FUSE (delayed positional cluster mine), LUX (instant hitscan beam with critical refraction).
  3. Render survivors with distinct procedural 3D silhouettes, attack anticipation, movement lean, and recovery animations.
  4. Maintain designed Lucide React and CSS fallback presentations in `CharacterCard` and HUD until the final external art pass.
- **Consequences**: 8 distinct gameplay identities with signature weapons and synergies, fully compatible with all 20 upgrades, 8 relics, and 4 secret passives.
