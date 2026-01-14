/**
 * World module for UniversoDu
 * Handles Three.js scene, rendering, controls, and object management
 */

import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { createSpatialTrack } from "./audio.js";
import { WORLD_CONFIG, DAY_STAGES } from "./constants.js";
import {
  getDuneMaterial,
  getDustMaterial,
  getSkyMaterial,
  getPriestBaseMaterial,
  getPriestRuneMaterial,
  getPriestRobeMaterial,
  getPriestSashMaterial,
  getPriestHeadMaterial,
  getPriestStaffMaterial,
  getPriestHaloMaterial,
  getPriestFlameMaterial,
  getPriestOrbMaterial,
  disposeMaterialCache,
  getCloudMaterial,
  getSunDiskMaterial,
} from "./materials.js";
import {
  tagLabel,
  TAG_SPAWNERS,
  ENTITY_SPAWNERS,
  spawnMirage,
} from "./spawners.js";

const { MAX_PROMPT_OBJECTS, WALK_SPEED, CAMERA_HEIGHT, TERRAIN_SIZE, DUST_PARTICLE_COUNT } = WORLD_CONFIG;

const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";

const PRIEST_TRACK_URL =
  (typeof window !== "undefined" && window.UNIVERSODU_PRIEST_TRACK) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRIEST_TRACK) ||
  withBasePath("/music/sacerdote-theme.mp3");

function withBasePath(assetPath) {
  if (!assetPath) return assetPath;
  if (assetPath.startsWith("http://") || assetPath.startsWith("https://") || assetPath.startsWith("//")) {
    return assetPath;
  }
  const cleanedBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const normalized = assetPath.startsWith("/") || !cleanedBase ? assetPath : `/${assetPath}`;
  return `${cleanedBase}${normalized}`;
}

export { tagLabel };

