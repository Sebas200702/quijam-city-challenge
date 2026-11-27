# Auditoría UI/UX v2

Fecha: 27 nov 2026. Base: `main` en `6f17cd8` (después de los PR #199, #200 y #201). Reemplaza como referencia a la auditoría v1 (A01–A40, T01–T10), que en su mayoría quedó resuelta con el PR #195. Aquí solo se repiten los puntos de la v1 que siguen abiertos.

Esta versión mide la app contra el **enfoque nuevo del líder de producto**, además de las reglas de UX de #57 y #79, la arquitectura de información ([26-arquitectura-de-informacion.md](26-arquitectura-de-informacion.md)) y WCAG 2.2 AA:

| Lente | Qué pide |
|---|---|
| **L1 Automatización** | El sistema hace el trabajo: propone, llena y ejecuta con confirmación, en vez de pedir que la persona navegue y llene |
| **L2 Conexión simple** | Llegar a eventos, lugares, personas y ciudad en pocos pasos; mirar sin fricción, cuenta solo para participar |
| **L3 Simplicidad** | Menos pantallas, menos opciones, una acción principal, lenguaje claro |
| **L4 Agente conductor** | Quillart AI hace cambios visibles en pantalla (filtra, pone pines, mueve el mapa, abre, prellena, resalta) y sabe qué está haciendo la persona. Diseño previsto: un dock fijo del agente abajo en todas las pantallas |
| **L5 Georreferencia** | Todo evento, lugar, conversación o reporte, negocio y alerta se puede ubicar en el mapa |
| **L6 Mapa metropolitano** | El mapa muestra solo el Área Metropolitana de Barranquilla (Barranquilla, Soledad, Malambo, Puerto Colombia, Galapa); lo de afuera queda enmascarado, no solo bloqueado al desplazar |

Las reglas de #57/#79 se citan como **R1–R10**; las dos reglas nuevas de #79 como **R-conf** (confirmar antes de actuar) y **R-triaje**.

## 1. Método

- App construida con `bun run build` y servida con `node --env-file=.env dist/server/entry.mjs` contra el Supabase real del equipo (solo lectura pública con la llave publicable).
- Chrome headless controlado por CDP directo (script propio, fuera del repositorio). Viewports 390×844 (táctil) y 1440×900. Temas claro y oscuro con `localStorage.quillart-theme`. Dos pasadas de idioma: navegador en inglés (detecta `en`) y en `es-CO`.
- Rutas recorridas: `/`, `/inicio`, `/mapa`, `/agenda`, `/agenda/[id]`, `/agenda/nuevo`, `/foro`, `/foro/[id]`, `/lugares`, `/lugares/[slug]`, `/perfil`, `/reportar`, `/pasaporte`, `/jerga`, `/datos`, `/offline`, `/vendedor`, `/vendedor/entrar`, `/anfitrion`, `/ciudad`, `/moderacion`, `/presentador`, `/presentador/entrar`, `/prueba-guia`.
- Por combinación: captura, desborde horizontal, objetivos táctiles bajo 44 px, nombres accesibles, `h1`, regiones vivas, botones `.q-btn--primary` visibles, errores de consola y contraste de texto calculado contra el fondo efectivo.
- Interacciones: alejar el mapa al máximo, abrir el Guía del mapa en 1440, medir cuánto tapa la tarjeta "Tu siguiente paso" en 390, y tres conversaciones reales con Quillart AI en `/inicio` sin sesión ("Planes de naturaleza este fin de semana", "¿Cómo llego al estadio desde el Gran Malecón?", "Quiero publicar un evento: limpieza del arroyo en Rebolo el sábado a las 8 am").
- Revisión de código: componentes, `src/lib/assistant/*`, `src/lib/community/*`, migraciones de `supabase/`, semilla del corredor y catálogo de lugares.
- Las capturas quedaron fuera del repositorio (carpeta temporal de la sesión).

## 2. Qué no se pudo probar

- **`/ciudad`, `/moderacion` y `/presentador` por dentro.** No hay cuenta de operador de ciudad ni llave de demo del presentador. El `.env` sí trae una llave de servicio, pero no se usó para crear cuentas ni escribir en la base compartida. Esas pantallas se revisaron solo en su estado sin sesión (puerta de acceso) y desde el código.
- **Acciones con sesión** (inscribirse, publicar, responder, confirmar una tarjeta de Quillart AI): no se creó cuenta en el Supabase compartido. El flujo sin sesión sí se probó.
- **Alerta de arroyo en vivo** (evento `aguacero` por Realtime): requiere el panel de presentador.
- **Voz** (micrófono, Gemini Live) y **sin conexión real** con el service worker: revisados desde el código. Sí se probó `/offline` servida directo.
- **Lectores de pantalla reales** (NVDA, TalkBack): no. Se midieron nombres, roles y regiones vivas en el DOM.
- `/anfitrion` se vio sin sesión porque no tiene puerta (ver U27).

## 3. Puntos de la auditoría v1 que siguen abiertos

| v1 | Estado en `6f17cd8` | Ahora |
|---|---|---|
| A03 hoja peek en `/mapa` | Abierto. La tarjeta "Tu siguiente paso" tapa el 53 % del mapa en 390 (medido) y el botón "Alejar" queda debajo | U10 |
| A13 agrupación de pines | Abierto. `map-layers.ts:168-193` usa `L.layerGroup` simple, sin agrupación | U32 |
| A35 pista de desplazamiento en chips | Abierto en el mapa (`corridor-map.css:365-373`), en las sugerencias de Quillart AI (`assistant-chat.tsx:381`) y en las categorías de la agenda (`agenda-page.tsx:127`) | U33 |
| T09 tildes de la semilla | Abierto. "Estacion", "Malecon", "Caiman", "Escorrentia", "Dona", "Mascaras", "Cafe", "Refresqueria" siguen en `corridor-seed.ts` y `supabase/seed.sql`, y se ven en `/reportar`, la lista de paraderos y el Guía | U34 |
| T10 "Informal" | Abierto (`src/lib/i18n/dictionaries/guide.ts:119`, segmento de `/reportar`) | U35 |

## 4. Resumen: los 10 hallazgos que más pesan

1. **U03.** Quillart AI solo vive en `/inicio`. En las demás pantallas es un enlace que te saca de donde estás (`/inicio?q=…`). No hay dock.
2. **U05.** Ninguna herramienta del agente cambia la pantalla. "Ver la ruta en el mapa" abre `/mapa` sin la ruta pedida: el mapa muestra su ruta fija al estadio.
3. **U06.** El agente no sabe qué está viendo la persona: solo recibe `document.referrer`, y el enrutador lo ignora.
4. **U02.** Sin sesión, el agente tira el borrador de la acción ("publica la limpieza del sábado") y responde solo "entra a tu cuenta". Contradice la arquitectura de información (§1.2) y obliga a repetir todo.
5. **U04.** En `/mapa` conviven dos asistentes con el mismo nombre: el Guía del mapa (otra API, sin historial) y la barra que lleva a `/inicio`.
6. **U08.** Eventos, conversaciones del foro y reportes no tienen coordenadas en el modelo. "Cómo llegar" te manda a Google Maps.
7. **U07.** "Ver en el mapa" en `/lugares` abre un mapa que no dibuja lugares, aunque los lugares sí tienen latitud y longitud.
8. **U09.** El mapa no tiene límites ni máscara: al alejar se ve el Magdalena, Sitionuevo y Pital de Megua. El catálogo incluye un lugar fuera del Área Metropolitana.
9. **U01.** El botón "Reintentar" de `/offline` no hace nada: su `onclick` en línea lo bloquea la CSP (violación medida).
10. **U11 y U10.** En 1440 el panel del Guía queda debajo de la tarjeta de la línea de tiempo y de los controles del mapa. En 390 la tarjeta "Tu siguiente paso" tapa más de la mitad del mapa.

## 5. Hallazgos

Severidad: **H** alta (bloquea una tarea, rompe una promesa de la pantalla o es un fallo AA claro), **M** media, **L** baja. Las rutas de archivo son relativas a la raíz del repositorio.

### 5.1 Alta

| id | ruta | archivo:línea | problema | lente / regla | arreglo concreto |
|---|---|---|---|---|---|
| U01 | /offline | src/pages/offline.astro:40; src/lib/security/csp.ts:80 | "Reintentar" usa `onclick="location.reload()"`. La CSP no permite atributos de script en línea y el servidor registró la violación (`script-src-attr`, `blocked: 'inline'`). El único botón principal de la pantalla sin conexión no hace nada | R8; WCAG 4.1.2 | Quitar el atributo y enlazar el clic en un `<script>` del componente (`addEventListener("click", () => location.reload())`), que Astro empaqueta y la CSP permite |
| U02 | /inicio | src/lib/assistant/assistant-server.ts:233-261; src/lib/assistant/local-agents.ts:238, 255, 313 | Sin sesión, `enforceAccount` borra la llamada de acción y cambia el texto por "Para eso necesitas entrar a tu cuenta". Medido con "Quiero publicar un evento: limpieza del arroyo en Rebolo el sábado a las 8 am": solo aparece el botón "Entrar o crear cuenta" y el borrador se pierde. La IA (§1.2) dice que la tarjeta muestra el texto exacto, cambia "Confirmar" por "Inicia sesión" y al volver la conversación sigue. `action-confirm-card.tsx:333-337` ya soporta ese caso | L1, L2; R5, R-conf | Mantener la acción como tarjeta pendiente con `signedIn=false`. Guardar la acción pendiente en `sessionStorage` junto con la conversación. Al volver de `/perfil?volver=/inicio`, mostrar la tarjeta lista para confirmar |
| U03 | todas menos /inicio | src/components/assistant/ask-quillart-button.tsx:16; src/components/visitor-home/next-step-card.tsx:143-150; src/layouts/base-layout.astro | Quillart AI solo está montado en `/inicio`. En agenda, foro, lugares, perfil y jerga hay un botón "Pregúntale a Quillart" que navega a `/inicio?q=`. En `/mapa`, la barra de abajo parece un campo de texto (placeholder y micrófono) pero es un enlace que saca de la pantalla. `/vendedor`, `/anfitrion`, `/ciudad` y `/presentador/entrar` no tienen ninguna entrada | L4, L3 | Crear un `AgentDock` fijo abajo (encima de la barra de pestañas en celular, abajo a la derecha en escritorio) montado en los shells (`CommunityShell`, `TopBar`/`BottomNav` de mapa y reportar, inicio). Que conserve la conversación entre pantallas (ya está en `sessionStorage`) y se expanda como hoja `.q-sheet--dock` sin salir de la pantalla. Ver §6.1 |
| U04 | /mapa | src/components/map/corridor-map.tsx:519-527, 588-601; src/components/guide/guide-panel.tsx:302; src/components/visitor-home/next-step-card.tsx:143 | Dos asistentes con el mismo nombre en la misma pantalla: el botón "Pregúntale a Quillart AI" abre el Guía del mapa ("Quillart AI · Agente de Movilidad", API `/api/guide/ask`, que recibe solo `{question}`, sin historial). La barra "Pregúntale a Quillart AI…" lleva a otra conversación en `/inicio`. Medido en 1440: seis entradas a "Quillart" en la pantalla | L3, L4; R10 | Un solo agente. El dock de §6.1 reemplaza al Guía: misma conversación, mismo orquestador, con el contexto del mapa (U06) y acciones sobre el mapa (U05). El Guía queda como modo "Movilidad" del dock |
| U05 | /inicio → /mapa, /agenda, /lugares | src/components/assistant/assistant-chat.tsx:122-126; src/lib/assistant/tool-executor.ts:386; src/lib/assistant/assistant-types.ts:68; src/components/map/corridor-map.tsx:174-178 | Ninguna de las 15 herramientas cambia la pantalla: devuelven tarjetas, enlaces o escrituras confirmadas. `plan_route` pinta un botón fijo a `/mapa` y el mapa no lee origen ni destino. Medido: "¿Cómo llego al estadio desde el Gran Malecón?" → "Ver la ruta en el mapa" → el mapa muestra su ruta fija por defecto. `open_page` "nunca navega solo" | L4, L1 | Definir un protocolo de acciones de interfaz (§6.2): el servidor devuelve `uiActions` (por ejemplo `map.showRoute`, `agenda.filter`, `form.prefill`) y el cliente las aplica sobre la pantalla actual con un bus (`window` `CustomEvent` o un store compartido). Mientras tanto, como mínimo: `plan_route` devuelve `/mapa?origen=…&destino=…` y el mapa lee esos parámetros (ya pedido en [24-datos-faltantes-ui.md](24-datos-faltantes-ui.md), fila 1) |
| U06 | todas | src/components/assistant/use-assistant.ts:112-121, 246-256; src/lib/assistant/orchestrator.ts:376; src/lib/assistant/gemini-agent.ts:75 | El contexto que llega al modelo es `now`, `signedIn`, `displayName`, `isVisitor`, `fromPath` y `language`. `fromPath` sale de `document.referrer` y es `null` si se recarga o se escribe la URL. El orquestador recibe el contexto como `_context` y no lo usa. No llegan: pantalla actual, elemento abierto (evento, lugar, conversación), filtros, ruta elegida, vista del mapa, borrador de formulario ni rol | L4 | Reemplazar `fromPath` por un `screen` que publica cada pantalla (`{ route, entity?: {kind, id, title}, filters?, map?: {center, zoom, selected, route}, draft? }`, ver §6.3). Usarlo en el enrutador (si estás en `/agenda`, el primer agente es Agenda) y en el prompt |
| U07 | /lugares, /lugares/[slug] | src/components/community/places-page.tsx:51-58; src/components/map/map-layers.ts:18 | "Ver en el mapa" lleva a `/mapa`, que solo tiene capas de paraderos, arroyos y negocios. Los lugares tienen `latitude`/`longitude` (`supabase/migrations/20261127000001_community_schema.sql:59-60`) pero no se dibujan. La pantalla promete algo que no pasa | L5, L2; R10 | Agregar la capa "Lugares" en el mapa y aceptar `/mapa?lugar=<slug>` para seleccionarlo y centrarlo. En el detalle, un minimapa con el pin en vez del enlace a Google Maps |
| U08 | /agenda/[id], /foro/[id], /reportar | src/components/community/event-detail.tsx:213; src/components/community/place-detail.tsx:136-139; src/lib/community/community-labels.ts:140-143; migraciones (ver §6.4) | Eventos (`place_id` o `location_text`), conversaciones del foro (`place_id` opcional) y reportes de cobro (tramo de ruta) no tienen coordenadas. "Cómo llegar" abre Google Maps fuera de la app. Ejemplo medido: "Poste caído en la 79 con 52" (Seguridad, confirmado por la ciudad) existe solo como texto, sin pin | L5, L2 | Columnas `latitude`/`longitude` (o `geography(Point)`) en `events`, `forum_threads` y `overcharge_reports`, con la misma restricción de caja que `places`. Cuando el evento o la conversación tiene `place_id`, heredar el punto del lugar. Captura en el formulario (§6.4) |
| U09 | /mapa, /ciudad | src/components/map/corridor-map.tsx:67, 229-241; src/components/crowd-sim-panel.tsx:172-195; src/lib/community/places-catalog.ts:54-61 | Sin `maxBounds`, `minZoom` ni máscara. Alejando se ve el departamento del Magdalena (Sitionuevo, Isla Cabica) y municipios fuera del Área Metropolitana (Pital de Megua). El catálogo de lugares incluye "Vía Parque Isla de Salamanca" (Sitionuevo, Magdalena) | L6 | Polígono del Área Metropolitana (unión de los cinco municipios) como GeoJSON en `src/lib/map/metro-area.ts`. Una capa de máscara (polígono mundial con el AMB como hueco, relleno opaco del color de fondo) y `maxBounds` = caja del polígono con `maxBoundsViscosity: 1` y `minZoom` que no deje ver más que esa caja. La misma configuración en los dos mapas. Revisar si la Isla de Salamanca se queda (está fuera) |
| U10 | /mapa 390 | src/components/visitor-home/next-step-card.tsx; src/components/visitor-home/visitor-map.css | (v1 A03, sigue abierto). La tarjeta "Tu siguiente paso" ocupa 506 px de 708 px del mapa (53 %, medido). El botón "Alejar" y casi todos los pines quedan debajo | WCAG 2.4.11, 2.5.8; R2; L3 | Hoja `.q-sheet--dock.q-sheet--peek` con título, tiempo y "Ver la ruta" en el pico (unos 160 px); el resto al expandir. Controles del mapa por encima del borde de la hoja |
| U11 | /mapa 1440 | src/components/map/corridor-map.tsx:588-601; src/components/timeline/match-timeline.tsx; src/components/map/map-chrome.css | Al abrir el Guía en escritorio, la tarjeta "Día del partido 2034" y los botones del mapa (pantalla completa, acercar, alejar, ubicación) quedan encima del panel y tapan el saludo, el título y parte de las sugerencias (captura) | WCAG 2.4.11, 1.4.10; L3 | Con el Guía (o el dock) abierto, plegar la línea de tiempo y correr los controles al borde izquierdo del panel, o dar al panel su propia columna con `z-index` por encima de las tarjetas flotantes |

### 5.2 Media

| id | ruta | archivo:línea | problema | lente / regla | arreglo concreto |
|---|---|---|---|---|---|
| U12 | /mapa 1440 | src/components/map/corridor-map.tsx:521; src/components/timeline/match-timeline.tsx:103; src/components/visitor-home/next-step-card.tsx:109 | Tres botones primarios visibles a la vez: "Pregúntale a Quillart AI", "Reproducir el día" y "Ver la ruta" (medido) | R2; L3 | Solo "Ver la ruta" como primario. El agente entra por el dock; reproducir es un botón de icono secundario o desaparece (ver U39) |
| U13 | /agenda, /lugares | src/components/community/agenda-page.tsx:62-65; src/components/community/places-page.tsx:27 | Búsqueda, categoría y tipo de lugar son estado local: no hay `?q=`, `?categoria=` ni `?tipo=`. El agente no puede dejar la agenda filtrada, y un filtro no se puede compartir ni sobrevive a recargar. Tampoco hay filtro por fecha ("este fin de semana"), que es la primera sugerencia de Quillart AI | L4, L2 | Leer y escribir los filtros en la URL (`?q=&categoria=&cuando=hoy|finde|semana`, `?tipo=nature`). Con eso, `search_events` del agente puede devolver la URL y, con el bus de §6.2, aplicarla sobre la pantalla |
| U14 | /agenda/nuevo | src/components/community/event-form.tsx:49-63, 109-122 | Sin sesión, el formulario no se muestra: solo "Entra para publicar". Con sesión, son 10 campos vacíos; solo `?lugar=` llega prellenado. El agente ya arma título, descripción, categoría, fecha y lugar en `create_event` (`assistant-agents.ts:357-396`), pero no puede pasarlos al formulario | L1, L3; R5 | Dejar llenar el borrador sin cuenta y pedir la cuenta al publicar, conservando lo escrito. Aceptar el borrador del agente (`?borrador=<id>` en `sessionStorage` o los campos en la URL). Valores por defecto: categoría según el texto, fecha el próximo sábado, gratis |
| U15 | /agenda/nuevo | src/components/community/event-form.tsx:270-301 | El lugar es una lista de lugares o "Otro lugar" con dirección en texto libre. No hay selección en el mapa ni "usar mi ubicación": el evento nace sin punto | L5, L1 | Selector de punto: buscador de lugares y direcciones con un minimapa (limitado al AMB, U09) donde se mueve el pin. El agente propone el punto a partir del texto ("en Rebolo") y la persona lo confirma |
| U16 | /foro (nueva conversación), /foro/[id] | src/components/community/forum-page.tsx:248-270; src/components/community/thread-page.tsx:264 | El formulario de conversación solo acepta `?lugar=` y `?evento=`; título y texto empiezan vacíos y no hay ubicación. Los reportes de riesgo (categoría Seguridad) quedan como texto ("Poste caído en la 79 con 52"). La respuesta tampoco se puede prellenar | L1, L5 | Mismo patrón de borrador que U14. Para la categoría Seguridad, el punto en el mapa es obligatorio (prellenado con la ubicación o con lo que dijo la persona) y la conversación aparece como pin "sin confirmar" en el mapa |
| U17 | /reportar, /inicio | src/components/reports/overcharge-report-page.tsx:100-108; src/lib/assistant/tool-executor.ts:511-521 | El reporte de cobro solo recibe `?segment=`. Monto, vehículo, código del conductor y nota empiezan vacíos, y ninguna herramienta del agente apunta a este formulario: `report_issue` publica una conversación en el foro. Medido: la respuesta de Movilidad dice "Si te cobran de más, repórtalo aquí mismo" sin enlace ni acción | L1, L4 | Herramienta `report_overcharge` con tarjeta de confirmación (tramo, monto y vehículo tomados de la conversación) o, mínimo, enlace `/reportar?segment=…&monto=…&vehiculo=taxi` desde la respuesta de ruta |
| U18 | /agenda/nuevo, /perfil, /foro | src/components/community/community-ui.tsx:13-33, 98-107; src/components/community/event-form.tsx:161-164 | La ayuda de cada campo (`hint`) no está enlazada con `aria-describedby`. La validación devuelve un solo mensaje general, sin `aria-invalid` ni foco en el campo con error | WCAG 1.3.1, 3.3.1, 3.3.3 | `Field` genera `id` para la ayuda y el error y los pasa al control. `validateEventInput` devuelve `{field, message}` y el formulario enfoca ese campo |
| U19 | agenda, foro, lugares, perfil, inicio | src/components/community/community-ui.tsx:153-154; src/components/community/event-form.tsx:170 | El estado de error de `Loaded` es solo un texto rojo, sin "Intentar de nuevo" ni diferencia entre sin conexión y fallo. Al publicar se muestra `err.message` crudo | R8 | `Loaded` con estado `.q-state--error` y botón de reintento; `.q-state--offline` cuando `navigator.onLine` es falso. Mapear errores conocidos a frases claras |
| U20 | /inicio | src/components/assistant/assistant-chat.tsx:397, 429-439; src/components/assistant/use-assistant.ts:259, 426 | Todo el registro es `aria-live="polite"`, así que cada tarjeta nueva se vuelve a leer. "Pensando…" no tiene `role="status"`. No hay botón para detener la respuesta ni `AbortController`. Si la persona escribe mientras responde, el mensaje se descarta en silencio | WCAG 4.1.3; L3 | Sacar `aria-live` del registro y anunciar solo una línea por turno ("Quillart respondió: …") en un `role="status"` aparte. Botón "Detener" mientras transmite (abortar el `fetch`). Deshabilitar el envío con explicación, o encolar el mensaje |
| U21 | /pasaporte, /jerga, /datos, /vendedor, /anfitrion, /ciudad, /presentador, /prueba-guia | src/layouts/base-layout.astro:44-50; src/components/visitor-menu/*.tsx; src/components/open-data/open-data-portal.tsx; src/components/assistant/use-assistant.ts:308; src/lib/assistant/assistant-agents.ts:95-99 | El script del layout pone `<html lang>` con el idioma guardado en todas las páginas, también en las que no están traducidas. Medido con el navegador en inglés: `lang="en"` y el contenido de pasaporte, jerga y datos en español (están en el menú secundario del visitante). Los errores y las sugerencias de seguimiento del agente están solo en español | WCAG 3.1.1; R5 (idioma en un toque); R10 | Traducir pasaporte, jerga y datos (son superficie del visitante). Mientras no estén traducidas, declarar `lang="es"` en esas páginas. Pasar errores y sugerencias de seguimiento por `useT` |
| U22 | /moderacion | src/components/community/moderation-page.tsx:44; src/lib/i18n/dictionaries/forum.ts:111, 178 | La cola de moderación usa el marco del visitante: barra de pestañas de la comunidad, tema claro y acceso por `/perfil`. `/ciudad` tiene su propia puerta oscura. Son dos accesos distintos para el mismo rol. El texto nombra al proveedor ("luego OpenJev") | R1; R10 | Marco de la superficie Ciudad (cabecera del tablero, navegación Tablero/Moderación, tema oscuro y la misma puerta de `city-auth-gate`). Cambiar "OpenJev" por "revisión automática" |
| U23 | / (landing) 390 | src/components/landing/landing-header.astro:13-39 | En 390 la cabecera junta logo, idioma, menú y "Abrir Quillart AI": el logo queda cortado ("QUII…") debajo del selector de idioma (captura). Hay dos primarios visibles en los dos anchos: "Abrir Quillart AI" (cabecera) y "Preguntar" (héroe), medido | L3; R2; WCAG 1.4.10 | En celular, ocultar "Abrir Quillart AI" de la cabecera (el héroe ya es la conversación) o dejar el logo solo con el icono |
| U27 | /anfitrion | src/components/host/host-view.tsx:26-50 | Sin puerta ni rol: cualquiera abre `/anfitrion` y toca "Estoy disponible". No tiene cabecera, logo, idioma ni salida. El rol `host` sigue pendiente ([24-datos-faltantes-ui.md](24-datos-faltantes-ui.md), Anfitrión) | R1 | Puerta como la de `/vendedor/entrar` mientras llega el rol `host`, y cabecera mínima con logo, idioma y ayuda |
| U29 | /prueba-guia | src/components/guide-live-test.tsx:163; src/components/assistant/assistant-chat.tsx:346-351; src/components/landing/landing-footer.astro:24 | La beta de voz en vivo está enlazada desde Quillart AI ("Voz en vivo (beta)") y desde el pie de la landing, pero es una página interna: sin `<main>`, selector sin etiqueta, controles de 32 px, sin agentes ni herramientas | L3; R7; WCAG 1.3.1, 4.1.2 | Quitar los enlaces públicos hasta que la voz en vivo use el mismo orquestador; o integrarla como modo de voz del dock |
| U32 | /mapa | src/components/map/map-layers.ts:168-193 | (v1 A13). Sin agrupación: en el centro se enciman pines de 44 px. Va a empeorar cuando el mapa reciba lugares, eventos y reportes (L5) | WCAG 2.5.8; L5 | Agrupar por debajo del zoom 15 (`Leaflet.markercluster` o agrupación propia por celda) con un círculo que diga el número y el tipo |
| U34 | /mapa, /reportar, Guía | src/lib/corridor/corridor-seed.ts:59, 73, 115, 129, 184, 191, 198, 212, 240, 249, 254; supabase/seed.sql:10-15, 38-40, 101-121 | (v1 T09). Nombres sin tilde: "Gran Malecon (Sector Caiman del Rio)", "Estacion Joaquin Barrios Polo", "Fritos Dona Rosa", "Cafe Popular", "Refresqueria". Se ven en el selector de `/reportar`, la lista de paraderos y las sugerencias del Guía | R10 | Corregir los dos archivos juntos (el comentario de `corridor-seed.ts:1-3` pide mantenerlos iguales) |
| U39 | /mapa | src/components/visitor-home/visitor-map-section.tsx:99; docs/26-arquitectura-de-informacion.md §3 y §4.1 | La línea de tiempo "Día del partido 2034" con su botón de reproducir está en el mapa del visitante. La IA dice que la persona ignora el evento `tiempo`. Suma una tarjeta flotante, un primario (U12) y tapa el Guía (U11) | R1, R3; L3 | Sacarla del mapa del visitante; queda en el tablero y el panel del presentador. Si se quiere mostrar en la demo, que la active el presentador y aparezca como aviso discreto |

### 5.3 Baja

| id | ruta | archivo:línea | problema | lente / regla | arreglo concreto |
|---|---|---|---|---|---|
| U24 | /mapa, /reportar | src/pages/mapa.astro:32; src/pages/reportar.astro:30; src/components/home/bottom-nav.tsx | En celular la barra de pestañas no marca ninguna pestaña en `/mapa` ni en `/reportar` (`current="map"`, pero el mapa no está en la barra). La persona no sabe dónde está | R10; WCAG 2.4.8 (AAA, guía) | Con el dock y la georreferencia, el mapa se vuelve una vista de cada sección. Mientras tanto, marcar "Quillart" o mostrar "Mapa" como título en la barra superior |
| U25 | /inicio | src/components/assistant/assistant-home.tsx:56-78; src/lib/i18n/messages.ts:61 | "Hoy en tu ciudad" muestra los próximos tres eventos aunque sean del sábado o domingo (medido) | R10 | Título "Próximos planes" o filtrar por hoy, con estado vacío "Hoy no hay planes; mira el fin de semana" |
| U26 | /inicio | src/lib/assistant/tool-executor.ts:386; src/components/assistant/assistant-chat.tsx:87-126 | La respuesta de ruta sale en dos globos más un aviso verde ("Te armo la ruta…", el aviso y "Esta es la ruta sugerida…"), medido | L3 | Un globo con la frase de por qué y una tarjeta `.q-next-step` con "Ver en el mapa" |
| U28 | /presentador/entrar | src/components/presenter/presenter-entry.tsx:109 | Texto con ruta técnica: "vuelve a `/presentador`" | R10 | "Después de entrar en el tablero, vuelve a este panel" con enlace |
| U30 | /datos | src/components/open-data/open-data-portal.tsx:88-93, 350-358 | Enlaces "CC BY 4.0" y "Ver términos de uso" de 15–16 px de alto | R7 (44 px); WCAG 2.5.8 pasa por excepción de texto en línea solo si van dentro de una frase | `min-h-11 inline-flex items-center` o un solo enlace de licencia por página |
| U31 | /inicio | src/components/assistant/assistant-home.tsx:80 | "Ver eventos" mide 69×18 px | R7 | `inline-flex min-h-11 items-center` |
| U33 | /mapa, /inicio, /agenda | src/components/map/corridor-map.css:365-373; src/components/assistant/assistant-chat.tsx:381; src/components/community/agenda-page.tsx:127 | (v1 A35). Filas de chips con desplazamiento horizontal sin pista; en 390 el chip "Calor y sombra" y las sugerencias quedan cortados | R10 | Degradado en el borde (`mask-image`) o envolver en dos líneas |
| U35 | /reportar | src/lib/i18n/dictionaries/guide.ts:119 | (v1 T10). "Informal" sin explicación | R10 | "Carro particular" o una ayuda corta |
| U36 | /perfil | src/components/community/profile-page.tsx:272-280 | El barrio es texto libre: no se puede usar para "cerca de ti" ni para ordenar la agenda por cercanía | L5, L1 | Lista de barrios del AMB (con su centroide) o tomarlo del punto que la persona elija |
| U37 | /agenda/[id], /lugares/[slug] | src/components/community/event-detail.tsx; src/components/community/place-detail.tsx | En 390 la ilustración genérica ocupa el primer cuarto de la pantalla y la acción principal ("Inscribirme", "Cómo llegar") queda debajo del pliegue (captura) | L3; R2 | Ilustración más baja o reemplazada por el minimapa del punto (U07, U08), y la acción principal fija abajo, encima del dock |
| U38 | /reportar | src/lib/i18n/dictionaries/reports.ts:68 | "Tarifa oficial de referencia" junto a "Tarifa de referencia" en el resto de la app | R10 | Un solo término: "Tarifa de referencia" |

### 5.4 Contraste, objetivos táctiles y estructura (medido)

- **Desborde horizontal:** ninguno en las 24 rutas, en los dos anchos y los dos temas.
- **Nombres accesibles:** todos los controles visibles tienen nombre. Todas las imágenes tienen `alt`.
- **`h1`:** uno por pantalla en todas las rutas medidas (la v1 A14 quedó resuelta).
- **Objetivos bajo 44 px:** solo U30, U31, el enlace de salto del mapa (42 px de alto) y los controles de `/prueba-guia` (U29).
- **Contraste de texto:** 0 fallos AA en 18 rutas × 2 anchos × 2 temas (hasta 600 nodos de texto por pantalla, fondo efectivo con transparencias mezcladas). El texto sobre teselas del mapa y sobre ilustraciones no se puede medir así; a ojo, las etiquetas de los pines cortadas ("Gran Ma… (Sector Ca…") se leen bien en los dos temas.
- **Primarios:** uno por pantalla salvo la landing (2: "Abrir Quillart AI" y "Preguntar", U23) y `/mapa` en 1440 (3, U12). `/lugares`, `/jerga` y `/datos` no tienen primario, lo que está bien para pantallas de consulta.

## 6. Brechas frente al enfoque nuevo

Esta sección está escrita para quien diseña la maqueta: qué pantallas, qué acciones del agente y qué entidades necesitan coordenadas.

### 6.1 El dock del agente

**Hoy:**

| Pantalla | Qué hay del agente |
|---|---|
| `/inicio` | Conversación completa a pantalla entera (`assistant-chat.tsx`) |
| `/mapa` | Guía del mapa (otro asistente, U04) y una barra que parece campo pero lleva a `/inicio?q=` |
| `/agenda`, `/agenda/[id]`, `/foro`, `/lugares`, `/lugares/[slug]`, `/perfil`, `/jerga` | Botón "Pregúntale a Quillart" que navega a `/inicio?q=<pregunta fija>` |
| `/agenda/nuevo` | Enlace de texto "o pídeselo a Quillart" |
| `/foro/[id]`, `/reportar`, `/pasaporte`, `/datos`, `/moderacion` | Solo la pestaña o el enlace de navegación |
| `/vendedor`, `/vendedor/entrar`, `/anfitrion`, `/ciudad`, `/presentador/entrar` | Nada |
| `/` | Campo del héroe que envía a `/inicio?q=` |

**Propuesta para la maqueta:**

- **Dock cerrado (por defecto):** una barra de 56 px fija abajo, encima de la barra de pestañas en celular y como píldora abajo a la derecha en escritorio. Tiene el campo "Pídele algo a Quillart", el micrófono y, a la izquierda, un **chip de contexto** que dice qué ve el agente ("Agenda · Naturaleza", "Evento: Avistamiento de aves", "Mapa · ruta al estadio"). Tocar el chip permite quitar el contexto.
- **Dock abierto:** hoja `.q-sheet--dock` hasta el 60 % de la altura, con la conversación. **La pantalla de atrás sigue visible y es la que cambia.** El agente no reemplaza la pantalla: la maneja.
- **`/inicio`** queda como el dock abierto a pantalla completa sobre las tarjetas de sección. Es el mismo componente, no otro.
- **Superficies operativas:** el vendedor tiene un dock con su propio agente ("¿Marco abierto?", "Sube el precio del jugo a 4.000"). Ciudad y presentador no llevan dock en esta etapa: no los pide la regla 1 y no hay agente para ellos.
- **Una acción principal por pantalla (R2):** el dock no usa `.q-btn--primary`. Su botón de enviar es secundario hasta que haya texto.
- **Sin conexión:** el dock dice "Sin conexión: respondo con lo guardado" y deshabilita las acciones de escritura (la lógica ya existe en `offline-answer.ts`).

### 6.2 Acciones visibles en pantalla

**Hoy:** 15 herramientas. 9 de lectura devuelven tarjetas o enlaces en el chat. 6 de acción escriben datos después de una tarjeta de confirmación (bien resuelta: texto exacto, Editar, Confirmar y Cancelar, `action-confirm-card.tsx:262-361`). **Ninguna cambia la pantalla.** No hay bus de acciones entre el agente y las páginas. La única acción visible hoy es manual: en el Guía, tocar "Ver en el mapa" de una tarjeta de viaje mueve el mapa (`guide-panel.tsx:539-544`, tres destinos fijos).

**Protocolo propuesto:** el servidor devuelve, junto al texto, una lista `uiActions` que el cliente aplica sobre la pantalla actual. Si la pantalla no es la correcta, primero navega (por URL con parámetros, así funciona aunque se recargue) y luego aplica. Las acciones de interfaz no piden confirmación, porque no escriben nada y se deshacen con "Volver". Las acciones que escriben siguen con la tarjeta de confirmación (R-conf).

| Acción de interfaz | Pantalla | Qué ve la persona | Gancho que falta |
|---|---|---|---|
| `agenda.filter {q, categoria, cuando}` | `/agenda` | La lista se filtra y los chips cambian, con un aviso "Filtré por Naturaleza este fin de semana · Quitar" | Filtros en la URL (U13) |
| `agenda.open {eventId}` | `/agenda/[id]` | Se abre el evento y el chip de contexto pasa a ese evento | Ninguno (la ruta existe) |
| `map.flyTo {lat, lng, zoom}` y `map.drop {pins[]}` | `/mapa` | El mapa vuela y caen pines numerados con los resultados ("3 planes de naturaleza") | Capas de lugares y eventos (U07, U08) y `?lugar=`, `?evento=` |
| `map.showRoute {origen, destino, accesible}` | `/mapa` | Se dibuja la ruta, se resalta y la tarjeta "Tu siguiente paso" cambia a esa ruta | `?origen=&destino=` en `corridor-map.tsx` ([24-datos-faltantes-ui.md](24-datos-faltantes-ui.md), fila 1) |
| `map.highlight {floodZone}` | `/mapa` | Se resalta el arroyo que menciona la respuesta | Selección por código, como `?negocio=` |
| `places.filter {tipo}` | `/lugares` | La lista se filtra | `?tipo=` (U13) |
| `form.prefill {form, fields}` | `/agenda/nuevo`, `/foro?nuevo=1`, `/reportar`, respuesta en `/foro/[id]` | Los campos aparecen llenos y resaltados un momento; la persona revisa y publica | Lectura de borrador en los formularios (U14, U16, U17) |
| `ui.focus {selector}` | Cualquiera | Lleva el foco y el desplazamiento a la parte que nombra el agente ("tu inscripción está aquí") | Bus de acciones |

**Para la maqueta, dibujar estos cinco flujos:**

1. En `/agenda`: "planes gratis de naturaleza este finde" → la lista se filtra detrás del dock y aparece un chip "Quitar filtro".
2. En `/inicio`: "¿cómo llego al estadio desde el Malecón?" → el dock se baja a pico, la pantalla pasa a `/mapa` con la ruta dibujada y la tarjeta de ruta en pico.
3. En `/lugares/cienaga-de-mallorquin`: "¿qué hay aquí este mes?" → el agente usa el contexto (no hay que nombrar el lugar) y lista eventos con pines en el minimapa.
4. Sin sesión, en cualquier pantalla: "publica una limpieza del arroyo en Rebolo el sábado 8 am" → tarjeta con el texto exacto y "Inicia sesión para publicar" → `/perfil` → vuelve con la tarjeta lista para confirmar (U02) → al confirmar, el evento aparece como pin en el mapa.
5. En `/mapa`, con un arroyo activo: "¿por dónde me voy?" → la ruta bloqueada se marca en rojo, la alternativa se resalta y la tarjeta explica el porqué en una frase (R6).

### 6.3 Contexto que necesita el agente

**Hoy:** `{now, signedIn, displayName, isVisitor, fromPath, language}` (`assistant-types.ts:131-146`). `fromPath` es el `referrer` y el orquestador no lo usa.

**Propuesta:** cada pantalla publica su estado en un store `screenContext`, que el dock envía con cada mensaje:

```ts
interface ScreenContext {
	route: "/agenda" | "/agenda/[id]" | "/mapa" | string;
	title: string; // lo que ve la persona: "Agenda", "Avistamiento de aves al amanecer"
	entity?: { kind: "event" | "place" | "thread" | "business" | "stop" | "floodZone"; id: string; name: string };
	filters?: Record<string, string>; // { categoria: "nature", cuando: "finde" }
	map?: { center: [number, number]; zoom: number; selected?: string; route?: { origen: string; destino: string } };
	draft?: { form: "event" | "thread" | "reply" | "overcharge"; fields: Record<string, string> };
	role: "visitor" | "vendor" | "city";
	location?: { zone: string }; // nunca la coordenada exacta (Ley 1581)
}
```

Reglas: el enrutador elige primero el agente de la pantalla (Agenda en `/agenda`, Movilidad en `/mapa`) y la persona ve en el chip del dock qué contexto se envía. La ubicación exacta no sale del teléfono; se manda la zona del corredor o el barrio, como ya pide [26-arquitectura-de-informacion.md](26-arquitectura-de-informacion.md) §1.

### 6.4 Georreferencia: qué entidad necesita coordenadas

| Entidad | ¿Tiene coordenadas? | ¿Se captura al crear? | ¿Sale en el mapa? | Qué falta |
|---|---|---|---|---|
| Lugares (`places`) | Sí, `latitude`/`longitude` obligatorias (`community_schema.sql:59-60`) | Solo la ciudad (sin formulario) | **No** | Capa "Lugares" y `?lugar=` (U07) |
| Eventos de la comunidad (`events`) | **No**: `place_id` o `location_text` (`community_schema.sql:82-83`) | Lista de lugares o texto libre | No | Columnas de punto, heredar del lugar, selector en el formulario (U08, U15) |
| Conversaciones del foro (`forum_threads`) | **No**: `place_id` opcional (`community_schema.sql:162-163`) | Solo desde `?lugar=` | No | Punto opcional; **obligatorio en Seguridad** y en reportes de riesgo (U16) |
| Respuestas del foro | No | — | No | No hace falta |
| Reportes de cobro (`overcharge_reports`) | **No**: tramo de ruta y zona (`corridor_schema.sql:88-101`) | Lista de tramos | No (ni en el tablero de la ciudad) | Punto aproximado (inicio del tramo o el que marque la persona) para el mapa de la ciudad |
| Reportes de contenido | No | — | No | No hace falta |
| Negocios (`businesses`) | Sí, con `stop_id` y zona | Alta por QR; el vendedor no cambia la ubicación | **Sí**, capa Negocios | Nada; revisar el límite al AMB |
| Zonas de arroyo (`flood_zones`) | Sí, centro y radio | Semilla | **Sí**, capa Arroyos | Polígono real del arroyo en vez de círculo (mejora) |
| Alertas de arroyo y avisos | Indirecto: códigos de zona | — | El círculo de la zona se pone rojo | Nada si la zona tiene punto |
| Paraderos (`stops`) | Sí | Semilla | **Sí** | Nada |
| Rutas | Indirecto: paraderos | Origen y destino en la tarjeta de ruta | Sí, la ruta elegida | Aceptar origen y destino por URL o por el agente (U05) |
| Anfitriones (punto de encuentro) | Indirecto: código de paradero | — | **No** (solo tarjeta) | Pin del punto de encuentro durante la asignación |
| Presencia de visitantes | Solo conteos por zona | — | Solo en el Ensayo de escenarios | Correcto por privacidad |
| Perfil (barrio) | No (texto libre) | Texto libre | No | Lista de barrios con centroide (U36) |
| Pasaporte (visitas) | Indirecto: `business_code` | QR | No | Sellos del pasaporte como pines "visitado" en el mapa (mejora) |

**Restricciones de caja hoy:** el corredor admite 10,85–11,10 / -74,90 a -74,70 (`corridor_schema.sql:20-21`), que **deja fuera a Puerto Colombia** (-74,955). Los lugares admiten 10,80–11,15 / -75,00 a -74,60 (`community_schema.sql:59-60`), que incluye parte del Magdalena. Las dos cajas deberían salir del mismo polígono del AMB (U09).

**Para la maqueta:**

- Un **mapa con capas por sección**: Planes (eventos), Lugares, Comunidad (conversaciones con punto; reportes de riesgo "sin confirmar" con borde punteado), Movilidad (paraderos, rutas, arroyos) y Negocios. El mapa deja de ser "el mapa del corredor" y pasa a ser la vista geográfica de toda la app.
- En cada lista (agenda, lugares, foro), un conmutador **Lista / Mapa** que muestre los mismos resultados con los mismos filtros.
- En cada detalle (evento, lugar, conversación con punto), un **minimapa** de unos 160 px con el pin y "Ver en el mapa", en lugar de la ilustración genérica y el enlace a Google Maps.
- En los formularios (evento, conversación de Seguridad, reporte de cobro), un **selector de punto** con el pin ya propuesto por el agente o por el lugar elegido.

### 6.5 Mapa limitado al Área Metropolitana

**Hoy:** dos mapas Leaflet (`corridor-map.tsx` en `/mapa` y `crowd-sim-panel.tsx` en `/ciudad`) con teselas de OpenStreetMap, encuadre inicial sobre el corredor (`fitBounds`), sin `maxBounds`, `minZoom` ni máscara. No hay archivo de límites en el repositorio; Soledad, Malambo y Galapa no aparecen en el código. Medido: al alejar se ven el Magdalena, Sitionuevo, la Isla Cabica y Pital de Megua.

**Propuesta para implementar y para la maqueta:**

1. **Polígono del AMB** (Barranquilla, Soledad, Malambo, Puerto Colombia y Galapa) como un solo GeoJSON simplificado en `src/lib/map/metro-area.ts`, con su fuente (DANE o IGAC) anotada en [04-cifras-verificadas.md](04-cifras-verificadas.md).
2. **Máscara:** un polígono que cubre el mundo con el AMB como hueco, relleno del color de fondo del tema (`--bg`, opaco) y un borde fino `--line-control` en el límite. Fuera del límite no se ve ninguna tesela.
3. **Límites de cámara:** `maxBounds` = caja del polígono con un margen pequeño, `maxBoundsViscosity: 1`, y `minZoom` calculado para que la caja llene la pantalla (con `getBoundsZoom`).
4. **Datos:** las restricciones de `stops`, `businesses`, `places` y las nuevas columnas de eventos y conversaciones se validan contra el mismo polígono en el servidor (o contra su caja, como mínimo). La "Vía Parque Isla de Salamanca" queda fuera: decidir si sale del catálogo o si se muestra como "fuera del área" sin pin.
5. **Etiquetas de municipio** dentro del límite, para que la persona vea que el mapa cubre los cinco.
6. **Mismo mapa base** en `/mapa`, en los minimapas de detalle, en el selector de punto y en el tablero de la ciudad: un solo componente de configuración (`createMetroMap()`).

### 6.6 Resumen para la maqueta

| Pantalla | Qué dibujar |
|---|---|
| Todas las del visitante | Dock cerrado con chip de contexto; dock abierto como hoja sobre la pantalla que sigue visible |
| `/inicio` | Dock abierto a pantalla completa; tarjetas de sección debajo; "Próximos planes" con mini mapa de pines |
| `/agenda` | Conmutador Lista / Mapa, filtros en chips (incluido "Cuándo"), estado "filtrado por Quillart · Quitar" |
| `/agenda/[id]` | Minimapa con pin, "Inscribirme" fijo abajo, chip de contexto con el evento |
| `/agenda/nuevo` | Borrador prellenado por el agente con los campos resaltados, selector de punto, cuenta pedida solo al publicar |
| `/foro`, `/foro/[id]` | Conversaciones de Seguridad con pin y estado "sin confirmar"; respuesta prellenada |
| `/lugares`, `/lugares/[slug]` | Lista / Mapa; minimapa en el detalle; "Ver en el mapa" que de verdad centra el lugar |
| `/mapa` | Máscara del AMB, capas por sección, ruta dibujada por el agente, hoja peek de "Tu siguiente paso", sin línea de tiempo |
| `/reportar` | Formulario prellenado desde la ruta y la conversación, con el punto del tramo |
| Sin sesión | Tarjeta de confirmación con "Inicia sesión para publicar" y regreso a la misma tarjeta |
| `/vendedor` | Dock con el agente del negocio (abrir o cerrar, precios) |
