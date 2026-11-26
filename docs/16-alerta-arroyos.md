# Alerta temprana de arroyos

Issue #52. Datos simulados 2034.

## Cómo funciona

1. El panel de presentador (#41) publica en el canal `city-events` un evento `{ type: "aguacero", zoneIds, startsInMin }`. `zoneIds` acepta zonas del corredor (`troncal_murillo`) o códigos de arroyo (`ARR-MURILLO-46`).
2. Cada arroyo de esas zonas inicia una cuenta regresiva ("se activa en 12 min"). Al llegar a cero queda activo. `reiniciar` limpia todo.
3. En el mapa (`/mapa`), los arroyos en cuenta regresiva o activos se pintan de rojo y aparece **un solo aviso**, el más urgente. Es la única alerta que interrumpe (regla 4 de la épica #57). En el celular reemplaza a la tarjeta "Toca un punto del mapa".
4. Si el visitante va en una ruta que cruza un arroyo bloqueado, el Decisor elige otra y el aviso dice por qué en una frase.

## Seguridad

- Se bloquean los arroyos **activos y los que están en cuenta regresiva**: no se ofrece una ruta que cruce un arroyo a punto de crecer.
- La ruta nueva pasa por las reglas duras del Decisor (#18). Una prueba revisa todas las combinaciones de arroyos bloqueados, con y sin modo accesible, y confirma que nunca se elige una ruta que cruce uno.
- Si no queda ninguna ruta segura, el aviso pide esperar en un lugar seguro o buscar a un anfitrión.

## Rutas

Las rutas del Malecón al Estadio se arman encadenando los tramos de `route_segments` de la semilla (copia local en `src/lib/flood-alert/route-segments-seed.ts`), con su tiempo, tarifa, accesibilidad y arroyo. Todavía no hay datos de congestión por ruta: todas usan el mismo valor neutro.

## Canal `city-events`

`src/lib/city-events/city-events-channel.ts` escucha y publica por dos vías:

- **Supabase Realtime (broadcast)**, entre dispositivos, si hay variables de Supabase. Evento: `city-event`.
- **BroadcastChannel** del navegador, entre pestañas del mismo equipo. Sirve sin internet (plan B de la demo).

Los tipos están en `src/lib/city-events/city-events-types.ts`, copiados tal cual del contrato de la épica #57. Si el #41 crea el mismo archivo con el mismo contenido, no hay conflicto.

## Probarlo

Mientras el flujo del caso 1 (#19) no pase la ruta activa del visitante, se puede simular con un parámetro:

```
/mapa?ruta=SEG-MAL-EST-TAXI            # taxi Malecón → Estadio, cruza el Arroyo Carrera 46 con Murillo
/mapa?ruta=SEG-MAL-EST-TAXI&accesible=1
```

Y en la consola de otra pestaña del mismo navegador:

```js
const c = new BroadcastChannel("city-events");
c.postMessage({ type: "aguacero", zoneIds: ["troncal_murillo"], startsInMin: 12 });
```

Resultado esperado: aviso "Arroyo Carrera 46 con Murillo: se activa en 12 min" y "Cambiamos tu ruta a Transmetro".
