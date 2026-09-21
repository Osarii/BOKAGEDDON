import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Character } from "../types/game";
import { getCharacters } from "../services/api";
import { CharacterCard } from "../components/characters/CharacterCard";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { useGameStore } from "../store/gameStore";

export const Characters: React.FC = () => {
  const navigate = useNavigate();
  const initializeCharacterRun = useGameStore((s) => s.initializeCharacterRun);

  // State requirements: useState for local fetch state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logic wrapped with useCallback
  const fetchCharacters = useCallback((signal?: AbortSignal) => {
    getCharacters(signal)
      .then((data) => {
        setCharacters(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        // Ignore aborted requests
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to connect to JSON Server. Ensure JSON Server is running on port 3001.";
        setError(errorMsg);
        setIsLoading(false);
      });
  }, []);

  // Effect requirement: useEffect with AbortController for clean teardown
  useEffect(() => {
    const controller = new AbortController();
    fetchCharacters(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchCharacters]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchCharacters();
  };

  const handleSelectCharacter = (char: Character) => {
    // Initialize run in Zustand store
    initializeCharacterRun(char);
    // Navigate to dynamic route
    navigate(`/game/${char.id}`);
  };

  return (
    <main className="container" style={{ padding: "3rem 1.5rem 5rem" }}>
      <header style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>SELECT YOUR SURVIVOR</h1>
        <p style={{ maxWidth: "550px", margin: "0 auto" }}>
          Choose your hero to enter the arena. Each character comes with distinct base
          attributes and starting weapon behavior.
        </p>
      </header>

      {/* Loading state */}
      {isLoading && <LoadingState message="Fetching survivors from database..." />}

      {/* Error state with retry */}
      {error && (
        <ErrorState
          title="Could Not Load Characters"
          message={error}
          onRetry={handleRetry}
        />
      )}

      {/* Character grid with stable keys */}
      {!isLoading && !error && (
        <section className="character-grid" aria-label="Character Selection List">
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              onSelect={handleSelectCharacter}
            />
          ))}
        </section>
      )}
    </main>
  );
};
