# Modelo de datos y semilla en Supabase

Esquema inicial para el corredor piloto **Estadio Metropolitano – Troncal Murillo – Centro – Barrio Abajo – Gran Malecón** (issue #16).

## Archivos

| Archivo | Propósito |
|---|---|
| [`supabase/migrations/20261126000001_corridor_schema.sql`](../supabase/migrations/20261126000001_corridor_schema.sql) | Tablas, índices, triggers `updated_at` y registro en `supabase_realtime`. |
| [`supabase/migrations/20261126000002_rls_policies.sql`](../supabase/migrations/20261126000002_rls_policies.sql) | Función `current_user_role()` y políticas RLS por rol. |
| [`supabase/seed.sql`](../supabase/seed.sql) | Datos semilla simulados e idempotentes del corredor piloto 2034. |

## Tablas

| Tabla | Uso en el prototipo | Realtime |
|---|---|---|
| `user_profiles` | Asigna rol (`visitor`, `vendor`, `city`) a usuarios de Supabase Auth. | No |
| `stops` | Paraderos y estaciones del corredor (coordenadas, accesibilidad, QR, sombra, hidratación, reciclaje y anfitriones). | No |
| `flood_zones` | Arroyos del corredor, nivel de riesgo y bandera `alert_active` para el mapa (#17), el Decisor (#18) y el tablero (#24). | Sí |
| `route_segments` | Tramos entre paraderos con tarifa oficial de referencia (`reference_fare_cop`, rango mín/máx), modo verde, accesibilidad y vínculo opcional a un arroyo. | No |
| `businesses` | Negocios populares verificados y eventos ambientales sin comisión; el vendedor actualiza `is_open` con su cuenta o QR. | No |
| `overcharge_reports` | Reportes anónimos de cobro abusivo con estado (`open`, `in_review`, `resolved`, `dismissed`). | Sí |
| `zone_visitor_counts` | Conteos anónimos agregados por zona y modo de ciudad (`world_cup`, `carnival`, `daily`) con `saturation_level` calculado para el tablero (#24). | Sí |

## Datos simulados y privacidad

- Todas las tablas del corredor incluyen `is_simulated boolean not null default true`; la interfaz debe mostrar este estado.
- Privacidad (Ley 1581 de 2012): no se almacenan datos personales ni ubicación exacta del visitante. Los reportes de cobro abusivo solo guardan zona, tramo, tarifas y código QR opcional del conductor; el tablero consume conteos anónimos por zona.

## Matriz de permisos (RLS)

| Tabla | `visitor` (`anon` / autenticado) | `vendor` | `city` |
|---|---|---|---|
| `stops`, `route_segments`, `flood_zones` | `SELECT` | `SELECT` | `ALL` |
| `businesses` | `SELECT` | `SELECT`, `UPDATE` propio (`owner_user_id = auth.uid()`) | `ALL` |
| `overcharge_reports` | `INSERT` (`status = 'open'`) | `INSERT` (`status = 'open'`) | `SELECT`, `UPDATE` |
| `zone_visitor_counts` | Sin acceso | Sin acceso | `ALL` |
| `user_profiles` | `SELECT` propio | `SELECT` propio | `ALL` |

> Nota para el cliente (#19): al insertar en `overcharge_reports` como visitante anónimo, usar `.insert(...)` sin `.select()` para no requerir permiso de lectura sobre reportes de terceros.

## Cómo aplicarlo en Supabase Cloud

Ejecutar en el **SQL Editor** de Supabase en este orden (todos los scripts son idempotentes):

1. `supabase/migrations/20261126000001_corridor_schema.sql`
2. `supabase/migrations/20261126000002_rls_policies.sql`
3. `supabase/seed.sql`

Para habilitar un usuario con rol `city` o `vendor`, insertar su `user_id` (desde Authentication → Users) en `public.user_profiles` o definir `{"role": "city"}` en `app_metadata`.
