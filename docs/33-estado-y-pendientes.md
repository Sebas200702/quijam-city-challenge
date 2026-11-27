# Estado y pendientes (27 nov 2026)

Traspaso para seguir el trabajo desde otra sesión. Rama de trabajo: **`integ/ui-ux`** (todo lo de UI/UX integrado y probado en local).

## Qué hay en `integ/ui-ux`

Sale de `main` (con los PR #200–#206 de Sebas ya fusionados) y suma:

| Origen | Qué trae |
|---|---|
| #208 `fix/ui-audit-v2-loose` | Arreglos sueltos de la auditoría v2 (CSP de `/offline`, formularios accesibles, `/moderacion` con marco de ciudad, `/anfitrion` con puerta, textos). |
| #209 `feat/metro-area-map` | Mapa solo del Área Metropolitana (máscara, límites OSM, `maxBounds`), capa de lugares, pines agrupados, contrato `map-url` / `focusMap` / `registerMapLayer`. |
| #210 `feat/agent-dock` | Dock de Quillart AI en todas las superficies, `ScreenContext`, protocolo `uiActions` con Deshacer, filtros y formularios por URL, borrador conservado sin sesión (U02). |
| `fix/assistant-ux-small` | U21, U25, U26, U29, U31, U33 del asistente. |
| `fix/live-conduit` | La voz (Gemini Live) es solo el conducto: una herramienta `ask_quillart` que pasa cada pedido al orquestador, que elige al agente especializado. |
| `fix/dock-qa-bugs` | Título entre comillas, cupos y precio al crear eventos; texto de revisión honesto; "llévame a…" abre el mapa. |
| `fix/mobile-map-layout` | Mapa a pantalla completa en celular, sin la tarjeta del caso del Estadio; la ruta solo aparece si se pide. |
| `feat/real-city-data` | Datos reales con fuente en `supabase/seed-real/` y `docs/31-datos-reales-amb.md`. |
| commits directos | Dock con voz Live por defecto (dictado del navegador como respaldo), dock plegado visible, `open_page` navega a la pantalla pedida. |

Datos en Supabase (base compartida): 63 lugares reales (OSM), 16 estaciones reales de Transmetro, **5 eventos reales** con fuente (organizador "Agenda pública AMB"), 1 conversación de bienvenida. Se borraron los eventos de demo, el hilo de prueba y los reportes simulados.

## Cómo levantarla

```
cp .env.example .env   # y llenar las llaves
bun install && bun run build
HOST=0.0.0.0 PORT=4322 node --env-file=.env dist/server/entry.mjs
```

Abrir con **http://127.0.0.1:4322**, no `localhost`: en esta máquina `localhost` resuelve a `::1`, donde corre otro `astro dev` de otra rama. Desde el celular, por la IP de la red local.

## Pendiente

### Para la demo de hoy
- **Gemini de texto da 404** con el modelo del `.env` (`gemini-flash-latest`). Poner un modelo válido en `GEMINI_TEXT_MODEL`; mientras tanto responden los agentes locales.
- **La voz necesita HTTPS** fuera de `localhost`/`127.0.0.1`: en el celular por IP no hay micrófono. Desplegar `integ/ui-ux` en Dokploy (HTTPS) o hacer la voz desde el portátil.
- **Cuenta de ciudad con TOTP** lista si la migración `20261128000006_city_mfa_aal2.sql` está aplicada.
- **Simulación** (`feat/city-simulation`, commit `797bbb6`, **WIP**: el trabajo se detuvo a mitad). El `--seed` ya corrió contra la base compartida:
  - 41 usuarios sintéticos (`@sim.quillart.test`).
  - 118 lugares (55 reales nuevos de OSM en `supabase/seed-real/places-extra.json`).
  - 52 eventos: 5 reales y 47 sintéticos o proyectados.
  - 10 conversaciones y 145 inscripciones.
  
  Todo lo sintético está listado en `supabase/sim/manifest.json`. Falta revisar y terminar `scripts/simulate-city.ts` (`--run`, `--reset`), escribir `docs/32-simulacion.md` y unir la rama a `integ/ui-ux`. Después de la demo, correr `--reset`, o borrar con el manifiesto.
- **Eventos recurrentes verificados** (investigación terminada, todavía no cargada; `scripts/sim/projected-events.ts` está casi vacío):
  - Fechas oficiales del Carnaval 2027, anunciadas el 14 nov 2026 ([Infobae](https://www.infobae.com/colombia/2026/11/14/el-carnaval-de-barranquilla-2027-estrenara-escenarios-con-eventos-en-la-avenida-shakira-el-supermetro-y-el-romelio-martinez-anuncio-el-alcalde-alejandro-char/), [El Tiempo](https://www.eltiempo.com/colombia/barranquilla/el-traslado-al-malecon-no-va-confirman-que-la-via-40-seguira-siendo-sede-de-los-grandes-desfiles-del-carnaval-de-barranquilla-3601084), [Blu Radio](https://www.bluradio.com/regiones/caribe/coronacion-de-la-reina-del-carnaval-de-barranquilla-2027-sera-en-el-supermetro-rg10)):
    - Carnaval: 6–9 feb.
    - Lectura del Bando: 17 ene, Romelio Martínez.
    - Guacherna: 29 ene.
    - Desfile infantil: 31 ene, Avenida Shakira.
    - Coronación: 5 feb, Supermetro.
    - Rey Momo: 6 feb.
    - Desfiles grandes: siguen en la Vía 40.
  - Navidad: encendidos del Gran Malecón y Puerto Colombia, novenas 16–22 dic, Gran Parada de la Luz 8 dic, y Navidad y fin de año en el Gran Malecón (sin pólvora).
  - Otros municipios: Gran Parada de Galapa y Batalla de Flores de Malambo.
  - Escala real: 111.300 visitas al Gran Malecón el 24–25 dic 2025 (Blu Radio); unos 1,2 millones en la Batalla de Flores 2026 (Noticias RCN); 6 millones de espectadores en el Carnaval 2026 (El Tiempo).
  - La lista completa, con 26 eventos y sus URL, está en la conversación de la sesión del 27 nov. Hay que pasarla a `scripts/sim/projected-events.ts` marcando cada evento como "Proyección basada en la edición 2025/2026 (fuente)".

### PR y fusiones
- Abrir/fusionar el PR de `integ/ui-ux` → `main` (reemplaza a #208, #209 y #210). Los PR propios necesitan la aprobación de otra persona (Sebas).
- #207 (auditoría v2, solo docs) espera aprobación.
- #211 `feat/georef-community` (coordenadas en eventos, conversaciones y reportes, selector de punto, capas Eventos/Comunidad): **aplicar antes la migración `20261129000002_community_points.sql`**, si no la agenda y el foro fallan. No está en `integ/ui-ux`.
- Rama `docs/pitch-deck-v1` (PowerPoint, sin PR por decisión del líder): faltan fuentes instaladas, capturas del prototipo y datos del equipo.

### Producto
- El mapa en escritorio todavía abre sola la ruta Malecón → Estadio (cambio de una línea en `visitor-map-section.tsx`).
- `map.showRoute` solo conoce 3 destinos (Estadio, Barrio Abajo, Centro) saliendo del Malecón; el resto solo centra el mapa.
- Si una acción confirmada en la tarjeta termina después, Gemini Live no se entera; si un resultado navega, la sesión Live se cierra con la página.
- Textos solo en español: `ACTION_KEPT_TEXT` y algunos textos nuevos del agente local (borradores de evento y cobro).
- Auditoría v2 sin cerrar: punto obligatorio en reportes de Seguridad (U16), corroboración por cercanía, conmutador Lista/Mapa, minimapa validado contra el contorno exacto en el servidor.
- Solo 5 eventos reales verificables; buscar más fuentes (alcaldías de Soledad, Malambo, Puerto Colombia y Galapa no han publicado agenda 2026).
- Esquema de `places`: no tiene `municipality` ni `source` (el municipio va en `neighborhood`); `kind` no admite `market` ni `beach`. Faltan 3 estaciones de Transmetro sin objeto en OSM.

### Calidad
- 2–4 tests de `src/lib/security/api-guard.test.ts` fallan cuando el `.env` real está presente (contadores de límite compartidos). En CI sin `.env` pasan.
- Limpiar worktrees temporales: `merge-tmp`, `merge-tmp2`, `integ-live` y los de `.claude/worktrees/agent-*`.