export function createWorld(canvas, { onPointerLockChange, onPointerLockError }) {
  // Renderer setup
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Azul cielo claro
  scene.fog = new THREE.FogExp2(0xc9b896, 0.0005); // Niebla más suave y menos densa

  // Camera setup
  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    2000
  );
  camera.position.set(0, CAMERA_HEIGHT, 8);

  // Controls
  const controls = new PointerLockControls(camera, document.body);
  controls.addEventListener("lock", () => {
    onPointerLockChange?.(true);
  });
  controls.addEventListener("unlock", () => {
    onPointerLockChange?.(false);
  });

  // Lighting
  const ambient = new THREE.AmbientLight(0xfef1d8, 0.45);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe5b5, 1.35);
  sun.position.set(-80, 180, -90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0xf7f0ff, 0.2);
  rim.position.set(120, 60, 80);
  scene.add(rim);

  // Sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 32, 32),
    getSkyMaterial()
  );
  scene.add(sky);

  // Starfield
  const starfield = createStarfield();
  scene.add(starfield);

  // Moon
  const moon = createMoon();
  scene.add(moon);

  // Planets in the sky
  const planets = createPlanets();
  scene.add(planets);

  // Terrain - added first to ensure proper rendering
  const dunes = createDunes();
  scene.add(dunes);

  // Dust particles
  const dustLayer = createDust();
  scene.add(dustLayer.points);

  // Atmospheric effects (optional, added after terrain)
  const sunDisk = createSunDisk();
  scene.add(sunDisk);

  const clouds = createClouds();
  scene.add(clouds);

  // Priest shrine
  const priestShrine = createPriestShrine({
    scene,
    camera,
    trackUrl: PRIEST_TRACK_URL,
  });

  // Prompt objects management
  const promptGroup = new THREE.Group();
  scene.add(promptGroup);
  const promptObjects = [];

  // Animated objects tracking
  const animatedObjects = [];

  // Animation state
  const clock = new THREE.Clock();
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const keys = { forward: false, backward: false, left: false, right: false };
  const touchLook = { active: false, startX: 0, startY: 0 };

  // Visibility state for tab optimization
  let isTabVisible = true;
  let animationFrameId = null;

  // Event handlers with references for cleanup
  function handleKeyDown(event) {
    handleKey(event, true);
  }

  function handleKeyUp(event) {
    handleKey(event, false);
  }

  function handleKey(event, isPressed) {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        keys.forward = isPressed;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.backward = isPressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.left = isPressed;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = isPressed;
        break;
      default:
        break;
    }
  }

  function handleVisibilityChange() {
    isTabVisible = !document.hidden;
    if (isTabVisible && !animationFrameId) {
      clock.getDelta(); // Reset delta to avoid jump
      animate();
    }
  }

  function handleResize() {
    const { clientWidth, clientHeight } = canvas;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  }

  // Register event listeners
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", handleResize);

  // Touch controls
  const touchCleanupFns = bindTouchControls(keys, touchLook, controls, camera);

  function requestPointerLock() {
    try {
      priestShrine?.unlockAudio?.();
      controls.lock();
    } catch (error) {
      onPointerLockError?.("Pointer Lock no disponible en este navegador.");
    }
  }

  function updateMovement(delta) {
    velocity.x -= velocity.x * 4 * delta;
    velocity.z -= velocity.z * 4 * delta;

    direction.z = Number(keys.forward) - Number(keys.backward);
    direction.x = Number(keys.right) - Number(keys.left);
    direction.normalize();

    const joystickActive = keys.forward || keys.backward || keys.left || keys.right;
    if (controls.isLocked || joystickActive) {
      if (keys.forward || keys.backward) {
        velocity.z -= direction.z * WALK_SPEED * delta;
      }
      if (keys.left || keys.right) {
        velocity.x -= direction.x * WALK_SPEED * delta;
      }
      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);
    }

    camera.position.y = THREE.MathUtils.lerp(camera.position.y, CAMERA_HEIGHT, 0.1);
  }

  function animate() {
    // Stop animation if tab is hidden
    if (!isTabVisible) {
      animationFrameId = null;
      return;
    }

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = performance.now() * 0.001;
    updateDust(dustLayer, delta);
    updateClouds(clouds, delta, time);
    updateAnimatedObjects(animatedObjects, time);
    updateMovement(delta);
    priestShrine?.update?.();
    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
  }

  // Start animation
  animate();

  // Object registration with pool management
  function registerPromptObject(object) {
    promptObjects.push(object);
    promptGroup.add(object);

    // Scan for animated objects
    object.traverse?.((child) => {
      if (child.userData?.animated) {
        animatedObjects.push(child);
      }
    });

    if (promptObjects.length > MAX_PROMPT_OBJECTS) {
      const stale = promptObjects.shift();
      if (stale) {
        // Remove animated references
        stale.traverse?.((child) => {
          const idx = animatedObjects.indexOf(child);
          if (idx !== -1) animatedObjects.splice(idx, 1);
        });
        promptGroup.remove(stale);
        disposeObject(stale);
      }
    }
  }

  function randomAroundCamera(minDist = 40, maxDist = 140) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDist + Math.random() * (maxDist - minDist);
    const x = camera.position.x + Math.cos(angle) * distance;
    const z = camera.position.z + Math.sin(angle) * distance;
    return new THREE.Vector3(x, 0, z);
  }

  function clampInstructionQuantity(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return THREE.MathUtils.clamp(Math.round(num), 1, 8);
  }

  function specSizeToScale(sizeValue, explicitScale) {
    if (typeof explicitScale === "number" && Number.isFinite(explicitScale)) {
      return THREE.MathUtils.clamp(explicitScale, 0.4, 4);
    }
    if (typeof sizeValue === "string") {
      const value = sizeValue.toLowerCase();
      if (["tiny", "small", "pequeno", "pequeño"].includes(value)) return 0.7;
      if (["huge", "large", "gigantic", "enorme", "grand", "grande"].includes(value)) return 1.6;
      if (["colossal", "gigante"].includes(value)) return 2.2;
    }
    return 1;
  }

  function instructionDistanceRange(spec = {}) {
    const baseMin = 35;
    const baseMax = 160;
    const spread = Number(spec.spread);
    const sizeScale = specSizeToScale(spec.size, spec.scale);
    const min = THREE.MathUtils.clamp(
      baseMin * Math.max(0.5, Math.min(1.4, sizeScale)),
      20,
      240
    );
    const max = THREE.MathUtils.clamp(
      baseMax * Math.max(0.8, Math.min(1.6, sizeScale)) + (Number.isFinite(spread) ? spread : 0),
      min + 10,
      420
    );
    return [min, max];
  }

  function spawnHandlers(tag) {
    const spawner = TAG_SPAWNERS[tag];
    if (spawner) {
      const distanceRanges = {
        cacti: [40, 140],
        rocks: [50, 160],
        oasis: [30, 120],
        ruins: [80, 200],
        crystals: [60, 170],
        mirage: [70, 170],
        fireflies: [30, 80],
        totems: [60, 160],
        creatures: [20, 80],
        nomads: [40, 120],
        structures: [90, 200],
        storm: [60, 180],
        flora: [30, 110],
        portals: [70, 150],
        sentinels: [80, 160],
      };
      const [minDist, maxDist] = distanceRanges[tag] || [40, 140];
      registerPromptObject(spawner(randomAroundCamera(minDist, maxDist)));
    } else {
      registerPromptObject(spawnMirage(randomAroundCamera()));
    }
  }

  function spawnFromTags(tags) {
    tags.forEach((tag) => spawnHandlers(tag));
  }

  function spawnFromEntities(entities = []) {
    entities.forEach((entity) => {
      if (!entity || typeof entity !== "object") return;
      const type = typeof entity.type === "string" ? entity.type.toLowerCase() : "";
      const handler = ENTITY_SPAWNERS[type];
      if (!handler) return;
      const quantity = clampInstructionQuantity(entity.quantity);
      for (let i = 0; i < quantity; i += 1) {
        const [minDist, maxDist] = instructionDistanceRange(entity);
        const center = randomAroundCamera(minDist, maxDist);
        const object = handler(center, entity);
        if (object) {
          registerPromptObject(object);
        }
      }
    });
  }

  function applyPromptPlan(plan) {
    if (plan?.tags instanceof Set) {
      spawnFromTags(plan.tags);
    } else if (Array.isArray(plan?.tags)) {
      spawnFromTags(new Set(plan.tags));
    }
    if (Array.isArray(plan?.entities) && plan.entities.length) {
      spawnFromEntities(plan.entities);
    }
  }

  function setDayStage(stage) {
    const settings = DAY_STAGES[stage] || DAY_STAGES.amanecer;
    scene.background.set(settings.skyColor);
    scene.fog.color.set(settings.fogColor);
    scene.fog.density = settings.fogDensity;
    ambient.intensity = settings.ambientIntensity;
    sun.intensity = settings.sunIntensity;
    sun.color.set(settings.sunColor);
    sky.material.color.set(settings.skyColor);
  }

  // Cleanup function
  function dispose() {
    // Stop animation loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Remove event listeners
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("resize", handleResize);

    // Cleanup touch controls
    touchCleanupFns.forEach((fn) => fn());

    // Dispose prompt objects
    promptObjects.forEach((obj) => disposeObject(obj));
    promptObjects.length = 0;

    // Dispose scene objects
    scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose?.());
        } else {
          child.material.dispose?.();
        }
      }
    });

    // Dispose material cache
    disposeMaterialCache();

    // Dispose renderer
    renderer.dispose();
  }

  // Initial landscape
  spawnFromTags(new Set(["rocks", "cacti", "mirage"]));

  return {
    requestPointerLock,
    spawnFromTags,
    spawnFromEntities,
    applyPromptPlan,
    resize: handleResize,
    setDayStage,
    dispose,
  };
}

