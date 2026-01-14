/**
 * Cached materials for Three.js optimization
 * Pre-created materials to avoid GPU memory waste from repeated instantiation
 */

import * as THREE from "three";

// Material cache storage
const materialCache = new Map();

/**
 * Get or create a cached material
 */
function getCachedMaterial(key, factory) {
  if (!materialCache.has(key)) {
    materialCache.set(key, factory());
  }
  return materialCache.get(key);
}

// Cacti materials
export function getCactiMaterial() {
  return getCachedMaterial("cacti", () =>
    new THREE.MeshStandardMaterial({
      color: 0x1e8c4e,
      emissive: 0x062515,
      roughness: 0.6,
      metalness: 0.1,
    })
  );
}

export function getCactiGlowMaterial() {
  return getCachedMaterial("cacti-glow", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff7d6,
      transparent: true,
      opacity: 0.8,
    })
  );
}

// Rock materials
export function getRockMaterial() {
  return getCachedMaterial("rock", () =>
    new THREE.MeshStandardMaterial({
      color: 0x7b6753,
      roughness: 1,
      flatShading: true,
    })
  );
}

// Ruins materials
export function getRuinsMaterial() {
  return getCachedMaterial("ruins", () =>
    new THREE.MeshStandardMaterial({
      color: 0xcdb293,
      roughness: 0.8,
      flatShading: true,
    })
  );
}

export function getRuinsArcMaterial() {
  return getCachedMaterial("ruins-arc", () =>
    new THREE.MeshStandardMaterial({
      color: 0xefe2d0,
      emissive: 0x2c1f13,
      roughness: 0.2,
      metalness: 0.3,
    })
  );
}

// Oasis materials
export function getOasisWaterMaterial() {
  return getCachedMaterial("oasis-water", () =>
    new THREE.MeshPhongMaterial({
      color: 0x58d8ec,
      transparent: true,
      opacity: 0.85,
      shininess: 100,
    })
  );
}

export function getOasisMistMaterial() {
  return getCachedMaterial("oasis-mist", () =>
    new THREE.MeshBasicMaterial({
      color: 0xbef6ff,
      transparent: true,
      opacity: 0.1,
    })
  );
}

export function getPalmLeavesMaterial() {
  return getCachedMaterial("palm-leaves", () =>
    new THREE.MeshStandardMaterial({
      color: 0x2b5534,
      roughness: 0.6,
    })
  );
}

export function getPalmTrunkMaterial() {
  return getCachedMaterial("palm-trunk", () =>
    new THREE.MeshStandardMaterial({
      color: 0x9c6b41,
      roughness: 0.9,
    })
  );
}

// Crystal materials
export function getCrystalMaterial() {
  return getCachedMaterial("crystal", () =>
    new THREE.MeshStandardMaterial({
      color: 0xaef6ff,
      emissive: 0x2e6275,
      metalness: 0.4,
      roughness: 0.2,
    })
  );
}

// Mirage materials
export function getMirageRingMaterial() {
  return getCachedMaterial("mirage-ring", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff2cf,
      transparent: true,
      opacity: 0.35,
    })
  );
}

export function getMirageOrbMaterial() {
  return getCachedMaterial("mirage-orb", () =>
    new THREE.MeshBasicMaterial({
      color: 0xffcba4,
      transparent: true,
      opacity: 0.55,
    })
  );
}

// Fireflies material
export function getFirefliesMaterial() {
  return getCachedMaterial("fireflies", () =>
    new THREE.PointsMaterial({
      color: 0xfff6d3,
      size: 0.7,
      transparent: true,
      opacity: 0.85,
    })
  );
}

// Totem materials
export function getTotemMaterial() {
  return getCachedMaterial("totem", () =>
    new THREE.MeshStandardMaterial({
      color: 0xfce0b8,
      emissive: 0x2f130a,
      roughness: 0.3,
      metalness: 0.1,
    })
  );
}

// Creature materials
export function getCreatureBodyMaterial() {
  return getCachedMaterial("creature-body", () =>
    new THREE.MeshStandardMaterial({
      color: 0xe8d9ff,
      emissive: 0x38245b,
      metalness: 0.3,
      roughness: 0.4,
    })
  );
}

export function getCreatureLimbMaterial() {
  return getCachedMaterial("creature-limb", () =>
    new THREE.MeshStandardMaterial({
      color: 0xffdab8,
      emissive: 0x3f1e15,
    })
  );
}

// Nomad materials
export function getNomadTentMaterial() {
  return getCachedMaterial("nomad-tent", () =>
    new THREE.MeshStandardMaterial({
      color: 0xfeccb5,
      roughness: 0.7,
    })
  );
}

export function getNomadFabricMaterial() {
  return getCachedMaterial("nomad-fabric", () =>
    new THREE.MeshStandardMaterial({
      color: 0xe07143,
      emissive: 0x2b0600,
    })
  );
}

// Structure materials
export function getStructureMaterial() {
  return getCachedMaterial("structure", () =>
    new THREE.MeshStandardMaterial({
      color: 0xded7ff,
      emissive: 0x2c2c54,
      metalness: 0.5,
      roughness: 0.25,
    })
  );
}

