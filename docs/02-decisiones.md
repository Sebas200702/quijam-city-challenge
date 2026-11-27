# Decisiones y evolución

## Idea original

Un mapa tipo red social con geolocalización que muestra en tiempo real eventos, partidos, museos, desfiles, rutas y tarifas de transporte, conexión con DiDi e inDrive y puntos de interés, apoyado con IA.

### Puntos débiles encontrados

- Describe un síntoma (el turista no sabe qué pasa), no una causa.
- Suena a Google Maps + Instagram + app de la FIFA.
- Sin legado: una app de Mundial muere al mes.
- Cubría dos de las cinco dimensiones.
- Una red social nueva arranca vacía y exige moderación.
- DiDi e inDrive no ofrecen integración pública.

## Decisiones ya tomadas

- Debe cubrir las cinco dimensiones a la vez.
- El foco es el Mundial 2034 y el usuario principal es el visitante. El legado para residentes es obligatorio, no el foco.
- El diferenciador es la capa local: transporte con tarifa justa, eventos de barrio, economía popular y puntos de interés.
- Sin red social.
- MVP como aplicación web, con escenarios y datos simulados de 2034.
- Es una plataforma dentro de un programa, con datos abiertos y tres agentes de IA.
- Tarifa justa con tres piezas: tarifa oficial de referencia por trayecto, conductores verificados con QR y botón para reportar cobros abusivos.
- Se saca del pitch la integración con DiDi e inDrive.
- Operación: Alcaldía (Turismo) y Área Metropolitana como dueñas de los datos; universidades locales mantienen; patrocinio y comisión cero para negocios populares.
- La plataforma queda de forma permanente en la ciudad.
- Gamificación y recompensas solo para eventos ambientales, que son los que menos atraen.
- Implementación real, con escenarios de laboratorio medidos y ensayados antes.
- El agente de decisión sirve tanto al visitante como a la ciudad y usa OpenJev.
- Tres casos de uso, cinco indicadores y hoja de ruta aprobados (ver [03-diseno-actual.md](03-diseno-actual.md)).

## Decisiones del repositorio (26 nov 2026)

- Nombre del repositorio neutro (`quijam-city-challenge`) mientras se decide el nombre del producto.
- Repositorio privado en GitHub; sin licencia por ahora.
- PR obligatorio a `main`, ramas `feat/*`, Conventional Commits.
- Los cinco integrantes programan; roles por definir.
- Stack por definir en equipo.
- OpenJev no se ha probado en ningún equipo.
- Protección de `main` aplica a todos, incluido el admin.
- README bilingüe: español principal con resumen en inglés; `docs/` en español.

## Decisiones de producto (26 nov 2026)

- **Frontera entre agentes:** Guía entiende y responde; Recomendador decide qué hacer; Decisor decide cómo y cuándo llegar, y a dónde desviar gente.
- **Decisor híbrido:** reglas duras descartan rutas con arroyo activo o no accesibles; OpenJev elige entre las que quedan.

## Alineación con el deck del organizador (26 nov 2026)

Ver [12-alineacion-rubrica.md](12-alineacion-rubrica.md).

- **Sostenibilidad:** se agregan residuos (puntos de reciclaje en el mapa) además del agua. Energía queda fuera.
- **Economía:** se agrega formalización progresiva y capacitación, con el sello de negocio verificado como primer paso.
- **Lo cotidiano:** el selector de modo de ciudad entra a la demo; el modo cotidiano muestra el uso diario del residente.
- **Feedback:** se registra en [feedback.md](feedback.md).

## Metodología y convenciones (26 nov 2026)

Ver [08-metodologia.md](08-metodologia.md) y [09-convenciones.md](09-convenciones.md).

- Marco: los tres sprints del bootcamp. Dentro de cada sprint, cada cambio sigue DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP.
- Tareas en GitHub Issues + GitHub Project.
- PR de ~400 líneas con 1 aprobación.
- Código y commits en inglés; PR, issues y docs en español.

