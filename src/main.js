import { initUI } from "./ui.js";
import { createWorld } from "./world.js";
import { createAmbientAudio } from "./audio.js";

console.log("UniversoDú boot");

const canvas = document.getElementById("world-canvas");

function isWebGLAvailable() {
  try {
    const canvasTest = document.createElement("canvas");
    return !!window.WebGLRenderingContext &&
      (!!canvasTest.getContext("webgl") || !!canvasTest.getContext("experimental-webgl"));
  } catch (err) {
    return false;
  }
}

const ui = initUI({
  onEnterWorld: () => {
    if (!world) return;
    world.requestPointerLock();
  },
  onPrompt: (value) => {
    handlePrompt(value);
  },
  onDayChange: (stage) => {
    currentDayStage = stage;
    world?.setDayStage(stage);
  },
  onTogglePanel: () => {},
  onToggleAudio: () => {
    if (!ambientAudio) return null;
    if (ambientAudio.isActive()) {
      ambientAudio.stop();
      return false;
    }
    ambientAudio.start();
    return true;
  },
  onRequestLocalServerHelp: () => {
    const commands = "npm install\nnpm run dev";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(commands).catch(() => {});
    }
    window.alert(`Para servir UniversoDú localmente ejecuta:

${commands}

Esto abrirá Vite en http://localhost:5173`);
  },
});

ui.setStatus("Describe tu paisaje");

if (window.location.protocol === "file:") {
  ui.showFileOverlay();
}

if (!canvas) {
  ui.showError("No se encontró el canvas del mundo.");
  throw new Error("Canvas missing");
}

if (!isWebGLAvailable()) {
  ui.showError("Tu navegador no soporta WebGL necesario para UniversoDú.");
  throw new Error("WebGL unavailable");
}

let world;
let currentDayStage = "amanecer";
const ambientAudio = createAmbientAudio();

const KNOWN_TAGS = [
  "cacti",
  "rocks",
  "oasis",
  "ruins",
  "crystals",
  "mirage",
  "fireflies",
  "totems",
  "creatures",
  "nomads",
  "structures",
  "storm",
  "flora",
  "portals",
  "sentinels",
];
const ALLOWED_TAGS = new Set(KNOWN_TAGS);
const ENTITY_TYPE_ALIASES = {
  structures: "structure",
  building: "structure",
  buildings: "structure",
  towers: "tower",
  tower: "tower",
  trees: "tree",
  cactus: "cacti",
  cactuses: "cacti",
  waters: "water",
  lakes: "water",
  crystals: "crystal",
  portals: "portal",
  gateways: "portal",
  firefly: "fireflies",
  fireflies: "fireflies",
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
};

function normalizeTags(list) {
  const cleaned = new Set();
  list.forEach((tag) => {
    if (!tag) return;
    const normalized = tag.toString().toLowerCase().trim();
    if (ALLOWED_TAGS.has(normalized)) {
      cleaned.add(normalized);
      return;
    }
    if (normalized.includes("oasis")) cleaned.add("oasis");
    else if (normalized.includes("cact")) cleaned.add("cacti");
    else if (normalized.includes("ruin") || normalized.includes("templo")) cleaned.add("ruins");
    else if (normalized.includes("cristal") || normalized.includes("crystal")) cleaned.add("crystals");
    else if (normalized.includes("luci") || normalized.includes("fuego") || normalized.includes("estre")) cleaned.add("fireflies");
    else if (normalized.includes("totem") || normalized.includes("escultura")) cleaned.add("totems");
    else if (normalized.includes("roca") || normalized.includes("piedra") || normalized.includes("meteor")) cleaned.add("rocks");
    else if (normalized.includes("espej") || normalized.includes("mirage") || normalized.includes("bruma")) cleaned.add("mirage");
    else if (normalized.includes("criatura") || normalized.includes("ser")) cleaned.add("creatures");
    else if (normalized.includes("nomada") || normalized.includes("nómada") || normalized.includes("caravana")) cleaned.add("nomads");
    else if (normalized.includes("estructura") || normalized.includes("torre") || normalized.includes("ciudad")) cleaned.add("structures");
    else if (normalized.includes("tormenta") || normalized.includes("viento")) cleaned.add("storm");
    else if (normalized.includes("flora") || normalized.includes("veget")) cleaned.add("flora");
    else if (normalized.includes("portal")) cleaned.add("portals");
    else if (normalized.includes("centinela") || normalized.includes("guardian")) cleaned.add("sentinels");
  });
  return cleaned;
}

