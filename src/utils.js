/**
 * Shared utility functions for UniversoDu
 */

import { ALLOWED_TAGS, ENTITY_TYPE_ALIASES, TAG_LABELS } from "./constants.js";

/**
 * Convert a value to a finite number or return fallback
 */
export function toFiniteNumber(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = Number(value.trim().replace(/,/g, "."));
    if (Number.isFinite(normalized)) return normalized;
  }
  return typeof fallback === "number" ? fallback : undefined;
}

/**
 * Clamp a number between min and max
 */
export function clampNumber(value, min, max) {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Parse a number from various input types
 */
export function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const num = Number(value.trim().replace(/,/g, "."));
    if (Number.isFinite(num)) return num;
  }
  return null;
}

/**
 * Get human-readable label for a tag
 */
export function tagLabel(tag) {
  return TAG_LABELS[tag] || "Nuevo relieve";
}

/**
 * Normalize entity type using aliases
 */
export function normalizeEntityType(value) {
  if (typeof value !== "string") return "";
  const clean = value.toLowerCase().trim();
  return ENTITY_TYPE_ALIASES[clean] || clean;
}

/**
 * Normalize size string to canonical value
 */
export function normalizeSize(value) {
  if (typeof value !== "string") return "";
  const lower = value.toLowerCase().trim();
  if (["tiny", "pequeno", "pequeño", "small", "mini"].includes(lower)) return "small";
  if (["medium", "mediano", "media"].includes(lower)) return "medium";
  if (["huge", "gigantic", "large", "enorme", "gran", "grande", "massive"].includes(lower)) return "large";
  return "";
}

/**
 * Sanitize color string
 */
export function sanitizeColor(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 24);
  return trimmed || "";
}

/**
 * Clean markdown code blocks from AI output
 */
export function cleanModelOutput(text) {
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

/**
 * Normalize tags array to Set of valid tags
 */
export function normalizeTags(list) {
  const cleaned = new Set();
  list.forEach((tag) => {
    if (!tag) return;
    const normalized = tag.toString().toLowerCase().trim();
    if (ALLOWED_TAGS.has(normalized)) {
      cleaned.add(normalized);
      return;
    }
    // Fuzzy matching for Spanish variations
    if (normalized.includes("oasis")) cleaned.add("oasis");
    else if (normalized.includes("cact")) cleaned.add("cacti");
    else if (normalized.includes("ruin") || normalized.includes("templo")) cleaned.add("ruins");
    else if (normalized.includes("cristal") || normalized.includes("crystal")) cleaned.add("crystals");
    else if (normalized.includes("luci") || normalized.includes("fuego") || normalized.includes("estre")) cleaned.add("fireflies");
    else if (normalized.includes("totem") || normalized.includes("escultura")) cleaned.add("totems");
    else if (normalized.includes("roca") || normalized.includes("piedra") || normalized.includes("meteor")) cleaned.add("rocks");
    else if (normalized.includes("espej") || normalized.includes("mirage") || normalized.includes("bruma")) cleaned.add("mirage");
    else if (normalized.includes("criatura") || normalized.includes("ser")) cleaned.add("creatures");
    else if (normalized.includes("nomada") || normalized.includes("nomada") || normalized.includes("caravana")) cleaned.add("nomads");
    else if (normalized.includes("estructura") || normalized.includes("torre") || normalized.includes("ciudad")) cleaned.add("structures");
    else if (normalized.includes("tormenta") || normalized.includes("viento")) cleaned.add("storm");
    else if (normalized.includes("flora") || normalized.includes("veget")) cleaned.add("flora");
    else if (normalized.includes("portal")) cleaned.add("portals");
    else if (normalized.includes("centinela") || normalized.includes("guardian")) cleaned.add("sentinels");
  });
  return cleaned;
}

/**
 * Extract tags from AI response payload
 */
export function extractTags(payload) {
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

/**
 * Extract summary from AI response payload
 */
export function extractSummary(payload) {
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

/**
 * Extract entities from AI response payload
 */
export function extractEntities(payload) {
  const candidate =
    payload?.entities ??
    payload?.result?.entities ??
    payload?.data?.entities ??
    payload?.response?.entities;
  if (Array.isArray(candidate)) return candidate;
  return [];
}

/**
 * Normalize entities array with validation and clamping
 */
export function normalizeEntities(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = [];
  list.forEach((entity) => {
    if (!entity || typeof entity !== "object") return;
    const typeSource = entity.type ?? entity.entity ?? entity.kind;
    const type = typeof typeSource === "string" ? typeSource.toLowerCase().trim() : "";
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

/**
 * Parse AI JSON response with error handling
 */
export function parseAiJson(rawText) {
  const clean = cleanModelOutput(rawText);
  if (!clean) {
    throw new Error("La IA respondio vacio");
  }
  try {
    return JSON.parse(clean);
  } catch (error) {
    throw new Error("La IA devolvio JSON invalido");
  }
}

/**
 * Fetch with timeout using AbortController
 */
export function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}
