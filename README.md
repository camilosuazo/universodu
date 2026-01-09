# UniversoDú — Desierto generativo

Experiencia 3D en primera persona construida con Vite + Three.js para explorar un desierto reactivo a tus prompts. Pensado para publicarse como sitio estático en GitHub Pages (repo `universodu`).

## Diagnóstico del problema original

El HTML heredado vivía dentro de Django y tenía el módulo Three.js incrustado manualmente. Durante la migración previa el archivo quedó con varios errores de sintaxis (`oasis add(...)`, `leaves.position set(...)`, etc.), así que el navegador abortaba el script antes de inicializar Three.js. Añadí `console.log("UniversoDú boot")` al nuevo entrypoint (`src/main.js`) para verificar la carga y reconstruí todo el código en módulos para evitar ese fallo.

## Estructura del proyecto

```
/
├─ index.html          # raíz estática lista para GitHub Pages
├─ src/
│  ├─ main.js          # bootstrap + detecciones + IA opcional
│  ├─ ui.js            # HUD, panel, overlays, toasts
│  └─ world.js         # escena Three.js, controles, spawns
├─ assets/             # recursos compartidos (logo, etc.)
├─ vite.config.js      # base configurado a /universodu/
├─ package.json        # scripts npm (dev/build/preview)
└─ .github/workflows/deploy.yml # GH Actions para Pages
```

## Requisitos previos

- Node.js 18+ (recomendado 20)
- npm (se instala con Node)

## Uso local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Desarrollar con Vite (hot reload):
   ```bash
   npm run dev
   ```
   Abre el enlace que te entregue Vite (`http://localhost:5173`).
3. Simular build estática:
   ```bash
   npm run build
   npm run preview
   ```

### ¿Y si solo quiero doble clic en `index.html`?

- Navegadores modernos bloquean los imports desde `file://`. El proyecto detecta este modo y muestra un overlay con un botón **“Abrir en modo servidor local”** que copia los comandos (`npm install`, `npm run dev`) y explica cómo levantar Vite.
- Si aún así deseas forzar el modo archivo, asegúrate de haber corrido `npm install`; el import map automático apuntará a `./node_modules/three/...`. Algunos navegadores (Chrome) siguen bloqueando WebGL + PointerLock en `file://`, por lo que el modo servidor es el camino recomendado.

## Deploy en GitHub Pages

1. Crea el repositorio `universodu` en GitHub y sube este código.
2. La acción `Deploy to GitHub Pages` ya viene configurada. Cada push a `main` ejecuta:
   - `npm install`
   - `npm run build`
   - `actions/upload-pages-artifact`
   - `actions/deploy-pages`
3. En la configuración de Pages de tu repo, selecciona “GitHub Actions” como fuente si aún no lo está.
4. La configuración de Vite usa la variable `BASE_PATH`. El workflow ya ejecuta `BASE_PATH=/universodu npm run build`, así que la web quedará servida en `https://<tu-usuario>.github.io/universodu/`.

Si compilas localmente para GitHub Pages, ejecuta manualmente:
```bash
BASE_PATH=/universodu npm run build
```
Para otros despliegues (por ejemplo Vercel) deja `BASE_PATH` vacío y todo se servirá desde la raíz (`/`).

## Modo IA (experimental)

- El panel tiene un switch **Modo IA**. Al activarlo, el frontend intenta llamar al endpoint configurado (por defecto `/api/generate`).
- Define tu endpoint así:
  - Localmente: levanta la función serverless (por ejemplo `vercel dev`) y corre `VITE_AI_ENDPOINT=http://127.0.0.1:3000/api/generate npm run dev` para que el frontend apunte ahí.
  - Producción: usa una función serverless (Cloudflare Workers, Vercel, Netlify) que reciba `{ prompt: string }` y responda `{ summary: string, tags: string[] }`. **Nunca** expongas API keys en el frontend; el backend debe autenticarse contra OpenAI u otro proveedor.
