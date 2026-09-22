import React from "react";
import { Link } from "react-router-dom";
import { Move, Zap, Sparkles, Award, Play, AlertCircle, Flame } from "lucide-react";
import { ASSETS } from "../config/assets";
import { GAME_CONFIG, UPGRADE_DETAILS } from "../game/config";
import { WEAPON_SYNERGIES } from "../game/weaponSynergies";
import "../styles/instructions.css";

const bosses = [
  {
    name: "Bonklord",
    theme: "Obsidian hammer titan",
    round: 10,
    identity: "Heavy shockwave pressure that punishes standing still.",
    image: ASSETS.enemies.bonklord,
    color: "#e11d48",
  },
  {
    name: "Cindermaw",
    theme: "Fire",
    round: 20,
    identity: "Volcanic boss identity built around burning zones and burst pressure.",
    image: ASSETS.enemies.cindermaw,
    color: "#f97316",
  },
  {
    name: "Stormcoil",
    theme: "Shock",
    round: 30,
    identity: "Electric construct identity with fast pulses and chain pressure.",
    image: ASSETS.enemies.stormcoil,
    color: "#00e5ff",
  },
  {
    name: "Venomatrix",
    theme: "Poison",
    round: 40,
    identity: "Toxic hunter identity focused on lingering danger and area denial.",
    image: ASSETS.enemies.venomatrix,
    color: "#22c55e",
  },
  {
    name: "Cryovex",
    theme: "Frost",
    round: 50,
    identity: "Glacial boss identity that chills movement and controls space.",
    image: ASSETS.enemies.cryovex,
    color: "#38bdf8",
  },
];

const lootItems = [
  { name: "Medkit Emergency", chance: "15%", rarity: "Recovery", image: ASSETS.items.medkitEmergency },
  { name: "Medkit Case", chance: "15%", rarity: "Recovery", image: ASSETS.items.medkitCase },
  { name: "Shield Potion", chance: "15%", rarity: "Recovery", image: ASSETS.items.shieldPotion },
  { name: "Shield Battery", chance: "15%", rarity: "Recovery", image: ASSETS.items.shieldBattery },
  { name: "Overclock Core", chance: "10%", rarity: "Rare", image: ASSETS.items.overclockCore },
  { name: "Tesla Cell", chance: "10%", rarity: "Rare", image: ASSETS.items.teslaCell },
  { name: "Toxic Relic", chance: "10%", rarity: "Rare", image: ASSETS.items.toxicRelic },
  { name: "Phoenix Fragment", chance: "10%", rarity: "Rare", image: ASSETS.items.phoenixFragment },
];

const elementalBuilds = [
  { name: "Fire", text: "Burn damage over time.", color: "#f97316" },
  { name: "Poison", text: "Poison damage over time.", color: "#22c55e" },
  { name: "Shock", text: "Chain/electric damage.", color: "#00e5ff" },
  { name: "Frost", text: "Slow/chill control.", color: "#38bdf8" },
];

