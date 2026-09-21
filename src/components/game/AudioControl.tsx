import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { gameAudio } from "../../audio/gameAudio";

export const AudioControl: React.FC = () => {
  const [audioState, setAudioState] = useState(gameAudio.getState());

  useEffect(() => {
    const unlock = () => {
      void gameAudio.init();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggleMuted = () => {
    void gameAudio.init();
    const muted = !audioState.muted;
    gameAudio.setMuted(muted);
    gameAudio.play("ui");
    setAudioState(gameAudio.getState());
  };

  const setVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    void gameAudio.init();
    gameAudio.setVolume(Number(event.target.value));
    setAudioState(gameAudio.getState());
  };

  return (
    <div className="hud-pill" title="Game audio">
      <button
        type="button"
        onClick={toggleMuted}
        aria-label={audioState.muted ? "Unmute audio" : "Mute audio"}
        style={{
          width: 26,
          height: 26,
          border: 0,
          background: "transparent",
          color: "var(--text-primary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {audioState.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={audioState.volume}
        onChange={setVolume}
        aria-label="Master volume"
        style={{ width: 74, accentColor: "var(--accent-energy)" }}
      />
    </div>
  );
};
