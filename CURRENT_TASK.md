# Current Task

## Objective
Project-aware Professor AI assistant (`/profesor-ia`).

## Status
Completed & Verified.

## Scope Completed
1. **Local Project Context Engine (`src/services/projectContext.ts`)**:
   - Ingests textual project files via Vite `import.meta.glob` (`?raw` eager imports):
     - `src/**/*.{ts,tsx,css}`, `README.md`, `AGENTS.md`, `PROJECT_STATUS.md`, `CURRENT_TASK.md`
     - `docs/**/*.md`, `n8n/**/*.md`, `package.json`, `db.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.*`, `.env.example`, `n8n/**/*.json`.
   - Excludes binaries, assets, `node_modules`, `dist`, and lockfiles.
   - Splits files into line-indexed chunks with 40-line window and 10-line overlap.
   - Ranked search scoring with keyword normalization, synonym mapping, symbol definition boosts, and file path matching.

2. **Direct Gemini REST Service (`src/services/professorAi.ts`)**:
   - Direct `fetch` to Google Gemini API (`generateContent`) with zero SDK dependencies.
   - Dual-level academic output enforcement:
     - `### 🎓 Respuesta corta para el profesor`
     - `### 🛠️ Explicación técnica`
   - Strict code grounding, disclaimers for unverified elements, and exact file:line citations.
   - Supports `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`, and client demo entry.

3. **Professor AI View (`src/pages/ProfessorAI.tsx`)**:
   - BONKAGEDDON dark arcade styling with glass panels and glowing accents.
   - Chat history with user and assistant message bubbles.
   - Suggested evaluation questions curated strictly for current branch features (no unmerged features referenced).
   - Expandable "Archivos consultados" accordion showing file paths, line ranges, and snippet previews.
   - "Limpiar conversación" button and API key configuration dialog with security disclosures.

4. **Navigation & Routing**:
   - Registered `/profesor-ia` route in `Routing.tsx`.
   - Added "Profesor IA" link with `Bot` icon to main `NavBar.tsx`.
   - Documented environment variables and security notice in `.env.example`.

## Validation
- `npm run lint` -> 0 errors, 0 warnings
- `npm run build` -> production build exit 0
- Dev server running and verified on `/profesor-ia` (HTTP 200)
