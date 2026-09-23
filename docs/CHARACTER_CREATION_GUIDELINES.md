# BONKAGEDDON — Playable Character Creation Guidelines

## Document Purpose & Authority
This document is the permanent, authoritative standard for modeling, rigging, animating, optimizing, and integrating 3D GLB playable survivors in **BONKAGEDDON**.

Every future playable character MUST adhere strictly to these rules. The objective is to eliminate:
- Floating feet and ungrounded characters (`feetMinY ≠ 0`).
- Obvious primitive geometric placeholders (spheres, capsules, cylinders) in final production art.
- Disconnected or unarticulated anatomy.
- Over-scaled, bloated, or unoptimized GLB assets.
- Inconsistent character scale and broken silhouette readability from the gameplay camera.
- Accidental gameplay mutations during visual tasks.
- Unnecessary teardowns and rebuilds of functioning systems.

---

## 1. Design Philosophy

All BONKAGEDDON survivors inhabit a high-intensity, stylized cyberpunk / sci-fi survival arena.

### Core Visual Tenets
- **Stylized Hard-Surface Aesthetic**: Characters must display defined armor plates, mechanical joints, and angular silhouettes rather than hyper-realistic organic forms or generic smooth meshes.
- **Top-Down / Isometric Readability**: Characters are viewed from a 45° elevated camera at a distance of ~25 units. Visual weight and signature accents must concentrate on surfaces visible from above.
- **Silhouette Primacy**: Every survivor MUST be instantly recognizable in pure unlit black silhouette before applying any color or emissive maps.
- **Intentional Anatomy**: Characters must have fully authored humanoid or mechanical structure (head/helmet, torso/chestplate, waist/belt, upper arms, forearms/gauntlets, hips, thighs, armored knees, shins, and planted boots).
- **Web-Optimized Craft**: Assets must remain ultra-lightweight for fast browser loading and 60 FPS rendering under 48-enemy horde conditions.

### Prohibited Final Aesthetics
Final production assets MUST NOT resemble:
- Plain geometric primitives (smooth spheres, raw capsules, cylinders, blocks).
- Floating torsos with missing hips or floating limbs.
- Stick-figure or low-effort mannequin blockouts.
- Visuals that only look good in close-up turntable inspection but degrade into an unreadable smudge at gameplay zoom.

> Primitive shapes may be used during phase 1 blockouts, but MUST be sculpted/modeled into faceted, beveled, stylized hard-surface armor for production.

---

## 2. Silhouette Rules & Visual Hierarchy

At gameplay camera elevation, human eye resolution prioritizes features in this exact descending order:

```
1. Overall Silhouette Boundary (Mass, stance, width-to-height ratio)
2. Head / Helmet / Visor Shape
3. Shoulders / Pauldrons
4. Weapon Silhouette (Readily readable silhouette profile)
5. Upper Torso & Core Reactor
6. Emissive Accents & Signature Glows
7. Lower Legs & Foot Contact
8. (Secondary) Fine surface engravings, fasteners, or micro-panel lines
```

### Proportional Guidelines
- **Head / Helmet**: 1/6th to 1/7th of total character height. Avoid oversized "chibi" heads unless a character explicitly demands it.
- **Shoulders**: Broad, defined pauldrons or mechanical mounts extending beyond the torso outline to create clear upper-body directionality.
- **Waist / Pelvis**: Tapered or defined mechanical waist that visually separates the chest rig from the lower hips, providing articulation clearance for stride cycles.
- **Arms & Gauntlets**: Distinct upper arm segment and beefier forearm/gauntlet segment to clearly communicate weapon bracing.
- **Legs & Knees**: Thigh armor plate, articulated knee cop/guard, and prominent shins that bend cleanly during run cycles without collapsing vertex volumes.
- **Boots & Soles**: Wide, grounded armored soles. Thin ankles with tiny peg feet are forbidden; boots must look physically capable of stomping alien hordes.
- **Weapon Silhouette**: The signature weapon MUST project outward from the body silhouette during idle and movement so players always know which weapon is equipped.

