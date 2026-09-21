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

## ADR-005: Selective Rapier Physics
- **Context**: Rapier rigid bodies are computationally expensive when duplicated across hordes of enemies.
- **Decision**: Apply `@react-three/rapier` selectively to the player character, arena floor, and arena boundary walls. Enemies and projectiles use lightweight vector math and distance checks.
- **Consequences**: Optimal physics accuracy where it matters without choking CPU cycles on large enemy counts.

## ADR-006: Bounded Enemy Population Scaling (Cap = 90)
- **Context**: Survivor-likes can easily experience memory and render degradation if spawns are uncapped.
- **Decision**: Enforce dynamic formula `Math.min(18 + (level - 1) * 4, 90)` with a strict hard cap of 90 concurrent enemies.
- **Consequences**: Guarantees frame rate stability on standard desktop browsers.

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
- **Decision**: All assets (characters, enemies, weapons, upgrades, audio, UI) are original creations stored in `public/assets/` under an 88 KB lightweight SVG pack.
- **Consequences**: Full legal safety, unique branding, and minimal download footprint (< 5 MB).

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
