-- Points on the map for community content (docs/30, U08, U15, U36 and §6.4).
--
-- Events and forum threads get an optional point (latitude/longitude) and the AMB
-- municipality it falls in. The point is always the one of a public place (the park
-- of the event, the corner of a report), never where a person is: the forms pick it
-- on a map, and the server checks it falls inside the Metropolitan Area outline
-- (isInsideAmb) before storing it. The box below is the AMB box of
-- 20261129000001_metro_area_bounds.sql, rounded outwards.
--
-- Overcharge reports get an approximate point too: the start of the route segment,
-- set by /api/reports, so the city dashboard can place them on its map.
--
-- The profile neighborhood (U36) becomes a coarse zone from a fixed list (the five
-- localities of Barranquilla and the other four municipalities). Old free-text
-- values stay as they are until the person changes them; new values must be zones.
--
-- RLS stays as it is: events and threads are still written only by the server
-- (service role) and their policies do not depend on the new columns.

-- ── Events ──────────────────────────────────────────────────────────────
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists municipality text;

alter table public.events
  drop constraint if exists events_point_pair_check,
  drop constraint if exists events_latitude_check,
  drop constraint if exists events_longitude_check,
  drop constraint if exists events_municipality_check,
  add constraint events_point_pair_check check ((latitude is null) = (longitude is null)),
  add constraint events_latitude_check check (latitude is null or latitude between 10.81 and 11.11),
  add constraint events_longitude_check check (longitude is null or longitude between -74.99 and -74.72),
  add constraint events_municipality_check check (
    municipality is null
    or municipality in ('barranquilla', 'soledad', 'malambo', 'puertoColombia', 'galapa')
  );

-- ── Forum threads ───────────────────────────────────────────────────────
alter table public.forum_threads
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists municipality text;

alter table public.forum_threads
  drop constraint if exists forum_threads_point_pair_check,
  drop constraint if exists forum_threads_latitude_check,
  drop constraint if exists forum_threads_longitude_check,
  drop constraint if exists forum_threads_municipality_check,
  add constraint forum_threads_point_pair_check check ((latitude is null) = (longitude is null)),
  add constraint forum_threads_latitude_check check (latitude is null or latitude between 10.81 and 11.11),
  add constraint forum_threads_longitude_check check (longitude is null or longitude between -74.99 and -74.72),
  add constraint forum_threads_municipality_check check (
    municipality is null
    or municipality in ('barranquilla', 'soledad', 'malambo', 'puertoColombia', 'galapa')
  );

-- Content linked to a catalog place inherits the place's point when it fits the box.
-- (The municipality is left empty here: the app derives it from the point.)
update public.events e
set latitude = p.latitude, longitude = p.longitude
from public.places p
where e.place_id = p.id
  and e.latitude is null
  and p.latitude between 10.81 and 11.11
  and p.longitude between -74.99 and -74.72;

update public.forum_threads t
set latitude = p.latitude, longitude = p.longitude
from public.places p
where t.place_id = p.id
  and t.latitude is null
  and p.latitude between 10.81 and 11.11
  and p.longitude between -74.99 and -74.72;

-- ── Overcharge reports: approximate point (start of the route segment) ──
alter table public.overcharge_reports
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.overcharge_reports
  drop constraint if exists overcharge_reports_point_pair_check,
  drop constraint if exists overcharge_reports_latitude_check,
  drop constraint if exists overcharge_reports_longitude_check,
  add constraint overcharge_reports_point_pair_check check ((latitude is null) = (longitude is null)),
  add constraint overcharge_reports_latitude_check check (latitude is null or latitude between 10.81 and 11.11),
  add constraint overcharge_reports_longitude_check check (longitude is null or longitude between -74.99 and -74.72);

update public.overcharge_reports r
set latitude = s.latitude, longitude = s.longitude
from public.route_segments g
join public.stops s on s.id = g.origin_stop_id
where r.segment_id = g.id
  and r.latitude is null;

-- ── Profile neighborhood: a coarse AMB zone, never an exact location ────
create or replace function public.is_amb_zone(value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select value in (
    'barranquilla-riomar',
    'barranquilla-norte-centro',
    'barranquilla-suroccidente',
    'barranquilla-suroriente',
    'barranquilla-metropolitana',
    'soledad',
    'malambo',
    'puerto-colombia',
    'galapa'
  );
$$;

-- Sign-up metadata that is not a zone is dropped (the profile keeps no neighborhood);
-- an edit to a value that is not a zone is refused. Untouched old values stay.
create or replace function public.guard_profile_neighborhood()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.neighborhood is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.neighborhood is not distinct from old.neighborhood then
    return new;
  end if;
  if public.is_amb_zone(new.neighborhood) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.neighborhood := null;
    return new;
  end if;
  raise exception 'neighborhood must be an AMB zone' using errcode = '23514';
end;
$$;

revoke execute on function public.guard_profile_neighborhood() from public, anon, authenticated;

drop trigger if exists trg_profiles_neighborhood on public.profiles;
create trigger trg_profiles_neighborhood
  before insert or update of neighborhood on public.profiles
  for each row execute function public.guard_profile_neighborhood();
