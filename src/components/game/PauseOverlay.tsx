import React from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { Play, RotateCcw, Users, Pause } from "lucide-react";

interface PauseOverlayProps {
  onPlayAgain: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ onPlayAgain }) => {
  const navigate = useNavigate();
  const gameStatus = useGameStore((s) => s.gameStatus);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const score = useGameStore((s) => s.score);
  const kills = useGameStore((s) => s.kills);
  const round = useGameStore((s) => s.round);
  const level = useGameStore((s) => s.level);

  if (gameStatus !== "paused") return null;

  const handleRestart = () => {
    resumeGame();
    onPlayAgain();
  };

  const handleExit = () => {
    resumeGame();
    navigate("/characters");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6, 8, 14, 0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.5rem",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          background: "rgba(15, 20, 32, 0.92)",
          border: "1px solid rgba(35, 213, 255, 0.25)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.65), 0 0 30px rgba(35, 213, 255, 0.15)",
          borderRadius: "16px",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(35, 213, 255, 0.12)",
            border: "1px solid rgba(35, 213, 255, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            color: "var(--accent-energy, #23d5ff)",
          }}
        >
          <Pause size={28} />
        </div>

        <h2
          id="pause-title"
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "var(--text-primary, #ffffff)",
            marginBottom: "0.25rem",
          }}
        >
          Juego Pausado
        </h2>
        <p
          style={{
            color: "var(--text-secondary, #94a3b8)",
            fontSize: "0.9rem",
            marginBottom: "1.75rem",
          }}
        >
          Presiona <kbd style={{ padding: "0.15rem 0.4rem", background: "rgba(255,255,255,0.1)", borderRadius: "4px" }}>ESC</kbd> para continuar
        </p>

        {/* Quick summary metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.5rem",
            width: "100%",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              padding: "0.75rem 0.4rem",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase" }}>Ronda</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-energy, #23d5ff)" }}>{round}</div>
          </div>
          <div
            style={{
              padding: "0.75rem 0.4rem",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase" }}>Nivel</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-warm, #ffb020)" }}>{level}</div>
          </div>
          <div
            style={{
              padding: "0.75rem 0.4rem",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase" }}>Bajas</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-red, #ff3b5c)" }}>{kills}</div>
          </div>
          <div
            style={{
              padding: "0.75rem 0.4rem",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary, #94a3b8)", textTransform: "uppercase" }}>Puntos</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-energy, #a855f7)" }}>{score}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={resumeGame}
            style={{
              width: "100%",
              padding: "0.85rem",
              fontSize: "1rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <Play size={18} />
            Continuar
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleRestart}
            style={{
              width: "100%",
              padding: "0.85rem",
              fontSize: "1rem",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "var(--text-primary, #ffffff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={18} />
            Reiniciar partida
          </button>

          <button
            type="button"
            className="btn"
            onClick={handleExit}
            style={{
              width: "100%",
              padding: "0.85rem",
              fontSize: "1rem",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-secondary, #94a3b8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <Users size={18} />
            Salir a selección de personaje
          </button>
        </div>
      </div>
    </div>
  );
};
