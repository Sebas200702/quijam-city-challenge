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
