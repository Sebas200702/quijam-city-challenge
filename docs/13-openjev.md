# OpenJev por API (issue #20)

Fecha: 26 nov 2026. Responsable: Sebastián.

## Decisión

El Decisor usa **OpenJev por API** a través de [Codiv](https://codiv.ai), no un modelo local.

Se descartó correr OpenJev en el portátil: Qwen3-0.6B en CPU tardaba 1 a 1,6 s por decisión, necesitaba un servicio Python aparte, descargaba ~1,5 GB y mandó gente a la zona del estadio al 95 % de aforo.

## El servicio

| Dato | Valor | Fuente |
|---|---|---|
| Endpoint | `POST https://api.codiv.ai/v1/systemone` | [Docs System One](https://codiv.ai/docs/api-reference/system-one) |
| Autenticación | `Authorization: Bearer <key>` (llaves `sk-codiv-…`) | Docs |
| Modelo | `openjev-latest` (hoy `openjev-0.1`: DiffusionGemma 26B-A4B) | [Docs Models](https://codiv.ai/docs/api-reference/models) |
| Costo | Gratis: "Free public experiment", sin tarjeta | [codiv.ai](https://codiv.ai) |
| Cuota | 100M tokens de entrada por cuenta "while the experiment runs" | codiv.ai |
| Límite | 1.200 peticiones por minuto por llave (docs); la página principal dice 60 | [Docs Rate limits](https://codiv.ai/docs/guides/rate-limits) |
| Compatibilidad | Mismo formato que la API oficial de Jev (`https://api.typesafe.ai`) | Docs |

**Riesgo:** es un experimento gratuito sin fecha de fin ni precio publicado. Puede cambiar o cerrar sin aviso. Por eso el puntaje ponderado sigue siendo obligatorio como plan B.

## Implementación

| Archivo | Qué hace |
|---|---|
| `src/lib/openjev/openjev-types.ts` | Tipos de preguntas (`choice`, `noul`, `score`), respuestas y errores. |
| `src/lib/openjev/openjev-client.ts` | Cliente HTTP. Nunca lanza excepción ante fallas de la API: devuelve `{ ok: false, reason }` para que el Decisor use el puntaje ponderado. Timeout por defecto: 4 s. |
| `src/lib/openjev/openjev-server.ts` | Crea el cliente desde las variables de entorno. Devuelve `null` si no hay llave. Solo servidor. |
| `src/lib/openjev/openjev-client.test.ts` | 11 pruebas con `fetch` simulado. |
| `scripts/openjev-probe.ts` | Prueba contra la API real (`bun run openjev:probe`). |

Motivos de falla que devuelve el cliente: `unauthorized`, `rate_limited`, `quota_exceeded`, `bad_request`, `unavailable`, `invalid_response`, `timeout`, `network_error`.

Variables de entorno (solo servidor, nunca con prefijo `PUBLIC_`):

```bash
TYPESAFE_API_KEY=      # requerida para usar OpenJev
TYPESAFE_BASE_URL=     # opcional, por defecto https://api.codiv.ai
OPENJEV_MODEL=         # opcional, por defecto openjev-latest
```

## Uso desde el Decisor (#18)

```ts
import { getOpenJevClient } from "../openjev/openjev-server";

const client = getOpenJevClient();
const result = client
	? await client.decide(state, { route: { type: "choice", instructions, criteria } })
	: null;

if (!result?.ok || result.answers.route.type !== "choice" || result.answers.route.confidence < MIN_CONFIDENCE) {
	// usar el puntaje ponderado
}
```

Orden obligatorio:

1. **Reglas duras primero:** descartar rutas con arroyo activo, rutas no accesibles en modo accesible y zonas con aforo alto. OpenJev solo elige entre opciones seguras.
2. **OpenJev elige** y devuelve probabilidad y confianza.
3. **Puntaje ponderado** si la API falla o la confianza es baja.

## Resultados contra la API real

Script: `scripts/openjev-probe.ts`, 3 corridas por decisión, mismo estado que la prueba local.

| Decisión | Elección | Probabilidad | Confianza | Latencia |
|---|---|---|---|---|
| Ruta Malecón → Estadio | `bus_transmetro` | 0,84 a 0,91 | 0,57 a 0,71 | 1.587 ms la primera, luego 459 a 475 ms |
| Desvío desde el Malecón saturado | `barrio_abajo` | 0,996 a 0,998 | 0,97 a 0,99 | 455 a 496 ms |

Comparado con la prueba local (Qwen3-0.6B en CPU):

| | Local | API |
|---|---|---|
| Desvío de multitudes | `estadio_area` (incorrecto) | `barrio_abajo` (correcto) |
| Confianza | 0,35 a 0,42 | 0,57 a 0,99 |
| Latencia | 1,0 a 1,6 s | ~0,5 s |
| Repetibilidad | Idéntica en 3 corridas | Misma elección; probabilidades varían levemente |

## Nuevos usos (27 nov 2026)

OpenJev deja de usarse solo en el Decisor. Mismo patrón en todos los usos: reglas duras primero, OpenJev elige entre opciones fijas con su confianza, respaldo sin OpenJev.

| Uso | Archivo | Preguntas | Respaldo |
|---|---|---|---|
| Decisor: ruta y desvío | `src/lib/decider/` | `route`, desvío (`choice`) | Puntaje ponderado |
| Moderación por triaje | `src/lib/moderation/triage.ts` | `verdict` (publish, review, reject), `label` (ok, harassment, hate, threat, sexual, spam, scam, off_topic), `priority` (none, city_attention, emergency) | Solo reglas duras |
| Enrutamiento de Quillart AI | `src/lib/assistant/orchestrator.ts` | Un `choice` con los seis agentes, solo si las palabras clave no deciden | Agente por defecto |

Reglas de la moderación:

- Las reglas duras rechazan datos personales, odio y amenazas **antes** de llamar a OpenJev: ese texto nunca sale del servidor.
- Gana el veredicto más estricto entre reglas y OpenJev.
- Un `reject` de OpenJev con confianza menor a **0,6** (`MIN_REJECT_CONFIDENCE`) se convierte en revisión humana.
- Detalle en [20-comunidad-y-moderacion.md](20-comunidad-y-moderacion.md) y [21-quillart-ai.md](21-quillart-ai.md).

## Privacidad

El estado de cada decisión sale a un tercero. Solo se envían datos simulados y conteos anónimos: nunca ubicación exacta, nombres ni datos personales (Ley 1581 de 2012). En la moderación se envía el texto público que la persona quiere publicar, sin autor ni cuenta, y solo si las reglas no encontraron datos personales. En el enrutamiento se envía solo el mensaje.

## Pendiente

- Definir el umbral de confianza mínima (`MIN_CONFIDENCE`) junto con el Decisor (#18).
- Depende del internet del evento: el plan B sin internet es el pendiente #8.
