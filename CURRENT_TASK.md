# Current Task

## Objective
Live n8n Verification + Screenshot + Final Rubric Audit

## Scope
- Import `n8n/bonkageddon-run-workflow.json` into a live n8n instance (local `http://localhost:5678` or cloud).
- Execute an end-to-end test run with `VITE_N8N_WEBHOOK_URL` configured in `.env`.
- Capture the live n8n execution canvas screenshot showing successful node execution and store at `docs/screenshots/n8n-execution.png`.
- Perform final Academic React Quiz rubric audit:
  - Demonstrable `useState` (loading, error, overlays, local input)
  - Demonstrable `useEffect` (cleanups, AbortControllers, window listeners)
  - Demonstrable `useRef` (Rapier bodies, Three.js meshes, mutable runtime)
  - Pure TypeScript math in `src/game/`
  - Zero external forbidden packages (no Supabase, Firebase, Tailwind, etc.)
  - Production build and lint exit 0

## Validation
- `npm run build`
- `npm run lint`