---

## 3. Grounding Rules (Critical Requirement)

Grounding is the single most critical quality bar in BONKAGEDDON character production.

### The Grounding Invariant
```
feetMinY ≈ 0.000 (Tolerance: ±0.010m in model root space)
```

1. **Soles on Y = 0**: The bottom-most vertices of both boots in the resting binding pose (and in the Idle animation contact phase) MUST touch the horizontal plane `Y = 0.000`.
2. **Centered Root Pivot**: The origin `[0, 0, 0]` of the GLB MUST be located at ground level, precisely centered between the left and right foot contact patches.
3. **No Visual Offset Hacks in Asset Authoring**: A GLB asset whose mesh floats at `Y = +0.5m` or sinks at `Y = -0.3m` inside the file is DEFECTIVE. Fix the origin in Blender / Maya / glTF pipeline before exporting. Do not rely on ad-hoc runtime code offsets to fix bad asset pivots.
4. **Physics vs. Visual Separation**:
   In BONKAGEDDON, the player entity is driven by a Rapier physics body:
   - `CapsuleCollider args={[0.5, 0.38]}`: Total height is `2 × 0.5 + 2 × 0.38 = 1.76m`.
   - The capsule center at rest sits at `Y = +0.88m` above the arena floor.
   - Therefore, the visual model component is nested inside a container at:
     ```tsx
     <group position={[0, -0.88, 0]}>
       <primitive object={model} />
     </group>
     ```
   - This `-0.88m` offset brings the visual model's `Y = 0` root exactly flush with the arena floor!
5. **No Visual Gap**: When viewing the character from the front or lateral camera at `Y = 0`, there must be zero visible daylight between the boot soles and the floor grid.
6. **Shadow Contact**: Grounding must be visually reinforced by real-time shadows:
   - `castShadow = true` on all opaque character meshes.
   - Soft contact shadow plane placed at `Y = 0.028` relative to the visual container (as verified in `TankModel.tsx`).

---

## 4. Character Scale & Archetype Mass

All characters share the same world coordinate system (`1 unit = 1 meter`). While physics colliders remain standardized, visual silhouettes should convey character archetype weight:

| Archetype | Reference Survivor | Target Height (Y) | Target Width (X) | Target Depth (Z) | Visual Scale in React |
|---|---|---|---|---|---|
| **Heavy** | **TANK** (Reference) | 2.10m – 2.25m | 1.80m – 2.10m | 0.75m – 1.05m | `0.75` (from 2.85m raw) |
| **Standard** | **BONK**, **FUSE** | 1.80m – 1.95m | 1.10m – 1.40m | 0.60m – 0.80m | `0.85` – `1.00` |
| **Agile / Skirmisher** | **NOVA**, **LUX** | 1.75m – 1.88m | 0.90m – 1.20m | 0.50m – 0.70m | `0.85` – `0.95` |
| **Hover / Caster** | **BYTE**, **RIFT** | 1.65m – 1.80m (mesh) | 0.95m – 1.30m | 0.60m – 0.85m | Elevates ~0.25m above floor |

> **Rule**: Never resize the gameplay `CapsuleCollider` or modify physics constants simply to fit a larger visual mesh. Visual scale is purely visual.

---

## 5. Modeling Rules

- **Polycount Target**:
  - **Preferred**: 8,000 – 15,000 triangles.
  - **Maximum Acceptable**: 20,000 triangles for complex hero survivors with elaborate weapons.
  - *Reference Validation*: `tank-v2.glb` achieves an exceptional stylized look with only **3,248 triangles** and **98 meshes**, demonstrating that clean low-poly faceted hard-surface modeling is superior to dense unoptimized meshes.
