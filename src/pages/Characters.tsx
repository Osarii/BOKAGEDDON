import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Character } from "../types/game";
import { getCharacters } from "../services/api";
import { CharacterCard } from "../components/characters/CharacterCard";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { useGameStore } from "../store/gameStore";
import "../styles/characters.css";

export const Characters: React.FC = () => {
  const navigate = useNavigate();
  const initializeCharacterRun = useGameStore((s) => s.initializeCharacterRun);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);

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
    <main className="container characters-page-main">
      <header className="characters-header">
        <h1 className="characters-title">Select Your Survivor</h1>
        <p className="characters-subtitle">
          Choose your hero to enter the arena. Each warrior features distinct movement
          languages, signature combat arts, and elemental weapon synergies.
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
        <section className="character-selection-grid" aria-label="Character Selection List">
          {characters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={selectedCharacterId === char.id}
              onSelect={handleSelectCharacter}
            />
          ))}
        </section>
      )}
    </main>
  );
};
