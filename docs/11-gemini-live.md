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

## Variables de entorno

- `GEMINI_API_KEY`: solo en el servidor. Nunca con prefijo `PUBLIC_`.
- `GEMINI_LIVE_MODEL` (opcional): modelo Live. Si no se define se usa `gemini-3.8-live`. `gemini-live-2.5-flash-preview` (el del ejemplo del SDK) ya no existe: la API responde `is not found for API version v1main`. Para ver los modelos Live vigentes, listar `GET /v1beta/models` y filtrar los que soportan `bidiGenerateContent`.

## Plan B de texto

1. **Live en modo texto:** la misma página con el modo "Texto". Los modelos Live actuales rechazan `responseModalities: TEXT` (`The requested combination of response modalities (TEXT) is not supported by the model`). Por eso el token siempre pide `AUDIO` más `outputAudioTranscription`; en modo texto no se reproduce el audio y la transcripción se muestra en streaming. El texto del usuario se envía con `sendRealtimeInput({ text })`. Sirve si falla el micrófono o el audio del lugar.
2. **Sin Live:** si Live no conecta, el Guía responde con una llamada normal desde el servidor (`generateContent`). Pendiente de implementar dentro del chat del Guía.
3. **Sin internet:** respuestas guardadas para los tres casos (pendiente #8).

## Cómo probar

```bash
cp .env.example .env   # poner GEMINI_API_KEY
bun run dev
# abrir http://localhost:4321/prueba-guia, elegir Voz, Iniciar y hablar
```

El micrófono necesita `localhost` o HTTPS.

## Fuentes

- SDK oficial `@google/genai` 3.6.1 (npm), tipos en `dist/genai.d.ts`: `Tokens.create`, `CreateAuthTokenConfig`, `LiveConnectConstraints`, `Live.connect`, `LiveSendRealtimeInputParameters`. Consultado el 26 nov 2026.
- Documentación oficial: <https://ai.google.dev/gemini-api/docs/ephemeral-tokens> y <https://ai.google.dev/gemini-api/docs/live>. **No se pudo abrir desde el entorno donde se escribió este documento.** Hay que revisarla para confirmar el modelo vigente y el formato de audio de entrada (`audio/pcm;rate=16000`). El formato de entrada no aparece en los tipos del SDK.

## Estado

- [x] Mecanismo documentado con fuente (el SDK; falta contrastarlo con la página oficial).
- [ ] Prueba mínima de voz funcionando: con API key real la sesión de voz conecta (26 nov 2026); falta probar la conversación con un micrófono real.
- [x] Plan B de texto: probado con API key real el 26 nov 2026, la respuesta llega en streaming; falta el respaldo sin Live.