// ========== Helper Functions ==========

function createDunes() {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 200, 200);
  const position = geometry.attributes.position;

  // Simple dune noise
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const noise =
      Math.sin(x * 0.004) * 2 +
      Math.cos(y * 0.003) * 1.9 +
      Math.sin(x * 0.012 + y * 0.008) * 0.8 +
      (Math.random() - 0.5) * 0.3;
    position.setZ(i, noise);
  }

  geometry.computeVertexNormals();

  // Create material directly to ensure it works
  const material = new THREE.MeshStandardMaterial({
    color: 0xd4a56a,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.receiveShadow = true;
  return mesh;
}

function createPlanets() {
  const group = new THREE.Group();

  // Red planet with craters texture effect
  const redPlanet = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff4444,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x331111,
    })
  );
  redPlanet.position.set(-300, 400, -600);
  group.add(redPlanet);

  // Red planet glow
  const redGlow = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.3 })
  );
  redGlow.position.copy(redPlanet.position);
  group.add(redGlow);

  // Blue planet (gas giant with rings)
  const bluePlanet = new THREE.Mesh(
    new THREE.SphereGeometry(55, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0x112244,
    })
  );
  bluePlanet.position.set(400, 350, -500);
  group.add(bluePlanet);

  // Blue planet rings (like Saturn)
  const ringGeometry = new THREE.RingGeometry(70, 110, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const rings = new THREE.Mesh(ringGeometry, ringMaterial);
  rings.position.copy(bluePlanet.position);
  rings.rotation.x = Math.PI / 2.5;
  rings.rotation.y = 0.3;
  group.add(rings);

  // Blue planet glow
  const blueGlow = new THREE.Mesh(
    new THREE.SphereGeometry(65, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.2 })
  );
  blueGlow.position.copy(bluePlanet.position);
  group.add(blueGlow);

  // Green planet
  const greenPlanet = new THREE.Mesh(
    new THREE.SphereGeometry(35, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x113311,
    })
  );
  greenPlanet.position.set(100, 500, -700);
  group.add(greenPlanet);

  // Green planet glow
  const greenGlow = new THREE.Mesh(
    new THREE.SphereGeometry(45, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x66ff66, transparent: true, opacity: 0.25 })
  );
  greenGlow.position.copy(greenPlanet.position);
  group.add(greenGlow);

  return group;
}

