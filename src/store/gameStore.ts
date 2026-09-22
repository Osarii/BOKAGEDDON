import { create } from "zustand";
import type {
  BossType,
  Character,
  CharacterId,
  ChestRarity,
  GameStatus,
  PendingChestReward,
  RoundStatus,
  SecretPassiveId,
  SpecialPickupType,
  UpgradeId,
} from "../types/game";
import { getXpRequiredForLevel, hasAvailableUpgrades } from "../game/progression";
import { MAX_UPGRADE_LEVEL, SPECIAL_PICKUP_CONFIG } from "../game/config";
import { checkSecretPassiveUnlocks, SECRET_PASSIVES } from "../game/secretPassives";

export type PassiveStacks = Record<SpecialPickupType, number>;
export type SecretPassiveState = Record<SecretPassiveId, boolean>;

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
  bossType: BossType | null;
  bossName: string;
  bossTier: number;
  bossAccentColor: string;
  upgrades: Record<UpgradeId, number>;
  passives: PassiveStacks;
  secretPassives: SecretPassiveState;
  pendingChestReward: PendingChestReward | null;
  frenzyActive: boolean;
  frenzyTimer: number;
  normalEnemyKillsForFrenzy: number;
  nextFrenzyKillThreshold: number;
  gameStatus: GameStatus;
  notification: { title: string; subtitle: string; timestamp: number } | null;

  // Actions
  setSelectedCharacter: (id: CharacterId | null) => void;
  setGameStatus: (status: GameStatus) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  togglePause: () => void;
  setNotification: (notif: { title: string; subtitle: string } | null) => void;
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
  openChestReward: (rarity: ChestRarity) => void;
  claimChestReward: (choice: UpgradeId | SpecialPickupType) => void;
  addPassive: (type: SpecialPickupType) => void;
  setFrenzyState: (state: {
    active: boolean;
    timer: number;
    kills: number;
    nextThreshold: number;
  }) => void;
  setTimeSurvived: (seconds: number) => void;
  setBossActive: (active: boolean) => void;
  updateBossHealth: (
    health: number,
    maxHealth?: number,
    details?: { name?: string; tier?: number; type?: BossType; color?: string }
  ) => void;
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
  fire: 0,
  poison: 0,
  shock: 0,
  frost: 0,
  regeneration: 0,
  barrier: 0,
  area: 0,
  recovery: 0,
  boss_hunter: 0,
  executioner: 0,
  precision: 0,
  fortune: 0,
};

const INITIAL_PASSIVES: PassiveStacks = {
  overclock_core: 0,
  tesla_cell: 0,
  toxic_relic: 0,
  phoenix_fragment: 0,
  aegis_capacitor: 0,
  apex_lens: 0,
  echo_prism: 0,
  gravity_seed: 0,
};

const INITIAL_SECRET_PASSIVES: SecretPassiveState = {
  storm_engine: false,
  venom_singularity: false,
  radiant_bastion: false,
  apex_echo: false,
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
  xpRequired: getXpRequiredForLevel(1),
  pendingLevelUps: 0,
  timeSurvivedSeconds: 0,
  bossActive: false,
  bossHealth: 1200,
  bossMaxHealth: 1200,
  bossType: null as BossType | null,
  bossName: "Bonklord",
  bossTier: 1,
  bossAccentColor: "#e11d48",
  upgrades: INITIAL_UPGRADES,
  passives: INITIAL_PASSIVES,
  secretPassives: INITIAL_SECRET_PASSIVES,
  pendingChestReward: null,
  frenzyActive: false,
  frenzyTimer: 0,
  normalEnemyKillsForFrenzy: 0,
  nextFrenzyKillThreshold: 75,
  gameStatus: "idle" as GameStatus,
  notification: null,
};

