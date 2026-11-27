# QUIJAM · City Challenge Barranquilla 2034

> Repositorio de trabajo del equipo para el QUIJAM City Challenge.
> **QUILLART, el intérprete de la ciudad.** Hace que Barranquilla se entienda, para el que llega y para el que vive aquí, y hace que la ciudad, por fin, escuche a su gente.
>
> *English summary at the end.*

## El reto

Escenario ficticio: Barranquilla es sede del Mundial 2034. Hay que diseñar un
**programa estratégico** (no una app aislada) que conecte las cinco dimensiones,
con un prototipo demostrable y un legado para después de 2034.

## Nuestra dirección (borrador)

Una plataforma de datos abiertos de ciudad dentro de un programa de tres
componentes. El foco es el visitante del Mundial; el legado para residentes es
obligatorio:

1. **Datos abiertos de ciudad:** transporte y tarifas, agenda cultural,
   calendario del Mundial, arroyos y clima.
2. **Red de anfitriones y negocios verificados:** duplas intergeneracionales,
   comités de barrio, negocios populares.
3. **Plataforma:** aplicación web para el visitante, QR en paraderos y
   estaciones existentes, tablero para la ciudad.

Corredor piloto: Estadio Metropolitano – Troncal Murillo – Centro – Barrio Abajo – Gran Malecón.

**Actualización 27 nov 2026.** QUILLART es una plataforma ciudadana real, no un
gemelo virtual. Conecta a residentes de Barranquilla y visitantes entre sí y con
la ciudad:

- **Quillart AI es la puerta de entrada** (`/inicio`): una conversación que
  permite conocer la ciudad y ejecutar acciones. Un orquestador elige entre seis
  agentes especializados (Agenda, Comunidad, Lugares y naturaleza, Movilidad,
  Reportes a la ciudad y Cuenta). La voz es solo el conducto. Toda acción se
  confirma antes de ejecutarse.
- **Comunidad:** cada persona publica sus eventos, se inscribe con cupos, abre
  conversaciones en el foro y descubre espacios públicos y naturaleza. Se navega
  sin cuenta; la cuenta solo se pide para participar.
- **Moderación por triaje:** reglas duras y OpenJev revisan cada publicación;
  lo dudoso va a revisión humana y los avisos de problemas llegan a la cola de la
  ciudad (`/moderacion`).
- Landing en `/`. El mapa del corredor es un apartado más y la semilla del
  corredor se marca como "datos de referencia".

Detalle en [`docs/`](docs/).

## Entregables

- Programa estratégico
- Prototipo (MVP web con escenarios y datos simulados de 2034)
- Presentación en PowerPoint (orden del pitch: problema, propuesta, programa, prototipo, impacto)
- Video de máximo 5 minutos

## Rúbrica

