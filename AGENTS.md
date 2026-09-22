# BONKAGEDDON — Agent Instructions & Architectural Contract

## 1. Project Objective & Scope

BONKAGEDDON is an original 3D survivor-like videogame built for an academic React Quiz.

- **Core Gameplay Scope**:
  - 5 playable characters: Bonk, Byte, Tank, Nova, Hex
  - 1 circular arena (radius 30, boundary 28.8)
  - 4 normal enemy archetypes: Slime, Runner, Brute, Shooter
  - Rotating boss roster:
    - Round 10: Bonklord
    - Round 20: Cindermaw
    - Round 30: Stormcoil
    - Round 40: Venomatrix
    - Round 50: Cryovex
    - Roster repeats every 50 rounds at the next boss tier
  - 5 starting weapons: Hammer, Energy Orb, Axe, Nova Burst, Hex Chain + Weapon Synergies
  - 8 original/base upgrades plus 4 elemental upgrade paths (Fire, Poison, Shock, Frost)
  - Permanent boss-exclusive special passives (Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment)
  - Chest reward system (Common, Rare, Epic, Legendary)
  - Frenzy runtime horde mode
  - Shield absorption & recovery pickups system
  - local JSON Server leaderboard
  - Endless arcade survival loop

- **Original Identity**:
  All assets, characters, names, UI, and mechanics must remain original.

Do NOT copy Megabonk assets, code, characters, maps, UI, audio, or other commercial game resources.

---

## 2. Approved Stack & Strict Exclusions

### Approved