- **Topology Guidelines**:
  - Clean edge loops around all bending joints (knees, hips, elbows, shoulders).
  - Major hard-surface armor plates should use beveled edges (1-segment chamfer) baked or modeled to catch specular lighting highlights.
  - Delete completely occluded interior geometry (e.g., full body geometry hidden underneath thick breastplates).
  - Avoid microscopic nuts, bolts, or 100-poly screws that cannot be resolved beyond 2 pixels from the gameplay camera.
- **Weapon Integration**:
  - Model the weapon as part of the GLB hierarchy (or as a firmly attached child node to the weapon hand bone).
  - Ensure weapon pivot and grip align perfectly with the hand without mesh interpenetration.

---

## 6. Materials, Shaders & Performance

To preserve high framerates with 48 active horde enemies:

- **Material Count Limit**: 1 to 3 materials per character (maximum 5 for hero characters with dedicated emissive glass).
  - `tank-v2.glb` uses 7 PBR standard materials without any external texture maps, keeping draw calls low and GPU state transitions minimal.
- **Material Properties (Three.js `MeshStandardMaterial`)**:
  - `color`: High-contrast base albedo.
  - `metalness`: `0.6` – `0.9` for metallic armor and weapon blades; `0.1` – `0.3` for under-suit composites.
  - `roughness`: `0.25` – `0.45` to generate crisp specular highlights under arena directional lights.
  - `emissive`: Dedicated emissive color for visors, reactor cores, and blade edges.
- **Hit Flash & Status Tint Preservation**:
  In `TankModel.tsx`, materials are cloned at mount time with original emissive states cached:
  ```ts
  copy.userData.baseEmissive = copy.emissive.clone();
  copy.userData.baseIntensity = copy.emissiveIntensity;
  ```
  This allows runtime hit flashes (white emissive) and frost slows (cyan emissive) to modulate smoothly without mutating shared assets.
- **Prohibited Material Patterns**:
  - Heavy multi-pass custom shaders.
  - Unnecessary alpha blending / transparency on large meshes (causes depth sorting artifacts and GPU fillrate bottlenecks).

---

## 7. Texture & Asset Size Rules

- **Repository Asset Budget**:
  - Permanent project custom asset budget: **5 MB** (`AGENTS.md` §8).
  - Temporary visual-overhaul ceiling: **15 MB** (`docs/ASSET_INTEGRATION.md`).
  - Current repository asset footprint: **~3.7 MB** (Comfortably under both limits).
- **Target File Size per Survivor GLB**:
  - **Target**: `< 200 KB` per character GLB (without embedded raster textures).
  - **Maximum**: `< 1.2 MB` if using optimized 1024×1024 baked atlas maps.
  - *Reference*: `tank-v2.glb` is only **87 KB**.
- **Texture Resolutions**:
  - If raster textures are used: **512×512** or **1024×1024** maximum. 2K and 4K textures are strictly prohibited for survivor models.
  - Textures must be compressed WebP or PNG format.
  - Pack PBR channels into combined ORM maps (Occlusion, Roughness, Metalness) where applicable.

---

## 8. Rigging & Skeleton Hierarchy

All humanoid survivors should follow a standardized bone hierarchy to guarantee predictable animation and attachment points:

```
Root (at [0, 0, 0] floor level)
└── Hips (Pelvis center)
    ├── Spine
    │   └── Chest
    │       ├── Neck
    │       │   └── Head (Visor / Helmet)
    │       ├── Shoulder.L
    │       │   └── UpperArm.L
    │       │       └── Forearm.L
    │       │           └── Hand.L
    │       │               └── WeaponSocket.L (Optional)
    │       └── Shoulder.R
    │           └── UpperArm.R
    │               └── Forearm.R
    │                   └── Hand.R
    │                       └── WeaponSocket.R (Main weapon grip)
    ├── Thigh.L
    │   └── Shin.L
    │       └── Foot.L
    │           └── Toe.L (Sole contact at Y=0)
    └── Thigh.R
        └── Shin.R
            └── Foot.R
                └── Toe.R (Sole contact at Y=0)
```

