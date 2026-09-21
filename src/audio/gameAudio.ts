export type GameSfx =
  | "hammer"
  | "energyOrb"
  | "axe"
  | "enemyHit"
  | "enemyDeath"
  | "bossDeath"
  | "xpPickup"
  | "levelUp"
  | "playerDamage"
  | "bossSpawn"
  | "gameOver"
  | "victory"
  | "ui";

type AudioState = {
  muted: boolean;
  volume: number;
};

const STORAGE_KEY = "bonkageddon-audio";
const DEFAULT_STATE: AudioState = { muted: false, volume: 0.55 };
const sfxCooldownMs: Record<GameSfx, number> = {
  hammer: 180,
  energyOrb: 80,
  axe: 140,
  enemyHit: 45,
  enemyDeath: 60,
  bossDeath: 1000,
  xpPickup: 35,
  levelUp: 400,
  playerDamage: 350,
  bossSpawn: 1000,
  gameOver: 800,
  victory: 800,
  ui: 50,
};

const lastPlayed = new Map<GameSfx, number>();
let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let state = loadState();

function loadState(): AudioState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const saved = JSON.parse(raw) as Partial<AudioState>;
    return {
      muted: Boolean(saved.muted),
      volume: clampVolume(Number(saved.volume ?? DEFAULT_STATE.volume)),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Audio preferences are nice-to-have; gameplay must keep running.
  }
}

function clampVolume(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_STATE.volume;
}

function getContext() {
  if (context) return context;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  context = new AudioContextCtor();
  masterGain = context.createGain();
  masterGain.gain.value = state.muted ? 0 : state.volume;
  masterGain.connect(context.destination);
  return context;
}

function envelope(gain: GainNode, now: number, peak: number, attack: number, release: number) {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
}

function tone(ctx: AudioContext, frequency: number, duration: number, type: OscillatorType, gainValue: number) {
  if (!masterGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(masterGain);
  envelope(gain, ctx.currentTime, gainValue, 0.01, duration);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.04);
}

function sweep(
  ctx: AudioContext,
  from: number,
  to: number,
  duration: number,
  type: OscillatorType,
  gainValue: number
) {
  if (!masterGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  envelope(gain, ctx.currentTime, gainValue, 0.006, duration);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.04);
}

function playUnlocked(sfx: GameSfx) {
  const ctx = getContext();
  switch (sfx) {
    case "hammer":
      sweep(ctx, 120, 45, 0.22, "sawtooth", 0.28);
      tone(ctx, 64, 0.16, "square", 0.18);
      break;
    case "energyOrb":
      sweep(ctx, 520, 980, 0.12, "triangle", 0.18);
      break;
    case "axe":
      sweep(ctx, 320, 130, 0.16, "sawtooth", 0.2);
      break;
    case "enemyHit":
      sweep(ctx, 220, 90, 0.08, "square", 0.12);
      break;
    case "enemyDeath":
      sweep(ctx, 260, 75, 0.12, "sawtooth", 0.18);
      tone(ctx, 95, 0.08, "square", 0.14);
      break;
    case "bossDeath":
      sweep(ctx, 160, 35, 0.85, "sawtooth", 0.32);
      tone(ctx, 55, 0.6, "square", 0.22);
      break;
    case "xpPickup":
      sweep(ctx, 740, 1320, 0.09, "sine", 0.14);
      break;
    case "levelUp":
      tone(ctx, 523, 0.15, "triangle", 0.18);
      window.setTimeout(() => tone(getContext(), 784, 0.18, "triangle", 0.18), 90);
      window.setTimeout(() => tone(getContext(), 1046, 0.22, "triangle", 0.16), 180);
      break;
    case "playerDamage":
      sweep(ctx, 170, 55, 0.25, "sawtooth", 0.26);
      break;
    case "bossSpawn":
      sweep(ctx, 70, 180, 0.7, "sawtooth", 0.26);
      tone(ctx, 46, 0.5, "square", 0.16);
      break;
    case "gameOver":
      sweep(ctx, 260, 70, 0.65, "square", 0.22);
      break;
    case "victory":
      tone(ctx, 523, 0.18, "triangle", 0.18);
      window.setTimeout(() => tone(getContext(), 659, 0.18, "triangle", 0.18), 120);
      window.setTimeout(() => tone(getContext(), 784, 0.28, "triangle", 0.18), 240);
      break;
    case "ui":
      tone(ctx, 880, 0.05, "sine", 0.08);
      break;
  }
}

export const gameAudio = {
  getState: () => state,
  init: async () => {
    try {
      const ctx = getContext();
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      // Browsers may reject audio before a gesture; never block gameplay.
    }
  },
  play: (sfx: GameSfx) => {
    try {
      if (state.muted) return;
      const now = performance.now();
      if (now - (lastPlayed.get(sfx) ?? 0) < sfxCooldownMs[sfx]) return;
      lastPlayed.set(sfx, now);
      playUnlocked(sfx);
    } catch {
      // Audio is decorative; failures must be silent.
    }
  },
  setMuted: (muted: boolean) => {
    state = { ...state, muted };
    if (masterGain) masterGain.gain.value = muted ? 0 : state.volume;
    saveState();
  },
  setVolume: (volume: number) => {
    state = { ...state, volume: clampVolume(volume) };
    if (masterGain && !state.muted) masterGain.gain.value = state.volume;
    saveState();
  },
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
