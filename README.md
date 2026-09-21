# BONKAGEDDON

An original 3D survivor-like videogame built for an academic React Quiz.

Players choose a hero, navigate a hazardous arena, auto-cast weapon attacks against swarms of robotic enemies, collect emerald XP gems, and stack synergistic upgrades to survive against the Bonklord.

---

## Academic Context & Rubric Compliance

This project visibly satisfies the key requirements of the academic React Quiz:
- **Reusable Components**: `CharacterCard`, `HUDShell`, `NavBar`, `LoadingState`, `ErrorState`, and `GameScene`.
- **React Hooks**:
  - `useState`: Real local state management for asynchronous loading, error states, and UI interactions.
  - `useEffect`: Lifecycle data fetching from JSON Server with `AbortController` cancellation and cleanup.
  - `useRef`: High-frequency mutable references for Three.js scene meshes and Rapier rigid bodies.
- **React Router Navigation**: 5 distinct routes plus dynamic parameter routing and 404 fallback.
- **Data Consumption**: Real HTTP operations against a local JSON Server backend (GET `/characters`, GET `/scores`, and POST `/scores`).
- **State Coordination**: Clean separation between React local state and a lightweight Zustand store with selectors.

---

## Technology Stack

- **Runtime**: React 19, TypeScript, Vite
- **3D World & Physics**: Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
- **State Management**: Zustand (shared session state)
- **Routing**: React Router DOM (v7)
- **Icons & Styling**: Lucide React, Vanilla CSS (dark arcade theme)
- **Mock Persistence**: JSON Server (`db.json`)

---

## Project Structure

```text
├── public/
│   └── assets/           # Official original SVG asset pack (88 KB)
├── src/
│   ├── components/
│   │   ├── characters/   # CharacterCard
│   │   ├── game/         # HUDShell
│   │   └── ui/           # NavBar, LoadingState, ErrorState
│   ├── config/
│   │   └── assets.ts     # Centralized asset registry
│   ├── game/             # Pure game logic (enemy cap math, spawn rules)
│   ├── pages/            # Home, Characters, Game, Leaderboard, Instructions, NotFound
│   ├── routes/           # Routing with 5 primary routes
│   ├── scene/            # Three.js / Rapier 3D Scene, Arena, PlayerPlaceholder, Lighting
│   ├── services/         # Typed API service with fetch
│   ├── store/            # Zustand gameStore
│   ├── styles/           # Global arcade CSS
│   ├── types/            # Centralized domain types
│   ├── App.tsx
│   └── main.tsx
├── db.json               # JSON Server database (characters, upgrades, scores)
├── AGENTS.md             # AI Agent operating contract
├── PROJECT_STATUS.md     # Current phase and progress tracking
├── CURRENT_TASK.md       # Scope boundary for the next task
└── docs/DECISIONS.md     # Architecture Decision Records (ADR-001 - ADR-011)
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run JSON Server (Terminal 1)
```bash
npm run api
```
*JSON Server will start on `http://localhost:3001` serving `db.json`.*

### 3. Run Vite Development Server (Terminal 2)
```bash
npm run dev
```
*Vite will start the client on `http://localhost:5173`.*

---

## Available Routes

| Route | Description |
|---|---|
| `/` | Landing page with arcade branding and quick navigation |
| `/characters` | Character selection fetching live survivors via `GET /characters` |
| `/game/:characterId` | Dynamic 3D gameplay arena with Rapier physics and HUD |
| `/leaderboard` | Hall of records fetching scores via `GET /scores` |
| `/instructions` | Controls guide, mechanics, and upgrade encyclopedia |
| `*` | 404 error page with safe return navigation |

---

## Current Status & Next Steps

- **Current Phase**: **Phase 0 — Foundation & 3D Stack Setup** (Completed & Verified).
- **Controls Notice**: WASD movement and active enemy hordes are scheduled for **Phase 1** and **Phase 2**. In this phase, the 3D scene, Rapier physics world, lighting, character selection, and HUD shell are verified.
- **Next Task**: **Phase 1 — Player Movement + Camera Follow**.

---

## Asset Policy

All assets used in BONKAGEDDON are 100% original and stored under `public/assets/`. The custom asset bundle is ~88 KB, well below the 5 MB budget limit. Visuals are referenced through `src/config/assets.ts`.
# BOKAGEDDON
