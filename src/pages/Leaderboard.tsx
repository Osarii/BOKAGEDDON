import React, { useState, useEffect, useCallback } from "react";
import type { ScoreEntry } from "../types/game";
import { getScores } from "../services/api";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { Trophy, Medal, Skull, Sparkles, Clock } from "lucide-react";

export const Leaderboard: React.FC = () => {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback((signal?: AbortSignal) => {
    getScores(signal)
      .then((data) => {
        // Sort descending by score
        const sorted = [...data].sort((a, b) => b.score - a.score);
        setScores(sorted);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Could not retrieve scores from JSON Server.";
        setError(msg);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchScores(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchScores]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchScores();
  };

  return (
    <main className="container" style={{ padding: "3rem 1.5rem 5rem" }}>
      <header style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Trophy size={32} color="var(--accent-warm)" />
          <h1 style={{ fontSize: "2.5rem" }}>HALL OF BONKERS</h1>
        </div>
        <p style={{ maxWidth: "550px", margin: "0 auto" }}>
          Top surviving warriors recorded in the local hall of records.
        </p>
      </header>

      {isLoading && <LoadingState message="Retrieving leaderboard data..." />}

      {error && (
        <ErrorState
          title="Could Not Load Scores"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !error && scores.length === 0 && (
        <section
          className="glass-panel"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            padding: "3.5rem 2rem",
            textAlign: "center",
          }}
          aria-label="Empty Leaderboard"
        >
          <Medal size={48} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>No Recorded Runs Yet</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            The arena is waiting for its first champion. Play a run in future phases to
            submit your score to the board!
          </p>
          <div
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
            }}
          >
            Connected to JSON Server: /scores (0 records)
          </div>
        </section>
      )}

      {!isLoading && !error && scores.length > 0 && (
        <section
          className="glass-panel"
          style={{ maxWidth: "860px", margin: "0 auto", padding: "1.5rem", overflowX: "auto" }}
          aria-label="Leaderboard Rankings"
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Rank</th>
                <th style={{ padding: "0.75rem 1rem" }}>Player</th>
                <th style={{ padding: "0.75rem 1rem" }}>Survivor</th>
                <th style={{ padding: "0.75rem 1rem" }}>Score</th>
                <th style={{ padding: "0.75rem 1rem" }}>Level</th>
                <th style={{ padding: "0.75rem 1rem" }}>Kills</th>
                <th style={{ padding: "0.75rem 1rem" }}>Survived</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((entry, index) => (
                <tr
                  key={entry.id ?? index}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                    fontSize: "0.9rem",
                  }}
                >
                  <td style={{ padding: "1rem", fontWeight: 700, color: index === 0 ? "var(--accent-warm)" : "var(--text-primary)" }}>
                    #{index + 1}
                  </td>
                  <td style={{ padding: "1rem", fontWeight: 600 }}>{entry.playerName}</td>
                  <td style={{ padding: "1rem", textTransform: "capitalize", color: "var(--accent-energy)" }}>
                    {entry.characterId}
                  </td>
                  <td style={{ padding: "1rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent-warm)" }}>
                    {entry.score.toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem", fontFamily: "var(--font-mono)" }}>
                    <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {entry.level}
                  </td>
                  <td style={{ padding: "1rem", fontFamily: "var(--font-mono)", color: "var(--accent-danger)" }}>
                    <Skull size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {entry.kills}
                  </td>
                  <td style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    <Clock size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {Math.floor(entry.timeSurvivedSeconds / 60)}m {entry.timeSurvivedSeconds % 60}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
};
