/**
 * Object spawning functions for UniversoDu
 * Creates 3D objects for the desert landscape
 * EXPANDED VERSION with many more object types
 */

import * as THREE from "three";
import { TAG_LABELS } from "./constants.js";

// ========== Utility Functions ==========

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomColor() {
  return new THREE.Color().setHSL(Math.random(), 0.6 + Math.random() * 0.4, 0.4 + Math.random() * 0.3);
}

function readNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function specSizeToScale(sizeValue, explicitScale) {
  if (typeof explicitScale === "number" && Number.isFinite(explicitScale)) {
    return THREE.MathUtils.clamp(explicitScale, 0.4, 4);
  }
  if (typeof sizeValue === "string") {
    const value = sizeValue.toLowerCase();
    if (["tiny"].includes(value)) return 0.4;
    if (["small", "pequeno", "pequeño"].includes(value)) return 0.7;
    if (["large", "grande"].includes(value)) return 1.4;
    if (["huge", "enorme"].includes(value)) return 1.8;
    if (["gigantic", "colossal", "gigante"].includes(value)) return 2.5;
  }
  return 1;
}

function resolveColor(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new THREE.Color(value);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = new THREE.Color(value.trim());
      if (!Number.isNaN(parsed.r)) return parsed;
    } catch (e) {}
  }
  return null;
}

function colorWithFallback(value, fallback) {
  return resolveColor(value) || new THREE.Color(fallback);
}

export function tagLabel(tag) {
  return TAG_LABELS[tag] || "Nuevo relieve";
}

// ========== Material Helpers ==========

function createStandardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.8,
    metalness: options.metalness ?? 0.1,
    flatShading: options.flatShading ?? false,
    emissive: options.emissive ?? 0x000000,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
  });
}

function createGlowMaterial(color, opacity = 0.6) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
}

// ========== BASIC SPAWNERS ==========

export function spawnCacti(center) {
  const group = new THREE.Group();
  const mat = createStandardMaterial(0x1e8c4e, { emissive: 0x062515, roughness: 0.6 });
  const count = 3 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const scale = randomInRange(0.6, 1.2);
    const cactus = new THREE.Group();

    // Main stem
    const stemHeight = randomInRange(6, 12) * scale;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6 * scale, 0.8 * scale, stemHeight, 12),
      mat
    );
    stem.castShadow = true;
    stem.position.y = stemHeight / 2;
    cactus.add(stem);

    // Branches
    const branchCount = Math.floor(Math.random() * 3) + 1;
    for (let b = 0; b < branchCount; b++) {
      const branchHeight = randomInRange(2, 4) * scale;
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, branchHeight, 10),
        mat
      );
      const side = b % 2 === 0 ? 1 : -1;
      branch.position.set(side * 1.2 * scale, stemHeight * randomInRange(0.3, 0.6), 0);
      branch.rotation.z = side * Math.PI / 3;
      cactus.add(branch);
    }

    // Glowing top
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.4 * scale, 10, 10),
      createGlowMaterial(0xfff7d6, 0.9)
    );
    glow.position.y = stemHeight + 0.3 * scale;
    cactus.add(glow);

    // Flowers
    if (Math.random() > 0.5) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 * scale, 8, 8),
        createGlowMaterial(Math.random() > 0.5 ? 0xff69b4 : 0xffff00, 0.9)
      );
      flower.position.set(randomInRange(-0.5, 0.5) * scale, stemHeight * 0.7, randomInRange(-0.5, 0.5) * scale);
      cactus.add(flower);
    }

    const offset = new THREE.Vector3(randomInRange(-20, 20), 0, randomInRange(-20, 20));
    cactus.position.copy(center).add(offset);
    group.add(cactus);
  }
  return group;
}

export function spawnRocks(center) {
  const group = new THREE.Group();
  const count = 4 + Math.floor(Math.random() * 6);

  for (let i = 0; i < count; i++) {
    const size = randomInRange(2, 10);
    const color = new THREE.Color().setHSL(0.08, randomInRange(0.1, 0.3), randomInRange(0.3, 0.5));
    const mat = createStandardMaterial(color, { roughness: 1, flatShading: true });

    // Use different geometries for variety
    const geoType = Math.floor(Math.random() * 3);
    let geo;
    if (geoType === 0) {
      geo = new THREE.DodecahedronGeometry(size, 0);
    } else if (geoType === 1) {
      geo = new THREE.IcosahedronGeometry(size, 0);
    } else {
      geo = new THREE.OctahedronGeometry(size, 0);
    }

    const rock = new THREE.Mesh(geo, mat);
    rock.castShadow = true;
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    const offset = new THREE.Vector3(randomInRange(-30, 30), size * 0.3, randomInRange(-30, 30));
    rock.position.copy(center).add(offset);
    group.add(rock);
  }
  return group;
}

export function spawnRuins(center) {
  const group = new THREE.Group();
  const mat = createStandardMaterial(0xcdb293, { roughness: 0.9, flatShading: true });
  const darkMat = createStandardMaterial(0x8b7355, { roughness: 0.9 });

  // Base platform
  const base = new THREE.Mesh(new THREE.BoxGeometry(35, 3, 35), mat);
  base.position.copy(center).setY(1.5);
  base.receiveShadow = true;
  group.add(base);

  // Columns (some broken)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 12;
    const height = Math.random() > 0.3 ? randomInRange(8, 18) : randomInRange(3, 6);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, height, 8), mat);
    col.castShadow = true;
    col.position.set(
      center.x + Math.cos(angle) * radius,
      height / 2 + 3,
      center.z + Math.sin(angle) * radius
    );
    group.add(col);

    // Column capital
    if (height > 10) {
      const capital = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 3), darkMat);
      capital.position.set(col.position.x, height + 3.5, col.position.z);
      group.add(capital);
    }
  }

  // Archway
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(8, 1.2, 16, 32, Math.PI),
    createStandardMaterial(0xefe2d0, { emissive: 0x2c1f13, roughness: 0.4, metalness: 0.3 })
  );
  arch.rotation.x = -Math.PI / 2;
  arch.rotation.z = Math.PI / 2;
  arch.position.copy(center).setY(14);
  group.add(arch);

  // Fallen stones
  for (let i = 0; i < 5; i++) {
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(randomInRange(2, 4), randomInRange(1, 2), randomInRange(2, 4)),
      mat
    );
    stone.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    stone.position.copy(center).add(new THREE.Vector3(randomInRange(-15, 15), 0.5, randomInRange(-15, 15)));
    group.add(stone);
  }

  return group;
}

export function spawnOasis(center) {
  const group = new THREE.Group();

  // Water pool with animated look
  const poolRadius = randomInRange(12, 22);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x3ac9e8,
    transparent: true,
    opacity: 0.8,
    shininess: 120,
    specular: 0xffffff,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(poolRadius, 64), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(center).setY(0.08);
  group.add(pool);

  // Water rim/shore
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(poolRadius, poolRadius + 3, 64),
    createStandardMaterial(0xc2a87d, { roughness: 0.9 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.copy(center).setY(0.05);
  group.add(shore);

  // Mist effect
  const mistGeo = new THREE.SphereGeometry(poolRadius * 0.8, 20, 20);
  const mist = new THREE.Mesh(mistGeo, createGlowMaterial(0xbef6ff, 0.12));
  mist.position.copy(center).setY(4);
  mist.scale.y = 0.3;
  group.add(mist);

  // Palm trees around
  const palmCount = Math.floor(randomInRange(4, 8));
  for (let i = 0; i < palmCount; i++) {
    const palm = createPalmTree(randomInRange(0.8, 1.2));
    const angle = (i / palmCount) * Math.PI * 2 + Math.random() * 0.3;
    const dist = poolRadius + randomInRange(2, 6);
    palm.position.set(
      center.x + Math.cos(angle) * dist,
      0,
      center.z + Math.sin(angle) * dist
    );
    group.add(palm);
  }

  // Grass patches
  for (let i = 0; i < 20; i++) {
    const grass = createGrassPatch();
    const angle = Math.random() * Math.PI * 2;
    const dist = poolRadius + randomInRange(-2, 8);
    grass.position.set(
      center.x + Math.cos(angle) * dist,
      0.1,
      center.z + Math.sin(angle) * dist
    );
    group.add(grass);
  }

  return group;
}

function createPalmTree(scale = 1) {
  const tree = new THREE.Group();
  const trunkMat = createStandardMaterial(0x8b6914, { roughness: 0.9 });
  const leavesMat = createStandardMaterial(0x2d8c4e, { roughness: 0.7 });

  // Curved trunk
  const trunkHeight = 12 * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4 * scale, 0.7 * scale, trunkHeight, 8),
    trunkMat
  );
  trunk.castShadow = true;
  trunk.position.y = trunkHeight / 2;
  trunk.rotation.z = Math.random() * 0.15;
  tree.add(trunk);

  // Leaves with animation
  const leafGroup = new THREE.Group();
  leafGroup.position.y = trunkHeight;
  leafGroup.userData = {
    animated: true,
    animationType: "sway",
    swaySpeed: 0.8 + Math.random() * 0.4,
    swayAmount: 0.06,
    phase: Math.random() * Math.PI * 2,
    baseRotation: { x: 0, y: 0, z: 0 },
  };
  tree.add(leafGroup);

  const leafCount = 8;
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(4 * scale, 6 * scale, 4, 1),
      leavesMat
    );
    const angle = (i / leafCount) * Math.PI * 2;
    leaf.position.set(
      Math.cos(angle) * 1.5 * scale,
      1 * scale,
      Math.sin(angle) * 1.5 * scale
    );
    leaf.rotation.x = Math.PI / 3;
    leaf.rotation.y = angle;
    leafGroup.add(leaf);
  }

  // Coconuts
  if (Math.random() > 0.5) {
    for (let i = 0; i < 3; i++) {
      const coconut = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 * scale, 8, 8),
        createStandardMaterial(0x5c4033)
      );
      coconut.position.set(
        Math.cos(i * 2) * 0.5 * scale,
        trunkHeight - 0.5 * scale,
        Math.sin(i * 2) * 0.5 * scale
      );
      tree.add(coconut);
    }
  }

  return tree;
}