function createStarfield() {
  const starsCount = 2000;
  const positions = new Float32Array(starsCount * 3);
  const colors = new Float32Array(starsCount * 3);
  const sizes = new Float32Array(starsCount);

  for (let i = 0; i < starsCount; i++) {
    // Distribute stars on a large sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 900 + Math.random() * 200;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 50; // Only above horizon
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    // Varying star colors (white, blue-white, yellow)
    const colorChoice = Math.random();
    if (colorChoice < 0.7) {
      colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1; // White
    } else if (colorChoice < 0.85) {
      colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1; // Blue-white
    } else {
      colors[i * 3] = 1; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.8; // Yellow
    }

    sizes[i] = 1 + Math.random() * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  return new THREE.Points(geometry, material);
}

function createMoon() {
  const group = new THREE.Group();

  // Moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xe8e8e0,
      roughness: 0.9,
      metalness: 0,
      emissive: 0x222222,
    })
  );
  moon.position.set(-500, 300, -400);
  group.add(moon);

  // Moon glow
  const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.15,
    })
  );
  moonGlow.position.copy(moon.position);
  group.add(moonGlow);

  return group;
}

function createSunDisk() {
  const group = new THREE.Group();

  // Main sun disk
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    getSunDiskMaterial()
  );
  sun.position.set(-400, 600, -800);
  sun.lookAt(0, 0, 0);
  group.add(sun);

  // Sun glow
  const glowMat = getSunDiskMaterial().clone();
  glowMat.opacity = 0.3;
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(120, 32),
    glowMat
  );
  glow.position.copy(sun.position);
  glow.lookAt(0, 0, 0);
  group.add(glow);

  // Outer haze
  const hazeMat = getSunDiskMaterial().clone();
  hazeMat.opacity = 0.12;
  const haze = new THREE.Mesh(
    new THREE.CircleGeometry(200, 32),
    hazeMat
  );
  haze.position.copy(sun.position);
  haze.lookAt(0, 0, 0);
  group.add(haze);

  return group;
}

function createSunRays() {
  const group = new THREE.Group();
  const rayCount = 8;

  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const length = 300 + Math.random() * 200;
    const width = 15 + Math.random() * 25;

    const rayGeo = new THREE.PlaneGeometry(width, length);
    const ray = new THREE.Mesh(rayGeo, getSunRayMaterial());

    ray.position.set(
      -400 + Math.cos(angle) * 100,
      600 + Math.sin(angle) * 50,
      -800
    );
    ray.rotation.z = angle;
    ray.lookAt(0, 300, 0);

    group.add(ray);
  }

  return group;
}

