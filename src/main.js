/**
 * Main entry point for UniversoDu
 * Bootstraps the application and handles AI prompt processing
 */

import { initUI } from "./ui.js";
import { createWorld, tagLabel } from "./world.js";
import { createAmbientAudio } from "./audio.js";
import { API_CONFIG } from "./constants.js";
import {
  normalizeTags,
  normalizeEntities,
  extractTags,
  extractSummary,
  extractEntities,
  parseAiJson,
  fetchWithTimeout,
} from "./utils.js";

console.log("UniversoDu boot");

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
    window.alert(`Para servir UniversoDu localmente ejecuta:

${commands}

Esto abrira Vite en http://localhost:5173`);
  },
});

ui.setStatus("Describe tu paisaje");

if (window.location.protocol === "file:") {
  ui.showFileOverlay();
}

if (!canvas) {
  ui.showError("No se encontro el canvas del mundo.");
  throw new Error("Canvas missing");
}

if (!isWebGLAvailable()) {
  ui.showError("Tu navegador no soporta WebGL necesario para UniversoDu.");
  throw new Error("WebGL unavailable");
}

let world;
let currentDayStage = "amanecer";
const ambientAudio = createAmbientAudio();

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
  API_CONFIG.DEFAULT_ENDPOINT;

// Local keyword-based generator as fallback when AI is unavailable
const KEYWORD_MAP = {
  // Spanish keywords
  cactus: "cacti", cactos: "cacti", cactus: "cacti",
  roca: "rocks", rocas: "rocks", piedra: "rocks", piedras: "rocks",
  ruina: "ruins", ruinas: "ruins", templo: "temple", templos: "temple",
  oasis: "oasis", lago: "water", agua: "water", rio: "water",
  cristal: "crystal", cristales: "crystal",
  espejismo: "mirage", mirage: "mirage",
  luciernaga: "fireflies", luciernagas: "fireflies", fireflies: "fireflies",
  totem: "totem", totems: "totem", totemes: "totem",
  criatura: "creature", criaturas: "creature", monstruo: "creature",
  nomada: "nomad", nomadas: "nomad", campamento: "tent",
  estructura: "structure", torre: "tower", torres: "tower",
  tormenta: "storm", rayo: "storm", rayos: "storm",
  flora: "flora", planta: "flora", plantas: "flora", flor: "flora", flores: "flora",
  portal: "portal", portales: "portal",
  centinela: "sentinel", centinelas: "sentinel", guardian: "sentinel",
  montana: "mountain", montanas: "mountain", montaña: "mountain", montañas: "mountain",
  piramide: "pyramid", piramides: "pyramid", pirámide: "pyramid",
  estatua: "statue", estatuas: "statue",
  cascada: "waterfall", cascadas: "waterfall",
  aurora: "aurora", boreal: "aurora",
  cometa: "comet", cometas: "comet", meteoro: "comet",
  calavera: "skull", craneo: "skull", huesos: "skull",
  geiser: "geyser", geyser: "geyser",
  nebulosa: "nebula", nebula: "nebula", estrellas: "nebula",
  fogata: "campfire", fuego: "campfire", hoguera: "campfire",
  tienda: "tent", carpa: "tent",
  arbol: "tree", arboles: "tree", palmera: "tree", palma: "tree",
  duna: "dune", dunas: "dune", arena: "dune",
  puente: "bridge", puentes: "bridge",
  monolito: "monolith", monolitos: "monolith",
  hongo: "flora", hongos: "flora", seta: "flora",
  // English keywords
  rock: "rocks", rocks: "rocks", stone: "rocks",
  cactus: "cacti", cacti: "cacti",
  ruin: "ruins", ruins: "ruins", temple: "temple",
  crystal: "crystal", crystals: "crystal",
  water: "water", lake: "water", river: "water", pond: "water",
  tree: "tree", trees: "tree", palm: "tree",
  mountain: "mountain", mountains: "mountain",
  pyramid: "pyramid", pyramids: "pyramid",
  statue: "statue", statues: "statue",
  waterfall: "waterfall", waterfalls: "waterfall",
  comet: "comet", meteor: "comet",
  skull: "skull", bones: "skull",
  fire: "campfire", campfire: "campfire",
  tent: "tent", camp: "tent",
  storm: "storm", lightning: "storm",
  creature: "creature", monster: "creature",
  sentinel: "sentinel", guardian: "sentinel",
  portal: "portal", gate: "portal",
};

function localGenerateFromPrompt(prompt) {
  const lower = prompt.toLowerCase();
  const entities = [];
  const foundTypes = new Set();

  for (const [keyword, entityType] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword) && !foundTypes.has(entityType)) {
      foundTypes.add(entityType);
      entities.push({
        type: entityType,
        quantity: 1 + Math.floor(Math.random() * 3),
      });
    }
  }

  // If no keywords found, generate random landscape
  if (entities.length === 0) {
    const randomTypes = ["rocks", "cacti", "mirage", "crystal", "flora", "dune"];
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const type = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      if (!foundTypes.has(type)) {
        foundTypes.add(type);
        entities.push({ type, quantity: 1 + Math.floor(Math.random() * 2) });
      }
    }
  }

  return {
    summary: "Paisaje generado localmente",
    entities,
  };
}

async function handlePrompt(prompt) {
  if (!world) return;
  ui.clearPromptInput();
  ui.setStatus("Invocando paisaje...");
  ui.setLoading(true);

  let summary = "";
  let tags = new Set();
  let entitiesPlan = [];
  let usedLocalFallback = false;

  try {
    const response = await fetchWithTimeout(
      AI_ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      },
      API_CONFIG.FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`endpoint ${AI_ENDPOINT} sin respuesta`);
    }

    const payload = await response.json();

    // Check if API returned an error
    if (payload.error) {
      throw new Error(payload.error);
    }

    const parsed = typeof payload === "string" ? parseAiJson(payload) : payload;
    const candidateTags = extractTags(parsed);
    const candidateSummary = extractSummary(parsed);
    const candidateEntities = extractEntities(parsed);
    const sanitized = normalizeTags(candidateTags);
    sanitized.forEach((tag) => tags.add(tag));
    entitiesPlan = normalizeEntities(candidateEntities);
    summary = candidateSummary || summary;

    if (!tags.size && !entitiesPlan.length) {
      throw new Error("La IA no devolvio instrucciones");
    }

    if (!summary) {
      summary = Array.from(tags).map((tag) => tagLabel(tag)).join(" · ");
    }

    if (!summary && entitiesPlan.length) {
      summary = entitiesPlan.map((entity) => entity.type).join(" · ");
    }
  } catch (error) {
    console.error("AI request error, using local fallback:", error);

    // Use local fallback generator
    const local = localGenerateFromPrompt(prompt);
    entitiesPlan = local.entities;
    summary = local.summary;
    usedLocalFallback = true;
  }

  ui.setLoading(false);
  world.applyPromptPlan({ tags, entities: entitiesPlan });
  ui.pushPromptLog(prompt, summary + (usedLocalFallback ? " (local)" : ""));
  ui.setStatus(usedLocalFallback ? "Generado localmente (IA no disponible)" : "Paisaje actualizado");
}

window.addEventListener("error", (event) => {
  ui.showError("Error critico: " + (event.message || "Desconocido"));
});

window.addEventListener("unhandledrejection", (event) => {
  ui.showError("Promesa rechazada: " + (event.reason?.message || "Sin detalle"));
});
