# Diseño actual

Nombre del producto: **por definir**. Lema provisional: sistema nervioso urbano para Barranquilla 2034.

## Problema central

En 2034 Barranquilla recibe más visitantes de los que su información y sus servicios pueden orientar: datos de ciudad dispersos, transporte y tarifas sin referencia confiable y oferta local invisible. Resultado: visitante desorientado y cobrado de más, ciudad congestionada y gasto del Mundial lejos de los barrios.

## Programa en tres componentes

1. **Datos abiertos de ciudad:** transporte y tarifas, agenda cultural, calendario del Mundial, arroyos y clima.
2. **Red de anfitriones y negocios verificados:** duplas de adulto mayor y joven bilingüe; comités de barrio.
3. **Plataforma:** aplicación web para el visitante, QR en paraderos y estaciones, tablero para la ciudad.

## Arquitectura: sentidos, cerebro, músculos

- **Sentidos (captar):** datos abiertos institucionales, clima y arroyos, reportes de actores verificados.
- **Cerebro (decidir):** tres agentes.
  - **Guía:** asistente conversacional multilingüe; también traduce la jerga costeña.
  - **Recomendador:** sugiere qué hacer según los gustos del visitante; prioriza eventos ambientales y negocios de barrio.
  - **Decisor:** modelo de decisión de pesos abiertos (OpenJev). Elige la mejor ruta para el visitante y propone a la ciudad a dónde desviar multitudes.
- **Músculos (actuar):** aplicación web, QR y WhatsApp, tablero de ciudad, anfitriones en calle.

## Cinco dimensiones

| Dimensión | Cómo la cubrimos |
|---|---|
| Ciudad y territorio | Rutas accesibles en el corredor Estadio – Malecón; QR en infraestructura que ya existe. |
| Sostenibilidad | Alerta de arroyos como resiliencia climática; rutas verdes; recompensas por eventos ambientales; sombra, hidratación y puntos de reciclaje en el mapa. |
| Ciudad inteligente | Datos abiertos, tres agentes, tablero. |
| Ciudadanía | Anfitriones intergeneracionales, comités de barrio, reporte de cobros abusivos. |
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
