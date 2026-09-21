/**
 * BONKAGEDDON — Professor AI Gemini REST Service
 *
 * Connects directly to Google Gemini API via browser fetch (zero SDK dependencies).
 * Sends grounded codebase context chunks alongside professor questions to generate
 * dual-level academic explanations in Spanish with exact file:line citations.
 *
 * SECURITY NOTE:
 * In client-side Vite SPAs, VITE_* environment variables and keys entered in the
 * browser are exposed to client DevTools/network. For local classroom demos, use
 * .env.local (git-ignored) or provide an ephemeral key in the UI.
 */

import { searchProjectContext, type ProjectChunk } from "./projectContext";

export interface ProfessorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    preview: string;
  }>;
}

const LOCAL_STORAGE_KEY_NAME = "bonkageddon_gemini_api_key";
const DEFAULT_MODEL = "gemini-3.6-flash";

/**
 * Resolves the active Gemini API key from:
 * 1. User manual input in UI (persisted in localStorage for demo convenience)
 * 2. Vite environment variable VITE_GEMINI_API_KEY
 */
export function getActiveGeminiApiKey(): string {
  const localKey = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEY_NAME) : null;
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim();
  }
  return (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
}

/**
 * Stores or clears a custom API key in browser localStorage.
 */
export function setActiveGeminiApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (!key || key.trim().length === 0) {
    localStorage.removeItem(LOCAL_STORAGE_KEY_NAME);
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY_NAME, key.trim());
  }
}

/**
 * Resolves the configured Gemini model.
 */
export function getActiveGeminiModel(): string {
  return (import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL).trim();
}

/**
 * System prompt that enforces academic persona, Spanish responses, strict code grounding,
 * dual-level explanation headers, and file:line citations.
 */
const SYSTEM_INSTRUCTION = `Eres el "Profesor IA" de BONKAGEDDON, un asistente experto y riguroso en la arquitectura, código y decisiones de diseño del videojuego 3D BONKAGEDDON (construido con React 19, Three.js, React Three Fiber, Rapier, Zustand, Vite, Web Audio API, n8n y JSON Server).

Tu rol es responder preguntas de profesores universitarios y evaluadores técnicos sobre la implementación real del proyecto.

NORMAS OBLIGATORIAS:
1. IDIOMA: Responde SIEMPRE en español con tono técnico, formal, académico y claro.
2. ESTRUCTURA OBLIGATORIA: Tu respuesta DEBE incluir obligatoriamente estas dos secciones con sus encabezados Markdown exactos:
   ### 🎓 Respuesta corta para el profesor
   (Resumen ejecutivo de 2 a 4 oraciones. Directo, conciso y de alto impacto conceptual, resumiendo el enfoque arquitectónico y la solución adoptada).

   ### 🛠️ Explicación técnica
   (Explicación detallada del flujo, componentes involucrados, interfaces, fórmulas, patrones de diseño o funciones relevantes halladas en el código).

3. RIGOR Y DISTINCIÓN DE HECHOS:
   - Distingue claramente los hechos verificados en los fragmentos de código provistos del repositorio BONKAGEDDON de conceptos generales de React / TypeScript / Three.js.
   - Si una pregunta indaga sobre una funcionalidad, variable o dato que NO aparece en los fragmentos consultados del código, debes declarar EXPLÍCITAMENTE: "⚠️ Este aspecto no se encuentra implementado / no se puede verificar en el código actual del repositorio". NUNCA inventes funciones, constantes ni configuraciones inexistentes.

4. CITAS OBLIGATORIAS:
   - Cita siempre las rutas exactas de los archivos y los rangos de líneas pertinentes donde se encuentra la implementación (por ejemplo: \`src/store/gameStore.ts:L189-L217\`, \`AGENTS.md:L50-L75\`, \`src/audio/gameAudio.ts:L25-L60\`).`;

/**
 * Sends a professor's question to the Gemini REST API with relevant codebase chunks.
 */
export async function askProfessorAI(
  question: string,
  history: ProfessorMessage[] = []
): Promise<{
  content: string;
  sources: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    preview: string;
  }>;
}> {
  const apiKey = getActiveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "No se encontró una clave de API de Gemini. Configura VITE_GEMINI_API_KEY en .env.local o ingresa tu clave en el panel superior."
    );
  }

  const model = getActiveGeminiModel();

  // 1. Search and rank project chunks relevant to the question
  const { formattedContext, chunks } = searchProjectContext(question, {
    maxChunks: 7,
    maxChars: 12000,
  });

  const sources = chunks.map((c: ProjectChunk) => {
    const lines = c.content.split("\n");
    const preview = lines.slice(0, 4).join("\n");
    return {
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
      preview,
    };
  });

  // 2. Format conversation turns for the Gemini REST endpoint
  // Map previous messages to Gemini contents format (user / model)
  const previousTurns = history.slice(-6).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Current turn with grounded codebase context
  const currentTurn = {
    role: "user",
    parts: [
      {
        text:
          "=== FRAGMENTOS DEL CÓDIGO FUENTE DE BONKAGEDDON ===\n\n" +
          formattedContext +
          "\n\n==================================================\n" +
          "PREGUNTA DEL PROFESOR:\n" +
          question,
      },
    ],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [...previousTurns, currentTurn],
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 2048,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Ignore json parse error on non-json response
      }

      if (response.status === 400 || response.status === 403) {
        throw new Error(
          `Error de autenticación con Gemini (${response.status}): ${errorMessage}. Verifica que la API Key sea válida y tenga la API habilitada.`
        );
      } else if (response.status === 429) {
        throw new Error(
          `Límite de cuota excedido (Rate limit 429). Por favor espera unos segundos antes de realizar otra consulta.`
        );
      } else if (response.status >= 500) {
        throw new Error(
          `Error temporal en los servidores de Google Gemini (${response.status}). Intenta nuevamente en unos instantes.`
        );
      } else {
        throw new Error(`Error de Gemini: ${errorMessage}`);
      }
    }

    const data = await response.json();
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No se recibió contenido en la respuesta de Gemini.";

    return {
      content: candidateText,
      sources,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error(
          "La solicitud a Gemini tardó demasiado tiempo (>35s) y fue cancelada. Verifica tu conexión a internet.",
          { cause: err }
        );
      }
      throw err;
    }
    throw new Error("Ocurrió un error inesperado al consultar a Gemini.", { cause: err });
  }
}
