# Diseño actual

Nombre del producto: **QUILLART** (Quilla + Smart + Art). Identidad: **el intérprete de la ciudad** (ver [20-identidad.md](20-identidad.md)).

Interpreta el saber local de Barranquilla para quien la visita en el Mundial: el idioma, el precio justo, el peligro de los arroyos y el barrio. Lo hace con un guía conversacional (**Quillart AI**), un motor de decisiones (**Decisor**) y una red de anfitriones en la calle. No es un gemelo digital.

**Actualización 27 nov 2026:** QUILLART es una **plataforma ciudadana real**, no un gemelo virtual ni una simulación. Conecta a residentes y visitantes entre sí y con la ciudad (eventos propios, inscripciones con cupos, foro moderado, espacios públicos y naturaleza). La puerta de entrada es **Quillart AI**: una conversación con agentes especializados por apartado, donde la voz es solo el conducto. Ver [20-comunidad-y-moderacion.md](20-comunidad-y-moderacion.md) y [21-quillart-ai.md](21-quillart-ai.md).

## Problema central

En 2034 Barranquilla recibe más visitantes de los que su información y sus servicios pueden orientar: datos de ciudad dispersos, transporte y tarifas sin referencia confiable y oferta local invisible. Resultado: visitante desorientado y cobrado de más, ciudad congestionada y gasto del Mundial lejos de los barrios.

## Programa en tres componentes

1. **Datos abiertos de ciudad:** transporte y tarifas, agenda cultural, calendario del Mundial, arroyos y clima.
2. **Red de anfitriones y negocios verificados:** duplas de adulto mayor y joven bilingüe; comités de barrio.
3. **Plataforma:** aplicación web para el visitante, QR en paraderos y estaciones, tablero para la ciudad.

## Arquitectura: escuchar, interpretar, acompañar

- **Escuchar:** datos abiertos institucionales, clima y arroyos, y lo que saben y reportan actores verificados (anfitriones, vendedores, visitantes).
- **Interpretar:** tres agentes.
  - **Guía:** asistente conversacional multilingüe; también traduce la jerga costeña.
  - **Recomendador:** sugiere qué hacer según los gustos del visitante; prioriza eventos ambientales y negocios de barrio.
  - **Decisor:** modelo de decisión de pesos abiertos (OpenJev). Elige la mejor ruta para el visitante y propone a la ciudad a dónde desviar multitudes.
- **Acompañar:** aplicación web, QR y WhatsApp, anfitriones en calle y, para la ciudad, "Lo que la ciudad aprende".

### Capa de comunidad y agentes (27 nov 2026)

- **Sentidos:** además de los datos institucionales, lo que publican las personas: eventos, conversaciones y avisos de problemas en el espacio público.
- **Cerebro:** el Guía se convierte en **Quillart AI**, un orquestador con seis agentes especializados: Agenda, Comunidad, Lugares y naturaleza, Movilidad (usa el Guía y el Decisor), Reportes a la ciudad y Cuenta. OpenJev, además de decidir rutas y desvíos, **modera** (triaje de cada publicación) y **enruta** la conversación al agente correcto.
- **Músculos:** landing en `/`; app con la conversación en `/inicio`; Agenda, Comunidad (foro), Lugares, Perfil y Mapa; cola de moderación de la ciudad en `/moderacion`; tablero de ciudad en `/ciudad` con el "Ensayo de escenarios" (simulador de multitudes como herramienta de planeación).

| Ruta | Qué es |
|---|---|
| `/` | Landing page |
| `/inicio` | Quillart AI: inicio de la app; acepta `?q=` |
| `/agenda`, `/agenda/nuevo`, `/agenda/<id>` | Eventos, publicar, detalle e inscripción |
| `/foro`, `/foro/<id>` | Comunidad: conversaciones y respuestas |
| `/lugares`, `/lugares/<slug>` | Espacios públicos y naturaleza |
| `/perfil` | Cuenta, inscripciones y publicaciones |
| `/mapa` | Corredor piloto, rutas y alertas |
| `/moderacion` | Cola de moderación (rol ciudad) |
| `/ciudad` | Tablero de ciudad (rol ciudad) |
| `/prueba-guia` | Gemini Live (beta) |

