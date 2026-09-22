import { describe, expect, it } from "vitest";
import { HARD_ENEMY_CAP, MAX_UPGRADE_LEVEL, UPGRADE_DETAILS } from "../config";
import {
  getBossStats,
  getBossTier,
  getBossTypeForRound,
  getRoundEnemyCap,
  getXpRequiredForLevel,
  hasAvailableUpgrades,
  isBossRound,
} from "../progression";

describe("core progression", () => {
  it("scales enemy cap from round 1 and never exceeds the hard cap", () => {
    expect(getRoundEnemyCap(1)).toBe(12);
    expect(getRoundEnemyCap(2)).toBe(15);
    expect(getRoundEnemyCap(5)).toBe(24);
    expect(getRoundEnemyCap(999)).toBe(HARD_ENEMY_CAP);
  });

  it("clamps invalid low round input before calculating enemy cap", () => {
    expect(getRoundEnemyCap(0)).toBe(getRoundEnemyCap(1));
    expect(getRoundEnemyCap(-12)).toBe(getRoundEnemyCap(1));
    expect(getRoundEnemyCap(1.9)).toBe(getRoundEnemyCap(1));
  });

  it("marks every tenth round as a boss round after clamping", () => {
    expect(isBossRound(9)).toBe(false);
    expect(isBossRound(10)).toBe(true);
    expect(isBossRound(20)).toBe(true);
    expect(isBossRound(21)).toBe(false);
    expect(isBossRound(0)).toBe(false);
  });

  it("rotates bosses over each five-boss cycle", () => {
    expect(getBossTypeForRound(10)).toBe("bonklord");
    expect(getBossTypeForRound(20)).toBe("cindermaw");
    expect(getBossTypeForRound(30)).toBe("stormcoil");
    expect(getBossTypeForRound(40)).toBe("venomatrix");
    expect(getBossTypeForRound(50)).toBe("cryovex");
    expect(getBossTypeForRound(60)).toBe("bonklord");
  });

  it("increments boss tier after each full roster cycle", () => {
    for (const round of [10, 20, 30, 40, 50]) {
      expect(getBossTier(round)).toBe(1);
    }
    for (const round of [60, 70, 80, 90, 100]) {
      expect(getBossTier(round)).toBe(2);
    }
  });

  it("scales boss stats by tier and archetype", () => {
    expect(getBossStats(1, "stormcoil")).toEqual({ health: 1100, damage: 22, speed: 3 });
    expect(getBossStats(2, "stormcoil")).toEqual({ health: 1760, damage: 31, speed: 3.12 });
    expect(getBossStats(20, "stormcoil").speed).toBe(4);
  });

  it("calculates XP requirements and clamps invalid low level input", () => {
    expect(getXpRequiredForLevel(1)).toBe(85);
    expect(getXpRequiredForLevel(2)).toBe(101);
    expect(getXpRequiredForLevel(5)).toBe(170);
    expect(getXpRequiredForLevel(0)).toBe(getXpRequiredForLevel(1));
    expect(getXpRequiredForLevel(-4)).toBe(getXpRequiredForLevel(1));
  });

  it("reports no available upgrades when every tracked upgrade is maxed", () => {
    const maxed = Object.fromEntries(
      Object.keys(UPGRADE_DETAILS).map((id) => [id, MAX_UPGRADE_LEVEL])
    );

    expect(hasAvailableUpgrades(maxed)).toBe(false);
    expect(hasAvailableUpgrades({ ...maxed, damage: MAX_UPGRADE_LEVEL - 1 })).toBe(true);
  });
});
