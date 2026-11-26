# QUIJAM · City Challenge Barranquilla 2034

> Repositorio de trabajo del equipo para el QUIJAM City Challenge.
> Nombre del producto: **por definir** (ningún nombre está confirmado).
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
| [`docs/feedback.md`](docs/feedback.md) | Registro de retroalimentación por sprint y validación con personas ajenas |

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

Our draft direction is an open-data city platform inside a three-component
program: open city data, a network of verified hosts and local businesses, and a
visitor web app plus a city dashboard. The pilot corridor runs from Estadio
Metropolitano to the Gran Malecón. The product name is still to be decided.
Stack: Astro, React 19, Tailwind CSS v4, TypeScript, Leaflet, Supabase, Gemini
Live API, Bun, Biome, Vitest; deployed on Dokploy. Detailed documentation lives in [`docs/`](docs/) (in Spanish).

`main` is protected for everyone: changes go through a pull request with one approval.