function sanitizeJsonText(rawText) {
  if (typeof rawText !== "string") return "";
  let text = rawText.trim();
  if (text.startsWith("```") && text.includes("\n")) {
    const firstBreak = text.indexOf("\n");
    text = text.slice(firstBreak + 1);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

function parseAiJson(rawText) {
  const clean = sanitizeJsonText(rawText);
  if (!clean) {
    throw new Error("La IA respondió vacío");
  }
  try {
    return JSON.parse(clean);
  } catch (error) {
    throw new Error("La IA devolvió JSON inválido");
  }
}

function extractTags(payload) {
  const candidate =
    payload?.tags ??
    payload?.result?.tags ??
    payload?.data?.tags ??
    payload?.response?.tags;
  if (Array.isArray(candidate)) return candidate;
  if (typeof candidate === "string") {
    return candidate.split(/[,\n]/);
  }
  return [];
}

function extractSummary(payload) {
  const candidate =
    payload?.summary ??
    payload?.result?.summary ??
    payload?.data?.summary ??
    payload?.response?.summary;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }
  return "";
}

function extractEntities(payload) {
  const candidate =
    payload?.entities ??
    payload?.result?.entities ??
    payload?.data?.entities ??
    payload?.response?.entities;
  if (Array.isArray(candidate)) return candidate;
  return [];
}

function normalizeEntities(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  list.forEach((entity) => {
    if (!entity || typeof entity !== "object") return;
    const typeSource = entity.type ?? entity.entity ?? entity.kind;
    const type =
      typeof typeSource === "string" ? typeSource.toLowerCase().trim() : "";
    if (!type) return;
    const canonical = ENTITY_TYPE_ALIASES[type] || type;
    const normalized = {
      type: canonical,
      quantity: clampNumber(toFiniteNumber(entity.quantity ?? entity.count ?? 1, 1) || 1, 1, 8),
    };
    if (typeof entity.size === "string" && entity.size.trim()) {
      normalized.size = entity.size.trim().toLowerCase();
    }
    if (typeof entity.scale === "number" && Number.isFinite(entity.scale)) {
      normalized.scale = clampNumber(entity.scale, 0.3, 4);
    }
    if (typeof entity.color === "string" && entity.color.trim()) {
      normalized.color = entity.color.trim().slice(0, 32);
    }
    if (typeof entity.trunkColor === "string" && entity.trunkColor.trim()) {
      normalized.trunkColor = entity.trunkColor.trim().slice(0, 32);
    }
    if (typeof entity.foliageColor === "string" && entity.foliageColor.trim()) {
      normalized.foliageColor = entity.foliageColor.trim().slice(0, 32);
    }
    if (typeof entity.detail === "string" && entity.detail.trim()) {
      normalized.detail = entity.detail.trim().slice(0, 160);
    }
    ["floors", "height", "width", "depth", "radius", "length", "spread"].forEach((key) => {
      const num = toFiniteNumber(entity[key]);
      if (typeof num === "number") {
        normalized[key] = num;
      }
    });
    cleaned.push(normalized);
  });
  return cleaned;
}

function toFiniteNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value.trim().replace(/,/g, "."));
    if (Number.isFinite(normalized)) return normalized;
  }
  return typeof fallback === "number" ? fallback : undefined;
}

function clampNumber(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function initWorld() {
  try {
    world = createWorld(canvas, {
      onPointerLockChange: (locked) => {
        ui.markPointerLock(locked);
        ui.setEnterButtonState(locked ? "Explorando" : "Entrar", locked);
        if (!locked && document.pointerLockElement) {
          document.exitPointerLock().catch(() => {});
        }
      },
      onPointerLockError: (message) => {
        ui.notify(message || "Pointer Lock no disponible");
      },
    });
    world.setDayStage(currentDayStage);
  } catch (error) {
    console.error(error);
    ui.showError("No se pudo inicializar el mundo 3D.");
  }
}

initWorld();

const AI_ENDPOINT =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_AI_ENDPOINT) ||
  window.UNIVERSODU_AI_ENDPOINT ||
  "/api/generate";

async function handlePrompt(prompt) {
  if (!world) return;
  ui.clearPromptInput();
  ui.setStatus("Invocando paisaje...");
  let summary = "";
  let tags = new Set();
  let entitiesPlan = [];

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      throw new Error(`endpoint ${AI_ENDPOINT} sin respuesta`);
    }
    const payload = await response.json();
    const parsed = typeof payload === "string" ? parseAiJson(payload) : payload;
    const candidateTags = extractTags(parsed);
    const candidateSummary = extractSummary(parsed);
    const candidateEntities = extractEntities(parsed);
    const sanitized = normalizeTags(candidateTags);
    sanitized.forEach((tag) => tags.add(tag));
    entitiesPlan = normalizeEntities(candidateEntities);
    summary = candidateSummary || summary;
    if (!tags.size && !entitiesPlan.length) {
      throw new Error("La IA no devolvió instrucciones");
    }
    if (!summary) {
      summary = Array.from(tags).map((tag) => tagLabel(tag)).join(" · ");
    }
    if (!summary && entitiesPlan.length) {
      summary = entitiesPlan.map((entity) => entity.type).join(" · ");
    }
  } catch (error) {
    console.error("AI request error", error);
    ui.showError("Modo IA no disponible. Revisa consola");
    return;
  }

  world.applyPromptPlan({ tags, entities: entitiesPlan });
  ui.pushPromptLog(prompt, summary);
  ui.setStatus("Paisaje actualizado");
}

function tagLabel(tag) {
  return {
    cacti: "Cactáceas lumínicas",
    rocks: "Cantiles pétreos",
    oasis: "Oasis nebuloso",
    ruins: "Ruinas místicas",
    crystals: "Coral de cristal",
    mirage: "Espejismo solar",
    fireflies: "Luciérnagas sónicas",
    totems: "Tótems del viento",
    creatures: "Seres errantes",
    nomads: "Caravana nómada",
    structures: "Arquitectura viva",
    storm: "Tormenta resonante",
    flora: "Flora híbrida",
    portals: "Portales astrales",
    sentinels: "Centinelas",
  }[tag] || "Nuevo relieve";
}

window.addEventListener("error", (event) => {
  ui.showError("Error crítico: " + (event.message || "Desconocido"));
});

window.addEventListener("unhandledrejection", (event) => {
  ui.showError("Promesa rechazada: " + (event.reason?.message || "Sin detalle"));
});