function createGrassPatch() {
  const group = new THREE.Group();
  const grassMat = createStandardMaterial(0x4a7c23, { roughness: 0.8 });

  // Add swaying animation to the whole grass patch
  group.userData = {
    animated: true,
    animationType: "sway",
    swaySpeed: 1.5 + Math.random() * 0.5,
    swayAmount: 0.15,
    phase: Math.random() * Math.PI * 2,
    baseRotation: { x: 0, y: 0, z: 0 },
  };

  for (let i = 0; i < 8; i++) {
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, randomInRange(0.3, 0.8), 4),
      grassMat
    );
    blade.position.set(randomInRange(-0.3, 0.3), 0.2, randomInRange(-0.3, 0.3));
    blade.rotation.z = randomInRange(-0.2, 0.2);
    group.add(blade);
  }

  return group;
}

export function spawnCrystals(center) {
  const group = new THREE.Group();
  const count = randomInRange(5, 12);

  // Crystal cluster
  for (let i = 0; i < count; i++) {
    const height = randomInRange(4, 16);
    const hue = randomInRange(0.5, 0.6); // Cyan to blue range
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);

    const mat = createStandardMaterial(color, {
      emissive: color.clone().multiplyScalar(0.4),
      metalness: 0.6,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    const crystal = new THREE.Mesh(
      new THREE.ConeGeometry(randomInRange(0.8, 2), height, 6),
      mat
    );
    crystal.castShadow = true;

    const offset = new THREE.Vector3(randomInRange(-12, 12), height / 2, randomInRange(-12, 12));
    crystal.position.copy(center).add(offset);
    crystal.rotation.z = randomInRange(-0.3, 0.3);
    crystal.rotation.x = randomInRange(-0.2, 0.2);
    group.add(crystal);
  }

  // Glow at base with pulsing animation
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(8, 16, 16),
    createGlowMaterial(0x00ffff, 0.15)
  );
  glow.position.copy(center).setY(2);
  glow.scale.y = 0.3;
  glow.userData = {
    animated: true,
    animationType: "pulse",
    baseScale: 1,
    pulseSpeed: 1.2,
    pulseAmount: 0.15,
    phase: Math.random() * Math.PI * 2,
  };
  group.add(glow);

  return group;
}

export function spawnMirage(center) {
  const group = new THREE.Group();

  // Multiple floating rings
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(8 + i * 4, 0.6 + i * 0.2, 24, 80),
      createGlowMaterial(0xfff2cf, 0.25 - i * 0.05)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(center).setY(5 + i * 2);
    group.add(ring);
  }

  // Central orb with float animation
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(4, 32, 32),
    createGlowMaterial(0xffcba4, 0.6)
  );
  orb.position.copy(center).setY(8);
  orb.userData = {
    animated: true,
    animationType: "float",
    baseY: 8,
    floatSpeed: 0.8,
    floatAmount: 1.5,
    phase: Math.random() * Math.PI * 2,
  };
  group.add(orb);

  // Inner glow with pulse
  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2, 16, 16),
    createGlowMaterial(0xffffff, 0.9)
  );
  innerGlow.position.copy(center).setY(8);
  innerGlow.userData = {
    animated: true,
    animationType: "pulse",
    baseScale: 1,
    pulseSpeed: 1.5,
    pulseAmount: 0.2,
    phase: Math.random() * Math.PI * 2,
  };
  group.add(innerGlow);

  // Light particles around
  const particleCount = 50;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomInRange(5, 20);
    positions[i * 3] = center.x + Math.cos(angle) * radius;
    positions[i * 3 + 1] = randomInRange(3, 15);
    positions[i * 3 + 2] = center.z + Math.sin(angle) * radius;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({ color: 0xfff7d6, size: 0.5, transparent: true, opacity: 0.7 })
  );
  group.add(particles);

  return group;
}

export function spawnFireflies(center) {
  const group = new THREE.Group();
  const count = randomInRange(60, 120);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = center.x + randomInRange(-25, 25);
    positions[i * 3 + 1] = randomInRange(2, 18);
    positions[i * 3 + 2] = center.z + randomInRange(-25, 25);

    // Varying colors from yellow to green
    const color = new THREE.Color().setHSL(randomInRange(0.15, 0.35), 1, 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const fireflies = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: randomInRange(0.5, 1),
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
    })
  );
  group.add(fireflies);

  return group;
}

export function spawnTotems(center) {
  const group = new THREE.Group();
  const count = randomInRange(3, 6);

  for (let i = 0; i < count; i++) {
    const totem = new THREE.Group();
    const height = randomInRange(8, 18);
    const segments = Math.floor(randomInRange(3, 6));

    // Stacked segments with faces
    for (let s = 0; s < segments; s++) {
      const segHeight = height / segments;
      const segWidth = randomInRange(1.5, 2.5) * (1 - s * 0.1);
      const hue = randomInRange(0.05, 0.15);
      const color = new THREE.Color().setHSL(hue, 0.6, 0.5);

      const segment = new THREE.Mesh(
        new THREE.BoxGeometry(segWidth, segHeight, segWidth),
        createStandardMaterial(color, { roughness: 0.7 })
      );
      segment.castShadow = true;
      segment.position.y = s * segHeight + segHeight / 2;

      // Add carved face details
      if (Math.random() > 0.3) {
        const eye1 = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 8, 8),
          createGlowMaterial(0xff6600, 0.9)
        );
        eye1.position.set(-0.4, 0.2, segWidth / 2 + 0.1);
        segment.add(eye1);

        const eye2 = eye1.clone();
        eye2.position.x = 0.4;
        segment.add(eye2);
      }

      totem.add(segment);
    }

    // Glowing top
    const crown = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.5, 0),
      createGlowMaterial(0xffaa00, 0.8)
    );
    crown.position.y = height + 1;
    totem.add(crown);

    const angle = (i / count) * Math.PI * 2;
    const radius = randomInRange(6, 12);
    totem.position.set(
      center.x + Math.cos(angle) * radius,
      0,
      center.z + Math.sin(angle) * radius
    );
    totem.rotation.y = Math.random() * Math.PI * 2;

    group.add(totem);
  }

  return group;
}

export function spawnCreatures(center) {
  const group = new THREE.Group();
  const count = randomInRange(3, 7);

  for (let i = 0; i < count; i++) {
    const creature = createCreature();
    const offset = new THREE.Vector3(randomInRange(-25, 25), 0, randomInRange(-25, 25));
    creature.position.copy(center).add(offset);
    group.add(creature);
  }

  return group;
}

function createCreature() {
  const creature = new THREE.Group();
  const bodyColor = new THREE.Color().setHSL(randomInRange(0.7, 0.9), 0.5, 0.6);
  const bodyMat = createStandardMaterial(bodyColor, { emissive: bodyColor.clone().multiplyScalar(0.2), metalness: 0.3 });

  // Body
  const bodySize = randomInRange(1.5, 3);
  const body = new THREE.Mesh(new THREE.SphereGeometry(bodySize, 18, 18), bodyMat);
  body.castShadow = true;
  body.position.y = bodySize;
  creature.add(body);

  // Head
  const headSize = bodySize * 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headSize, 16, 16), bodyMat);
  head.position.y = bodySize * 2 + headSize * 0.5;
  creature.add(head);

  // Eyes (glowing)
  const eyeMat = createGlowMaterial(0x00ffff, 0.95);
  const eyeSize = headSize * 0.25;
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(eyeSize, 8, 8), eyeMat);
  eye1.position.set(-headSize * 0.4, bodySize * 2 + headSize * 0.6, headSize * 0.7);
  creature.add(eye1);

  const eye2 = eye1.clone();
  eye2.position.x = headSize * 0.4;
  creature.add(eye2);

  // Antennae
  const antennaMat = createStandardMaterial(0xffdab8, { emissive: 0x3f1e15 });
  for (let a = 0; a < 2; a++) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.15, bodySize, 8),
      antennaMat
    );
    antenna.position.set(
      (a === 0 ? -1 : 1) * headSize * 0.3,
      bodySize * 2 + headSize + bodySize * 0.3,
      0
    );
    antenna.rotation.z = (a === 0 ? 1 : -1) * Math.PI / 6;
    creature.add(antenna);

    // Antenna tip glow
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      createGlowMaterial(0xff00ff, 0.9)
    );
    tip.position.set(
      antenna.position.x + (a === 0 ? -0.3 : 0.3),
      antenna.position.y + bodySize * 0.4,
      0
    );
    creature.add(tip);
  }

  // Legs
  const legMat = createStandardMaterial(0xddbbaa);
  const legCount = Math.floor(randomInRange(4, 8));
  for (let l = 0; l < legCount; l++) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.2, bodySize * 1.5, 6),
      legMat
    );
    const angle = (l / legCount) * Math.PI * 2;
    leg.position.set(
      Math.cos(angle) * bodySize * 0.8,
      bodySize * 0.3,
      Math.sin(angle) * bodySize * 0.8
    );
    leg.rotation.z = Math.cos(angle) * Math.PI / 4;
    leg.rotation.x = Math.sin(angle) * Math.PI / 4;
    creature.add(leg);
  }

  return creature;
}