export function getStructureHaloMaterial() {
  return getCachedMaterial("structure-halo", () =>
    new THREE.MeshBasicMaterial({
      color: 0xffea8a,
    })
  );
}

// Storm materials
export function getStormFunnelMaterial() {
  return getCachedMaterial("storm-funnel", () =>
    new THREE.MeshStandardMaterial({
      color: 0xcdbba6,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    })
  );
}

export function getStormLightningMaterial() {
  return getCachedMaterial("storm-lightning", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff7ce,
    })
  );
}

// Flora material
export function getFloraMaterial() {
  return getCachedMaterial("flora", () =>
    new THREE.MeshStandardMaterial({
      color: 0xc0ffb2,
      emissive: 0x1f3d28,
    })
  );
}

// Portal material
export function getPortalMaterial() {
  return getCachedMaterial("portal", () =>
    new THREE.MeshStandardMaterial({
      color: 0x96e6ff,
      emissive: 0x114085,
      metalness: 0.4,
    })
  );
}

// Sentinel material
export function getSentinelMaterial() {
  return getCachedMaterial("sentinel", () =>
    new THREE.MeshStandardMaterial({
      color: 0x7078ff,
      emissive: 0x1b1f3f,
      metalness: 0.6,
    })
  );
}

// Terrain materials
export function getDuneMaterial() {
  return getCachedMaterial("dune", () =>
    new THREE.MeshStandardMaterial({
      color: 0xd4a56a, // Arena más dorada/naranja
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    })
  );
}

// Dust particle material
export function getDustMaterial() {
  return getCachedMaterial("dust", () =>
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    })
  );
}

// Sky material
export function getSkyMaterial() {
  return getCachedMaterial("sky", () =>
    new THREE.MeshBasicMaterial({
      color: 0x87ceeb, // Azul cielo claro
      side: THREE.BackSide,
    })
  );
}

// Priest shrine materials
export function getPriestBaseMaterial() {
  return getCachedMaterial("priest-base", () =>
    new THREE.MeshStandardMaterial({
      color: 0x2e1f32,
      roughness: 0.8,
      metalness: 0.2,
    })
  );
}

export function getPriestRuneMaterial() {
  return getCachedMaterial("priest-rune", () =>
    new THREE.MeshStandardMaterial({
      color: 0xfff2c1,
      emissive: 0x4c2d1f,
      metalness: 0.4,
      roughness: 0.25,
    })
  );
}

export function getPriestRobeMaterial() {
  return getCachedMaterial("priest-robe", () =>
    new THREE.MeshStandardMaterial({
      color: 0xcdd7ff,
      emissive: 0x1d1737,
      roughness: 0.6,
      metalness: 0.1,
    })
  );
}

export function getPriestSashMaterial() {
  return getCachedMaterial("priest-sash", () =>
    new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0x4e1e0d,
      metalness: 0.3,
    })
  );
}

export function getPriestHeadMaterial() {
  return getCachedMaterial("priest-head", () =>
    new THREE.MeshStandardMaterial({
      color: 0xf5e3d7,
      roughness: 0.7,
    })
  );
}

export function getPriestStaffMaterial() {
  return getCachedMaterial("priest-staff", () =>
    new THREE.MeshStandardMaterial({
      color: 0x7a4b35,
      roughness: 0.8,
    })
  );
}

export function getPriestHaloMaterial() {
  return getCachedMaterial("priest-halo", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff5ce,
      transparent: true,
      opacity: 0.75,
    })
  );
}

export function getPriestFlameMaterial() {
  return getCachedMaterial("priest-flame", () =>
    new THREE.MeshBasicMaterial({
      color: 0xffe9b8,
      transparent: true,
      opacity: 0.65,
    })
  );
}

export function getPriestOrbMaterial() {
  return getCachedMaterial("priest-orb", () =>
    new THREE.MeshBasicMaterial({
      color: 0x9ad8ff,
      transparent: true,
      opacity: 0.9,
    })
  );
}

// Atmospheric materials
export function getCloudMaterial() {
  return getCachedMaterial("cloud", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff8f0,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
}

export function getSunDiskMaterial() {
  return getCachedMaterial("sun-disk", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff4d4,
      transparent: true,
      opacity: 0.95,
    })
  );
}

export function getHeatWaveMaterial() {
  return getCachedMaterial("heat-wave", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff8e8,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
}

export function getSunRayMaterial() {
  return getCachedMaterial("sun-ray", () =>
    new THREE.MeshBasicMaterial({
      color: 0xfff5d6,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
}

/**
 * Dispose all cached materials (call on cleanup)
 */
export function disposeMaterialCache() {
  materialCache.forEach((material) => {
    material.dispose();
  });
  materialCache.clear();
}

/**
 * Clone a cached material with modifications
 * Use this when you need unique properties (like color tinting)
 */
export function cloneMaterial(getMaterialFn) {
  return getMaterialFn().clone();
}
