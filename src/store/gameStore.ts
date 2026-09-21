import { create } from "zustand";
import type { Character, CharacterId, GameStatus, RoundStatus, UpgradeId } from "../types/game";
import { getXpRequiredForLevel } from "../game/progression";

interface GameState {
  selectedCharacterId: CharacterId | null;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  round: number;
  roundStatus: RoundStatus;
  score: number;
  kills: number;
  level: number;
  xp: number;
  xpRequired: number;
  pendingLevelUps: number;
  timeSurvivedSeconds: number;
  bossActive: boolean;
  bossHealth: number;
  bossMaxHealth: number;
  upgrades: Record<UpgradeId, number>;
  gameStatus: GameStatus;

  // Actions
  setSelectedCharacter: (id: CharacterId | null) => void;
  setGameStatus: (status: GameStatus) => void;
  setRound: (round: number) => void;
  setRoundStatus: (status: RoundStatus) => void;
  advanceRound: () => void;
  setHealth: (health: number) => void;
  setShield: (shield: number) => void;
  heal: (amount: number) => void;
  addShield: (amount: number) => void;
  takeDamage: (amount: number) => void;
  addScore: (amount: number) => void;
  addKill: (scoreBonus?: number) => void;
  addKills: (count: number, scoreBonus?: number) => void;
  addXp: (amount: number) => void;
  applyUpgrade: (upgradeId: UpgradeId) => void;
  setTimeSurvived: (seconds: number) => void;
  setBossActive: (active: boolean) => void;
  updateBossHealth: (health: number, maxHealth?: number) => void;
  levelUp: () => void;
  resetRun: () => void;
  initializeCharacterRun: (character: Character) => void;
}

const INITIAL_UPGRADES: Record<UpgradeId, number> = {
  damage: 0,
  haste: 0,
  speed: 0,
  vitality: 0,
  armor: 0,
  magnet: 0,
  critical: 0,
  multishot: 0,
};

const INITIAL_RUN_STATE = {
  health: 100,
  maxHealth: 100,
  shield: 0,
  maxShield: 100,
  round: 1,
  roundStatus: "wave" as RoundStatus,
  score: 0,
  kills: 0,
  level: 1,
  xp: 0,
  xpRequired: 100,
  pendingLevelUps: 0,
  timeSurvivedSeconds: 0,
  bossActive: false,
  bossHealth: 1200,
  bossMaxHealth: 1200,
  upgrades: INITIAL_UPGRADES,
  gameStatus: "idle" as GameStatus,
};

