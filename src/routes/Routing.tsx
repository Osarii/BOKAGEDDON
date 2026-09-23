import React, { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Home } from "../pages/Home";
import { Characters } from "../pages/Characters";
import { Game } from "../pages/Game";
import { Leaderboard } from "../pages/Leaderboard";
import { Instructions } from "../pages/Instructions";
import { NotFound } from "../pages/NotFound";
import { NavBar } from "../components/ui/NavBar";

// Lazy-loaded: ProfessorAI imports projectContext which runs import.meta.glob eagerly
// and builds the chunk index (~2s). Defer until the user actually navigates there.
const ProfessorAI = lazy(() =>
  import("../pages/ProfessorAI").then((m) => ({ default: m.ProfessorAI }))
);

// Lazy-loaded: CharacterLab is a DEV-only 3D visual inspection environment.
// Kept in an isolated chunk to avoid affecting the standard game bundle.
const CharacterLab = lazy(() =>
  import("../pages/dev/CharacterLab").then((m) => ({ default: m.CharacterLab }))
);

const ProfessorFallback = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "60vh",
      flexDirection: "column",
      gap: "1rem",
      color: "var(--accent-energy)",
    }}
  >
    <div className="spinner" />
    <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
      Cargando Profesor IA…
    </span>
  </div>
);

const CharacterLabFallback = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#030712",
      flexDirection: "column",
      gap: "1rem",
      color: "#00e5ff",
      fontFamily: "var(--font-mono, monospace)",
    }}
  >
    <div className="spinner" />
    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
      Cargando Character Visual QA Lab…
    </span>
  </div>
);

export const Routing: React.FC = () => {
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith("/game/");
  const isDevRoute = location.pathname.startsWith("/dev/");

  return (
    <>
      {/* Show top navigation bar on standard pages, hide in full-screen game and dev lab */}
      {!isGameRoute && !isDevRoute && <NavBar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/characters" element={<Characters />} />
        <Route path="/game/:characterId" element={<Game />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/instructions" element={<Instructions />} />
        <Route
          path="/profesor-ia"
          element={
            <Suspense fallback={ProfessorFallback}>
              <ProfessorAI />
            </Suspense>
          }
        />
        {/* DEV-only Character Visual QA Lab */}
        <Route
          path="/dev/character-lab"
          element={
            <Suspense fallback={CharacterLabFallback}>
              <CharacterLab />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};
