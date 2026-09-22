import React from "react";
import type { Character } from "../../types/game";
import { ASSETS } from "../../config/assets";
import { UPGRADE_DETAILS } from "../../game/config";
import { WEAPON_SYNERGIES } from "../../game/weaponSynergies";
import { Heart, Zap, Swords, Clock, ArrowRight, ShieldCheck } from "lucide-react";

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
  "rift-disc": ASSETS.weapons.riftDisc,
  "pulse-mine": ASSETS.weapons.pulseMine,
  "light-lance": ASSETS.weapons.lightLance,
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onSelect,
  isSelected = false,
}) => {
  const portraitUrl =
    character.id in ASSETS.portraits
      ? ASSETS.portraits[character.id as keyof typeof ASSETS.portraits]
      : null;

  const weaponIcon = WEAPON_ASSET_MAP[character.weapon] || null;
  const synergy = Object.values(WEAPON_SYNERGIES).find((item) => item.characterId === character.id);
  const synergyRequirements = synergy
    ? Object.entries(synergy.requiredUpgrades)
        .map(([id, tier]) => `${UPGRADE_DETAILS[id as keyof typeof UPGRADE_DETAILS].name} T${tier}`)
        .join(" + ")
    : "";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(character);
    }
  };

  return (
    <article
      className={`character-select-card ${isSelected ? "is-selected" : ""}`}
      style={{ "--char-color": character.color } as React.CSSProperties}
      onClick={() => onSelect(character)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Select ${character.name}, ${character.role}`}
    >
      {isSelected && (
        <div className="selected-badge">
          <ShieldCheck size={12} />
          Selected
        </div>
      )}

      <div className="character-card-top">
        <div className="character-portrait-box">
          {portraitUrl ? (
            <img src={portraitUrl} alt={`${character.name} portrait`} loading="lazy" />
          ) : (
            <div className="character-portrait-fallback" style={{ color: character.color }}>
              <Swords size={38} className="char-fallback-glyph" />
            </div>
          )}
        </div>
        <div className="character-meta-info">
          <h3 className="character-name-title">{character.name}</h3>
          <p className="character-role-tag">{character.role}</p>
        </div>
      </div>

      <p className="character-desc-text">{character.description}</p>

      <div className="character-stats-grid">
        <div className="character-stat-cell">
          <span className="stat-cell-label">
            <Heart size={12} color="var(--accent-danger)" />
            Health
          </span>
          <span className="stat-cell-value">{character.health} HP</span>
        </div>
        <div className="character-stat-cell">
          <span className="stat-cell-label">
            <Zap size={12} color="var(--accent-warm)" />
            Speed
          </span>
          <span className="stat-cell-value">{character.speed}</span>
        </div>
        <div className="character-stat-cell">
          <span className="stat-cell-label">
            <Swords size={12} color="var(--accent-energy)" />
            Damage
          </span>
          <span className="stat-cell-value">{character.damage}</span>
        </div>
        <div className="character-stat-cell">
          <span className="stat-cell-label">
            <Clock size={12} color="var(--text-muted)" />
            Cooldown
          </span>
          <span className="stat-cell-value">{character.attackCooldown}s</span>
        </div>
      </div>

      <div className="character-weapon-row">
        <span>Weapon:</span>
        <div className="weapon-icon-wrap">
          {weaponIcon ? (
            <img src={weaponIcon} alt={character.weapon} />
          ) : (
            <span className="weapon-fallback-icon" style={{ color: character.color }}>
              <Swords size={20} />
            </span>
          )}
        </div>
        <span className="weapon-name-display">{character.weapon.replace("-", " ")}</span>
      </div>

      {synergy && (
        <div className="character-synergy-banner">
          <div className="synergy-header-row">
            <span className="synergy-title-text">{synergy.name}</span>
            <span className="synergy-req-pill">{synergyRequirements}</span>
          </div>
          <p className="synergy-desc-text">{synergy.description}</p>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(character);
        }}
        className="character-select-btn"
      >
        Select {character.name}
        <ArrowRight size={16} />
      </button>
    </article>
  );
};
