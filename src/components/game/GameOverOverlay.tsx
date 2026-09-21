import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { saveScore } from "../../services/api";
import { gameAudio } from "../../audio/gameAudio";
import { sendRunWebhook, type RunClassification } from "../../services/webhook";
import { Skull, Trophy, Sparkles, Clock, RotateCcw, Check, Users } from "lucide-react";

interface GameOverOverlayProps {
  onPlayAgain: () => void;
  hasSavedScoreRef: React.RefObject<boolean>;
  hasSentWebhookRef: React.RefObject<boolean>;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  onPlayAgain,
  hasSavedScoreRef,
  hasSentWebhookRef,
}) => {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const score = useGameStore((s) => s.score);
  const kills = useGameStore((s) => s.kills);
  const level = useGameStore((s) => s.level);
  const timeSurvivedSeconds = useGameStore((s) => s.timeSurvivedSeconds);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId) || "bonk";

  const [playerName, setPlayerName] = useState("Survivor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<{
    ok: boolean;
    skipped: boolean;
    classification: RunClassification;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (gameStatus === "gameover") gameAudio.play("gameOver");
  }, [gameStatus]);

  if (gameStatus !== "gameover") return null;

  const minutes = Math.floor(timeSurvivedSeconds / 60);
  const seconds = timeSurvivedSeconds % 60;

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSavedScoreRef.current) return;

    setIsSubmitting(true);
    setSaveError(null);
    setWebhookResult(null);

    const completedRun = {
      playerName: playerName.trim() || "Survivor",
      characterId: selectedCharacterId,
      score,
      kills,
      level,
      timeSurvivedSeconds,
      date: new Date().toISOString(),
    };

    try {
      if (!hasSavedScoreRef.current) {
        hasSavedScoreRef.current = true;
        await saveScore(completedRun);
        setSaveSuccess(true);
      }
    } catch (err: unknown) {
      hasSavedScoreRef.current = false;
      const msg = err instanceof Error ? err.message : "Failed to record score to JSON Server.";
      setSaveError(msg);
    }

    try {
      if (!hasSentWebhookRef.current) {
        hasSentWebhookRef.current = true;
        const result = await sendRunWebhook(completedRun, "gameover");
        setWebhookResult(result);
        if (!result.ok && !result.skipped) hasSentWebhookRef.current = false;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(5, 7, 12, 0.9)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.5rem",
      }}
      role="dialog"
      aria-label="Game Over Screen"
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: "560px",
          width: "100%",
          padding: "2.5rem 2rem",
          textAlign: "center",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          boxShadow: "0 0 50px rgba(239, 68, 68, 0.25)",
        }}
      >
        <Skull size={48} color="var(--accent-danger)" style={{ marginBottom: "0.5rem" }} />
        <h2 style={{ fontSize: "2.4rem", color: "var(--accent-danger)", letterSpacing: "0.04em" }}>
          SURVIVOR DEFEATED
        </h2>
        <p style={{ marginBottom: "2rem" }}>
          You fell in the arena. Your sacrifice has been tallied in the hall of records.
        </p>

        {/* Run Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
            textAlign: "left",
          }}
        >
          <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              <Trophy size={12} style={{ display: "inline", marginRight: 4, color: "var(--accent-warm)" }} />
              Final Score
            </span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-warm)", fontFamily: "var(--font-mono)" }}>
              {score.toLocaleString()}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              <Skull size={12} style={{ display: "inline", marginRight: 4, color: "var(--accent-danger)" }} />
              Enemies Crushed
            </span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-danger)", fontFamily: "var(--font-mono)" }}>
              {kills}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              <Sparkles size={12} style={{ display: "inline", marginRight: 4, color: "var(--accent-energy)" }} />
              Level Reached
            </span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-energy)", fontFamily: "var(--font-mono)" }}>
              Tier {level}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "0.85rem 1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              <Clock size={12} style={{ display: "inline", marginRight: 4, color: "var(--text-muted)" }} />
              Time Survived
            </span>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Score Submission Form */}
        <form onSubmit={handleSubmitScore} style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your survivor handle"
              disabled={isSubmitting || saveSuccess}
              maxLength={20}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "rgba(15, 20, 32, 0.9)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isSubmitting || saveSuccess}
              style={{ whiteSpace: "nowrap" }}
            >
              {saveSuccess ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : isSubmitting ? (
                "Saving..."
              ) : (
                "Record Score"
              )}
            </button>
          </div>
          {saveSuccess && (
            <p style={{ fontSize: "0.82rem", color: "var(--accent-xp)", marginTop: "0.5rem" }}>
              ✓ Run score saved to JSON Server! Check the Leaderboard.
            </p>
          )}
          {saveError && (
            <p style={{ fontSize: "0.82rem", color: "var(--accent-danger)", marginTop: "0.5rem" }}>
              {saveError}
            </p>
          )}
          {webhookResult && (
            <p
              style={{
                fontSize: "0.82rem",
                color: webhookResult.ok ? "var(--accent-energy)" : "var(--text-muted)",
                marginTop: "0.5rem",
              }}
            >
              {webhookResult.ok
                ? `n8n notified: ${webhookResult.classification}`
                : webhookResult.skipped
                ? `n8n not configured: ${webhookResult.classification}`
                : `n8n failed: ${webhookResult.error}`}
            </p>
          )}
        </form>

        {/* Navigation / Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            type="button"
            onClick={onPlayAgain}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <RotateCcw size={16} />
            Play Again
          </button>
          <Link
            to="/characters"
            className="btn btn-outline"
            style={{ flex: 1 }}
          >
            <Users size={16} />
            Roster
          </Link>
        </div>
      </div>
    </div>
  );
};
