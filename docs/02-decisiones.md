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

## Bitácora de evolución (criterio de 10 puntos)

- Se pasó de "app" a "programa con tres componentes".
- Se eliminó la red social y se cambió por reportes de actores verificados.
- Se eliminó la integración con DiDi e inDrive al comprobar que no hay API pública.
- Se corrigieron cuatro cifras contra DANE y Cámara de Comercio.
- La alerta de arroyos pasó de extra a pilar al encontrar 134 muertes y ningún sistema público.
- Los tótems solares se cambiaron por QR en infraestructura existente, por costo.
- La gamificación se limitó a eventos ambientales.
- El Decisor se describió primero como motor de reglas; se corrigió al identificar OpenJev.
