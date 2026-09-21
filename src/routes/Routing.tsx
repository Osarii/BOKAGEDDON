import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Home } from "../pages/Home";
import { Characters } from "../pages/Characters";
import { Game } from "../pages/Game";
import { Leaderboard } from "../pages/Leaderboard";
import { Instructions } from "../pages/Instructions";
import { ProfessorAI } from "../pages/ProfessorAI";
import { NotFound } from "../pages/NotFound";
import { NavBar } from "../components/ui/NavBar";

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
        <Route path="/profesor-ia" element={<ProfessorAI />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};
