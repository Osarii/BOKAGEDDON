# Current Task

## Objective
Synchronize user-facing documentation and the Instructions page with the current integrated BONKAGEDDON game state.

## Status
Documentation sync completed on branch `docs/current-state-sync`.

## Scope
- Update `README.md`, `PROJECT_STATUS.md`, `CURRENT_TASK.md`, `docs/ASSET_INTEGRATION.md`, and `src/pages/Instructions.tsx`.
- Correct stale claims about:
  - playable survivor count;
  - signature weapon count;
  - upgrade/relic/passive counts;
  - rotating boss roster;
  - current spaceship combat-deck arena;
  - `ARENA_RADIUS = 44`;
  - `ARENA_BOUNDARY_LIMIT = 42.4`;
  - current route list;
  - current test suite;
  - visual-overhaul status;
  - temporary 15 MB custom asset budget.
- Keep documentation factual and grounded in current code/config.

## Verification Plan
- `npm run lint`
- `npm run build`
- `npm test`
- `git diff --check`
- Inspect final diff and working tree.

## Out of Scope
- Gameplay changes.
- Arena, combat, player, enemy, boss, runtime, or balance code changes.
- n8n live execution or screenshot creation.
