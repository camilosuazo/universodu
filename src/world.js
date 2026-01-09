import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { createSpatialTrack } from "./audio.js";

const MAX_PROMPT_OBJECTS = 120;
const WALK_SPEED = 42;

function tagLabel(tag) {
  switch (tag) {
    case "cacti":
      return "Cactáceas lumínicas";
    case "rocks":
      return "Cantiles pétreos";
    case "oasis":
      return "Oasis nebuloso";
    case "ruins":
      return "Ruinas místicas";
    case "crystals":
      return "Coral de cristal";
    case "mirage":
      return "Espejismo solar";
    case "fireflies":
      return "Luciérnagas sónicas";
    case "totems":
      return "Tótems del viento";
    default:
      return "Nuevo relieve";
  }
}

const PRIEST_TRACK_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_PRIEST_TRACK) ||
  "/music/sacerdote-theme.wav";

const DAY_STAGES = {
  amanecer: {
    skyColor: 0xfef5e8,
    fogColor: 0xf1dcb7,
    fogDensity: 0.0008,
    sunColor: 0xffe5b5,
    sunIntensity: 1.35,
    ambientIntensity: 0.45,
  },
  manana: {
    skyColor: 0xfdf6f1,
    fogColor: 0xf5e9ce,
    fogDensity: 0.0007,
    sunColor: 0xfff0c3,
    sunIntensity: 1.6,
    ambientIntensity: 0.6,
  },
  tarde: {
    skyColor: 0xffe7c6,
    fogColor: 0xf0caa2,
    fogDensity: 0.0009,
    sunColor: 0xffc16c,
    sunIntensity: 1.4,
    ambientIntensity: 0.5,
  },
  atardecer: {
    skyColor: 0xf6b098,
    fogColor: 0xd39378,
    fogDensity: 0.0012,
    sunColor: 0xf86c4f,
    sunIntensity: 1.1,
    ambientIntensity: 0.35,
  },
  noche: {
    skyColor: 0x0d1220,
    fogColor: 0x0b0f1c,
    fogDensity: 0.0015,
    sunColor: 0x6ab0ff,
    sunIntensity: 0.35,
    ambientIntensity: 0.2,
  },
};