function updateSunRays(rays, time) {
  rays.children.forEach((ray, i) => {
    ray.material.opacity = 0.08 + Math.sin(time * 0.5 + i * 0.8) * 0.04;
  });
}

function createClouds() {
  const group = new THREE.Group();
  const cloudCount = 25;

  for (let i = 0; i < cloudCount; i++) {
    const cloud = createSingleCloud();
    const angle = Math.random() * Math.PI * 2;
    const distance = 300 + Math.random() * 600;

    cloud.position.set(
      Math.cos(angle) * distance,
      180 + Math.random() * 120,
      Math.sin(angle) * distance
    );
    cloud.rotation.y = Math.random() * Math.PI;
    cloud.userData.speed = 0.5 + Math.random() * 1.5;
    cloud.userData.angle = angle;
    cloud.userData.distance = distance;

    group.add(cloud);
  }

  return group;
}

function createSingleCloud() {
  const cloud = new THREE.Group();
  const puffCount = 4 + Math.floor(Math.random() * 4);

  for (let i = 0; i < puffCount; i++) {
    const size = 20 + Math.random() * 40;
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      getCloudMaterial()
    );
    puff.position.set(
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 40
    );
    puff.scale.y = 0.4 + Math.random() * 0.3;
    cloud.add(puff);
  }

  return cloud;
}

function updateClouds(clouds, delta, time) {
  clouds.children.forEach((cloud) => {
    cloud.userData.angle += delta * 0.002 * cloud.userData.speed;
    cloud.position.x = Math.cos(cloud.userData.angle) * cloud.userData.distance;
    cloud.position.z = Math.sin(cloud.userData.angle) * cloud.userData.distance;

    // Gentle bobbing
    cloud.position.y += Math.sin(time * 0.3 + cloud.userData.angle) * 0.02;
  });
}

function createHeatWaves() {
  const group = new THREE.Group();
  const waveCount = 12;

  for (let i = 0; i < waveCount; i++) {
    const width = 80 + Math.random() * 120;
    const wave = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 8),
      getHeatWaveMaterial()
    );

    const angle = (i / waveCount) * Math.PI * 2;
    const distance = 60 + Math.random() * 100;

    wave.position.set(
      Math.cos(angle) * distance,
      2 + Math.random() * 3,
      Math.sin(angle) * distance
    );
    wave.rotation.x = -Math.PI / 2 + 0.1;
    wave.userData.baseY = wave.position.y;
    wave.userData.phase = Math.random() * Math.PI * 2;

    group.add(wave);
  }

  return group;
}

function updateHeatWaves(waves, time) {
  waves.children.forEach((wave) => {
    wave.position.y = wave.userData.baseY + Math.sin(time * 2 + wave.userData.phase) * 0.5;
    wave.material.opacity = 0.05 + Math.sin(time * 3 + wave.userData.phase) * 0.03;
    wave.scale.x = 1 + Math.sin(time * 1.5 + wave.userData.phase) * 0.1;
  });
}

