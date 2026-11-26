# Desvío a Barrio Abajo sin desplazar al barrio

Issue #10. **Borrador para discutir en equipo.** Nada de esto está decidido. Las cifras de capacidad son simuladas y los horarios son propuestas.

## La idea en una frase

Cuando el Gran Malecón se satura, la ciudad **invita** a parte de los visitantes a Barrio Abajo, pero solo hasta donde el barrio acepta recibir, en las horas que el barrio acepta y hacia negocios del propio barrio.

## Principios

1. **Es una invitación, no una orden.** El visitante ve una sugerencia ("Barrio Abajo a 15 min a pie, 12 negocios abiertos"); nadie lo obliga a ir.
2. **El barrio pone el límite.** La capacidad, los horarios y la posibilidad de pausar el desvío los define el comité de barrio, no la plataforma.
3. **El beneficio se queda en el barrio.** Solo se recomiendan negocios verificados del barrio y espacios públicos acordados.
4. **La seguridad va primero.** Las mismas reglas duras del Decisor: no se desvía a nadie hacia un arroyo activo.

## Reglas de desvío

Son reglas duras: se aplican **antes** de que OpenJev o el puntaje ponderado elijan destino, igual que las de arroyos y accesibilidad (ver [13-openjev.md](13-openjev.md), "zonas con aforo alto").

| # | Regla | Dato que usa | Estado en el prototipo |
|---|---|---|---|
| 1 | **Capacidad.** No se desvía a Barrio Abajo si ya está en nivel `high` (75 % de su umbral) o más. | `zone_visitor_counts.saturation_level` y `capacity_threshold` (semilla simulada: 620 de 1.800) | El dato existe; falta la regla en el Decisor. |
| 2 | **Cupo.** Se sugiere el desvío como máximo a tantas personas como falten para llegar al 75 % del umbral. Con la semilla: 1.350 − 620 = 730. | Mismo | Falta implementar. |
| 3 | **Umbral del barrio.** `capacity_threshold` lo fija el comité de barrio, no la ciudad. Puede ser distinto por modo de ciudad (Mundial, Carnaval, cotidiano). | `capacity_threshold`, `city_mode` | El campo existe; el valor es simulado. |
| 4 | **Horarios.** Solo en franjas acordadas con el comité. Propuesta para discutir: 10:00 a 20:00, nunca de noche en calles residenciales. | Nuevo dato: franjas por zona | Falta. |
| 5 | **Pausa del comité.** El comité puede pausar el desvío desde el tablero en cualquier momento; mientras está en pausa, Barrio Abajo no aparece como destino. | Nuevo dato: `diversion_paused` por zona | Falta. |
| 6 | **Arroyo.** Si el Arroyo Calle 48 (borde de Barrio Abajo) tiene alerta activa, no hay desvío. | `flood_zones.alert_active` | Ya cubierto por las reglas duras del Decisor (#18). |
| 7 | **Destinos acordados.** El desvío lleva al punto de anfitriones (Casa del Carnaval en la semilla) y a negocios verificados abiertos, no a calles residenciales. | `stops`, `businesses.is_open` | Los datos existen. |

## Beneficio para vendedores y residentes

| Quién | Qué gana | Cómo lo hace la plataforma |
|---|---|---|
| Vendedores del barrio | Visitantes que de otro modo se quedarían en el Malecón. | Se marcan abiertos con su QR, aparecen en recomendaciones sin comisión y reciben sellos por visita. |
| Vendedores informales | Entrar sin formalizarse primero. | El sello de negocio verificado es el primer paso de una formalización progresiva con capacitación (ver [03-diseno-actual.md](03-diseno-actual.md)), no un requisito previo. |
| Residentes | Ingresos como anfitriones y voz sobre cuándo y cuánto. | Duplas de anfitriones (adulto mayor y joven bilingüe) del barrio; comité con control del umbral, los horarios y la pausa. |
| Comité de barrio | Datos de su propio barrio. | Ve en el tablero cuántos visitantes llegaron y a qué negocios; solo conteos anónimos. |
| El barrio después de 2034 | La misma herramienta para el Carnaval y el día a día. | Modo de ciudad Carnaval y cotidiano. |

## Riesgo de desplazamiento y mitigación

| Riesgo | Mitigación |
|---|---|
| **Saturación:** ruido, basura y calles llenas donde vive la gente. | Tope por capacidad (reglas 1 y 2), horarios (regla 4) y destinos fuera de calles residenciales (regla 7). Puntos de reciclaje en la ruta de desvío. |
| **Negocios de afuera que llegan a capturar el flujo.** | Solo se recomiendan negocios verificados del barrio. Criterio de arraigo (por ejemplo, validación del comité) por definir. |
| **Alza de arriendos y turistificación a largo plazo.** | La plataforma no puede evitarlo sola. Se mide (indicadores abajo) y se entrega al comité y a la Alcaldía como alerta temprana. Medidas de vivienda: fuera del alcance del prototipo, se nombran en el pitch como responsabilidad de política pública. |
| **Exclusión de vendedores sin formalizar.** | El sello no exige formalización previa; la capacitación es opcional y gradual. |
| **Sensación de vigilancia.** | Solo conteos anónimos por zona, nunca ubicación exacta ni datos personales (Ley 1581 de 2012). |
| **La plataforma decide sobre el barrio sin el barrio.** | El comité fija el umbral, los horarios y puede pausar. Ninguna decisión de desvío pasa por encima de su pausa. |

## Cómo integra las cinco dimensiones

Una sola acción (desviar gente del Malecón saturado a Barrio Abajo) toca las cinco a la vez:

| Dimensión | Cómo |
|---|---|
| Ciudad y territorio | Reparte el flujo dentro del corredor piloto sin infraestructura nueva. |
| Sostenibilidad | Recorridos cortos a pie; no desvía hacia arroyos activos; reciclaje en la ruta. |
| Ciudad inteligente | El Decisor propone el desvío con reglas duras y confianza; el tablero lo muestra. |
| Ciudadanía | El comité de barrio pone el límite y puede pausar; anfitriones locales reciben al visitante. |
| Economía y oportunidades | El gasto llega a negocios populares verificados sin comisión. |

## Indicadores propuestos

- Porcentaje del tiempo de desvío en que Barrio Abajo estuvo por debajo del 75 % de su umbral (meta: 100 %).
- Visitas recibidas por negocios verificados de Barrio Abajo durante desvíos.
- Número de pausas activadas por el comité, y por qué.
- Quejas de convivencia reportadas por residentes.

## En la demo (caso 3)

1. El tablero muestra el Gran Malecón saturado.
2. El Decisor revisa las reglas: Barrio Abajo está bajo el 75 %, en horario, sin pausa y sin arroyo activo. Propone desviar a Barrio Abajo con su confianza y el cupo disponible.
3. El visitante ve la sugerencia y la vendedora de fritos aparece abierta.
4. Opcional: el presentador activa la pausa del comité y Barrio Abajo deja de aparecer como destino, para mostrar que el barrio tiene el control.

## Pendiente

- [ ] Validar umbral, horarios y criterio de arraigo con personas de Barrio Abajo (identificar organizaciones del barrio). Hasta entonces, todo es simulado.
- [ ] Implementar las reglas 1, 2, 4 y 5 en el Decisor (issue aparte).
- [ ] Agregar `diversion_paused` y las franjas horarias al modelo de datos (issue aparte, con #16).
- [ ] Botón de pausa del comité en el tablero (con #24).
