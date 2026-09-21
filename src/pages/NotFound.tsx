import React from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, Home as HomeIcon } from "lucide-react";

export const NotFound: React.FC = () => {
  return (
    <main className="container" style={{ padding: "6rem 1.5rem", textAlign: "center" }}>
      <div
        className="glass-panel"
        style={{ maxWidth: "480px", margin: "0 auto", padding: "3rem 2rem" }}
      >
        <AlertOctagon size={48} color="var(--accent-danger)" style={{ marginBottom: "1rem" }} />
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>404 — ARENA NOT FOUND</h1>
        <p style={{ marginBottom: "2rem" }}>
          You have wandered outside known survivor coordinates. Return to safety immediately.
        </p>
        <Link to="/" className="btn btn-primary">
          <HomeIcon size={16} />
          Return to Base
        </Link>
      </div>
    </main>
  );
};
