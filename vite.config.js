import { defineConfig, loadEnv } from "vite";

const basePath = process.env.BASE_PATH || "/";

// Custom plugin to handle /api/generate in development
function apiPlugin(env) {
  return {
    name: "api-handler",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/generate" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const data = JSON.parse(body);
              const prompt = data.prompt || "";

              const openaiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
                  "HTTP-Referer": "http://localhost:5173",
                  "X-Title": "UniversoDu",
                },
                body: JSON.stringify({
                  model: "meta-llama/llama-3.2-3b-instruct:free",
                  temperature: 0.7,
                  messages: [
                    {
                      role: "system",
                      content: `Eres el generador de UniversoDú, un desierto 3D mágico. SOLO puedes crear estos tipos de objetos:

TIPOS DISPONIBLES: mountain, temple, pyramid, statue, tower, structure, ruins, monolith, bridge, arch, pillar, well, oasis, water, waterfall, pond, river, geyser, hot_spring, tree, palm, flora, bush, flower, mushroom, grass, cacti, crystal, rock, boulder, dune, cliff, mesa, canyon, skull, bones, fossil, campfire, tent, nomad, creature, sentinel, totem, portal, aurora, nebula, comet, storm, lightning, mirage, fireflies, human, person, figure, bird, eagle, hawk, fish, deer, wolf, dog, horse, animal, sea, ocean, river_detailed, lake_detailed

IMPORTANTE: Si el usuario pide algo que NO existe (como avión, carro, edificio moderno), usa los tipos más cercanos disponibles y adapta creativamente. Para personas/humanos usa "human". Para animales usa: bird, fish, deer, wolf, horse. Para grandes cuerpos de agua usa "sea" u "ocean".

Responde SOLO JSON válido:
{"summary":"descripción corta","tags":["rocks","flora"],"entities":[{"type":"mountain","quantity":2,"size":"huge"},{"type":"crystal","quantity":4,"color":"#00ff00"}]}

Campos de entities: type (obligatorio), quantity (1-8), color (hex), size (tiny/small/medium/large/huge)`,
                    },
                    {
                      role: "user",
                      content: prompt,
                    },
                  ],
                }),
              });

              if (!openaiResponse.ok) {
                const errorText = await openaiResponse.text();
                console.error("OpenAI error:", errorText);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Error de OpenAI" }));
                return;
              }

              const result = await openaiResponse.json();
              const content = result.choices?.[0]?.message?.content || "";

              // Parse the AI response - extract JSON from potentially mixed content
              let parsed;
              try {
                let cleaned = content.trim();

                // Remove markdown code blocks
                if (cleaned.includes("```")) {
                  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
                  if (match) cleaned = match[1].trim();
                }

                // Try to find JSON object in the response
                const jsonMatch = cleaned.match(/\{[\s\S]*"summary"[\s\S]*"entities"[\s\S]*\}/);
                if (jsonMatch) {
                  cleaned = jsonMatch[0];
                }

                parsed = JSON.parse(cleaned);

                // Validate and fix entity types
                if (parsed.entities) {
                  parsed.entities = parsed.entities.map(e => ({
                    ...e,
                    type: e.type?.toLowerCase().replace(/[^a-z_]/g, '') || 'rock'
                  }));
                }
              } catch (e) {
                console.error("Parse error:", e.message);
                // Fallback: generate something based on keywords in the prompt
                const lower = prompt.toLowerCase();
                const entities = [];
                if (lower.includes("verde") || lower.includes("green")) entities.push({ type: "tree", quantity: 3, color: "#00ff00" });
                if (lower.includes("roca") || lower.includes("rock")) entities.push({ type: "rock", quantity: 4 });
                if (lower.includes("cristal") || lower.includes("crystal")) entities.push({ type: "crystal", quantity: 3 });
                if (lower.includes("montaña") || lower.includes("mountain")) entities.push({ type: "mountain", quantity: 2 });
                if (lower.includes("humano") || lower.includes("persona") || lower.includes("human") || lower.includes("person")) entities.push({ type: "human", quantity: 2 });
                if (lower.includes("pájaro") || lower.includes("ave") || lower.includes("bird")) entities.push({ type: "bird", quantity: 3 });
                if (lower.includes("pez") || lower.includes("fish")) entities.push({ type: "fish", quantity: 4 });
                if (lower.includes("ciervo") || lower.includes("deer")) entities.push({ type: "deer", quantity: 2 });
                if (lower.includes("lobo") || lower.includes("wolf")) entities.push({ type: "wolf", quantity: 2 });
                if (lower.includes("caballo") || lower.includes("horse")) entities.push({ type: "horse", quantity: 2 });
                if (lower.includes("mar") || lower.includes("océano") || lower.includes("sea") || lower.includes("ocean")) entities.push({ type: "sea", quantity: 1 });
                if (lower.includes("río") || lower.includes("river")) entities.push({ type: "river_detailed", quantity: 1 });
                if (lower.includes("lago") || lower.includes("lake")) entities.push({ type: "lake_detailed", quantity: 1 });
                if (entities.length === 0) entities.push({ type: "mirage", quantity: 1 }, { type: "rock", quantity: 3 });
                parsed = { summary: "Paisaje generado", tags: ["mirage"], entities };
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(parsed));
            } catch (error) {
              console.error("API error:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: error.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: basePath,
    plugins: [apiPlugin(env)],
  };
});
