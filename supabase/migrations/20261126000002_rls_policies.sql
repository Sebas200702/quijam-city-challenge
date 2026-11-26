-- Row Level Security policies by role: visitor (anon/authenticated), vendor, city.

create or replace function public.current_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  profile_role text;
  jwt_role text;
begin
  if auth.uid() is null then
    return 'visitor';
  end if;

  select role into profile_role
  from public.user_profiles
  where user_id = auth.uid();

  if profile_role is not null then
    return profile_role;
  end if;

  jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';
  if jwt_role in ('visitor', 'vendor', 'city') then
    return jwt_role;
  end if;

  return 'visitor';
end;
$$;

grant execute on function public.current_user_role() to anon, authenticated;

alter table public.user_profiles enable row level security;
alter table public.stops enable row level security;
alter table public.flood_zones enable row level security;
alter table public.route_segments enable row level security;
alter table public.businesses enable row level security;
alter table public.overcharge_reports enable row level security;
alter table public.zone_visitor_counts enable row level security;

-- user_profiles: users can read their own role; only city manages roles.
drop policy if exists "user_profiles_select_self_or_city" on public.user_profiles;
create policy "user_profiles_select_self_or_city"
  on public.user_profiles for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'city');

drop policy if exists "user_profiles_city_manage" on public.user_profiles;
create policy "user_profiles_city_manage"
  on public.user_profiles for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- stops: public read for corridor map; only city writes.
drop policy if exists "stops_public_read" on public.stops;
create policy "stops_public_read"
  on public.stops for select
  to anon, authenticated
  using (true);

drop policy if exists "stops_city_write" on public.stops;
create policy "stops_city_write"
  on public.stops for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- flood_zones: public read for map and decider; only city toggles alerts.
drop policy if exists "flood_zones_public_read" on public.flood_zones;
create policy "flood_zones_public_read"
  on public.flood_zones for select
  to anon, authenticated
  using (true);

drop policy if exists "flood_zones_city_write" on public.flood_zones;
create policy "flood_zones_city_write"
  on public.flood_zones for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- route_segments: public read for reference fares and routes; only city writes.
drop policy if exists "route_segments_public_read" on public.route_segments;
create policy "route_segments_public_read"
  on public.route_segments for select
  to anon, authenticated
  using (true);

drop policy if exists "route_segments_city_write" on public.route_segments;
create policy "route_segments_city_write"
  on public.route_segments for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- businesses: public read; vendor updates own business status; city manages all.
drop policy if exists "businesses_public_read" on public.businesses;
create policy "businesses_public_read"
  on public.businesses for select
  to anon, authenticated
  using (true);

drop policy if exists "businesses_vendor_update_own" on public.businesses;
create policy "businesses_vendor_update_own"
  on public.businesses for update
  to authenticated
  using (public.current_user_role() = 'vendor' and owner_user_id = auth.uid())
  with check (public.current_user_role() = 'vendor' and owner_user_id = auth.uid());

drop policy if exists "businesses_city_write" on public.businesses;
create policy "businesses_city_write"
  on public.businesses for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- overcharge_reports: visitors submit open reports anonymously; only city reads/triages.
drop policy if exists "overcharge_reports_visitor_insert" on public.overcharge_reports;
create policy "overcharge_reports_visitor_insert"
  on public.overcharge_reports for insert
  to anon, authenticated
  with check (status = 'open');

drop policy if exists "overcharge_reports_city_select" on public.overcharge_reports;
create policy "overcharge_reports_city_select"
  on public.overcharge_reports for select
  to authenticated
  using (public.current_user_role() = 'city');

drop policy if exists "overcharge_reports_city_update" on public.overcharge_reports;
create policy "overcharge_reports_city_update"
  on public.overcharge_reports for update
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- zone_visitor_counts: restricted to city role for the Realtime city dashboard.
drop policy if exists "zone_visitor_counts_city_all" on public.zone_visitor_counts;
create policy "zone_visitor_counts_city_all"
  on public.zone_visitor_counts for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');