## Sistema de diseño (QUILLART Design System)

Dirección estética: **Tropical Cyber-Clean**, la calidez del Caribe con la precisión de un buen anfitrión.

**Modos de la plataforma**

- **Turista** (claro por defecto, también oscuro): desde el 27 nov abre en la conversación con Quillart AI; mapa y tarjeta de punto de interés quedan como un apartado. Lenguaje cercano, una acción primaria por vista; permite habla local ("trancón", "¡Ajá!").
- **Lo que la ciudad aprende** (antes "Centro de Mando"; recomendado oscuro): mapa con tráfico, tarjetas de decisión, KPIs, badge EN VIVO. Denso y sobrio, sin habla local.

**Principios**

1. El dato en vivo manda: cada cifra indica su frescura ("hace 30 s") y su fuente.
2. Color = estado, nunca decoración. Todo estado lleva además una palabra o un glifo.
3. Calidez local, precisión técnica: voz caribeña, geometría limpia, cifras tabulares.
4. Claro por defecto (turistas bajo el sol), oscuro para operar.

**Color (bandera de Barranquilla, significado fijo)**

| Color | Significado |
|---|---|
| Rojo | Alerta, congestión alta, EN VIVO. |
| Oro | Energía, turismo, Fan Fest, acción primaria, ruta recomendada. |
| Verde | Flujo óptimo, transporte disponible, zonas seguras. |

Superficies `bg` → `surface` → `surface-raised`; texto `ink` > `ink-muted` > `ink-subtle`. Contraste WCAG 2.1 verificado en ambos temas (texto ≥ 4,5:1; controles ≥ 3:1).

**Tipografía:** Space Grotesk para títulos y toda cifra de ciudad (KPIs); Inter para interfaz, mapa y conversación.

**Voz y contenido:** tutea, frases cortas con verbo primero ("Toma el Transmetro"); español de Colombia por defecto y ES/EN; sin emoji; la estrella de 8 puntas es el único adorno.

**Geometría de bandera:** franja tricolor 1 : 1 : 2 en el borde superior de cards de marca; marco concéntrico en tarjetas destacadas; estrella de 8 puntas como isotipo, indicador de "pensando" de la IA y marcador de usuario.

**Cartografía:** callejero limpio claro, arteriales en oro pálido; ruta activa en oro sobre borde oscuro; recorrido punteado; todo lo que flota sobre el mapa va en paneles. Tráfico distinguible por trazo (continuo, discontinuo, punteado), no solo por tono.

**Iconos e ilustración:** Lucide (trazo 1,75); ilustraciones unDraw con acento oro, solo en modo Turista.

**Implementación:** componentes en `window.Quillart` (React 18); tokens como variables CSS y preset para React + Tailwind. Movimiento con respeto a `prefers-reduced-motion`.

Fuente: artefacto "QUILLART" (sistema de diseño) en claude.ai.

## Cinco dimensiones

| Dimensión | Cómo la cubrimos |
|---|---|
| Ciudad y territorio | Rutas accesibles en el corredor Estadio – Malecón; QR en infraestructura que ya existe. |
| Sostenibilidad | Alerta de arroyos como resiliencia climática; rutas verdes; recompensas por eventos ambientales; sombra, hidratación y puntos de reciclaje en el mapa; catálogo de naturaleza (Ciénaga de Mallorquín, Isla de Salamanca, Bocas de Ceniza) con eventos de la comunidad. |
| Ciudad inteligente | Datos abiertos, Quillart AI con agentes especializados, moderación por triaje con OpenJev, tablero. |
| Ciudadanía | Anfitriones intergeneracionales, comités de barrio, reporte de cobros abusivos; eventos propios, inscripciones y foro moderado entre residentes y visitantes; avisos a la ciudad por el triaje. |
| Economía y oportunidades | Negocios populares verificados; el vendedor se marca abierto con un QR; sellos por visita. El sello de negocio verificado es el primer paso de una formalización progresiva, con capacitación (alcance y aliados por definir). |

