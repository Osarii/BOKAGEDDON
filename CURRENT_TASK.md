# Current Task
 
## Objective
Phase 3 — n8n Webhook Integration + Audio / Polish + Final Rubric Audit

## Scope
- Centralized webhook dispatch service in `src/services/webhook.ts`
- Event triggers: Run Started, Level Up Reached, Boss Spawned, Game Over, Victory
- Audio/SFX polish using Web Audio API procedural synthesizers (zero external audio dependencies)
- Final Academic React Quiz rubric verification:
  - Demonstrable `useState` (loading, error, overlays, local input)
  - Demonstrable `useEffect` (cleanups, AbortControllers, window listeners)
  - Demonstrable `useRef` (Rapier bodies, Three.js meshes, mutable runtime)
  - Pure TypeScript math in `src/game/`
  - Zero external forbidden packages (no Supabase, Firebase, Tailwind, etc.)
  - Production build and lint exit 0

## Validation
- `npm run build`
- `npm run lint`