export const Instructions: React.FC = () => {
  const synergyList = Object.values(WEAPON_SYNERGIES);

  return (
    <main className="container" style={{ padding: "3rem 1.5rem 5rem" }}>
      <header style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>HOW TO SURVIVE</h1>
        <p style={{ maxWidth: "550px", margin: "0 auto" }}>
          Master the rules of the arena. Learn movement, auto-attacks, progression, and survival.
        </p>
      </header>

      {/* Build Status Banner */}
      <div
        className="glass-panel"
        style={{
          maxWidth: "780px",
          margin: "0 auto 2.5rem",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderLeft: "4px solid var(--accent-energy)",
        }}
      >
        <AlertCircle size={24} color="var(--accent-energy)" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: "0.9rem", margin: 0, color: "var(--text-primary)" }}>
          <strong>Current Build:</strong> Five playable survivors fight in a larger radius-{GAME_CONFIG.arenaRadius}
          arena with slower escalating hordes capped at {GAME_CONFIG.hardEnemyCap} active enemies.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Core Controls */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Move size={24} color="var(--accent-warm)" />
            <h2 style={{ fontSize: "1.3rem" }}>1. Movement</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            Navigate the 3D circular arena using standard keyboard controls:
          </p>
          <ul style={{ listStyle: "none", display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <li className="hud-pill" style={{ padding: "0.3rem 0.75rem" }}>W / Up</li>
            <li className="hud-pill" style={{ padding: "0.3rem 0.75rem" }}>A / Left</li>
            <li className="hud-pill" style={{ padding: "0.3rem 0.75rem" }}>S / Down</li>
            <li className="hud-pill" style={{ padding: "0.3rem 0.75rem" }}>D / Right</li>
          </ul>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Keep moving. Enemies approach from all directions and collision damages your survivor.
          </p>
        </section>

        {/* Combat */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Zap size={24} color="var(--accent-orange)" />
            <h2 style={{ fontSize: "1.3rem" }}>2. Automatic Attacks</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            Your weapons fire automatically whenever their cooldown refreshes.
          </p>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-surface)", padding: "0.75rem", borderRadius: "8px" }}>
            <img src={ASSETS.weapons.hammer} alt="Hammer" style={{ width: 28, height: 28 }} />
            <div style={{ fontSize: "0.85rem" }}>
              <strong>Smart Auto-Targeting:</strong> Attacks automatically acquire the nearest enemy within range.
            </div>
          </div>
        </section>

        {/* Survivors */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Flame size={24} color="var(--accent-orange)" />
            <h2 style={{ fontSize: "1.3rem" }}>3. Five Survivors</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            BONK, BYTE, TANK, NOVA, and HEX each start with a different weapon pattern and synergy path.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["BONK", "BYTE", "TANK", "NOVA", "HEX"].map((name) => (
              <span key={name} className="hud-pill" style={{ padding: "0.3rem 0.75rem" }}>
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* XP Collection */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Sparkles size={24} color="var(--accent-xp)" />
            <h2 style={{ fontSize: "1.3rem" }}>4. XP Harvesting</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            Defeated enemies drop glowing emerald XP gems on the arena floor:
          </p>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-surface)", padding: "0.75rem", borderRadius: "8px" }}>
            <img src={ASSETS.pickups.xpGem} alt="XP Gem" style={{ width: 26, height: 26 }} />
            <div style={{ fontSize: "0.85rem" }}>
              Move close to gems to pick them up. Increase your Magnet upgrade to vacuum gems from afar.
            </div>
          </div>
        </section>

        {/* Level Ups */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Award size={24} color="var(--accent-energy)" />
            <h2 style={{ fontSize: "1.3rem" }}>5. Level Up Upgrades</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            When the XP bar fills, the game presents 3 randomized upgrade cards to power up your survivor:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <img src={ASSETS.upgrades.damage} alt="Damage" title="Damage Boost" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.haste} alt="Haste" title="Haste" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.speed} alt="Speed" title="Speed" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.vitality} alt="Vitality" title="Vitality" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.armor} alt="Armor" title="Armor" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.magnet} alt="Magnet" title="Magnet" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.critical} alt="Critical" title="Critical" style={{ width: 32, height: 32 }} />
            <img src={ASSETS.upgrades.multishot} alt="Multishot" title="Multishot" style={{ width: 32, height: 32 }} />
          </div>
        </section>

        {/* Synergies */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Award size={24} color="var(--accent-energy)" />
            <h2 style={{ fontSize: "1.3rem" }}>6. Weapon Synergies</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            Each survivor has one upgrade combination that evolves their weapon behavior:
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {synergyList.map((synergy) => (
              <div key={synergy.id} className="hud-pill" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                <strong>{synergy.name}</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {Object.entries(synergy.requiredUpgrades)
                    .map(([id, tier]) => `${UPGRADE_DETAILS[id as keyof typeof UPGRADE_DETAILS].name} T${tier}`)
                    .join(" + ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="instructions-wide glass-panel">
        <h2>Boss Bestiary</h2>
        <p>
          Bosses rotate through the round ladder: Round 10 Bonklord, Round 20 Cindermaw, Round 30 Stormcoil,
          Round 40 Venomatrix, and Round 50 Cryovex. After Round 50, the roster repeats every 50 rounds with
          higher tiers.
        </p>
        <div className="boss-grid">
          {bosses.map((boss) => (
            <article key={boss.name} className="boss-card" style={{ "--boss-color": boss.color } as React.CSSProperties}>
              <img src={boss.image} alt={boss.name} />
              <div>
                <span>Round {boss.round}</span>
                <h3>{boss.name}</h3>
                <strong>{boss.theme}</strong>
                <p>{boss.identity}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="instructions-wide glass-panel">
        <h2>Items / Loot</h2>
        <p>
          Boss loot uses a planned 100% roll: 60% recovery items and 40% rare boss-exclusive drops. Normal gameplay
          logic stays in the arena; this page is only the guide.
        </p>
        <div className="loot-summary">
          <span>60% Recovery</span>
          <span>40% Rare boss-exclusive</span>
        </div>
        <div className="loot-grid">
          {lootItems.map((item) => (
            <article key={item.name} className={`loot-card ${item.rarity === "Rare" ? "rare" : ""}`}>
              <img src={item.image} alt={item.name} />
              <h3>{item.name}</h3>
              <p>{item.rarity}</p>
              <strong>{item.chance}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="instructions-wide glass-panel">
        <h2>Elemental Builds</h2>
        <div className="element-grid">
          {elementalBuilds.map((element) => (
            <article key={element.name} className="element-card" style={{ "--element-color": element.color } as React.CSSProperties}>
              <h3>{element.name}</h3>
              <p>{element.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <Link to="/characters" className="btn btn-primary" style={{ padding: "0.85rem 2rem" }}>
          <Play size={18} fill="currentColor" />
          Enter Character Selection
        </Link>
      </div>
    </main>
  );
};
