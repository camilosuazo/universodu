import { initUI } from "./ui.js";
import { createWorld, parsePromptHeuristics } from "./world.js";

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
  onToggleAI: (enabled) => {
    aiEnabled = enabled;
    ui.setAIStatus(enabled ? "Intentaré IA" : "Parser local");
  },
  onRequestLocalServerHelp: () => {
    const commands = "npm install\nnpm run dev";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(commands).catch(() => {});
    }
    window.alert(
      "Para servir UniversoDú localmente ejecuta:\n\n" + commands + "\n\nEsto abrirá Vite en http://localhost:5173"
    );
  },
});

ui.setAIStatus("Parser local");

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
let aiEnabled = false;

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
  let summary = "";
  let tags = new Set();

  if (aiEnabled) {
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
      candidateTags.forEach((tag) => tags.add(tag));
      summary = candidateSummary || summary;
      if (!tags.size) {
        throw new Error("La IA no devolvió instrucciones");
      }
      if (!summary) {
        summary = Array.from(tags).map((tag) => tagLabel(tag)).join(" · ");
      }
    } catch (error) {
      console.warn("AI mode fallback", error);
      ui.notify("Modo IA no disponible. Usando parser local.");
      const fallback = parsePromptHeuristics(prompt);
      summary = fallback.summary;
      tags = fallback.tags;
    }
  } else {
    const fallback = parsePromptHeuristics(prompt);
    summary = fallback.summary;
    tags = fallback.tags;
  }

  world.spawnFromTags(tags);
  ui.pushPromptLog(prompt, summary);
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
  }[tag] || "Nuevo relieve";
}

window.addEventListener("error", (event) => {
  ui.showError("Error crítico: " + (event.message || "Desconocido"));
});

window.addEventListener("unhandledrejection", (event) => {
  ui.showError("Promesa rechazada: " + (event.reason?.message || "Sin detalle"));
});
