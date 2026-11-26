# Simulador de multitudes

Issue #42. Datos simulados 2034. Solo en el tablero de ciudad (`/ciudad`), nunca en la app del visitante (regla 1 de la épica #57).

## Qué muestra

- 2.000 puntos que se mueven por las calles del corredor (la misma línea del mapa). Cada punto representa unos 6 visitantes. El número sale de los conteos de la base al abrir el tablero.
- El color de cada punto es el estado de su zona, con la escala del tablero: verde fluido (< 60 %), dorado moderado (60 a 85 %), rojo saturado (≥ 85 %).
- Barras por zona con visitantes, umbral y porcentaje, actualizadas cada segundo.

## Eventos (canal `city-events`, vía `useCityState`)

| Evento | Qué hace |
|---|---|
| `malecon_saturado` | Llena el Malecón hasta `capacityPct` (toma gente de otras zonas) y activa el desvío. |
| `aguacero` | Usa `activeFloodZoneIds` del estado de la ciudad (que incluye los arroyos en cuenta regresiva). Nadie entra a esos arroyos; quien estaba dentro sale por el borde más cercano. |
| `reiniciar` | Vuelve a los conteos con los que abrió el tablero. |

## Reglas del desvío

Son las del borrador [14-desvio-barrio-abajo.md](14-desvio-barrio-abajo.md):

- Solo se desvía mientras el Malecón esté en "Saturado" (≥ 85 % de su umbral). Cuando baja de ahí, el desvío se detiene.
- Barrio Abajo recibe gente desviada solo hasta el **75 % de su umbral**. Después, el desvío va al Centro, con el mismo tope.
- Mientras hay desvío, tampoco llegan visitantes nuevos a Barrio Abajo o al Centro si ya están en su tope.

## Conteos

- El conteo de una zona son las personas que están en ella o caminando hacia ella. Quien solo pasa por una zona no cuenta para esa zona.
- Mientras corre, el simulador escribe los conteos en `zone_visitor_counts` cada 5 s (solo el rol ciudad puede, por RLS). Las filas quedan con `is_simulated = true`. El tablero se actualiza por Realtime.
- "Pausar" detiene el movimiento y la escritura.

## Rendimiento y accesibilidad

- 60 fps con 2.000 puntos en Chromium sin GPU (Playwright). Un paso de la simulación tarda menos de 10 ms (hay una prueba).
- Con `prefers-reduced-motion` los puntos se mueven a saltos, dos veces por segundo.

## Archivos

| Archivo | Qué hace |
|---|---|
| `src/lib/crowd-sim/crowd-sim.ts` | Motor: agentes, desvío, arroyos y conteos. Determinista (semilla fija). |
| `src/lib/crowd-sim/crowd-sim-store.ts` | Escribe los conteos en Supabase. |
| `src/components/crowd-sim-panel.tsx` | Tarjeta del tablero: mapa, canvas y barras. |
