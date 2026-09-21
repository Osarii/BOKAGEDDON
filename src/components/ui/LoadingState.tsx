import React from "react";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="state-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{message}</p>
    </div>
  );
};
