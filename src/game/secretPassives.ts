import type { SecretPassiveId, SpecialPickupType } from "../types/game";

export interface SecretPassiveConfig {
  id: SecretPassiveId;
  name: string;
  recipeDescription: string;
  effectDescription: string;
  requiredRelics: Partial<Record<SpecialPickupType, number>>;
}

export const SECRET_PASSIVES: Record<SecretPassiveId, SecretPassiveConfig> = {
  storm_engine: {
    id: "storm_engine",
    name: "Storm Engine",
    recipeDescription: "Overclock Core Tier 2 + Tesla Cell Tier 2",
    effectDescription: "+10% final attack speed, +10% Shock proc chance, +25% Shock chain damage",
    requiredRelics: {
      overclock_core: 2,
      tesla_cell: 2,
    },
  },
  venom_singularity: {
    id: "venom_singularity",
    name: "Venom Singularity",
    recipeDescription: "Toxic Relic Tier 2 + Gravity Seed Tier 2",
    effectDescription: "+25% Poison DoT, +20% Poison duration, +10% final attack area",
    requiredRelics: {
      toxic_relic: 2,
      gravity_seed: 2,
    },
  },
  radiant_bastion: {
    id: "radiant_bastion",
    name: "Radiant Bastion",
    recipeDescription: "Phoenix Fragment Tier 1 + Aegis Capacitor Tier 2",
    effectDescription: "Revive at 60% max HP, restore +50 Shield, 3.5s invulnerability",
    requiredRelics: {
      phoenix_fragment: 1,
      aegis_capacitor: 2,
    },
  },
  apex_echo: {
    id: "apex_echo",
    name: "Apex Echo",
    recipeDescription: "Apex Lens Tier 2 + Echo Prism Tier 2",
    effectDescription: "Against bosses: +15% additional damage, +0.25x critical damage multiplier",
    requiredRelics: {
      apex_lens: 2,
      echo_prism: 2,
    },
  },
};

export function checkSecretPassiveUnlocks(
  passives: Record<SpecialPickupType, number>,
  currentSecrets: Record<SecretPassiveId, boolean>
): { updatedSecrets: Record<SecretPassiveId, boolean>; newlyUnlocked: SecretPassiveId[] } {
  const updatedSecrets = { ...currentSecrets };
  const newlyUnlocked: SecretPassiveId[] = [];

  for (const [id, config] of Object.entries(SECRET_PASSIVES) as [SecretPassiveId, SecretPassiveConfig][]) {
    if (updatedSecrets[id]) continue;

    const satisfies = Object.entries(config.requiredRelics).every(
      ([relicId, count]) => (passives[relicId as SpecialPickupType] || 0) >= (count || 0)
    );

    if (satisfies) {
      updatedSecrets[id] = true;
      newlyUnlocked.push(id);
    }
  }

  return { updatedSecrets, newlyUnlocked };
}
