import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GameRuntime } from "../../game/runtime";
import { useGameStore } from "../../store/gameStore";
import {
  addPassive,
  addXpAfterMax,
  applyDamage,
  clearEnemies,
  clearUpgrades,
  endFrenzy,
  maxAllUpgrades,
  prepareBossRound,
  resetPassives,
  resetQaRun,
  setFrenzyKills,
  setHp,
  spawnChest,
  spawnNormalEnemies,
  spawnPickup,
  startFrenzy,
  switchQaCharacter,
  unlockSecretRecipe,
  QA_CHARACTERS,
} from "../../game/devTools";
import { WEAPON_CONFIGS } from "../../game/config";
import { getActiveSynergies } from "../../game/weaponSynergies";
import type { CharacterId, RecoveryPickupType, SpecialPickupType, WeaponType } from "../../types/game";
import "../../styles/dev-tools.css";

interface DevToolsOverlayProps {
  runtimeRef: React.RefObject<GameRuntime>;
}

const bossButtons = [
  ["R10 Bonklord", 10],
  ["R20 Cindermaw", 20],
  ["R30 Stormcoil", 30],
  ["R40 Venomatrix", 40],
  ["R50 Cryovex", 50],
  ["R60 Bonklord T2", 60],
  ["R100 Cryovex T2", 100],
] as const;

const recoveryPickups: Array<[string, RecoveryPickupType]> = [
  ["Medkit Emergency", "medkit_emergency"],
  ["Medkit Case", "medkit_case"],
  ["Shield Potion", "shield_potion"],
  ["Shield Battery", "shield_battery"],
];

const allRelics: Array<[string, SpecialPickupType]> = [
  ["Overclock Core", "overclock_core"],
  ["Tesla Cell", "tesla_cell"],
  ["Toxic Relic", "toxic_relic"],
  ["Phoenix Fragment", "phoenix_fragment"],
  ["Aegis Capacitor", "aegis_capacitor"],
  ["Apex Lens", "apex_lens"],
  ["Echo Prism", "echo_prism"],
  ["Gravity Seed", "gravity_seed"],
];

const rosterIds: CharacterId[] = ["bonk", "byte", "tank", "nova", "hex", "rift", "fuse", "lux"];