export function spawnNomads(center) {
  const group = new THREE.Group();

  // Create a caravan camp
  const tentCount = randomInRange(2, 5);
  for (let i = 0; i < tentCount; i++) {
    const tent = createTent();
    const angle = (i / tentCount) * Math.PI * 1.5 - Math.PI / 4;
    const radius = randomInRange(8, 15);
    tent.position.set(
      center.x + Math.cos(angle) * radius,
      0,
      center.z + Math.sin(angle) * radius
    );
    tent.rotation.y = angle + Math.PI / 2;
    group.add(tent);
  }

  // Campfire in center
  const campfire = createCampfire();
  campfire.position.copy(center);
  group.add(campfire);

  // Scattered items
  for (let i = 0; i < 8; i++) {
    const item = Math.random() > 0.5 ? createPot() : createCrate();
    item.position.set(
      center.x + randomInRange(-12, 12),
      0,
      center.z + randomInRange(-12, 12)
    );
    group.add(item);
  }

  return group;
}

function createTent() {
  const tent = new THREE.Group();
  const tentMat = createStandardMaterial(0xd4a574, { roughness: 0.9 });
  const poleMat = createStandardMaterial(0x654321);

  // Tent body (cone)
  const body = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 6, 1, true), tentMat);
  body.position.y = 2.5;
  body.castShadow = true;
  tent.add(body);

  // Central pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 8), poleMat);
  pole.position.y = 3;
  tent.add(pole);

  // Door flap
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 3),
    createStandardMaterial(0xc49464)
  );
  door.position.set(0, 1.5, 3.5);
  door.rotation.x = 0.3;
  tent.add(door);

  // Decorative fabric strips
  const fabricColors = [0xe07143, 0x4a90d9, 0xf4d03f];
  for (let f = 0; f < 3; f++) {
    const fabric = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 2),
      createStandardMaterial(fabricColors[f % 3])
    );
    fabric.position.set(Math.cos(f) * 3.5, 3, Math.sin(f) * 3.5);
    fabric.rotation.y = f * Math.PI / 1.5;
    tent.add(fabric);
  }

  return tent;
}

function createCampfire() {
  const fire = new THREE.Group();

  // Stone ring
  for (let i = 0; i < 8; i++) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4, 0),
      createStandardMaterial(0x555555, { roughness: 1 })
    );
    const angle = (i / 8) * Math.PI * 2;
    stone.position.set(Math.cos(angle) * 1.5, 0.2, Math.sin(angle) * 1.5);
    fire.add(stone);
  }

  // Logs
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 2, 8),
      createStandardMaterial(0x4a3728)
    );
    log.position.set(Math.cos(i * 1.5) * 0.5, 0.3, Math.sin(i * 1.5) * 0.5);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = i * Math.PI / 2;
    fire.add(log);
  }

  // Fire glow
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.8, 2.5, 8, 1),
    createGlowMaterial(0xff6600, 0.8)
  );
  flame.position.y = 1.5;
  fire.add(flame);

  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.8, 8, 1),
    createGlowMaterial(0xffff00, 0.9)
  );
  innerFlame.position.y = 1.3;
  fire.add(innerFlame);

  // Point light
  const light = new THREE.PointLight(0xff6600, 1, 15, 2);
  light.position.y = 2;
  fire.add(light);

  return fire;
}

function createPot() {
  const pot = new THREE.Group();
  const potMat = createStandardMaterial(0x8b4513, { roughness: 0.8 });

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    potMat
  );
  body.scale.y = 0.8;
  body.position.y = 0.4;
  pot.add(body);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.08, 8, 16),
    potMat
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.7;
  pot.add(rim);

  return pot;
}

function createCrate() {
  const crate = new THREE.Group();
  const mat = createStandardMaterial(0x8b7355, { roughness: 0.9 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.6), mat);
  box.position.y = 0.4;
  box.castShadow = true;
  crate.add(box);

  return crate;
}

export function spawnStructures(center) {
  const group = new THREE.Group();
  const count = randomInRange(2, 5);

  for (let i = 0; i < count; i++) {
    const structure = createTower();
    const offset = new THREE.Vector3(randomInRange(-40, 40), 0, randomInRange(-40, 40));
    structure.position.copy(center).add(offset);
    group.add(structure);
  }

  return group;
}

function createTower() {
  const tower = new THREE.Group();
  const height = randomInRange(20, 45);
  const baseRadius = randomInRange(2, 4);
  const color = new THREE.Color().setHSL(0.7, 0.4, 0.7);

  const mat = createStandardMaterial(color, {
    emissive: color.clone().multiplyScalar(0.15),
    metalness: 0.5,
    roughness: 0.3,
  });

  // Main tower body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(baseRadius * 0.7, baseRadius, height, 8, 1),
    mat
  );
  body.castShadow = true;
  body.position.y = height / 2;
  tower.add(body);

  // Balconies
  const balconyCount = Math.floor(height / 12);
  for (let b = 0; b < balconyCount; b++) {
    const balcony = new THREE.Mesh(
      new THREE.TorusGeometry(baseRadius * 1.2, 0.3, 8, 16),
      mat
    );
    balcony.rotation.x = Math.PI / 2;
    balcony.position.y = (b + 1) * (height / (balconyCount + 1));
    tower.add(balcony);
  }

  // Spire
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(baseRadius * 0.5, height * 0.2, 6),
    mat
  );
  spire.position.y = height + height * 0.1;
  tower.add(spire);

  // Glowing halo
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(baseRadius * 1.5, 0.2, 16, 40),
    createGlowMaterial(0xffea8a, 0.8)
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = height + height * 0.25;
  tower.add(halo);

  // Windows
  const windowMat = createGlowMaterial(0xfff7d6, 0.9);
  for (let w = 0; w < 8; w++) {
    const angle = (w / 8) * Math.PI * 2;
    for (let h = 0; h < 4; h++) {
      const window = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.2),
        windowMat
      );
      window.position.set(
        Math.cos(angle) * baseRadius * 0.85,
        height * 0.2 + h * (height * 0.2),
        Math.sin(angle) * baseRadius * 0.85
      );
      window.rotation.y = -angle;
      tower.add(window);
    }
  }

  return tower;
}

export function spawnStorm(center) {
  const group = new THREE.Group();

  // Tornado funnel
  const funnel = new THREE.Mesh(
    new THREE.ConeGeometry(35, 80, 24, 16, true),
    createStandardMaterial(0xaa9988, {
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
  );
  funnel.position.copy(center).setY(40);
  group.add(funnel);

  // Inner funnel
  const innerFunnel = new THREE.Mesh(
    new THREE.ConeGeometry(20, 70, 16, 8, true),
    createGlowMaterial(0xccbbaa, 0.2)
  );
  innerFunnel.position.copy(center).setY(35);
  group.add(innerFunnel);

  // Lightning bolts
  for (let i = 0; i < 3; i++) {
    const lightning = createLightning();
    lightning.position.copy(center).add(new THREE.Vector3(
      randomInRange(-20, 20),
      randomInRange(30, 60),
      randomInRange(-20, 20)
    ));
    lightning.rotation.z = randomInRange(-0.5, 0.5);
    group.add(lightning);
  }

  // Debris particles
  const debrisCount = 100;
  const debrisGeo = new THREE.BufferGeometry();
  const debrisPos = new Float32Array(debrisCount * 3);
  for (let i = 0; i < debrisCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomInRange(5, 30);
    debrisPos[i * 3] = center.x + Math.cos(angle) * radius;
    debrisPos[i * 3 + 1] = randomInRange(5, 70);
    debrisPos[i * 3 + 2] = center.z + Math.sin(angle) * radius;
  }
  debrisGeo.setAttribute("position", new THREE.BufferAttribute(debrisPos, 3));
  const debris = new THREE.Points(
    debrisGeo,
    new THREE.PointsMaterial({ color: 0x8b7355, size: 1.5 })
  );
  group.add(debris);

  return group;
}

function createLightning() {
  const lightning = new THREE.Group();
  const mat = createGlowMaterial(0xffffff, 0.95);

  // Main bolt
  const segments = 8;
  let lastPoint = new THREE.Vector3(0, 0, 0);

  for (let i = 0; i < segments; i++) {
    const length = randomInRange(5, 15);
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.4, length, 4),
      mat
    );

    bolt.position.copy(lastPoint);
    bolt.position.y -= length / 2;
    bolt.rotation.z = randomInRange(-0.5, 0.5);
    bolt.rotation.x = randomInRange(-0.3, 0.3);
    lightning.add(bolt);

    lastPoint = new THREE.Vector3(
      lastPoint.x + randomInRange(-3, 3),
      lastPoint.y - length,
      lastPoint.z + randomInRange(-3, 3)
    );

    // Branch
    if (Math.random() > 0.6) {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.2, length * 0.6, 4),
        mat
      );
      branch.position.copy(bolt.position);
      branch.rotation.z = randomInRange(-1, 1);
      lightning.add(branch);
    }
  }

  return lightning;
}

export function spawnFlora(center) {
  const group = new THREE.Group();
  const count = randomInRange(15, 30);

  for (let i = 0; i < count; i++) {
    const plantType = Math.floor(Math.random() * 4);
    let plant;

    switch (plantType) {
      case 0:
        plant = createFlower();
        break;
      case 1:
        plant = createBush();
        break;
      case 2:
        plant = createMushroom();
        break;
      default:
        plant = createGrassPatch();
        break;
    }

    const offset = new THREE.Vector3(randomInRange(-25, 25), 0, randomInRange(-25, 25));
    plant.position.copy(center).add(offset);
    group.add(plant);
  }

  return group;
}

