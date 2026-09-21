import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Connection Error",
  message,
  onRetry,
}) => {
  return (
    <div className="state-container" role="alert">
      <AlertCircle size={44} color="var(--accent-danger)" />
      <h3 style={{ color: "var(--accent-danger)", marginTop: "0.5rem" }}>{title}</h3>
      <p style={{ maxWidth: "480px" }}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary"
          style={{ marginTop: "1rem" }}
        >
          <RefreshCw size={16} />
          Retry Request
        </button>
      )}
    </div>
  );
};
