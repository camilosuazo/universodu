import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const MAX_PROMPT_OBJECTS = 120;
const WALK_SPEED = 42;

const heuristicsTable = [
  { regex: /(cactus|cactaceas|cactáceas|nopal|suculenta)/i, tag: "cacti" },
  { regex: /(roca|piedra|meteorito|monolito|cantil)/i, tag: "rocks" },
  { regex: /(oasis|agua|laguna|lago|rio|río)/i, tag: "oasis" },
  { regex: /(ruina|templo|pirámide|piramide|ciudad|obelisco)/i, tag: "ruins" },
  { regex: /(cristal|neon|neón|brillo|luz|aurora)/i, tag: "crystals" },
  { regex: /(bruma|niebla|espejismo|mirage|viento)/i, tag: "mirage" },
  { regex: /(luciernaga|luciérnaga|estrella|cielo|brillar)/i, tag: "fireflies" },
  { regex: /(totem|totémico|escultura|tótem|arte)/i, tag: "totems" },
];

export function parsePromptHeuristics(prompt) {
  const tags = new Set();
  heuristicsTable.forEach((entry) => {
    if (entry.regex.test(prompt)) {
      tags.add(entry.tag);
    }
  });
  if (!tags.size) {
    tags.add("mirage");
    tags.add("rocks");
  }
  const summary = Array.from(tags)
    .map((tag) => tagLabel(tag))
    .join(" · ");
  return { tags, summary };
}

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

  scene.add(new THREE.AmbientLight(0xfef1d8, 0.45));
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

  const promptGroup = new THREE.Group();
  scene.add(promptGroup);
  const promptObjects = [];

  const clock = new THREE.Clock();
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const keys = { forward: false, backward: false, left: false, right: false };

  function requestPointerLock() {
    try {
      controls.lock();
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

  function updateMovement(delta) {
    velocity.x -= velocity.x * 4 * delta;
    velocity.z -= velocity.z * 4 * delta;

    direction.z = Number(keys.forward) - Number(keys.backward);
    direction.x = Number(keys.right) - Number(keys.left);
    direction.normalize();

    if (controls.isLocked) {
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

  function spawnHandlers(tag) {
    switch (tag) {
      case "cacti":
        registerPromptObject(spawnCacti(randomAroundCamera()));
        break;
      case "rocks":
        registerPromptObject(spawnRocks(randomAroundCamera(50, 160)));
        break;
      case "oasis":
        registerPromptObject(spawnOasis(randomAroundCamera(30, 120)));
        break;
      case "ruins":
        registerPromptObject(spawnRuins(randomAroundCamera(80, 200)));
        break;
      case "crystals":
        registerPromptObject(spawnCrystals(randomAroundCamera(60, 170)));
        break;
      case "mirage":
        registerPromptObject(spawnMirage(randomAroundCamera(70, 170)));
        break;
      case "fireflies":
        registerPromptObject(spawnFireflies(randomAroundCamera(30, 80)));
        break;
      case "totems":
        registerPromptObject(spawnTotems(randomAroundCamera(60, 160)));
        break;
      default:
        registerPromptObject(spawnMirage(randomAroundCamera()));
        break;
    }
  }

  function spawnFromTags(tags) {
    tags.forEach((tag) => spawnHandlers(tag));
  }

  // Paisaje base inicial
  spawnFromTags(new Set(["rocks", "cacti", "mirage"]));

  return {
    requestPointerLock,
    spawnFromTags,
    resize,
    parsePromptHeuristics,
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