function updateAnimatedObjects(objects, time) {
  for (const obj of objects) {
    const anim = obj.userData;
    if (!anim.animated) continue;

    switch (anim.animationType) {
      case "sway": {
        // Gentle swaying for vegetation
        const baseRotation = anim.baseRotation || { x: 0, y: 0, z: 0 };
        const speed = anim.swaySpeed || 1;
        const amount = anim.swayAmount || 0.1;
        const phase = anim.phase || 0;
        obj.rotation.x = baseRotation.x + Math.sin(time * speed + phase) * amount;
        obj.rotation.z = baseRotation.z + Math.cos(time * speed * 0.8 + phase) * amount * 0.6;
        break;
      }
      case "float": {
        // Floating up and down
        const baseY = anim.baseY || obj.position.y;
        const floatSpeed = anim.floatSpeed || 1;
        const floatAmount = anim.floatAmount || 0.5;
        const phase = anim.phase || 0;
        obj.position.y = baseY + Math.sin(time * floatSpeed + phase) * floatAmount;
        break;
      }
      case "rotate": {
        // Continuous rotation
        const rotateSpeed = anim.rotateSpeed || 1;
        obj.rotation.y += 0.016 * rotateSpeed;
        break;
      }
      case "pulse": {
        // Scale pulsing
        const baseScale = anim.baseScale || 1;
        const pulseSpeed = anim.pulseSpeed || 1;
        const pulseAmount = anim.pulseAmount || 0.1;
        const phase = anim.phase || 0;
        const s = baseScale + Math.sin(time * pulseSpeed + phase) * pulseAmount;
        obj.scale.set(s, s, s);
        break;
      }
      case "flicker": {
        // Opacity flicker for flames/lights
        if (obj.material) {
          const baseOpacity = anim.baseOpacity || 0.7;
          const flickerAmount = anim.flickerAmount || 0.2;
          obj.material.opacity = baseOpacity + Math.sin(time * 8 + Math.random() * 0.5) * flickerAmount;
        }
        break;
      }
      case "bob": {
        // Bobbing motion (different from float, more bouncy)
        const baseY = anim.baseY || obj.position.y;
        const bobSpeed = anim.bobSpeed || 2;
        const bobAmount = anim.bobAmount || 0.3;
        const phase = anim.phase || 0;
        obj.position.y = baseY + Math.abs(Math.sin(time * bobSpeed + phase)) * bobAmount;
        break;
      }
      default:
        break;
    }
  }
}

function createDust() {
  const positions = new Float32Array(DUST_PARTICLE_COUNT * 3);
  const speeds = new Float32Array(DUST_PARTICLE_COUNT);
  for (let i = 0; i < DUST_PARTICLE_COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 1200;
    positions[i * 3 + 1] = Math.random() * 90 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1200;
    speeds[i] = Math.random() * 0.2 + 0.05;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, getDustMaterial());
  points.renderOrder = 2;
  return { points, positions, speeds };
}

function updateDust(layer, delta) {
  const positions = layer.positions;
  const speeds = layer.speeds;
  for (let i = 0; i < positions.length / 3; i += 1) {
    positions[i * 3 + 1] += Math.sin(delta + i * 0.02) * 0.04 + speeds[i] * 0.08;
    if (positions[i * 3 + 1] > 140) {
      positions[i * 3 + 1] = 5;
    }
  }
  layer.points.rotation.y += delta * 0.01;
  layer.points.geometry.attributes.position.needsUpdate = true;
}

function disposeObject(obj) {
  obj.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat.dispose?.());
      } else {
        child.material.dispose?.();
      }
    }
  });
}

