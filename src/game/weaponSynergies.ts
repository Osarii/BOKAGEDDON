import type { CharacterId, UpgradeId } from "../types/game";

export type SynergyId =
  | "meteor-slam"
  | "prism-barrage"
  | "cyclone-edge"
  | "supernova"
  | "hexstorm";

export interface WeaponSynergy {
  id: SynergyId;
  name: string;
  characterId: CharacterId;
  requiredUpgrades: Partial<Record<UpgradeId, number>>;
  description: string;
}

export const WEAPON_SYNERGIES: Record<SynergyId, WeaponSynergy> = {
  "meteor-slam": {
    id: "meteor-slam",
    name: "METEOR SLAM",
    characterId: "bonk",
    requiredUpgrades: { damage: 2, critical: 2 },
    description: "Critical hammer attacks create a secondary smaller shockwave.",
  },
  "prism-barrage": {
    id: "prism-barrage",
    name: "PRISM BARRAGE",
    characterId: "byte",
    requiredUpgrades: { haste: 2, multishot: 2 },
    description: "Attacks gain an additional stronger central piercing orb.",
  },
  "cyclone-edge": {
    id: "cyclone-edge",
    name: "CYCLONE EDGE",
    characterId: "tank",
    requiredUpgrades: { damage: 2, multishot: 2 },
    description: "Orbital axes gain a stronger, wider, faster combat pattern.",
  },
  supernova: {
    id: "supernova",
    name: "SUPERNOVA",
    characterId: "nova",
    requiredUpgrades: { damage: 2, haste: 2 },
    description: "Radial burst releases a secondary delayed outer burst.",
  },
  hexstorm: {
    id: "hexstorm",
    name: "HEXSTORM",
    characterId: "hex",
    requiredUpgrades: { critical: 2, multishot: 2 },
    description: "Seeking void projectile can jump to an additional enemy.",
  },
};

/**
 * Checks whether a specific weapon synergy is currently satisfied.
 */
export function hasSynergy(
  synergyId: SynergyId,
  characterId: CharacterId,
  upgrades: Partial<Record<UpgradeId, number>>
): boolean {
  const synergy = WEAPON_SYNERGIES[synergyId];
  if (!synergy || synergy.characterId !== characterId) {
    return false;
  }

  for (const [upgradeKey, minTier] of Object.entries(synergy.requiredUpgrades)) {
    const currentTier = upgrades[upgradeKey as UpgradeId] || 0;
    if (currentTier < (minTier || 0)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns all active synergies for a given character and their upgrade state.
 */
export function getActiveSynergies(
  characterId: CharacterId,
  upgrades: Partial<Record<UpgradeId, number>>
): SynergyId[] {
  return (Object.keys(WEAPON_SYNERGIES) as SynergyId[]).filter((id) =>
    hasSynergy(id, characterId, upgrades)
  );
}