function createFlower() {
  const flower = new THREE.Group();
  const petalColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);

  // Add sway animation
  flower.userData = {
    animated: true,
    animationType: "sway",
    swaySpeed: 1.2 + Math.random() * 0.6,
    swayAmount: 0.12,
    phase: Math.random() * Math.PI * 2,
    baseRotation: { x: 0, y: 0, z: 0 },
  };

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, randomInRange(0.5, 1.5), 6),
    createStandardMaterial(0x228b22)
  );
  stem.position.y = 0.5;
  flower.add(stem);

  // Petals
  const petalCount = Math.floor(randomInRange(5, 8));
  for (let p = 0; p < petalCount; p++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      createStandardMaterial(petalColor, { emissive: petalColor.clone().multiplyScalar(0.2) })
    );
    const angle = (p / petalCount) * Math.PI * 2;
    petal.position.set(Math.cos(angle) * 0.2, 1.1, Math.sin(angle) * 0.2);
    petal.scale.set(1, 0.5, 1);
    flower.add(petal);
  }

  // Center
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    createGlowMaterial(0xffff00, 0.9)
  );
  center.position.y = 1.1;
  flower.add(center);

  return flower;
}

function createBush() {
  const bush = new THREE.Group();
  const color = new THREE.Color().setHSL(randomInRange(0.25, 0.4), 0.6, 0.35);

  // Add gentle sway animation
  bush.userData = {
    animated: true,
    animationType: "sway",
    swaySpeed: 0.6 + Math.random() * 0.3,
    swayAmount: 0.04,
    phase: Math.random() * Math.PI * 2,
    baseRotation: { x: 0, y: 0, z: 0 },
  };

  const sphereCount = randomInRange(4, 8);
  for (let s = 0; s < sphereCount; s++) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(randomInRange(0.4, 0.8), 8, 8),
      createStandardMaterial(color, { roughness: 0.9 })
    );
    sphere.position.set(
      randomInRange(-0.5, 0.5),
      randomInRange(0.3, 0.8),
      randomInRange(-0.5, 0.5)
    );
    bush.add(sphere);
  }

  return bush;
}

function createMushroom() {
  const mushroom = new THREE.Group();
  const capColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, randomInRange(0.3, 0.8), 8),
    createStandardMaterial(0xf5f5dc)
  );
  stem.position.y = 0.25;
  mushroom.add(stem);

  // Cap
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    createStandardMaterial(capColor, { emissive: capColor.clone().multiplyScalar(0.3) })
  );
  cap.position.y = 0.5;
  mushroom.add(cap);

  // Spots
  if (Math.random() > 0.5) {
    for (let i = 0; i < 5; i++) {
      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 8),
        createStandardMaterial(0xffffff)
      );
      const angle = Math.random() * Math.PI * 2;
      const y = randomInRange(0.52, 0.7);
      spot.position.set(Math.cos(angle) * 0.25, y, Math.sin(angle) * 0.25);
      spot.lookAt(0, 0.5, 0);
      mushroom.add(spot);
    }
  }

  // Glow
  if (Math.random() > 0.7) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      createGlowMaterial(capColor, 0.3)
    );
    glow.position.y = 0.5;
    mushroom.add(glow);
  }

  return mushroom;
}

export function spawnPortals(center) {
  const group = new THREE.Group();
  const portalCount = randomInRange(1, 3);

  for (let p = 0; p < portalCount; p++) {
    const portal = createPortal();
    const offset = new THREE.Vector3(p * 20 - 10, 0, randomInRange(-5, 5));
    portal.position.copy(center).add(offset);
    group.add(portal);
  }

  return group;
}

function createPortal() {
  const portal = new THREE.Group();
  const color = new THREE.Color().setHSL(randomInRange(0.5, 0.8), 0.8, 0.5);

  // Outer ring
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(10, 1.5, 16, 60),
    createStandardMaterial(color, { emissive: color.clone().multiplyScalar(0.3), metalness: 0.6 })
  );
  outerRing.rotation.y = Math.PI / 4;
  outerRing.position.y = 10;
  portal.add(outerRing);

  // Inner ring
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(7, 0.8, 12, 40),
    createGlowMaterial(color.clone().offsetHSL(0.1, 0, 0.2), 0.7)
  );
  innerRing.rotation.y = Math.PI / 4;
  innerRing.position.y = 10;
  portal.add(innerRing);

  // Portal surface
  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 32),
    createGlowMaterial(color.clone().offsetHSL(0.05, 0, 0.3), 0.5)
  );
  surface.rotation.y = -Math.PI / 4;
  surface.rotation.x = Math.PI / 2;
  surface.position.y = 10;
  portal.add(surface);

  // Runes around base
  const runeCount = 8;
  for (let r = 0; r < runeCount; r++) {
    const rune = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2, 0.3),
      createGlowMaterial(color, 0.8)
    );
    const angle = (r / runeCount) * Math.PI * 2;
    rune.position.set(Math.cos(angle) * 12, 1, Math.sin(angle) * 12);
    rune.rotation.y = -angle;
    portal.add(rune);
  }

  // Energy particles
  const particleCount = 80;
  const particleGeo = new THREE.BufferGeometry();
  const particlePos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomInRange(2, 8);
    particlePos[i * 3] = Math.cos(angle) * radius * Math.cos(Math.PI / 4);
    particlePos[i * 3 + 1] = 10 + randomInRange(-3, 3);
    particlePos[i * 3 + 2] = Math.sin(angle) * radius * Math.cos(Math.PI / 4);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({ color: color, size: 0.3, transparent: true, opacity: 0.8 })
  );
  portal.add(particles);

  return portal;
}

export function spawnSentinels(center) {
  const group = new THREE.Group();
  const count = randomInRange(3, 6);

  for (let i = 0; i < count; i++) {
    const sentinel = createSentinel();
    const angle = (i / count) * Math.PI * 2;
    const radius = randomInRange(8, 15);
    sentinel.position.set(
      center.x + Math.cos(angle) * radius,
      0,
      center.z + Math.sin(angle) * radius
    );
    sentinel.rotation.y = -angle + Math.PI;
    group.add(sentinel);
  }

  return group;
}

function createSentinel() {
  const sentinel = new THREE.Group();
  const color = new THREE.Color().setHSL(0.65, 0.7, 0.5);
  const mat = createStandardMaterial(color, { emissive: color.clone().multiplyScalar(0.2), metalness: 0.7 });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 12, 2), mat);
  body.castShadow = true;
  body.position.y = 6;
  sentinel.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 2), mat);
  head.position.y = 13.5;
  sentinel.add(head);

  // Eye
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    createGlowMaterial(0xff0000, 0.95)
  );
  eye.position.set(0, 13.5, 1.1);
  sentinel.add(eye);

  // Arms
  for (let a = 0; a < 2; a++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 8, 1), mat);
    arm.position.set((a === 0 ? -2.5 : 2.5), 6, 0);
    arm.rotation.z = (a === 0 ? 1 : -1) * 0.2;
    sentinel.add(arm);
  }

  // Shoulder plates
  for (let s = 0; s < 2; s++) {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1, 2.5),
      mat
    );
    shoulder.position.set((s === 0 ? -2.2 : 2.2), 11, 0);
    sentinel.add(shoulder);
  }

  // Chest glow
  const chestGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 12),
    createGlowMaterial(color, 0.7)
  );
  chestGlow.position.set(0, 7, 1.1);
  sentinel.add(chestGlow);

  return sentinel;
}

// ========== NEW EXPANDED SPAWNERS ==========

export function spawnMountain(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const height = readNumber(spec.height, 80) * scale;
  const baseRadius = height * 0.6;

  // Main mountain
  const mainColor = colorWithFallback(spec.color, 0x6b5b4f);
  const mountainGeo = new THREE.ConeGeometry(baseRadius, height, 8, 4);
  // Add some irregularity
  const positions = mountainGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) > 0 && positions.getY(i) < height * 0.9) {
      positions.setX(i, positions.getX(i) + randomInRange(-5, 5));
      positions.setZ(i, positions.getZ(i) + randomInRange(-5, 5));
    }
  }
  mountainGeo.computeVertexNormals();

  const mountain = new THREE.Mesh(
    mountainGeo,
    createStandardMaterial(mainColor, { roughness: 0.95, flatShading: true })
  );
  mountain.castShadow = true;
  mountain.position.copy(center).setY(height / 2);
  group.add(mountain);

  // Snow cap
  if (height > 50) {
    const snowCap = new THREE.Mesh(
      new THREE.ConeGeometry(baseRadius * 0.3, height * 0.25, 8),
      createStandardMaterial(0xffffff, { roughness: 0.6 })
    );
    snowCap.position.copy(center).setY(height * 0.9);
    group.add(snowCap);
  }

  // Secondary peaks
  const peakCount = Math.floor(randomInRange(1, 4));
  for (let p = 0; p < peakCount; p++) {
    const peakHeight = height * randomInRange(0.4, 0.7);
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(peakHeight * 0.5, peakHeight, 6, 2),
      createStandardMaterial(mainColor.clone().offsetHSL(0, 0, -0.1), { roughness: 0.95, flatShading: true })
    );
    const angle = (p / peakCount) * Math.PI * 2;
    peak.position.set(
      center.x + Math.cos(angle) * baseRadius * 0.7,
      peakHeight / 2,
      center.z + Math.sin(angle) * baseRadius * 0.7
    );
    group.add(peak);
  }

  return group;
}

