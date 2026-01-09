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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Solo POST" });
    return;
  }

  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  let payload = {};
  try {
    payload = JSON.parse(body || "{}");
  } catch (error) {
    res.status(400).json({ error: "JSON inválido" });
    return;
  }

  const prompt = (payload.prompt || "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt requerido" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY no configurada" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      res.status(response.status).json({ error: "OpenAI error", detail: errorText });
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
    res.status(500).json({ error: "Fallo al contactar OpenAI" });
  }
}
