# Modelo de datos y semilla en Supabase

Esquema inicial para el corredor piloto **Estadio Metropolitano – Troncal Murillo – Centro – Barrio Abajo – Gran Malecón** (issue #16).

## Archivos

| Archivo | Propósito |
|---|---|
| [`supabase/migrations/20261126000001_corridor_schema.sql`](../supabase/migrations/20261126000001_corridor_schema.sql) | Tablas, índices, triggers `updated_at` y registro en `supabase_realtime`. |
| [`supabase/migrations/20261126000002_rls_policies.sql`](../supabase/migrations/20261126000002_rls_policies.sql) | Función `current_user_role()` y políticas RLS por rol. |
| [`supabase/seed.sql`](../supabase/seed.sql) | Datos semilla simulados e idempotentes del corredor piloto 2034. |
| [`supabase/migrations/20261127000001_community_schema.sql`](../supabase/migrations/20261127000001_community_schema.sql) | Capa de comunidad (27 nov): perfiles, lugares, eventos, inscripciones con cupos, foro, columnas de moderación, RLS y Realtime. |
| [`supabase/seed-community.sql`](../supabase/seed-community.sql) | Lugares de la ciudad, agenda inicial ("Agenda QUILLART") con fechas relativas a hoy e hilo de bienvenida. Idempotente. |
| [`supabase/migrations/20261127000004_vendor_portal.sql`](../supabase/migrations/20261127000004_vendor_portal.sql) | Portal del vendedor (#49): alta por QR, productos con precio, visitas y Realtime de negocios. |
| [`supabase/tests/`](../supabase/tests/) | Pruebas de RLS y triggers en un PostgreSQL local (ver su README). |

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
- Desde el 27 nov 2026 la interfaz muestra ese estado como una etiqueta discreta "datos de referencia" (ver [09-convenciones.md](09-convenciones.md)). Las tablas de comunidad no llevan `is_simulated`: su contenido lo escriben personas reales.
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
4. `supabase/migrations/20261127000001_community_schema.sql` (usa `current_user_role()` y `touch_updated_at()` de los pasos 1 y 2)
5. `supabase/seed-community.sql`
6. Las demás migraciones de `supabase/migrations/` en orden de nombre, incluida `20261127000004_vendor_portal.sql`

Para habilitar un usuario con rol `city` o `vendor`, insertar su `user_id` (desde Authentication → Users) en `public.user_profiles` o definir `{"role": "city"}` en `app_metadata`.

## Capa de comunidad (27 nov 2026)

Detalle funcional y del triaje en [20-comunidad-y-moderacion.md](20-comunidad-y-moderacion.md).

| Tabla | Uso | Realtime |
|---|---|---|
| `profiles` | Perfil público de cada cuenta: nombre visible, barrio opcional, `is_visitor`. Se crea con un trigger sobre `auth.users` desde los metadatos del registro. | No |
| `places` | Espacios públicos y naturaleza (`nature`, `park`, `culture`, `heritage`, `sport`, `waterfront`) con coordenadas dentro del área de Barranquilla, accesibilidad, gratuidad y horario. | No |
| `events` | Eventos publicados por cualquier persona: categoría, inicio y fin, lugar o dirección, cupos, `registered_count`, gratis o con valor, organizador, `status` (`published`, `cancelled`). | Sí |
| `event_registrations` | Inscripción de una persona a un evento (clave `event_id` + `user_id`). | No |
| `forum_threads` | Conversaciones por categoría, opcionalmente ligadas a un lugar o un evento; `reply_count` y `last_activity_at`. | Sí |
| `forum_posts` | Respuestas en una conversación. | Sí |

**Columnas de moderación** (en `events`, `forum_threads` y `forum_posts`): `moderation_status` (`published`, `held`, `removed`), `moderation_labels`, `moderation_source` (`rules`, `openjev`, `moderator`), `triage_priority` (`none`, `city_attention`, `emergency`) y `city_resolved_at`.

**Triggers:**

- `handle_event_registration`: bloquea la fila del evento, rechaza inscripciones a eventos cancelados, retenidos, pasados o sin cupos, y mantiene `registered_count` al día de forma atómica.
- `handle_forum_post`: `reply_count` cuenta solo respuestas publicadas; una respuesta retenida suma cuando se aprueba.

### Permisos de la comunidad (RLS)

| Tabla | Anónimo | Persona con cuenta | Rol `city` | Servidor (llave de servicio) |
|---|---|---|---|---|
| `profiles` | `SELECT` | `SELECT`; `UPDATE` del propio | `SELECT` | Todo |
| `places` | `SELECT` | `SELECT` | `ALL` | Todo |
| `events` | `SELECT` publicados | `SELECT` publicados y los propios; `UPDATE` solo de `status` (cancelar) en los propios | `SELECT` todo; cancelar | Inserta después del triaje; modera |
| `event_registrations` | Sin acceso | `INSERT`/`DELETE` propias; `SELECT` propias y las de sus eventos | — | Todo |
| `forum_threads`, `forum_posts` | `SELECT` publicados | `SELECT` publicados y los propios | `SELECT` todo | Inserta después del triaje; modera |

### Seguridad y confianza (migración `20261127000002_trust_and_safety.sql`)

| Cambio | Para qué |
|---|---|
| `is_reserved_display_name()` + trigger en `profiles` | Nadie usa nombres de autoridades ni de la plataforma. |
| `profiles.is_verified_organizer` (solo la ciudad lo activa); las personas solo editan `display_name`, `neighborhood`, `is_visitor` | Organizadores verificados. |
| `events.organizer_verified`, `forum_threads.city_verified_at` | Insignias "Organizador verificado" y "Confirmado por la ciudad". |
| `community_reports` en eventos, hilos y respuestas + tabla `content_reports` + trigger `handle_content_report` | 3 reportes de personas distintas pasan el contenido a `held`; nadie reporta lo propio. |
| Tabla `moderation_actions` | Auditoría de cada decisión de moderación. |
| `delete_community_account(uuid)` | Eliminación de cuenta (Ley 1581), solo desde el servidor. |

Detalle en [22-seguridad-y-confianza.md](22-seguridad-y-confianza.md).

Regla clave: **los clientes no tienen permiso de `INSERT` en `events`, `forum_threads` ni `forum_posts`**. Todo contenido público entra por `POST /api/community/publish`, que corre el triaje y escribe con la llave de servicio. Lo retenido solo lo ven su autor y la ciudad.

## Portal del vendedor (#49)

Migración `20261127000004_vendor_portal.sql`. Probada en un PostgreSQL local con `supabase/tests/vendor-portal-test.sql`.

| Cambio | Detalle |
|---|---|
| `businesses.verification_status` | `pending` o `verified` (los negocios de la semilla quedan `verified`) |
| `business_claims` (nueva) | Códigos de alta de un solo uso. Solo guarda el **SHA-256** del código; nadie la lee por la API |
| `create_business_claim(code)` | Solo la ciudad (o el editor SQL). Devuelve el código **una vez** para imprimirlo como QR: `/vendedor/entrar?alta=<código>`. Un código nuevo reemplaza al anterior |
| `claim_business(token)` | Quien inició sesión y escanea el QR queda como dueña del negocio y recibe el rol `vendor` (una cuenta `city` conserva su rol). El código se borra al usarse |
| Guardia `trg_businesses_vendor_guard` | El vendedor solo cambia nombre, descripción y abierto/cerrado. Verificación, dueño, código, zona, ubicación, sin comisión y QR de sellos quedan para la ciudad |
| `business_products` (nueva) | Nombre, precio en pesos (0 a 2.000.000), disponible y orden. Todos leen los disponibles; la dueña edita los suyos |
| `business_visits` (nueva) | Solo negocio y hora, nada del visitante (Ley 1581 de 2012). Solo escribe el servidor (`POST /api/vendor/visit`, una visita por negocio cada 30 min por IP y solo si está abierto y verificado). Lee la dueña y la ciudad |
| Realtime | `businesses` y `business_visits` entran a `supabase_realtime`: el mapa ve "Abierto" al instante y el vendedor ve sus visitas |

**Dar de alta a una vendedora** (en el editor SQL, como la ciudad):

```sql
select public.create_business_claim('BIZ-FRITOS-ROSA');
-- → 36 caracteres; imprimir el QR de https://<dominio>/vendedor/entrar?alta=<código>
```