export function spawnTemple(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0xd4af37);

  const mat = createStandardMaterial(color, { metalness: 0.4, roughness: 0.5 });
  const darkMat = createStandardMaterial(color.clone().offsetHSL(0, 0, -0.2));

  // Base platform (stepped)
  for (let step = 0; step < 4; step++) {
    const stepSize = (40 - step * 6) * scale;
    const stepHeight = 2 * scale;
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(stepSize, stepHeight, stepSize),
      mat
    );
    platform.receiveShadow = true;
    platform.position.copy(center).setY(step * stepHeight + stepHeight / 2);
    group.add(platform);
  }

  // Main structure
  const mainHeight = 25 * scale;
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(20 * scale, mainHeight, 20 * scale),
    mat
  );
  main.castShadow = true;
  main.position.copy(center).setY(8 * scale + mainHeight / 2);
  group.add(main);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(18 * scale, 12 * scale, 4),
    darkMat
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.copy(center).setY(8 * scale + mainHeight + 6 * scale);
  group.add(roof);

  // Columns
  for (let c = 0; c < 8; c++) {
    const angle = (c / 8) * Math.PI * 2;
    const colHeight = mainHeight * 0.8;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2 * scale, 1.5 * scale, colHeight, 8),
      mat
    );
    col.castShadow = true;
    col.position.set(
      center.x + Math.cos(angle) * 14 * scale,
      8 * scale + colHeight / 2,
      center.z + Math.sin(angle) * 14 * scale
    );
    group.add(col);
  }

  // Entrance
  const entrance = new THREE.Mesh(
    new THREE.BoxGeometry(6 * scale, 10 * scale, 2 * scale),
    createStandardMaterial(0x1a1a1a)
  );
  entrance.position.copy(center).add(new THREE.Vector3(0, 8 * scale + 5 * scale, 10.5 * scale));
  group.add(entrance);

  // Glowing orb at top
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(3 * scale, 16, 16),
    createGlowMaterial(0xffcc00, 0.9)
  );
  orb.position.copy(center).setY(8 * scale + mainHeight + 15 * scale);
  group.add(orb);

  return group;
}

export function spawnPyramid(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const height = readNumber(spec.height, 50) * scale;
  const baseSize = height * 1.2;
  const color = colorWithFallback(spec.color, 0xc2a366);

  // Main pyramid
  const pyramid = new THREE.Mesh(
    new THREE.ConeGeometry(baseSize / Math.sqrt(2), height, 4),
    createStandardMaterial(color, { roughness: 0.8, flatShading: true })
  );
  pyramid.rotation.y = Math.PI / 4;
  pyramid.castShadow = true;
  pyramid.position.copy(center).setY(height / 2);
  group.add(pyramid);

  // Entrance
  const entranceSize = height * 0.15;
  const entrance = new THREE.Mesh(
    new THREE.BoxGeometry(entranceSize, entranceSize * 1.5, entranceSize / 2),
    createStandardMaterial(0x1a1a1a)
  );
  entrance.position.copy(center).add(new THREE.Vector3(0, entranceSize, baseSize * 0.4));
  group.add(entrance);

  // Capstone (glowing)
  const capstone = new THREE.Mesh(
    new THREE.ConeGeometry(baseSize * 0.08, height * 0.1, 4),
    createGlowMaterial(0xffd700, 0.9)
  );
  capstone.rotation.y = Math.PI / 4;
  capstone.position.copy(center).setY(height * 0.97);
  group.add(capstone);

  // Steps/blocks texture effect
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        baseSize * (1 - i * 0.18) * 0.7,
        baseSize * (1 - i * 0.18) * 0.72,
        4
      ),
      createStandardMaterial(color.clone().offsetHSL(0, 0, -0.1))
    );
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Math.PI / 4;
    ring.position.copy(center).setY(height * i * 0.18 + 1);
    group.add(ring);
  }

  return group;
}

export function spawnStatue(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0x808080);
  const mat = createStandardMaterial(color, { metalness: 0.3, roughness: 0.6 });

  // Pedestal
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(4 * scale, 3 * scale, 4 * scale),
    mat
  );
  pedestal.position.copy(center).setY(1.5 * scale);
  group.add(pedestal);

  // Body/torso
  const bodyHeight = 12 * scale;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2 * scale, 2.5 * scale, bodyHeight, 8),
    mat
  );
  body.castShadow = true;
  body.position.copy(center).setY(3 * scale + bodyHeight / 2);
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2 * scale, 16, 16),
    mat
  );
  head.position.copy(center).setY(3 * scale + bodyHeight + 2 * scale);
  group.add(head);

  // Arms (raised)
  for (let a = 0; a < 2; a++) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 * scale, 0.7 * scale, 8 * scale, 6),
      mat
    );
    arm.position.set(
      center.x + (a === 0 ? -3 : 3) * scale,
      3 * scale + bodyHeight * 0.7,
      center.z
    );
    arm.rotation.z = (a === 0 ? 1 : -1) * Math.PI / 3;
    group.add(arm);
  }

  // Glowing eyes
  for (let e = 0; e < 2; e++) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 * scale, 8, 8),
      createGlowMaterial(0x00ffff, 0.95)
    );
    eye.position.set(
      center.x + (e === 0 ? -0.7 : 0.7) * scale,
      3 * scale + bodyHeight + 2.2 * scale,
      center.z + 1.5 * scale
    );
    group.add(eye);
  }

  return group;
}

export function spawnWaterfall(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const height = readNumber(spec.height, 30) * scale;

  // Cliff
  const cliff = new THREE.Mesh(
    new THREE.BoxGeometry(20 * scale, height, 8 * scale),
    createStandardMaterial(0x5a4a3a, { roughness: 0.95, flatShading: true })
  );
  cliff.position.copy(center).add(new THREE.Vector3(0, height / 2, -4 * scale));
  group.add(cliff);

  // Water stream
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x4aa8d4,
    transparent: true,
    opacity: 0.7,
    shininess: 100,
  });

  const stream = new THREE.Mesh(
    new THREE.PlaneGeometry(6 * scale, height),
    waterMat
  );
  stream.position.copy(center).setY(height / 2);
  group.add(stream);

  // Pool at bottom
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(12 * scale, 32),
    waterMat
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(center).setY(0.1);
  group.add(pool);

  // Mist
  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(10 * scale, 16, 16),
    createGlowMaterial(0xffffff, 0.15)
  );
  mist.position.copy(center).setY(5 * scale);
  mist.scale.y = 0.5;
  group.add(mist);

  // Splash particles
  const particleCount = 100;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = center.x + randomInRange(-8, 8) * scale;
    positions[i * 3 + 1] = randomInRange(1, 10) * scale;
    positions[i * 3 + 2] = center.z + randomInRange(-8, 8) * scale;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.6 })
  );
  group.add(particles);

  return group;
}

export function spawnAurora(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);

  // Create flowing aurora ribbons
  const ribbonCount = 5;
  for (let r = 0; r < ribbonCount; r++) {
    const hue = 0.3 + r * 0.1; // Green to cyan range
    const color = new THREE.Color().setHSL(hue, 0.8, 0.5);

    const ribbonGeo = new THREE.PlaneGeometry(100 * scale, 30 * scale, 20, 5);
    // Wave the ribbon
    const positions = ribbonGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const wave = Math.sin(x * 0.05 + r) * 10;
      positions.setZ(i, wave);
      positions.setY(i, positions.getY(i) + Math.sin(x * 0.03) * 5);
    }
    ribbonGeo.computeVertexNormals();

    const ribbon = new THREE.Mesh(
      ribbonGeo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4 - r * 0.05,
        side: THREE.DoubleSide,
      })
    );
    ribbon.position.copy(center).setY(80 * scale + r * 15);
    ribbon.rotation.x = -0.3;
    ribbon.rotation.y = r * 0.2;
    group.add(ribbon);
  }

  return group;
}

export function spawnComet(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0x88ccff);

  // Comet head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(3 * scale, 16, 16),
    createStandardMaterial(0xffffff, { emissive: color, emissiveIntensity: 0.5 })
  );
  head.position.copy(center);
  group.add(head);

  // Inner glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(5 * scale, 16, 16),
    createGlowMaterial(color, 0.4)
  );
  glow.position.copy(center);
  group.add(glow);

  // Tail (particle trail)
  const tailLength = 80 * scale;
  const particleCount = 500;
  const tailGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    const spread = t * 15 * scale;
    positions[i * 3] = center.x - t * tailLength + randomInRange(-spread, spread);
    positions[i * 3 + 1] = center.y + randomInRange(-spread, spread);
    positions[i * 3 + 2] = center.z + randomInRange(-spread, spread);

    const c = color.clone();
    c.offsetHSL(0, 0, -t * 0.3);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  tailGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  tailGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const tail = new THREE.Points(
    tailGeo,
    new THREE.PointsMaterial({
      size: 1.5 * scale,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
    })
  );
  group.add(tail);

  return group;
}

export function spawnSkull(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0xf5f5dc);
  const mat = createStandardMaterial(color, { roughness: 0.8 });

  // Main skull
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(2 * scale, 16, 16),
    mat
  );
  skull.scale.set(1, 1.2, 1);
  skull.position.copy(center).setY(2 * scale);
  group.add(skull);

  // Eye sockets
  const eyeMat = createStandardMaterial(0x1a1a1a);
  for (let e = 0; e < 2; e++) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * scale, 8, 8),
      eyeMat
    );
    eye.position.set(
      center.x + (e === 0 ? -0.7 : 0.7) * scale,
      2.3 * scale,
      center.z + 1.5 * scale
    );
    group.add(eye);
  }

  // Jaw
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(1.5 * scale, 0.8 * scale, 1 * scale),
    mat
  );
  jaw.position.copy(center).add(new THREE.Vector3(0, 0.8 * scale, 0.5 * scale));
  group.add(jaw);

  // Glowing eyes (optional spooky effect)
  if (Math.random() > 0.5) {
    for (let e = 0; e < 2; e++) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 * scale, 8, 8),
        createGlowMaterial(0xff0000, 0.9)
      );
      glow.position.set(
        center.x + (e === 0 ? -0.7 : 0.7) * scale,
        2.3 * scale,
        center.z + 1.6 * scale
      );
      group.add(glow);
    }
  }

  return group;
}

