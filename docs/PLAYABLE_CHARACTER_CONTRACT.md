# Playable Character Contract

## 1. Scope & Purpose

This document defines the permanent architectural, balancing, and implementation contract for all playable survivors in **BONKAGEDDON**. Every character introduced or modified must strictly conform to these rules to maintain gameplay identity, codebase uniformity, and balance integrity.

---

## 2. Canonical Character Schema

Each survivor definition in `src/game/config.ts` (and synchronized in `db.json`) must satisfy the canonical `Character` interface:

```typescript
export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  description: string;
  health: number;          // Base max HP (e.g. 75 - 160)
  speed: number;           // Base movement speed in units/sec (e.g. 4.8 - 6.7)
  damage: number;          // Base weapon damage per primary hit
  attackCooldown: number;  // Base attack interval in seconds (e.g. 0.50 - 1.20)
  weapon: WeaponType;      // Signature weapon ID
  color: string;           // Hex visual theme color for UI, particles, and glows
}
```

### Approved Roster & CharacterId Integration
- **Baseline Roster (5)**:
  - `bonk` (Bonk — Melee Brawler, Hammer)
  - `byte` (Byte — Drone Swarm Tactician, Energy Orb)
  - `tank` (Tank — Armored Frontliner, Axe)
  - `nova` (Nova — Radial Blast Specialist, Nova Burst)
  - `hex` (Hex — Dark Curse Caster, Hex Chain)
- **Approved Expansion Roster (3)**:
  - `rift` (Rift — Phase Disc Skirmisher, Rift Disc)
  - `fuse` (Fuse — Demolition Zone Controller, Pulse Mine)
  - `lux` (Lux — Precision Light Striker, Light Lance)
- **Total Approved Survivors**: **8**.

Every exhaustive union or record over `CharacterId` in `src/types/game.ts`, `src/game/config.ts`, `src/components/`, `src/pages/`, and `db.json` must account for all 8 characters.

---

## 3. WeaponType Integration & Signature Weapons

Every character must have a unique signature weapon assigned via `WeaponType`:
- `hammer`: Arcing melee impact with forward cleave.
- `energy-orb`: Orbiting projectile cutting through enemies.
- `axe`: Wide sweeping 360-degree cleave.
- `nova-burst`: Player-centered radial blast wave.
- `hex-chain`: Multi-target chain lightning curse.
- `rift-disc`: Dual-phase piercing disc returning to player.
- `pulse-mine`: Positional delayed explosive charge.
- `light-lance`: Instant hitscan light beam cutting priority targets.

Weapon parameters must be configured in `WEAPON_CONFIGS` under `src/game/config.ts` with:
- `name`: Human-readable weapon name.
- `baseDamage`: Base damage matching character signature.
- `baseCooldown`: Base attack interval in seconds.
- `range`: Effective targeting and trigger distance.
- `areaRadius`: Hitbox radius, impact radius, or beam width.
- `color`: Signature visual beam/projectile/particle hex color.

---

## 4. Signature Weapon Synergy Contract

Each survivor possesses exactly one unique signature weapon synergy defined in `WEAPON_SYNERGIES`:
1. `bonk` -> `meteor-slam` (Fire >= 2, Damage >= 2): Heavy fiery ground impact creating persistent burning shockwave.
2. `byte` -> `prism-barrage` (Multishot >= 2, Speed >= 2): Twin orbiting energy orbs with doubled rotation speed.
3. `tank` -> `cyclone-edge` (Haste >= 2, Armor >= 2): Continuous vortex cleave pulling and shredding enemies.
4. `nova` -> `supernova` (Poison >= 2, Critical >= 2): Colossal expanding astral explosion leaving toxic residue.
5. `hex` -> `hexstorm` (Shock >= 2, Magnet >= 2): High-frequency electric chain bouncing across extended distance.
6. `rift` -> `event-horizon` (Area >= 2, Critical >= 2): Disc effective size +25%, +1 outbound pierce, return hit damage +25%, violet return trail.
7. `fuse` -> `chain-reaction` (Damage >= 2, Area >= 2): Main explosion creates exactly one secondary explosion after ~0.28s (45% dmg, 70% radius, non-recursive).
8. `lux` -> `solar-refraction` (Critical >= 2, Precision >= 2): On critical hit, refracts instant secondary beam to nearest enemy within 5.5 units for 60% damage.