- Si la llamada falla o no entrega tags válidos, la UI lanza un aviso no intrusivo y vuelve automáticamente al parser heurístico.

### Endpoint de referencia (`/api/generate`)

Este repo incluye `api/generate.js`, lista para desplegarse en Vercel como función serverless. Hace lo siguiente:

1. Recibe `POST` con `{ prompt }`.
2. Usa la variable de entorno `OPENROUTER_API_KEY` para invocar el modelo (por defecto `nousresearch/hermes-3-llama-3.1-8b`, configurable con `OPENROUTER_MODEL`) y pedir un JSON con `summary` + `tags`.
3. Sanitiza las etiquetas para que solo existan los valores admitidos por el frontend (cacti, rocks, oasis, ruins, crystals, mirage, fireflies, totems).
4. Devuelve `{ summary, tags }` o un error descriptivo.

Para usarla en local:

```bash
npm install -g vercel          # una vez
vercel dev                     # expone http://127.0.0.1:3000/api/generate

# En otra terminal
VITE_AI_ENDPOINT=http://127.0.0.1:3000/api/generate npm run dev
```

En Vercel únicamente debes definir la variable `OPENAI_API_KEY` en Project Settings (ver sección final).

> Nota: la función maneja CORS y responde OPTIONS, así que el frontend puede llamarla desde cualquier origen siempre que `OPENAI_API_KEY` esté configurada.

## Robustez y UX

- Detección de WebGL: muestra overlay de incompatibilidad si el navegador no soporta WebGL.
- Errores globales: `window.error` y `unhandledrejection` activan un overlay con instrucciones para recargar.
- Pointer Lock: feedback en el HUD y notificación si el navegador lo bloquea.
- File protocol: overlay con instrucciones para correr un servidor local.
- Registro de prompts: máximo 6 entradas visibles.

## Personalizar / desplegar el endpoint IA en Vercel

1. **Importa el repo en Vercel** (botón “New Project” → selecciona `universodu`). El framework detectado debe ser “Vite”.
2. **Variables de entorno** (Project Settings → Environment Variables):
   - `OPENROUTER_API_KEY` → tu key de OpenRouter (solo en Vercel).
   - *(Opcional)* `OPENROUTER_MODEL` → otro modelo compatible, si no quieres el valor por defecto.
   - `VITE_AI_ENDPOINT` → `https://<tu-proyecto>.vercel.app/api/generate` (ajusta `<tu-proyecto>` al subdominio que uses).
   - *(Opcional)* `OPENROUTER_SITE_URL` y `OPENROUTER_APP_NAME` → encabezados recomendados por OpenRouter para referenciar tu dominio/aplicación.
3. Guarda los cambios y despliega. Vercel ejecutará:
   ```bash
   npm install
   npm run build   # genera dist/
   ```
   y servirá `dist/` como sitio estático junto a la función `/api/generate`. No definas `BASE_PATH` en Vercel (se usa `/`).

### Cómo queda el flujo

- **Frontend (UniversoDú)** → lee `VITE_AI_ENDPOINT` y hace `fetch` cuando activas “Modo IA”.
- **Backend (Vercel Function)** → recibe el prompt y llama a OpenRouter con `OPENROUTER_API_KEY`. Puedes cambiar el modelo (`OPENROUTER_MODEL`) o el prompt del sistema editando `api/generate.js`.
- **Seguridad** → tu clave solo vive en Vercel; si necesitas rotarla, hazlo desde su panel y vuelve a desplegar.

Si prefieres otro proveedor (Cloudflare Worker, Netlify, Fly, etc.), sigue la misma idea: expone un endpoint HTTPS que hable con OpenAI usando variables del servidor y configura `VITE_AI_ENDPOINT` apuntándolo a ese dominio.

Con eso tienes UniversoDú listo para correr localmente, funcionar sin frameworks server-side, desplegarse en GitHub Pages y consumir IA real cuando esté disponible.
