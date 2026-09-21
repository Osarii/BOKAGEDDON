import React from "react";
import type { Character } from "../../types/game";
import { ASSETS } from "../../config/assets";
import { Heart, Zap, Swords, Clock, ArrowRight } from "lucide-react";

interface CharacterCardProps {
  character: Character;
  onSelect: (character: Character) => void;
  isSelected?: boolean;
}

const WEAPON_ASSET_MAP: Record<string, string> = {
  hammer: ASSETS.weapons.hammer,
  "energy-orb": ASSETS.weapons.energyOrb,
  axe: ASSETS.weapons.axe,
  "nova-burst": ASSETS.weapons.novaBurst,
  "hex-chain": ASSETS.weapons.hexChain,
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onSelect,
  isSelected = false,
}) => {
  const portraitUrl =
    character.id in ASSETS.portraits
      ? ASSETS.portraits[character.id as keyof typeof ASSETS.portraits]
      : ASSETS.portraits.bonk;

  const weaponIcon = WEAPON_ASSET_MAP[character.weapon] || ASSETS.weapons.hammer;

  return (
    <article
      className="character-card"
      style={{
        borderColor: isSelected ? "var(--accent-orange)" : undefined,
        boxShadow: isSelected ? "var(--shadow-warm)" : undefined,
      }}
      aria-label={`Character card for ${character.name}`}
    >
      <div className="character-card-header">
        <div
          className="character-portrait-wrap"
          style={{
            borderColor: character.color,
            boxShadow: `0 0 16px ${character.color}33`,
          }}
        >
          <img src={portraitUrl} alt={`${character.name} portrait`} />
        </div>
        <div>
          <h3 style={{ color: character.color, fontSize: "1.3rem" }}>{character.name}</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{character.role}</p>
        </div>
      </div>

      <p style={{ fontSize: "0.85rem", minHeight: "2.6rem" }}>{character.description}</p>

      <div className="character-stat-list">
        <div className="stat-item">
          <span className="stat-label">
            <Heart size={12} style={{ display: "inline", verticalAlign: "middle", color: "var(--accent-danger)", marginRight: 3 }} />
            Health
          </span>
          <span className="stat-value">{character.health} HP</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">
            <Zap size={12} style={{ display: "inline", verticalAlign: "middle", color: "var(--accent-warm)", marginRight: 3 }} />
            Speed
          </span>
          <span className="stat-value">{character.speed}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">
            <Swords size={12} style={{ display: "inline", verticalAlign: "middle", color: "var(--accent-energy)", marginRight: 3 }} />
            Damage
          </span>
          <span className="stat-value">{character.damage}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">
            <Clock size={12} style={{ display: "inline", verticalAlign: "middle", color: "var(--text-muted)", marginRight: 3 }} />
            Cooldown
          </span>
          <span className="stat-value">{character.attackCooldown}s</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          marginBottom: "1rem",
        }}
      >
        <span>Weapon:</span>
        <img src={weaponIcon} alt={character.weapon} style={{ width: 18, height: 18 }} />
        <span style={{ textTransform: "capitalize", color: "var(--text-secondary)", fontWeight: 600 }}>
          {character.weapon.replace("-", " ")}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSelect(character)}
        className="btn btn-primary"
        style={{ width: "100%", marginTop: "auto" }}
      >
        Select {character.name}
        <ArrowRight size={16} />
      </button>
    </article>
  );
};