export const useGameStore = create<GameState>((set) => ({
  selectedCharacterId: null,
  ...INITIAL_RUN_STATE,

  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),

  setGameStatus: (status) => set({ gameStatus: status }),

  pauseGame: () =>
    set((state) => (state.gameStatus === "playing" ? { gameStatus: "paused" } : state)),

  resumeGame: () =>
    set((state) => (state.gameStatus === "paused" ? { gameStatus: "playing" } : state)),

  togglePause: () =>
    set((state) => {
      if (state.gameStatus === "playing") return { gameStatus: "paused" };
      if (state.gameStatus === "paused") return { gameStatus: "playing" };
      return state;
    }),

  setNotification: (notif) =>
    set({
      notification: notif ? { ...notif, timestamp: Date.now() } : null,
    }),

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
      // Armor reduces damage received by 10% per tier, up to 50% max
      const armorTier = state.upgrades.armor || 0;
      const reduction = Math.min(0.50, armorTier * 0.10);
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

      const isReviving = newHealth <= 0 && state.passives.phoenix_fragment > 0;
      if (isReviving) {
        const hasRadiantBastion = Boolean(state.secretPassives?.radiant_bastion);
        const reviveHp = hasRadiantBastion ? Math.ceil(state.maxHealth * 0.6) : Math.ceil(state.maxHealth * 0.4);
        const reviveShield = hasRadiantBastion ? Math.min(state.maxShield, newShield + 50) : newShield;
        return {
          shield: reviveShield,
          health: reviveHp,
          passives: { ...state.passives, phoenix_fragment: state.passives.phoenix_fragment - 1 },
          notification: {
            title: hasRadiantBastion ? "RADIANT BASTION REVIVE" : "PHOENIX REVIVE",
            subtitle: hasRadiantBastion ? "Revived at 60% HP + 50 Shield + 3.5s Invulnerability" : "Revived at 40% HP + 2s Invulnerability",
            timestamp: Date.now(),
          },
          gameStatus: state.gameStatus,
        };
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

      const canUpgrade = hasAvailableUpgrades(state.upgrades);

      // If all upgrades are maxed:
      // pendingLevelUps = 0
      // XP must not set gameStatus = "levelup"
      if (!canUpgrade) {
        return {
          xp: currentXp,
          level: currentLevel,
          xpRequired: req,
          pendingLevelUps: 0,
          gameStatus: state.gameStatus === "levelup" ? "playing" : state.gameStatus,
        };
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

      // Vitality instantly boosts max HP and heals (+25)
      if (upgradeId === "vitality") {
        newMaxHealth += 25;
        newHealth = Math.min(newMaxHealth, newHealth + 25);
      }

      // Barrier Matrix instantly boosts max Shield and restores (+15)
      let newMaxShield = state.maxShield;
      let newShield = state.shield;
      if (upgradeId === "barrier") {
        newMaxShield += 15;
        newShield = Math.min(newMaxShield, newShield + 15);
      }

      // Check if any upgrade choices remain across the pool
      const canUpgrade = hasAvailableUpgrades(newUpgrades);

      // If selecting the final available upgrade leaves queued pending level-ups:
      // clear impossible pending selections, resume gameplay immediately
      if (!canUpgrade) {
        return {
          upgrades: newUpgrades,
          maxHealth: newMaxHealth,
          health: newHealth,
          maxShield: newMaxShield,
          shield: newShield,
          pendingLevelUps: 0,
          gameStatus: "playing",
        };
      }

      // Check if pending level ups remain
      const remainingPending = Math.max(0, state.pendingLevelUps - 1);
      const nextStatus = remainingPending > 0 ? "levelup" : "playing";

      return {
        upgrades: newUpgrades,
        maxHealth: newMaxHealth,
        health: newHealth,
        maxShield: newMaxShield,
        shield: newShield,
        pendingLevelUps: remainingPending,
        gameStatus: nextStatus,
      };
    }),

  openChestReward: (rarity) =>
    set((state) => {
      if (state.gameStatus !== "playing" || state.pendingLevelUps > 0) {
        return state;
      }

      // 1. LEGENDARY CHEST: Relic Vault (special relics only, never normal upgrades)
      if (rarity === "legendary") {
        const allRelicKeys = Object.keys(SPECIAL_PICKUP_CONFIG.visuals) as SpecialPickupType[];
        const validRelics = allRelicKeys
          .filter((id) => (state.passives[id] || 0) < SPECIAL_PICKUP_CONFIG.maxStacks)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        if (validRelics.length === 0) {
          // All relics maxed: convert automatically to full HP/Shield + 1000 score
          return {
            health: state.maxHealth,
            shield: state.maxShield,
            score: state.score + 1000,
            notification: {
              title: "RELIC VAULT MASTERY",
              subtitle: "All relics maxed: Full HP + Full Shield + 1000 Score",
              timestamp: Date.now(),
            },
            gameStatus: state.pendingLevelUps > 0 ? "levelup" : "playing",
            pendingChestReward: null,
          };
        }

        return {
          pendingChestReward: {
            type: "relic",
            rarity: "legendary",
            choices: validRelics,
          },
          gameStatus: "chest",
        };
      }

      // 2. COMMON & RARE CHESTS: Normal Upgrade choices
      const choices = (Object.keys(state.upgrades) as UpgradeId[])
        .filter((id) => (state.upgrades[id] || 0) < MAX_UPGRADE_LEVEL)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (choices.length === 0) {
        return {
          health: Math.min(state.maxHealth, state.health + 20),
          shield: Math.min(state.maxShield, state.shield + (rarity === "rare" ? 25 : 15)),
          score: state.score + (rarity === "rare" ? 200 : 100),
          notification: {
            title: "CHEST CONVERTED",
            subtitle: "All upgrades maxed: recovery + score",
            timestamp: Date.now(),
          },
          gameStatus: state.pendingLevelUps > 0 ? "levelup" : "playing",
          pendingChestReward: null,
        };
      }

      return {
        pendingChestReward: {
          type: "upgrade",
          rarity,
          choices,
        },
        gameStatus: "chest",
      };
    }),

  claimChestReward: (choice) =>
    set((state) => {
      if (!state.pendingChestReward) return state;

      // Handle Legendary Relic Vault choice
      if (state.pendingChestReward.type === "relic") {
        const relicId = choice as SpecialPickupType;
        const nextCount = Math.min(SPECIAL_PICKUP_CONFIG.maxStacks, (state.passives[relicId] || 0) + 1);
        const newPassives = { ...state.passives, [relicId]: nextCount };

        let newMaxShield = state.maxShield;
        let newShield = state.shield;
        if (relicId === "aegis_capacitor") {
          newMaxShield += 15;
          newShield = Math.min(newMaxShield, newShield + 15);
        }

        // Relic Vault rewards: +50 Shield, +35 HP, +500 Score
        newShield = Math.min(newMaxShield, newShield + 50);
        const newHealth = Math.min(state.maxHealth, state.health + 35);
        const newScore = state.score + 500;

        // Evaluate secret passives
        const { updatedSecrets, newlyUnlocked } = checkSecretPassiveUnlocks(newPassives, state.secretPassives);
        let notif = state.notification;
        if (newlyUnlocked.length > 0) {
          const secretName = SECRET_PASSIVES[newlyUnlocked[0]].name;
          notif = {
            title: "SECRET PASSIVE UNLOCKED",
            subtitle: `${secretName}: ${SECRET_PASSIVES[newlyUnlocked[0]].effectDescription}`,
            timestamp: Date.now(),
          };
        }

        return {
          passives: newPassives,
          maxShield: newMaxShield,
          shield: newShield,
          health: newHealth,
          score: newScore,
          secretPassives: updatedSecrets,
          notification: notif,
          pendingChestReward: null,
          gameStatus: state.pendingLevelUps > 0 ? "levelup" : "playing",
        };
      }

      // Handle Normal Upgrade Chest choice (Common / Rare)
      const upgradeId = choice as UpgradeId;
      const rarity = state.pendingChestReward.rarity;
      const currentTier = state.upgrades[upgradeId] || 0;
      const newUpgrades = {
        ...state.upgrades,
        [upgradeId]: Math.min(MAX_UPGRADE_LEVEL, currentTier + 1),
      };

      let newMaxHealth = state.maxHealth;
      let newHealth = state.health;
      if (upgradeId === "vitality") {
        newMaxHealth += 25;
        newHealth = Math.min(newMaxHealth, newHealth + 25);
      }

      let newMaxShield = state.maxShield;
      let newShield = state.shield;
      if (upgradeId === "barrier") {
        newMaxShield += 15;
        newShield = Math.min(newMaxShield, newShield + 15);
      }

      // Rare chest grants +25 Shield
      if (rarity === "rare") {
        newShield = Math.min(newMaxShield, newShield + 25);
      }

      const canUpgrade = hasAvailableUpgrades(newUpgrades);
      const remainingPending = canUpgrade ? state.pendingLevelUps : 0;

      return {
        upgrades: newUpgrades,
        maxHealth: newMaxHealth,
        health: newHealth,
        maxShield: newMaxShield,
        shield: newShield,
        score: state.score,
        pendingChestReward: null,
        pendingLevelUps: remainingPending,
        gameStatus: remainingPending > 0 ? "levelup" : "playing",
      };
    }),

  addPassive: (type) =>
    set((state) => {
      const nextCount = Math.min(SPECIAL_PICKUP_CONFIG.maxStacks, (state.passives[type] || 0) + 1);
      const newPassives = { ...state.passives, [type]: nextCount };
      const visual = SPECIAL_PICKUP_CONFIG.visuals[type];

      let newMaxShield = state.maxShield;
      let newShield = state.shield;
      if (type === "aegis_capacitor") {
        newMaxShield += 15;
        newShield = Math.min(newMaxShield, newShield + 15);
      }

      // Evaluate secret passives event-driven on relic change
      const { updatedSecrets, newlyUnlocked } = checkSecretPassiveUnlocks(newPassives, state.secretPassives);

      let notif = {
        title: visual.name.toUpperCase(),
        subtitle: `${visual.subtitle} · Stack ${nextCount}/${SPECIAL_PICKUP_CONFIG.maxStacks}`,
        timestamp: Date.now(),
      };

      if (newlyUnlocked.length > 0) {
        const secretName = SECRET_PASSIVES[newlyUnlocked[0]].name;
        notif = {
          title: "SECRET PASSIVE UNLOCKED",
          subtitle: `${secretName}: ${SECRET_PASSIVES[newlyUnlocked[0]].effectDescription}`,
          timestamp: Date.now(),
        };
      }

      return {
        passives: newPassives,
        maxShield: newMaxShield,
        shield: newShield,
        secretPassives: updatedSecrets,
        notification: notif,
      };
    }),

  setFrenzyState: (frenzy) =>
    set({
      frenzyActive: frenzy.active,
      frenzyTimer: Math.max(0, frenzy.timer),
      normalEnemyKillsForFrenzy: frenzy.kills,
      nextFrenzyKillThreshold: frenzy.nextThreshold,
    }),

  setTimeSurvived: (seconds) =>
    set({ timeSurvivedSeconds: Math.max(0, Math.floor(seconds)) }),

  setBossActive: (active) => set({ bossActive: active }),

  updateBossHealth: (health, maxHealth, details) =>
    set((state) => ({
      bossHealth: Math.max(0, health),
      bossMaxHealth: maxHealth !== undefined ? maxHealth : state.bossMaxHealth,
      ...(details?.name ? { bossName: details.name } : {}),
      ...(details?.tier ? { bossTier: details.tier } : {}),
      ...(details?.type ? { bossType: details.type } : {}),
      ...(details?.color ? { bossAccentColor: details.color } : {}),
    })),

  levelUp: () =>
    set((state) => {
      const nextLevel = state.level + 1;
      const canUpgrade = hasAvailableUpgrades(state.upgrades);
      if (!canUpgrade) {
        return {
          level: nextLevel,
          xpRequired: getXpRequiredForLevel(nextLevel),
          pendingLevelUps: 0,
        };
      }
      return {
        level: nextLevel,
        xpRequired: getXpRequiredForLevel(nextLevel),
        pendingLevelUps: state.pendingLevelUps + 1,
        gameStatus: state.gameStatus === "playing" ? "levelup" : state.gameStatus,
      };
    }),

  resetRun: () =>
    set((state) => ({
      ...INITIAL_RUN_STATE,
      selectedCharacterId: state.selectedCharacterId,
      upgrades: { ...INITIAL_UPGRADES },
      passives: { ...INITIAL_PASSIVES },
      secretPassives: { ...INITIAL_SECRET_PASSIVES },
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
      xpRequired: getXpRequiredForLevel(1),
      pendingLevelUps: 0,
      timeSurvivedSeconds: 0,
      bossActive: false,
      bossHealth: 1200,
      bossMaxHealth: 1200,
      bossType: null,
      bossName: "Bonklord",
      bossTier: 1,
      bossAccentColor: "#e11d48",
      upgrades: { ...INITIAL_UPGRADES },
      passives: { ...INITIAL_PASSIVES },
      secretPassives: { ...INITIAL_SECRET_PASSIVES },
      pendingChestReward: null,
      frenzyActive: false,
      frenzyTimer: 0,
      normalEnemyKillsForFrenzy: 0,
      nextFrenzyKillThreshold: 75,
      gameStatus: "playing",
      notification: null,
    })),
}));
