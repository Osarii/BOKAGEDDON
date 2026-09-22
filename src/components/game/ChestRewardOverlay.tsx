import React from "react";
import { Sparkles, X } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { UPGRADE_DETAILS } from "../../game/config";
import { ASSETS } from "../../config/assets";
import type { UpgradeId } from "../../types/game";
import "../../styles/chest-reward.css";

const rarityLabel = {
  common: "Common Chest",
  rare: "Rare Chest",
  legendary: "Legendary Chest",
} as const;

export const ChestRewardOverlay: React.FC = () => {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const pending = useGameStore((s) => s.pendingChestReward);
  const claimChestReward = useGameStore((s) => s.claimChestReward);

  if (gameStatus !== "chest" || !pending) return null;

  const bonus =
    pending.rarity === "legendary"
      ? "+50 Shield · +35 HP · +500 Score"
      : pending.rarity === "rare"
      ? "+25 Shield"
      : "Upgrade choice";

  const iconFor = (id: UpgradeId) => (ASSETS.upgrades as Record<string, string>)[id];

  return (
    <div className="chest-reward-backdrop" role="dialog" aria-modal="true">
      <section className={`chest-reward-panel ${pending.rarity}`}>
        <div className="chest-reward-title">
          <Sparkles size={22} />
          <div>
            <h2>{rarityLabel[pending.rarity]}</h2>
            <p>{bonus}</p>
          </div>
          <X size={18} aria-hidden="true" />
        </div>

        <div className="chest-reward-grid">
          {pending.choices.map((id) => (
            <button key={id} type="button" className="chest-reward-card" onClick={() => claimChestReward(id)}>
              {iconFor(id) ? <img src={iconFor(id)} alt="" /> : <Sparkles size={32} />}
              <strong>{UPGRADE_DETAILS[id].name}</strong>
              <span>{UPGRADE_DETAILS[id].description(1)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
