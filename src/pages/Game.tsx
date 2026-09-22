import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { GameScene } from "../scene/GameScene";
import { HUDShell } from "../components/game/HUDShell";
import { LevelUpOverlay } from "../components/game/LevelUpOverlay";
import { PauseOverlay } from "../components/game/PauseOverlay";
import { ChestRewardOverlay } from "../components/game/ChestRewardOverlay";
import { GameOverOverlay } from "../components/game/GameOverOverlay";
import { VictoryOverlay } from "../components/game/VictoryOverlay";
import { useGameStore } from "../store/gameStore";
import { getCharacter } from "../services/api";
import { LoadingState } from "../components/ui/LoadingState";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { createGameRuntime, type GameRuntime } from "../game/runtime";
import type { Character, CharacterId } from "../types/game";

const VALID_CHARACTER_IDS: CharacterId[] = ["bonk", "byte", "tank", "nova", "hex", "rift", "fuse", "lux"];
type DevToolsComponent = React.ComponentType<{ runtimeRef: React.RefObject<GameRuntime> }>;

export const Game: React.FC = () => {
  const { characterId } = useParams<{ characterId: string }>();

  // High-frequency mutable gameplay runtime owned by Game/GameScene
  const runtimeRef = useRef<GameRuntime>(createGameRuntime());

  // Per-run score save guard to ensure POST /scores occurs at most once
  const hasSavedScoreRef = useRef<boolean>(false);
  const hasSentWebhookRef = useRef<boolean>(false);

  // Cached character stats for instant replay without re-fetching
  const cachedCharacterRef = useRef<Character | null>(null);

  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const initializeCharacterRun = useGameStore((s) => s.initializeCharacterRun);

  const isValid = Boolean(characterId && VALID_CHARACTER_IDS.includes(characterId as CharacterId));
  const [isLoading, setIsLoading] = useState<boolean>(() => isValid && selectedCharacterId !== characterId);
  const [DevToolsOverlay, setDevToolsOverlay] = useState<DevToolsComponent | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const devToolsPath = "/src/components/game/DevToolsOverlay.tsx";
    import(/* @vite-ignore */ devToolsPath).then((module: { DevToolsOverlay: DevToolsComponent }) => {
      setDevToolsOverlay(() => module.DevToolsOverlay);
    });
  }, []);

  useEffect(() => {
    if (!isValid || !characterId) return;

    const controller = new AbortController();

    getCharacter(characterId, controller.signal)
      .then((char) => {
        cachedCharacterRef.current = char;
        if (selectedCharacterId !== characterId) {
          initializeCharacterRun(char);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [isValid, characterId, selectedCharacterId, initializeCharacterRun]);

  // Escape key toggle for pausing/resuming during active gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        const status = useGameStore.getState().gameStatus;
        if (status === "playing") {
          useGameStore.getState().pauseGame();
        } else if (status === "paused") {
          useGameStore.getState().resumeGame();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Clean full run reset handler
  const handlePlayAgain = () => {
    // 1. Reset high-frequency simulation runtime
    runtimeRef.current.reset();

    // 2. Reset score save guard for new run
    hasSavedScoreRef.current = false;
    hasSentWebhookRef.current = false;

    // 3. Reset store and reinitialize character
    if (cachedCharacterRef.current) {
      initializeCharacterRun(cachedCharacterRef.current);
    } else {
      useGameStore.getState().resetRun();
    }
  };

  // Invalid character state
  if (!isValid) {
    return (
      <main className="container" style={{ padding: "5rem 1.5rem", textAlign: "center" }}>
        <div
          className="glass-panel"
          style={{ maxWidth: "520px", margin: "0 auto", padding: "3rem 2rem" }}
        >
          <AlertTriangle size={48} color="var(--accent-orange)" style={{ marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Unknown Survivor</h2>
          <p style={{ marginBottom: "2rem" }}>
            The character ID <code>&quot;{characterId}&quot;</code> does not exist in the BONKAGEDDON
            roster. Please select a registered warrior.
          </p>
          <Link to="/characters" className="btn btn-primary">
            <ArrowLeft size={16} />
            Return to Character Select
          </Link>
        </div>
      </main>
    );
  }

  // Loading character data
  if (isLoading) {
    return (
      <main className="container" style={{ padding: "6rem 1.5rem" }}>
        <LoadingState message={`Preparing arena for ${characterId?.toUpperCase()}...`} />
      </main>
    );
  }

  return (
    <div className="game-viewport-container">
      {/* 3D R3F Canvas and Physics Scene */}
      <GameScene runtimeRef={runtimeRef} />

      {/* Layer A React HUD */}
      <HUDShell />

      {/* Pause Menu Overlay */}
      <PauseOverlay onPlayAgain={handlePlayAgain} />

      {/* Level Up Choice Overlay */}
      <LevelUpOverlay />

      {/* Chest Reward Overlay */}
      <ChestRewardOverlay />

      {/* Game Over Overlay */}
      <GameOverOverlay
        onPlayAgain={handlePlayAgain}
        hasSavedScoreRef={hasSavedScoreRef}
        hasSentWebhookRef={hasSentWebhookRef}
      />

      {/* Victory Overlay */}
      <VictoryOverlay
        onPlayAgain={handlePlayAgain}
        hasSavedScoreRef={hasSavedScoreRef}
        hasSentWebhookRef={hasSentWebhookRef}
      />

      {DevToolsOverlay && (
        <DevToolsOverlay runtimeRef={runtimeRef} />
      )}
    </div>
  );
};
