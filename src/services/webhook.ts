import type { CharacterId, GameStatus, ScoreEntry } from "../types/game";

export type RunClassification = "LEGENDARY" | "HIGH_SCORE" | "NORMAL_RUN";
export type RunOutcome = Extract<GameStatus, "gameover" | "victory">;

export interface CompletedRunPayload extends Omit<ScoreEntry, "id"> {
  event: "bonkageddon.run.completed";
  outcome: RunOutcome;
  classification: RunClassification;
}

export interface RunWebhookResult {
  ok: boolean;
  skipped: boolean;
  classification: RunClassification;
  error?: string;
}

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "";

export function classifyRun(run: {
  outcome: RunOutcome;
  score: number;
  level: number;
  kills: number;
}): RunClassification {
  if (run.outcome === "victory" || run.score >= 50000 || run.kills >= 500) return "LEGENDARY";
  if (run.score >= 10000 || run.level >= 10 || run.kills >= 100) return "HIGH_SCORE";
  return "NORMAL_RUN";
}

export function buildCompletedRunPayload(
  score: Omit<ScoreEntry, "id">,
  outcome: RunOutcome
): CompletedRunPayload {
  return {
    event: "bonkageddon.run.completed",
    outcome,
    classification: classifyRun({
      outcome,
      score: score.score,
      level: score.level,
      kills: score.kills,
    }),
    ...score,
    characterId: score.characterId as CharacterId,
  };
}

export async function sendRunWebhook(
  score: Omit<ScoreEntry, "id">,
  outcome: RunOutcome
): Promise<RunWebhookResult> {
  const payload = buildCompletedRunPayload(score, outcome);
  if (!WEBHOOK_URL) {
    return { ok: false, skipped: true, classification: payload.classification };
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`n8n webhook failed (${response.status}: ${response.statusText})`);
    }
    return { ok: true, skipped: false, classification: payload.classification };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      classification: payload.classification,
      error: err instanceof Error ? err.message : "n8n webhook failed.",
    };
  }
}
