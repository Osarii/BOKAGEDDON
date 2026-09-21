# BONKAGEDDON — Agent Instructions & Architectural Contract

## 1. Project Objective & Scope
BONKAGEDDON is an original 3D survivor-like videogame built for an academic React Quiz.
- **Frozen MVP**: 3 playable characters (Bonk, Byte, Tank), 1 circular arena, 4 normal enemy archetypes (Slime, Runner, Brute, Shooter), 1 boss (Bonklord), 3 starting weapons (Hammer, Energy Orb, Axe), 8 stackable upgrades, local JSON Server leaderboard, 5–8 minute runs.
- **Original Identity**: All assets, characters, names, UI, and mechanics are original. Do NOT copy Megabonk or commercial game assets.

## 2. Approved Stack & Strict Exclusions
- **Approved**: React 19, Vite, TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, Zustand, React Router DOM, Lucide React, Vanilla CSS, JSON Server.
- **Strictly Excluded**: Supabase, Firebase, custom Node/Express backends, authentication, logins, multiplayer, WebSockets, Redux, Next.js, TailwindCSS, paid external APIs.

## 3. Architecture Layers
- **Layer A (React UI)**: Routes, character select, HUD, menus, instructions, leaderboard, upgrade cards, overlays, loading/error states, fetch requests.
- **Layer B (3D Game World)**: React Three Fiber Canvas, camera, lighting, arena, player rendering, future instanced enemies, particles, environment.
- **Layer C (Game Logic)**: Pure TypeScript in `src/game/` (enemy cap, progression math, spawn rates, damage formulas, targeting rules). Never hide pure math inside React components.

## 4. State Management Contract
- **React `useState`**: Local component states (loading, error, local menu toggles). Never mutate state directly.
- **React `useEffect`**: Genuine side effects (fetching data, timer cleanups, event listeners). Always clean up with `AbortController` or remove listeners. Never trigger synchronous `setState` cascading loops.
- **React `useRef`**: Three.js meshes, Rapier rigid bodies, pressed keys, mutable simulation time/cooldowns, and high-frequency data.
- **Zustand (`useGameStore`)**: Shared UI/session state (`selectedCharacterId`, `health`, `maxHealth`, `score`, `kills`, `level`, `xp`, `xpRequired`, `gameStatus`). Always use selectors (`useGameStore((s) => s.value)`). Never store 60fps entity transforms or 90 enemy positions in Zustand.

## 5. 3D & Physics Strategy (Rapier)
- Single `<Canvas>` with an elevated third-person perspective.
- Rapier physics is used **selectively**: arena floor collider, arena walls, and player controller.
- Do **NOT** create Rapier dynamic rigid bodies for 90 enemies or individual projectiles. Use vector mathematics and radius/distance checks for enemy movement and combat hits.

## 6. Enemy Population & Spawning Caps
- `BASE_ENEMY_CAP = 18`
- `ENEMIES_PER_LEVEL = 4`
- `HARD_ENEMY_CAP = 90`
- Active enemy count must **NEVER** exceed `Math.min(18 + (level - 1) * 4, 90)`.

## 7. Asset Policy
- Official assets are stored under `public/assets/` (`characters/`, `enemies/`, `weapons/`, `upgrades/`, `pickups/`, `ui/`).
- Runtime asset URLs are centralized in `src/config/assets.ts`. Never reference parent/external folders.
- SVGs are for UI and HUD. Gameplay uses lightweight procedural 3D geometries in Three.js.
- Total custom asset pack size must strictly remain **under 5 MB**.

## 8. Development Discipline
- **Reuse First**: Check existing types, helpers, and components before creating new abstractions.
- **Smallest Working Change**: Make focused, incremental changes. No speculative abstractions or unrelated refactors.
- **Workflow**: Inspect -> Plan -> Implement -> Verify -> Document -> Stop.
- **Verification**: `npm run build` and `npm run lint` must pass with code 0 before concluding any phase.
