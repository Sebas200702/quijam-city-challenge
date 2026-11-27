# Conexión segura con Gemini Live

Issue #21. Cómo conecta el navegador con Gemini Live sin exponer la API key.

> **Actualización 27 nov 2026:** la voz es ahora **solo un conducto** hacia Quillart AI ([28-quillart-ai.md](28-quillart-ai.md)). En la app la voz usa la Web Speech API del navegador (habla a texto y texto a habla) y entra al mismo orquestador y agentes que el texto.
>
> **Issue #94:** Gemini Live ya está en la conversación principal con el botón "Voz en vivo (beta)". Usa el mismo orquestador, los mismos agentes, las mismas herramientas y la misma regla de confirmación (ver [Live con herramientas](#live-con-herramientas-issue-94)). `/prueba-guia` sigue como prueba del Guía sin herramientas.

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
| `liveConnectConstraints` | modelo, modalidad, instrucción y (en la conversación) herramientas del agente, bloqueados | sin bloquear | — |

Restricciones según el SDK:

- Los tokens efímeros solo existen en la **Gemini Developer API** (no en Vertex AI).
- Solo funcionan en **`v1alpha`** y solo para la Live API.
- La función es **experimental**.

## Live con herramientas (issue #94)

1. Al tocar "Voz en vivo (beta)", el navegador llama a `POST /api/guide/token?mode=audio` con la conversación (`messages`, como mucho 20) y el `context`, en el mismo formato que `/api/assistant`.
2. El servidor valida con `parseAssistantRequest` y elige el agente con `routeMessage`, el mismo orquestador del texto. Sin conversación usa el agente por defecto; si lo último fue una respuesta del asistente, sigue con ese agente.
3. El token bloquea la instrucción del agente (`systemInstructionFor`, la misma del texto, más reglas de voz) y sus herramientas (`toolDeclarationsFor`, las mismas declaraciones que `gemini-agent.ts`). También pide la transcripción de lo que dice la persona, para escribirla en el chat.
4. Las llamadas a herramientas (`toolCall`) pasan por la lista del agente, `sanitizeToolArgs` y la regla de una acción por turno (`toLiveToolCalls`). Lo que no pasa se responde con error y no se ejecuta.
5. Las lecturas corren al momento en el navegador con la sesión de la persona (`runTool` de `tool-executor.ts`) y vuelven a Live con `sendToolResponse`.
6. Las acciones van a la misma tarjeta de confirmación del texto (`PendingAction` en `use-assistant.ts`). El modelo dice en voz alta qué va a hacer y el navegador lee "Revisa la tarjeta en pantalla y confirma". Solo se ejecuta si la persona confirma en la tarjeta. Cancelar, escribir otro mensaje, cerrar Live o que Gemini retire la llamada (`toolCallCancellation`) la cuentan como no hecha.
7. Si Live no conecta o se cae, el chat lo dice y sigue con el micrófono del navegador (Web Speech API) y el texto (`live-status.ts`).

**Cambio de página (pendiente S4):** la app no tiene router de cliente, así que un resultado que abre otra página la recarga y la sesión Live se cierra. Al salir con Live activo, el dock marca `quillart.live.resume` en `sessionStorage` (`live-resume.ts`, válido 30 s y de un solo uso); el dock de la página nueva lo toma, reabre Live con la conversación guardada como historia y muestra "La voz en vivo siguió contigo en esta página". El navegador puede dejar el audio suspendido hasta el primer toque: `live-audio.ts` lo reanuda con el primer toque o tecla.

**Acción confirmada después (pendiente S4):** `confirmedActionNote` (`live-conduit.ts`) arma el aviso para Live con el resultado de la tarjeta y la respuesta de Quillart AI. Falta conectarlo: `use-live-voice.ts` necesita un `notify` (`sendClientContent`) y el dock debe llamarlo al confirmar o cancelar.