Requirements:
- Synergies require specific normal upgrades at or above Tier 2.
- Character selection cards and in-game HUD must clearly display synergy requirements and active state.

---

## 5. Procedural Presentation & Animation Language

Before final 2D/3D assets are produced, all characters must possess a complete, distinct procedural 3D model in `src/scene/PlayerPlaceholder.tsx`:

For production 3D GLB character modeling, rigging, canonical animation clips, grounding standards (`feetMinY ≈ 0`), and QA pipelines, follow `docs/CHARACTER_CREATION_GUIDELINES.md`.

### Distinct Procedural Silhouettes
- Geometric composition (torso, head/core, appendages, floating emitters, weapon geometry).
- Signature materials, colors, and emissive highlights matching `character.color`.

### Animation State Machine (Frame Simulation in `useFrame`)
1. **Idle**: Distinct breathing cadence, core pulse, hovering oscillation, weapon sway.
2. **Movement**: Grounded stride vs. levitation, directional lean, acceleration inertia, trailing components.
3. **Attack Anticipation & Release**:
   - Wind-up telegraph, torso/arm twist, weapon charge.
   - Snappy release motion, projectile launch, cleave sweep, or beam emit.
   - Recoil, follow-through, and recovery.
4. **Real Combat Cooldown Synchronization**:
   - Visual animation anticipation and attack timing MUST derive from the true combat cooldown:
     `effectiveCooldown = baseCooldown / (attackSpeedMultiplier)`
   - Never hardcode duplicate cooldown constants in visual components.
5. **Damage Reaction**:
   - Rapid squash/stretch impulse, brief emissive white flash, short positional kick, smooth exponential recovery.
6. **Frost / Slow State**:
   - Visible cyan tinting and reduced procedural animation playback cadence while strictly preserving underlying gameplay speed values.

---

## 6. Global Systems Compatibility

Every survivor must achieve 100% compatibility with:
- **All 20 Normal Upgrades**: Damage, Haste, Speed, Vitality, Armor, Magnet, Critical, Multishot, Fire, Poison, Shock, Frost, Regeneration, Barrier Matrix, Area Amplifier, Field Medic, Boss Hunter, Execution Protocol, Critical Power, Fortune.
- **Coherent Stat Mapping**: If a weapon cannot shoot extra discrete projectiles (e.g. instant beam or pulse mine), implement the nearest coherent equivalent (e.g. refraction beam or multi-cluster) rather than silently discarding the upgrade.
- **All 8 Special Relics**: Overclock Core, Tesla Cell, Toxic Relic, Phoenix Fragment, Aegis Capacitor, Apex Lens, Echo Prism, Gravity Seed.
- **All 4 Secret Passives**: Storm Engine, Venom Singularity, Radiant Bastion, Apex Echo.
- **Status & Pickup Systems**: Shield absorption, Health recovery, XP attraction, Frenzy mode, Boss encounters, Pause/Resume, Run reset.

---

## 7. Character Selection & Asset Staging

1. **Asset Staging Principle**:
   - Gameplay mechanics and procedural models first; 2D/3D external production assets deferred.
2. **Selection Card Fallbacks**:
   - If official portraits or weapon SVGs are not yet in `src/config/assets.ts`, use polished Lucide React icon fallbacks and CSS styling in `CharacterCard.tsx`.
   - Never fabricate fake asset paths in `src/config/assets.ts`.
3. **Database Synchronization**:
   - `db.json` must be updated with the exact stats and descriptions for all 8 characters.

---

## 8. Runtime Acceptance Checklist

Before declaring a character complete:
- [ ] Character selectable in `Characters.tsx` and loads properly in `Game.tsx`.
- [ ] Procedural model renders with unique geometry, colors, and attachments.
- [ ] Idle, movement, attack, damage, and frost animations visually execute smoothly.
- [ ] Attack anticipation aligns with effective combat cooldown.
- [ ] Primary weapon correctly targets, damages, and applies elemental procs.
- [ ] Signature synergy activates upon meeting upgrade requirements.
- [ ] All 20 upgrades and 8 relics apply their full mathematical bonuses.
- [ ] Character stats and inspector verified in F8 Dev QA.
- [ ] Production build and linter pass with zero errors.