export function createWorld(canvas, { onPointerLockChange, onPointerLockError }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4e4c5);
  scene.fog = new THREE.FogExp2(0xf1dcb7, 0.0008);

  const camera = new THREE.PerspectiveCamera(
    70,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    2000
  );
  camera.position.set(0, 3.2, 8);

  const controls = new PointerLockControls(camera, document.body);
  controls.addEventListener("lock", () => {
    onPointerLockChange?.(true);
  });
  controls.addEventListener("unlock", () => {
    onPointerLockChange?.(false);
  });

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

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1200, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfef5e8,
      transparent: true,
      opacity: 0.97,
      side: THREE.BackSide,
    })
  );
  scene.add(sky);

  const dunes = createDunes();
  scene.add(dunes);

  const dustLayer = createDust();
  scene.add(dustLayer.points);

  const priestShrine = createPriestShrine({
    scene,
    camera,
    trackUrl: PRIEST_TRACK_URL,
  });

  const promptGroup = new THREE.Group();
  scene.add(promptGroup);
  const promptObjects = [];

  const clock = new THREE.Clock();
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const keys = { forward: false, backward: false, left: false, right: false };
  const touchLook = { active: false, startX: 0, startY: 0, yaw: 0, pitch: 0 };
  const virtualJoystick = { active: false, startX: 0, startY: 0, deltaX: 0, deltaY: 0 };

  function requestPointerLock() {
    try {
      controls.lock();
      priestShrine?.unlockAudio?.();
    } catch (error) {
      onPointerLockError?.("Pointer Lock no disponible en este navegador.");
    }
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

  document.addEventListener("keydown", (event) => handleKey(event, true));
  document.addEventListener("keyup", (event) => handleKey(event, false));

  function bindTouchControls() {
    const joystick = document.getElementById("joystick" );
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
      joystick.addEventListener("touchstart", (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }, { passive: false });
      joystick.addEventListener("touchmove", (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }, { passive: false });
      joystick.addEventListener("touchend", () => {
        resetThumb();
      });
    }

    if (lookZone) {
      lookZone.addEventListener("touchstart", (event) => {
        const touch = event.touches[0];
        touchLook.active = true;
        touchLook.startX = touch.clientX;
        touchLook.startY = touch.clientY;
      });
      lookZone.addEventListener("touchmove", (event) => {
        if (!touchLook.active) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - touchLook.startX;
        const deltaY = touch.clientY - touchLook.startY;
        touchLook.startX = touch.clientX;
        touchLook.startY = touch.clientY;
        controls.getObject().rotation.y -= deltaX * 0.003;
        camera.rotation.x -= deltaY * 0.002;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      }, { passive: false });
      lookZone.addEventListener("touchend", () => {
        touchLook.active = false;
      });
    }
  }

  bindTouchControls();

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

    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3.2, 0.1);
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.1);
    updateDust(dustLayer, delta);
    updateMovement(delta);
    priestShrine?.update?.();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
  }

  window.addEventListener("resize", resize);

  function registerPromptObject(object) {
    promptObjects.push(object);
    promptGroup.add(object);
    if (promptObjects.length > MAX_PROMPT_OBJECTS) {
      const stale = promptObjects.shift();
      if (stale) {
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
    switch (tag) {
      case "cacti":
        registerPromptObject(spawnCacti(randomAroundCamera()));
        return;
      case "rocks":
        registerPromptObject(spawnRocks(randomAroundCamera(50, 160)));
        return;
      case "oasis":
        registerPromptObject(spawnOasis(randomAroundCamera(30, 120)));
        return;
      case "ruins":
        registerPromptObject(spawnRuins(randomAroundCamera(80, 200)));
        return;
      case "crystals":
        registerPromptObject(spawnCrystals(randomAroundCamera(60, 170)));
        return;
      case "mirage":
        registerPromptObject(spawnMirage(randomAroundCamera(70, 170)));
        return;
      case "fireflies":
        registerPromptObject(spawnFireflies(randomAroundCamera(30, 80)));
        return;
      case "totems":
        registerPromptObject(spawnTotems(randomAroundCamera(60, 160)));
        return;
      case "creatures":
        registerPromptObject(spawnCreatures(randomAroundCamera(20, 80)));
        return;
      case "nomads":
        registerPromptObject(spawnNomads(randomAroundCamera(40, 120)));
        return;
      case "structures":
        registerPromptObject(spawnStructures(randomAroundCamera(90, 200)));
        return;
      case "storm":
        registerPromptObject(spawnStorm(randomAroundCamera(60, 180)));
        return;
      case "flora":
        registerPromptObject(spawnFlora(randomAroundCamera(30, 110)));
        return;
      case "portals":
        registerPromptObject(spawnPortals(randomAroundCamera(70, 150)));
        return;
      case "sentinels":
        registerPromptObject(spawnSentinels(randomAroundCamera(80, 160)));
        return;
      default:
        registerPromptObject(spawnMirage(randomAroundCamera()));
    }
  }

  function spawnFromTags(tags) {
    tags.forEach((tag) => spawnHandlers(tag));
  }

  const ENTITY_SPAWNERS = {
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
  };

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

  // Paisaje base inicial
  spawnFromTags(new Set(["rocks", "cacti", "mirage"]));

  return {
    requestPointerLock,
    spawnFromTags,
    spawnFromEntities,
    applyPromptPlan,
    resize,
    setDayStage,
  };
}

function createDunes() {
  const geometry = new THREE.PlaneGeometry(2400, 2400, 240, 240);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const noise =
      Math.sin(x * 0.004) * 2 + Math.cos(y * 0.003) * 1.9 + (Math.random() - 0.5);
    position.setZ(i, noise);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0xe3c086,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function createDust() {
  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 1200;
    positions[i * 3 + 1] = Math.random() * 90 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1200;
    speeds[i] = Math.random() * 0.2 + 0.05;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
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

function spawnCacti(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1e8c4e,
    emissive: 0x062515,
    roughness: 0.6,
    metalness: 0.1,
  });
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i += 1) {
    const scale = 0.7 + Math.random() * 0.9;
    const cactus = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7 * scale, 0.9 * scale, 8 * scale, 12),
      mat
    );
    stem.castShadow = true;
    stem.position.y = 4 * scale;
    cactus.add(stem);

    const branchGeo = new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 4 * scale, 10);
    const branchLeft = new THREE.Mesh(branchGeo, mat);
    branchLeft.rotation.z = Math.PI / 2.5;
    branchLeft.position.set(-1.6 * scale, 3.6 * scale, 0);
    cactus.add(branchLeft);

    const branchRight = branchLeft.clone();
    branchRight.rotation.z = -Math.PI / 2.7;
    branchRight.position.set(1.7 * scale, 4.4 * scale, 0.3 * scale);
    cactus.add(branchRight);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 * scale, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xfff7d6,
        transparent: true,
        opacity: 0.8,
      })
    );
    glow.position.y = 8.6 * scale;
    cactus.add(glow);

    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 18,
      0,
      (Math.random() - 0.5) * 18
    );
    cactus.position.copy(center).add(offset);
    group.add(cactus);
  }
  return group;
}

