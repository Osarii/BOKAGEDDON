import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_UPGRADE_LEVEL, SPECIAL_PICKUP_CONFIG, UPGRADE_DETAILS } from "../../game/config";
import { getXpRequiredForLevel } from "../../game/progression";
import { useGameStore } from "../gameStore";
import type { Character, SpecialPickupType, UpgradeId } from "../../types/game";

const testCharacter: Character = {
  id: "bonk",
  name: "BONK",
  role: "Test Survivor",
  weapon: "hammer",
  description: "Test character",
  color: "#ffb020",
  health: 125,
  speed: 5,
  damage: 10,
  attackCooldown: 1,
};

const allUpgradeIds = Object.keys(UPGRADE_DETAILS) as UpgradeId[];
const allRelicIds = Object.keys(SPECIAL_PICKUP_CONFIG.visuals) as SpecialPickupType[];

function startRun() {
  useGameStore.getState().initializeCharacterRun(testCharacter);
}

function maxAllUpgradesExcept(openId?: UpgradeId) {
  for (const id of allUpgradeIds) {
    useGameStore.setState((state) => ({
      upgrades: {
        ...state.upgrades,
        [id]: id === openId ? MAX_UPGRADE_LEVEL - 1 : MAX_UPGRADE_LEVEL,
      },
    }));
  }
}

describe("game store progression", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    startRun();
  });

  it("preserves exact XP overflow across one level", () => {
    useGameStore.getState().addXp(getXpRequiredForLevel(1) + 7);

    const state = useGameStore.getState();
    expect(state.level).toBe(2);
    expect(state.xp).toBe(7);
    expect(state.xpRequired).toBe(getXpRequiredForLevel(2));
    expect(state.pendingLevelUps).toBe(1);
    expect(state.gameStatus).toBe("levelup");
  });

  it("preserves exact XP overflow and pending count across multiple levels", () => {
    const xp = getXpRequiredForLevel(1) + getXpRequiredForLevel(2) + 13;
    useGameStore.getState().addXp(xp);

    const state = useGameStore.getState();
    expect(state.level).toBe(3);
    expect(state.xp).toBe(13);
    expect(state.xpRequired).toBe(getXpRequiredForLevel(3));
    expect(state.pendingLevelUps).toBe(2);
    expect(state.gameStatus).toBe("levelup");
  });

  it("does not leave maxed-upgrade XP gains trapped in levelup", () => {
    maxAllUpgradesExcept();
    useGameStore.setState({ gameStatus: "playing" });

    useGameStore.getState().addXp(getXpRequiredForLevel(1) + 1);

    const state = useGameStore.getState();
    expect(state.level).toBe(2);
    expect(state.pendingLevelUps).toBe(0);
    expect(state.gameStatus).toBe("playing");
  });

  it("clears impossible pending selections when the final available upgrade is claimed", () => {
    maxAllUpgradesExcept("damage");
    useGameStore.setState({ pendingLevelUps: 3, gameStatus: "levelup" });

    useGameStore.getState().applyUpgrade("damage");

    const state = useGameStore.getState();
    expect(state.upgrades.damage).toBe(MAX_UPGRADE_LEVEL);
    expect(state.pendingLevelUps).toBe(0);
    expect(state.gameStatus).toBe("playing");
  });

  it("resets run progression while preserving selected character", () => {
    useGameStore.getState().addScore(500);
    useGameStore.getState().addKill(100);
    useGameStore.getState().addXp(getXpRequiredForLevel(1) + 3);
    useGameStore.getState().addPassive("overclock_core");

    useGameStore.getState().resetRun();

    const state = useGameStore.getState();
    expect(state.selectedCharacterId).toBe("bonk");
    expect(state.score).toBe(0);
    expect(state.kills).toBe(0);
    expect(state.level).toBe(1);
    expect(state.xp).toBe(0);
    expect(state.pendingLevelUps).toBe(0);
    expect(state.passives.overclock_core).toBe(0);
    expect(state.gameStatus).toBe("playing");
  });
});

describe("game store relic and chest regressions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    startRun();
  });

  it("caps relic stacks at the configured maximum", () => {
    for (let i = 0; i < SPECIAL_PICKUP_CONFIG.maxStacks + 2; i++) {
      useGameStore.getState().addPassive("overclock_core");
    }

    expect(useGameStore.getState().passives.overclock_core).toBe(SPECIAL_PICKUP_CONFIG.maxStacks);
  });

  it("unlocks a secret passive when the required relic stack is added", () => {
    useGameStore.getState().addPassive("overclock_core");
    useGameStore.getState().addPassive("tesla_cell");
    expect(useGameStore.getState().secretPassives.storm_engine).toBe(false);

    useGameStore.getState().addPassive("overclock_core");
    useGameStore.getState().addPassive("tesla_cell");

    const state = useGameStore.getState();
    expect(state.passives.overclock_core).toBe(2);
    expect(state.passives.tesla_cell).toBe(2);
    expect(state.secretPassives.storm_engine).toBe(true);
  });

  it("opens Legendary Relic Vault with relic choices only", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    useGameStore.getState().openChestReward("legendary");

    const reward = useGameStore.getState().pendingChestReward;
    expect(reward).toBeTruthy();
    if (!reward || reward.type !== "relic") throw new Error("Expected a relic reward");
    expect(reward.rarity).toBe("legendary");
    expect(reward.choices.length).toBeGreaterThan(0);
    expect(reward.choices.every((choice) => allRelicIds.includes(choice))).toBe(true);
    expect(useGameStore.getState().gameStatus).toBe("chest");
  });

  it("converts a maxed Legendary Relic Vault without blocking on a chest modal", () => {
    const maxedPassives = Object.fromEntries(
      allRelicIds.map((id) => [id, SPECIAL_PICKUP_CONFIG.maxStacks])
    ) as Record<SpecialPickupType, number>;
    useGameStore.setState({ passives: maxedPassives, health: 1, shield: 0, score: 25 });

    useGameStore.getState().openChestReward("legendary");

    const state = useGameStore.getState();
    expect(state.pendingChestReward).toBeNull();
    expect(state.gameStatus).toBe("playing");
    expect(state.health).toBe(state.maxHealth);
    expect(state.shield).toBe(state.maxShield);
    expect(state.score).toBe(1025);
  });
});
