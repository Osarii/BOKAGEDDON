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

export const Routing: React.FC = () => {
  const location = useLocation();
  const isGameRoute = location.pathname.startsWith("/game/");

  return (
    <>
      {/* Show top navigation bar on all pages except full-screen game viewport */}
      {!isGameRoute && <NavBar />}

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