function spawnRocks(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7b6753,
    roughness: 1,
    flatShading: true,
  });
  const count = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i += 1) {
    const size = 4 + Math.random() * 7;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const rock = new THREE.Mesh(geo, mat);
    rock.castShadow = true;
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 24,
      size * 0.35,
      (Math.random() - 0.5) * 24
    );
    rock.position.copy(center).add(offset);
    group.add(rock);
  }
  return group;
}

function spawnRuins(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xcdb293,
    roughness: 0.8,
    flatShading: true,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(28, 2, 28), mat);
  base.position.copy(center).setY(1);
  group.add(base);

  for (let i = 0; i < 5; i += 1) {
    const height = 6 + Math.random() * 12;
    const col = new THREE.Mesh(new THREE.BoxGeometry(2.2, height, 2.2), mat);
    col.castShadow = true;
    col.position.copy(center).add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        height / 2,
        (Math.random() - 0.5) * 16
      )
    );
    group.add(col);
  }

  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(8, 0.8, 16, 60),
    new THREE.MeshStandardMaterial({
      color: 0xefe2d0,
      emissive: 0x2c1f13,
      roughness: 0.2,
      metalness: 0.3,
    })
  );
  arc.rotation.x = Math.PI / 2;
  arc.position.copy(center).setY(8);
  group.add(arc);
  return group;
}

function spawnOasis(center) {
  const group = new THREE.Group();
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(14 + Math.random() * 8, 48),
    new THREE.MeshPhongMaterial({
      color: 0x58d8ec,
      transparent: true,
      opacity: 0.85,
      shininess: 100,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(center).setY(0.05);
  group.add(pool);

  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(10, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xbef6ff,
      transparent: true,
      opacity: 0.1,
    })
  );
  mist.position.copy(center).setY(5);
  group.add(mist);

  const palmMat = new THREE.MeshStandardMaterial({ color: 0x2b5534, roughness: 0.6 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x9c6b41, roughness: 0.9 });
  const palms = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < palms; i += 1) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.9, 10, 8),
      trunkMat
    );
    trunk.castShadow = true;
    const pos = center
      .clone()
      .add(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8));
    trunk.position.set(pos.x, 5, pos.z);
    group.add(trunk);

    const leaves = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 8, 1, true), palmMat);
    leaves.position.set(pos.x, 10.5, pos.z);
    leaves.rotation.x = Math.PI;
    group.add(leaves);
  }
  return group;
}

function spawnCrystals(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaef6ff,
    emissive: 0x2e6275,
    metalness: 0.4,
    roughness: 0.2,
  });
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i += 1) {
    const height = 6 + Math.random() * 10;
    const geo = new THREE.ConeGeometry(1.2 + Math.random() * 0.8, height, 6);
    const crystal = new THREE.Mesh(geo, mat);
    crystal.castShadow = true;
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 14,
      height / 2,
      (Math.random() - 0.5) * 14
    );
    crystal.position.copy(center).add(offset);
    group.add(crystal);
  }
  return group;
}

function spawnMirage(center) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(10 + Math.random() * 5, 0.9, 24, 80),
    new THREE.MeshBasicMaterial({
      color: 0xfff2cf,
      transparent: true,
      opacity: 0.35,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(center).setY(6);
  group.add(ring);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(3, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffcba4,
      transparent: true,
      opacity: 0.55,
    })
  );
  orb.position.copy(center).setY(6);
  group.add(orb);
  return group;
}

function spawnFireflies(center) {
  const group = new THREE.Group();
  const count = 80;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = center.x + (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = 3 + Math.random() * 12;
    positions[i * 3 + 2] = center.z + (Math.random() - 0.5) * 20;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xfff6d3,
    size: 0.7,
    transparent: true,
    opacity: 0.85,
  });
  const fireflies = new THREE.Points(geometry, material);
  group.add(fireflies);
  return group;
}

