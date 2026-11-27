# Cifras verificadas

Usar estas cifras, siempre con su fuente.

| Dato | Fuente |
|---|---|
| Carnaval 2026: más de 820.000 visitantes, cerca de $840.000 millones, ocupación hotelera superior al 90 %. | Balance de la Alcaldía citado por Forbes Colombia, 19 feb 2026. |
| Capacidad hotelera: más de 8.600 habitaciones y 16.000 camas. | Cotelco Atlántico, citado por El Heraldo, feb 2025. |
| Taxis sin taxímetro; licitación declarada desierta. | RTVC. |
| Feb 2026: denuncias de carreras de 2 a 3 km cobradas a $35.000 frente a $12.000 habituales. | Blu Radio. |
| Arroyos: más de 50 urbanos, 15 peligrosos, 9 de esos canalizados; 134 muertes en casi 100 años. No encontramos un sistema público de alerta en operación, solo prototipos académicos. | Distrito y Observatorio de Arroyos, citados por El Heraldo, 30 jun 2024. |
| Informalidad laboral en Barranquilla A.M.: 49,0 %, trimestre jul – sep 2026 (nacional 54,5 %; 13 ciudades 40,3 %). Verificado el 26 nov en el boletín técnico del 13 nov 2026: el valor está impreso en el gráfico 5. | DANE, boletín GEIH "Ocupación informal", jul – sep 2026. |
| Microempresas: 94,5 % del tejido empresarial en 2025. **No se pudo confirmar** (ver "Verificación del 26 nov"). | Cámara de Comercio de Barranquilla. |
| Atlántico: 4,4 % del PIB nacional y 29,8 % del PIB de la región Caribe, 2025 preliminar. El 4,4 % es un cálculo sobre la tabla del boletín. | DANE. |
| El sur de la ciudad (estratos 1 a 3) registra hasta 5 °C más de temperatura superficial que el norte (estratos 4 a 6). | Núñez, Hoyos y Arellana, *Urban Climate*, vol. 52 (2023), con cobertura de prensa en feb 2024. Ver nota en "Verificación del 26 nov". |
| El estadio está en el extremo sur; la zona turística, en el norte. | — |
| Límites del Área Metropolitana de Barranquilla (Barranquilla, Soledad, Malambo, Puerto Colombia y Galapa) que usa el mapa. Simplificados (tolerancia de 50 m por municipio y 20 m en el contorno); sirven para enmascarar el mapa y decidir si un punto está dentro, **no** para dar áreas oficiales (el área oficial del distrito es la del deck: 154 km²). | OpenStreetMap, relaciones 1335179, 1341569, 1341567, 1335183 y 1341561, descargadas con Nominatim el 27 nov 2026. © OpenStreetMap contributors, licencia ODbL. Datos en `src/lib/geo/amb-boundary-data.ts`. |

## Verificación del 26 nov

Se contrastó cada cifra con una búsqueda web y, para la informalidad, con el PDF del DANE. Estado: **Confirmada**, **Confirmada con matiz** o **No confirmada**.

