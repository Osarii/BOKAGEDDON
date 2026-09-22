# Current Task

## Objective
Playable Character Animation & Combat Presentation.

## Status
Implementation complete; manual runtime visual validation pending.

## Scope
1. **Playable Character Animation System (`src/scene/PlayerPlaceholder.tsx`)**:
   - Distinct procedural animation and motion language across all 5 playable survivors:
     - **BONK**: Heavy breathing, body weight shifts, hammer idle sway; movement step rhythm, shoulder sway, hammer inertia; attack wind-up, torso rotation, fast slam, follow-through, heavy recoil; procedural orange/gold release arc.
     - **BYTE**: Smooth floating hover oscillation, breathing core glow, rotating orb; directional hover lean with weapon lag; attack orb contraction, core brightening, accelerated rotation, rapid release pulse, lightweight recoil; circular cyan pulse on release.
     - **TANK**: Restrained mechanical idle, weighted axe posture; heavy stride bob and armored lateral sway; axe wind-back, torso rotation, aggressive cleave, long visual follow-through; procedural red/white metallic cleave arc.
     - **NOVA**: Continuous levitation, slow astral orbit, magenta/gold core pulse; directional floating tilt with delayed recovery; attack orbit contraction, brightening charge, rapid expansion at release, upward lift, soft recoil; expanding magenta/gold astral ring.
     - **HEX**: Asymmetric hover, rotational drift, independently orbiting rune pieces, green/violet pulse; opposing lean with delayed rune motion; attack rune acceleration, orbit contraction, body twist, violent outward release; procedural void/rune trail.
   - **Damage Reaction**:
     - Rapid squash/recoil, short visual kick, brief white/emissive flash, smooth recovery.
   - **Frost Presentation**:
     - Visible blue/cyan tinting and reduced animation cadence during active frost slow while strictly preserving underlying gameplay slow values.

2. **Camera Combat Feedback (`src/scene/CameraController.tsx`)**:
   - Event-driven, restrained camera impulses:
     - Heavier attack impulse for BONK and TANK.
     - Lighter response for BYTE, NOVA, and HEX.
     - Stronger, short recoil on player damage.
   - Rapid exponential decay preventing camera disequilibrium.

3. **Character Selection Presentation (`src/styles/characters.css`, `src/pages/Characters.tsx`, `src/components/characters/CharacterCard.tsx`)**:
   - Dedicated styling in `src/styles/characters.css`.
   - Dynamic card visual identity based on `character.color`.
   - Portrait glow response, weapon icon micro-motion, hover/focus elevation, and polished selected/focused states.
   - Polished weapon synergy presentation.
   - Full support for `prefers-reduced-motion`.

## Verification Plan
- `npm run lint` -> 0 errors, 0 warnings.
- `npm run build` -> production build exit 0.
- Verify distinct visual identities for all 5 characters during idle, move, attack, damage, and frost.