## Stack técnico (26 nov 2026)

Ver [10-stack.md](10-stack.md).

- Astro + React 19 + Tailwind CSS v4 + TypeScript strict.
- Mapa con Leaflet.
- Supabase Cloud (plan gratis) para datos, Auth y Realtime.
- Guía con Gemini Live API: voz en tiempo real y texto como respaldo.
- Bun + Biome + Vitest.
- Despliegue en Dokploy (VPS propio).

## Bitácora de evolución (criterio de 10 puntos)

- Se pasó de "app" a "programa con tres componentes".
- Se eliminó la red social y se cambió por reportes de actores verificados.
- Se eliminó la integración con DiDi e inDrive al comprobar que no hay API pública.
- Se corrigieron cuatro cifras contra DANE y Cámara de Comercio.
- La alerta de arroyos pasó de extra a pilar al encontrar 134 muertes y ningún sistema público.
- Los tótems solares se cambiaron por QR en infraestructura existente, por costo.
- La gamificación se limitó a eventos ambientales.
- El Decisor se describió primero como motor de reglas; se corrigió al identificar OpenJev.

## Decisor y reparto de esfuerzo (26 nov 2026)

- **Plan B del Decisor:** una función propia (estado + opciones → opción + confianza). OpenJev detrás si corre; si no, puntaje ponderado en código.
- **Reparto de esfuerzo:** Guía real, Decisor simple, Recomendador con reglas, tablero básico. El tiempo liberado va al programa, el PowerPoint y la bitácora.

## Roles y asignación (26 nov 2026)

Base: la asignación hecha por Sebastián en el tablero. Se completaron los issues sin responsable y se dejó un solo responsable por issue.

