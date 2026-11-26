# Metodología de trabajo

Dos niveles:

1. **Marco del bootcamp:** tres sprints definidos por el organizador. Cada sprint termina con un entregable y una revisión.
2. **Flujo por cambio:** dentro de cada sprint, todo cambio (código o documento) sigue DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP.

## 1. Sprints del bootcamp

Cada sprint repite el ciclo del organizador (diap. 21):

| Paso | Qué hacemos |
|---|---|
| Planificar | Acordar qué queremos lograr y qué tareas haremos. Crear los issues del sprint. |
| Desarrollar | Investigar, diseñar, construir o probar. Un PR por tarea. |
| Revisar | Mostrar el avance en la revisión de sprint y recibir retroalimentación. |
| Ajustar | Registrar el feedback en [feedback.md](feedback.md), priorizar mejoras y definir el siguiente ciclo. |

| Sprint | Cuándo cierra | Objetivo | Entregable |
|---|---|---|---|
| 1 · Comprender y diseñar | Mañana del día 1 | Diagnóstico y causas; población beneficiaria y actores; problema central y propuesta de valor; objetivo, arquitectura inicial y mapa de las cinco dimensiones. | Diagnóstico, problema central y arquitectura inicial |
| 2 · Diseñar y construir | Tarde del día 1 | Programa y componentes articulados; primera versión del prototipo; funcionamiento, recursos, actores y alianzas; indicadores y hoja de ruta preliminar. | Programa estructurado y prototipo inicial |
| 3 · Validar y consolidar | Mañana del día 2 (Demo Day) | Ajustar programa y prototipo con el feedback; demostrar la solución; comunicar impacto, sostenibilidad y ruta; preparar presentación, video y evolución en tres sprints. | Iniciativa consolidada y Demo Day |

### Revisión de sprint

Según el deck (diap. 25), en cada revisión:

1. Mostramos lo que construimos y qué decisiones tomamos.
2. Explicamos qué funcionó, qué no y qué aprendimos.
3. Mentores y pares preguntan y dan retroalimentación.
4. Registramos las recomendaciones en [feedback.md](feedback.md) y definimos ajustes.
5. Comprobamos avances y orientamos el siguiente sprint.

Una persona del equipo toma nota durante toda la revisión.

## 2. Flujo por cambio

| Fase | Qué se hace | Resultado |
|---|---|---|
| DEFINE | Se crea un issue con el problema, el alcance y los criterios de aceptación. | Issue en el tablero |
| PLAN | Se divide en tareas pequeñas y se asigna responsable. | Tareas del issue, responsable asignado |
| BUILD | Se trabaja en una rama propia, con commits pequeños. | Rama con commits |
| VERIFY | Se comprueba que cumple los criterios de aceptación. En código: `astro check → lint → test → build`. | Evidencia en el PR (capturas, salida de pruebas) |
| REVIEW | Otra persona revisa y aprueba el PR. | 1 aprobación |
| SHIP | Se fusiona a `main` y se cierra el issue. | Cambio en `main`, issue cerrado |

Regla: sin issue no hay rama. Sin aprobación no hay fusión.

## 3. Gestión de tareas

- **GitHub Issues:** un issue por tarea, con criterios de aceptación.
- **GitHub Project:** tablero Kanban con columnas `Por hacer`, `En curso`, `En revisión`, `Hecho`.
- Cada issue lleva la etiqueta de su sprint (`sprint-1`, `sprint-2`, `sprint-3`) y el tipo (`programa`, `prototipo`, `presentacion`, `investigacion`).
- El PR se enlaza al issue con `Closes #<número>` en la descripción.

## 4. Roles

Roles sugeridos por el deck (diap. 20): coordinación, investigación, diseño, prototipado, comunicación. Los roles pueden rotar; la responsabilidad es colectiva.

Asignación: por definir (pendiente #19).

## 5. Acuerdos del equipo

Reglas de oro del bootcamp (diap. 31):

1. Escuchen antes de proponer.
2. Piensen en grande: diseñen programas, no respuestas aisladas.
3. Construyan con propósito: la tecnología resuelve necesidades.
4. Colaboren antes de competir; integren las cinco dimensiones.
5. Evolucionen: prueben, escuchen la retroalimentación y mejoren.

Registro: toda decisión se anota en [02-decisiones.md](02-decisiones.md) el mismo día.