export const DevToolsOverlay: React.FC<DevToolsOverlayProps> = ({ runtimeRef }) => {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [position, setPosition] = useState({ x: 16, y: 70 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const store = useGameStore();
  const runtime = runtimeRef.current;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "F8") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition({
        x: Math.max(0, event.clientX - dragRef.current.dx),
        y: Math.max(0, event.clientY - dragRef.current.dy),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const stats = useMemo(() => {
    void tick;
    return {
      enemies: runtime.enemies.length,
      bossType: store.bossType || "none",
      pickups: runtime.pickups.length,
      chests: runtime.chests.length,
      projectiles: runtime.projectiles.length,
      particles: runtime.particles.length,
      passives: store.passives,
      secrets: store.secretPassives,
    };
  }, [runtime, store, tick]);

  const combat = useMemo(() => {
    void tick;
    const charId = (store.selectedCharacterId || "bonk") as CharacterId;
    const char = QA_CHARACTERS[charId] || QA_CHARACTERS.bonk;
    const wType: WeaponType = char.weapon;
    const wConfig = WEAPON_CONFIGS[wType];
    const upgrades = store.upgrades;
    const passives = store.passives;
    const secrets = store.secretPassives;

    const damageMult = 1 + (upgrades.damage || 0) * 0.15;
    const hasteMult =
      (1 + (upgrades.haste || 0) * 0.15) *
      (1 + (passives.overclock_core || 0) * 0.15) *
      (secrets?.storm_engine ? 1.10 : 1.0);
    const effCooldown = (wConfig.baseCooldown / hasteMult).toFixed(2);
    const bossDmgMult = (
      1 +
      (upgrades.boss_hunter || 0) * 0.07 +
      (passives.apex_lens || 0) * 0.06 +
      (secrets?.apex_echo ? 0.15 : 0)
    ).toFixed(2);
    const critChance = ((upgrades.critical || 0) * 10).toFixed(0) + "%";
    const critMult = (
      2.0 +
      (upgrades.precision || 0) * 0.15 +
      (passives.echo_prism || 0) * 0.10 +
      (secrets?.apex_echo ? 0.25 : 0)
    ).toFixed(2) + "x";
    const areaMult = (
      (1 + (upgrades.area || 0) * 0.07) *
      (1 + (passives.gravity_seed || 0) * 0.08) *
      (secrets?.venom_singularity ? 1.10 : 1.0)
    ).toFixed(2);
    const activeSynergies = getActiveSynergies(charId, upgrades);
    const fortuneTier = upgrades.fortune || 0;
    const fortuneChance = (1.5 + fortuneTier * 0.30).toFixed(2) + "%";

    return {
      charName: char.name,
      weaponName: wConfig.name,
      effCooldown: `${effCooldown}s`,
      hasteMult: `${hasteMult.toFixed(2)}x`,
      damageMult: `${damageMult.toFixed(2)}x`,
      bossDmgMult: `${bossDmgMult}x`,
      critChance,
      critMult,
      areaMult: `${areaMult}x`,
      activeSynergies: activeSynergies.length > 0 ? activeSynergies.join(", ") : "none",
      fortuneChance,
    };
  }, [store, tick]);

  if (!open) return null;

  const button = (label: string, action: () => void, highlight = false) => (
    <button
      type="button"
      onClick={action}
      style={highlight ? { borderColor: "#00e5ff", background: "rgba(0, 229, 255, 0.18)" } : undefined}
    >
      {label}
    </button>
  );

  return (
    <aside className="dev-tools" style={{ left: position.x, top: position.y }}>
      <header
        onMouseDown={(event) => {
          dragRef.current = {
            dx: event.clientX - position.x,
            dy: event.clientY - position.y,
          };
        }}
      >
        <strong>BONKAGEDDON DEV QA</strong>
        <span>F8</span>
      </header>

      {/* Live Simulation & Session State */}
      <section className="dev-tools-grid">
        <span>Round</span><b>{store.round} / {store.roundStatus}</b>
        <span>Level</span><b>Lv {store.level} ({store.xp}/{store.xpRequired} XP)</b>
        <span>HP</span><b>{store.health}/{store.maxHealth}</b>
        <span>Shield</span><b>{store.shield}/{store.maxShield}</b>
        <span>Pending Lvl</span><b>{store.pendingLevelUps}</b>
        <span>Frenzy</span><b>{store.frenzyActive ? `ON (${Math.ceil(store.frenzyTimer)}s)` : "off"}</b>
        <span>Boss</span><b>{stats.bossType} {store.bossActive ? `${store.bossHealth}/${store.bossMaxHealth}` : ""}</b>
        <span>Entities</span><b>E:{stats.enemies} P:{stats.projectiles} C:{stats.chests}</b>
      </section>

      {/* Live Combat Math */}
      <section>
        <h3>Live Combat State</h3>
        <div className="dev-tools-grid">
          <span>Survivor</span><b>{combat.charName} ({combat.weaponName})</b>
          <span>Cooldown</span><b>{combat.effCooldown} (Haste: {combat.hasteMult})</b>
          <span>Damage Mult</span><b>{combat.damageMult} (Boss: {combat.bossDmgMult})</b>
          <span>Crit</span><b>{combat.critChance} @ {combat.critMult}</b>
          <span>Area Radius</span><b>{combat.areaMult}</b>
          <span>Fortune Drop</span><b>{combat.fortuneChance}</b>
          <span>Active Synergy</span><b>{combat.activeSynergies}</b>
        </div>
      </section>

      {/* Relics & Secret Passives Display */}
      <section>
        <h3>Relics & Secret Passives</h3>
        <div className="dev-tools-grid" style={{ marginBottom: "0.4rem" }}>
          <span>Relics (8)</span>
          <b>
            OC:{stats.passives.overclock_core} TC:{stats.passives.tesla_cell} TX:{stats.passives.toxic_relic} PH:{stats.passives.phoenix_fragment} AC:{stats.passives.aegis_capacitor} AL:{stats.passives.apex_lens} EP:{stats.passives.echo_prism} GS:{stats.passives.gravity_seed}
          </b>
          <span>Secrets</span>
          <b>
            {[
              stats.secrets.storm_engine && "Storm Engine",
              stats.secrets.venom_singularity && "Venom Singularity",
              stats.secrets.radiant_bastion && "Radiant Bastion",
              stats.secrets.apex_echo && "Apex Echo",
            ]
              .filter(Boolean)
              .join(" | ") || "None"}
          </b>
        </div>
        <div className="dev-tools-buttons">
          {button("Recipe: Storm Engine", () => unlockSecretRecipe("storm_engine"))}
          {button("Recipe: Venom Singularity", () => unlockSecretRecipe("venom_singularity"))}
          {button("Recipe: Radiant Bastion", () => unlockSecretRecipe("radiant_bastion"))}
          {button("Recipe: Apex Echo", () => unlockSecretRecipe("apex_echo"))}
        </div>
      </section>

      {/* Roster Quick Switch */}
      <section>
        <h3>Roster Quick Switch</h3>
        <div className="dev-tools-buttons">
          {rosterIds.map((id) =>
            button(
              id.toUpperCase(),
              () => switchQaCharacter(id),
              store.selectedCharacterId === id
            )
          )}
        </div>
      </section>

      {/* Progression & Max Upgrades */}
      <section>
        <h3>Progression & Upgrades</h3>
        <div className="dev-tools-buttons">
          {button("Max All 20 Upgrades", maxAllUpgrades, true)}
          {button("XP After Max (+500 XP)", () => addXpAfterMax(500))}
          {button("Clear Normal Upgrades", clearUpgrades)}
          {button("Add +100 XP", () => addXpAfterMax(100))}
        </div>
      </section>

      {/* Chests & Relic Vault */}
      <section>
        <h3>Chests & Vault</h3>
        <div className="dev-tools-buttons">
          {button("Common Chest", () => spawnChest(runtime, "common"))}
          {button("Rare Chest (+25 Shield)", () => spawnChest(runtime, "rare"))}
          {button("Legendary Relic Vault", () => spawnChest(runtime, "legendary"), true)}
        </div>
      </section>

      {/* Relics (All 8) */}
      <section>
        <h3>Relic Stacks (+1)</h3>
        <div className="dev-tools-buttons">
          {allRelics.map(([label, type]) =>
            button(`+1 ${label.split(" ")[0]} (${stats.passives[type]}/5)`, () => addPassive(type))
          )}
          {button("Reset All Relics", resetPassives)}
        </div>
      </section>

      {/* Boss Rounds & Spawns */}
      <section>
        <h3>Boss Encounters & Frenzy</h3>
        <div className="dev-tools-buttons">
          {bossButtons.map(([label, round]) => button(label, () => prepareBossRound(runtime, round)))}
          {button("Clear Enemies", () => clearEnemies(runtime))}
          {button("Set 74 Frenzy Kills", () => setFrenzyKills(runtime, 74))}
          {button("Start Frenzy", () => startFrenzy(runtime))}
          {button("End Frenzy", () => endFrenzy(runtime))}
        </div>
      </section>

      {/* Recovery & Health */}
      <section>
        <h3>Health & Pickups</h3>
        <div className="dev-tools-buttons">
          {button("Set HP 10", () => setHp(10))}
          {button("Damage 25", () => applyDamage(runtime, 25))}
          {button("Damage Lethal (Phoenix test)", () => applyDamage(runtime, 9999), true)}
          {recoveryPickups.map(([label, type]) => button(label, () => spawnPickup(runtime, type)))}
          {allRelics.map(([label, type]) => button(`Spawn ${label.split(" ")[0]}`, () => spawnPickup(runtime, type)))}
        </div>
      </section>

      {/* Stress & Reset */}
      <section>
        <h3>Enemy Stress & Reset</h3>
        <div className="dev-tools-buttons">
          {button("Spawn 10 Normal Enemies", () => spawnNormalEnemies(runtime, 10))}
          {button("Spawn 25 Normal Enemies", () => spawnNormalEnemies(runtime, 25))}
          {button("RESET QA RUN", () => resetQaRun(runtime), true)}
        </div>
      </section>
    </aside>
  );
};
