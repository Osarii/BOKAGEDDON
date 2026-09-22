# BONKAGEDDON

An original 3D survivor-like arcade videogame built with React 19, Three.js, React Three Fiber, Rapier, and Zustand for an academic React Quiz.

Players choose a hero, navigate a hazardous circular arena, auto-cast weapon attacks against swarms of robotic enemies, collect emerald XP gems, stack synergistic upgrades, and defeat the legendary boss **BONKLORD**.

---

## Gameplay & Features

- **5 Playable Characters & Weapons**:
  - **BONK (Balanced Bruiser)**: Armed with the Hammer, triggering circular shockwave slams with area-of-effect damage and knockback.
  - **BYTE (Fast Ranged Specialist)**: Armed with the Energy Orb, launching high-velocity homing projectiles with multi-shot spreads.
  - **TANK (Slow Armored Juggernaut)**: Armed with dual Orbital Axes that continuously orbit and cleave contacting enemies.
  - **NOVA (Astral Caster)**: Armed with Nova Burst, releasing radiating cosmic bursts that expand outward.
  - **HEX (Void Controller)**: Armed with Hex Chain, unleashing arcing void chains that tether and damage enemy clusters.
- **4 Normal Enemy Archetypes + 5 Rotating Bosses**:
  - **Slime Bot**: Bouncy purple dome with organic squash-and-stretch wobble and official face decal.
  - **Runner Drone**: Supersonic orange stealth dart with swept wings, top fin, and jet exhaust.
  - **Iron Brute**: Heavy crimson tank chassis with dual shoulder horns/exhausts and glowing visor.
  - **Beam Sentry (Shooter)**: Floating cyan diamond turret that maintains distance and fires red energy beams.
  - **Rotating Boss Roster (Round-Based Encounters every 10 Rounds)**:
    - **Round 10 — BONKLORD**: Obsidian titan with golden crown, volcanic chest, warhammer slams, and radial stomp shockwaves.
    - **Round 20 — CINDERMAW**: Magma behemoth unleashing fire rings, meteor strikes, and persistent burning zones.
    - **Round 30 — STORMCOIL**: Overcharged construct discharging radial electric bolts, chain lightning, and pulse waves.
    - **Round 40 — VENOMATRIX**: Acidic arachnid launching toxic projectile volleys and corrosive pools.
    - **Round 50 — CRYOVEX**: Glacial colossus summoning frost novae, homing ice shards, and blizzard zones.
    - *Boss cycle repeats every 50 rounds at incremented boss tiers with scaled HP and damage.*
- **Progressive Upgrades, Elemental Paths & Permanent Passives**:
  - **12 Total Upgrade Paths**: 8 base upgrades (Damage, Haste, Speed, Vitality, Armor, Magnet, Critical, Multishot) plus 4 elemental paths (Fire, Poison, Shock, Frost) with visual status effects.
  - **Permanent Boss-Exclusive Passives**: Defeating bosses and opening chests awards legendary passives (`Overclock Core`, `Tesla Cell`, `Toxic Relic`, `Phoenix Fragment`).
  - **Chest Reward System**: Tiered reward chests (Common, Rare, Epic, Legendary) drop upon boss defeat.
  - **Frenzy Mode**: High-intensity horde mode triggering elevated enemy rushes and dynamic audio shifts.
  - **Exact XP Overflow Preservation**: Surplus XP bridges level thresholds cleanly and queues multiple upgrade choices one selection at a time without experience loss.
- **Procedural Web Audio API Sound Effects**:
  - 100% lightweight procedural synthesizers (hammer slams, energy orbs, axe swings, enemy hits, enemy deaths, boss spawn/death, player damage, level-up fanfares).
  - Built-in volume slider and instant mute toggle persisted to `localStorage`. Zero external audio assets.
- **Academic Persistence & Leaderboard**:
  - Local JSON Server mock API (`GET /characters`, `GET /scores`, `POST /scores`).
  - Single-submission per-run save guard resetting cleanly upon "Play Again".
- **n8n Automated Webhook Integration**:
  - Dispatches completed run telemetry (`characterId`, `score`, `kills`, `level`, `timeSurvivedSeconds`, `classification`) to an automated n8n webhook on run completion.

