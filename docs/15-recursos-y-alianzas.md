# Recursos y alianzas

Responde al issue "Recursos y alianzas". Criterio de la rúbrica: viabilidad, sostenibilidad e impacto (10). Sigue la decisión de operación de [02-decisiones.md](02-decisiones.md): Alcaldía (Turismo) y Área Metropolitana dueñas de los datos, universidades locales que mantienen, patrocinio y comisión cero para negocios populares.

**Aviso:** ningún aliado de este documento ha aceptado participar. La columna "Rol propuesto" es lo que le pediríamos, no un acuerdo. Cuando haya una conversación real, se cambia el estado y se anota la fecha.

Estados: **Propuesto** (idea del equipo), **Por contactar**, **En conversación**, **Confirmado**.

## 1. Tabla aliado / aporte / rol

| Aliado | Aporta | Rol propuesto | Tipo de aporte | Estado |
|---|---|---|---|---|
| **Alcaldía de Barranquilla** (Turismo y Movilidad) | Datos oficiales (agenda cultural, calendario del Mundial, tarifas de referencia), permiso para QR en paraderos y estaciones, uso del tablero de ciudad. | Dueña de los datos abiertos y usuaria principal del tablero. | Datos, operación | Propuesto |
| **Área Metropolitana de Barranquilla (AMB)** | Datos de transporte y taxis (la AMB lleva la regulación del taxi), tarifas oficiales por trayecto, convocatoria a conductores. | Dueña del dato de transporte y tarifas; impulsa conductores verificados con QR. | Datos, operación | Propuesto |
| **Universidades locales** (Universidad del Norte es una candidata por su investigación sobre calor urbano; faltan las demás) | Investigación, estudiantes jóvenes bilingües, mantenimiento técnico de la plataforma, validación de las alertas de arroyos. | Mantienen la plataforma después de 2034 y aportan los anfitriones jóvenes. | Formación, operación, investigación | Propuesto |
| **Cámara de Comercio de Barranquilla** | Registro y base de empresas, programas de formalización, cifras del tejido empresarial. | Verifica negocios populares y acompaña su formalización progresiva. | Formación, datos | Propuesto |
| **Cotelco Atlántico** | Canal con hoteles y visitantes, cifras de capacidad hotelera. | Reparte el QR y la aplicación en hoteles. | Operación (canal) | Propuesto |
| **Observatorio de Arroyos y Distrito** | Información de arroyos peligrosos. | Fuente de la alerta de arroyos. Hoy no hay sistema público en operación: en la demo los datos son simulados. | Datos | Propuesto |
| **Comités de barrio** (empezando por Barrio Abajo) | Validación local, selección de anfitriones, fijan el umbral de visitantes del barrio. | Defienden al barrio frente al desvío de multitudes. Ver [14-desvio-barrio-abajo.md](14-desvio-barrio-abajo.md). | Operación, legitimidad | Propuesto |
| **Taxistas y sus gremios** | Participación en conductores verificados con QR y tarifa de referencia. | Aliados voluntarios, no sancionados. | Operación | Propuesto |
| **Patrocinadores** (empresas locales por definir) | Financiación. | Patrocinan la plataforma; los negocios populares no pagan comisión. | Financiación | Propuesto |

## 2. Qué aporta cada aliado, por tipo

| Tipo de aporte | Quién |
|---|---|
| **Datos** | Alcaldía, AMB, Observatorio de Arroyos, Cámara de Comercio. |
| **Operación** | Alcaldía (QR en infraestructura), AMB (taxis), Cotelco (canal), comités de barrio, taxistas. |
| **Financiación** | Patrocinadores. Sin cifra: depende de la tabla de costos (issue "Tabla de costos con rangos"). |
| **Formación** | Universidades (anfitriones jóvenes), Cámara de Comercio (formalización). |

## 3. Formalización progresiva y capacitación: quién capacita

La decisión de [02-decisiones.md](02-decisiones.md) es que el sello de negocio verificado es el primer paso de una formalización progresiva; no se exige formalizarse para entrar (ver [14-desvio-barrio-abajo.md](14-desvio-barrio-abajo.md)).

| Qué se capacita | A quién | Quién capacita (propuesto) | Observación |
|---|---|---|---|
| Uso del QR de "abierto", sellos y recomendaciones. | Vendedores y negocios populares. | Equipo del proyecto y comités de barrio, en el piloto. | Se puede hacer sin aliados externos. |
| Formalización: registro mercantil y primeros pasos. | Negocios populares que quieran avanzar. | Cámara de Comercio de Barranquilla. | Voluntaria y gradual. |
| Atención al visitante e idioma. | Anfitriones adultos mayores y jóvenes bilingües. | Universidades locales, con apoyo de la Alcaldía. | Pareja adulto mayor + joven bilingüe. |
| Lectura de reportes de cobro abusivo. | Funcionarios de la AMB. | Equipo del proyecto. | Ligado al tablero. |
| Una entidad pública de formación para el trabajo (por ejemplo, SENA) | Anfitriones y vendedores. | **Por investigar:** no sabemos si ofrece programas para este caso. | No aparece en nuestras fuentes: no presentarla como aliada hasta confirmarla. |

## 4. Recursos que ya tenemos

| Recurso | Uso | Costo | Fuente |
|---|---|---|---|
| Supabase Cloud (plan gratis) | Base de datos, autenticación y tiempo real. | Gratis | [10-stack.md](10-stack.md) |
| OpenJev por API en Codiv | Agente Decisor. | Gratis ("Free public experiment") | [13-openjev.md](13-openjev.md) |
| Gemini Live API | Agente Guía. | Por confirmar | [29-gemini-live.md](29-gemini-live.md) |
| Dokploy en VPS propio | Despliegue. | Por confirmar | [10-stack.md](10-stack.md) |
| Infraestructura que ya existe (paraderos, estaciones) | Soporte de los QR en lugar de tótems solares. | Bajo (impresión y permiso) | [02-decisiones.md](02-decisiones.md) |
| Equipo de cinco personas que programan | Prototipo y programa. | — | README |

## 5. Quién sostiene qué después de 2034

| Qué | Quién la sostiene (propuesto) |
|---|---|
| Datos abiertos | Alcaldía y AMB. |
| Mantenimiento técnico | Universidades locales. |
| Red de anfitriones | Comités de barrio, con formación de universidades. |
| Financiación | Patrocinio; comisión cero para negocios populares. |
| Plataforma oficial permanente (desde 2035) | Alcaldía, según la hoja de ruta de [03-diseno-actual.md](03-diseno-actual.md). |

## 6. Pendientes

- Definir qué universidades invitar además de la Universidad del Norte.
- Confirmar si una entidad pública de formación (como el SENA) ofrece programas útiles.
- Confirmar que la AMB es la entidad que regula el taxi y qué datos publica.
- Cotizar costos (Gemini, Dokploy) para la tabla de costos.
- Registrar cada conversación con un aliado: fecha, persona y resultado.
- Actualizar [12-alineacion-rubrica.md](12-alineacion-rubrica.md): "Recursos y alianzas" pasa de Parcial a Cubierto cuando este documento se fusione.
