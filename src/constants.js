/**
 * Shared constants for UniversoDu
 * Centralized configuration to avoid duplication
 */

// Tags allowed for landscape generation
export const ALLOWED_TAGS = new Set([
  "cacti",
  "rocks",
  "oasis",
  "ruins",
  "crystals",
  "mirage",
  "fireflies",
  "totems",
  "structures",
  "flora",
  "portals",
  "storm",
  "sentinels",
  "creatures",
  "nomads",
]);

export const KNOWN_TAGS = Array.from(ALLOWED_TAGS);

// Entity types that can be spawned
export const ENTITY_TYPES = new Set([
  "structure",
  "tower",
  "tree",
  "oasis",
  "water",
  "crystal",
  "portal",
  "fireflies",
  "totem",
  "rock",
  "dune",
  "bridge",
  "monolith",
  "flora",
  "creature",
  "sentinel",
  "cacti",
  "ruins",
  "mirage",
  "nomad",
  "storm",
  // New types
  "human",
  "bird",
  "fish",
  "deer",
  "wolf",
  "horse",
  "sea",
  "river_detailed",
  "lake_detailed",
]);

// Alias mapping for entity types (plural/alternative names -> canonical)
export const ENTITY_TYPE_ALIASES = {
  structures: "structure",
  building: "structure",
  buildings: "structure",
  towers: "tower",
  trees: "tree",
  cactus: "cacti",
  cactuses: "cacti",
  oasis: "oasis",
  waters: "water",
  lakes: "water",
  crystals: "crystal",
  portals: "portal",
  gateways: "portal",
  firefly: "fireflies",
  totems: "totem",
  rocks: "rock",
  stones: "rock",
  dunes: "dune",
  bridges: "bridge",
  monoliths: "monolith",
  florae: "flora",
  plants: "flora",
  creatures: "creature",
  sentinels: "sentinel",
  guardians: "sentinel",
  ruins: "ruins",
  temples: "ruins",
  mirages: "mirage",
  visions: "mirage",
  nomads: "nomad",
  caravans: "nomad",
  storms: "storm",
  // Human and animal aliases
  person: "human",
  figure: "human",
  man: "human",
  woman: "human",
  people: "human",
  humans: "human",
  birds: "bird",
  eagle: "bird",
  hawk: "bird",
  fishes: "fish",
  deers: "deer",
  wolves: "wolf",
  dog: "wolf",
  dogs: "wolf",
  horses: "horse",
  animal: "deer",
  animals: "deer",
  // Water body aliases
  ocean: "sea",
  seas: "sea",
  oceans: "sea",
  river: "river_detailed",
  rivers: "river_detailed",
  lake: "lake_detailed",
  lakes: "lake_detailed",
};

// Human-readable labels for tags (Spanish)
export const TAG_LABELS = {
  cacti: "Cactaceas luminicas",
  rocks: "Cantiles petreos",
  oasis: "Oasis nebuloso",
  ruins: "Ruinas misticas",
  crystals: "Coral de cristal",
  mirage: "Espejismo solar",
  fireflies: "Luciernagas sonicas",
  totems: "Totems del viento",
  creatures: "Seres errantes",
  nomads: "Caravana nomada",
  structures: "Arquitectura viva",
  storm: "Tormenta resonante",
  flora: "Flora hibrida",
  portals: "Portales astrales",
  sentinels: "Centinelas",
};

// World configuration
export const WORLD_CONFIG = {
  MAX_PROMPT_OBJECTS: 120,
  WALK_SPEED: 42,
  CAMERA_HEIGHT: 3.2,
  TERRAIN_SIZE: 2400,
  DUST_PARTICLE_COUNT: 2000,
};

// Day/night cycle stages
export const DAY_STAGES = {
  amanecer: {
    skyColor: 0xffb07c,  // Naranja rosado amanecer
    fogColor: 0xd4a56a,
    fogDensity: 0.0004,
    sunColor: 0xffe5b5,
    sunIntensity: 1.35,
    ambientIntensity: 0.45,
  },
  manana: {
    skyColor: 0x87ceeb,  // Azul cielo claro
    fogColor: 0xc9b896,
    fogDensity: 0.0004,
    sunColor: 0xfff0c3,
    sunIntensity: 1.6,
    ambientIntensity: 0.6,
  },
  tarde: {
    skyColor: 0x6bb3d9,  // Azul cielo medio
    fogColor: 0xc4a882,
    fogDensity: 0.0005,
    sunColor: 0xffc16c,
    sunIntensity: 1.4,
    ambientIntensity: 0.5,
  },
  atardecer: {
    skyColor: 0xff7f50,  // Naranja coral atardecer
    fogColor: 0xb8886a,
    fogDensity: 0.0006,
    sunColor: 0xf86c4f,
    sunIntensity: 1.1,
    ambientIntensity: 0.35,
  },
  noche: {
    skyColor: 0x1a1a2e,  // Azul oscuro noche
    fogColor: 0x16213e,
    fogDensity: 0.0008,
    sunColor: 0x6ab0ff,
    sunIntensity: 0.35,
    ambientIntensity: 0.2,
  },
};

// API configuration
export const API_CONFIG = {
  FETCH_TIMEOUT_MS: 30000,
  DEFAULT_ENDPOINT: "/api/generate",
};

// UI configuration
export const UI_CONFIG = {
  MAX_LOG_ITEMS: 6,
  TOAST_DURATION_MS: 2600,
};
