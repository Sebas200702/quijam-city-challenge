-- Vendor portal (issue #49): claim a business by QR, open/close it, products
-- with prices and a count of visits. Idempotent, like the other migrations.
--
-- Privacy (Ley 1581 de 2012): a visit is only a business and a time. Nothing
-- about the visitor is stored.

-- 1. Businesses: verification status and one-time claim codes.

alter table public.businesses
  add column if not exists verification_status text not null default 'verified'
    check (verification_status in ('pending', 'verified'));

-- Claim codes live apart from businesses, which anyone can read for the map.
-- Only the SHA-256 of the code is stored; nobody reads this table through the API.
create table if not exists public.business_claims (
  token_hash text primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.business_claims enable row level security;
revoke all on public.business_claims from anon, authenticated;

-- City helper: creates a claim code for a business and returns it once, to
-- print as a QR (/vendedor/entrar?alta=<code>). A new code replaces the old one.
create or replace function public.create_business_claim(business_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  code text := encode(gen_random_bytes(18), 'hex');
begin
  if public.current_user_role() <> 'city' and auth.uid() is not null then
    raise exception 'Only the city can create claim codes.' using errcode = '42501';
  end if;
  select id into target from public.businesses where public.businesses.code = business_code;
  if target is null then
    raise exception 'Unknown business.' using errcode = 'P0002';
  end if;
  delete from public.business_claims where business_id = target;
  insert into public.business_claims (token_hash, business_id)
  values (encode(digest(code, 'sha256'), 'hex'), target);
  return code;
end;
$$;

revoke execute on function public.create_business_claim(text) from public, anon;
grant execute on function public.create_business_claim(text) to authenticated;

-- A vendor may change only how the business looks and whether it is open.
-- Verification, ownership, claim token, code and location stay with the city.
create or replace function public.guard_vendor_business_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'city' or auth.uid() is null then
    return new;
  end if;
  -- The one owner change allowed: claim_business() giving an unowned business
  -- to the caller. Direct updates cannot reach unowned rows (RLS).
  if old.owner_user_id is null and new.owner_user_id = auth.uid() then
    new.is_open := old.is_open;
    new.name := old.name;
    return new;
  end if;
  if new.is_verified is distinct from old.is_verified
    or new.verification_status is distinct from old.verification_status
    or new.owner_user_id is distinct from old.owner_user_id
    or new.code is distinct from old.code
    or new.zone is distinct from old.zone
    or new.stop_id is distinct from old.stop_id
    or new.latitude is distinct from old.latitude
    or new.longitude is distinct from old.longitude
    or new.commission_free is distinct from old.commission_free
    or new.qr_token is distinct from old.qr_token
    or new.is_simulated is distinct from old.is_simulated
  then
    raise exception 'Only the city can change verification, ownership or location.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_businesses_vendor_guard on public.businesses;
create trigger trg_businesses_vendor_guard
  before update on public.businesses
  for each row execute function public.guard_vendor_business_update();

revoke execute on function public.guard_vendor_business_update() from public, anon, authenticated;

-- Claiming: the signed-in person who scans the city's QR becomes the owner and
-- gets the vendor role (never lowering a city account). The token works once.
create or replace function public.claim_business(token text)
returns table (business_code text, business_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.businesses%rowtype;
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to claim a business.' using errcode = '42501';
  end if;
  if token is null or length(token) < 16 then
    raise exception 'Invalid claim code.' using errcode = '22023';
  end if;

  delete from public.business_claims
  where token_hash = encode(digest(token, 'sha256'), 'hex')
  returning business_id into target;

  update public.businesses
  set owner_user_id = auth.uid()
  where id = target and owner_user_id is null
  returning * into claimed;

  if not found then
    raise exception 'This code is not valid or was already used.' using errcode = 'P0002';
  end if;

  insert into public.user_profiles (user_id, role)
  values (auth.uid(), 'vendor')
  on conflict (user_id) do update
    set role = 'vendor'
    where public.user_profiles.role = 'visitor';

  return query select claimed.code, claimed.name;
end;
$$;

revoke execute on function public.claim_business(text) from public, anon;
grant execute on function public.claim_business(text) to authenticated;

-- 2. Products with prices, edited by the owner.

create table if not exists public.business_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  price_cop integer not null check (price_cop between 0 and 2000000),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_products_business_idx
  on public.business_products (business_id, sort_order);

drop trigger if exists trg_business_products_updated_at on public.business_products;
create trigger trg_business_products_updated_at
  before update on public.business_products
  for each row execute function public.touch_updated_at();

alter table public.business_products enable row level security;

drop policy if exists "business_products_public_read" on public.business_products;
create policy "business_products_public_read"
  on public.business_products for select
  to anon, authenticated
  using (
    is_available
    or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_user_id = auth.uid()
    )
    or public.current_user_role() = 'city'
  );

drop policy if exists "business_products_owner_write" on public.business_products;
create policy "business_products_owner_write"
  on public.business_products for all
  to authenticated
  using (
    public.current_user_role() = 'vendor'
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_user_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() = 'vendor'
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_user_id = auth.uid()
    )
  );

drop policy if exists "business_products_city_all" on public.business_products;
create policy "business_products_city_all"
  on public.business_products for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- 3. Visits: only a business and a time. Inserted by the server API
--    (/api/vendor/visit, rate limited) with the service key; read by the owner.

create table if not exists public.business_visits (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  visited_at timestamptz not null default now()
);

create index if not exists business_visits_business_time_idx
  on public.business_visits (business_id, visited_at desc);

alter table public.business_visits enable row level security;

drop policy if exists "business_visits_owner_or_city_read" on public.business_visits;
create policy "business_visits_owner_or_city_read"
  on public.business_visits for select
  to authenticated
  using (
    public.current_user_role() = 'city'
    or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_user_id = auth.uid()
    )
  );

-- No insert, update or delete policy: only the service role writes visits.
revoke insert, update, delete on public.business_visits from anon, authenticated;

-- 4. Realtime: the map shows "Abierto"/"Cerrado" as soon as the vendor taps,
--    and the vendor sees new visits.

do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['businesses', 'business_visits']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end;
$$;
