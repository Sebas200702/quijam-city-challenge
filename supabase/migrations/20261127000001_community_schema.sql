-- Community layer: citizen and visitor accounts, places (spaces and nature),
-- events anyone can publish, registrations with capacity, and a public forum.
--
-- Moderation: events, forum threads and replies are written ONLY by the server
-- (/api/community/publish, service role) after the moderation triage (hard
-- rules + OpenJev). Clients have no insert policy on those tables, so nothing
-- reaches the public without passing the triage. Held content is visible to its
-- author and to the city role only.
--
-- Privacy (Ley 1581 de 2012): profiles hold a public display name and an
-- optional neighborhood; registrations are visible to their owner and to the
-- event organizer only; the triage rejects phone numbers, e-mails and IDs.

create extension if not exists pgcrypto;

-- ── Profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 80),
  is_visitor boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create the profile from the sign-up metadata so the client never races it.
create or replace function public.handle_new_community_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, neighborhood, is_visitor)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60),
    nullif(trim(new.raw_user_meta_data ->> 'neighborhood'), ''),
    coalesce((new.raw_user_meta_data ->> 'is_visitor')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auth_users_community_profile on auth.users;
create trigger trg_auth_users_community_profile
  after insert on auth.users
  for each row execute function public.handle_new_community_user();

-- ── Places: public spaces, parks and nature ─────────────────────────────
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  kind text not null check (kind in ('nature', 'park', 'culture', 'heritage', 'sport', 'waterfront')),
  neighborhood text not null,
  description text not null,
  address text,
  latitude double precision not null check (latitude between 10.80 and 11.15),
  longitude double precision not null check (longitude between -75.00 and -74.60),
  is_accessible boolean not null default true,
  is_free boolean not null default true,
  opening_hours text,
  created_at timestamptz not null default now()
);

-- Moderation columns shared by events, threads and posts:
--   moderation_status  published | held | removed
--   moderation_labels  e.g. {ok} or {harassment,spam}
--   moderation_source  rules | openjev | moderator
--   triage_priority    none | city_attention | emergency  (city follow-up)
--   city_resolved_at   when the city closed the follow-up

-- ── Events ───────────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 4 and 120),
  description text not null check (char_length(description) between 10 and 4000),
  category text not null check (category in ('culture', 'sport', 'nature', 'volunteer', 'food', 'music', 'learning', 'community')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  place_id uuid references public.places (id) on delete set null,
  location_text text check (location_text is null or char_length(location_text) <= 200),
  capacity integer check (capacity is null or capacity between 1 and 100000),
  registered_count integer not null default 0 check (registered_count >= 0),
  is_free boolean not null default true,
  price_cop integer check (price_cop is null or price_cop >= 0),
  organizer_id uuid references public.profiles (id) on delete set null,
  organizer_name text not null,
  status text not null default 'published' check (status in ('published', 'cancelled')),
  moderation_status text not null default 'published' check (moderation_status in ('published', 'held', 'removed')),
  moderation_labels text[] not null default '{ok}',
  moderation_source text not null default 'rules' check (moderation_source in ('rules', 'openjev', 'moderator')),
  triage_priority text not null default 'none' check (triage_priority in ('none', 'city_attention', 'emergency')),
  city_resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at),
  constraint events_has_location check (place_id is not null or location_text is not null)
);