function spawnTotems(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfce0b8,
    emissive: 0x2f130a,
    roughness: 0.3,
    metalness: 0.1,
  });
  const columns = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < columns; i += 1) {
    const height = 10 + Math.random() * 8;
    const twist = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.5, height, 16, 1, true),
      mat
    );
    twist.castShadow = true;
    twist.position.copy(center).add(
      new THREE.Vector3(
        Math.cos((i / columns) * Math.PI * 2) * 6,
        height / 2,
        Math.sin((i / columns) * Math.PI * 2) * 6
      )
    );
    twist.rotation.y = Math.random() * Math.PI;
    group.add(twist);
  }
  return group;
}

function spawnCreatures(center) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe8d9ff,
    emissive: 0x38245b,
    metalness: 0.3,
    roughness: 0.4,
  });
  const limbMat = new THREE.MeshStandardMaterial({ color: 0xffdab8, emissive: 0x3f1e15 });
  const count = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i += 1) {
    const creature = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 18, 18), bodyMat);
    body.castShadow = true;
    creature.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), bodyMat);
    head.position.y = 2.5;
    creature.add(head);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, 2.5, 8), limbMat);
    antenna.position.set(0.8, 3.6, 0);
    creature.add(antenna);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 3.6, 10), limbMat);
    limb.position.set(1.2, -1, 0.4);
    limb.rotation.z = Math.PI / 4;
    creature.add(limb);
    const offset = new THREE.Vector3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30);
    creature.position.copy(center).add(offset);
    creature.position.y = 1.6;
    group.add(creature);
  }
  return group;
}

function spawnNomads(center) {
  const group = new THREE.Group();
  const tentMat = new THREE.MeshStandardMaterial({ color: 0xfeccb5, roughness: 0.7 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0xe07143, emissive: 0x2b0600 });
  const caravan = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 0.5, 3, 16, 1, true), tentMat);
    base.rotation.x = Math.PI;
    base.position.set(i * 6, 2, 0);
    caravan.add(base);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(6, 3, 1, 1), fabricMat);
    cloth.position.set(i * 6, 2.2, 0);
    cloth.rotation.y = (i % 2 === 0 ? 1 : -1) * Math.PI / 12;
    caravan.add(cloth);
  }
  caravan.position.copy(center);
  group.add(caravan);
  return group;
}

function spawnStructures(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xded7ff,
    emissive: 0x2c2c54,
    metalness: 0.5,
    roughness: 0.25,
  });
  const towerCount = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < towerCount; i += 1) {
    const height = 18 + Math.random() * 15;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, height, 6, 1, true), mat);
    tower.castShadow = true;
    const offset = new THREE.Vector3((Math.random() - 0.5) * 40, height / 2, (Math.random() - 0.5) * 40);
    tower.position.copy(center).add(offset);
    group.add(tower);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(4, 0.3, 16, 60), new THREE.MeshBasicMaterial({ color: 0xffea8a }));
    halo.rotation.x = Math.PI / 2;
    halo.position.copy(tower.position).setY(height + 2);
    group.add(halo);
  }
  return group;
}

function spawnStorm(center) {
  const group = new THREE.Group();
  const funnel = new THREE.Mesh(
    new THREE.ConeGeometry(30, 70, 16, 16, true),
    new THREE.MeshStandardMaterial({
      color: 0xcdbba6,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    })
  );
  funnel.position.copy(center).setY(35);
  group.add(funnel);
  const lightning = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 1.2, 40, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff7ce })
  );
  lightning.position.copy(center).setY(20);
  lightning.rotation.z = Math.PI / 8;
  group.add(lightning);
  return group;
}

function spawnFlora(center) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc0ffb2, emissive: 0x1f3d28 });
  const count = 10 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.8 + Math.random() * 0.6, 8, 8), mat);
    const offset = new THREE.Vector3((Math.random() - 0.5) * 28, Math.random() * 1.5, (Math.random() - 0.5) * 28);
    petal.position.copy(center).add(offset);
    group.add(petal);
  }
  return group;
}

