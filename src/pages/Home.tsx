import React from "react";
import { Link } from "react-router-dom";
import { ASSETS } from "../config/assets";
import { GAME_CONFIG } from "../game/config";
import { Play, Trophy, BookOpen, Shield, Flame, Sparkles } from "lucide-react";

export const Home: React.FC = () => {
  return (
    <main className="container" style={{ padding: "4rem 1.5rem 6rem" }}>
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1.5rem",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* Main Logo */}
        <div style={{ position: "relative", marginBottom: "0.5rem" }}>
          <img
            src={ASSETS.ui.logo}
            alt="BONKAGEDDON Logo"
            style={{
              width: "100%",
              maxWidth: "380px",
              height: "auto",
              filter: "drop-shadow(0 0 35px rgba(255, 107, 53, 0.4))",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            background: "linear-gradient(135deg, #f4f7fb 40%, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.03em",
          }}
        >
          ARCADE SURVIVOR CHAOS
        </h1>

        <p
          style={{
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            maxWidth: "600px",
            color: "var(--text-secondary)",
          }}
        >
          Pick one of five survivors, carve space in a wider 3D arena, harvest XP, and combine
          upgrades into character-specific weapon synergies.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <Link
            to="/characters"
            className="btn btn-primary"
            style={{ padding: "0.9rem 2rem", fontSize: "1.05rem" }}
          >
            <Play size={20} fill="currentColor" />
            Play Now
          </Link>
          <Link
            to="/leaderboard"
            className="btn btn-secondary"
            style={{ padding: "0.9rem 1.75rem", fontSize: "1.05rem" }}
          >
            <Trophy size={20} />
            Leaderboard
          </Link>
          <Link
            to="/instructions"
            className="btn btn-outline"
            style={{ padding: "0.9rem 1.75rem", fontSize: "1.05rem" }}
          >
            <BookOpen size={20} />
            How to Play
          </Link>
        </div>

        {/* Highlight Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
            width: "100%",
            marginTop: "3.5rem",
            textAlign: "left",
          }}
        >
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <Flame size={28} color="var(--accent-orange)" style={{ marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>5 Unique Survivors</h3>
            <p style={{ fontSize: "0.85rem" }}>
              BONK, BYTE, TANK, NOVA, and HEX each bring distinct stats, weapons, and synergy goals.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <Sparkles size={28} color="var(--accent-energy)" style={{ marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Weapon Synergies</h3>
            <p style={{ fontSize: "0.85rem" }}>
              Build combinations like METEOR SLAM, PRISM BARRAGE, CYCLONE EDGE, SUPERNOVA, and HEXSTORM.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <Shield size={28} color="var(--accent-xp)" style={{ marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Capped Enemy Hordes</h3>
            <p style={{ fontSize: "0.85rem" }}>
              A radius-{GAME_CONFIG.arenaRadius} arena uses slower escalation and caps active enemies at {GAME_CONFIG.hardEnemyCap}.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