- Sebastián: coordinación y líder técnico (#13 roles, #15 scaffold, #20 OpenJev, #25 despliegue).
- Santiago: diseño UI/UX y frontend (#17 mapa del corredor, #19 caso 1 de punta a punta, #22 PowerPoint).
- Esteban: investigación y programa (#7 objetivo, #8 causas y actores, #11 recursos y alianzas, #14 nombre).
- Angel David: datos y backend (#16 modelo de datos y semilla, #24 tablero de ciudad), #9 matriz caso × dimensión y #12 tabla de costos.
- Mateo: agentes IA (#18 Decisor, #21 Guía con Gemini Live) y #10 desvío a Barrio Abajo, que es una salida del Decisor.
- Redistribución: Esteban tenía 7 issues; #19, #10 y #12 pasan a Santiago, Mateo y Angel. Carga final: 3 a 4 issues por persona.
- Comunicación: Santiago.
- Se agregan los issues #24 (tablero de ciudad básico) y #25 (despliegue en Dokploy).

## OpenJev por API (26 nov 2026)

- Se descarta correr OpenJev local en CPU: lento, requiere servicio Python y el modelo de 0,6B eligió mal el desvío de multitudes.
- El Decisor usa OpenJev por API en Codiv (`openjev-latest`, gratis mientras dure el experimento). Ver [13-openjev.md](13-openjev.md).
- El puntaje ponderado sigue siendo el plan B obligatorio.

## Mapa del corredor (26 nov 2026)

- El tema claro es el predeterminado de la app (turista bajo el sol, como dice QUILLART); el Centro de Mando sigue arrancando en oscuro. La elección se guarda en el navegador.
- Mapa base: teselas estándar de OpenStreetMap, sin llave. CARTO pasó a exigir API key.
- La línea del corredor sigue las calles: se generó una vez con OSRM (perfil a pie) y se guarda en el repositorio como polyline, para que funcione sin internet.
- Si Supabase no está configurado o no responde, el mapa usa una copia local de `supabase/seed.sql` y lo dice en pantalla.
- La interfaz del mapa usa los componentes `q-*` de QUILLART e iconos de `lucide-react`. Una tarjeta con el detalle del punto reemplaza los popups de Leaflet.

## Caso 1: Guía y reporte (26 nov 2026)

- El Guía responde por texto en el idioma del visitante. Con `GEMINI_API_KEY` redacta Gemini usando solo nuestros datos; sin llave o si falla, responde un Guía local en español, inglés, portugués, francés y alemán.
- La tarjeta de ruta siempre sale del planificador y el Decisor, nunca del texto del modelo.
- Ruta verde primero; el taxi verificado aparece como alternativa con su rango de tarifa justa.
- El reporte de cobro abusivo se guarda desde el servidor con la llave pública (aplica RLS) y no pide nombre, teléfono ni ubicación. Sin conexión queda guardado en el teléfono.
- Guion de ensayo en [19-caso-1.md](19-caso-1.md).

## Consolidación de rutas y alertas (26 nov 2026)

- **Una sola fuente de tramos:** `segments` en los datos del corredor (de #64). `/api/decidir` los lee de ahí.
- **Un solo canal `city-events`:** el de #66 (`src/lib/city-events/`). El de #63 no se trae.
- **Rutas del visitante en el mapa:** `planRoute` + `/api/decidir` (itinerarios de varios tramos, reglas duras, OpenJev, puntaje ponderado).
- **Guía del caso 1:** `trip-planner` de #64 se mantiene para las respuestas multilingües; usa el mismo núcleo del Decisor (reglas duras y puntaje). Mapa y Guía coinciden en el caso 1.
- **Alerta de arroyos:** cuenta regresiva de #62 y banner de #63 sobre el mapa. Los planificadores duplicados de #62 (`route-options`, `route-recalc`, semilla propia) no se traen.

## Identidad: el intérprete de la ciudad (26 nov 2026)

- El jurado nos catalogó como "gemelo digital". Se define una identidad propia: **QUILLART, el intérprete de la ciudad**. Ver [20-identidad.md](20-identidad.md).
- Se abandona el lema "sistema nervioso urbano" y la arquitectura pasa a "escuchar, interpretar, acompañar".
- "Centro de Mando" pasa a "Lo que la ciudad aprende".
- La demo abre siempre desde el celular de una persona; el tablero y el simulador solo se muestran al cierre, como impacto.
- El intérprete trabaja en dos direcciones y le da el mismo peso al barranquillero que al visitante: el Mundial es la vitrina y el día a día es el propósito. Respuestas para el equipo en [21-respuestas.md](21-respuestas.md).

## QR del jurado y presencia en vivo (26 nov 2026)

- **Presencia anónima:** el conteo de jurados y visitantes conectados usa un canal público de Supabase Realtime Presence (`visitor-presence`) con un ID temporal (`vis_...`) en `sessionStorage`, sin registro ni datos personales. La identidad del conteo es la clave de presencia del canal.
- **Generación de QR offline:** se adopta la dependencia `qrcode` para renderizar el QR directamente en el navegador sin servicios externos, manteniendo la operación sin conexión.

## Plataforma ciudadana real y Quillart AI como puerta de entrada (27 nov 2026)

Dirección del líder del equipo, en orden. Detalle en [27-comunidad-y-moderacion.md](27-comunidad-y-moderacion.md) y [28-quillart-ai.md](28-quillart-ai.md).

1. **Entorno real, no simulación.** La app conecta a residentes de Barranquilla y visitantes entre sí y con el entorno: cada persona registra sus propios eventos, se inscribe con cupos, abre conversaciones en un foro y descubre espacios públicos y naturaleza. Se revisa la decisión "Sin red social" del 26 nov: hay comunidad, pero toda publicación pasa por el triaje de moderación.
2. **No solo el mapa; foros moderados con OpenJev.** El mapa pasa a ser un apartado más. El foro, los eventos y las respuestas se moderan con triaje automático: reglas duras primero, OpenJev con tres preguntas (veredicto, etiqueta, prioridad) después, gana lo más estricto; un rechazo de OpenJev con confianza menor a 0,6 pasa a revisión humana; sin OpenJev decide solo con reglas. Los datos personales nunca se envían a OpenJev. Solo el servidor (llave de servicio) inserta contenido público. Lo retenido lo ven su autor y la ciudad, que lo revisa en `/moderacion`.
3. **Tareas y documentación ajustadas.** Nueva épica en GitHub con sus sub-issues; cambian las reglas 2, 5 y 9 de la épica #57; nuevos documentos 20 y 21.
4. **Separarse del gemelo virtual; landing page.** QUILLART deja de presentarse como gemelo virtual o simulación de la ciudad. Se crea una landing en `/` y la app pasa a `/inicio`. Los datos que escriben las personas son reales; los datos semilla del corredor se marcan de forma discreta como "datos de referencia" (antes "datos simulados 2034"). El simulador de multitudes se queda como herramienta de planeación de la ciudad: "Ensayo de escenarios".
5. **La IA conversacional es la puerta de entrada.** Quillart AI es la pantalla de inicio (`/inicio`) y el conducto para conocer y ejecutar acciones: buscar, inscribirse, publicar, avisar a la ciudad. Toda acción se confirma en una tarjeta antes de ejecutarse y corre en el navegador con la sesión de la persona. Cada pantalla tiene un atajo "Pregúntale a Quillart" con `?q=`.
6. **Agentes especializados; la voz solo es el conducto.** Un orquestador (continuación → palabras clave → OpenJev → agente por defecto) elige entre seis agentes: Agenda, Comunidad, Lugares y naturaleza, Movilidad, Reportes a la ciudad y Cuenta. Cada uno tiene sus instrucciones y solo sus herramientas. Gemini con llamadas a funciones redacta; si no hay llave o falla, responde un agente local determinista. La voz usa la Web Speech API del navegador (habla a texto y texto a habla); Gemini Live queda en beta en `/prueba-guia`.

7. **Landing y app más visuales, menos texto.** La landing se rehízo con ilustraciones unDraw (una por agente), títulos cortos y chips de ejemplo; se quitaron los párrafos largos y las preguntas frecuentes. Las ilustraciones llegan también a los encabezados de sección, a los estados vacíos y al detalle de lugares y eventos. Ver [07-sistema-de-diseno.md](07-sistema-de-diseno.md).
8. **Nada inventado en pantalla.** Se quitaron del inicio el partido "Hoy 19:30" y el clima fijo "31° soleado". El clima solo se mostrará cuando venga de una fuente real.

Cambios de producto frente a la épica #57:

- **Regla 2:** el inicio ya no abre en el mapa sino en la conversación con Quillart AI. Navegación móvil: Quillart (Inicio), Agenda, Comunidad, Lugares, Perfil.
- **Regla 5:** se navega sin cuenta; la cuenta solo se pide para participar (inscribirse, publicar, responder).
- **Regla 9:** contenido real de las personas, más una etiqueta discreta "datos de referencia" para la semilla del corredor.
- Nueva variable de entorno solo de servidor: `SUPABASE_SERVICE_ROLE_KEY`.

9. **Seguridad y confianza (27 nov 2026).** Se implementa la capa completa descrita en [22-seguridad-y-confianza.md](22-seguridad-y-confianza.md): etiquetas de desinformación y suplantación en el triaje, nombres reservados, enlaces externos a revisión, política de confianza (primer evento de cuentas nuevas y eventos con costo de organizadores no verificados van a revisión), botón "Reportar" (3 reportes ocultan), reportes ciudadanos "sin confirmar" hasta que la ciudad los confirma, organizadores verificados, auditoría de moderación, límites de uso en todas las API, cabeceras de seguridad, blindaje de Quillart AI contra *prompt injection* (datos no confiables, una acción por turno, texto exacto editable en la confirmación) y descarga y eliminación de datos (Ley 1581).

### Bitácora

- Se pasó de "sin red social" a una comunidad moderada por triaje (reglas + OpenJev + revisión humana), que responde al riesgo original: "una red social nueva arranca vacía y exige moderación". No arranca vacía: la semilla trae lugares reales de la ciudad y una agenda inicial publicada por el equipo ("Agenda QUILLART").
- OpenJev pasó de decidir solo rutas y desvíos a moderar contenido y enrutar la conversación entre agentes.
- El Guía pasó de un chat con un solo agente a un orquestador con seis agentes especializados.

## Flujo de cobro abusivo (26 nov 2026)

- **ID generado en servidor sin romper RLS:** `POST /api/reports` genera `reportId` con `crypto.randomUUID()` antes de insertar en `overcharge_reports` (sin `.select()`), preservando la política anónima de RLS mientras permite emitir `{ type: "cobro_abusivo", reportId }` en el canal compartido `city-events`.
- **Una sola fuente de tarifas:** el formulario dedicado `/reportar`, el formulario dentro del Guía y la bandeja del tablero consumen los trayectos y tarifas oficiales desde `route_segments` (con respaldo en la semilla local marcada como datos de referencia).
- **Vocabulario consistente en bandeja:** el valor de base de datos `'open'` se mantiene sin migración destructiva y se muestra en la interfaz como **Nuevo**, siguiendo el flujo **Nuevo → En revisión → Resuelto** que actualiza en vivo el indicador de reportes resueltos en `/ciudad`.

## Arquitectura de información alineada con la dirección del 27 nov (27 nov 2026)

Ver [26-arquitectura-de-informacion.md](26-arquitectura-de-informacion.md). Issues #56 y #140. Trae a `main` el documento de #137 (que se fusionó en `feat/quillart-ux-components` y no llegó a `main`) y lo reescribe con las reglas 2, 5 y 9 actualizadas.

- **Número 26:** sigue la propuesta de #141 (20 y 21 repetidos). Los enlaces a los demás documentos usan los nombres actuales; #141 los actualiza al renumerar.
- **Inicio de la persona = Quillart AI en `/inicio`.** `/` es la landing pública. El mapa, la tarjeta "tu siguiente paso" y el antiguo Guía dejan de ser el inicio: el mapa es un apartado (`/mapa`) y una tarjeta de sección dentro del inicio; "tu siguiente paso" es una tarjeta dentro de la conversación o del mapa; el Guía es Quillart AI. El mapa es la vista de lo que responde el agente de Movilidad, no un segundo asistente.
- **Cinco superficies, igual que en #137:** persona (`/inicio`), vendedor (`/vendedor`, #49), anfitrión (`/anfitrion`, #50), ciudad (`/ciudad` y `/moderacion`) y presentador (`/presentador`, #41). Se mantienen el presupuesto de interrupciones, la matriz superficie × `city-events`, el glosario y el guion de prueba con 2 personas.
- **Entrada:** se navega sin cuenta. La cuenta de la comunidad (`profiles`) se pide solo para participar; `is_verified_organizer` es una marca de confianza que pone la ciudad, no un rol; el rol operativo sigue en `user_profiles.role` (`visitor`, `vendor`, `city`). Ya no se propone sesión anónima obligatoria para la persona.
- **Roles:** `host` y `presenter` quedan como propuesta para #50 y #41. La guardia de rutas se suma al `src/middleware.ts` existente con `sequence()`, sin tocar las cabeceras de seguridad, y necesita la sesión en cookies (`@supabase/ssr`); mientras tanto siguen las puertas del cliente y la validación en las API.
- **Datos de referencia:** `.q-sim-tag` se documenta con el texto "Datos de referencia", solo sobre la semilla del corredor y una vez por pantalla. El texto lo ponen los componentes (no vive en el CSS); en `main` ya dice "Datos de referencia" en todos. El simulador se llama "Ensayo de escenarios" y el tablero "Lo que la ciudad aprende".
- **`city-events`:** sin tipos nuevos. `cobro_abusivo` lo publica hoy el navegador después de que `POST /api/reports` devuelve el `reportId` (#142); cuando el canal sea privado lo publicará el servidor. `desvio` sigue como propuesta.
- **Glosario:** los estados del reporte de cobro son los del código: Nuevo, En revisión, Resuelto, Descartado (reemplaza la línea de #137 que pedía "Abierto"). Se suman Quillart AI, agente, Confirmar, cuenta, organizador verificado, sin confirmar, moderación, datos de referencia y Ensayo de escenarios.

## Portal de datos abiertos (27 nov 2026)

- **Seis conjuntos con separación de origen (regla 9):** `/datos` y `/api/datos/` publican bajo licencia **CC BY 4.0** dos conjuntos de la plataforma ciudadana (`lugares` y `eventos` publicados) y cuatro conjuntos del corredor piloto (`paraderos`, `tarifas-y-tramos`, `arroyos` y `negocios-verificados`), marcados explícitamente como **datos de referencia** (no como datos oficiales).
- **Privacidad por lista blanca (Ley 1581 de 2012):** cada conjunto declara su lista blanca de columnas públicas; `projectPublicRecords` descarta cualquier campo fuera de la lista y `eventos` solo consulta registros con `moderation_status = 'published'` y `status = 'published'`, sin perfiles, organizadores ni inscripciones.
- **CSV seguro y API protegida:** `serializeToCsv` aplica formato RFC 4180 y neutraliza inyección de fórmulas en hojas de cálculo (conservando coordenadas negativas), y `/api/datos/` aplica el límite `open-data` en `guardRequest`.

## Indicadores en vivo del programa (27 nov 2026)

- **Cinco dimensiones con separación real vs. referencia (regla 9 y épica #79):** el panel de indicadores en `/ciudad` muestra Territorio, Sostenibilidad, Ciudad inteligente, Ciudadanía y Economía con valor actual, meta y barra `.q-meter` con palabra de estado (`En meta`, `En avance`, `Por mejorar`). Cada tarjeta separa en bloques distintos los datos reales de la comunidad (`events`, `registered_count`, avisos cerrados con `triage_priority <> 'none'` y `city_resolved_at`, `places`) de los datos semilla del corredor (`Datos de referencia`).
- **Actualización dual en tiempo real:** `LiveIndicatorsPanel` se suscribe a `supabase_realtime` (`events`, `forum_threads`, `forum_posts`, `overcharge_reports`, `flood_zones`, `businesses`, `route_segments`, `places`) y reacciona al canal compartido `city-events` (`cobro_abusivo`, `aguacero`, `reiniciar`). El conteo de conjuntos abiertos lee `/api/datos/` en vivo con respaldo base de 6 conjuntos.

## App instalable y sin conexión (27 nov 2026)

Issue #47.

- **Inicio de la app instalada = `/inicio`** (Quillart AI). El manifiesto (`public/manifest.webmanifest`) y los íconos de `public/icons/` siguen el `.q-logo__tile`: baldosa verde, marco oro y la estrella blanca de 8 puntas.
- **Service worker escrito a mano, sin dependencias nuevas.** La lógica vive en `src/lib/offline/` (TypeScript, con pruebas); la integración `service-worker-integration.ts` lo empaqueta con Vite después de `astro build`, lista los archivos del build para guardarlos y saca la versión de esa lista. Solo se registra en producción; en `astro dev` se borra cualquier worker que haya quedado.
- **Estrategias:** páginas con red primero (espera 4 s) y copia guardada, después `/offline`; archivos con hash, caché primero; teselas del mapa con límite de 400; el catálogo de lugares de Supabase, red primero. Las `/api` y todo lo que no sea GET van siempre a la red.
- **Sin red, Quillart AI responde con los agentes locales en el teléfono** (sin proponer acciones) y el Guía y `plan_route` responden las tres rutas desde el Gran Malecón con la semilla del corredor.
- **Notificación de arroyo:** solo mientras la app está abierta (en primer o segundo plano); no hay Web Push. En el mapa sale solo con la app en segundo plano, porque en primer plano ya está el modal; en Quillart AI y en las pantallas de comunidad sale si la persona ya dio permiso. El permiso se pide únicamente con un botón bajo la banda del arroyo, nunca al cargar (regla 4). El formato (`AppNotification`) sirve para los recordatorios de eventos (#91).

## Mapa limitado al Área Metropolitana (27 nov 2026)

Auditoría UI/UX v2 ([30-auditoria-ui-ux.md](30-auditoria-ui-ux.md), U07, U09, U32) y decisión del líder de producto.

- **El mapa muestra solo el Área Metropolitana de Barranquilla** (Barranquilla, Soledad, Malambo, Puerto Colombia y Galapa). Lo de afuera no se ve: una máscara opaca del color del tema lo cubre (sin mar, río ni calles), la cámara no sale de la caja del AMB y las teselas solo se piden sobre ella. Mismo marco en `/mapa` y en el Ensayo de escenarios (`createMetroMap()`).
- **Límites de OpenStreetMap** (ODbL), simplificados y guardados en el repositorio; el crédito "OpenStreetMap contributors" va en el mapa. Fuente en [04-cifras-verificadas.md](04-cifras-verificadas.md).
- **El mapa georreferencia el resto de la app sin ser el inicio.** Capas de puntos registrables (hoy Lugares; luego eventos y conversaciones), enlaces `/mapa?lugar=…&evento=…&lat=…&lng=…` y `focusMap()` para el dock del agente. Detalle en [24-datos-faltantes-ui.md](24-datos-faltantes-ui.md).
- **Los lugares fuera del AMB no se borran**: siguen en `/lugares` con la etiqueta "Fuera del área metropolitana" y sin pin.
- **Agrupación de pines propia** (sin `Leaflet.markercluster`): círculos numerados por debajo del zoom 15.

## Recordatorios y notificaciones de eventos (27 nov 2026)

Issue #91.

- **Bandeja privada con RLS y cascada (Ley 1581):** se crea `public.user_notifications` (`20261129000003_user_notifications.sql`) registrada en `supabase_realtime`, con lectura/actualización/borrado restringidos al propio usuario e inserciones únicamente desde el servidor (service role) o triggers `security definer` (`trg_events_notify_cancelled` al cancelar un evento). Al eliminar la cuenta se borran en cascada.
- **Presupuesto de interrupciones (regla 4 de #57):** ningún recordatorio de evento ni aviso de moderación abre modal ni pide permiso al cargar. Dentro de la app aparece como máximo una tarjeta discreta (`EventNotifier`) y la bandeja completa en `/perfil#mis-avisos` (`NotificationsPanel`); las notificaciones web reutilizan `AppNotification` con `requireInteraction: false` y el usuario puede desactivar ambos canales en cualquier momento.
- **Recordatorios del día anterior sin cron externo:** los eventos inscritos que comienzan en las próximas 24 horas generan recordatorios deterministas por día (`buildUpcomingEventReminders`) deduplicados localmente.

## Editar eventos con nuevo triaje (27 nov 2026)

Issue #92.

- **Sin `UPDATE` directo desde el cliente:** se mantiene la política de base de datos que solo permite al cliente actualizar `status` para cancelar. Toda edición de título, descripción, fecha, lugar, cupos o entrada pasa por `PATCH /api/community/events/[id]` con llave de servicio (`updateEventContent`), verificando autoría y bloqueando cupos menores a `registered_count`.
- **Re-triaje obligatorio en cambios de texto o cobro:** si cambia título, descripción o condición de pago, el servidor vuelve a ejecutar `triageContent` + `applyTrustPolicy`; si el veredicto es `reject` no sobrescribe el evento (`422`), y si es `hold` lo retiene (`moderation_status = 'held'`) hasta decisión de la ciudad en `/moderacion`.
- **Aviso automático a inscritos:** cuando cambia la fecha o el lugar de un evento publicado, el servidor inserta avisos `event_updated` en `user_notifications` para todas las personas inscritas.