### Rigging Rules
- **Stable Transforms**: Bone scale must remain `[1, 1, 1]` at bind pose. Do not export non-uniform bone scales.
- **Skinning Quality**: Maximum 4 bone influences per vertex (standard GPU limit). Ensure smooth deforms around hips and knees with zero vertices exploding to infinity.

---

## 9. Required Animation Clips

Every production survivor GLB MUST contain at minimum the following 5 canonical clips with exact case-sensitive names:

| Clip Name | Target Duration | Loop Mode | Key Requirements |
|---|---|---|---|
| `Idle` | 1.8s – 2.5s | Loop (`LoopRepeat`) | Subtle breathing, weight shift, weapon sway. **Feet soles MUST remain planted at Y=0 without lifting or sliding**. |
| `Run` | 0.7s – 0.9s | Loop (`LoopRepeat`) | Dynamic forward stride, opposite arm/leg swing, forward torso lean (10°–15°). Feet must plant firmly during contact. |
| `Attack` | 0.5s – 0.7s | Once (`LoopOnce`) | Distinct 3-phase cycle: Anticipation (windup) → Release (snappy impact/cleave) → Recovery (return to stance). |
| `Hit` | 0.25s – 0.4s | Once (`LoopOnce`) | Rapid flinch, backward torso kick, head shudder. Must not break player movement continuity. |
| `Death` | 1.0s – 1.6s | Once (`LoopOnce`, clamp) | Impactful collapse to the floor, settling into a permanent static defeated pose at ground level. |

> Canonical names: `Idle`, `Run`, `Attack`, `Hit`, `Death`. Do not name them `idle_01`, `RUN`, `Walk`, or `take_001`.

---

## 10. Eliminating Foot Sliding (Dynamic Time-Scale)

Foot sliding occurs when world movement speed does not match animation stride cadence.

### Prevention Architecture
1. **In-Place Animations**: All Run animations MUST be authored **in-place** (zero root-motion displacement in X/Z). The character stays at the local origin while running.
2. **Dynamic Time-Scale Formula**:
   As implemented in `TankModel.tsx`, the playback speed of the `Run` clip MUST dynamically scale with the player's true runtime movement speed:
   ```ts
   // motion.speed is the actual Rapier velocity magnitude
   const baseRunVelocity = 2.4; // Tuned to the authored stride length
   actions.Run?.setEffectiveTimeScale(Math.max(0.7, motion.speed / baseRunVelocity));
   ```
   - When the player is slowed by frost or carrying debuffs, the run animation slows down proportionally.
   - When the player gains Haste or Speed upgrades, the run animation speeds up proportionally, keeping foot contact locked to the ground.

---

## 11. Color Language & Readability

Each survivor must display a disciplined, high-contrast 4-tier palette:

1. **Primary Armor Color (50–60%)**: Character identity hue (e.g. Tank: Crimson Red, Bonk: Hazard Orange, Nova: Astral Pink, Byte: Neon Cyan).
2. **Secondary Armor Color (20–30%)**: High-contrast companion tone (Dark Slate, Carbon Fiber, Gold, White).
3. **Mechanical / Under-suit (15–20%)**: Gunmetal, graphite, dark titanium for joints and recessed hydraulics.
4. **Emissive Accent (5–10%)**: Visor slit, reactor core, weapon power cell. Must not exceed 10% of total surface area to avoid visual noise.

---

## 12. Character-Specific Exceptions

Not all survivors are grounded heavy mechs. Exceptions must be explicitly designed and documented:

### Hover & Levitation Exceptions (e.g., BYTE, RIFT)
- **Intentional Hover**: Characters like Byte (drone swarm tactician) or Rift (void skirmisher) intentionally float above the arena deck.
- **Rules for Hovering Survivors**:
  - The elevation MUST be authored at a deliberate height: **`0.25m` to `0.40m` above ground**.
  - Must display an active hovering animation (smooth vertical oscillation, thruster gimbaling, or energy rings).
  - The contact shadow must remain visible directly underneath on the floor to maintain spatial location.
  - Hovering MUST NOT be an accident of improper pivot authoring; `feetMinY` will measure `+0.25m` to `+0.40m` with clear intent.

---

## 13. TANK Production Reference Implementation

`TANK V3` is the active production survivor in the codebase, with `TANK V2` retained as the technical baseline. When building any new survivor, compare against the verified properties of TANK V3:

```
Asset Path:             public/assets/characters/tank-v3.glb (Active) / tank-v2.glb (Baseline)
File Size:              127 KB (130,492 bytes)
Triangle Count:         5,596
Vertex Count:           14,863
Mesh Count:             160
Material Count:         7 PBR Materials (Zero external texture dependencies)
Animation Clips:        Idle (2.0s), Run (0.8s), Attack (0.62s), Hit (0.38s), Death (1.35s)
Authored Grounding:     Raw Box3 min.y = 0.000m (Soles perfectly on ground)
Visual Scale:           0.75 (Scaled height: 2.14m, width: 2.15m)
React Component:        src/scene/TankModel.tsx
Integration Host:       src/scene/PlayerPlaceholder.tsx (<TankModel motionRef={tankMotionRef} />)
Ground Offset:          TANK_GROUND_OFFSET = -0.88m (Compensates Rapier capsule halfHeight 0.5 + radius 0.38)
```

---

## 14. Character Production Pipeline & Quality Gates

Every character must progress through this sequential verification pipeline:

```
1. Concept & Silhouette Review (Top-down view validation)
   ↓
2. Stylized 3D Model (Hard-surface topology, 8k–15k tris)
   ↓
3. Pivot & Grounding Check (Soles at Y=0, Origin centered)
   ↓
4. Rigging & Standard Bone Hierarchy
   ↓
5. 5 Canonical Animation Clips (Idle, Run, Attack, Hit, Death)
   ↓
6. GLB Export (< 200 KB target, clean Three.js parse)
   ↓
7. Character Lab QA (/dev/character-lab)
   ├── Check Isometric, Front, Side, and Back cameras
   ├── Verify feetMinY ≈ 0.000m (GREEN status)
   ├── Verify contact shadow connection
   └── Scrub animation frames for foot sliding
   ↓
8. Real Gameplay Integration (src/scene/PlayerPlaceholder.tsx)
   ├── Verify weapon timing matches combat cooldown
   ├── Verify hit flash & frost tinting
   └── Verify 60 FPS under horde conditions
   ↓
9. Full Test Suite Validation
   ├── npm run test
   ├── npm run lint
   ├── npm run build
   └── git diff --check
   ↓
10. Final Commit & Merge
```

### Mandatory Quality Gate Checklist
Before declaring any 3D survivor production-ready:
- [ ] GLB file size is under 1.2 MB (ideally < 200 KB).
- [ ] Polycount is between 8k and 15k triangles (or proven lightweight like Tank at 3.2k).
- [ ] Mesh soles rest at `Y = 0.000` (`feetMinY ≈ 0`).
- [ ] Root origin is centered between feet at floor level.
- [ ] Exactly contains `Idle`, `Run`, `Attack`, `Hit`, and `Death` animations.
- [ ] In-place run cycle with dynamic velocity time-scale to eliminate foot sliding.
- [ ] Cloned materials with cached base emissive for damage flashes.
- [ ] Passes visual QA in `/dev/character-lab` across all 4 camera presets.
- [ ] Gameplay stats, weapons, colliders, and combat formulas remain 100% UNTOUCHED.
- [ ] Production build (`npm run build`) and linter (`npm run lint`) pass with zero errors.
