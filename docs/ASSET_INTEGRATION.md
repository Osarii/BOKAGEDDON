# Asset Integration Status

Temporary visual-overhaul budget: 15 MB total custom assets. Current checked public assets remain below that budget.

All registered paths below are centralized in `src/config/assets.ts`. Gameplay simulation, collision, balance, and procedural 3D rendering remain code-driven.

## Medical, Special Pickup, and Boss Assets

Source pack: `BONKAGEDDON_assets_medical_special_bosses` (12 WebP assets with transparency).

## Recovery and Shield Items

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.items.medkitEmergency` | `/assets/v2/items/medkit-emergency.webp` | Integrated into 3D billboards & HUD (+35 HP) |
| `ASSETS.items.medkitCase` | `/assets/v2/items/medkit-case.webp` | Integrated into 3D billboards & HUD (+70 HP) |
| `ASSETS.items.shieldPotion` | `/assets/v2/items/shield-potion.webp` | Integrated into 3D billboards & HUD (+25 Shield) |
| `ASSETS.items.shieldBattery` | `/assets/v2/items/shield-battery.webp` | Integrated into 3D billboards & HUD (+50 Shield) |

## Special Pickups (Permanent Boss Passives)

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.items.overclockCore` | `/assets/v2/items/overclock-core.webp` | Integrated into 3D billboards & HUD passive inventory (+15% attack speed/stack) |
| `ASSETS.items.teslaCell` | `/assets/v2/items/tesla-cell.webp` | Integrated into 3D billboards & HUD passive inventory (chain lightning chance) |
| `ASSETS.items.toxicRelic` | `/assets/v2/items/toxic-relic.webp` | Integrated into 3D billboards & HUD passive inventory (+25% poison DoT/stack) |
| `ASSETS.items.phoenixFragment` | `/assets/v2/items/phoenix-fragment.webp` | Integrated into 3D billboards & HUD passive inventory (stackable cheat death revive) |

The WebP assets are fully integrated into runtime 3D item billboards and HUD passive inventory displays.

## Boss Identities

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.enemies.bonklord` | `/assets/enemies/bonklord.svg` | Integrated: Round 10 Boss |
| `ASSETS.enemies.cindermaw` | `/assets/enemies/cindermaw.webp` | Integrated: Round 20 Boss (Fire) |
| `ASSETS.enemies.stormcoil` | `/assets/enemies/stormcoil.webp` | Integrated: Round 30 Boss (Shock) |
| `ASSETS.enemies.venomatrix` | `/assets/enemies/venomatrix.webp` | Integrated: Round 40 Boss (Poison) |
| `ASSETS.enemies.cryovex` | `/assets/enemies/cryovex.webp` | Integrated: Round 50 Boss (Frost) |

The full 5-boss visual asset roster is integrated into the rotating boss encounter system. Current in-world boss identity is primarily procedural 3D in `src/scene/BossRenderer.tsx`, with the flat assets retained as secondary decals/emblems.

## V3 Expansion Visual Assets

Source pack: `BONKAGEDDON_ASSET_PACK_V2_INTEGRATION_READY` (23 SVG assets).

### Playable Survivors

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.characters.rift` / `portraits.rift` | `/assets/v3/characters/rift.svg` | Integrated: Character selection portrait & HUD run icon |
| `ASSETS.characters.fuse` / `portraits.fuse` | `/assets/v3/characters/fuse.svg` | Integrated: Character selection portrait & HUD run icon |
| `ASSETS.characters.lux` / `portraits.lux` | `/assets/v3/characters/lux.svg` | Integrated: Character selection portrait & HUD run icon |

### Weapons

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.weapons.riftDisc` | `/assets/v3/weapons/rift-disc.svg` | Integrated: Character card |
| `ASSETS.weapons.pulseMine` | `/assets/v3/weapons/pulse-mine.svg` | Integrated: Character card |
| `ASSETS.weapons.lightLance` | `/assets/v3/weapons/light-lance.svg` | Integrated: Character card |

### Expanded Normal Upgrades

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.upgrades.regeneration` | `/assets/v3/upgrades/regeneration.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.barrier` | `/assets/v3/upgrades/barrier-matrix.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.area` | `/assets/v3/upgrades/area-amplifier.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.recovery` | `/assets/v3/upgrades/field-medic.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.boss_hunter` | `/assets/v3/upgrades/boss-hunter.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.executioner` | `/assets/v3/upgrades/execution-protocol.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.precision` | `/assets/v3/upgrades/critical-power.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |
| `ASSETS.upgrades.fortune` | `/assets/v3/upgrades/fortune.svg` | Integrated: Level-up, Chest reward, and HUD upgrade stack list |

### Special Relics

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.items.aegisCapacitor` | `/assets/v3/relics/aegis-capacitor.svg` | Integrated: 3D world billboard pickup, Chest reward selection, and HUD passive inventory |
| `ASSETS.items.apexLens` | `/assets/v3/relics/apex-lens.svg` | Integrated: 3D world billboard pickup, Chest reward selection, and HUD passive inventory |
| `ASSETS.items.echoPrism` | `/assets/v3/relics/echo-prism.svg` | Integrated: 3D world billboard pickup, Chest reward selection, and HUD passive inventory |
| `ASSETS.items.gravitySeed` | `/assets/v3/relics/gravity-seed.svg` | Integrated: 3D world billboard pickup, Chest reward selection, and HUD passive inventory |