## Corredor piloto

Estadio Metropolitano – Troncal Murillo – Centro – Barrio Abajo – Gran Malecón.

## Casos de uso

1. **Visitante extranjero en día de partido:** está en el Malecón, pregunta en su idioma, recibe ruta verde al estadio con tarifa justa y puede reportar un cobro abusivo.
2. **Visitante con movilidad reducida cuando cae un aguacero:** se activa la alerta de arroyo, la ruta se recalcula en modo accesible y lo recibe un anfitrión.
3. **Vendedora de fritos en Barrio Abajo:** se marca abierta, aparece en recomendaciones y recibe visitantes cuando la ciudad desvía gente desde el Malecón saturado.

### Matriz caso de uso × dimensión

Cada caso de uso articula las cinco dimensiones del reto en una misma interacción:

| Caso de uso | Ciudad y territorio | Sostenibilidad | Ciudad inteligente | Ciudadanía | Economía y oportunidades |
|---|---|---|---|---|---|
| **1. Visitante extranjero en día de partido** | Conecta el Gran Malecón con el Estadio Metropolitano sobre el corredor piloto usando QR en paraderos existentes. | Prioriza ruta verde (transporte público, a pie o en bici) con puntos de sombra, hidratación y reciclaje en el trayecto. | El Guía responde en su idioma y traduce jerga local; el Decisor calcula la ruta y muestra la tarifa oficial de referencia. | Permite reportar cobros abusivos en tiempo real y ofrece orientación de anfitriones verificados en el corredor. | Protege el gasto del visitante con tarifa justa y conductores verificados, y visibiliza negocios populares en la ruta. |
| **2. Visitante con movilidad reducida en aguacero** | Garantiza continuidad de viaje en modo accesible en el corredor sin construir infraestructura nueva. | Activa la alerta temprana de arroyos como resiliencia climática y evita zonas de riesgo hídrico. | Reglas duras descartan tramos inundados o no accesibles; el Decisor recalcula la ruta segura y la refleja en el tablero de ciudad. | Coordina a una dupla de anfitriones intergeneracionales (adulto mayor y joven bilingüe) para recibir y asistir al visitante. | Mantiene el acceso seguro a comercios y servicios verificados del corredor incluso durante lluvias fuertes. |
| **3. Vendedora de fritos en Barrio Abajo** | Descongestiona el Gran Malecón redistribuyendo flujos hacia Barrio Abajo dentro del mismo corredor piloto. | Promueve recorridos cortos a pie por el barrio y visibiliza eventos ambientales y puntos limpios cercanos. | El Decisor propone el desvío al tablero de ciudad; el Recomendador muestra el puesto abierto en tiempo real al visitante. | Involucra a comités de barrio y anfitriones locales para ordenar la llegada de visitantes y cuidar la convivencia. | Permite a la vendedora marcarse abierta con QR sin comisión, ganar visibilidad con sellos por visita y avanzar en formalización progresiva. |

## Indicadores (uno por dimensión)

| Dimensión | Indicador |
|---|---|
| Territorio | Porcentaje de rutas servidas en modo accesible. |
| Sostenibilidad | Porcentaje de trayectos en transporte público, a pie o en bici. |
| Ciudad inteligente | Conjuntos de datos abiertos publicados. |
| Ciudadanía | Anfitriones formados; reportes de cobro abusivo resueltos. |
| Economía | Negocios populares verificados y visitas que reciben. |

## Hoja de ruta

| Periodo | Hito |
|---|---|
| 2027 – 2028 | Abrir datos; piloto en un corredor durante el Carnaval. |
| 2029 – 2031 | Red de anfitriones y negocios en toda el área metropolitana. |
| 2032 – 2033 | Ensayo general en Carnaval y partidos de eliminatoria. |
| 2034 | Mundial. |
| 2035 en adelante | Plataforma oficial permanente. |
