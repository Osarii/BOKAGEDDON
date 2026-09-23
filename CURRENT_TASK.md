# Current Task

## Objective
Establish the official playable character creation guidelines and production standard for BONKAGEDDON survivors.

## Status
Completed on branch `integration/visual-overhaul-v1`.

## Deliverables
- Created `docs/CHARACTER_CREATION_GUIDELINES.md` as the authoritative engineering and art-production reference for all future 3D GLB survivors.
- Standardized:
  - design philosophy (stylized hard-surface, silhouette readability from isometric camera);
  - grounding invariant (`feetMinY ≈ 0.000m`);
  - character scale and archetype mass conventions (Heavy, Standard, Agile, Hover);
  - triangle budget (8k–15k preferred, up to 20k max);
  - material rules (1–3 materials, low draw calls, hit flash / status tint preservation);
  - asset weight budget (< 200 KB target, < 1.2 MB max with compressed atlas);
  - GLB naming and coordinate conventions;
  - standardized rigging hierarchy;
  - 5 canonical animation clips (`Idle`, `Run`, `Attack`, `Hit`, `Death`);
  - dynamic velocity time-scale to eliminate foot sliding;
  - contact shadow alignment;
  - isometric camera readability zones;
  - color language and 4-tier palette hierarchy;
  - signature visual traits per survivor;
  - strict isolation of visual assets from gameplay math/balance;
  - separation of Rapier physics root (`CapsuleCollider args={[0.5, 0.38]}`) from visual offset (`-0.88m`);
  - Character Lab QA workflow (`/dev/character-lab`);
  - full 10-step production pipeline and quality gate checklist;
  - character-specific hover exceptions (Byte, Rift);
  - verified TANK V2 reference implementation specifications.
- Added cross-references in `AGENTS.md`, `PROJECT_STATUS.md`, `docs/DECISIONS.md`, and `docs/PLAYABLE_CHARACTER_CONTRACT.md`.

## Verification Plan
- `npm run test`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Inspect final diff and working tree.

## Out of Scope
- Gameplay, balance, weapons, or enemy logic modifications.
- Redesigning existing survivor models.
- Altering the approved `tank-v2.glb` asset.
