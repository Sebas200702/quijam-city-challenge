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

Ver [07-alineacion-rubrica.md](07-alineacion-rubrica.md).

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
- Santiago: diseño UI/UX y frontend (#17 mapa del corredor, #22 PowerPoint).
- Esteban: investigación y programa (#7, #8, #10, #11, #12), nombre del producto (#14) y caso 1 de punta a punta (#19).
- Angel David: datos y backend (#16 modelo de datos y semilla, #24 tablero de ciudad) y matriz caso × dimensión (#9).
- Mateo: agentes IA (#18 Decisor, #21 Guía con Gemini Live).
- Comunicación: Santiago.
- Se agregan los issues #24 (tablero de ciudad básico) y #25 (despliegue en Dokploy).
