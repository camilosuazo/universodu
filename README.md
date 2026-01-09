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
4. La configuración de Vite (`vite.config.js`) usa `base: "/universodu/"`, así que la web quedará servida en `https://<tu-usuario>.github.io/universodu/`.

## Modo IA (experimental)

- El panel tiene un switch **Modo IA**. Al activarlo, el frontend intentará llamar al endpoint configurado (por defecto `/api/generate`).
- Define tu endpoint así:
  - Localmente: crea un proxy o un worker que corra en `npm run dev` (por ejemplo, un servidor en `localhost:8787` y usa `VITE_AI_ENDPOINT=http://localhost:8787/generate npm run dev`).
  - Producción (GitHub Pages): apunta `VITE_AI_ENDPOINT` a una función serverless (Cloudflare Workers, Vercel, Netlify) que reciba `{ prompt: string }` y responda `{ summary: string, tags: string[] }`. **Nunca** expongas API keys en el frontend; tu endpoint debe manejar la autenticación y filtrado.
- Si la llamada falla o no entrega tags válidos, la UI lanza un aviso no intrusivo y vuelve automáticamente al parser heurístico.

## Robustez y UX

- Detección de WebGL: muestra overlay de incompatibilidad si el navegador no soporta WebGL.
- Errores globales: `window.error` y `unhandledrejection` activan un overlay con instrucciones para recargar.
- Pointer Lock: feedback en el HUD y notificación si el navegador lo bloquea.
- File protocol: overlay con instrucciones para correr un servidor local.
- Registro de prompts: máximo 6 entradas visibles.

## Personalizar el endpoint IA

1. Crea un servicio (Cloudflare Worker / Vercel Function) que procese el prompt y devuelva JSON `{"summary": "texto", "tags": ["cacti", "oasis", ...]}`.
2. Durante el build o dev, define la variable `VITE_AI_ENDPOINT`:
   ```bash
   VITE_AI_ENDPOINT=https://tu-funcion.example.com/api/generate npm run build
   ```
3. Publica tu worker con las credenciales del proveedor (Mantén las API keys ahí, nunca en este repo).

Con eso tienes UniversoDú listo para correr localmente, funcionar sin frameworks server-side y desplegarse en GitHub Pages.