| Cifra | Estado | Hallazgo |
|---|---|---|
| Carnaval 2026: más de 820.000 visitantes, más de $840.000 millones, ocupación superior al 90 %. | Confirmada con matiz | El balance de la Alcaldía coincide (ocupación con picos de 100 %; 77 % nacionales y 23 % internacionales). El artículo de Forbes del 13 feb 2026 es **previo** al evento y habla de proyección; citar el balance posterior (Forbes, 19 feb 2026; Valora Analitik; Blu Radio). |
| Más de 8.600 habitaciones y 16.000 camas. | Confirmada con matiz | Cotelco Atlántico, feb 2025 (su presidente, Mario Muvdi). Cifras de otros años no son comparables: 6.331 habitaciones en 2016, 4.600 en 2022 (otro universo). No hay cifra más reciente. |
| Taxis sin taxímetro; licitación desierta. | Confirmada | La AMB declaró desierta la licitación AMB-LP-001-2022 (marzo de 2023) por no cumplir requisitos; RTVC y El Universal. Es de 2023: decir que sigue sin taxímetro solo si se verifica el estado actual. |
| Carreras de 2 a 3 km cobradas a $35.000 frente a $12.000. | Confirmada con matiz | Blu Radio confirma las denuncias de $35.000 por un trayecto de 2 a 3 km (Parque Washington a La Troja), pero la búsqueda **no mostró los $12.000** como tarifa habitual. Citar solo $35.000 hasta ver la nota completa. |
| Arroyos: más de 50, 15 peligrosos, 9 canalizados, 134 muertes. | Confirmada con matiz | El Heraldo, nota sobre canalización de más de 70 km, citando al Observatorio de Arroyos. La búsqueda no mostró la fecha de la nota: confirmar "30 jun 2024". Otras notas dan 90 o 94 víctimas desde 1933 (conteos distintos). |
| Informalidad en Barranquilla A.M.: 49,0 %. | Confirmada | Gráfico 5 del boletín DANE jul – sep 2026. Nacional 54,5 %, 13 ciudades 40,3 %. |
| Microempresas 94,5 % (Cámara de Comercio, 2025). | No confirmada | No apareció esa cifra. Sí aparece 94,2 % de microempresas a nivel **nacional** (2024, El Heraldo) y 91 % de microempresas en el Atlántico (2023). El *Estudio Económico y Social del Atlántico 2025* (CCB, ene 2026) podría traerla: revisarlo antes de usarla. Mientras tanto decir "más del 90 %". |
| Atlántico 4,4 % del PIB nacional y 29,8 % del PIB del Caribe. | No verificada | No se consultó en esta ronda. |
| Hasta 5 °C más en el sur. | Confirmada con matiz | El estudio es de 2023 (*Urban Climate*, vol. 52), no de 2024; la prensa lo cubrió en 2024. Medias de superficie: 43,7 °C en estratos 1 a 3 frente a 38,5 °C en estratos 4 a 6 (Diario del Sur). Revisar el artículo original (DOI 10.1016/j.uclim.2023.101757). |

Fuentes: [Valora Analitik](https://www.valoraanalitik.com/?p=555318), [Forbes Colombia, 19 feb 2026](https://forbes.co/2026/02/19/actualidad/estas-son-las-cifras-que-dejo-el-carnaval-de-barranquilla-empleo-hoteleria-y-turismo-los-mas-beneficiados/), [Blu Radio, controles de tarifas](https://www.bluradio.com/regiones/caribe/aumentan-controles-antes-de-carnaval-de-barranquilla-por-tarifas-excesivas-de-taxistas-rg10), [RTVC, licitación desierta](https://www.rtvcnoticias.com/colombia/taximetro-en-barranquilla-quedo-desierta-su-licitacion-en-la-ciudad), [El Universal, 2023](https://www.eluniversal.com.co/regional/atlantico/2023/03/08/declaran-desierta-licitacion-de-taximetro-para-barranquilla/), [El Heraldo, arroyos](https://www.elheraldo.co/barranquilla/arroyos-mas-de-70-kilometros-lineales-han-sido-canalizados-en-barranquilla-1106255), [DANE, boletín GEIH jul – sep 2026](https://www.dane.gov.co/files/operaciones/GEIH/bol-GEIHEISS-jul-sep2026.pdf), [El Espectador, calor y estratos](https://www.elespectador.com/ambiente/en-barranquilla-los-que-menos-plata-tienen-viven-con-5c-mas-de-temperatura/), [Diario del Sur](https://www.diariodelsur.com.co/barranquilla-y-mas-calor-cuales-son-las-disparidades-climaticas-en-esa-ciudad/).

## Cifras oficiales del deck del organizador (diap. 12)

El deck aclara: "Son un punto de partida: cada equipo deberá precisar fuentes, fechas y alcance de sus cifras."

| Dato | Fuente |
|---|---|
| 1.334.509 habitantes. | Proyección DANE 2024. |
| 154 km² de extensión distrital. | Informe de viabilidad fiscal territorial. |
| $40,7 billones de PIB distrital en 2023. | Cifras citadas por MinHacienda. |
| 79 % del PIB 2023 en actividades terciarias. | Deck del organizador. |
| Los megaeventos cuestan en promedio 172 % más de lo presupuestado. | Flyvbjerg, Budzier y Lunn (2021), citado en el deck. |

## Cifras que NO deben usarse

Estaban mal en el borrador de propuestas:

- Informalidad 52 %.
- Atlántico 5,5 % del PIB.
- 24,4 % del Caribe.
- 90 % de microempresas.
- "Los árboles bajan 3 a 4 °C".

## Sin verificar

- Si Google Maps tiene tránsito de Barranquilla.
- Estado actual de la app Sibus.
- Aforo final del estadio remodelado.
- Encuestas a turistas sobre idioma o vendedores.
