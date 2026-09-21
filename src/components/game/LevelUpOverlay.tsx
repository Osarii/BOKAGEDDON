import React, { useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import { ASSETS } from "../../config/assets";
import { UPGRADE_DETAILS, MAX_UPGRADE_LEVEL } from "../../game/config";
import type { UpgradeId } from "../../types/game";
import { Sparkles, ArrowUpRight } from "lucide-react";

export const LevelUpOverlay: React.FC = () => {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const upgrades = useGameStore((s) => s.upgrades);
  const level = useGameStore((s) => s.level);
  const applyUpgrade = useGameStore((s) => s.applyUpgrade);

  // Generate 3 random upgrade choices from valid (non-maxed) upgrades
  const availableChoices = useMemo(() => {
    const allIds = Object.keys(UPGRADE_DETAILS) as UpgradeId[];
    const valid = allIds.filter((id) => (upgrades[id] || 0) < MAX_UPGRADE_LEVEL);

    // Pure deterministic shuffle seeded by level and upgrade tier sum
    let seed = level * 7919 + Object.values(upgrades).reduce((acc, v) => acc + (v || 0), 0);
    const shuffled = [...valid];
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled.slice(0, 3);
  }, [upgrades, level]);

  if (gameStatus !== "levelup") return null;

  return (
    <div
      className="level-up-modal-backdrop"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(5, 7, 12, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.5rem",
      }}
      role="dialog"
      aria-label="Level Up Upgrade Selection"
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: "880px",
          width: "100%",
          padding: "2.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 0 50px rgba(35, 213, 255, 0.25)",
          border: "1px solid rgba(35, 213, 255, 0.3)",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Sparkles size={28} color="var(--accent-energy)" />
          <h2 style={{ fontSize: "2.2rem", letterSpacing: "0.04em" }}>LEVEL UP! — TIER {level}</h2>
        </div>
        <p style={{ marginBottom: "2rem" }}>
          Select one augmentation to strengthen your survivor for the next horde wave.
        </p>

        {availableChoices.length === 0 ? (
          <div>
            <p style={{ color: "var(--accent-xp)", fontWeight: 700, fontSize: "1.2rem" }}>
              ALL UPGRADES ARE FULLY MAXED!
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: "1.5rem" }}
              onClick={() => useGameStore.getState().setGameStatus("playing")}
            >
              Resume Battle
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {availableChoices.map((id) => {
              const info = UPGRADE_DETAILS[id];
              const currentTier = upgrades[id] || 0;
              const nextTier = currentTier + 1;
              const iconSrc = ASSETS.upgrades[id];

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyUpgrade(id)}
                  className="glass-panel upgrade-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "1.75rem 1.25rem",
                    background: "rgba(23, 29, 43, 0.85)",
                    cursor: "pointer",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-energy)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 30px rgba(35, 213, 255, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: "rgba(35, 213, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                      border: "1px solid rgba(35, 213, 255, 0.25)",
                    }}
                  >
                    <img src={iconSrc} alt={info.name} style={{ width: 42, height: 42 }} />
                  </div>

                  <span
                    style={{
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--accent-energy)",
                      marginBottom: "0.25rem",
                      fontWeight: 700,
                    }}
                  >
                    {info.type}
                  </span>

                  <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    {info.name}
                  </h3>

                  <p style={{ fontSize: "0.85rem", minHeight: "2.8rem", color: "var(--text-secondary)" }}>
                    {info.description(nextTier)}
                  </p>

                  <div
                    style={{
                      marginTop: "1.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Tier: {currentTier} → <strong style={{ color: "var(--accent-warm)" }}>{nextTier}</strong>
                    </span>
                    <span style={{ color: "var(--accent-energy)", display: "flex", alignItems: "center" }}>
                      Upgrade <ArrowUpRight size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