function bindTouchControls(keys, touchLook, controls, camera) {
  const cleanupFns = [];
  const joystick = document.getElementById("joystick");
  const joystickThumb = document.getElementById("joystick-thumb");
  const lookZone = document.getElementById("look-zone");

  if (joystick && joystickThumb) {
    const handleMove = (clientX, clientY) => {
      const rect = joystick.getBoundingClientRect();
      const relX = clientX - (rect.left + rect.width / 2);
      const relY = clientY - (rect.top + rect.height / 2);
      const maxRadius = rect.width / 2;
      const distance = Math.min(Math.sqrt(relX * relX + relY * relY), maxRadius);
      const angle = Math.atan2(relY, relX);
      joystickThumb.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      const normalizedX = distance ? Math.cos(angle) * (distance / maxRadius) : 0;
      const normalizedY = distance ? Math.sin(angle) * (distance / maxRadius) : 0;
      keys.forward = normalizedY < -0.2;
      keys.backward = normalizedY > 0.2;
      keys.left = normalizedX < -0.2;
      keys.right = normalizedX > 0.2;
    };

    const resetThumb = () => {
      joystickThumb.style.transform = "translate(0,0)";
      keys.forward = keys.backward = keys.left = keys.right = false;
    };

    const onTouchStart = (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchMove = (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      resetThumb();
    };

    joystick.addEventListener("touchstart", onTouchStart, { passive: false });
    joystick.addEventListener("touchmove", onTouchMove, { passive: false });
    joystick.addEventListener("touchend", onTouchEnd);

    cleanupFns.push(
      () => joystick.removeEventListener("touchstart", onTouchStart),
      () => joystick.removeEventListener("touchmove", onTouchMove),
      () => joystick.removeEventListener("touchend", onTouchEnd)
    );
  }

  if (lookZone) {
    const onLookStart = (event) => {
      const touch = event.touches[0];
      touchLook.active = true;
      touchLook.startX = touch.clientX;
      touchLook.startY = touch.clientY;
    };

    const onLookMove = (event) => {
      if (!touchLook.active) return;
      const touch = event.touches[0];
      const deltaX = touch.clientX - touchLook.startX;
      const deltaY = touch.clientY - touchLook.startY;
      touchLook.startX = touch.clientX;
      touchLook.startY = touch.clientY;
      controls.getObject().rotation.y -= deltaX * 0.003;
      camera.rotation.x -= deltaY * 0.002;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    };

    const onLookEnd = () => {
      touchLook.active = false;
    };

    lookZone.addEventListener("touchstart", onLookStart);
    lookZone.addEventListener("touchmove", onLookMove, { passive: false });
    lookZone.addEventListener("touchend", onLookEnd);

    cleanupFns.push(
      () => lookZone.removeEventListener("touchstart", onLookStart),
      () => lookZone.removeEventListener("touchmove", onLookMove),
      () => lookZone.removeEventListener("touchend", onLookEnd)
    );
  }

  return cleanupFns;
}

function createPriestShrine({ scene, camera, trackUrl }) {
  const shrine = new THREE.Group();

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 14, 2.4, 36),
    getPriestBaseMaterial()
  );
  platform.receiveShadow = true;
  platform.position.y = 1.2;
  shrine.add(platform);

  const rune = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.45, 16, 80),
    getPriestRuneMaterial()
  );
  rune.rotation.x = Math.PI / 2;
  rune.position.y = 2.4;
  shrine.add(rune);

  const priest = buildPriestFigure();
  priest.position.y = 2.4;
  shrine.add(priest);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(5.5, 0.15, 12, 60),
    getPriestHaloMaterial()
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 11.3;
  shrine.add(halo);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16),
    getPriestFlameMaterial()
  );
  flame.position.y = 10.2;
  shrine.add(flame);

  const flameLight = new THREE.PointLight(0xffddb1, 0.9, 120, 2);
  flameLight.position.y = 10.2;
  shrine.add(flameLight);

  shrine.position.set(30, 0, -70);
  scene.add(shrine);

  const spatialTrack = createSpatialTrack({
    url: trackUrl,
    minDistance: 8,
    maxDistance: 110,
  });

  const update = () => {
    const time = performance.now() * 0.001;
    halo.rotation.z = time * 0.4;
    flame.position.y = 10.2 + Math.sin(time * 2.1) * 0.4;
    flame.material.opacity = 0.4 + (Math.sin(time * 3.2) + 1) * 0.25;
    priest.rotation.y = Math.sin(time * 0.25) * 0.2;
    if (spatialTrack && camera) {
      const distance = camera.position.distanceTo(shrine.position);
      spatialTrack.setDistance(distance);
    }
  };

  const unlockAudio = () => {
    spatialTrack?.unlock?.();
  };

  return { update, unlockAudio };
}

function buildPriestFigure() {
  const figure = new THREE.Group();

  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 11, 24, 1, true),
    getPriestRobeMaterial()
  );
  robe.castShadow = true;
  robe.position.y = 5.5;
  figure.add(robe);

  const sash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 12, 8),
    getPriestSashMaterial()
  );
  sash.position.set(0, 5.5, 2.5);
  sash.rotation.x = Math.PI / 2;
  figure.add(sash);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 18, 18),
    getPriestHeadMaterial()
  );
  head.position.y = 11;
  head.castShadow = true;
  figure.add(head);

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 18, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI),
    getPriestRobeMaterial()
  );
  hood.position.y = 10.4;
  figure.add(hood);

  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.35, 12, 12),
    getPriestStaffMaterial()
  );
  staff.position.set(2.8, 6.2, 0);
  staff.rotation.z = Math.PI / 12;
  staff.castShadow = true;
  figure.add(staff);

  const staffOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 12),
    getPriestOrbMaterial()
  );
  staffOrb.position.set(3.1, 12.2, 0);
  figure.add(staffOrb);

  return figure;
}