export function spawnGeyser(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);

  // Ground opening
  const opening = new THREE.Mesh(
    new THREE.CircleGeometry(3 * scale, 32),
    createStandardMaterial(0x4a3728, { roughness: 0.9 })
  );
  opening.rotation.x = -Math.PI / 2;
  opening.position.copy(center).setY(0.1);
  group.add(opening);

  // Water pool
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2 * scale, 32),
    new THREE.MeshPhongMaterial({ color: 0x4aa8d4, transparent: true, opacity: 0.8 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(center).setY(0.15);
  group.add(pool);

  // Steam/water column
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1 * scale, 2 * scale, 25 * scale, 8, 1, true),
    createGlowMaterial(0xffffff, 0.3)
  );
  column.position.copy(center).setY(12.5 * scale);
  group.add(column);

  // Steam cloud at top
  for (let i = 0; i < 5; i++) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(randomInRange(3, 6) * scale, 8, 8),
      createGlowMaterial(0xffffff, 0.2)
    );
    cloud.position.copy(center).add(new THREE.Vector3(
      randomInRange(-5, 5) * scale,
      25 * scale + randomInRange(0, 10) * scale,
      randomInRange(-5, 5) * scale
    ));
    group.add(cloud);
  }

  // Water droplets
  const dropletCount = 150;
  const dropletGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(dropletCount * 3);
  for (let i = 0; i < dropletCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomInRange(0, 8) * scale;
    const height = randomInRange(5, 30) * scale;
    positions[i * 3] = center.x + Math.cos(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = center.z + Math.sin(angle) * radius;
  }
  dropletGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const droplets = new THREE.Points(
    dropletGeo,
    new THREE.PointsMaterial({ color: 0xaaddff, size: 0.8, transparent: true, opacity: 0.7 })
  );
  group.add(droplets);

  return group;
}

export function spawnNebula(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const baseColor = colorWithFallback(spec.color, 0x8844aa);

  // Multiple cloud layers
  for (let layer = 0; layer < 8; layer++) {
    const layerColor = baseColor.clone().offsetHSL(layer * 0.05, 0, layer * -0.03);
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(randomInRange(20, 50) * scale, 16, 16),
      new THREE.MeshBasicMaterial({
        color: layerColor,
        transparent: true,
        opacity: 0.15,
      })
    );
    cloud.position.copy(center).add(new THREE.Vector3(
      randomInRange(-30, 30) * scale,
      randomInRange(-20, 20) * scale,
      randomInRange(-30, 30) * scale
    ));
    cloud.scale.set(
      randomInRange(0.8, 1.5),
      randomInRange(0.5, 1),
      randomInRange(0.8, 1.5)
    );
    group.add(cloud);
  }

  // Stars within
  const starCount = 200;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = center.x + randomInRange(-60, 60) * scale;
    starPos[i * 3 + 1] = center.y + randomInRange(-40, 40) * scale;
    starPos[i * 3 + 2] = center.z + randomInRange(-60, 60) * scale;

    const starColor = new THREE.Color().setHSL(Math.random(), 0.5, 0.8);
    starColors[i * 3] = starColor.r;
    starColors[i * 3 + 1] = starColor.g;
    starColors[i * 3 + 2] = starColor.b;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ size: 1.5, vertexColors: true })
  );
  group.add(stars);

  return group;
}

// ========== INSTRUCTION-BASED SPAWNERS ==========

function spawnInstructionFromExisting(factory, center, spec = {}) {
  const object = factory(new THREE.Vector3(0, 0, 0), spec);
  const scale = specSizeToScale(spec.size, spec.scale);
  if (scale !== 1) {
    object.scale.setScalar(scale);
  }
  object.position.copy(center);
  return object;
}

export function spawnInstructionStructure(center, spec = {}) {
  return spawnInstructionFromExisting(spawnStructures, center, spec);
}

export function spawnInstructionTree(center, spec = {}) {
  const tree = createPalmTree(specSizeToScale(spec.size, spec.scale));
  tree.position.copy(center);
  return tree;
}

export function spawnInstructionWater(center, spec = {}) {
  const group = new THREE.Group();
  const radius = THREE.MathUtils.clamp(readNumber(spec.radius, spec.width || 16), 6, 220);
  const waterMat = new THREE.MeshPhongMaterial({
    color: colorWithFallback(spec.color, 0x58d8ec),
    transparent: true,
    opacity: 0.85,
    shininess: 90,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), waterMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.02;
  group.add(pool);
  group.position.copy(center);
  return group;
}

export function spawnInstructionOasis(center, spec = {}) {
  return spawnInstructionFromExisting(spawnOasis, center, spec);
}

export function spawnInstructionCrystal(center, spec = {}) {
  return spawnInstructionFromExisting(spawnCrystals, center, spec);
}

export function spawnInstructionPortal(center, spec = {}) {
  return spawnInstructionFromExisting(spawnPortals, center, spec);
}

export function spawnInstructionFireflies(center, spec = {}) {
  return spawnInstructionFromExisting(spawnFireflies, center, spec);
}

export function spawnInstructionTotem(center, spec = {}) {
  return spawnInstructionFromExisting(spawnTotems, center, spec);
}

export function spawnInstructionRock(center, spec = {}) {
  return spawnInstructionFromExisting(spawnRocks, center, spec);
}

export function spawnInstructionCacti(center, spec = {}) {
  return spawnInstructionFromExisting(spawnCacti, center, spec);
}

export function spawnInstructionRuins(center, spec = {}) {
  return spawnInstructionFromExisting(spawnRuins, center, spec);
}

export function spawnInstructionMirage(center, spec = {}) {
  return spawnInstructionFromExisting(spawnMirage, center, spec);
}

export function spawnInstructionNomads(center, spec = {}) {
  return spawnInstructionFromExisting(spawnNomads, center, spec);
}

export function spawnInstructionStorm(center, spec = {}) {
  return spawnInstructionFromExisting(spawnStorm, center, spec);
}

export function spawnInstructionDune(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const width = THREE.MathUtils.clamp(readNumber(spec.width, 60) * scale, 20, 260);
  const height = THREE.MathUtils.clamp(readNumber(spec.height, 12) * scale, 4, 60);
  const geometry = new THREE.CylinderGeometry(width, width * 0.4, height, 24, 1, true);
  geometry.rotateX(Math.PI / 2);
  const material = createStandardMaterial(colorWithFallback(spec.color, 0xe3c086), {
    flatShading: true,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const dune = new THREE.Mesh(geometry, material);
  dune.position.y = height * 0.25;
  group.add(dune);
  group.position.copy(center);
  return group;
}

export function spawnInstructionBridge(center, spec = {}) {
  const group = new THREE.Group();
  const length = THREE.MathUtils.clamp(readNumber(spec.length, 40), 20, 200);
  const width = THREE.MathUtils.clamp(readNumber(spec.width, 6), 3, 30);
  const color = colorWithFallback(spec.color, 0xcbb6a0);

  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(length, 1, width),
    createStandardMaterial(color, { roughness: 0.7, metalness: 0.15 })
  );
  walkway.castShadow = true;
  walkway.position.y = 3;
  group.add(walkway);

  // Supports
  for (let i = 0; i < 3; i++) {
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1, 6, 8),
      createStandardMaterial(color.clone().offsetHSL(0, 0, -0.1))
    );
    support.position.set(-length / 2 + (i + 0.5) * (length / 3), 0, 0);
    group.add(support);
  }

  group.position.copy(center);
  return group;
}

export function spawnInstructionMonolith(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const height = THREE.MathUtils.clamp(readNumber(spec.height, 30) * scale, 10, 200);
  const color = colorWithFallback(spec.color, 0x7078ff);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(2, height * 0.15), height, Math.max(2, height * 0.15)),
    createStandardMaterial(color, { emissive: color.clone().multiplyScalar(0.2), metalness: 0.6, roughness: 0.25 })
  );
  slab.castShadow = true;
  slab.position.y = height / 2;
  group.add(slab);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(3, height * 0.3), 0.25, 16, 40),
    createGlowMaterial(0xfff9c4, 0.8)
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height * 0.8;
  group.add(ring);

  group.position.copy(center);
  return group;
}

export function spawnInstructionFlora(center, spec = {}) {
  return spawnInstructionFromExisting(spawnFlora, center, spec);
}

export function spawnInstructionCreature(center, spec = {}) {
  return spawnInstructionFromExisting(spawnCreatures, center, spec);
}

export function spawnInstructionSentinel(center, spec = {}) {
  return spawnInstructionFromExisting(spawnSentinels, center, spec);
}

export function spawnInstructionMountain(center, spec = {}) {
  return spawnMountain(center, spec);
}

export function spawnInstructionTemple(center, spec = {}) {
  return spawnTemple(center, spec);
}

export function spawnInstructionPyramid(center, spec = {}) {
  return spawnPyramid(center, spec);
}

export function spawnInstructionStatue(center, spec = {}) {
  return spawnStatue(center, spec);
}

export function spawnInstructionWaterfall(center, spec = {}) {
  return spawnWaterfall(center, spec);
}

export function spawnInstructionAurora(center, spec = {}) {
  return spawnAurora(center, spec);
}

export function spawnInstructionComet(center, spec = {}) {
  return spawnComet(center, spec);
}

