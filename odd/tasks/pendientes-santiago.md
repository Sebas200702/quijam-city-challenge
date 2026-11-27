# Pendientes de Santiago (docs/33-estado-y-pendientes.md)

Objetivo: cerrar los pendientes que dejó Santiago en `docs/33-estado-y-pendientes.md` e integrar las ramas WIP.
Rama: `feat/pendientes-santiago` (sale de `integ/pending-prs`, PR #214). Entrega: un PR aparte sobre `main` después de #214. Tests: `bunx vitest run`, `bunx astro check`, `bunx biome lint .`, `bun run build`.

## Specs

- S1. Migraciones en Supabase prod: `20261129000001_metro_area_bounds.sql` y `20261129000002_community_points.sql` aplicadas. `20261128000006_city_mfa_aal2.sql` espera la decisión del usuario.
- S2. Ramas WIP integradas: `feat/city-simulation` y el arreglo de `feat/privacy-page` (commit 28bb381). Las ramas viejas (`ccr-*`, `claude/mateo-tasks-*`, `wip/url-state-prefill`) ya están cubiertas o reemplazadas.
- S3. Gemini de texto: el modelo por defecto `gemini-flash-latest` debe funcionar o cambiarse por uno válido. Pendiente original: "Gemini de texto da 404 con el modelo del `.env` (`gemini-flash-latest`). Poner un modelo válido en `GEMINI_TEXT_MODEL`".
- S4. Live: "Si una acción confirmada en la tarjeta termina después, Gemini Live no se entera; si un resultado navega, la sesión Live se cierra con la página."
- S5. Textos: "Textos solo en español: `ACTION_KEPT_TEXT` y algunos textos nuevos del agente local (borradores de evento y cobro)."
- S6. Simulación: "Falta revisar y terminar `scripts/simulate-city.ts` (`--run`, `--reset`), escribir `docs/32-simulacion.md`". Cargar los eventos recurrentes verificados en `scripts/sim/projected-events.ts`, cada uno marcado "Proyección basada en la edición 2025/2026 (fuente)".
- S7. Mapa: "El mapa en escritorio todavía abre sola la ruta Malecón → Estadio". "`map.showRoute` solo conoce 3 destinos (Estadio, Barrio Abajo, Centro) saliendo del Malecón; el resto solo centra el mapa."
- S8. Auditoría v2: "punto obligatorio en reportes de Seguridad (U16)".
- S9. Limpieza: "Limpiar worktrees temporales".

## Tasks

| ID | Specs | Ruta | Estado |
|---|---|---|---|
| T1 | S1 | inline | hecho: las 3 migraciones aplicadas en prod |
| T2 | S2 | inline | hecho (b304ecd, 6bbfad8) |
| T3 | S3 | inline | hecho (9300448) |
| T4 | S4, S5 | delegada (paralela) | hecho (fec6149); falta probar la voz en un navegador real |
| T5 | S6 | delegada (paralela) | hecho (fd1b9bc); no se ejecutó contra la base |
| T6 | S7, S8 | delegada + inline | hecho (a0fc19a, fec6149) |
| T7 | S9 | inline | hecho: 6 worktrees borrados |

## Log

- L1 (2026-11-27, usuario): "los pendientes que dejo anotado santiago" / "las ramas wip".
- L2: Los datos de prod pasan las nuevas restricciones (stops 23, flood_zones 4, businesses 5: 0 fuera de rango). Las 2 migraciones se aplicaron con éxito.
- L3: `city_mfa_aal2` quita los poderes de ciudad a las 2 cuentas de ciudad sin TOTP. No se aplicó sin decisión del usuario.
- L4 (usuario): "Aplicar ahora" `city_mfa_aal2`. Aplicada.
- L5: `gemini-flash-latest` dio 503 y luego timeout; `gemini-3.5-flash` responde 200.
- L6: Verificación final: astro check 0 errores, vitest 823/827 (los 4 fallos de api-guard ocurren también en main con .env real), build pasa.
