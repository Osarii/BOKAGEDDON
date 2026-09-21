import React from "react";
import { Link } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { ASSETS } from "../../config/assets";
import { UPGRADE_DETAILS } from "../../game/config";
import { AudioControl } from "./AudioControl";
import type { UpgradeId } from "../../types/game";
import { Heart, Skull, Trophy, Sparkles, ChevronLeft, Clock, Flame } from "lucide-react";

export const HUDShell: React.FC = () => {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const xpRequired = useGameStore((s) => s.xpRequired);
  const score = useGameStore((s) => s.score);
  const kills = useGameStore((s) => s.kills);
  const timeSurvivedSeconds = useGameStore((s) => s.timeSurvivedSeconds);
  const bossActive = useGameStore((s) => s.bossActive);
  const bossHealth = useGameStore((s) => s.bossHealth);
  const bossMaxHealth = useGameStore((s) => s.bossMaxHealth);
  const upgrades = useGameStore((s) => s.upgrades);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);

  const hpPercent = maxHealth > 0 ? Math.max(0, Math.min(100, (health / maxHealth) * 100)) : 100;
  const xpPercent = xpRequired > 0 ? Math.max(0, Math.min(100, (xp / xpRequired) * 100)) : 0;
  const bossHpPercent =
    bossMaxHealth > 0 ? Math.max(0, Math.min(100, (bossHealth / bossMaxHealth) * 100)) : 0;

  const minutes = Math.floor(timeSurvivedSeconds / 60);
  const seconds = timeSurvivedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const portrait =
    selectedCharacterId && selectedCharacterId in ASSETS.portraits
      ? ASSETS.portraits[selectedCharacterId as keyof typeof ASSETS.portraits]
      : ASSETS.portraits.bonk;

  const activeUpgrades = (Object.keys(upgrades) as UpgradeId[]).filter(
    (id) => (upgrades[id] || 0) > 0
  );

  return (
    <div className="hud-overlay" aria-label="Game HUD">
      {/* Top XP Bar */}
      <div className="hud-xp-bar-container" title={`XP: ${xp} / ${xpRequired}`}>
        <div className="hud-xp-fill" style={{ width: `${xpPercent}%` }} />
      </div>

      {/* Boss Health Bar (Top Center) */}
      {bossActive && (
        <div
          style={{
            position: "absolute",
            top: "1.25rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(520px, 85vw)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.25rem",
            zIndex: 20,
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#ef4444",
              fontWeight: 900,
              fontSize: "0.9rem",
              letterSpacing: "0.08em",
              textShadow: "0 0 12px rgba(239, 68, 68, 0.6)",
            }}
          >
            <Flame size={16} />
            <span>THE BONKLORD</span>
            <Flame size={16} />
          </div>
          <div
            style={{
              width: "100%",
              height: "14px",
              background: "rgba(15, 20, 32, 0.9)",
              borderRadius: "7px",
              border: "1px solid rgba(239, 68, 68, 0.5)",
              overflow: "hidden",
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.35)",
            }}
          >
            <div
              style={{
                width: `${bossHpPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #b91c1c, #ef4444, #f97316)",
                transition: "width 0.2s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {bossHealth} / {bossMaxHealth} HP
          </span>
        </div>
      )}

      {/* Top Status Bar */}
      <div className="hud-top-bar" style={{ marginTop: bossActive ? "2.5rem" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            to="/characters"
            className="btn btn-outline"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
            title="Leave run and return to character selection"
          >
            <ChevronLeft size={16} />
            Exit
          </Link>

          {/* Character Badge */}
          <div className="hud-pill">
            <img
              src={portrait}
              alt="Active Character"
              style={{ width: 24, height: 24, borderRadius: 4, objectFit: "contain" }}
            />
            <span style={{ textTransform: "uppercase" }}>{selectedCharacterId || "Survivor"}</span>
          </div>

          {/* Health Pill */}
          <div className="hud-pill" title={`Health: ${health} / ${maxHealth}`}>
            <Heart size={16} color="var(--accent-danger)" fill="var(--accent-danger)" />
            <div className="hud-hp-bar">
              <div className="hud-hp-fill" style={{ width: `${hpPercent}%` }} />
            </div>
            <span>
              {health}/{maxHealth}
            </span>
          </div>
        </div>

        {/* Level, Timer & Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="hud-pill" style={{ color: "var(--text-primary)" }} title="Time Survived">
            <Clock size={16} color="var(--text-muted)" />
            <span>{timeFormatted}</span>
          </div>

          <div className="hud-pill" style={{ color: "var(--accent-energy)" }}>
            <Sparkles size={16} />
            <span>LVL {level}</span>
          </div>

          <div className="hud-pill" style={{ color: "var(--accent-warm)" }}>
            <Trophy size={16} />
            <span>{score.toLocaleString()}</span>
          </div>

          <div className="hud-pill" style={{ color: "var(--accent-danger)" }}>
            <Skull size={16} />
            <span>{kills}</span>
          </div>

          <AudioControl />
        </div>
      </div>

      {/* Active Upgrades Bar (Left Side) */}
      {activeUpgrades.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "5rem",
            left: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            pointerEvents: "auto",
          }}
        >
          {activeUpgrades.map((id) => {
            const tier = upgrades[id];
            const iconSrc = ASSETS.upgrades[id];
            const name = UPGRADE_DETAILS[id].name;
            return (
              <div
                key={id}
                className="hud-pill"
                style={{
                  padding: "0.25rem 0.6rem",
                  gap: "0.4rem",
                  fontSize: "0.75rem",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
                title={`${name} (Tier ${tier})`}
              >
                <img src={iconSrc} alt={name} style={{ width: 16, height: 16, objectFit: "contain" }} />
                <span style={{ color: "var(--accent-warm)" }}>T{tier}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Info Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: "0.4rem 1rem",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          WASD / Arrow Keys — Move &bull; Attacks Automatic &bull; Survive to Level 10 for Bonklord
        </div>
      </div>
    </div>
  );
};
