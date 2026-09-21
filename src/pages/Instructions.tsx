import React from "react";
import { Link } from "react-router-dom";
import { Move, Zap, Sparkles, Award, Play, AlertCircle } from "lucide-react";
import { ASSETS } from "../config/assets";

export const Instructions: React.FC = () => {
  const enemyPreview = [
    ["Slime", ASSETS.enemyArt.slime],
    ["Runner", ASSETS.enemyArt.runner],
    ["Brute", ASSETS.enemyArt.brute],
    ["Shooter", ASSETS.enemyArt.shooter],
    ["Bonklord", ASSETS.enemyArt.bonklord],
  ] as const;

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
          <strong>Academic Note:</strong> This playable build includes the 3D arena, movement,
          enemy waves, automatic attacks, XP, upgrades, leaderboard persistence, audio, and n8n hooks.
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
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-surface)", padding: "0.75rem", borderRadius: "8px", marginBottom: "0.75rem" }}>
            <img src={ASSETS.weapons.hammer} alt="Hammer" style={{ width: 34, height: 34, objectFit: "contain" }} />
            <div style={{ fontSize: "0.85rem" }}>
              <strong>Smart Auto-Targeting:</strong> Attacks automatically acquire the nearest enemy within range.
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {enemyPreview.map(([name, src]) => (
              <img
                key={name}
                src={src}
                alt={name}
                title={name}
                style={{ width: 36, height: 36, objectFit: "contain" }}
              />
            ))}
          </div>
        </section>

        {/* XP Collection */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Sparkles size={24} color="var(--accent-xp)" />
            <h2 style={{ fontSize: "1.3rem" }}>3. XP Harvesting</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            Defeated enemies drop glowing emerald XP gems on the arena floor:
          </p>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--bg-surface)", padding: "0.75rem", borderRadius: "8px" }}>
            <img src={ASSETS.pickups.xpGem} alt="XP Gem" style={{ width: 30, height: 30, objectFit: "contain" }} />
            <div style={{ fontSize: "0.85rem" }}>
              Move close to gems to pick them up. Increase your Magnet upgrade to vacuum gems from afar.
            </div>
          </div>
        </section>

        {/* Level Ups */}
        <section className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <Award size={24} color="var(--accent-energy)" />
            <h2 style={{ fontSize: "1.3rem" }}>4. Level Up Upgrades</h2>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            When the XP bar fills, the game presents 3 randomized upgrade cards to power up your survivor:
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <img src={ASSETS.upgrades.damage} alt="Damage" title="Damage Boost" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.haste} alt="Haste" title="Haste" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.speed} alt="Speed" title="Speed" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.vitality} alt="Vitality" title="Vitality" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.armor} alt="Armor" title="Armor" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.magnet} alt="Magnet" title="Magnet" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.critical} alt="Critical" title="Critical" style={{ width: 32, height: 32, objectFit: "contain" }} />
            <img src={ASSETS.upgrades.multishot} alt="Multishot" title="Multishot" style={{ width: 32, height: 32, objectFit: "contain" }} />
          </div>
        </section>
      </div>

      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <Link to="/characters" className="btn btn-primary" style={{ padding: "0.85rem 2rem" }}>
          <Play size={18} fill="currentColor" />
          Enter Character Selection
        </Link>
      </div>
    </main>
  );
};
