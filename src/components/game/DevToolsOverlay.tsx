import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GameRuntime } from "../../game/runtime";
import { useGameStore } from "../../store/gameStore";
import {
  addPassive,
  applyDamage,
  clearEnemies,
  endFrenzy,
  prepareBossRound,
  resetPassives,
  resetQaRun,
  setFrenzyKills,
  setHp,
  spawnChest,
  spawnNormalEnemies,
  spawnPickup,
  startFrenzy,
} from "../../game/devTools";
import type { RecoveryPickupType, SpecialPickupType } from "../../types/game";
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

const specialPickups: Array<[string, SpecialPickupType]> = [
  ["Overclock Core", "overclock_core"],
  ["Tesla Cell", "tesla_cell"],
  ["Toxic Relic", "toxic_relic"],
  ["Phoenix Fragment", "phoenix_fragment"],
];

export const DevToolsOverlay: React.FC<DevToolsOverlayProps> = ({ runtimeRef }) => {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [position, setPosition] = useState({ x: 16, y: 90 });
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
    };
  }, [runtime, store, tick]);

  if (!open) return null;

  const button = (label: string, action: () => void) => (
    <button type="button" onClick={action}>
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

      <section className="dev-tools-grid">
        <span>Round</span><b>{store.round} / {store.roundStatus}</b>
        <span>Level</span><b>{store.level}</b>
        <span>HP</span><b>{store.health}/{store.maxHealth}</b>
        <span>Shield</span><b>{store.shield}/{store.maxShield}</b>
        <span>Kills</span><b>{store.kills}</b>
        <span>Enemies</span><b>{stats.enemies}</b>
        <span>Boss</span><b>{stats.bossType} {store.bossHealth}/{store.bossMaxHealth}</b>
        <span>Pickups</span><b>{stats.pickups}</b>
        <span>Chests</span><b>{stats.chests}</b>
        <span>Projectiles</span><b>{stats.projectiles}</b>
        <span>Particles</span><b>{stats.particles}</b>
        <span>Frenzy</span><b>{store.frenzyActive ? `ON ${Math.ceil(store.frenzyTimer)}s` : "off"}</b>
        <span>Pending Lvl</span><b>{store.pendingLevelUps}</b>
        <span>Passives</span>
        <b>O{stats.passives.overclock_core} T{stats.passives.tesla_cell} X{stats.passives.toxic_relic} P{stats.passives.phoenix_fragment}</b>
      </section>

      <section>
        <h3>Boss Rounds</h3>
        <div className="dev-tools-buttons">
          {bossButtons.map(([label, round]) => button(label, () => prepareBossRound(runtime, round)))}
          {button("Clear Enemies", () => clearEnemies(runtime))}
        </div>
      </section>

      <section>
        <h3>Frenzy</h3>
        <div className="dev-tools-buttons">
          {button("Set 74 Frenzy Kills", () => setFrenzyKills(runtime, 74))}
          {button("Start Frenzy", () => startFrenzy(runtime))}
          {button("End Frenzy", () => endFrenzy(runtime))}
        </div>
      </section>

      <section>
        <h3>Chests</h3>
        <div className="dev-tools-buttons">
          {button("Common Chest", () => spawnChest(runtime, "common"))}
          {button("Rare Chest", () => spawnChest(runtime, "rare"))}
          {button("Legendary Chest", () => spawnChest(runtime, "legendary"))}
        </div>
      </section>

      <section>
        <h3>Pickups</h3>
        <div className="dev-tools-buttons">
          {recoveryPickups.map(([label, type]) => button(label, () => spawnPickup(runtime, type)))}
          {specialPickups.map(([label, type]) => button(label, () => spawnPickup(runtime, type)))}
          {button("Spawn Expiring Recovery", () => spawnPickup(runtime, "medkit_emergency", true))}
        </div>
      </section>

      <section>
        <h3>Damage / Passives / Stress</h3>
        <div className="dev-tools-buttons">
          {button("Set HP 10", () => setHp(10))}
          {button("Damage 25", () => applyDamage(runtime, 25))}
          {button("Damage Lethal", () => applyDamage(runtime, 9999))}
          {specialPickups.map(([label, type]) => button(`+1 ${label.split(" ")[0]}`, () => addPassive(type)))}
          {button("Reset Passives", resetPassives)}
          {button("Spawn 10 Normal Enemies", () => spawnNormalEnemies(runtime, 10))}
          {button("Spawn 25 Normal Enemies", () => spawnNormalEnemies(runtime, 25))}
          {button("Reset QA Run", () => resetQaRun(runtime))}
        </div>
      </section>
    </aside>
  );
};
