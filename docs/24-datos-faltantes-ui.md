# Datos que faltan para cumplir la UI y la UX

Fecha: 27 nov 2026. Parte de la épica #57. Base: `main` en `b559777` (después del PR #142).

## Para qué sirve

Las pantallas de la maqueta (#56) y los componentes rediseñados ya existen o están en PR. Muchos funcionan con props o datos de ejemplo. Este documento lista **los datos que faltan** para que funcionen con datos reales. El equipo lo convierte en issues.

Reglas para leerlo:

- Cada fila es un dato: tabla, columna, campo de API, evento `city-events`, estado del cliente o contenido.
- Cada dato se verificó contra `main`. Si `main` ya lo tiene, no está en las tablas: está en "Lo que ya existe en main".
- Dirección del producto (27 nov, `docs/02-decisiones.md` y épica #79): plataforma ciudadana **real**. Quillart AI en `/inicio` es la puerta de entrada; el mapa es un apartado más. **Nada inventado en pantalla.** Si un dato no existe, la UI muestra un estado vacío honesto. Solo la semilla del corredor lleva la etiqueta "Datos de referencia".
- Toda tabla nueva con datos semilla lleva `is_simulated` (como las del corredor) para pintar esa etiqueta.
- Prioridad para Demo Day: **alta** = sin el dato no se puede mostrar el caso; **media** = el caso se muestra con un estado vacío; **baja** = mejora.

## Fuentes

1. Maqueta del issue #56: inventario `screens.json` (56 pantallas en 5 superficies) y sus pantallas HTML.
2. `docs/20-arquitectura-de-informacion.md` (rama `feat/quillart-ux-components`), secciones 3 a 5: avisos, `city-events` y plan de roles y RLS.
3. Informes de los equipos de UI: inicio del visitante, menú del visitante (pasaporte, jerga, datos), lienzo del mapa, cromo del mapa, avisos, Centro de Mando (shell, secciones, paneles), acceso de ciudad y QR del jurado, auditoría de accesibilidad, y los informes de la maqueta de visitante, vendedor, ciudad y presentador.
4. Huecos reportados en revisión sin archivo: tarjeta de ruta, panel del Guía, flujo de reporte, avisos, Centro de Mando, vendedor (#49) y anfitrión (#50).
5. Código de `main`: `supabase/migrations/*`, `src/lib/*`, `src/pages/api/*`.

## Visitante

| Pantalla o componente | Dato que falta | Para qué lo usa la UI | Fuente propuesta | Issue | Prioridad |
|---|---|---|---|---|---|
| Quillart AI → Movilidad (`plan_route`) | Ruta estructurada en el resultado de la herramienta: `origin`, `destination`, `routeId` y enlace a `/mapa?origen=…&destino=…` | Pasar de la respuesta en texto a la tarjeta de ruta del mapa sin repetir la pregunta. Hoy `plan_route` devuelve solo `reply` y `/mapa` | Campo `summary.route` en `src/lib/assistant/tool-executor.ts` (desde `/api/guide/ask` → `plan`) y lectura de los parámetros en `corridor-map.tsx` | nuevo | alta |
| Tarjeta de ruta (c1-02) y tarifa de taxi (c1-04) | Rango justo del taxi en la respuesta del Decisor: `fareMinCop` y `fareMaxCop` por tramo y en la alternativa taxi | Mostrar "Tarifa de referencia $24.000, rango $20.000–$28.000" en la ruta elegida y en "Ver detalles" | Agregar a `RouteSegment` (`src/lib/routing/routing-types.ts`) y a `PlanResponse.alternatives` en `/api/decidir`. El dato ya está en `route_segments.fare_min_cop/fare_max_cop` | nuevo | alta |
| Tarifa de taxi (c1-04) | Pliego tarifario del taxi: arranque, valor por km o unidad, recargos nocturno y festivo, fuente y fecha | Explicar cómo se calcula la tarifa de referencia y cómo verificar al conductor | Contenido estático con fuente oficial en `src/lib/reports/taxi-tariff.ts` (cifra en `docs/04-cifras-verificadas.md` antes de usarla) | nuevo | media |
| Mapa: ruta bloqueada y alternativa (c2-02, c2-03, c3-01) | Geometría de rutas descartadas y alternativas: `stopCodes` y `legs` en `PlanResponse.discarded[]` y `alternatives[]` | Dibujar la ruta bloqueada en rojo punteado y la alternativa (Barrio Abajo) punteada | `/api/decidir`: devolver el `Itinerary` completo, no solo `RouteSummary` | nuevo | media |
| Hoja "en ruta" (c1-03, c2-01) | Estado del trayecto: tramo actual, progreso, minutos restantes, palabra de estado ("A tiempo", "Con retraso") | Hoja `.q-trip` en modo peek con el siguiente tramo | Estado del cliente `TripProgress` derivado de `route.legs` y el reloj; la ubicación no sale del celular. Sin fuente de tiempos reales de Transmetro | nuevo | media |
| Modal de arroyo (c2-02) | Contexto del visitante: zonas de arroyo de su ruta, zonas de sus paraderos y zona actual | Regla "solo interrumpe si toca su ruta o su zona" | Estado del cliente `VisitorContext` en `corridor-map.tsx`, derivado de `route.legs[].floodZoneCode` y `stops.zone`. El dato existe; falta pasarlo al aviso | #52 (cerrado) → nuevo | alta |
| Modal de arroyo sin conexión (c2-02) | Último estado de arroyos con su hora, guardado en el celular | "Aviso recibido hace 2 min" y banda roja que sigue sin red | Caché local de `CityState.activeFloodZoneIds` y `floodAlertAt` (ya existen en memoria) | #47 | media |
| Pedir anfitrión (c2-03) | Solicitud de anfitrión del visitante | Botón "Pedir anfitrión" del aviso en la ruta recalculada | `INSERT` en `host_assignments` (tabla nueva) con sesión anónima | #50 | alta |
| Anfitrión en camino y llegó (c2-04, c2-05) | Estado de su asignación: `status`, `eta_minutes`, parada de encuentro, nota del punto ("salida con rampa"), nombre de la dupla | Avisos `--safe` "Llega en 6 min" y "Tu anfitrión llegó" | `host_assignments` con Realtime `postgres_changes` filtrado por RLS | #50 | alta |
| Reporte enviado y resuelto (c1-06) | Vínculo entre el reporte y quien lo envió | Aviso "Tu reporte fue resuelto" | `overcharge_reports.reporter_user_id` + RLS `SELECT` de los propios + Realtime. Hoy el anónimo solo inserta | nuevo (sigue de #51) | media |
| Reportar cobro (c1-05) | Registro de conductores o vehículos verificados (placa, código QR) | Validar el QR del conductor al escanearlo | Tabla `verified_drivers`. La columna `overcharge_reports.driver_qr_code` ya existe | nuevo | baja |
| Sugerencia de Barrio Abajo (c3-01) | Saber que la ciudad aplicó el desvío y no está en pausa | Mostrar la invitación solo con desvío activo, no con cualquier `malecon_saturado` | Evento `desvio` (propuesto, ver abajo). Mientras no exista: respaldo `malecon_saturado` ≥ 85 % | #57 | media |
| Hoja del negocio (c3-02) | Productos y precios | Lista "Productos y precios" | Tabla `business_products` | #49 | media |
| Hoja del negocio (c3-02) | Foto del negocio | Imagen de cabecera (si no hay, ilustración) | `businesses.photo_url` | #49 | baja |
| Pasaporte (base-05) | Sellos del visitante: negocio o evento, fecha | Grilla de sellos y "Por descubrir" | Tabla `stamps` | #45 | media |
| Pasaporte (base-05) | Marca de evento ambiental y su recompensa | "La recompensa solo llega en eventos ambientales" | `events.is_green_event` y `events.reward_text` | #45 | baja |
| Sello nuevo (c3-03) | Validación del QR del negocio | Sumar el sello tras escanear | `POST /api/stamps` con `businesses.qr_token` (ya existe) | #45 | media |
| Jerga (base-06) | Glosario único: término, significado en es/en/pt/fr, ejemplo | Buscador de jerga y glosas del Guía con la misma fuente | Contenido estático `src/lib/i18n/slang.ts`. Hoy no hay glosario en `main` | #48 | baja |
| Datos y privacidad (base-07) | Catálogo de conjuntos de datos con fuente y frescura | Lista "Qué datos usamos" y botón "Ver datos abiertos" | `/api/datos` del PR #147 (aún no en `main`); frescura desde `updated_at` | #53 | baja |
| Tarjeta "tu siguiente paso" | Parada del corredor más cercana a cada lugar o evento | Ofrecer "Ver la ruta" para el próximo evento al que se inscribió | `places.nearest_stop_code` (o cálculo con `stops` lat/lon). Inscripciones ya existen en `event_registrations` | nuevo | media |
| Inicio | Clima actual | Mostrar el clima solo si viene de una fuente real (decisión 27 nov) | API de clima en el servidor, con hora de consulta | nuevo | baja |

## Vendedor

| Pantalla o componente | Dato que falta | Para qué lo usa la UI | Fuente propuesta | Issue | Prioridad |
|---|---|---|---|---|---|
| Entrada (base-01) | Enlace del QR del negocio a la cuenta de su dueña | Entrar por QR o enlace mágico sin contraseña | `businesses.claim_token` (distinto de `qr_token`, que es para sellos) + Supabase Auth OTP por correo | #49 | media |
| Alta (base-02) | Permiso para crear su negocio y estado de verificación | Formulario de alta y sello "verificado" como primer paso | Política RLS `INSERT` para `vendor` (hoy solo `UPDATE` propio) y `businesses.verification_status` (`pending`, `verified`). Hoy `is_verified` nace en `true` | #49 | media |
| Productos (base-05) y vista pública (base-07) | Productos con nombre es/en, precio en pesos y disponibilidad | Lista editable y tarjeta pública | Tabla `business_products` | #49 | media |
| Llegan visitantes (c3-02) | Desvío activo hacia su zona y ventana estimada | Aviso "La ciudad invita visitantes a Barrio Abajo" | Evento `desvio` + `diversion_decisions.window_start/window_end` | #49 | media |
| Visitas (c3-02, c3-03) | Visitas y sellos del día por hora, solo conteos | Contador del día y barras por hora | Tabla `business_visits` (o vista sobre `stamps`), sin datos del visitante | #49 | media |
| Dar sello (c3-04) | QR del pasaporte del visitante y código corto para dictar | Sello en los dos sentidos y respaldo si el QR no lee | `stamps` + token del pasaporte por sesión + `businesses.stamp_code` rotativo | #45 | media |
| Desvío en pausa (c3-05) | Estado y motivo de la pausa (arroyo en su zona o comité) | Aviso discreto `--alert` en lugar de "llegan visitantes" | `diversion_decisions.status = 'paused'` + `pause_reason` + evento `desvio` | #49 | baja |
| Ayuda (base-06) | Solicitudes de ayuda: tipo, nota, estado | Formulario de cuatro opciones | Tabla `help_requests` (también sirve al anfitrión) | nuevo | baja |

## Anfitrión

| Pantalla o componente | Dato que falta | Para qué lo usa la UI | Fuente propuesta | Issue | Prioridad |
|---|---|---|---|---|---|
| Entrada (base-01) | Rol `host` | Guardia de `/anfitrion` y RLS | `user_profiles.role` y `current_user_role()` aceptan `host` (hoy solo `visitor`, `vendor`, `city`) | #50 | alta |
| Inicio (base-02) | Turno: zona, paraderos, hora de inicio y fin | "Mi turno" y estado vacío "Sin asignaciones por ahora" | Tabla `host_shifts` | #50 | media |
| Inicio y menú (base-02, base-03) | Dupla: nombre, integrantes, chaleco | "Mi dupla" | Tabla `host_pairs` | #50 | media |
| Inicio | Disponibilidad (disponible, ocupado, fuera de turno) | Recibir o no asignaciones | `host_shifts.availability` | #50 | media |
| Asignación (c2-01) | Asignación con necesidades (silla de ruedas, idioma), parada de encuentro, arroyo cercano | Hoja expandida con aceptar | `host_assignments` (`needs`, `meeting_stop_code`, `flood_zone_code`) | #50 | alta |
| En camino (c2-02) | ETA hacia el punto de encuentro | Tiempo estimado y aviso al visitante | `host_assignments.eta_minutes`, calculado con `/api/decidir` desde la parada del turno | #50 | alta |
| Llegué (c2-03) | Hora de llegada y cierre | Confirmar llegada | `host_assignments.arrived_at`, `status = 'arrived'` | #50 | alta |
| Llegué (c2-03) | Guía breve de acompañamiento | Pasos de acompañamiento accesible | Contenido estático `src/lib/host/host-guide.ts` | #50 | baja |
| Asignación (c2-01) | Notificación del sistema en segundo plano | Avisar la asignación con la app cerrada | Web Push con service worker | #47 | baja |

## Ciudad (Centro de Mando)

| Pantalla o componente | Dato que falta | Para qué lo usa la UI | Fuente propuesta | Issue | Prioridad |
|---|---|---|---|---|---|
| Indicadores (base-03) | Meta del piloto por indicador, unidad y fuente | Medidor `.q-meter` "avance hacia la meta" | Contenido estático `src/lib/kpi/kpi-goals.ts` (metas en `docs/04-cifras-verificadas.md`) | #55 | media |
| Indicadores (base-03) | Historia para el cambio ("+3 desde las 16:00") | Delta en cada tarjeta | Tabla `kpi_snapshots` (indicador, valor, hora) | #55 | baja |
| Mapa y línea de tiempo (base-02) | Publicador de `tiempo` y estado de cada zona por hora | Deslizador 8–23 y mapa a esa hora | Control que publica `tiempo` (el tipo ya existe) + conteos por hora desde el Ensayo de escenarios | #44 | media |
| Arroyo activo (c2-01) | Anfitriones despachados por arroyo | Lista "Duplas en camino" | `host_assignments` filtrado por `flood_zone_code` | #50 | alta |
| Arroyo activo (c2-01) | Fin del arroyo | Quitar la alerta sin `reiniciar` | Evento `aguacero_fin` (propuesto) o `flood_zones.alert_active = false` | nuevo | media |
| Decisión del Decisor (c3-01) | Propuesta de desvío: zona origen y destino, cupo, ocupación proyectada, confianza, reglas duras revisadas | Tarjeta "Aplicar desvío" con una frase y "Ver detalles" | Productor `DiversionProposal` en `src/lib/decider/diversion.ts` (reglas 1, 2, 4 y 5 de `docs/14-desvio-barrio-abajo.md`) y `POST /api/decidir/desvio` | nuevo | alta |
| Desvío activo (c3-02) | Desvío guardado: estado, quién lo aplicó, llegadas, cupo | "210 de 730 llegaron", revertir | Tabla `diversion_decisions` | nuevo | alta |
| Desvío activo (c3-02) | Pausa del comité: quién la pidió y por qué | Fila "Pausa del comité" | `diversion_decisions.paused_by`, `pause_requested_by`, `pause_reason`. Falta decidir quién la pulsa (operador o cuenta del comité) | nuevo | media |
| Informe (base-04) | Sellos entregados para el indicador de economía local | Cifra que hoy el informe marca "no medido" | `stamps` (ver `impact-report-types.ts`) | #45 | baja |

## Presentador

| Pantalla o componente | Dato que falta | Para qué lo usa la UI | Fuente propuesta | Issue | Prioridad |
|---|---|---|---|---|---|
| Entrada (base-01) | Llave de demo y sesión | Entrar al panel sin cuenta de ciudad | Variable `DEMO_PRESENTER_KEY` + `POST /api/presentador/session` (cookie `httpOnly` de 8 h) + rol `presenter` | #41 | alta |
| Panel (base-02) y disparadores (c2-01, c3-01) | Publicación desde el servidor | Enviar `aguacero`, `malecon_saturado`, `modo_ciudad`, `tiempo` sin exponer llaves | `POST /api/presentador/events`. Hoy el canal es público y cualquiera publica desde el navegador | #41 | alta |
| Panel (base-02) | Registro de eventos con hora de envío y tiempo de reacción | "Enviado hace 4 s", "reacción en menos de 2 s" | Estado del panel + acuse por `presence` de cada superficie, o tabla `city_event_log` | #41 | media |
| Panel (base-02) | Reinicio del estado semilla | Botón "Reiniciar" con confirmación | `POST /api/presentador/reset`: vuelve `zone_visitor_counts`, `flood_zones.alert_active`, `host_assignments` y `diversion_decisions` a la semilla, y publica `reiniciar` | #41 | media |

## Transversal

| Pantalla o componente | Dato que falta | Para qué lo usa la UI | Fuente propuesta | Issue | Prioridad |
|---|---|---|---|---|---|
| Todas (visitante) | Sesión anónima del visitante | "Lo mío" sin registro: reporte, asignación, sellos | Supabase Auth anónimo (`signInAnonymously`); `current_user_role()` devuelve `visitor` sin perfil | nuevo | alta |
| i18n: textos de la interfaz | Mensajes en es, en, pt y fr | Cambiar idioma en un toque | `src/lib/i18n/messages/*` del PR #139 (aún no en `main`) | #48 | media |
| i18n: datos | Nombres y avisos de la semilla en inglés | Paraderos, arroyos y lugares en el idioma del visitante | Columnas `name_en`, `advisory_en` en `stops`, `flood_zones`, `places` (como `businesses.description_en`) | #48 | media |
| i18n: preferencia | Idioma elegido, recordado | No preguntar otra vez | `profiles.language` con cuenta; `localStorage` sin cuenta | #48 | baja |
| Sin conexión | Copia local del corredor: paraderos, tramos, arroyos, negocios | Responder rutas y tarifas sin red, no solo preguntas ya hechas | Service worker + IndexedDB con la respuesta de `corridor-data.ts` | #47 | media |
| Sin conexión | Respuestas guardadas de Quillart AI para los tres casos | Estado "Respuestas guardadas" | Contenido estático por idioma | #47 | media |
| Sin conexión | Cola de envíos pendientes | "Se enviará al volver la señal" para reportes y sellos | Bandeja local (IndexedDB) que reintenta | #47 | media |
| `city-events` | Canal privado | Solo servidor, `city` y `presenter` publican | Realtime Authorization: `realtime.messages` con `INSERT` solo para esos roles | #41 | alta |
| `city-events` | Tipo `desvio` | Avisos del visitante y del vendedor según la decisión de la ciudad | Ver "Tipos nuevos de CityEvent" | #57 | media |
| `city-events` | Estado derivado del desvío | Todas las superficies leen el desvío de un solo lugar | `CityState.diversion` en `src/lib/city-events/city-state.ts` | #57 | media |

## Lo que ya existe en main

Estos huecos se reportaron, pero `main` ya tiene el dato. No hace falta issue de datos; a lo sumo, cableado.

| Hueco reportado | Existe en main |
|---|---|
| Rango justo del taxi en la base | `route_segments.fare_min_cop/fare_max_cop`, `src/lib/corridor/corridor-data.ts`, `src/components/guide/trip-card.tsx`. Falta solo en `PlanResponse` (fila arriba) |
| Rutas afectadas por un arroyo | `route_segments.flood_zone_id` (consulta, no tabla nueva) |
| "20 min a pie" del Malecón a Barrio Abajo | Tramo `SEG-MAL-BAR-WALK` en `src/lib/corridor/corridor-seed.ts` |
| "12 negocios abiertos" | `businesses.is_open` + `businesses.zone` |
| Negocio abierto, verificado, sin comisión, descripción es/en | `businesses.is_open`, `is_verified`, `commission_free`, `description_es/en` |
| Trayecto prellenado y tarifa de referencia en el reporte | `src/lib/reports/overcharge-routes.ts` (PR #142) |
| Evento `cobro_abusivo` y bandeja Nuevo → En revisión → Resuelto | `src/pages/api/reports.ts`, `src/components/overcharge-inbox.tsx` (PR #142) |
| Indicador de reportes resueltos en `/ciudad` | `src/lib/city-dashboard-utils.ts` (PR #142) |
| Contador del QR del jurado | `src/lib/presence/*` (#43) |
| Modo de ciudad | `zone_visitor_counts.city_mode` y evento `modo_ciudad` |
| Saturación por zona | `zone_visitor_counts.saturation_level` (columna generada) |
| Frescura "Actualizado hace 30 s" | `updated_at` con trigger en `flood_zones`, `businesses`, `overcharge_reports`, `zone_visitor_counts` |
| Puntos de encuentro del anfitrión | `stops.stop_type = 'host_hub'` |
| Voz en el panel (Gemini Live) | Decisión 27 nov: la voz es la Web Speech API en `src/components/assistant/voice-conduit.ts`; Gemini Live queda en beta en `/prueba-guia` |
| Reporte ciudadano "sin confirmar" | `ForumThread.cityVerified` en `src/lib/community/community-types.ts` |
| Partido "Hoy 19:30" en el inicio | Se quitó por la regla "nada inventado"; el siguiente paso sale de `event_registrations` |
| Datos del informe con IA (jornada, modo, conteos) | `src/lib/impact-report/*` (#54) |

## Propuestas de esquema

Son propuestas. Este PR no trae migraciones. Cada tabla lleva `is_simulated boolean` si tendrá semilla, y RLS desde el primer día.

**Tablas nuevas**

- `host_assignments`: `id`, `visitor_user_id` (anónimo), `host_user_id`, `host_pair_id`, `flood_zone_code`, `meeting_stop_code`, `meeting_note`, `needs` (`jsonb`: accesible, idioma), `status` (`requested`, `accepted`, `en_route`, `arrived`, `done`, `cancelled`), `eta_minutes`, `accepted_at`, `arrived_at`, `created_at`, `updated_at`. En `supabase_realtime`. RLS: visitante inserta y lee las suyas; `host` lee las `requested` de su zona y actualiza las suyas; `city` todo.
- `host_shifts`: `id`, `host_user_id`, `host_pair_id`, `zone`, `stop_codes text[]`, `starts_at`, `ends_at`, `availability` (`available`, `busy`, `off`).
- `host_pairs`: `id`, `label`, `member_user_ids uuid[]`, `languages text[]`, `vest_color`.
- `business_products`: `id`, `business_id`, `name_es`, `name_en`, `price_cop`, `category`, `is_available`, `sort_order`, `updated_at`. RLS: lectura pública; la dueña edita los de su negocio.
- `stamps`: `id`, `visitor_user_id`, `business_id` o `event_id` (uno de los dos), `source` (`business_qr`, `passport_qr`, `spoken_code`), `has_reward`, `created_at`. Único por visitante y negocio por día.
- `business_visits`: `business_id`, `hour`, `visits`, `stamps` (solo conteos; sin datos del visitante). Puede ser vista sobre `stamps`.
- `diversion_decisions`: `id`, `from_zone`, `to_zone`, `capacity`, `projected_from_pct`, `projected_to_pct`, `confidence`, `rules_checked jsonb`, `status` (`proposed`, `applied`, `paused`, `reverted`, `discarded`), `pause_reason` (`arroyo`, `committee`), `paused_by`, `pause_requested_by`, `applied_by`, `arrivals_count`, `window_start`, `window_end`, fechas.
- `help_requests`: `id`, `requester_user_id`, `business_id` (opcional), `kind`, `note`, `status`, `created_at`.
- `verified_drivers` (baja): `id`, `plate`, `qr_token`, `company`, `is_active`.
- `kpi_snapshots` (baja): `indicator`, `value`, `taken_at`.
- `city_event_log` (opcional): `id`, `event jsonb`, `sent_by`, `sent_at`.

**Columnas nuevas**

- `user_profiles.role` y `current_user_role()`: aceptar `host` y `presenter`.
- `overcharge_reports.reporter_user_id` + RLS de lectura de los propios.
- `businesses.verification_status`, `businesses.claim_token`, `businesses.stamp_code`, `businesses.photo_url` + RLS `INSERT` para `vendor`.
- `events.is_green_event`, `events.reward_text`.
- `places.nearest_stop_code`.
- `stops.name_en`, `flood_zones.advisory_en`, `places.description_en`.
- `profiles.language`.

**Campos de API**

- `/api/decidir`: `RouteSegment.fareMinCop`, `RouteSegment.fareMaxCop`; `discarded[]` y `alternatives[]` con `stopCodes` y `legs`.
- Herramienta `plan_route` de Quillart AI: `summary.route` (`origin`, `destination`, `routeId`, `href`).
- Nuevas: `POST /api/decidir/desvio`, `POST /api/stamps`, `POST /api/presentador/session`, `POST /api/presentador/events`, `POST /api/presentador/reset`.

## Tipos nuevos de CityEvent

Regla de la épica #57: un tipo nuevo se agrega **primero** en `src/lib/city-events/city-events-types.ts`, con su reductor en `city-state.ts` y sus pruebas. Nadie lo copia en otro archivo. Hasta que la épica lo acepte, cada superficie usa el respaldo indicado.

| Tipo propuesto | Quién publica | Quién escucha | Respaldo mientras no exista |
|---|---|---|---|
| `{ type: "desvio"; fromZone: string; toZone: string; active: boolean; reason?: "arroyo" \| "committee" }` | Centro de Mando al aplicar, pausar o revertir | Visitante (sugerencia c3-01), vendedor (c3-02, c3-05), ciudad | `malecon_saturado` con `capacityPct >= 85` y reglas duras evaluadas en el celular |
| `{ type: "aguacero_fin"; zoneIds: string[] }` | Ciudad o presentador | Visitante (quita la banda roja), anfitrión, ciudad | El arroyo dura hasta `reiniciar` |

No van por `city-events` (son estado privado y guardado): asignaciones de anfitrión, negocio abierto o cerrado, estado de un reporte, sellos. Van por `postgres_changes` filtrado por RLS.

## Conteo

| Superficie | Huecos |
|---|---|
| Visitante | 21 |
| Vendedor | 8 |
| Anfitrión | 9 |
| Ciudad | 9 |
| Presentador | 4 |
| Transversal | 10 |
| **Total** | **61** |

Huecos descartados porque `main` ya tiene el dato: 17 (tabla "Lo que ya existe en main").