create index if not exists idx_events_upcoming on public.events (starts_at) where status = 'published' and moderation_status = 'published';
create index if not exists idx_events_place on public.events (place_id);
create index if not exists idx_events_organizer on public.events (organizer_id);
create index if not exists idx_events_moderation on public.events (moderation_status, triage_priority);

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ── Registrations ────────────────────────────────────────────────────────
create table if not exists public.event_registrations (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_event_registrations_user on public.event_registrations (user_id);

-- Enforce capacity and keep registered_count in step, atomically.
create or replace function public.handle_event_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into ev from public.events where id = new.event_id for update;
    if ev.status <> 'published' or ev.moderation_status <> 'published' then
      raise exception 'Este evento no está disponible para inscripciones.' using errcode = 'P0001';
    end if;
    if coalesce(ev.ends_at, ev.starts_at) < now() then
      raise exception 'Este evento ya pasó.' using errcode = 'P0001';
    end if;
    if ev.capacity is not null and ev.registered_count >= ev.capacity then
      raise exception 'No quedan cupos para este evento.' using errcode = 'P0001';
    end if;
    update public.events set registered_count = registered_count + 1 where id = new.event_id;
    return new;
  end if;
  update public.events set registered_count = greatest(registered_count - 1, 0) where id = old.event_id;
  return old;
end;
$$;

drop trigger if exists trg_event_registrations_count on public.event_registrations;
create trigger trg_event_registrations_count
  after insert or delete on public.event_registrations
  for each row execute function public.handle_event_registration();

-- ── Forum ────────────────────────────────────────────────────────────────
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 4 and 140),
  body text not null check (char_length(body) between 2 and 5000),
  category text not null check (category in ('general', 'mobility', 'nature', 'safety', 'culture', 'visitors', 'neighborhood')),
  place_id uuid references public.places (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  reply_count integer not null default 0 check (reply_count >= 0),
  last_activity_at timestamptz not null default now(),
  moderation_status text not null default 'published' check (moderation_status in ('published', 'held', 'removed')),
  moderation_labels text[] not null default '{ok}',
  moderation_source text not null default 'rules' check (moderation_source in ('rules', 'openjev', 'moderator')),
  triage_priority text not null default 'none' check (triage_priority in ('none', 'city_attention', 'emergency')),
  city_resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_forum_threads_activity on public.forum_threads (last_activity_at desc);
create index if not exists idx_forum_threads_place on public.forum_threads (place_id);
create index if not exists idx_forum_threads_event on public.forum_threads (event_id);
create index if not exists idx_forum_threads_moderation on public.forum_threads (moderation_status, triage_priority);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null,
  moderation_status text not null default 'published' check (moderation_status in ('published', 'held', 'removed')),
  moderation_labels text[] not null default '{ok}',
  moderation_source text not null default 'rules' check (moderation_source in ('rules', 'openjev', 'moderator')),
  triage_priority text not null default 'none' check (triage_priority in ('none', 'city_attention', 'emergency')),
  city_resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_forum_posts_thread on public.forum_posts (thread_id, created_at);
create index if not exists idx_forum_posts_moderation on public.forum_posts (moderation_status, triage_priority);

-- reply_count counts published replies only; held replies join it when approved.
create or replace function public.handle_forum_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := 0;
begin
  if tg_op = 'INSERT' and new.moderation_status = 'published' then
    delta := 1;
  elsif tg_op = 'DELETE' and old.moderation_status = 'published' then
    delta := -1;
  elsif tg_op = 'UPDATE' and old.moderation_status is distinct from new.moderation_status then
    if new.moderation_status = 'published' then delta := 1;
    elsif old.moderation_status = 'published' then delta := -1;
    end if;
  end if;

  if delta <> 0 then
    update public.forum_threads
      set reply_count = greatest(reply_count + delta, 0),
          last_activity_at = case when delta > 0 then now() else last_activity_at end
      where id = coalesce(new.thread_id, old.thread_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_forum_posts_count on public.forum_posts;
create trigger trg_forum_posts_count
  after insert or update or delete on public.forum_posts
  for each row execute function public.handle_forum_post();

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles for select
  to anon, authenticated using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "places_public_read" on public.places;
create policy "places_public_read" on public.places for select
  to anon, authenticated using (true);

drop policy if exists "places_city_write" on public.places;
create policy "places_city_write" on public.places for all
  to authenticated
  using (public.current_user_role() = 'city')
  with check (public.current_user_role() = 'city');

-- Events: published ones are public; held ones only for the organizer and the city.
drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events for select
  to anon, authenticated
  using (
    moderation_status = 'published'
    or organizer_id = auth.uid()
    or public.current_user_role() = 'city'
  );

-- Organizers may only cancel (status); every other change goes through the server.
drop policy if exists "events_cancel_owner_or_city" on public.events;
create policy "events_cancel_owner_or_city" on public.events for update
  to authenticated
  using (organizer_id = auth.uid() or public.current_user_role() = 'city')
  with check (organizer_id = auth.uid() or public.current_user_role() = 'city');

revoke insert, update, delete on public.events from anon, authenticated;
grant update (status) on public.events to authenticated;

drop policy if exists "registrations_read_own_or_organizer" on public.event_registrations;
create policy "registrations_read_own_or_organizer" on public.event_registrations for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );

drop policy if exists "registrations_insert_self" on public.event_registrations;
create policy "registrations_insert_self" on public.event_registrations for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "registrations_delete_self" on public.event_registrations;
create policy "registrations_delete_self" on public.event_registrations for delete
  to authenticated using (user_id = auth.uid());

drop policy if exists "forum_threads_read" on public.forum_threads;
create policy "forum_threads_read" on public.forum_threads for select
  to anon, authenticated
  using (
    moderation_status = 'published'
    or author_id = auth.uid()
    or public.current_user_role() = 'city'
  );

drop policy if exists "forum_posts_read" on public.forum_posts;
create policy "forum_posts_read" on public.forum_posts for select
  to anon, authenticated
  using (
    moderation_status = 'published'
    or author_id = auth.uid()
    or public.current_user_role() = 'city'
  );

revoke insert, update, delete on public.forum_threads from anon, authenticated;
revoke insert, update, delete on public.forum_posts from anon, authenticated;

-- Live updates for the agenda and the forum (RLS still applies to each subscriber).
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['events', 'forum_threads', 'forum_posts']
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
