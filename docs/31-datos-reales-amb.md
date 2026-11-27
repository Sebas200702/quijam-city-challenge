# 31 · Datos reales del Área Metropolitana

Datos reales cargados en Supabase el 27 de noviembre de 2026 para que la app funcione con lugares, estaciones y eventos verificables. Todo está en `supabase/seed-real/`:

| Archivo | Contenido |
|---|---|
| `places.json` | 62 lugares de los cinco municipios, cada uno con su objeto de OpenStreetMap |
| `transmetro-stations.json` | 16 estaciones y portales de Transmetro |
| `events.json` | 5 eventos públicos con fuente, fecha, hora y lugar |
| `seed-real.sql` | Los mismos datos como SQL idempotente, para el editor SQL de Supabase |

`src/lib/community/places-catalog.ts` se genera desde `places.json` y es la copia que usa la app sin Supabase (más "Vía Parque Isla de Salamanca", que queda fuera del AMB y se muestra sin pin, docs/24).

## Lugares

- **Fuente de coordenadas:** OpenStreetMap, consultado con Nominatim (`/search` para encontrar el objeto y `/lookup` para leerlo) el 27-nov-2026. Cada lugar guarda el enlace a su nodo, vía o relación en `source.osm`. Datos © OpenStreetMap contributors, licencia ODbL 1.0 (https://www.openstreetmap.org/copyright).
- **Municipio:** se calcula con `municipalityAt` / `ambAnchor` de `src/lib/geo/amb-boundary.ts`; solo entran puntos dentro del AMB.
- **Reparto:** Barranquilla 33, Puerto Colombia 10, Soledad 8, Malambo 6, Galapa 5.
- **Descripciones:** son textos propios, cortos y factuales. `opening_hours` queda vacío porque ningún horario se pudo verificar. `is_accessible` solo es verdadero si OSM tiene `wheelchair=yes`. `is_free` es verdadero en espacios públicos abiertos y falso en recintos con entrada (museos, teatros, estadios, zoológico).
- **Lugares que ya estaban:** a los 11 lugares anteriores dentro del AMB se les cambiaron las coordenadas por las de OSM, se reescribió la descripción y se quitó el horario.
- **Límites del esquema:** la tabla `places` no tiene columnas `municipality` ni `source`, así que el municipio va en `neighborhood` (o el barrio, en Barranquilla) y la fuente vive en el JSON. `kind` no tiene `market` ni `beach`: las playas van como `waterfront` y los mercados no se cargaron.

## Transmetro

Para la lista de estaciones se usó https://es.wikipedia.org/wiki/Transmetro_(Barranquilla); las coordenadas son las de los objetos de OSM. Se cargaron en `stops` con `stop_type = 'transmetro'`, `is_simulated = false` y `has_qr = false`.

`stops.zone` solo acepta las cinco zonas del corredor. Por eso la troncal Murillo va como `troncal_murillo`, y en la troncal Olaya Herrera las estaciones del centro van como `centro` y las de Barrio Abajo hacia el norte como `barrio_abajo`.

Se omitieron Joaquín Barrios Polo, Alfredo Correa de Andréis y la plataforma temporal del Estadio porque no tienen un objeto de estación identificable en OSM.

## Eventos

Los eventos están publicados por la cuenta "Agenda pública AMB" (`is_verified_organizer = true`) con la etiqueta "QUILLART · Agenda pública" en `organizer_name`. El perfil no puede llamarse "QUILLART" porque es un término reservado (`is_reserved_display_name`). Cada descripción termina con la URL de la fuente.

| Evento | Fecha y hora (Bogotá) | Lugar | Fuente |
|---|---|---|---|
| Caravana de Navidad Coca-Cola | 4-dic-2026, 6:00 p. m. | Recorrido Rebolo, Gran Malecón, Aleta del Tiburón, Ventana al Mundo | El Heraldo, 18-nov-2026 |
| Camilo – Tour 2026 | 5-dic-2026, 8:00 p. m. | Centro de Eventos Puerta de Oro | TuBoleta |
| Gran Parada de la Luz | 8-dic-2026, 5:30 p. m. | Cra 44 con Cl 70 hasta Plaza de la Paz | El Heraldo, 25-nov-2026 |
| The Last Dance (despedida de Teófilo Gutiérrez) | 19-dic-2026, 5:00 p. m. | Estadio Metropolitano | colombiamove.com |
| El Cascanueces – International Ballet Company | 19-dic-2026, 5:00 p. m. | Teatro José Consuegra Higgins | colombiamove.com |

Eventos que se dejaron fuera:

- **BAQ.ART 2026:** empezó el 26-nov, antes del rango, y no tiene horario por día.
- **Lectura del Bando 2027:** las fuentes no coinciden entre el 16 y el 17 de enero, y la hora no está publicada.
- **Navidad en el Gran Malecón, novenas y fin de año 2026:** no aparecen fechas de 2026; lo publicado es de 2025.
- **Soledad, Malambo, Puerto Colombia y Galapa:** no hay agenda de diciembre de 2026 publicada.
- **Teatro Amira de la Rosa:** está en obras y no tiene programación.

## Volver a cargar

Corre `supabase/seed-real/seed-real.sql` en el editor SQL. Los eventos necesitan que exista la cuenta organizadora. También sirve el script de carga con supabase-js y la service role, que se guarda fuera del repo.