export function spawnInstructionSkull(center, spec = {}) {
  return spawnSkull(center, spec);
}

export function spawnInstructionGeyser(center, spec = {}) {
  return spawnGeyser(center, spec);
}

export function spawnInstructionNebula(center, spec = {}) {
  return spawnNebula(center, spec);
}

export function spawnInstructionCampfire(center, spec = {}) {
  const fire = createCampfire();
  fire.position.copy(center);
  const scale = specSizeToScale(spec.size, spec.scale);
  if (scale !== 1) fire.scale.setScalar(scale);
  return fire;
}

export function spawnInstructionTent(center, spec = {}) {
  const tent = createTent();
  tent.position.copy(center);
  const scale = specSizeToScale(spec.size, spec.scale);
  if (scale !== 1) tent.scale.setScalar(scale);
  return tent;
}

// ========== HUMAN FIGURES ==========

export function spawnHuman(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const skinColor = colorWithFallback(spec.color, 0xf5d0c5);
  const clothColor = new THREE.Color().setHSL(Math.random(), 0.6, 0.4);

  // Body
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.35, 1.2, 8),
    createStandardMaterial(clothColor)
  );
  torso.position.y = 1.4;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    createStandardMaterial(skinColor)
  );
  head.position.y = 2.2;
  head.castShadow = true;
  group.add(head);

  // Hair
  const hairColor = new THREE.Color().setHSL(Math.random() * 0.1, 0.5, 0.2);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    createStandardMaterial(hairColor)
  );
  hair.position.y = 2.3;
  group.add(hair);

  // Arms
  for (let side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.06, 0.8, 6),
      createStandardMaterial(skinColor)
    );
    arm.position.set(side * 0.5, 1.5, 0);
    arm.rotation.z = side * 0.2;
    group.add(arm);

    // Hands
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      createStandardMaterial(skinColor)
    );
    hand.position.set(side * 0.6, 1.1, 0);
    group.add(hand);
  }

  // Legs
  for (let side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 1, 8),
      createStandardMaterial(clothColor.clone().multiplyScalar(0.7))
    );
    leg.position.set(side * 0.15, 0.5, 0);
    leg.castShadow = true;
    group.add(leg);

    // Feet
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.08, 0.25),
      createStandardMaterial(0x3d3d3d)
    );
    foot.position.set(side * 0.15, 0.04, 0.05);
    group.add(foot);
  }

  group.scale.setScalar(scale);
  group.position.copy(center);
  return group;
}

export function spawnInstructionHuman(center, spec = {}) {
  return spawnHuman(center, spec);
}

// ========== ANIMALS ==========

export function spawnBird(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0x4488ff);

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    createStandardMaterial(color)
  );
  body.scale.set(1, 0.8, 1.5);
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    createStandardMaterial(color)
  );
  head.position.set(0, 0.2, 0.35);
  group.add(head);

  // Beak
  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.2, 6),
    createStandardMaterial(0xffa500)
  );
  beak.position.set(0, 0.15, 0.5);
  beak.rotation.x = Math.PI / 2;
  group.add(beak);

  // Wings
  for (let side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.05, 0.3),
      createStandardMaterial(color.clone().multiplyScalar(0.8))
    );
    wing.position.set(side * 0.4, 0.1, 0);
    wing.rotation.z = side * 0.3;
    // Animation data
    wing.userData = {
      animated: true,
      animationType: "sway",
      swaySpeed: 4,
      swayAmount: 0.4,
      phase: Math.random() * Math.PI * 2,
      baseRotation: { x: 0, y: 0, z: side * 0.3 },
    };
    group.add(wing);
  }

  // Tail
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.3, 6),
    createStandardMaterial(color)
  );
  tail.position.set(0, 0, -0.4);
  tail.rotation.x = -Math.PI / 4;
  group.add(tail);

  group.scale.setScalar(scale * 2);
  group.position.copy(center);
  group.position.y += 5 + Math.random() * 10; // Flying height
  return group;
}

export function spawnFish(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0x00aaff);

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 12, 12),
    createStandardMaterial(color, { metalness: 0.3, roughness: 0.4 })
  );
  body.scale.set(0.6, 0.8, 1.5);
  group.add(body);

  // Tail fin
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.4, 4),
    createStandardMaterial(color.clone().multiplyScalar(0.8))
  );
  tail.position.set(0, 0, -0.5);
  tail.rotation.x = Math.PI / 2;
  tail.rotation.z = Math.PI / 4;
  group.add(tail);

  // Dorsal fin
  const dorsal = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.3, 4),
    createStandardMaterial(color)
  );
  dorsal.position.set(0, 0.3, 0);
  group.add(dorsal);

  // Eyes
  for (let side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      createStandardMaterial(0xffffff)
    );
    eye.position.set(side * 0.15, 0.1, 0.3);
    group.add(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      createStandardMaterial(0x000000)
    );
    pupil.position.set(side * 0.18, 0.1, 0.32);
    group.add(pupil);
  }

  group.scale.setScalar(scale);
  group.position.copy(center);
  group.position.y = 0.5; // In water level
  return group;
}

export function spawnDeer(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0xc4a574);

  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.45, 1.8, 8),
    createStandardMaterial(color)
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8),
    createStandardMaterial(color)
  );
  neck.position.set(0.7, 1.6, 0);
  neck.rotation.z = -0.5;
  group.add(neck);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 12),
    createStandardMaterial(color)
  );
  head.scale.set(0.8, 1, 1.2);
  head.position.set(1.1, 2, 0);
  group.add(head);

  // Snout
  const snout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8),
    createStandardMaterial(color.clone().multiplyScalar(0.9))
  );
  snout.position.set(1.3, 1.9, 0);
  snout.rotation.z = Math.PI / 2;
  group.add(snout);

  // Antlers
  for (let side of [-1, 1]) {
    const antler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.5, 6),
      createStandardMaterial(0x8b7355)
    );
    antler.position.set(1, 2.3, side * 0.15);
    antler.rotation.z = side * 0.3;
    group.add(antler);

    // Antler branch
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.25, 6),
      createStandardMaterial(0x8b7355)
    );
    branch.position.set(0.9, 2.5, side * 0.25);
    branch.rotation.z = side * 0.8;
    group.add(branch);
  }

  // Legs
  const legPositions = [
    { x: 0.6, z: 0.2 }, { x: 0.6, z: -0.2 },
    { x: -0.6, z: 0.2 }, { x: -0.6, z: -0.2 }
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 1, 6),
      createStandardMaterial(color)
    );
    leg.position.set(pos.x, 0.5, pos.z);
    leg.castShadow = true;
    group.add(leg);

    // Hoof
    const hoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6),
      createStandardMaterial(0x3d3d3d)
    );
    hoof.position.set(pos.x, 0.05, pos.z);
    group.add(hoof);
  }

  // Tail
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.2, 6),
    createStandardMaterial(0xffffff)
  );
  tail.position.set(-0.9, 1.3, 0);
  tail.rotation.z = -0.5;
  group.add(tail);

  group.scale.setScalar(scale * 1.5);
  group.position.copy(center);
  return group;
}

export function spawnWolf(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0x666666);

  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.35, 1.5, 8),
    createStandardMaterial(color)
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    createStandardMaterial(color)
  );
  head.scale.set(0.9, 1, 1.3);
  head.position.set(0.9, 1, 0);
  group.add(head);

  // Snout
  const snout = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.4, 8),
    createStandardMaterial(color.clone().multiplyScalar(0.9))
  );
  snout.position.set(1.2, 0.95, 0);
  snout.rotation.z = Math.PI / 2;
  group.add(snout);

  // Ears
  for (let side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 4),
      createStandardMaterial(color)
    );
    ear.position.set(0.8, 1.25, side * 0.15);
    group.add(ear);
  }

  // Legs
  const legPositions = [
    { x: 0.5, z: 0.15 }, { x: 0.5, z: -0.15 },
    { x: -0.5, z: 0.15 }, { x: -0.5, z: -0.15 }
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, 0.7, 6),
      createStandardMaterial(color)
    );
    leg.position.set(pos.x, 0.35, pos.z);
    group.add(leg);
  }

  // Tail
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.03, 0.6, 6),
    createStandardMaterial(color)
  );
  tail.position.set(-0.9, 0.9, 0);
  tail.rotation.z = -0.8;
  group.add(tail);

  group.scale.setScalar(scale * 1.2);
  group.position.copy(center);
  return group;
}

export function spawnHorse(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const color = colorWithFallback(spec.color, 0x8b4513);

  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.55, 2, 8),
    createStandardMaterial(color)
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.5;
  body.castShadow = true;
  group.add(body);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1, 8),
    createStandardMaterial(color)
  );
  neck.position.set(0.9, 2.1, 0);
  neck.rotation.z = -0.6;
  group.add(neck);

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.3, 0.25),
    createStandardMaterial(color)
  );
  head.position.set(1.4, 2.5, 0);
  head.rotation.z = -0.2;
  group.add(head);

  // Ears
  for (let side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.15, 4),
      createStandardMaterial(color)
    );
    ear.position.set(1.2, 2.75, side * 0.1);
    group.add(ear);
  }

  // Mane
  const mane = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.3, 0.05),
    createStandardMaterial(0x2d2d2d)
  );
  mane.position.set(0.7, 2.3, 0);
  mane.rotation.z = -0.4;
  group.add(mane);

  // Legs
  const legPositions = [
    { x: 0.7, z: 0.25 }, { x: 0.7, z: -0.25 },
    { x: -0.7, z: 0.25 }, { x: -0.7, z: -0.25 }
  ];
  for (const pos of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.06, 1.3, 6),
      createStandardMaterial(color)
    );
    leg.position.set(pos.x, 0.65, pos.z);
    leg.castShadow = true;
    group.add(leg);

    // Hoof
    const hoof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.1, 6),
      createStandardMaterial(0x2d2d2d)
    );
    hoof.position.set(pos.x, 0.05, pos.z);
    group.add(hoof);
  }

  // Tail
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.02, 0.8, 6),
    createStandardMaterial(0x2d2d2d)
  );
  tail.position.set(-1.1, 1.3, 0);
  tail.rotation.z = -1;
  group.add(tail);

  group.scale.setScalar(scale * 1.5);
  group.position.copy(center);
  return group;
}

