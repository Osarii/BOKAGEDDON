import React from "react";
import { NavLink, Link } from "react-router-dom";
import { ASSETS } from "../../config/assets";
import { Trophy, BookOpen, Users, Play, Bot } from "lucide-react";

export const NavBar: React.FC = () => {
  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src={ASSETS.ui.logo} alt="BONKAGEDDON" />
          <span>BONKAGEDDON</span>
        </Link>
        <ul className="navbar-links">
          <li>
            <NavLink
              to="/characters"
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              <Users size={16} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 4 }} />
              Characters
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              <Trophy size={16} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 4 }} />
              Leaderboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/instructions"
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              <BookOpen size={16} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 4 }} />
              Instructions
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/profesor-ia"
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              <Bot size={16} style={{ display: "inline", verticalAlign: "text-bottom", marginRight: 4 }} />
              Profesor IA
            </NavLink>
          </li>
          <li>
            <Link to="/characters" className="btn btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
              <Play size={14} fill="currentColor" />
              Play
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};
