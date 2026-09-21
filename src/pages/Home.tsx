import React from "react";
import { Link } from "react-router-dom";
import { ASSETS } from "../config/assets";
import { GAME_CONFIG } from "../game/config";
import { Play, Trophy, BookOpen, Shield, Flame, Sparkles, Zap } from "lucide-react";

export const Home: React.FC = () => {
  return (
    <main style={{ overflow: "hidden" }}>
      {/* ── Hero Section ── */}
      <section
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "5rem 1.5rem 4rem",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* Decorative floating orbs */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {[
            { top: "10%", left: "5%", size: 180, color: "rgba(0,229,255,0.06)", delay: "0s" },
            { top: "60%", right: "3%", size: 220, color: "rgba(176,96,255,0.05)", delay: "3s" },
            { top: "35%", left: "80%", size: 120, color: "rgba(255,107,53,0.06)", delay: "1.5s" },
          ].map((orb, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: orb.top,
                left: orb.left,
                right: (orb as {right?: string}).right,
                width: orb.size,
                height: orb.size,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                animation: `orb-float 8s ease-in-out infinite`,
                animationDelay: orb.delay,
              }}
            />
          ))}
        </div>

        {/* Logo */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <img
            src={ASSETS.ui.logo}
            alt="BONKAGEDDON Logo"
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "auto",
              filter: "drop-shadow(0 0 40px rgba(255, 107, 53, 0.5)) drop-shadow(0 0 80px rgba(255,107,53,0.2))",
              animation: "logo-pulse 4s ease-in-out infinite alternate",
            }}
          />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
            background: "linear-gradient(135deg, #fff 30%, var(--accent-energy) 70%, var(--accent-xp))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "0.25rem",
          }}
        >
          ARCADE SURVIVOR CHAOS
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
            maxWidth: "580px",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            marginBottom: "0.5rem",
          }}
        >
          5 supervivientes. 1 arena circular. Sinergias de armas únicas.
          Sobrevive oleadas interminables y vence al Bonklord.
        </p>

        {/* Live badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(127,255,0,0.1)",
            border: "1px solid rgba(127,255,0,0.3)",
            borderRadius: "9999px",
            padding: "0.3rem 0.85rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--accent-xp)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "2rem",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--accent-xp)",
              boxShadow: "0 0 6px var(--accent-xp)",
              animation: "blink 1.4s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          Rondas infinitas · Cap {GAME_CONFIG.hardEnemyCap} enemigos · Boss cada 10 rondas
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
            marginBottom: "4.5rem",
          }}
        >
          <Link
            to="/characters"
            className="btn btn-primary"
            style={{ padding: "1rem 2.25rem", fontSize: "1rem", borderRadius: "12px" }}
          >
            <Play size={20} fill="currentColor" />
            JUGAR AHORA
          </Link>
          <Link
            to="/leaderboard"
            className="btn btn-secondary"
            style={{ padding: "1rem 1.75rem", fontSize: "1rem" }}
          >
            <Trophy size={18} />
            Leaderboard
          </Link>
          <Link
            to="/instructions"
            className="btn btn-outline"
            style={{ padding: "1rem 1.75rem", fontSize: "1rem" }}
          >
            <BookOpen size={18} />
            Cómo Jugar
          </Link>
        </div>

        {/* Feature Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            width: "100%",
          }}
        >
          {[
            {
              icon: <Flame size={26} color="var(--accent-orange)" />,
              title: "5 Supervivientes",
              desc: "BONK · BYTE · TANK · NOVA · HEX — armas y sinergias únicas por personaje.",
              accent: "var(--accent-orange)",
              bg: "rgba(255,107,53,0.06)",
              border: "rgba(255,107,53,0.2)",
            },
            {
              icon: <Sparkles size={26} color="var(--accent-energy)" />,
              title: "Sinergias de Armas",
              desc: "METEOR SLAM · PRISM BARRAGE · CYCLONE EDGE · SUPERNOVA · HEXSTORM.",
              accent: "var(--accent-energy)",
              bg: "rgba(0,229,255,0.06)",
              border: "rgba(0,229,255,0.2)",
            },
            {
              icon: <Shield size={26} color="var(--accent-xp)" />,
              title: "Sistema de Escudo",
              desc: "Absorción por escudo + consumibles de recuperación durante el combate.",
              accent: "var(--accent-xp)",
              bg: "rgba(127,255,0,0.06)",
              border: "rgba(127,255,0,0.2)",
            },
            {
              icon: <Zap size={26} color="#b060ff" />,
              title: "Profesor IA",
              desc: "Asistente técnico con Gemini que analiza el código real del proyecto.",
              accent: "#b060ff",
              bg: "rgba(176,96,255,0.06)",
              border: "rgba(176,96,255,0.2)",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="glass-panel"
              style={{
                padding: "1.5rem 1.25rem",
                textAlign: "left",
                background: card.bg,
                border: `1px solid ${card.border}`,
                transition: "all 0.25s var(--ease-snappy)",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${card.border}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "";
              }}
            >
              <div style={{ marginBottom: "0.75rem" }}>{card.icon}</div>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: card.accent,
                  marginBottom: "0.4rem",
                  letterSpacing: "0.02em",
                }}
              >
                {card.title}
              </h3>
              <p style={{ fontSize: "0.82rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Tech Stack Strip */}
        <div
          style={{
            marginTop: "3rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            justifyContent: "center",
          }}
        >
          {["React 19", "Three.js", "R3F", "Rapier", "Zustand", "Web Audio API", "n8n", "Gemini"].map((tech) => (
            <span
              key={tech}
              style={{
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                padding: "0.25rem 0.65rem",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* CSS animations injected inline */}
      <style>{`
        @keyframes orb-float {
          0%   { transform: translateY(0px) scale(1); }
          50%  { transform: translateY(-20px) scale(1.05); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes logo-pulse {
          from { filter: drop-shadow(0 0 30px rgba(255,107,53,0.4)) drop-shadow(0 0 60px rgba(255,107,53,0.15)); }
          to   { filter: drop-shadow(0 0 50px rgba(255,107,53,0.65)) drop-shadow(0 0 100px rgba(255,107,53,0.25)); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </main>
  );
};