function spawnPortals(center) {
  const group = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x96e6ff, emissive: 0x114085, metalness: 0.4 });
  for (let i = 0; i < 2; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 1, 16, 80), ringMat);
    ring.position.copy(center).add(new THREE.Vector3(i * 14 - 7, 8, 0));
    ring.rotation.y = Math.PI / 4;
    group.add(ring);
  }
  return group;
}

function spawnSentinels(center) {
  const group = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const sentinel = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 14, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x7078ff, emissive: 0x1b1f3f, metalness: 0.6 })
    );
    sentinel.castShadow = true;
    const offset = new THREE.Vector3(Math.cos((i / 4) * Math.PI * 2) * 10, 7, Math.sin((i / 4) * Math.PI * 2) * 10);
    sentinel.position.copy(center).add(offset);
    group.add(sentinel);
  }
  return group;
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

function createPriestShrine({ scene, camera, trackUrl }) {
  const shrine = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x2e1f32,
    roughness: 0.8,
    metalness: 0.2,
  });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 2.4, 36), baseMat);
  platform.receiveShadow = true;
  platform.position.y = 1.2;
  shrine.add(platform);

  const rune = new THREE.Mesh(
    new THREE.TorusGeometry(9, 0.45, 16, 80),
    new THREE.MeshStandardMaterial({
      color: 0xfff2c1,
      emissive: 0x4c2d1f,
      metalness: 0.4,
      roughness: 0.25,
    })
  );
  rune.rotation.x = Math.PI / 2;
  rune.position.y = 2.4;
  shrine.add(rune);

  const priest = buildPriestFigure();
  priest.position.y = 2.4;
  shrine.add(priest);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(5.5, 0.15, 12, 60),
    new THREE.MeshBasicMaterial({ color: 0xfff5ce, transparent: true, opacity: 0.75 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 11.3;
  shrine.add(halo);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.65 })
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
  const robeMat = new THREE.MeshStandardMaterial({
    color: 0xcdd7ff,
    emissive: 0x1d1737,
    roughness: 0.6,
    metalness: 0.1,
  });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(4.5, 11, 24, 1, true), robeMat);
  robe.castShadow = true;
  robe.position.y = 5.5;
  figure.add(robe);

  const sashMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0x4e1e0d,
    metalness: 0.3,
  });
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 12, 8), sashMat);
  sash.position.set(0, 5.5, 2.5);
  sash.rotation.x = Math.PI / 2;
  figure.add(sash);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xf5e3d7, roughness: 0.7 })
  );
  head.position.y = 11;
  head.castShadow = true;
  figure.add(head);

  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 18, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI),
    robeMat
  );
  hood.position.y = 10.4;
  figure.add(hood);

  const staffMat = new THREE.MeshStandardMaterial({ color: 0x7a4b35, roughness: 0.8 });
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 12, 12), staffMat);
  staff.position.set(2.8, 6.2, 0);
  staff.rotation.z = Math.PI / 12;
  staff.castShadow = true;
  figure.add(staff);

  const staffOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.9 })
  );
  staffOrb.position.set(3.1, 12.2, 0);
  figure.add(staffOrb);

  return figure;
}

