# Costos estimados con rangos y supuestos

Responde al issue **#12** (pendiente #16). Criterio de la rúbrica: **viabilidad, sostenibilidad e impacto (10)**. Se apoya en los aliados propuestos en [15-recursos-y-alianzas.md](15-recursos-y-alianzas.md) y en la hoja de ruta de [03-diseno-actual.md](03-diseno-actual.md).

**Aviso:** todos los valores están expresados en **pesos colombianos (COP)** como **rangos preliminares de orden de magnitud**, no como cotizaciones cerradas ni un presupuesto aprobado. No se usa una cifra única porque los proyectos asociados a megaeventos cuestan en promedio **172 % más** de lo presupuestado inicialmente (Flyvbjerg, Budzier y Lunn, 2021; ver [04-cifras-verificadas.md](04-cifras-verificadas.md)).

## 1. Costo estimado del piloto del corredor (Fase 1 · 12 meses, 2027 – 2028)

Alcance: corredor piloto **Estadio Metropolitano – Troncal Murillo – Centro – Barrio Abajo – Gran Malecón**, con ensayo operativo en Carnaval.

| Rubro | Mínimo (COP) | Máximo (COP) | Supuestos visibles (mínimo vs. máximo) | Quién cubre / aporta (propuesto) |
|---|---:|---:|---|---|
| **1. Infraestructura en la nube y despliegue** | $4.000.000 | $12.000.000 | **Mín:** 1 VPS con Dokploy + Supabase plan base + dominio/TLS para tráfico de piloto (~$333.000/mes). **Máx:** alta disponibilidad, réplicas, monitoreo y escalado para picos de Carnaval (~$1.000.000/mes). | Patrocinadores / Alcaldía |
| **2. APIs de IA y voz (Guía + Decisor)** | $6.000.000 | $30.000.000 | **Mín:** Gemini Live con límites de sesión y respaldo de texto + Decisor en OpenJev sin costo o puntaje ponderado propio. **Máx:** alto volumen de voz multilingüe en vivo en picos de evento + cómputo dedicado si el endpoint público de OpenJev deja de ser gratuito. | Patrocinadores |
| **3. Desarrollo, datos abiertos y mantenimiento** | $35.000.000 | $90.000.000 | **Mín:** convenio con universidades locales (prácticas/semilleros + 1 coordinador técnico) y datos entregados en formato abierto por Alcaldía y AMB. **Máx:** equipo contratado (2 desarrolladores medio tiempo + limpieza e integración de datos de transporte, tarifas y arroyos). | Universidades (en especie) + Patrocinadores |
| **4. Capa física liviana (QR en infraestructura existente)** | $8.000.000 | $25.000.000 | **Mín:** 40 – 60 placas QR resistentes a clima/sol en paraderos y estaciones existentes + kits QR para 50 negocios populares y taxis voluntarios. **Máx:** hasta 120 puntos QR con señalética bilingüe y reposición por desgaste o vandalismo. *Sin tótems solares.* | Alcaldía (permisos) + Patrocinadores |
| **5. Red de anfitriones, comités y capacitación** | $20.000.000 | $60.000.000 | **Mín:** 15 – 25 duplas intergeneracionales (adulto mayor + joven bilingüe) con formación en especie de universidades y Cámara de Comercio, identificación y auxilios en jornadas pico. **Máx:** 40 duplas con estipendio sostenido en temporada alta y talleres de formalización progresiva para 100 vendedores. | Universidades + Cámara de Comercio + Patrocinadores |
| **6. Difusión local, validación y privacidad (Ley 1581)** | $5.000.000 | $18.000.000 | **Mín:** difusión por canales propios de hoteles (Cotelco) y comités de barrio + revisión básica de cumplimiento de Ley 1581 de 2012. **Máx:** material bilingüe en aeropuerto/hoteles y auditoría externa de seguridad y protección de datos. | Cotelco (canal) + Alcaldía |
| **Subtotal operativo del piloto** | **$78.000.000** | **$235.000.000** | Suma de los rubros 1 a 6 sin reserva de riesgo. | — |
| **7. Reserva de contingencia (20 % – 35 %)** | $15.600.000 | $82.250.000 | **Mín (20 %):** desvíos acotados en consumo de nube/IA o reposición física. **Máx (35 %):** colchón realista frente al riesgo histórico de sobrecosto en proyectos ligados a megaeventos (Flyvbjerg et al., 2021). | Patrocinadores / fondo de contingencia |
| **Rango total estimado del piloto (Año 1)** | **$93.600.000** | **$317.250.000** | Rango completo con contingencia. **No equivale a una cifra única.** | Esquema mixto (patrocinio + aportes en especie; **0 % comisión** a vendedores) |

## 2. Comportamiento de costos por fase de la hoja de ruta

Los rangos cambian según la cobertura territorial y el volumen de visitantes de cada etapa ([03-diseno-actual.md](03-diseno-actual.md)):

| Periodo | Fase | Rango anual estimado (COP) | Qué explica el cambio de rango |
|---|---|---:|---|
| **2027 – 2028** | Piloto en un corredor (Carnaval) | $93.600.000 – $317.250.000 | Inversión inicial en integración de datos, placas QR del corredor piloto y primeras duplas de anfitriones. |
| **2029 – 2031** | Expansión al área metropolitana | $160.000.000 – $480.000.000 | Más paraderos con QR, ampliación de la red de anfitriones y negocios verificados en otros corredores. |
| **2032 – 2033** | Ensayo general (Carnaval y eliminatoria) | $220.000.000 – $650.000.000 | Pruebas de carga, mayor capacidad en nube/IA para picos de asistencia y refuerzo temporal de anfitriones. |
| **2034** | Operación Mundial | $380.000.000 – $1.150.000.000 | Pico máximo de tráfico multilingüe (voz/IA), soporte 24/7, refuerzo operativo en calle y contingencia ampliada. |
| **2035 en adelante** | Legado permanente de ciudad | $85.000.000 – $240.000.000 | Cae el gasto pico de evento; la plataforma queda en operación cotidiana sostenida por Alcaldía, AMB y universidades. |

## 3. Decisiones de diseño que evitan sobrecostos

1. **QR en infraestructura existente en lugar de tótems solares** ([02-decisiones.md](02-decisiones.md)): elimina obra civil, energía solar y mantenimiento de hardware costoso en espacio público.
2. **Plan B del Decisor y del Guía** ([06-pendientes.md](06-pendientes.md)): el Decisor opera con reglas duras + puntaje ponderado si un servicio externo se encarece o cae; el Guía tiene respaldo de texto frente al consumo más alto de audio en vivo.
3. **Aportes en especie de aliados** ([15-recursos-y-alianzas.md](15-recursos-y-alianzas.md)): datos abiertos de Alcaldía y AMB, formación y mantenimiento con universidades locales, y formalización progresiva con Cámara de Comercio reducen el efectivo requerido.
4. **Sostenibilidad sin cobrar a la economía popular:** el financiamiento proviene de patrocinio y operación institucional; los negocios populares mantienen **comisión cero**.

## 4. Qué falta cotizar antes de pasar a presupuesto formal

- Tarifa real de consumo por minuto en **Gemini Live API** bajo un escenario estimado de sesiones diarias en Carnaval y Mundial.
- Costo del VPS / **Dokploy** y del plan de **Supabase** requerido para picos de Realtime.
- Cotización local de señalización QR resistente a sol, lluvia y salinidad en Barranquilla.
- Valorización formal de los aportes en especie con Alcaldía, AMB, universidades locales y Cámara de Comercio.
