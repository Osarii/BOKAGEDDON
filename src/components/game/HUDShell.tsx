import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { ASSETS } from "../../config/assets";
import { UPGRADE_DETAILS } from "../../game/config";
import { WEAPON_SYNERGIES, getActiveSynergies } from "../../game/weaponSynergies";
import { isBossRound } from "../../game/progression";
import { AudioControl } from "./AudioControl";
import type { UpgradeId } from "../../types/game";
import { Heart, Skull, Trophy, Sparkles, ChevronLeft, Clock, Flame, Shield, Zap, Snowflake } from "lucide-react";

export const HUDShell: React.FC = () => {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const shield = useGameStore((s) => s.shield);
  const maxShield = useGameStore((s) => s.maxShield);
  const round = useGameStore((s) => s.round);
  const roundStatus = useGameStore((s) => s.roundStatus);
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const xpRequired = useGameStore((s) => s.xpRequired);
  const score = useGameStore((s) => s.score);
  const kills = useGameStore((s) => s.kills);
  const timeSurvivedSeconds = useGameStore((s) => s.timeSurvivedSeconds);
  const bossActive = useGameStore((s) => s.bossActive);
  const bossHealth = useGameStore((s) => s.bossHealth);
  const bossMaxHealth = useGameStore((s) => s.bossMaxHealth);
  const bossName = useGameStore((s) => s.bossName) || "THE BONKLORD";
  const bossTier = useGameStore((s) => s.bossTier) || 1;
  const bossAccentColor = useGameStore((s) => s.bossAccentColor) || "#e11d48";
  const upgrades = useGameStore((s) => s.upgrades);
  const passives = useGameStore((s) => s.passives);
  const frenzyActive = useGameStore((s) => s.frenzyActive);
  const frenzyTimer = useGameStore((s) => s.frenzyTimer);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const notification = useGameStore((s) => s.notification);

  // Auto-clear notification toast after 2.8s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      useGameStore.getState().setNotification(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [notification]);

  const renderSmallUpgradeIcon = (id: UpgradeId) => {
    switch (id) {
      case "fire":
        return <Flame size={14} color="#f97316" />;
      case "poison":
        return <Skull size={14} color="#22c55e" />;
      case "shock":
        return <Zap size={14} color="#00e5ff" />;
      case "frost":
        return <Snowflake size={14} color="#38bdf8" />;
      default: {
        const iconSrc = (ASSETS.upgrades as Record<string, string>)[id];
        return iconSrc ? <img src={iconSrc} alt={id} style={{ width: 16, height: 16 }} /> : null;
      }
    }
  };

  const hpPercent = maxHealth > 0 ? Math.max(0, Math.min(100, (health / maxHealth) * 100)) : 100;
  const shieldPercent = maxShield > 0 ? Math.max(0, Math.min(100, (shield / maxShield) * 100)) : 0;
  const xpPercent = xpRequired > 0 ? Math.max(0, Math.min(100, (xp / xpRequired) * 100)) : 0;
  const bossHpPercent =
    bossMaxHealth > 0 ? Math.max(0, Math.min(100, (bossHealth / bossMaxHealth) * 100)) : 0;
  const isBoss = isBossRound(round);

  const minutes = Math.floor(timeSurvivedSeconds / 60);
  const seconds = timeSurvivedSeconds % 60;
  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const frenzyFormatted = `${Math.floor(frenzyTimer / 60)}:${Math.ceil(frenzyTimer % 60).toString().padStart(2, "0")}`;

  const portrait =
    selectedCharacterId && selectedCharacterId in ASSETS.characters
      ? ASSETS.characters[selectedCharacterId as keyof typeof ASSETS.characters]
      : ASSETS.characters.bonk;

  const activeUpgrades = (Object.keys(upgrades) as UpgradeId[]).filter(
    (id) => (upgrades[id] || 0) > 0
  );
  const activeSynergyIds = selectedCharacterId ? getActiveSynergies(selectedCharacterId, upgrades) : [];
  const selectedSynergy = Object.values(WEAPON_SYNERGIES).find(
    (item) => item.characterId === selectedCharacterId
  );
  const synergyProgress = selectedSynergy
    ? Object.entries(selectedSynergy.requiredUpgrades)
        .map(([id, tier]) => `${UPGRADE_DETAILS[id as UpgradeId].name} ${(upgrades[id as UpgradeId] || 0)}/${tier}`)
        .join(" · ")
    : "";

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
              color: bossAccentColor,
              fontWeight: 900,
              fontSize: "0.9rem",
              letterSpacing: "0.08em",
              textShadow: `0 0 12px ${bossAccentColor}aa`,
            }}
          >
            <Flame size={16} />
            <span>{bossName.toUpperCase()} — TIER {bossTier}</span>
            <Flame size={16} />
          </div>
          <div
            style={{
              width: "100%",
              height: "14px",
              background: "rgba(15, 20, 32, 0.9)",
              borderRadius: "7px",
              border: `1px solid ${bossAccentColor}88`,
              overflow: "hidden",
              boxShadow: `0 0 20px ${bossAccentColor}55`,
            }}
          >
            <div
              style={{
                width: `${bossHpPercent}%`,
                height: "100%",
                background: `linear-gradient(90deg, #18181b, ${bossAccentColor}, #ffffff)`,
                transition: "width 0.2s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {bossHealth} / {bossMaxHealth} HP
          </span>
        </div>
      )}

      {/* Intermission Banner */}
      {roundStatus === "intermission" && (
        <div
          style={{
            position: "absolute",
            top: bossActive ? "6.8rem" : "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 1.25rem",
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid var(--accent-energy)",
            borderRadius: "999px",
            color: "var(--accent-energy)",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.06em",
            boxShadow: "0 0 22px rgba(56, 189, 248, 0.4)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        >
          <Sparkles size={16} />
          <span>ROUND {round} CLEARED &bull; PREPARING NEXT WAVE</span>
          <Sparkles size={16} />
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
              style={{ width: 24, height: 24, borderRadius: 4 }}
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

          {/* Shield Pill */}
          <div
            className="hud-pill"
            title={`Shield: ${shield} / ${maxShield}`}
            style={{
              borderColor: shield > 0 ? "rgba(56, 189, 248, 0.45)" : undefined,
            }}
          >
            <Shield
              size={16}
              color="var(--accent-energy)"
              fill={shield > 0 ? "rgba(56, 189, 248, 0.25)" : "transparent"}
            />
            <div
              className="hud-hp-bar"
              style={{
                borderColor: "rgba(56, 189, 248, 0.35)",
                background: "rgba(15, 23, 42, 0.7)",
              }}
            >
              <div
                className="hud-hp-fill"
                style={{
                  width: `${shieldPercent}%`,
                  background: "linear-gradient(90deg, #0284c7, #38bdf8)",
                }}
              />
            </div>
            <span style={{ color: shield > 0 ? "var(--accent-energy)" : "var(--text-muted)" }}>
              {shield}/{maxShield}
            </span>
          </div>
        </div>

        {/* Round, Level, Timer & Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="hud-pill" style={{ color: "var(--text-primary)" }} title="Time Survived">
            <Clock size={16} color="var(--text-muted)" />
            <span>{timeFormatted}</span>
          </div>

          {/* Round Indicator */}
          {isBoss ? (
            <div
              className="hud-pill"
              style={{
                color: "#ef4444",
                borderColor: "rgba(239, 68, 68, 0.6)",
                boxShadow: "0 0 14px rgba(239, 68, 68, 0.35)",
                fontWeight: 800,
              }}
              title={`Boss Wave: ${bossName} Tier ${bossTier}`}
            >
              <Flame size={16} />
              <span>RND {round} [BOSS]</span>
            </div>
          ) : (
            <div
              className="hud-pill"
              style={{ color: "var(--text-primary)", borderColor: "rgba(255, 255, 255, 0.15)" }}
              title={`Current Wave: Round ${round}`}
            >
              <span>RND {round}</span>
            </div>
          )}

          <div className="hud-pill" style={{ color: "var(--accent-energy)" }}>
            <Sparkles size={16} />
            <span>LVL {level}</span>
          </div>

          {selectedSynergy && (
            <div
              className="hud-pill"
              style={{ color: activeSynergyIds.length > 0 ? "var(--accent-xp)" : "var(--accent-warm)" }}
              title={activeSynergyIds.length > 0 ? selectedSynergy.description : synergyProgress}
            >
              <Sparkles size={16} />
              <span>{activeSynergyIds.length > 0 ? selectedSynergy.name : "SYNERGY"}</span>
            </div>
          )}

          {frenzyActive && (
            <div
              className="hud-pill"
              style={{
                color: "#fb923c",
                borderColor: "rgba(249, 115, 22, 0.75)",
                boxShadow: "0 0 20px rgba(249, 115, 22, 0.45)",
                fontWeight: 900,
                animation: frenzyTimer <= 10 ? "frenzy-pulse 0.5s ease-in-out infinite" : undefined,
              }}
              title="Frenzy Mode active"
            >
              <Flame size={16} />
              <span>FRENZY {frenzyFormatted}</span>
            </div>
          )}

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
                {renderSmallUpgradeIcon(id)}
                <span style={{ color: "var(--accent-warm)" }}>T{tier}</span>
              </div>
            );
          })}
        </div>
      )}

      {Object.values(passives).some((count) => count > 0) && (
        <div
          style={{
            position: "absolute",
            top: activeUpgrades.length > 0 ? "5rem" : "5rem",
            left: activeUpgrades.length > 0 ? "4.6rem" : "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            pointerEvents: "auto",
          }}
        >
          {([
            ["overclock_core", ASSETS.items.overclockCore, "Overclock Core"],
            ["tesla_cell", ASSETS.items.teslaCell, "Tesla Cell"],
            ["toxic_relic", ASSETS.items.toxicRelic, "Toxic Relic"],
            ["phoenix_fragment", ASSETS.items.phoenixFragment, "Phoenix Charges"],
          ] as const).map(([id, src, label]) =>
            passives[id] > 0 ? (
              <div
                key={id}
                className="hud-pill"
                style={{ padding: "0.25rem 0.55rem", gap: "0.35rem", fontSize: "0.75rem" }}
                title={`${label}: ${passives[id]}`}
              >
                <img src={src} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                <span>x{passives[id]}</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Special Pickup Auto-clearing Notification Toast */}
      {notification && (
        <div
          style={{
            position: "absolute",
            top: "5.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: "0.6rem 1.4rem",
              background: "rgba(10, 15, 26, 0.94)",
              border: "1px solid rgba(35, 213, 255, 0.6)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.7), 0 0 24px rgba(35, 213, 255, 0.35)",
              borderRadius: "12px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.15rem",
            }}
          >
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                color: "var(--accent-energy, #23d5ff)",
                textTransform: "uppercase",
              }}
            >
              {notification.title}
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "var(--text-primary, #ffffff)",
                fontWeight: 600,
              }}
            >
              {notification.subtitle}
            </div>
          </div>
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
          WASD / Arrow Keys — Move &bull; Attacks Automatic &bull; Stack upgrades to unlock weapon synergies
        </div>
      </div>

      <style>{`
        @keyframes frenzy-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.45); }
        }
      `}</style>
    </div>
  );
};
