import React from "react";
import { Link } from "react-router-dom";
import { ASSETS } from "../config/assets";
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
          Step into the 3D arena, survive swarming robotic fiends, harvest XP, and stack
          overpowered synergies before the Bonklord arrives.
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
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>3 Unique Survivors</h3>
            <p style={{ fontSize: "0.85rem" }}>
              Choose between Bonk the Bruiser, Byte the Caster, and Tank the Armored Wall.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <Sparkles size={28} color="var(--accent-energy)" style={{ marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>8 Stackable Upgrades</h3>
            <p style={{ fontSize: "0.85rem" }}>
              Tailor each run with attack speed, magnet range, multi-shot, and critical strikes.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <Shield size={28} color="var(--accent-xp)" style={{ marginBottom: "0.75rem" }} />
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>Capped Enemy Hordes</h3>
            <p style={{ fontSize: "0.85rem" }}>
              High-performance math scaling smoothly caps up to 90 concurrent foes in 3D space.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