- React 19
- Vite
- TypeScript
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/rapier`
- Zustand
- React Router DOM
- Lucide React
- Vanilla CSS
- JSON Server
- Web Audio API
- n8n

### Strictly Excluded

Do NOT introduce unless the user explicitly changes the architecture:

- Supabase
- Firebase
- custom Node / Express backend
- authentication
- login / registration
- multiplayer
- WebSockets
- Socket.IO
- Redux
- Next.js
- TailwindCSS
- paid external APIs

---

## 3. Architecture Layers

### Layer A — React UI

React owns:

- routes
- character selection
- HUD
- menus
- instructions
- leaderboard
- upgrade cards
- level-up overlays
- Game Over / Victory overlays
- loading/error states
- HTTP requests
- audio controls

### Layer B — 3D Game World

React Three Fiber / Three.js owns:

- Canvas
- camera
- lighting
- arena
- player rendering
- enemies
- projectiles
- XP pickups
- particles
- procedural environment
- visual effects

### Layer C — Game Logic

Pure TypeScript under `src/game/` owns:

- enemy-cap calculations
- progression
- spawn rates
- damage formulas
- targeting rules
- runtime entity contracts
- other reusable game calculations

Do not hide reusable pure gameplay math inside React components when it belongs in `src/game/`.

---

## 4. State Management Contract

### React `useState`

Use for local component state such as:

- loading
- errors
- local inputs
- local UI toggles
- submission state

Never mutate React state directly.

### React `useEffect`

Use only for genuine side effects such as:

- fetching
- event listeners
- cleanup
- timers outside the frame simulation
- synchronization with external systems

Always clean up resources when required.

Use `AbortController` for cancellable requests where appropriate.

### React `useRef`

Use for:

- Three.js meshes
- Rapier bodies
- keyboard state
- mutable simulation state
- cooldowns
- timers
- runtime entity structures
- high-frequency values

### Zustand

`useGameStore` owns shared UI/session state such as:

- selectedCharacterId
- health
- maxHealth
- shield
- maxShield
- round
- roundStatus
- score
- kills
- level
- XP
- XP requirement
- upgrades
- boss UI state
- visible timer
- gameStatus

Use Zustand selectors:

```ts
useGameStore((state) => state.score);
```

---

## 5. High-Frequency Runtime Contract

High-frequency gameplay simulation must remain outside React render state.

The current runtime/ref architecture should be reused for:

- enemies
- projectiles
- XP pickups
- shockwaves
- player world position
- attack cooldowns
- spawn timers
- other per-frame simulation data

Do NOT call React setters or Zustand actions every frame unless there is a proven requirement.

Visible UI values may be synchronized at a lower frequency.

Examples:

- survival timer: approximately 1 Hz
- boss HP: only when meaningfully changed
- score / kills: event-driven

---

## 6. 3D & Physics Strategy

Use a single primary React Three Fiber `<Canvas>` for gameplay.

Rapier is used selectively.

Good uses:

- player body/controller
- arena floor
- selected world collisions

Do NOT automatically create Rapier dynamic rigid bodies for:

- all enemies
- all projectiles
- all XP pickups

Prefer lightweight vector mathematics and radius/distance checks for large entity counts.

The arena currently uses mathematical X/Z boundary enforcement where appropriate (radius 30, limit 28.8).

Do not replace it with expensive physics walls without a demonstrated need.

---

## 7. Enemy Population & Performance

Permanent enemy limits:

```ts
BASE_ENEMY_CAP = 12
ENEMIES_PER_LEVEL = 3
HARD_ENEMY_CAP = 48
```

Active enemy count is scaled by `round` (independent of player level) and must never exceed:

```ts
Math.min(
  BASE_ENEMY_CAP + (round - 1) * 3,
  HARD_ENEMY_CAP
)
```

Bosses spawn every 10 rounds with scaled HP/damage across a rotating 5-boss roster (Round 10 Bonklord, Round 20 Cindermaw, Round 30 Stormcoil, Round 40 Venomatrix, Round 50 Cryovex). The roster repeats every 50 rounds at the next boss tier. Defeating any boss advances to the next round in an endless run without setting gameStatus to victory.

Before spawning, always respect available slots.

High-frequency enemy transforms must not trigger React renders.

Prefer:

mutable runtime entities
useFrame
shared geometry
shared materials
InstancedMesh
reusable Three.js vectors/matrices

Avoid unnecessary allocations inside the frame loop.

8. Asset Policy

Official BONKAGEDDON assets live under:

public/assets/

with categories including:

characters/
enemies/
weapons/
upgrades/
pickups/
ui/

Runtime asset paths are centralized in:

src/config/assets.ts

Do not reference parent-directory development asset folders at runtime.

The Git repository must remain self-contained.

Asset strategy

SVG assets are primarily used for:

UI
character cards
HUD
upgrades
branding
enemy identity / decals where appropriate

Gameplay entities should remain lightweight procedural 3D objects unless a deliberate optimized alternative is introduced.

Shared enemy textures/materials must be reused.

Do not create one texture or material per enemy.

Size limit

Total custom asset size must remain under:

5 MB

Prefer SVG and procedural content.

Do not download large replacement asset packs.

9. Audio Policy

Prefer lightweight procedural audio using the Web Audio API.

Do not add large sound packs unless explicitly approved.

Reuse one AudioContext.

Handle browser autoplay restrictions safely.

Audio must fail gracefully if the browser does not allow playback yet.

Avoid uncontrolled sound concurrency during large combat events.

10. Development Discipline

Permanent principles:

REUSE FIRST.

SMALLEST WORKING CHANGE.

PRESERVE WORKING BEHAVIOR.

NO UNRELATED REFACTOR.

NO FEATURE CREEP.

Workflow:

INSPECT
→ RESEARCH / REUSE
→ PLAN
→ IMPLEMENT
→ VERIFY
→ DOCUMENT
→ STOP

Do not redesign working architecture merely because another design is possible.

Do not create speculative abstractions.

Do not create duplicate helpers, services, types, or game systems.

11. Serena

Use Serena when semantic navigation saves context.

Good uses:

locating symbols
finding references
tracing Zustand actions/selectors
tracing runtime interactions
understanding cross-file relationships
finding ownership of existing logic

Do not use Serena unnecessarily for:

known Markdown files
one-line CSS changes
known constants
files whose exact path is already known

Do not read the entire repository when targeted semantic inspection is sufficient.

If Serena is unavailable, continue with targeted file inspection.

Do not install another copy.

12. Ponytail

Follow Ponytail principles:

REUSE FIRST
SMALLEST WORKING CHANGE
PRESERVE WORKING BEHAVIOR
NO UNRELATED REFACTOR

Before creating a new:

component
hook
helper
store action
type
service
configuration object

check whether an existing implementation should be reused or extended.

13. RTK

Use RTK to reduce noisy terminal output when available.

Good uses:

npm install
npm run build
npm run lint
tests
large diffs
verbose logs

Do not wrap tiny commands such as:

pwd
git branch --show-current
git status --short

If RTK is unavailable, use the normal command.

Do not install or reconfigure RTK.

14. ECC Workflow Principles

Do NOT install or copy ECC into BONKAGEDDON.

Use its useful development philosophy:

INSPECT
→ RESEARCH / REUSE
→ PLAN
→ IMPLEMENT
→ VERIFY
→ DOCUMENT
→ STOP

Treat context as a limited resource.

Persist durable knowledge in:

AGENTS.md
PROJECT_STATUS.md
CURRENT_TASK.md
docs/DECISIONS.md

Do not repeatedly rediscover documented project information.

15. Multi-Agent Coordination

BONKAGEDDON may be developed by multiple coding agents simultaneously.

Each active agent must work in its own Git branch/worktree.

Assume another agent may be modifying another workstream.

Before editing

Run:

git status --short
git branch --show-current

Then read:

AGENTS.md
PROJECT_STATUS.md
CURRENT_TASK.md
docs/DECISIONS.md

Inspect only files relevant to the assigned task.

File ownership

Each prompt/workstream must explicitly define:

files the agent owns
files it may read
files it must not edit

Task-specific ownership belongs in the task prompt, not permanently in this file.

If a required change belongs to another active agent's workstream:

STOP and report the dependency.

Do not edit the other agent's file.

High-risk shared files

These files require explicit ownership when multiple agents are active:

src/store/gameStore.ts
src/scene/GameScene.tsx
src/game/config.ts
src/game/runtime.ts
src/types/game.ts
src/pages/Game.tsx
src/routes/*
package.json
package-lock.json

Only one active workstream should modify a high-risk shared file at a time.

16. Git Safety

Never use destructive Git operations unless the user explicitly requests them.

Forbidden during normal agent work:

git reset --hard
git clean -fd
git push --force

Do not revert another agent's work.

Do not checkout over uncommitted work.

Do not merge another agent's branch.

Do not automatically resolve merge conflicts by discarding changes.

The user/orchestrator controls integration.

Each agent commits only its own scoped work.

17. Dependency Rules

Do not add dependencies unless the assigned task genuinely requires one.

Do not edit:

package.json
package-lock.json

unless the task explicitly permits dependency changes.

Prefer existing platform/browser capabilities before adding libraries.

18. Verification Contract

Before declaring a coding task complete:

Run:

npm run build
npm run lint
git status --short

Inspect the meaningful diff.

Do not claim runtime verification if the application was not actually run.

Do not claim browser verification if browser execution was unavailable.

If a test cannot be performed, state that clearly.

19. Documentation Responsibilities

AGENTS.md
→ permanent development contract.

PROJECT_STATUS.md
→ factual current project progress.

CURRENT_TASK.md
→ next/current milestone scope.

docs/DECISIONS.md
→ durable architectural decisions.

Do not duplicate large amounts of information across all four documents.

Update only the documentation relevant to the task.

20. Parallel Integration

Agents must not merge each other's branches.

Expected workflow:

Agent A branch/worktree
        +
Agent B branch/worktree
        ↓
independent verification
        ↓
user/orchestrator review
        ↓
controlled merge
        ↓
full build + lint + runtime regression test

A completed agent workstream must stop after its scoped commit unless explicitly instructed otherwise.