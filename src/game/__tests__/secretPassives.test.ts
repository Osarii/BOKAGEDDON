import { describe, expect, it } from "vitest";
import type { SecretPassiveId, SpecialPickupType } from "../../types/game";
import { checkSecretPassiveUnlocks, SECRET_PASSIVES } from "../secretPassives";

const passiveIds = Object.keys(SECRET_PASSIVES) as SecretPassiveId[];
const relicIds: SpecialPickupType[] = [
  "overclock_core",
  "tesla_cell",
  "toxic_relic",
  "phoenix_fragment",
  "aegis_capacitor",
  "apex_lens",
  "echo_prism",
  "gravity_seed",
];

function emptyPassives(): Record<SpecialPickupType, number> {
  return Object.fromEntries(relicIds.map((id) => [id, 0])) as Record<SpecialPickupType, number>;
}

function emptySecrets(): Record<SecretPassiveId, boolean> {
  return Object.fromEntries(passiveIds.map((id) => [id, false])) as Record<SecretPassiveId, boolean>;
}

describe("secret passive recipes", () => {
  it.each(passiveIds)("locks, unlocks, and does not report %s twice", (id) => {
    const config = SECRET_PASSIVES[id];
    const below = emptyPassives();
    const exact = emptyPassives();

    for (const [relicId, count] of Object.entries(config.requiredRelics)) {
      below[relicId as SpecialPickupType] = Math.max(0, (count || 0) - 1);
      exact[relicId as SpecialPickupType] = count || 0;
    }

    const locked = checkSecretPassiveUnlocks(below, emptySecrets());
    expect(locked.updatedSecrets[id]).toBe(false);
    expect(locked.newlyUnlocked).not.toContain(id);

    const unlocked = checkSecretPassiveUnlocks(exact, emptySecrets());
    expect(unlocked.updatedSecrets[id]).toBe(true);
    expect(unlocked.newlyUnlocked).toEqual([id]);

    const afterward = { ...exact };
    for (const relicId of Object.keys(config.requiredRelics) as SpecialPickupType[]) {
      afterward[relicId] += 1;
    }
    const repeated = checkSecretPassiveUnlocks(afterward, unlocked.updatedSecrets);
    expect(repeated.updatedSecrets[id]).toBe(true);
    expect(repeated.newlyUnlocked).not.toContain(id);
  });

  it("can unlock multiple recipes in the same evaluation", () => {
    const passives = emptyPassives();
    passives.overclock_core = 2;
    passives.tesla_cell = 2;
    passives.apex_lens = 2;
    passives.echo_prism = 2;

    const result = checkSecretPassiveUnlocks(passives, emptySecrets());

    expect(result.newlyUnlocked).toEqual(["storm_engine", "apex_echo"]);
    expect(result.updatedSecrets.storm_engine).toBe(true);
    expect(result.updatedSecrets.apex_echo).toBe(true);
  });
});