export function spawnInstructionBird(center, spec = {}) {
  return spawnBird(center, spec);
}

export function spawnInstructionFish(center, spec = {}) {
  return spawnFish(center, spec);
}

export function spawnInstructionDeer(center, spec = {}) {
  return spawnDeer(center, spec);
}

export function spawnInstructionWolf(center, spec = {}) {
  return spawnWolf(center, spec);
}

export function spawnInstructionHorse(center, spec = {}) {
  return spawnHorse(center, spec);
}

// ========== IMPROVED WATER BODIES ==========

export function spawnRiver(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const length = readNumber(spec.width, 50) * scale;
  const width = readNumber(spec.height, 8) * scale;

  // River bed
  const bedGeo = new THREE.PlaneGeometry(length, width, 20, 4);
  const bedPos = bedGeo.attributes.position;
  for (let i = 0; i < bedPos.count; i++) {
    bedPos.setZ(i, (Math.random() - 0.5) * 0.3);
  }
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, createStandardMaterial(0x5d4e37, { roughness: 1 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -0.3;
  group.add(bed);

  // Water surface
  const waterGeo = new THREE.PlaneGeometry(length, width, 30, 6);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x3399ff,
    transparent: true,
    opacity: 0.7,
    shininess: 100,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.1;
  water.userData = {
    animated: true,
    animationType: "float",
    baseY: 0.1,
    floatSpeed: 2,
    floatAmount: 0.05,
    phase: 0,
  };
  group.add(water);

  // Foam/ripples
  for (let i = 0; i < 8; i++) {
    const foam = new THREE.Mesh(
      new THREE.CircleGeometry(0.5 + Math.random() * 0.5, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
    );
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(
      (Math.random() - 0.5) * length * 0.8,
      0.15,
      (Math.random() - 0.5) * width * 0.6
    );
    group.add(foam);
  }

  group.position.copy(center);
  return group;
}

export function spawnLake(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const radius = readNumber(spec.radius, 20) * scale;

  // Lake bed
  const bed = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 1.1, 32),
    createStandardMaterial(0x4a3f2f, { roughness: 1 })
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = -0.5;
  group.add(bed);

  // Water surface
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x2288cc,
    transparent: true,
    opacity: 0.75,
    shininess: 120,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    waterMat
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.05;
  group.add(water);

  // Shore
  const shore = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 2, 48),
    createStandardMaterial(0xc9a86c, { roughness: 0.9 })
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = 0.02;
  group.add(shore);

  // Water lilies
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.7;
    const lily = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 8),
      createStandardMaterial(0x228b22)
    );
    lily.rotation.x = -Math.PI / 2;
    lily.position.set(Math.cos(angle) * dist, 0.1, Math.sin(angle) * dist);
    group.add(lily);

    // Flower
    if (Math.random() > 0.5) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        createStandardMaterial(0xff69b4)
      );
      flower.position.copy(lily.position);
      flower.position.y = 0.2;
      group.add(flower);
    }
  }

  group.position.copy(center);
  return group;
}

export function spawnSea(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const size = readNumber(spec.width, 100) * scale;

  // Sea floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size, 10, 10),
    createStandardMaterial(0x2f4f4f, { roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2;
  group.add(floor);

  // Water surface with waves
  const waterGeo = new THREE.PlaneGeometry(size, size, 40, 40);
  const waterPos = waterGeo.attributes.position;
  for (let i = 0; i < waterPos.count; i++) {
    const x = waterPos.getX(i);
    const y = waterPos.getY(i);
    waterPos.setZ(i, Math.sin(x * 0.1) * 0.5 + Math.cos(y * 0.08) * 0.4);
  }
  waterGeo.computeVertexNormals();

  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x006994,
    transparent: true,
    opacity: 0.8,
    shininess: 100,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  group.add(water);

  // Waves/foam at edges
  for (let i = 0; i < 20; i++) {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(1 + Math.random(), 0.2, 8, 16, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
    );
    const angle = (i / 20) * Math.PI * 2;
    wave.position.set(
      Math.cos(angle) * size * 0.45,
      0.2,
      Math.sin(angle) * size * 0.45
    );
    wave.rotation.x = -Math.PI / 2;
    wave.rotation.z = angle;
    group.add(wave);
  }

  group.position.copy(center);
  return group;
}

export function spawnInstructionRiver(center, spec = {}) {
  return spawnRiver(center, spec);
}

export function spawnInstructionLake(center, spec = {}) {
  return spawnLake(center, spec);
}

export function spawnInstructionSea(center, spec = {}) {
  return spawnSea(center, spec);
}

// ========== ENTITY SPAWNERS MAPPING ==========

export const ENTITY_SPAWNERS = {
  structure: spawnInstructionStructure,
  tower: spawnInstructionStructure,
  tree: spawnInstructionTree,
  oasis: spawnInstructionOasis,
  water: spawnInstructionWater,
  crystal: spawnInstructionCrystal,
  portal: spawnInstructionPortal,
  fireflies: spawnInstructionFireflies,
  totem: spawnInstructionTotem,
  rock: spawnInstructionRock,
  dune: spawnInstructionDune,
  bridge: spawnInstructionBridge,
  monolith: spawnInstructionMonolith,
  flora: spawnInstructionFlora,
  creature: spawnInstructionCreature,
  sentinel: spawnInstructionSentinel,
  cacti: spawnInstructionCacti,
  ruins: spawnInstructionRuins,
  mirage: spawnInstructionMirage,
  nomad: spawnInstructionNomads,
  storm: spawnInstructionStorm,
  // New types
  mountain: spawnInstructionMountain,
  temple: spawnInstructionTemple,
  pyramid: spawnInstructionPyramid,
  statue: spawnInstructionStatue,
  waterfall: spawnInstructionWaterfall,
  aurora: spawnInstructionAurora,
  comet: spawnInstructionComet,
  skull: spawnInstructionSkull,
  bones: spawnInstructionSkull,
  geyser: spawnInstructionGeyser,
  nebula: spawnInstructionNebula,
  campfire: spawnInstructionCampfire,
  tent: spawnInstructionTent,
  // Aliases
  river: spawnInstructionWater,
  pond: spawnInstructionWater,
  stream: spawnInstructionWater,
  lake: spawnInstructionWater,
  cave: spawnInstructionRuins,
  hot_spring: spawnInstructionGeyser,
  meteor: spawnInstructionComet,
  star_field: spawnInstructionNebula,
  fossil: spawnInstructionSkull,
  palm: spawnInstructionTree,
  bush: spawnInstructionFlora,
  flower: spawnInstructionFlora,
  mushroom: spawnInstructionFlora,
  grass: spawnInstructionFlora,
  vine: spawnInstructionFlora,
  boulder: spawnInstructionRock,
  cliff: spawnInstructionMountain,
  mesa: spawnInstructionMountain,
  canyon: spawnInstructionMountain,
  arch: spawnInstructionRuins,
  pillar: spawnInstructionMonolith,
  well: spawnInstructionOasis,
  wagon: spawnInstructionNomads,
  lightning: spawnInstructionStorm,
  dust_devil: spawnInstructionStorm,
  rainbow: spawnInstructionAurora,
  moon: spawnInstructionMirage,
  sun_disk: spawnInstructionMirage,
  wormhole: spawnInstructionPortal,
  black_hole: spawnInstructionPortal,
  gem: spawnInstructionCrystal,
  dead_tree: spawnInstructionTree,
  log: spawnInstructionRock,
  pebbles: spawnInstructionRock,
  sand_ripple: spawnInstructionDune,
  crater: spawnInstructionRuins,
  ravine: spawnInstructionMountain,
  smoke: spawnInstructionGeyser,
  // Human forms
  human: spawnInstructionHuman,
  person: spawnInstructionHuman,
  figure: spawnInstructionHuman,
  man: spawnInstructionHuman,
  woman: spawnInstructionHuman,
  // Animals
  bird: spawnInstructionBird,
  eagle: spawnInstructionBird,
  hawk: spawnInstructionBird,
  fish: spawnInstructionFish,
  deer: spawnInstructionDeer,
  wolf: spawnInstructionWolf,
  dog: spawnInstructionWolf,
  horse: spawnInstructionHorse,
  animal: spawnInstructionDeer,
  // Water bodies (new detailed versions)
  river_detailed: spawnInstructionRiver,
  lake_detailed: spawnInstructionLake,
  sea: spawnInstructionSea,
  ocean: spawnInstructionSea,
};

// Tag spawner mapping
export const TAG_SPAWNERS = {
  cacti: spawnCacti,
  rocks: spawnRocks,
  oasis: spawnOasis,
  ruins: spawnRuins,
  crystals: spawnCrystals,
  mirage: spawnMirage,
  fireflies: spawnFireflies,
  totems: spawnTotems,
  creatures: spawnCreatures,
  nomads: spawnNomads,
  structures: spawnStructures,
  storm: spawnStorm,
  flora: spawnFlora,
  portals: spawnPortals,
  sentinels: spawnSentinels,
};
