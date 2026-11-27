# Pruebas de la base de datos en local

Prueban migraciones, RLS y triggers en un PostgreSQL local, sin tocar Supabase. `supabase-shim.sql` imita lo mínimo de Supabase: los roles `anon`, `authenticated` y `service_role`, `auth.users`, `auth.uid()`, `auth.jwt()` y la publicación `supabase_realtime`.

```bash
createdb quillart_test
psql -d quillart_test -f supabase/tests/supabase-shim.sql
for f in supabase/migrations/*.sql supabase/seed.sql; do psql -v ON_ERROR_STOP=1 -d quillart_test -f "$f"; done
psql -d quillart_test -f supabase/tests/vendor-portal-test.sql   # cada línea "ok N"; un fallo se detiene con error
```

Las pruebas simulan a cada persona con `set role authenticated`, `request.jwt.claim.sub` y `request.jwt.claims`, igual que lo hace PostgREST. `pg_temp.act_as(uid, aal)` fija el nivel `aal` (por defecto `aal1`): una cuenta ciudad solo tiene permisos de ciudad con `aal2`.