---

## Academic Context & Rubric Compliance

This project visibly satisfies the key requirements of the academic React Quiz:
- **Reusable Components**: `CharacterCard`, `HUDShell`, `NavBar`, `LoadingState`, `ErrorState`, `LevelUpOverlay`, `PauseOverlay`, `ChestRewardOverlay`, `GameOverOverlay`, `VictoryOverlay`, and `GameScene`.
- **React Hooks**:
  - `useState`: Real local state management for asynchronous loading, error states, and UI modal states.
  - `useEffect`: Lifecycle data fetching from JSON Server with `AbortController` cancellation and cleanup.
  - `useRef`: High-frequency mutable references for Rapier bodies, Three.js meshes, and the 60 FPS `GameRuntime` simulation.
- **React Router Navigation**: 5 distinct routes plus dynamic parameter routing and 404 fallback.
- **Data Consumption**: Real HTTP operations against a local JSON Server backend (GET `/characters`, GET `/scores`, and POST `/scores`).
- **State Coordination**: Clean separation between React local state, a lightweight Zustand store for visible session UI, and a mutable `GameRuntime` ref for 60 FPS entity transforms.
- **Strict Exclusions**: No Supabase, Firebase, TailwindCSS, Next.js, Redux, multiplayer, WebSockets, or paid external APIs.

---

## Technology Stack

- **Runtime & Build**: React 19, TypeScript, Vite
- **3D World & Physics**: Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
- **State Management**: Zustand (shared session state)
- **Routing**: React Router DOM (v7)
- **Icons & Styling**: Lucide React, Vanilla CSS (dark arcade theme)
- **Audio**: Web Audio API (procedural synthesizers)
- **Automation / Webhook**: n8n workflow integration
- **Mock Persistence**: JSON Server (`db.json`)

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
*JSON Server will start on `http://localhost:3001` serving `db.json` with characters, upgrades, and scores.*

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
| `/characters` | Character selection fetching live warriors via `GET /characters` |
| `/game/:characterId` | Dynamic 3D gameplay arena with R3F canvas, Rapier physics, and HUD |
| `/leaderboard` | Hall of records fetching persisted run scores via `GET /scores` |
| `/instructions` | Controls guide, combat mechanics, enemy guide, and upgrade encyclopedia |
| `*` | 404 error page with safe return navigation |

---

## n8n Webhook Integration

BONKAGEDDON includes an importable, production-ready n8n workflow for completed run telemetry.

### Workflow Details
- **Workflow File**: [`n8n/bonkageddon-run-workflow.json`](n8n/bonkageddon-run-workflow.json)
- **Payload Contract**: Documented in [`n8n/PAYLOAD_CONTRACT.md`](n8n/PAYLOAD_CONTRACT.md)
- **Architecture & Setup**: Documented in [`docs/N8N_INTEGRATION.md`](docs/N8N_INTEGRATION.md)

### Setup Steps
1. Import `n8n/bonkageddon-run-workflow.json` into your local or cloud n8n instance.
2. Activate the workflow and copy its production Webhook URL.
3. Add the webhook URL to your `.env` file:
   ```env
   VITE_N8N_WEBHOOK_URL="http://localhost:5678/webhook/bonkageddon/run-completed"
   ```
4. Restart the Vite dev server (`npm run dev`).
5. Complete a run (Victory or Game Over). The run results will be dispatched to n8n, normalized, classified (`LEGENDARY`, `HIGH_SCORE`, or `NORMAL_RUN`), and acknowledged with a JSON response.

> **Note on Workflow Screenshot**:
> The workflow screenshot for academic evaluation belongs in `docs/screenshots/n8n-execution.png` (or `n8n/screenshot.png`). If no live n8n instance is running during local evaluation, the importable workflow JSON remains fully verifiable offline.

---

## Asset Policy

All visual assets used in BONKAGEDDON are 100% original, self-contained, and stored under `public/assets/` (`characters/`, `enemies/`, `weapons/`, `upgrades/`, `pickups/`, `ui/`). The custom asset bundle is approximately 3.16 MB, well below the 5 MB project limit. Asset paths are centralized in `src/config/assets.ts`.
