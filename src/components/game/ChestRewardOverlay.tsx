import React from "react";
import {
  Sparkles,
  X,
  Skull,
  Zap,
  Flame,
  Snowflake,
} from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { SPECIAL_PICKUP_CONFIG, UPGRADE_DETAILS } from "../../game/config";
import { ASSETS } from "../../config/assets";
import type { SpecialPickupType, UpgradeId } from "../../types/game";
import "../../styles/chest-reward.css";

const rarityLabel = {
  common: "Common Chest",
  rare: "Rare Chest",
  legendary: "RELIC VAULT",
} as const;

export const ChestRewardOverlay: React.FC = () => {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const pending = useGameStore((s) => s.pendingChestReward);
  const passives = useGameStore((s) => s.passives);
  const upgrades = useGameStore((s) => s.upgrades);
  const claimChestReward = useGameStore((s) => s.claimChestReward);

  if (gameStatus !== "chest" || !pending) return null;

  const bonus =
    pending.rarity === "legendary"
      ? "+50 Shield · +35 HP · +500 Score"
      : pending.rarity === "rare"
      ? "+25 Shield · Upgrade selection"
      : "Upgrade selection";

  const renderUpgradeIcon = (id: UpgradeId) => {
    const src = (ASSETS.upgrades as Record<string, string>)[id];
    if (src) {
      return <img src={src} alt={id} />;
    }
    switch (id) {
      case "fire":
        return <Flame size={44} color="#f97316" />;
      case "poison":
        return <Skull size={44} color="#22c55e" />;
      case "shock":
        return <Zap size={44} color="#00e5ff" />;
      case "frost":
        return <Snowflake size={44} color="#38bdf8" />;
      default:
        return <Sparkles size={44} color="#23d5ff" />;
    }
  };

  const renderRelicIcon = (id: SpecialPickupType) => {
    switch (id) {
      case "overclock_core":
        return <img src={ASSETS.items.overclockCore} alt="" />;
      case "tesla_cell":
        return <img src={ASSETS.items.teslaCell} alt="" />;
      case "toxic_relic":
        return <img src={ASSETS.items.toxicRelic} alt="" />;
      case "phoenix_fragment":
        return <img src={ASSETS.items.phoenixFragment} alt="" />;
      case "aegis_capacitor":
        return <img src={ASSETS.items.aegisCapacitor} alt="" />;
      case "apex_lens":
        return <img src={ASSETS.items.apexLens} alt="" />;
      case "echo_prism":
        return <img src={ASSETS.items.echoPrism} alt="" />;
      case "gravity_seed":
        return <img src={ASSETS.items.gravitySeed} alt="" />;
      default:
        return <Sparkles size={44} color="#fbbf24" />;
    }
  };

  return (
    <div className="chest-reward-backdrop" role="dialog" aria-modal="true" aria-label="Chest Reward Selection">
      <section className={`chest-reward-panel ${pending.rarity}`}>
        {pending.rarity === "legendary" && (
          <div className="relic-vault-banner-container">
            <img
              src={ASSETS.ui.relicVaultBanner}
              alt="Legendary Relic Vault"
              className="relic-vault-banner-img"
            />
          </div>
        )}
        <div className="chest-reward-title">
          <Sparkles size={24} className={pending.rarity === "legendary" ? "relic-vault-sparkle" : ""} />
          <div>
            <h2 className={pending.rarity === "legendary" ? "relic-vault-header" : ""}>
              {rarityLabel[pending.rarity]}
            </h2>
            <p>{bonus}</p>
          </div>
          <X size={18} aria-hidden="true" style={{ opacity: 0.6 }} />
        </div>

        {pending.type === "relic" ? (
          <div className="chest-reward-grid">
            {pending.choices.map((id) => {
              const visual = SPECIAL_PICKUP_CONFIG.visuals[id];
              const current = passives[id] || 0;
              const next = Math.min(5, current + 1);

              return (
                <button
                  key={id}
                  type="button"
                  className="chest-reward-card relic-vault-card"
                  onClick={() => claimChestReward(id)}
                >
                  <div className="relic-icon-wrapper">{renderRelicIcon(id)}</div>
                  <strong>{visual.name}</strong>
                  <span>{visual.subtitle}</span>
                  <div className="relic-stack-tag">
                    Stack: {current} → <b>{next}</b> / 5
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="chest-reward-grid">
            {pending.choices.map((id) => {
              const info = UPGRADE_DETAILS[id];
              const currentTier = upgrades[id] || 0;
              const nextTier = currentTier + 1;

              return (
                <button
                  key={id}
                  type="button"
                  className="chest-reward-card"
                  onClick={() => claimChestReward(id)}
                >
                  <div className="upgrade-icon-wrapper">{renderUpgradeIcon(id)}</div>
                  <strong>{info.name}</strong>
                  <span>{info.description(nextTier)}</span>
                  <div className="upgrade-tier-tag">
                    Tier: {currentTier} → <b>{nextTier}</b> / 5
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
