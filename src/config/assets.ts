const V2_ASSET_BASE = "/assets/v2";

export const ASSETS = {
  characters: {
    bonk: `${V2_ASSET_BASE}/characters/bonk.webp`,
    byte: `${V2_ASSET_BASE}/characters/byte.webp`,
    tank: `${V2_ASSET_BASE}/characters/tank.webp`,
  },
  portraits: {
    bonk: `${V2_ASSET_BASE}/ui/portrait-bonk.webp`,
    byte: `${V2_ASSET_BASE}/ui/portrait-byte.webp`,
    tank: `${V2_ASSET_BASE}/ui/portrait-tank.webp`,
  },
  enemies: {
    slime: "/assets/enemies/slime.svg",
    runner: "/assets/enemies/runner.svg",
    brute: "/assets/enemies/brute.svg",
    shooter: "/assets/enemies/shooter.svg",
    bonklord: "/assets/enemies/bonklord.svg",
  },
  enemyArt: {
    slime: `${V2_ASSET_BASE}/enemies/slime.webp`,
    runner: `${V2_ASSET_BASE}/enemies/runner.webp`,
    brute: `${V2_ASSET_BASE}/enemies/brute.webp`,
    shooter: `${V2_ASSET_BASE}/enemies/shooter.webp`,
    bonklord: `${V2_ASSET_BASE}/enemies/bonklord.webp`,
  },
  weapons: {
    hammer: `${V2_ASSET_BASE}/weapons/hammer.webp`,
    energyOrb: `${V2_ASSET_BASE}/weapons/energy-orb.webp`,
    axe: `${V2_ASSET_BASE}/weapons/axe.webp`,
  },
  upgrades: {
    damage: `${V2_ASSET_BASE}/upgrades/damage.webp`,
    haste: `${V2_ASSET_BASE}/upgrades/haste.webp`,
    speed: `${V2_ASSET_BASE}/upgrades/speed.webp`,
    vitality: `${V2_ASSET_BASE}/upgrades/vitality.webp`,
    armor: `${V2_ASSET_BASE}/upgrades/armor.webp`,
    magnet: `${V2_ASSET_BASE}/upgrades/magnet.webp`,
    critical: `${V2_ASSET_BASE}/upgrades/critical.webp`,
    multishot: `${V2_ASSET_BASE}/upgrades/multishot.webp`,
  },
  pickups: {
    xpGem: `${V2_ASSET_BASE}/pickups/xp-gem.webp`,
  },
  ui: {
    logo: `${V2_ASSET_BASE}/ui/bonkageddon-logo.webp`,
  },
  legacy: {
    characters: {
      bonk: "/assets/characters/bonk.svg",
      byte: "/assets/characters/byte.svg",
      tank: "/assets/characters/tank.svg",
    },
    weapons: {
      hammer: "/assets/weapons/hammer.svg",
      energyOrb: "/assets/weapons/energy-orb.svg",
      axe: "/assets/weapons/axe.svg",
    },
    upgrades: {
      damage: "/assets/upgrades/damage.svg",
      haste: "/assets/upgrades/haste.svg",
      speed: "/assets/upgrades/speed.svg",
      vitality: "/assets/upgrades/vitality.svg",
      armor: "/assets/upgrades/armor.svg",
      magnet: "/assets/upgrades/magnet.svg",
      critical: "/assets/upgrades/critical.svg",
      multishot: "/assets/upgrades/multishot.svg",
    },
    pickups: {
      xpGem: "/assets/pickups/xp-gem.svg",
    },
    ui: {
      logo: "/assets/ui/bonkageddon-logo.svg",
    },
  },
} as const;
