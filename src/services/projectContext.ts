/**
 * BONKAGEDDON Project Context Engine
 *
 * Ingests project source files using Vite's `import.meta.glob` with raw text imports.
 * Splits files into line-indexed chunks and performs ranked search to provide grounded
 * repository context to the Professor AI assistant.
 */

export interface ProjectChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  lineCount: number;
}

export interface SearchResult {
  chunk: ProjectChunk;
  score: number;
  matchedTerms: string[];
}

export interface ProjectContextResponse {
  chunks: ProjectChunk[];
  formattedContext: string;
  citedFiles: Array<{ filePath: string; startLine: number; endLine: number }>;
}

// Ingest textual project files on-demand (eager: false) to prevent bundling all source files into initial JS
const rawFiles = import.meta.glob<string>(
  [
    "/src/**/*.ts",
    "/src/**/*.tsx",
    "/src/**/*.css",
    "/README.md",
    "/AGENTS.md",
    "/PROJECT_STATUS.md",
    "/CURRENT_TASK.md",
    "/docs/**/*.md",
    "/n8n/**/*.md",
    "/package.json",
    "/db.json",
    "/vite.config.ts",
    "/tsconfig*.json",
    "/eslint.config.*",
    "/.env.example",
    "/n8n/**/*.json",
  ],
  { query: "?raw", import: "default", eager: false }
);

// Common stop words in Spanish and English to filter out from query tokenization
const STOP_WORDS = new Set([
  "de", "la", "el", "en", "para", "y", "o", "un", "una", "los", "las", "con",
  "por", "que", "se", "es", "del", "al", "como", "su", "sus", "lo", "mas", "pero",
  "sobre", "este", "esta", "estos", "estas", "cual", "cuales", "donde", "cuando",
  "the", "and", "or", "in", "to", "for", "of", "with", "by", "is", "are", "a",
  "an", "at", "from", "that", "this", "these", "those", "how", "what", "where",
  "which", "when", "why", "who", "does", "did", "can", "could", "should", "would",
]);

// Semantic keyword mapping: Spanish terms to English code identifiers and concepts
const SYNONYM_MAP: Record<string, string[]> = {
  jefe: ["bonklord", "boss", "tier", "stomp", "shockwave"],
  jefes: ["bonklord", "boss", "tier"],
  boss: ["bonklord", "boss", "tier", "stomp"],
  ronda: ["round", "rounds", "quota", "intermission", "wave"],
  rondas: ["round", "rounds", "quota", "intermission", "wave", "endless"],
  oleada: ["round", "wave", "quota", "intermission"],
  oleadas: ["round", "wave", "quota"],
  arma: ["weapon", "weapons", "synergies", "hammer", "orb", "axe", "burst", "chain"],
  armas: ["weapon", "weapons", "synergies", "synergy"],
  sinergia: ["synergy", "synergies", "supernova", "thunder", "vortex"],
  sinergias: ["synergy", "synergies", "weaponSynergies"],
  mejora: ["upgrade", "upgrades", "vitality", "damage", "swiftness", "magnet"],
  mejoras: ["upgrade", "upgrades", "UPGRADE_DETAILS"],
  escudo: ["shield", "maxShield", "addShield", "shield_potion", "shield_battery"],
  escudos: ["shield", "maxShield"],
  vida: ["health", "maxHealth", "heal", "baseHp", "hp"],
  salud: ["health", "maxHealth", "heal", "hp"],
  curacion: ["heal", "medkit_emergency", "medkit_case", "recovery"],
  audio: ["audio", "gameAudio", "webaudio", "sound", "oscillator", "play"],
  sonido: ["audio", "gameAudio", "sfx", "webaudio"],
  musica: ["audio", "gameAudio", "volume", "muted"],
  n8n: ["n8n", "webhook", "telemetry", "classification", "payload", "workflow"],
  webhook: ["webhook", "n8n", "hasSentWebhookRef", "dispatchCompletedRunWebhook"],
  telemetria: ["webhook", "n8n", "classification", "telemetry"],
  personaje: ["character", "characters", "bonk", "byte", "tank", "nova", "hex"],
  personajes: ["character", "characters", "selectedCharacterId", "roster"],
  limite: ["boundary", "arena", "limit", "tangential", "ARENA_BOUNDARY_LIMIT"],
  arena: ["arena", "boundary", "radius", "circular", "floor"],
  colision: ["collision", "boundary", "rapier", "rigid", "deflection"],
  vibracion: ["jitter", "vibration", "damping", "lookahead", "tangential"],
  camara: ["camera", "cameracontroller", "lookahead", "damping"],
  rendimiento: ["runtime", "useframe", "instancedmesh", "perf", "allocations"],
  fps: ["runtime", "gameRuntime", "useframe", "60", "transforms"],
  rerender: ["rerender", "useRef", "gameRuntime", "useGameStore", "zustand"],
  estado: ["zustand", "useGameStore", "gameStatus", "gameState"],
  store: ["zustand", "useGameStore", "gameStore"],
  puntaje: ["score", "leaderboard", "addKill", "hasSavedScoreRef"],
  puntuacion: ["score", "leaderboard", "scores", "json-server"],
  marcador: ["leaderboard", "score", "scores", "table"],
  servidor: ["json-server", "db.json", "api", "port 3001"],
  bd: ["db.json", "scores", "characters", "upgrades"],
  config: ["config", "game_config", "constants"],
  configuracion: ["config", "constants", "vite", "env"],
};

