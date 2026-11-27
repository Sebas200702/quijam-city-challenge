-- Pasaporte QUILLART (#45): una fila anónima por sello de negocio verificado.
-- No guarda quién escaneó; solo qué negocio y cuándo, para el indicador de economía.

create table if not exists public.passport_visits (
  id uuid primary key default gen_random_uuid(),
  business_code text not null,
  visited_at timestamptz not null default now()
);

create index if not exists idx_passport_visits_business
  on public.passport_visits (business_code, visited_at desc);

alter table public.passport_visits enable row level security;

-- Cualquier visitante puede registrar una visita a un negocio verificado; nadie lee las de otros.
drop policy if exists "passport_visits_insert_verified" on public.passport_visits;
create policy "passport_visits_insert_verified"
  on public.passport_visits for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.code = business_code and b.is_verified
    )
  );

-- Solo la ciudad lee el conteo.
drop policy if exists "passport_visits_city_read" on public.passport_visits;
create policy "passport_visits_city_read"
  on public.passport_visits for select
  to authenticated
  using (public.current_user_role() = 'city');
