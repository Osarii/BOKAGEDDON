import React, { useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import { ASSETS } from "../../config/assets";
import { UPGRADE_DETAILS, MAX_UPGRADE_LEVEL } from "../../game/config";
import { WEAPON_SYNERGIES } from "../../game/weaponSynergies";
import type { UpgradeId } from "../../types/game";
import {
  Sparkles,
  ArrowUpRight,
  Flame,
  Skull,
  Zap,
  Snowflake,
  Heart,
  Shield,
  Maximize2,
  PlusCircle,
  Crosshair,
} from "lucide-react";

export const LevelUpOverlay: React.FC = () => {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const upgrades = useGameStore((s) => s.upgrades);
  const level = useGameStore((s) => s.level);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
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

  const renderUpgradeIcon = (id: UpgradeId, size = 42) => {
    switch (id) {
      case "fire":
        return <Flame size={size} color="#f97316" />;
      case "poison":
        return <Skull size={size} color="#22c55e" />;
      case "shock":
        return <Zap size={size} color="#00e5ff" />;
      case "frost":
        return <Snowflake size={size} color="#38bdf8" />;
      case "regeneration":
        return <Heart size={size} color="#10b981" />;
      case "barrier":
        return <Shield size={size} color="#38bdf8" />;
      case "area":
        return <Maximize2 size={size} color="#a855f7" />;
      case "recovery":
        return <PlusCircle size={size} color="#34d399" />;
      case "boss_hunter":
        return <Crosshair size={size} color="#f43f5e" />;
      case "executioner":
        return <Skull size={size} color="#fbbf24" />;
      case "precision":
        return <Zap size={size} color="#f59e0b" />;
      case "fortune":
        return <Sparkles size={size} color="#eab308" />;
      default: {
        const src = (ASSETS.upgrades as Record<string, string>)[id];
        return src ? <img src={src} alt={id} style={{ width: size, height: size, objectFit: "contain" }} /> : <Sparkles size={size} color="#23d5ff" />;
      }
    }
  };

  if (gameStatus !== "levelup") return null;

  return (
    <div
      className="level-up-modal-backdrop"
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(8, 11, 18, 0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1.5rem",
      }}
      role="dialog"
      aria-label="Level Up Upgrade Selection"
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "860px",
          padding: "2.5rem 2rem",
          background: "rgba(13, 17, 26, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(35, 213, 255, 0.2)",
          borderRadius: "16px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--accent-energy)",
              marginBottom: "0.5rem",
            }}
          >
            <Sparkles size={20} />
            <span style={{ fontSize: "0.85rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>
              Tactical Acquisition
            </span>
            <Sparkles size={20} />
          </div>
          <h2 style={{ fontSize: "2.25rem", margin: 0, color: "var(--text-primary)" }}>LEVEL UP! (LVL {level})</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Select an upgrade or weapon synergy to adapt to escalating waves.
          </p>
        </div>

        {availableChoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "var(--accent-energy)", fontSize: "1.1rem" }}>
              All upgrades have reached maximum power!
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: "1.5rem" }}
              onClick={() => {
                useGameStore.setState({ pendingLevelUps: 0, gameStatus: "playing" });
              }}
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
              const synergy = Object.values(WEAPON_SYNERGIES).find(
                (item) => item.characterId === selectedCharacterId && item.requiredUpgrades[id]
              );
              const requiredTier = synergy?.requiredUpgrades[id] || 0;
              const contributesToSynergy = Boolean(synergy && currentTier < requiredTier);
              const completesSynergy =
                Boolean(synergy && nextTier >= requiredTier) &&
                Object.entries(synergy?.requiredUpgrades || {}).every(([upgradeId, tier]) =>
                  upgradeId === id ? nextTier >= (tier || 0) : (upgrades[upgradeId as UpgradeId] || 0) >= (tier || 0)
                );

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
                    {renderUpgradeIcon(id, 36)}
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

                  {contributesToSynergy && synergy && (
                    <p
                      style={{
                        marginTop: "0.75rem",
                        minHeight: "2.2rem",
                        fontSize: "0.78rem",
                        color: completesSynergy ? "var(--accent-xp)" : "var(--accent-warm)",
                        fontWeight: 700,
                      }}
                    >
                      {completesSynergy ? "Unlocks" : "Builds toward"} {synergy.name}
                    </p>
                  )}

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