/**
 * Parses all ingested raw files into discrete, line-numbered chunks.
 * Chunks use a 40-line window with 10-line overlap to preserve context across boundaries.
 */
async function buildProjectChunks(): Promise<ProjectChunk[]> {
  const chunks: ProjectChunk[] = [];
  const entries = Object.entries(rawFiles);

  for (const [rawPath, loader] of entries) {
    if (typeof loader !== "function") continue;

    // Normalize path by stripping leading slash
    const cleanPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;

    // Do not index minified bundles, lockfiles or media
    if (cleanPath.includes("node_modules") || cleanPath.includes("dist")) continue;

    let rawContent: string;
    try {
      rawContent = await loader();
    } catch {
      continue;
    }
    if (typeof rawContent !== "string") continue;

    const lines = rawContent.split(/\r?\n/);
    const totalLines = lines.length;

    // Small files (< 45 lines) form a single chunk
    if (totalLines <= 45) {
      chunks.push({
        id: `${cleanPath}:L1-L${totalLines}`,
        filePath: cleanPath,
        startLine: 1,
        endLine: totalLines,
        content: rawContent,
        lineCount: totalLines,
      });
      continue;
    }

    // Larger files: sliding window of 40 lines with 10 lines overlap (step of 30)
    const windowSize = 40;
    const stepSize = 30;

    for (let start = 0; start < totalLines; start += stepSize) {
      const end = Math.min(start + windowSize, totalLines);
      const chunkLines = lines.slice(start, end);
      const startLine = start + 1;
      const endLine = end;

      chunks.push({
        id: `${cleanPath}:L${startLine}-L${endLine}`,
        filePath: cleanPath,
        startLine,
        endLine,
        content: chunkLines.join("\n"),
        lineCount: chunkLines.length,
      });

      if (end >= totalLines) break;
    }
  }

  return chunks;
}

// Module-level memoized chunk index
let cachedChunks: ProjectChunk[] | null = null;

export async function getProjectChunks(): Promise<ProjectChunk[]> {
  if (!cachedChunks) {
    cachedChunks = await buildProjectChunks();
  }
  return cachedChunks;
}

/**
 * Tokenizes user query and extracts normalized terms + relevant synonyms
 */
export function extractQueryTerms(query: string): { primaryTerms: string[]; expandedTerms: string[] } {
  const normalized = query.toLowerCase();
  // Extract alphanumeric sequences of 3+ chars
  const words = normalized.match(/[a-z0-9_$-]{3,}/g) || [];

  const primaryTerms: string[] = [];
  const expandedSet = new Set<string>();

  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      primaryTerms.push(word);
      const synonyms = SYNONYM_MAP[word];
      if (synonyms) {
        synonyms.forEach((s) => expandedSet.add(s));
      }
    }
  }

  return {
    primaryTerms,
    expandedTerms: Array.from(expandedSet),
  };
}

/**
 * Searches the project chunks and ranks them by relevance to the question.
 *
 * Scoring algorithm:
 * - Exact full-phrase match in chunk content: +25
 * - File path matches query term / synonym: +10 per term
 * - Primary token occurrences: +3 each (max 15 per term)
 * - Synonym token occurrences: +1.5 each (max 9 per term)
 * - Key symbol definitions (export, function, interface, class, markdown #): +5
 * - Term density bonus: + (unique_matched_terms * 4)
 */