| Criterio | Puntos |
|---|---|
| Visión estratégica e integralidad | 20 |
| Integración de las cinco líneas | 15 |
| Desarrollo y madurez del prototipo | 15 |
| Comprensión del problema y pertinencia | 10 |
| Innovación y diferenciación | 10 |
| Viabilidad, sostenibilidad e impacto | 10 |
| Evolución, colaboración y desempeño en sprints | 10 |
| Comunicación, presentación y video | 10 |

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/01-reto-y-rubrica.md`](docs/01-reto-y-rubrica.md) | Reto, rúbrica y diapositivas clave del deck del organizador |
| [`docs/02-decisiones.md`](docs/02-decisiones.md) | Decisiones tomadas y bitácora de evolución |
| [`docs/03-diseno-actual.md`](docs/03-diseno-actual.md) | Diseño actual: problema, programa, arquitectura, dimensiones, casos de uso, indicadores, hoja de ruta |
| [`docs/04-cifras-verificadas.md`](docs/04-cifras-verificadas.md) | Cifras verificadas con fuente y cifras que no deben usarse |
| [`docs/05-riesgos.md`](docs/05-riesgos.md) | Riesgos abiertos |
| [`docs/06-pendientes.md`](docs/06-pendientes.md) | Decisiones pendientes y siguiente paso |
| [`docs/07-sistema-de-diseno.md`](docs/07-sistema-de-diseno.md) | Sistema de diseño (propuesta): tokens, temas, componentes, iconos e ilustraciones. Código en [`design-system/`](design-system/) |
| [`docs/08-metodologia.md`](docs/08-metodologia.md) | Sprints del bootcamp, flujo por cambio, gestión de tareas, roles y acuerdos |
| [`docs/09-convenciones.md`](docs/09-convenciones.md) | Idioma, ramas, commits, PR, revisión, código, datos y documentos |
| [`docs/10-stack.md`](docs/10-stack.md) | Stack técnico, verificación y arquitectura de despliegue |
| [`docs/11-modelo-datos.md`](docs/11-modelo-datos.md) | Modelo de datos del corredor en Supabase: esquema, RLS y semilla |
| [`docs/12-alineacion-rubrica.md`](docs/12-alineacion-rubrica.md) | Cada criterio de la rúbrica: qué tenemos, qué falta, qué resaltar; cinco lecciones y referentes |
| [`docs/13-openjev.md`](docs/13-openjev.md) | OpenJev por API: servicio, implementación, resultados y privacidad |
| [`docs/14-desvio-barrio-abajo.md`](docs/14-desvio-barrio-abajo.md) | Desvío de multitudes a Barrio Abajo: reglas, beneficio y riesgo de desplazamiento (borrador) |
| [`docs/15-recursos-y-alianzas.md`](docs/15-recursos-y-alianzas.md) | Aliados, aportes, capacitación y sostenibilidad después de 2034 |
| [`docs/16-costos-estimados.md`](docs/16-costos-estimados.md) | Tabla de costos estimados por rubro con rangos y supuestos visibles |
| [`docs/17-informe-impacto.md`](docs/17-informe-impacto.md) | Informe de impacto con IA: cifras agregadas, verificación de números y respaldo sin IA |
| [`docs/18-simulador-multitudes.md`](docs/18-simulador-multitudes.md) | Simulador de multitudes: eventos, reglas del desvío, conteos y rendimiento |
| [`docs/19-caso-1.md`](docs/19-caso-1.md) | Caso 1 de punta a punta: requisitos, guion de ensayo de 2 minutos, plan B y registro de ensayos |
| [`docs/20-identidad.md`](docs/20-identidad.md) | Identidad: el intérprete de la ciudad, qué no somos (gemelo digital), vocabulario y orden de la demo |
| [`docs/21-respuestas.md`](docs/21-respuestas.md) | Qué responder cuando pregunten por el proyecto: versiones de 10 s, 30 s y 1 min, y preguntas difíciles |
| [`docs/22-seguridad-y-confianza.md`](docs/22-seguridad-y-confianza.md) | Seguridad y confianza: desinformación, suplantación, estafas, reportes, límites de uso, IA blindada y derechos sobre los datos |
| [`docs/23-jergas-costenas.md`](docs/23-jergas-costenas.md) | Diccionario de jergas costeñas y barranquilleras: significado, registro, uso en Quillart y reglas para hablar local con medida |
| [`docs/24-datos-faltantes-ui.md`](docs/24-datos-faltantes-ui.md) | Datos que faltan para que las pantallas de la maqueta y los componentes rediseñados funcionen con datos reales, por superficie, con propuestas de esquema y de eventos |
| [`docs/25-arbol-de-causas-y-actores.md`](docs/25-arbol-de-causas-y-actores.md) | Árbol de causas y mapa de actores del problema |
| [`docs/26-arquitectura-de-informacion.md`](docs/26-arquitectura-de-informacion.md) | Arquitectura de información: las 5 superficies, Quillart AI como inicio, cuenta solo para participar, avisos, superficie × `city-events`, plan de roles, glosario y guion de prueba |
| [`docs/27-comunidad-y-moderacion.md`](docs/27-comunidad-y-moderacion.md) | Comunidad (eventos, inscripciones, foro, lugares) y moderación por triaje con reglas duras y OpenJev; cola de la ciudad y puesta en marcha |
| [`docs/28-quillart-ai.md`](docs/28-quillart-ai.md) | Quillart AI como puerta de entrada: orquestador, agentes especializados, confirmación de acciones y voz como conducto |
| [`docs/29-gemini-live.md`](docs/29-gemini-live.md) | Conexión segura con Gemini Live: tokens efímeros emitidos por el servidor, variables de entorno y plan B de texto |
| [`docs/30-auditoria-ui-ux.md`](docs/30-auditoria-ui-ux.md) | Auditoría UI/UX v2: hallazgos por severidad y brechas frente al enfoque nuevo (dock del agente, acciones en pantalla, contexto, georreferencia y mapa del Área Metropolitana) |
| [`docs/feedback.md`](docs/feedback.md) | Registro de retroalimentación por sprint y validación con personas ajenas |

## Quillart controla la app

El asistente de texto (y la voz, que le pasa todo por `ask_quillart`) maneja la pantalla, no solo responde:

- **Un solo orquestador con todas las herramientas.** Con Gemini, cada turno tiene todas las herramientas; el agente especialista que elige el orquestador solo define el foco y la etiqueta. Si el enrutamiento falla, el modelo no se queda sin la herramienta que necesita.
- **Herramientas de UI** (actúan de inmediato, sin tarjeta de confirmación y sin otra ronda del modelo): `open_page` (abre la pantalla), `filter_agenda`, `filter_places`, `show_on_map`, `show_route`, `set_language`, `set_theme`, `focus_on` y `go_back`. El servidor las convierte en acciones de UI con lista blanca (`ui-actions.ts`).
- **Acciones de toda la app** (`app.language`, `app.theme`, `app.back`): el bus (`ui-action-bus.ts`) las aplica en cualquier pantalla, con "Deshacer".
- **Jerga costeña** (`lookup_slang`, herramienta de lectura): explica términos del glosario de `/jerga`, que `open_page` también abre (igual que `/ciudad`).
- **La voz** (Gemini Live) solo tiene `ask_quillart`: cada pedido hablado pasa por el mismo ciclo que el texto (`converse()` en `use-assistant.ts`), aplica las mismas acciones de UI y abre la pantalla nueva cuando termina de decir la respuesta.
- **Sin modelo** (sin `GEMINI_API_KEY` o si falla), los agentes locales entienden los mismos comandos: "modo oscuro", "ponlo en inglés", "abre el mapa", "vuelve atrás", "¿qué significa bololó?".
- Las escrituras (inscribirse, publicar, responder, reportar) siguen pasando por la tarjeta de confirmación, una por turno.

## Equipo

| Integrante | GitHub | Rol |
|---|---|---|
| Sebastián Torregroza | `Sebas200702` | Coordinación y líder técnico: arquitectura, OpenJev, despliegue |
| Santiago Torregroza | `S-kun-2007` | Diseño UI/UX y frontend: mapa del corredor, caso 1 de punta a punta, presentación |
| Esteban Meléndez | `estebann123107` | Investigación y programa estratégico; nombre del producto |
| Angel David Castro | `AngelitoCastro` | Datos y backend: modelo de datos y semilla en Supabase, tablero de ciudad; matriz caso × dimensión; tabla de costos |
| Mateo Cantillo | `mtccjesus` | Agentes IA: Decisor con reglas duras, Guía con Gemini Live; desvío de multitudes a Barrio Abajo |

## Stack técnico

Astro + React 19 + Tailwind CSS v4 + TypeScript strict, Leaflet, Supabase Cloud (datos, Auth, Realtime), Gemini Live API para el Guía, OpenJev por API (Codiv) para el Decisor, Bun + Biome + Vitest. Despliegue en Dokploy.

Detalle en [`docs/10-stack.md`](docs/10-stack.md).

## Desarrollo

Requisitos: [Bun](https://bun.sh) y Node.js 22.

```bash
bun install
cp .env.example .env   # llenar las variables de Supabase y Gemini
bun run dev            # http://localhost:4321
```

| Variable | Dónde | Para qué |
|---|---|---|
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador y servidor | Datos, cuentas y Realtime. Sin ellas, semilla local y comunidad en el dispositivo. |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Publicar después del triaje y cola de moderación. Nunca con `PUBLIC_`. |
| `GEMINI_API_KEY` | Solo servidor | Quillart AI y Guía. Sin ella responde el agente local. |
| `TYPESAFE_API_KEY` | Solo servidor | OpenJev: Decisor, moderación y enrutamiento. Sin ella, reglas y puntaje ponderado. |

Puesta en marcha de la comunidad (migración, semilla y rol de ciudad): [`docs/27-comunidad-y-moderacion.md`](docs/27-comunidad-y-moderacion.md).

| Comando | Qué hace |
|---|---|
| `bun run check` | Revisión de tipos con `astro check` |
| `bun run lint` | Lint y formato con Biome (solo verifica) |
| `bun run format` | Aplica el formato de Biome |
| `bun run test` | Pruebas con Vitest |
| `bun run build` | Build de producción (servidor Node standalone) |
| `bun run verify` | Las cuatro verificaciones en orden; correr antes de cada PR |

## Reglas de trabajo

- `main` está protegida para todos, incluido el admin: todo cambio entra por pull request con 1 aprobación.
- Ramas: `feat/*`, `fix/*`, `docs/*`, `chore/*`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) en inglés; PR en español; ~400 líneas por PR.
- Tareas en GitHub Issues + Project.

Detalle en [`docs/08-metodologia.md`](docs/08-metodologia.md) y [`docs/09-convenciones.md`](docs/09-convenciones.md).

---

## English summary

Working repository for our team's entry to the **QUIJAM City Challenge**.
Fictional scenario: Barranquilla hosts the 2034 FIFA World Cup. The challenge asks
for a **strategic program** (not an isolated app) that connects five dimensions
(territory, sustainability, smart city, citizenship, economy), with a working
prototype and a legacy beyond 2034.

**QUILLART is the city interpreter**, not a digital twin. The knowledge that makes
Barranquilla work (fair prices, which streams flood, where the good food is) lives
in its people. QUILLART interprets that local knowledge for residents and visitors, through a
multilingual Guide, a safety-first route Decider and street hosts that pair an
older resident with a bilingual youth, and tells the city what it learns from
its visitors. The pilot corridor runs from Estadio Metropolitano to the Gran Malecón.
Stack: Astro, React 19, Tailwind CSS v4, TypeScript, Leaflet, Supabase, Gemini
Live API, Bun, Biome, Vitest; deployed on Dokploy.

Update (27 Nov 2026): QUILLART is now a real civic platform, not a virtual twin.
Quillart AI, a conversation backed by an orchestrator and six specialized agents
(voice is only a conduit), is the entry point to discover the city and take
actions with confirmation. Residents and visitors publish events, register with
capacity limits and talk in a forum; every post goes through a moderation triage
(hard rules plus OpenJev, human review when in doubt). Detailed documentation lives in [`docs/`](docs/) (in Spanish).

`main` is protected for everyone: changes go through a pull request with one approval.