Límite conocido: el agente se elige al abrir la sesión. Para cambiar de apartado a mitad de la conversación hay que terminar y volver a abrir la voz en vivo.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/pages/api/guide/token.ts` | Endpoint que emite el token. |
| `src/lib/guide/live-token-config.ts` | Configuración del token (usos, tiempos, modelo bloqueado). |
| `src/lib/guide/live-session.ts` | Cliente del navegador: pide el token y abre la sesión Live (Guía o agente). |
| `src/lib/guide/live-agent.ts` | Valida la petición del token, elige el agente con el orquestador y arma su instrucción y herramientas. |
| `src/lib/guide/live-tool-calls.ts` | Convierte las llamadas de Live en llamadas del asistente y los resultados en respuestas para Live. |
| `src/lib/guide/live-resume.ts` | Marca de un solo uso para reabrir Live en la página siguiente. |
| `src/lib/guide/live-status.ts` | Estados de la voz en vivo y respaldo con Web Speech API y texto. |
| `src/lib/guide/live-audio.ts` | Micrófono y reproducción de audio de Live. |
| `src/components/assistant/use-live-voice.ts` | Hook del chat que conecta Live con `use-assistant.ts`. |
| `src/lib/guide/pcm-audio.ts` | Conversión de audio: entra PCM16 a 16 kHz, sale PCM16 a 24 kHz. |
| `src/components/guide-live-test.tsx` y `src/pages/prueba-guia.astro` | Página de prueba en `/prueba-guia`. |

## Variables de entorno

- `GEMINI_API_KEY`: solo en el servidor, leída con `getSecret()` de `astro:env/server`. Nunca con prefijo `PUBLIC_`.
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
# o abrir http://localhost:4321/inicio y tocar "Voz en vivo (beta)"
```

Prueba manual de herramientas (necesita API key real y una cuenta): pedir por voz "¿qué planes hay este fin de semana?" (lectura, sale la lista) y luego "inscríbeme en el primero" (sale la tarjeta y se oye el aviso; solo se inscribe al confirmar).

El micrófono necesita `localhost` o HTTPS.

## Fuentes

- SDK oficial `@google/genai` 3.6.1 (npm), tipos en `dist/genai.d.ts`: `Tokens.create`, `CreateAuthTokenConfig`, `LiveConnectConstraints`, `Live.connect`, `LiveSendRealtimeInputParameters`. Consultado el 26 nov 2026.
- Herramientas en Live (27 nov 2026): `LiveConnectConfig.tools`, `inputAudioTranscription`, `LiveServerMessage.toolCall` (`LiveServerToolCall.functionCalls`), `toolCallCancellation` y `Session.sendToolResponse({ functionResponses })` en `dist/genai.d.ts` 3.6.1, y la documentación del SDK en Context7 (`/googleapis/js-genai`, `docs/classes/live.Session.html`). Falta confirmar con una sesión real que el token acepta `tools` dentro de `liveConnectConstraints`.
- Documentación oficial: <https://ai.google.dev/gemini-api/docs/ephemeral-tokens> y <https://ai.google.dev/gemini-api/docs/live>. **No se pudo abrir desde el entorno donde se escribió este documento.** Hay que revisarla para confirmar el modelo vigente y el formato de audio de entrada (`audio/pcm;rate=16000`). El formato de entrada no aparece en los tipos del SDK.

## Estado

- [x] Mecanismo documentado con fuente (el SDK; falta contrastarlo con la página oficial).
- [ ] Prueba mínima de voz funcionando: con API key real la sesión de voz conecta (26 nov 2026); falta probar la conversación con un micrófono real.
- [x] Plan B de texto: probado con API key real el 26 nov 2026, la respuesta llega en streaming.
- [x] Respaldo sin Live en la conversación principal: Web Speech API y texto (#94).
- [ ] Live con herramientas (#94): construido y probado con pruebas unitarias; falta probarlo con API key real y micrófono.