export async function searchProjectContext(
  query: string,
  options: { maxChunks?: number; maxChars?: number } = {}
): Promise<ProjectContextResponse> {
  const maxChunks = options.maxChunks ?? 8;
  const maxChars = options.maxChars ?? 14000;

  const chunks = await getProjectChunks();
  const { primaryTerms, expandedTerms } = extractQueryTerms(query);
  const normalizedQuery = query.toLowerCase().trim();

  // If query had no meaningful terms, return foundational architecture overviews
  if (primaryTerms.length === 0) {
    const fallback = chunks
      .filter((c) => c.filePath === "PROJECT_STATUS.md" || c.filePath === "AGENTS.md" || c.filePath === "README.md")
      .slice(0, 4);

    return {
      chunks: fallback,
      formattedContext: formatChunksForPrompt(fallback),
      citedFiles: fallback.map((c) => ({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
      })),
    };
  }

  const scoredResults: SearchResult[] = [];

  for (const chunk of chunks) {
    let score = 0;
    const lowerContent = chunk.content.toLowerCase();
    const lowerPath = chunk.filePath.toLowerCase();
    const matchedTerms: string[] = [];

    // 1. Exact phrase match
    if (normalizedQuery.length >= 6 && lowerContent.includes(normalizedQuery)) {
      score += 25;
      matchedTerms.push(normalizedQuery);
    }

    // 2. File path match
    for (const term of primaryTerms) {
      if (lowerPath.includes(term)) {
        score += 10;
        matchedTerms.push(`path:${term}`);
      }
    }
    for (const syn of expandedTerms) {
      if (lowerPath.includes(syn)) {
        score += 6;
        matchedTerms.push(`path:${syn}`);
      }
    }

    // 3. Primary token matches in content
    const uniqueMatchedInChunk = new Set<string>();

    for (const term of primaryTerms) {
      let count = 0;
      let pos = 0;
      while ((pos = lowerContent.indexOf(term, pos)) !== -1) {
        count++;
        pos += term.length;
        if (count >= 5) break; // cap per term
      }

      if (count > 0) {
        score += count * 3;
        uniqueMatchedInChunk.add(term);
        matchedTerms.push(term);

        // Check if term is near an export, function or header
        if (
          lowerContent.includes(`function ${term}`) ||
          lowerContent.includes(`const ${term}`) ||
          lowerContent.includes(`interface ${term}`) ||
          lowerContent.includes(`type ${term}`) ||
          lowerContent.includes(`export const ${term}`) ||
          lowerContent.includes(`# ${term}`) ||
          lowerContent.includes(`## ${term}`)
        ) {
          score += 6;
        }
      }
    }

    // 4. Expanded synonym matches in content
    for (const syn of expandedTerms) {
      if (!uniqueMatchedInChunk.has(syn) && lowerContent.includes(syn)) {
        score += 3;
        uniqueMatchedInChunk.add(syn);
        matchedTerms.push(`syn:${syn}`);
      }
    }

    // 5. Multi-term density bonus
    if (uniqueMatchedInChunk.size >= 2) {
      score += uniqueMatchedInChunk.size * 5;
    }

    if (score > 0) {
      scoredResults.push({ chunk, score, matchedTerms });
    }
  }

  // Sort by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  // Diversity filter: max 2 chunks per single file
  const fileChunkCounts: Record<string, number> = {};
  const selected: ProjectChunk[] = [];
  let currentChars = 0;

  for (const res of scoredResults) {
    const filePath = res.chunk.filePath;
    const count = fileChunkCounts[filePath] || 0;

    if (count >= 2) continue; // limit to 2 chunks per file

    const chunkLength = res.chunk.content.length;
    if (currentChars + chunkLength > maxChars && selected.length >= 3) {
      break;
    }

    selected.push(res.chunk);
    fileChunkCounts[filePath] = count + 1;
    currentChars += chunkLength;

    if (selected.length >= maxChunks) break;
  }

  // If no chunks scored (e.g. obscure query), include project status summary
  if (selected.length === 0) {
    const fallback = chunks
      .filter((c) => c.filePath === "PROJECT_STATUS.md" || c.filePath === "AGENTS.md")
      .slice(0, 3);
    return {
      chunks: fallback,
      formattedContext: formatChunksForPrompt(fallback),
      citedFiles: fallback.map((c) => ({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
      })),
    };
  }

  return {
    chunks: selected,
    formattedContext: formatChunksForPrompt(selected),
    citedFiles: selected.map((c) => ({
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
    })),
  };
}

/**
 * Formats array of project chunks into a clean prompt text block with clear delimiters.
 */
function formatChunksForPrompt(chunks: ProjectChunk[]): string {
  return chunks
    .map(
      (c) =>
        `==================================================\n` +
        `ARCHIVO: ${c.filePath} (Líneas ${c.startLine} a ${c.endLine})\n` +
        `==================================================\n` +
        c.content
    )
    .join("\n\n");
}
