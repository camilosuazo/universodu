import { initUI } from "./ui.js";
import { createWorld, parsePromptHeuristics } from "./world.js";
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

function initWorld() {
  try {
    world = createWorld(canvas, {
      onPointerLockChange: (locked) => {
        ui.markPointerLock(locked);
        ui.setEnterButtonState(locked ? "Explorando" : "Entrar al Universo", locked);
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

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      throw new Error(`endpoint ${AI_ENDPOINT} sin respuesta`);
    }
    const data = await response.json();
    const candidateTags = Array.isArray(data?.tags) ? data.tags : [];
    const candidateSummary = data?.summary;
    const sanitized = normalizeTags(candidateTags);
    sanitized.forEach((tag) => tags.add(tag));
    summary = candidateSummary || summary;
    if (!tags.size) {
      throw new Error("La IA no devolvió etiquetas válidas");
    }
    if (!summary) {
      summary = Array.from(tags).map((tag) => tagLabel(tag)).join(" · ");
    }
  } catch (error) {
    console.warn("AI fallback", error);
    ui.notify("No se pudo contactar a la IA. Aprovechando heurísticas");
    const fallback = parsePromptHeuristics(prompt);
    summary = fallback.summary;
    tags = fallback.tags;
  }

  world.spawnFromTags(tags);
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
