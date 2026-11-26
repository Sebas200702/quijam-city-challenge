# Conexión segura con Gemini Live

Issue #21. Cómo conecta el navegador con Gemini Live sin exponer la API key.

## Mecanismo: tokens efímeros

1. El navegador llama a `POST /api/guide/token?mode=audio|text`.
2. El servidor (Astro) usa `GEMINI_API_KEY` para pedir a Gemini un **token efímero** con `ai.authTokens.create(...)`.
3. El navegador recibe solo el token y lo usa como `apiKey` del SDK con `apiVersion: "v1alpha"` para abrir `ai.live.connect(...)`.

La API key nunca sale del servidor. Si alguien copia el token, sirve una sola vez y caduca pronto.

| Parámetro | Valor nuestro | Valor por defecto del SDK | Máximo |
|---|---|---|---|
| `uses` | 1 | 1 | 0 = sin límite |
| `newSessionExpireTime` (abrir sesión) | 60 s | 60 s | < 20 h |
| `expireTime` (duración de la sesión) | 30 min | 30 min | < 20 h |
| `liveConnectConstraints` | modelo, modalidad e instrucción del Guía, bloqueados | sin bloquear | — |

Restricciones según el SDK:

- Los tokens efímeros solo existen en la **Gemini Developer API** (no en Vertex AI).
- Solo funcionan en **`v1alpha`** y solo para la Live API.
- La función es **experimental**.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/pages/api/guide/token.ts` | Endpoint que emite el token. |
| `src/lib/guide/live-token-config.ts` | Configuración del token (usos, tiempos, modelo bloqueado). |
| `src/lib/guide/live-session.ts` | Cliente del navegador: pide el token y abre la sesión Live. |
| `src/lib/guide/pcm-audio.ts` | Conversión de audio: entra PCM16 a 16 kHz, sale PCM16 a 24 kHz. |
| `src/components/guide-live-test.tsx` y `src/pages/prueba-guia.astro` | Página de prueba en `/prueba-guia`. |
| `scripts/test-guide-live.mjs` | Prueba de punta a punta con micrófono falso. |

## Variables de entorno

- `GEMINI_API_KEY`: solo en el servidor. Nunca con prefijo `PUBLIC_`.
- `GEMINI_LIVE_MODEL` (opcional): modelo Live. Si no se define se usa `gemini-live-2.5-flash-preview`, que es el nombre del ejemplo del SDK. **Hay que confirmar en Google AI Studio cuál es el modelo Live vigente.**

## Plan B de texto

1. **Live en modo texto:** la misma página con el modo "Texto". El token bloquea `responseModalities: TEXT` y se envía con `sendClientContent`. Sirve si falla el micrófono o el audio del lugar.
2. **Sin Live:** si Live no conecta, el Guía responde con una llamada normal desde el servidor (`generateContent`). Pendiente de implementar dentro del chat del Guía.
3. **Sin internet:** respuestas guardadas para los tres casos (pendiente #8).

## Cómo probar

```bash
cp .env.example .env   # poner GEMINI_API_KEY
bun run dev
# abrir http://localhost:4321/prueba-guia, elegir Voz, Iniciar y hablar
```

El micrófono necesita `localhost` o HTTPS.

### Prueba automática (sin micrófono real)

`scripts/test-guide-live.mjs` abre `/prueba-guia` en Chromium con un micrófono falso que reproduce una pregunta en inglés generada con `espeak-ng`. Comprueba cuatro cosas:

1. El endpoint emite el token y la respuesta no contiene la API key.
2. El modo texto responde.
3. Gemini transcribe la pregunta de voz.
4. El Guía responde con audio.

Necesita la app corriendo con `GEMINI_API_KEY`, Playwright con Chromium, `espeak-ng` y `ffmpeg`.

```bash
bun run build && node dist/server/entry.mjs &   # o bun run dev
bun run test:guide-live                         # opcional: URL base como argumento
```

En modo voz, el token pide también la transcripción de entrada y de salida. La página la muestra como subtítulos ("Tú (voz)", "Guía (voz)").

## Fuentes

- SDK oficial `@google/genai` 3.6.1 (npm), tipos en `dist/genai.d.ts`: `Tokens.create`, `CreateAuthTokenConfig`, `LiveConnectConstraints`, `Live.connect`, `LiveSendRealtimeInputParameters`. Consultado el 26 nov 2026.
- Documentación oficial: <https://ai.google.dev/gemini-api/docs/ephemeral-tokens> y <https://ai.google.dev/gemini-api/docs/live>. **No se pudo abrir desde el entorno donde se escribió este documento.** Hay que revisarla para confirmar el modelo vigente y el formato de audio de entrada (`audio/pcm;rate=16000`). El formato de entrada no aparece en los tipos del SDK.

## Estado

- [x] Mecanismo documentado con fuente (el SDK; falta contrastarlo con la página oficial).
- [ ] Prueba mínima de voz funcionando: el código está listo, pero falta probarlo con una API key real y un micrófono.
- [x] Plan B de texto: el modo texto de Live está implementado; falta el respaldo sin Live.
