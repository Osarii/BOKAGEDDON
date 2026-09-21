# BONKAGEDDON Asset Pack V2 Handoff

For Antigravity: Codex integrated the V2 WebP artwork into React UI only. The 3D scene and gameplay simulation were intentionally left untouched.

## V2 Asset Paths

Characters:
- `public/assets/v2/characters/bonk.webp`
- `public/assets/v2/characters/byte.webp`
- `public/assets/v2/characters/tank.webp`

Compact portraits:
- `public/assets/v2/ui/portrait-bonk.webp`
- `public/assets/v2/ui/portrait-byte.webp`
- `public/assets/v2/ui/portrait-tank.webp`

Logo:
- `public/assets/v2/ui/bonkageddon-logo.webp`

Enemies:
- `public/assets/v2/enemies/slime.webp`
- `public/assets/v2/enemies/runner.webp`
- `public/assets/v2/enemies/brute.webp`
- `public/assets/v2/enemies/shooter.webp`
- `public/assets/v2/enemies/bonklord.webp`

Weapons:
- `public/assets/v2/weapons/hammer.webp`
- `public/assets/v2/weapons/energy-orb.webp`
- `public/assets/v2/weapons/axe.webp`

Upgrades:
- `public/assets/v2/upgrades/damage.webp`
- `public/assets/v2/upgrades/haste.webp`
- `public/assets/v2/upgrades/speed.webp`
- `public/assets/v2/upgrades/vitality.webp`
- `public/assets/v2/upgrades/armor.webp`
- `public/assets/v2/upgrades/magnet.webp`
- `public/assets/v2/upgrades/critical.webp`
- `public/assets/v2/upgrades/multishot.webp`

Pickup:
- `public/assets/v2/pickups/xp-gem.webp`

## Integrated By Codex

- `src/config/assets.ts`
  - `ASSETS.characters` now points to V2 full character WebP art.
  - `ASSETS.portraits` was added for compact HUD portraits.
  - `ASSETS.weapons`, `ASSETS.upgrades`, `ASSETS.pickups.xpGem`, and `ASSETS.ui.logo` now point to V2 WebP art.
  - `ASSETS.enemyArt` was added for UI/documentation previews only.
  - `ASSETS.enemies` still points to the original SVG enemy art so scene code is not redirected accidentally.
- `src/components/characters/CharacterCard.tsx`
  - Character cards use V2 full character art and V2 weapon icons.
- `src/components/game/HUDShell.tsx`
  - HUD character badge uses V2 compact portrait art.
  - Active upgrade icons use V2 upgrade art through the shared asset map.
- `src/components/game/LevelUpOverlay.tsx`
  - Level-up cards use V2 upgrade art.
- `src/pages/Home.tsx`
  - Home hero logo uses the V2 BONKAGEDDON logo.
- `src/pages/Instructions.tsx`
  - Phase 0 copy was removed.
  - Instructions use V2 weapon, XP gem, upgrade icons, and enemy preview art.
- `src/styles/global.css`
  - Character card portrait sizing was adjusted so full V2 characters read clearly.

## Original SVG Assets Still Active

The original SVGs remain in `public/assets/**`.

Still intentionally active:
- `public/assets/enemies/*.svg` via `ASSETS.enemies`

Retained as fallback/reference under `ASSETS.legacy`:
- `public/assets/characters/*.svg`
- `public/assets/weapons/*.svg`
- `public/assets/upgrades/*.svg`
- `public/assets/pickups/xp-gem.svg`
- `public/assets/ui/bonkageddon-logo.svg`

## Recommended Scene Mapping

Use these only when touching `src/scene/**`:

- Slime: `public/assets/v2/enemies/slime.webp`
- Runner: `public/assets/v2/enemies/runner.webp`
- Brute: `public/assets/v2/enemies/brute.webp`
- Shooter: `public/assets/v2/enemies/shooter.webp`
- Bonklord: `public/assets/v2/enemies/bonklord.webp`
- XP gem: `public/assets/v2/pickups/xp-gem.webp`
- Hammer effect: `public/assets/v2/weapons/hammer.webp`
- Energy orb effect: `public/assets/v2/weapons/energy-orb.webp`
- Axe effect: `public/assets/v2/weapons/axe.webp`

## Remaining Visual Opportunities In `src/scene/**`

- Enemy billboard/decal rendering in `EnemyManager.tsx`.
- Boss visual treatment for Bonklord.
- XP gem pickup mesh/decal in the pickup scene layer.
- Weapon projectile or hit decals for hammer, axe, and energy orb.
- Optional arena decals that reference the V2 style without changing arena collision or spawn math.

## Transparency And Aspect Notes

- Character, portrait, enemy, weapon, upgrade, and XP files are square WebP assets and should render with `object-fit: contain`.
- The logo is wide (`1100x385`) and should also render with `object-fit: contain`.
- Preserve transparent padding; avoid `cover` unless deliberately cropping for a tiny badge.
- Keep HUD icons small but readable. The UI uses compact portrait files for the HUD instead of full character art.

## Integration Warning

Do not replace working simulation, targeting, spawn, collision, score, runtime, or balance logic while integrating scene visuals. Treat the V2 art as rendering input only.