function spawnInstructionStructure(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const floors = Math.max(1, Math.round(readNumber(spec.floors, readNumber(spec.height, 12) / 3.5) || 4));
  const width = THREE.MathUtils.clamp(readNumber(spec.width, 12) * scale, 6, 80);
  const depth = THREE.MathUtils.clamp(readNumber(spec.depth, width * 0.7), 6, 80);
  const height = THREE.MathUtils.clamp(readNumber(spec.height, floors * 4.2) * scale, 8, 220);
  const bodyColor = colorWithFallback(spec.color, 0xded7ff);

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: bodyColor,
      emissive: bodyColor.clone().multiplyScalar(0.12),
      metalness: 0.35,
      roughness: 0.35,
    })
  );
  building.castShadow = true;
  building.position.y = height / 2;
  group.add(building);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(2, width * 0.4), Math.max(2, height * 0.12), 5),
    new THREE.MeshStandardMaterial({
      color: bodyColor.clone().offsetHSL(0.05, 0.1, 0.15),
      emissive: bodyColor.clone().multiplyScalar(0.2),
      metalness: 0.45,
      roughness: 0.2,
    })
  );
  roof.position.y = height + roof.geometry.parameters.height / 2;
  group.add(roof);

  const windowGeo = new THREE.PlaneGeometry(1.4, 1.8);
  const windowMat = new THREE.MeshBasicMaterial({
    color: 0xfff7d6,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const windowsPerSide = Math.min(6, Math.max(2, Math.round(width / 4)));
  const windowSpacing = width / (windowsPerSide + 1);
  for (let side = 0; side < 4; side += 1) {
    for (let i = 0; i < windowsPerSide; i += 1) {
      const pane = new THREE.Mesh(windowGeo, windowMat);
      const offset = -width / 2 + windowSpacing * (i + 1);
      pane.position.y = height * 0.5 * ((i % 2) + 0.4);
      switch (side) {
        case 0:
          pane.position.set(offset, pane.position.y, depth / 2 + 0.01);
          break;
        case 1:
          pane.position.set(offset, pane.position.y, -depth / 2 - 0.01);
          pane.rotation.y = Math.PI;
          break;
        case 2:
          pane.position.set(width / 2 + 0.01, pane.position.y, offset);
          pane.rotation.y = Math.PI / 2;
          break;
        default:
          pane.position.set(-width / 2 - 0.01, pane.position.y, offset);
          pane.rotation.y = -Math.PI / 2;
          break;
      }
      group.add(pane);
    }
  }

  group.position.copy(center);
  return group;
}

function spawnInstructionTree(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const height = THREE.MathUtils.clamp(readNumber(spec.height, 10) * scale, 4, 60);
  const trunkRadius = Math.max(0.4, height * 0.08);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: colorWithFallback(spec.trunkColor || spec.barkColor, 0x8c5a33),
    roughness: 0.8,
    metalness: 0.05,
  });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, height, 8),
    trunkMat
  );
  trunk.castShadow = true;
  trunk.position.y = height / 2;
  group.add(trunk);

  const canopyMat = new THREE.MeshStandardMaterial({
    color: colorWithFallback(spec.color || spec.foliageColor, 0x47b07d),
    emissive: colorWithFallback(spec.color || spec.foliageColor, 0x1b4c3a).multiplyScalar(0.18),
  });
  const canopyHeight = height * 0.6;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(canopyHeight * 0.5, 18, 18), canopyMat);
  canopy.position.y = height;
  group.add(canopy);

  const secondary = new THREE.Mesh(
    new THREE.SphereGeometry(canopyHeight * 0.35, 16, 16),
    canopyMat
  );
  secondary.position.set(canopyHeight * 0.3, height * 0.9, 0);
  group.add(secondary);

  group.position.copy(center);
  return group;
}

function spawnInstructionWater(center, spec = {}) {
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

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.02, radius * 1.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.04;
  group.add(rim);

  group.position.copy(center);
  return group;
}

function spawnInstructionOasis(center, spec = {}) {
  const group = new THREE.Group();
  const water = spawnInstructionWater(new THREE.Vector3(0, 0, 0), spec);
  group.add(water);
  const treeCount = THREE.MathUtils.clamp(readNumber(spec.trees, spec.count) || 3, 2, 6);
  for (let i = 0; i < treeCount; i += 1) {
    const angle = (i / treeCount) * Math.PI * 2;
    const radius = readNumber(spec.radius, 16) * 1.1;
    const treeCenter = new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    const tree = spawnInstructionTree(treeCenter, {
      size: spec.size || "medium",
      color: spec.foliageColor || spec.color,
      trunkColor: spec.trunkColor,
      height: readNumber(spec.height, 12) * 0.8,
    });
    group.add(tree);
  }
  group.position.copy(center);
  return group;
}

function spawnInstructionCrystal(center, spec = {}) {
  return spawnInstructionFromExisting(spawnCrystals, center, spec);
}

function spawnInstructionPortal(center, spec = {}) {
  return spawnInstructionFromExisting(spawnPortals, center, spec);
}

function spawnInstructionFireflies(center, spec = {}) {
  return spawnInstructionFromExisting(spawnFireflies, center, spec);
}

function spawnInstructionTotem(center, spec = {}) {
  return spawnInstructionFromExisting(spawnTotems, center, spec);
}

function spawnInstructionRock(center, spec = {}) {
  return spawnInstructionFromExisting(spawnRocks, center, spec);
}

function spawnInstructionCacti(center, spec = {}) {
  return spawnInstructionFromExisting(spawnCacti, center, spec);
}

function spawnInstructionRuins(center, spec = {}) {
  return spawnInstructionFromExisting(spawnRuins, center, spec);
}

