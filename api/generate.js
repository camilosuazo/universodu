const ALLOWED_TAGS = new Set([
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

const ENTITY_TYPES = new Set([
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
]);

function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,HTTP-Referer,X-Title");
}

export default async function handler(req, res) {
  withCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    res.status(405).json({ error: "Solo POST" });
    return;
  }

  let body = "";
  try {
    for await (const chunk of req) {
      body += chunk;
    }
  } catch (err) {
    console.error("Error leyendo body", err);
    res.status(500).json({ error: "No se pudo leer el body", detail: err?.message || "unknown" });
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse(body || "{}");
  } catch (error) {
    console.error("JSON parse error", body);
    res.status(400).json({ error: "JSON inválido" });
    return;
  }

  const prompt = (payload.prompt || "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt requerido" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY missing");
    res.status(500).json({ error: "OPENROUTER_API_KEY no configurada" });
    return;
  }

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (process.env.OPENROUTER_SITE_URL) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    }
    if (process.env.OPENROUTER_APP_NAME) {
      headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Eres el motor creativo de UniversoDú, un desierto inmersivo generado en Three.js. Recibirás descripciones breves y debes responder SOLO JSON con tres campos: summary (string concisa en español), tags (array con 1-4 valores del listado: cacti, rocks, oasis, ruins, crystals, mirage, fireflies, totems, structures, flora, portals, storm, sentinels, creatures, nomads) y entities (array). Cada elemento de entities debe ser un objeto con al menos: entity (uno de: structure, tower, tree, oasis, water, crystal, portal, fireflies, totem, rock, dune, bridge, monolith, flora, creature, sentinel, cacti, ruins, mirage, nomad, storm) y quantity (1-8). Puedes añadir campos opcionales como color (hex o nombre CSS), size (small, medium, large), floors, height, width, radius, spread o detail para ayudar al motor 3D a construir el objeto. Usa summary para describir el paisaje en una frase. No incluyas texto extra fuera del JSON.",
          },
          {
            role: "user",
            content: `Prompt: ${prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: "OpenRouter error", detail: errorText });
      return;
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "";

    let summary = "";
    let tags = [];
    let entities = [];
    try {
      const cleaned = cleanModelOutput(raw);
      const parsed = JSON.parse(cleaned);
      summary = typeof parsed.summary === "string" ? parsed.summary : "";
      tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      if (Array.isArray(parsed.entities)) {
        entities = parsed.entities;
      }
    } catch (error) {
      summary = raw.slice(0, 200);
    }

    const sanitizedTags = tags
      .map((tag) => tag.toString().toLowerCase().trim())
      .filter((tag) => ALLOWED_TAGS.has(tag));

    if (!sanitizedTags.length) {
      sanitizedTags.push("mirage");
    }

    const sanitizedEntities = sanitizeEntities(entities);

    res.status(200).json({
      summary: summary || "Paisaje sugerido por IA",
      tags: sanitizedTags,
      entities: sanitizedEntities,
    });
  } catch (error) {
    console.error("IA endpoint error", error);
    res.status(500).json({ error: "Fallo al contactar OpenRouter", detail: error?.message || "unknown" });
  }
}

function cleanModelOutput(text) {
  if (!text) return "";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/, "");
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function sanitizeEntities(rawEntities) {
  if (!Array.isArray(rawEntities)) return [];
  const sanitized = [];
  rawEntities.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const rawType =
      entry.entity ||
      entry.type ||
      entry.kind ||
      entry.target ||
      entry.label;
    const normalizedType = typeof rawType === "string" ? normalizeEntityType(rawType) : "";
    if (!ENTITY_TYPES.has(normalizedType)) return;
    const quantity = clampNumber(parseNumber(entry.quantity ?? entry.count ?? 1) || 1, 1, 10);
    const item = { type: normalizedType, quantity };

    const sizeStr = normalizeSize(entry.size);
    if (sizeStr) item.size = sizeStr;

    const scalar = parseNumber(entry.scale);
    if (typeof scalar === "number") {
      item.scale = clampNumber(scalar, 0.3, 4);
    }

    const color = sanitizeColor(entry.color ?? entry.tint ?? entry.material ?? entry.hue);
    if (color) item.color = color;

    const trunk = sanitizeColor(entry.trunkColor ?? entry.barkColor);
    if (trunk) item.trunkColor = trunk;

    const foliage = sanitizeColor(entry.foliageColor ?? entry.leafColor ?? entry.secondaryColor);
    if (foliage) item.foliageColor = foliage;

    const spread = parseNumber(entry.spread ?? entry.range);
    if (typeof spread === "number") item.spread = clampNumber(spread, 0, 400);

    const detail = typeof entry.detail === "string" ? entry.detail.trim() : "";
    if (detail) item.detail = detail.slice(0, 200);

    ["floors", "height", "width", "depth", "radius", "length", "thickness"].forEach((key) => {
      const value = parseNumber(entry[key] ?? entry.attributes?.[key]);
      if (typeof value === "number") {
        item[key] = clampNumber(value, 0.1, 400);
      }
    });

    sanitized.push(item);
  });
  return sanitized;
}

function normalizeSize(value) {
  if (typeof value !== "string") return "";
  const lower = value.toLowerCase().trim();
  if (["tiny", "pequeño", "pequeno", "small", "mini"].includes(lower)) return "small";
  if (["medium", "mediano", "media"].includes(lower)) return "medium";
  if (["huge", "gigantic", "large", "enorme", "gran", "grande", "massive"].includes(lower)) return "large";
  return "";
}

function sanitizeColor(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 24);
  if (!trimmed) return "";
  return trimmed;
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const num = Number(value.trim().replace(/,/g, "."));
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function clampNumber(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

const ENTITY_ALIAS_MAP = {
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

function normalizeEntityType(value) {
  if (typeof value !== "string") return "";
  const clean = value.toLowerCase().trim();
  return ENTITY_ALIAS_MAP[clean] || clean;
}