export const useGameStore = create<GameState>((set) => ({
  selectedCharacterId: null,
  ...INITIAL_RUN_STATE,

  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),

  setGameStatus: (status) => set({ gameStatus: status }),

  setRound: (round) => set({ round: Math.max(1, Math.floor(round)) }),

  setRoundStatus: (status) => set({ roundStatus: status }),

  advanceRound: () =>
    set((state) => ({
      round: state.round + 1,
      roundStatus: "wave",
    })),

  setHealth: (health) =>
    set((state) => ({
      health: Math.max(0, Math.min(health, state.maxHealth)),
      gameStatus: health <= 0 ? "gameover" : state.gameStatus,
    })),

  setShield: (shield) =>
    set((state) => ({
      shield: Math.max(0, Math.min(shield, state.maxShield)),
    })),

  heal: (amount) =>
    set((state) => ({
      health: Math.min(state.maxHealth, state.health + Math.max(0, amount)),
    })),

  addShield: (amount) =>
    set((state) => ({
      shield: Math.min(state.maxShield, state.shield + Math.max(0, amount)),
    })),

  takeDamage: (amount) =>
    set((state) => {
      // Armor reduces damage received by 15% per tier, up to 75% max
      const armorTier = state.upgrades.armor || 0;
      const reduction = Math.min(0.75, armorTier * 0.15);
      const mitigatedDamage = Math.max(1, Math.round(amount * (1 - reduction)));

      let newShield = state.shield;
      let newHealth = state.health;

      if (newShield > 0) {
        if (newShield >= mitigatedDamage) {
          newShield -= mitigatedDamage;
        } else {
          const remainder = mitigatedDamage - newShield;
          newShield = 0;
          newHealth = Math.max(0, newHealth - remainder);
        }
      } else {
        newHealth = Math.max(0, newHealth - mitigatedDamage);
      }

      return {
        shield: newShield,
        health: newHealth,
        gameStatus: newHealth <= 0 ? "gameover" : state.gameStatus,
      };
    }),

  addScore: (amount) =>
    set((state) => ({ score: state.score + Math.max(0, amount) })),

  addKill: (scoreBonus = 0) =>
    set((state) => ({
      kills: state.kills + 1,
      score: state.score + scoreBonus,
    })),

  addKills: (count: number, scoreBonus = 0) =>
    set((state) => ({
      kills: state.kills + count,
      score: state.score + scoreBonus,
    })),

  addXp: (amount) =>
    set((state) => {
      let currentXp = state.xp + amount;
      let currentLevel = state.level;
      let req = state.xpRequired;
      let pending = state.pendingLevelUps;

      // Preserve exact XP overflow and increment pending level-ups
      while (currentXp >= req) {
        currentXp -= req;
        currentLevel += 1;
        req = getXpRequiredForLevel(currentLevel);
        pending += 1;
      }

      const shouldLevelUp = pending > 0 && state.gameStatus === "playing";

      return {
        xp: currentXp,
        level: currentLevel,
        xpRequired: req,
        pendingLevelUps: pending,
        gameStatus: shouldLevelUp ? "levelup" : state.gameStatus,
      };
    }),

  applyUpgrade: (upgradeId) =>
    set((state) => {
      const currentTier = state.upgrades[upgradeId] || 0;
      const newUpgrades = {
        ...state.upgrades,
        [upgradeId]: currentTier + 1,
      };

      let newMaxHealth = state.maxHealth;
      let newHealth = state.health;

      // Vitality instantly boosts and heals
      if (upgradeId === "vitality") {
        newMaxHealth += 30;
        newHealth = Math.min(newMaxHealth, newHealth + 30);
      }

      const remainingPending = Math.max(0, state.pendingLevelUps - 1);
      // Process remaining pending level-ups one choice at a time
      const nextStatus = remainingPending > 0 ? "levelup" : "playing";

      return {
        upgrades: newUpgrades,
        maxHealth: newMaxHealth,
        health: newHealth,
        pendingLevelUps: remainingPending,
        gameStatus: nextStatus,
      };
    }),

  setTimeSurvived: (seconds) =>
    set({ timeSurvivedSeconds: Math.max(0, Math.floor(seconds)) }),

  setBossActive: (active) => set({ bossActive: active }),

  updateBossHealth: (health, maxHealth) =>
    set((state) => ({
      bossHealth: Math.max(0, health),
      bossMaxHealth: maxHealth !== undefined ? maxHealth : state.bossMaxHealth,
    })),

  levelUp: () =>
    set((state) => ({
      level: state.level + 1,
      xpRequired: getXpRequiredForLevel(state.level + 1),
      pendingLevelUps: state.pendingLevelUps + 1,
      gameStatus: "levelup",
    })),

  resetRun: () =>
    set((state) => ({
      ...INITIAL_RUN_STATE,
      selectedCharacterId: state.selectedCharacterId,
      gameStatus: "playing",
    })),

  initializeCharacterRun: (character: Character) =>
    set(() => ({
      selectedCharacterId: character.id,
      health: character.health,
      maxHealth: character.health,
      shield: 0,
      maxShield: 100,
      round: 1,
      roundStatus: "wave",
      score: 0,
      kills: 0,
      level: 1,
      xp: 0,
      xpRequired: 100,
      pendingLevelUps: 0,
      timeSurvivedSeconds: 0,
      bossActive: false,
      bossHealth: 1200,
      bossMaxHealth: 1200,
      upgrades: { ...INITIAL_UPGRADES },
      gameStatus: "playing",
    })),
}));
