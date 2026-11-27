# Decisiones pendientes

Cada una trae la recomendación que salió de la sesión de validación. La columna Estado indica cuáles ya se decidieron.

| # | Tema | Recomendación de la sesión | Estado |
|---|---|---|---|
| 1 | Nombre del producto | Por definir en equipo. | Abierto |
| 2 | Frontera entre agentes | Guía entiende y responde; Recomendador decide qué hacer; Decisor decide cómo y cuándo llegar, y a dónde desviar gente. | Decidido (26 nov): se adopta tal cual |
| 3 | Decisor híbrido | Reglas duras descartan rutas con arroyo activo o no accesibles; OpenJev elige entre las que quedan. | Decidido (26 nov): se adopta tal cual |
| 4 | Plan B del Decisor | Una función propia (estado + opciones → opción + confianza) con OpenJev detrás si corre, o puntaje ponderado en código si no. | Decidido (26 nov): se adopta tal cual |
| 5 | Repositorio de OpenJev | Elegir cuál y probar si corre en algún equipo. Hoy: nunca se ha probado. | Decidido (26 nov): OpenJev por API en Codiv; ver [13-openjev.md](13-openjev.md) |
| 6 | Reparto de esfuerzo | Guía real, Decisor simple, Recomendador con reglas, tablero básico; el tiempo liberado va al programa, el PowerPoint y la bitácora. | Decidido (26 nov): se adopta tal cual |
| 7 | Panel de presentador | Tres disparadores: aguacero, Malecón saturado, cobro abusivo. | Abierto |
| 8 | Plan B sin internet | Respuestas del Guía guardadas para los tres casos y un video de respaldo. | Abierto |
| 9 | Privacidad | La ubicación se queda en el dispositivo; la ciudad recibe conteos anónimos; citar la Ley 1581 de 2012. | Abierto. Avance (27 nov): en la comunidad el perfil público es solo nombre y barrio, las inscripciones solo las ven la persona y el organizador, y el triaje rechaza teléfonos, correos y documentos sin enviarlos a OpenJev |
| 10 | Capa física | QR y pantallas en estaciones existentes más un render; sin red de tótems solares. | Abierto |
| 11 | Semáforos y tráfico vehicular | Cortarlos y dejarlos como conexión futura. | Abierto |
| 12 | Selector de modo de ciudad | Agregar a la demo (Mundial, Carnaval, cotidiano). | Decidido (26 nov): entra a la demo; el modo cotidiano responde a la lección "prioricen lo cotidiano" |
| 13 | Canal del vendedor (WhatsApp o QR) | Pantalla simulada dentro del caso 3. | Abierto |
| 14 | Arroyos dentro de Sostenibilidad | Sí. | Abierto |
| 15 | Validación externa | Cinco personas ajenas al equipo antes del Demo Day, para llegar al nivel "validado". | Abierto |
| 16 | Costo estimado | Tabla de rubros con rangos y supuestos visibles, sin cifra única inventada. | Resuelto (26 nov): ver [16-costos-estimados.md](16-costos-estimados.md) |
| 17 | Formato | PowerPoint obligatorio en el orden de la diapositiva 30, con la aplicación en vivo en el bloque de prototipo. | Abierto |
| 18 | Guion del video | Problema 40 s, propuesta 40 s, programa y dimensiones 60 s, demo de tres casos 120 s, impacto y legado 40 s. | Abierto |
| 19 | Roles | Coordinación, investigación, diseño, prototipado y comunicación. Somos 5 y los 5 programan. | Decidido (26 nov): ver README |
| 20 | Stack técnico | Ver [10-stack.md](10-stack.md). | Decidido (26 nov) |
| 21 | Comunidad (eventos, inscripciones, foro) | Plataforma ciudadana real con moderación por triaje. | Decidido (27 nov): ver [27-comunidad-y-moderacion.md](27-comunidad-y-moderacion.md) |
| 22 | Puerta de entrada | Quillart AI con orquestador y agentes especializados; la voz solo es el conducto. | Decidido (27 nov): ver [28-quillart-ai.md](28-quillart-ai.md) |
| 23 | Umbral de rechazo de OpenJev en moderación | 0,6: por debajo, el rechazo pasa a revisión humana. | Decidido (27 nov); revisar con lo que llegue a la cola |
| 24 | Quién modera en el Demo Day | Una persona del equipo con rol `city` atiende `/moderacion`. | Abierto |
| 25 | Despliegue de la capa de comunidad | Aplicar la migración y la semilla de comunidad en Supabase Cloud y cargar `SUPABASE_SERVICE_ROLE_KEY` en Dokploy. | Abierto |
| 26 | Reporte de contenido por las personas | Botón "reportar" que manda a la misma cola de la ciudad. | Decidido (27 nov): 3 reportes de personas distintas ocultan el contenido; ver [22-seguridad-y-confianza.md](22-seguridad-y-confianza.md) |
| 27 | Configuración de seguridad en Supabase y Dokploy | MFA para el rol ciudad, CAPTCHA en el registro, confirmación de correo e IP real detrás del proxy. | Abierto: ver la sección "Configuración que no está en el código" de [22-seguridad-y-confianza.md](22-seguridad-y-confianza.md) |
| 28 | Content-Security-Policy | Lista permitida para Leaflet, Google Fonts, Supabase y Gemini. | Abierto |

## Siguiente paso (Sprint 2, cierra la tarde del 26 nov)

Entregable: programa estructurado y prototipo inicial.

1. Cerrar los puntos 1 a 6 de esta lista.
2. Escribir el programa: componentes, actores, indicadores y ruta.
3. Levantar el mapa del corredor con datos semilla y el primer caso de uso de punta a punta.
4. Empezar el PowerPoint con las seis preguntas de la diapositiva 19.
5. Anotar lo que diga el jurado en la revisión del Sprint 1.

## Siguiente paso (Sprint 3, 27 nov)

Entregable: plataforma ciudadana real con Quillart AI como puerta de entrada.

1. Terminar el orquestador, los seis agentes y `POST /api/assistant` (ver [28-quillart-ai.md](28-quillart-ai.md)).
2. Desplegar la capa de comunidad en Supabase Cloud: migración, semilla, llave de servicio y rol de ciudad (punto 25).
3. Definir quién modera durante el Demo Day (punto 24).
4. Ensayar el recorrido: landing → conversación → inscripción → foro → aviso a la ciudad → cola de moderación.
