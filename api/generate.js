const ALLOWED_TAGS = new Set([
  "cacti",
  "rocks",
  "oasis",
  "ruins",
  "crystals",
  "mirage",
  "fireflies",
  "totems",
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
              "Eres el motor creativo de UniversoDú, un desierto inmersivo. Recibirás prompts breves y debes responder solo JSON con dos campos: summary (string concisa en español) y tags (array con 1-3 valores del siguiente listado: cacti, rocks, oasis, ruins, crystals, mirage, fireflies, totems). Usa únicamente esas etiquetas y describe el paisaje que propones en summary.",
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
    try {
      const parsed = JSON.parse(raw);
      summary = typeof parsed.summary === "string" ? parsed.summary : "";
      tags = Array.isArray(parsed.tags) ? parsed.tags : [];
    } catch (error) {
      summary = raw.slice(0, 200);
    }

    const sanitizedTags = tags
      .map((tag) => tag.toString().toLowerCase().trim())
      .filter((tag) => ALLOWED_TAGS.has(tag));

    if (!sanitizedTags.length) {
      sanitizedTags.push("mirage");
    }

    res.status(200).json({
      summary: summary || "Paisaje sugerido por IA",
      tags: sanitizedTags,
    });
  } catch (error) {
    console.error("IA endpoint error", error);
    res.status(500).json({ error: "Fallo al contactar OpenRouter", detail: error?.message || "unknown" });
  }
}