function spawnInstructionMirage(center, spec = {}) {
  return spawnInstructionFromExisting(spawnMirage, center, spec);
}

function spawnInstructionNomads(center, spec = {}) {
  return spawnInstructionFromExisting(spawnNomads, center, spec);
}

function spawnInstructionStorm(center, spec = {}) {
  return spawnInstructionFromExisting(spawnStorm, center, spec);
}

function spawnInstructionDune(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const width = THREE.MathUtils.clamp(readNumber(spec.width, 60) * scale, 20, 260);
  const height = THREE.MathUtils.clamp(readNumber(spec.height, 12) * scale, 4, 60);
  const geometry = new THREE.CylinderGeometry(width, width * 0.4, height, 24, 1, true);
  geometry.rotateX(Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: colorWithFallback(spec.color, 0xe3c086),
    flatShading: true,
    roughness: 0.95,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const dune = new THREE.Mesh(geometry, material);
  dune.position.y = height * 0.25;
  group.add(dune);
  group.position.copy(center);
  return group;
}

function spawnInstructionBridge(center, spec = {}) {
  const group = new THREE.Group();
  const length = THREE.MathUtils.clamp(readNumber(spec.length, 40), 20, 200);
  const width = THREE.MathUtils.clamp(readNumber(spec.width, 6), 3, 30);
  const color = colorWithFallback(spec.color, 0xcbb6a0);
  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(length, 1, width),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.15,
    })
  );
  walkway.castShadow = true;
  walkway.position.y = 3;
  group.add(walkway);

  const archGeo = new THREE.TorusGeometry(width, 0.5, 12, 40, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({
    color: color.clone().offsetHSL(0, 0, 0.15),
    metalness: 0.3,
  });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.rotation.z = Math.PI;
  arch.scale.set(length / 20, 1, 1);
  arch.position.y = 3.5;
  group.add(arch);

  group.position.copy(center);
  return group;
}

function spawnInstructionMonolith(center, spec = {}) {
  const group = new THREE.Group();
  const scale = specSizeToScale(spec.size, spec.scale);
  const height = THREE.MathUtils.clamp(readNumber(spec.height, 30) * scale, 10, 200);
  const color = colorWithFallback(spec.color, 0x7078ff);
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(2, height * 0.15), height, Math.max(2, height * 0.15)),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.2),
      metalness: 0.6,
      roughness: 0.25,
    })
  );
  slab.castShadow = true;
  slab.position.y = height / 2;
  group.add(slab);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(3, height * 0.3), 0.25, 16, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff9c4 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height * 0.8;
  group.add(ring);

  group.position.copy(center);
  return group;
}

function spawnInstructionFlora(center, spec = {}) {
  return spawnInstructionFromExisting(spawnFlora, center, spec);
}

function spawnInstructionCreature(center, spec = {}) {
  return spawnInstructionFromExisting(spawnCreatures, center, spec);
}

function spawnInstructionSentinel(center, spec = {}) {
  return spawnInstructionFromExisting(spawnSentinels, center, spec);
}

function spawnInstructionFromExisting(factory, center, spec = {}) {
  const object = factory(new THREE.Vector3(0, 0, 0));
  if (spec.color) {
    tintGroupMaterials(object, spec.color);
  }
  const scale = specSizeToScale(spec.size, spec.scale);
  if (scale !== 1) {
    object.scale.setScalar(scale);
  }
  object.position.copy(center);
  return object;
}

function tintGroupMaterials(object, colorValue) {
  const tint = resolveColor(colorValue);
  if (!tint) return;
  object.traverse?.((child) => {
    const apply = (material) => {
      if (!material) return;
      if (material.color) {
        material.color.copy(tint);
      }
      if (material.emissive) {
        material.emissive.copy(tint).multiplyScalar(0.2);
      }
    };
    if (Array.isArray(child.material)) {
      child.material.forEach(apply);
    } else {
      apply(child.material);
    }
  });
}

function colorWithFallback(value, fallback) {
  const tint = resolveColor(value);
  if (tint) return tint;
  return new THREE.Color(fallback);
}

function resolveColor(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new THREE.Color(value);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = new THREE.Color(value.trim());
      if (Number.isNaN(parsed.r) || Number.isNaN(parsed.g) || Number.isNaN(parsed.b)) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }
  return null;
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

function readNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