### Secret Passives

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.secretPassives.storm_engine` | `/assets/v3/secret-passives/storm-engine.svg` | Integrated: HUD secret passive emblem (displays only upon unlock) |
| `ASSETS.secretPassives.venom_singularity` | `/assets/v3/secret-passives/venom-singularity.svg` | Integrated: HUD secret passive emblem (displays only upon unlock) |
| `ASSETS.secretPassives.radiant_bastion` | `/assets/v3/secret-passives/radiant-bastion.svg` | Integrated: HUD secret passive emblem (displays only upon unlock) |
| `ASSETS.secretPassives.apex_echo` | `/assets/v3/secret-passives/apex-echo.svg` | Integrated: HUD secret passive emblem (displays only upon unlock) |

### UI & Chest Branding

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.ui.relicVaultBanner` | `/assets/v3/ui/relic-vault-banner.svg` | Integrated: Legendary Relic Vault modal banner branding in ChestRewardOverlay |

All 23 expansion SVG assets are verified with transparent backgrounds and centralized in `src/config/assets.ts`. They support character cards, HUD identity, weapon cards, upgrades, relics, secret passive icons, and Relic Vault branding. Current in-world survivor presentation is procedural 3D in `src/scene/PlayerPlaceholder.tsx`.

## Arena V2 Environmental Assets

Source pack: `BONKAGEDDON_ARENA_V2_ASSET_PACK_READY` (Floor decals preserved; 3D obstacles superseded by procedural modular geometry).

| Key | Public path | Status |
| --- | --- | --- |
| `ASSETS.arenaV2.warningRingDecal` | `/assets/arena-v2/warning-ring-decal.webp` | Integrated: Central Command & sector perimeter warning rings |
| `ASSETS.arenaV2.laneConnectorDecal` | `/assets/arena-v2/lane-connector-decal.webp` | Integrated: Open cardinal connector lane floor markings |

The obsolete 2D vertical billboard obstacle WebPs have been superseded by lightweight procedural modular 3D Three.js geometry in `src/scene/arena/ProceduralObstacles.tsx`. The current arena is the spaceship / orbital battle-station combat deck with `ARENA_RADIUS = 44` and `ARENA_BOUNDARY_LIMIT = 42.4`. All gameplay collisions, projectile blocking, and spawn validation remain driven by `src/game/arenaLayout.ts`.

## Current Procedural Visual Overhaul

| Area | Runtime file | Status |
| --- | --- | --- |
| 6 procedural survivors | `src/scene/PlayerPlaceholder.tsx` | Integrated: Bonk, Byte, Nova, Hex, Fuse, Lux retain their in-world procedural silhouettes and weapon hardware |
| Tank animated GLB | `public/assets/characters/tank-v3.glb`, `src/scene/TankModel.tsx` | Integrated: TANK V3 production mech with Idle, Run, Attack, Hit, Death clips; baseline `tank-v2.glb` preserved |
| Rift animated GLB | `public/assets/characters/rift-v1.glb`, `src/scene/RiftModel.tsx` | Integrated: RIFT V1 floating dimensional warrior with Idle, Run (hover locomotion), Attack, Hit, Death clips |
| 4 normal enemies | `src/scene/EnemyManager.tsx` | Integrated: Slime Bot, Runner Drone, Iron Brute, Beam Sentry use instanced procedural 3D silhouettes with decals |
| 5 bosses | `src/scene/BossRenderer.tsx` | Integrated: Bonklord, Cindermaw, Stormcoil, Venomatrix, Cryovex have unique procedural 3D silhouettes with telegraphs |
| Loot chests | `src/scene/PickupManager.tsx` | Integrated: Common, Rare, and Legendary chests use shared procedural 3D instanced crate geometry with rarity-specific sci-fi palettes |

No additional external visual asset pack is currently pending in this branch.
