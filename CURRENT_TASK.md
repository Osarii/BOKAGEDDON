# Current Task

## Objective
Combat variety, pause menu, and faster progression.

## Status
Completed & Verified.

## Scope Completed
1. **Enemy Projectile Readability (`src/scene/CombatManager.tsx`, `src/scene/EnemyManager.tsx`)**:
   - Hostile shooter projectiles are explicitly rendered in glowing red (`#ef4444`) with high priority, ensuring clear readability against player abilities.
   - Boss shockwaves remain intact with original identity.

2. **Pause Menu & Physics Freeze (`src/components/game/PauseOverlay.tsx`, `src/scene/GameScene.tsx`, `src/pages/Game.tsx`)**:
   - Added `"paused"` state to `GameStatus` in `src/types/game.ts`.
   - `Escape` key toggles pausing/resuming during active gameplay (`playing` <-> `paused`), without interfering with `levelup`, `gameover`, or `victory`.
   - Rapier physics simulation is explicitly halted when gameplay is paused (`paused={gameStatus !== "playing"}`).
   - `PauseOverlay` provides:
     - **Continuar**: Resumes gameplay.
     - **Reiniciar partida**: Full clean restart of simulation, score guards, and character state.
     - **Salir a selección de personaje**: Resumes store state and navigates back to `/characters`.
     - Live run stats overview (Ronda, Nivel, Bajas, Puntuación).

3. **Faster XP Progression (`src/game/progression.ts`, `src/store/gameStore.ts`)**:
   - Updated curve to `Math.round(75 * Math.pow(1.18, safeLevel - 1))`, starting at 75 XP for level 1.
   - Exact XP overflow preservation maintained.

4. **Elemental Weapon Upgrades (`src/types/game.ts`, `src/game/config.ts`, `src/scene/CombatManager.tsx`, `src/scene/EnemyManager.tsx`)**:
   - Added `fire`, `poison`, `shock`, and `frost` to `UpgradeId` and `UPGRADE_DETAILS`.
   - Burn DoT (ignites foes for burn dmg/s), Poison DoT (stackable venom), Shock (chance to arc electric damage), Frost (chills and slows movement).
   - Enemy mesh instance tinting (orange for burn, green for poison, cyan for frost).
   - Dynamic projectile coloring reflecting active elemental builds across all 5 weapons.
   - Safe Lucide UI icon resolver (`Flame`, `Skull`, `Zap`, `Snowflake`) preventing runtime breakage in `ASSETS.upgrades[id]`.

5. **Separated Pickup Unions & Procedural Special Items (`src/types/game.ts`, `src/scene/PickupManager.tsx`, `src/components/game/HUDShell.tsx`)**:
   - Separated types into `RecoveryPickupType`, `SpecialPickupType`, and composite `PickupType`.
   - Recovery texture maps and instance maps strictly use `RecoveryPickupType`.
   - Special pickups are 100% procedural 3D items (`overclock_core`, `tesla_cell`, `toxic_relic`, `phoenix_fragment`) without image files or `ASSETS.items` entries.
   - Auto-clearing HUD notification toasts (2.8s auto-dismiss).
   - Buff timers decrement only during active gameplay (`gameStatus === "playing"`) and freeze while paused.

## Validation
- `npm run lint` -> 0 errors, 0 warnings.
- `npm run build` -> production build exit 0.
