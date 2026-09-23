# BONKAGEDDON Project Status

## Current Phase
Integrated Gameplay, Arena V2, Visual Overhaul & Documentation Sync

## Current Integrated State
- React 19 + Vite + TypeScript single-page game with React Router, Zustand, Three.js, React Three Fiber, Rapier, Web Audio API, JSON Server, and n8n.
- Routes implemented in `src/routes/Routing.tsx`: `/`, `/characters`, `/game/:characterId`, `/leaderboard`, `/instructions`, `/profesor-ia`, and `*` fallback 404.
- 8 playable survivors: Bonk, Byte, Tank, Nova, Hex, Rift, Fuse, Lux.
- 8 signature weapons: Hammer, Energy Orb, Cleaving Axe, Nova Burst, Hex Chain, Rift Disc, Pulse Mine, Light Lance.
- 8 weapon synergies: Meteor Slam, Prism Barrage, Cyclone Edge, Supernova, Hexstorm, Event Horizon, Chain Reaction, Solar Refraction.
- 20 normal upgrade paths, max tier 5.
- 8 stackable special relics: Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment, Aegis Capacitor, Apex Lens, Echo Prism, Gravity Seed.
- 4 secret passive fusions: Storm Engine, Venom Singularity, Radiant Bastion, Apex Echo.
- 4 normal enemy archetypes: Slime Bot, Runner Drone, Iron Brute, Beam Sentry.
- 5 rotating bosses: Bonklord, Cindermaw, Stormcoil, Venomatrix, Cryovex. The roster appears on rounds 10/20/30/40/50 and repeats every 50 rounds at higher tiers.
- Current arena is a spaceship / orbital battle-station combat deck.
- `ARENA_RADIUS = 44`; `ARENA_BOUNDARY_LIMIT = 42.4`; `HARD_ENEMY_CAP = 48`.
- Arena V2 uses procedural 3D presentation with preserved floor decals and gameplay collision/spawn data in `src/game/arenaLayout.ts`.
- Survivor, normal enemy, and boss in-world procedural visuals have been overhauled. Rift, Fuse, and Lux have dedicated procedural 3D models.
- Temporary custom asset budget for this visual-overhaul phase is 15 MB. Current checked public asset usage remains below that budget.

## Completed Workstreams
- React/Vite/TypeScript foundation and routing.
- JSON Server persistence: `GET /characters`, `GET /scores`, `POST /scores`.
- Dynamic route gameplay initialization for `/game/:characterId`.
- Mutable `GameRuntime` for high-frequency simulation and Zustand for visible HUD/session state.
- Endless rounds, quota pacing, intermissions, boss encounters, Frenzy mode, shields, recovery pickups, chests, Relic Vaults, relic stacks, and secret passives.
- Procedural Web Audio system with HUD mute/volume controls.
- n8n completed-run webhook workflow and frontend dispatch.
- Professor AI route (`/profesor-ia`) with local project context indexing.
- Arena V2 spaceship combat-deck presentation.
- Entity visual overhaul for all survivors, normal enemies, and bosses.
- Automated regression tests for core progression systems.

## Verification Baseline
- Existing verification workflow: `npm run lint`, `npm run build`, `npm test`, `git diff --check`.
- Runtime QA tooling: F8 Dev QA overlay and headless smoke scripts under `tools/dev/`.

## Known Manual Deliverables
- Classroom/demo browser walkthrough.
- Live n8n import/execution using the user's real n8n instance.
- n8n workflow screenshot after live execution.
