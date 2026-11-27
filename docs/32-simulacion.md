# Simulación de ciudad

`scripts/simulate-city.ts` llena la app con actividad **sintética** para la demo. Usa la clave de servicio de Supabase (`PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env`), así que solo se corre desde un equipo de confianza.

## Qué crea

- 40 vecinos y visitantes inventados y una cuenta "Agenda proyectada (simulado)". Usan correos `@sim.quillart.test`, llevan `synthetic: true` y su nombre termina en "(simulado)".
- Actividades comunitarias inventadas en lugares reales. La descripción dice que son simuladas.
- Eventos recurrentes proyectados (`scripts/sim/projected-events.ts`): Carnaval 2027 con las fechas anunciadas, Navidad 2026, la Gran Parada de Galapa y la Batalla de Flores de Malambo. Cada uno dice "Proyección basada en la edición … (fuente: URL)" y que la hora es estimada.
- Conversaciones del foro, inscripciones y lista de espera, reportes de cobro abusivo (`is_simulated`, nota "[Simulado]"), aforo por zona y presencia anónima (`simulated: true`).

Los lugares reales y los eventos reales no se modifican. Todo lo creado queda listado en `supabase/sim/manifest.json`.

## Cómo correrla

Primero revisa el plan sin tocar la base, con `--dry-run`:

```
bun scripts/simulate-city.ts --seed --dry-run
bun scripts/simulate-city.ts --run --minutes 2 --speed 360 --dry-run
bun scripts/simulate-city.ts --reset --dry-run
```

Después, sin `--dry-run`:

- `--seed`: crea las cuentas y el contenido. Si se repite, solo completa lo que falta.
- `--run --minutes N --speed X --interval S`: genera actividad durante N minutos reales. El reloj simulado va X veces más rápido. En cada paso, las cuentas sintéticas se inscriben en eventos sintéticos, responden en conversaciones sintéticas, abren conversaciones nuevas y casos de moderación, y reportan cobros. También se actualiza el aforo por zona. Nunca escribe en conversaciones ni eventos reales.
- `--tick`: un solo paso (15 minutos simulados).
- `--status`: cuántos datos son reales y cuántos sintéticos.

## Cómo deshacerla

```
bun scripts/simulate-city.ts --reset
```

Borra solo lo sintético: lo que lista el manifiesto, el contenido de las cuentas `@sim.quillart.test` y esas cuentas. Una cuenta con otro dominio nunca se borra, aunque aparezca en el manifiesto. Si hay copia del aforo, lo restaura. Al terminar deja el manifiesto vacío. Se puede repetir sin riesgo: si falla a mitad de camino, el manifiesto sigue intacto, y con la base limpia no hace nada.

Ojo: si una persona real se inscribió en un evento sintético o respondió en una conversación sintética, ese registro se borra junto con el evento o la conversación (borrado en cascada). El registro de moderación (`moderation_actions`) se conserva.
