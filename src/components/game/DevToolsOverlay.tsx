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
import {
  getPerformanceSnapshot,
  startScenarioBenchmark,
  getLastScenarioReport,
  getAllScenarioReports,
  clearScenarioReports,
  type PerformanceSnapshot,
  type ScenarioReport,
} from "../../game/devPerformance";
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
  const [open, setOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("qa") === "1");
  const [tick, setTick] = useState(0);
  const [position, setPosition] = useState({ x: 16, y: 70 });
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<string | null>(null);
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
    if (!open && !isAuditing) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, [open, isAuditing]);

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

  const perf: PerformanceSnapshot = useMemo(() => {
    void tick;
    return getPerformanceSnapshot();
  }, [tick]);

  const lastReport: ScenarioReport | null = useMemo(() => {
    void tick;
    return getLastScenarioReport();
  }, [tick]);

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

  // ---------------------------------------------------------------------------
  // Scenario runners — v1.1 corrected
  // Each scenario explicitly selects its character for isolation.
  // ---------------------------------------------------------------------------

  // S1 — Baseline: Bonk, 5 enemies, no upgrades
  const runScenario1 = () => {
    resetQaRun(runtime);
    switchQaCharacter("bonk");
    spawnNormalEnemies(runtime, 5);
  };

  // S2 — Enemy count ramp: Bonk, 25 enemies, no upgrades
  const runScenario2 = () => {
    resetQaRun(runtime);
    switchQaCharacter("bonk");
    spawnNormalEnemies(runtime, 25);
  };

  // S3 — Hard cap: Bonk, 48 enemies, no upgrades
  const runScenario3 = () => {
    resetQaRun(runtime);
    switchQaCharacter("bonk");
    spawnNormalEnemies(runtime, 48);
  };

  // S4 — Frenzy stress: Bonk, 48 enemies + Frenzy (run twice for repeatability)
  const runScenario4 = () => {
    resetQaRun(runtime);
    switchQaCharacter("bonk");
    spawnNormalEnemies(runtime, 48);
    startFrenzy(runtime);
  };

  // S5 — Boss pressure: Tank, Cindermaw + 20 normal enemies, no upgrades
  const runScenario5 = () => {
    resetQaRun(runtime);
    switchQaCharacter("tank");
    prepareBossRound(runtime, 20); // Cindermaw Fire Boss (round 20)
    spawnNormalEnemies(runtime, 20);
  };

  // S6 — Lux base (hitscan, no upgrades, 25 enemies) — weapon cost in isolation
  const runScenario6 = () => {
    resetQaRun(runtime);
    switchQaCharacter("lux");
    spawnNormalEnemies(runtime, 25);
  };

  // S7 — Lux hitscan max: all upgrades + additional secret passives for maximum stress, 35 enemies (run twice)
  //        SolarRefraction synergy activates automatically because maxAllUpgrades()
  //        satisfies its requirements (critical>=2, precision>=2).
  const runScenario7 = () => {
    resetQaRun(runtime);
    switchQaCharacter("lux");
    maxAllUpgrades();
    unlockSecretRecipe("apex_echo"); // extra stress: higher crit chance/multiplier (does NOT activate SolarRefraction)
    spawnNormalEnemies(runtime, 35);
  };

  // S8 — Pickup billboard: Bonk, 36 pickups, no enemies
  const runScenario8 = () => {
    resetQaRun(runtime);
    switchQaCharacter("bonk");
    const allP: Array<RecoveryPickupType | SpecialPickupType> = [
      "overclock_core", "tesla_cell", "toxic_relic", "phoenix_fragment",
      "aegis_capacitor", "apex_lens", "echo_prism", "gravity_seed",
      "medkit_emergency", "medkit_case", "shield_potion", "shield_battery"
    ];
    for (let i = 0; i < 36; i++) {
      spawnPickup(runtime, allP[i % allP.length]);
    }
  };

  // S9 — BYTE projectile swarm: Byte + all upgrades + additional secret passives for maximum stress, 30 enemies (run twice)
  //        PrismBarrage synergy activates automatically because maxAllUpgrades()
  //        satisfies its requirements (haste>=2, multishot>=2).
  const runScenario9 = () => {
    resetQaRun(runtime);
    switchQaCharacter("byte");
    maxAllUpgrades();
    unlockSecretRecipe("storm_engine"); // extra stress: shock proc rate boost (does NOT activate PrismBarrage)
    spawnNormalEnemies(runtime, 30);
  };

  // S10 — Elemental/status-VFX stress: Nova + all upgrades + all synergies, 40 enemies
  const runScenario10 = () => {
    resetQaRun(runtime);
    switchQaCharacter("nova");
    maxAllUpgrades();
    unlockSecretRecipe("storm_engine");
    unlockSecretRecipe("venom_singularity");
    unlockSecretRecipe("radiant_bastion");
    unlockSecretRecipe("apex_echo");
    spawnNormalEnemies(runtime, 40);
  };

  const runFullSuite = async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setOpen(true);
    clearScenarioReports();

    // Warmup (ms) before each measurement window — allows entities to spawn and settle
    const WARMUP_MS = 1500;
    // Measurement window in seconds — 10 s gives ~600 samples at 60 fps
    const MEASURE_SEC = 10;

    // Critical degraded scenarios run twice to separate init hitches from sustained cost
    const scenarios: Array<{ name: string; setup: () => void }> = [
      { name: "S1: Bonk Baseline (5 foes)",            setup: runScenario1 },
      { name: "S2: Bonk 25 foes",                      setup: runScenario2 },
      { name: "S3: Bonk Hard Cap (48 foes)",           setup: runScenario3 },
      { name: "S4a: Bonk 48+Frenzy (run 1)",          setup: runScenario4 },
      { name: "S4b: Bonk 48+Frenzy (run 2)",          setup: runScenario4 },
      { name: "S5: Tank Boss Pressure",                setup: runScenario5 },
      { name: "S6: Lux Base (no upgrades)",            setup: runScenario6 },
      { name: "S7a: Lux Hitscan Max (run 1)",         setup: runScenario7 },
      { name: "S7b: Lux Hitscan Max (run 2)",         setup: runScenario7 },
      { name: "S8: Bonk Pickup Billboard (36)",        setup: runScenario8 },
      { name: "S9a: BYTE Projectile Swarm (run 1)",   setup: runScenario9 },
      { name: "S9b: BYTE Projectile Swarm (run 2)",   setup: runScenario9 },
      { name: "S10: Nova Elemental VFX Stress",       setup: runScenario10 },
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i];
      setAuditProgress(`[${i + 1}/${scenarios.length}] Warming up: ${s.name}...`);
      s.setup();
      // Warmup: let entities spawn and frame loop stabilise before recording
      await new Promise((r) => setTimeout(r, WARMUP_MS));
      setAuditProgress(`[${i + 1}/${scenarios.length}] Measuring: ${s.name}...`);
      await startScenarioBenchmark(s.name, MEASURE_SEC);
    }

    setAuditProgress("Audit suite complete! Check console or below.");
    setIsAuditing(false);

    // Format markdown report — metric column labels corrected for v1.1
    const reports = getAllScenarioReports();
    let md = `| Scenario | Avg FPS | p99 frame-time / 1%-low eq FPS | Avg Frame Time | Max Frame Time | Draw Calls | Triangles | Enemies | Particles | DPR | Heap MB |\n`;
    md += `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    for (const r of reports) {
      md += `| ${r.scenarioName} | **${r.avgFps}** | **${r.onePercentLowFps}** | ${r.avgFrameTimeMs} ms | ${r.maxFrameTimeMs} ms | ${r.drawCallsAvg} | ${r.trianglesAvg.toLocaleString()} | ${r.enemiesAvg} | ${r.particlesAvg} | ${r.dpr} | ${r.memoryMb ?? "N/A"} |\n`;
    }
    console.log("=== BONKAGEDDON PERFORMANCE AUDIT V1.2 RESULTS ===\n" + md);
  };

  const runFullSuiteRef = useRef(runFullSuite);
  runFullSuiteRef.current = runFullSuite;
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __BONK_RUN_FULL_SUITE__?: () => void }).__BONK_RUN_FULL_SUITE__ = () => {
        runFullSuiteRef.current();
      };
    }
  }, []);

  if (!open) return null;

  const button = (label: string, action: () => void, highlight = false, disabled = false) => (
    <button
      key={label}
      type="button"
      onClick={action}
      disabled={disabled}
      style={highlight ? { borderColor: "#00e5ff", background: "rgba(0, 229, 255, 0.18)" } : undefined}
    >
      {label}
    </button>
  );

  const fpsColor = perf.avgFps >= 55 ? "#4ade80" : perf.avgFps >= 40 ? "#fbbf24" : "#f87171";

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
        <strong>BONKAGEDDON DEV QA & PERF AUDIT</strong>
        <span>F8</span>
      </header>

      {/* PERFORMANCE INSTRUMENTATION V1 */}
      <section className="perf-section">
        <h3 style={{ color: "#00e5ff", display: "flex", justifyContent: "space-between" }}>
          <span>Performance Probe (V1)</span>
          <span style={{ color: fpsColor }}>{perf.fps} FPS</span>
        </h3>
        <div className="dev-tools-grid">
          <span>FPS (Cur / Avg)</span>
          <b>
            <span style={{ color: fpsColor }}>{perf.fps}</span> / {perf.avgFps}
          </b>
          <span>1% Low FPS</span>
          <b style={{ color: perf.onePercentLowFps >= 45 ? "#4ade80" : "#f87171" }}>
            {perf.onePercentLowFps} FPS
          </b>
          <span>Frame Time</span>
          <b>{perf.frameTimeMs} ms</b>
          <span>Draw Calls</span>
          <b>{perf.drawCalls}</b>
          <span>Triangles</span>
          <b>{perf.triangles.toLocaleString()}</b>
          <span>Geometries / Textures</span>
          <b>{perf.geometries} / {perf.textures}</b>
          <span>Entities (E/P/K/VFX)</span>
          <b>
            E:{perf.enemies} P:{perf.projectiles} K:{perf.pickups} V:{perf.particles}
          </b>
          <span>DPR / Heap</span>
          <b>{perf.dpr}x / {perf.memoryMb ? `${perf.memoryMb} MB` : "N/A (unexposed)"}</b>
        </div>

        <div style={{ marginTop: "0.55rem" }} className="dev-tools-buttons">
          {button(
            isAuditing ? "Auditing..." : "Run Full Suite (v1.2 — 13 runs)",
            runFullSuite,
            true,
            isAuditing
          )}
          {button("Sample 3s (Current)", () => startScenarioBenchmark("Custom Snapshot", 10), false, isAuditing)}
        </div>

        {auditProgress && (
          <div style={{ marginTop: "0.35rem", fontSize: "0.68rem", color: "#fbbf24" }}>
            {auditProgress}
          </div>
        )}

        {lastReport && (
          <div className="perf-last-report">
            <div style={{ fontWeight: 800, color: "#38bdf8" }}>Last: {lastReport.scenarioName}</div>
            <div>
              Avg FPS: <b>{lastReport.avgFps}</b> &bull; 1% Low: <b>{lastReport.onePercentLowFps}</b> &bull; Time: <b>{lastReport.avgFrameTimeMs}ms</b>
            </div>
            <div>
              Calls: <b>{lastReport.drawCallsAvg}</b> &bull; Tris: <b>{lastReport.trianglesAvg}</b> &bull; Foes: <b>{lastReport.enemiesAvg}</b>
            </div>
          </div>
        )}
      </section>

      {/* Reproducible Scenario Presets — v1.1 */}
      <section>
        <h3>Audit Scenario Presets (v1.1)</h3>
        <div className="dev-tools-buttons">
          {button("S1: Bonk Baseline", runScenario1)}
          {button("S2: Bonk 25 foes", runScenario2)}
          {button("S3: Bonk Hard Cap (48)", runScenario3)}
          {button("S4: Bonk 48+Frenzy", runScenario4)}
          {button("S5: Tank Boss", runScenario5)}
          {button("S6: Lux Base", runScenario6)}
          {button("S7: Lux Hitscan Max", runScenario7)}
          {button("S8: Pickup Billboards", runScenario8)}
          {button("S9: BYTE Proj Swarm", runScenario9)}
          {button("S10: Nova Elemental VFX", runScenario10)}
        </div>
      </section>

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
