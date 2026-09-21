import type { Character, ScoreEntry } from "../types/game";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch all playable characters from JSON Server.
 */
export async function getCharacters(signal?: AbortSignal): Promise<Character[]> {
  const response = await fetch(`${BASE_URL}/characters`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch characters (${response.status}: ${response.statusText})`);
  }
  return response.json();
}

/**
 * Fetch a single character by ID from JSON Server.
 */
export async function getCharacter(id: string, signal?: AbortSignal): Promise<Character> {
  const response = await fetch(`${BASE_URL}/characters/${id}`, { signal });
  if (!response.ok) {
    throw new Error(`Character "${id}" not found (${response.status}: ${response.statusText})`);
  }
  return response.json();
}

/**
 * Fetch high scores from JSON Server.
 */
export async function getScores(signal?: AbortSignal): Promise<ScoreEntry[]> {
  const response = await fetch(`${BASE_URL}/scores`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch scores (${response.status}: ${response.statusText})`);
  }
  return response.json();
}

/**
 * Save a new run score to JSON Server.
 */
export async function saveScore(score: Omit<ScoreEntry, "id">): Promise<ScoreEntry> {
  const response = await fetch(`${BASE_URL}/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...score,
      date: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save score (${response.status}: ${response.statusText})`);
  }
  return response.json();
}
