-- Pilot corridor schema for Barranquilla 2034 (Issue #16).
-- All seeded prototype records are explicitly flagged with is_simulated = true.
-- Privacy (Ley 1581 de 2012): no visitor PII or exact user GPS is stored.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'visitor' check (role in ('visitor', 'vendor', 'city')),
  display_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  zone text not null check (zone in ('estadio', 'troncal_murillo', 'centro', 'barrio_abajo', 'gran_malecon')),
  stop_type text not null check (stop_type in ('transmetro', 'bus_stop', 'qr_point', 'host_hub')),
  latitude double precision not null check (latitude between 10.85 and 11.10),
  longitude double precision not null check (longitude between -74.90 and -74.70),
  is_accessible boolean not null default true,
  has_qr boolean not null default true,
  has_shade boolean not null default false,
  has_hydration boolean not null default false,
  has_recycling boolean not null default false,
  has_host_duo boolean not null default false,
  is_simulated boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.flood_zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  zone text not null check (zone in ('estadio', 'troncal_murillo', 'centro', 'barrio_abajo', 'gran_malecon')),
  latitude double precision not null check (latitude between 10.85 and 11.10),
  longitude double precision not null check (longitude between -74.90 and -74.70),
  radius_meters integer not null default 150 check (radius_meters > 0),
  is_channeled boolean not null default false,
  risk_level text not null default 'low' check (risk_level in ('low', 'moderate', 'high', 'critical')),
  alert_active boolean not null default false,
  advisory_es text,
  advisory_en text,
  is_simulated boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.route_segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  origin_stop_id uuid not null references public.stops (id) on delete cascade,
  destination_stop_id uuid not null references public.stops (id) on delete cascade,
  transport_mode text not null check (transport_mode in ('transmetro', 'bus', 'taxi_verified', 'walk', 'bike')),
  distance_km numeric(5, 2) not null check (distance_km > 0),
  estimated_minutes integer not null check (estimated_minutes > 0),
  reference_fare_cop integer not null check (reference_fare_cop >= 0),
  fare_min_cop integer not null check (fare_min_cop >= 0),
  fare_max_cop integer not null check (fare_max_cop >= fare_min_cop),
  is_green_route boolean not null default false,
  is_accessible boolean not null default true,
  flood_zone_id uuid references public.flood_zones (id) on delete set null,
  is_simulated boolean not null default true,
  created_at timestamptz not null default now(),
  constraint route_segments_distinct_stops check (origin_stop_id <> destination_stop_id)
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null check (category in ('food_popular', 'crafts', 'culture', 'eco_event', 'coffee')),
  zone text not null check (zone in ('estadio', 'troncal_murillo', 'centro', 'barrio_abajo', 'gran_malecon')),
  stop_id uuid references public.stops (id) on delete set null,
  latitude double precision not null check (latitude between 10.85 and 11.10),
  longitude double precision not null check (longitude between -74.90 and -74.70),
  is_verified boolean not null default true,
  is_open boolean not null default false,
  commission_free boolean not null default true,
  qr_token text unique,
  owner_user_id uuid references auth.users (id) on delete set null,
  description_es text not null,
  description_en text not null,
  is_simulated boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.overcharge_reports (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references public.route_segments (id) on delete set null,
  zone text not null check (zone in ('estadio', 'troncal_murillo', 'centro', 'barrio_abajo', 'gran_malecon')),
  transport_mode text not null check (transport_mode in ('taxi', 'bus', 'informal', 'other')),
  charged_fare_cop integer not null check (charged_fare_cop > 0),
  reference_fare_cop integer not null check (reference_fare_cop >= 0),
  driver_qr_code text,
  notes text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  is_simulated boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zone_visitor_counts (
  zone text primary key check (zone in ('estadio', 'troncal_murillo', 'centro', 'barrio_abajo', 'gran_malecon')),
  zone_label text not null,
  active_visitors integer not null default 0 check (active_visitors >= 0),
  capacity_threshold integer not null check (capacity_threshold > 0),
  city_mode text not null default 'world_cup' check (city_mode in ('world_cup', 'carnival', 'daily')),
  saturation_level text generated always as (
    case
      when active_visitors >= capacity_threshold then 'saturated'
      when active_visitors >= (capacity_threshold * 75 / 100) then 'high'
      else 'normal'
    end
  ) stored,
  is_simulated boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists idx_stops_zone on public.stops (zone);
create index if not exists idx_flood_zones_active on public.flood_zones (alert_active) where alert_active = true;
create index if not exists idx_route_segments_origin_dest on public.route_segments (origin_stop_id, destination_stop_id);
create index if not exists idx_businesses_zone_open on public.businesses (zone, is_open);
create index if not exists idx_overcharge_reports_status on public.overcharge_reports (status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_flood_zones_updated_at on public.flood_zones;
create trigger trg_flood_zones_updated_at
  before update on public.flood_zones
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_overcharge_reports_updated_at on public.overcharge_reports;
create trigger trg_overcharge_reports_updated_at
  before update on public.overcharge_reports
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_zone_visitor_counts_updated_at on public.zone_visitor_counts;
create trigger trg_zone_visitor_counts_updated_at
  before update on public.zone_visitor_counts
  for each row execute function public.touch_updated_at();

-- Register city dashboard tables in Supabase Realtime when the publication exists.
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['flood_zones', 'overcharge_reports', 'zone_visitor_counts']
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end;
$$;
