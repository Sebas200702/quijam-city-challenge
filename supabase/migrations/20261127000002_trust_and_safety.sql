-- Trust and safety for the community layer (docs/22-seguridad-y-confianza.md):
--   reserved display names, verified organizers, citizen reports confirmed by
--   the city, community reports that hold content, a moderation audit log and
--   account deletion (Ley 1581 de 2012: supresión).

-- ── Reserved display names ───────────────────────────────────────────────
-- Same list as RESERVED_NAME_TERMS in src/lib/community/community-rules.ts.
create or replace function public.is_reserved_display_name(name text)
returns boolean
language sql
immutable
as $$
  select regexp_replace(
           lower(translate(coalesce(name, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
           '[^a-z0-9]+', ' ', 'g'
         ) ~ '(^| )(alcaldia|alcalde|gobernacion|gobierno|policia|bomberos|defensa civil|cruz roja|ejercito|armada|fiscalia|quillart|moderador|moderacion|administrador|admin|oficial|soporte)( |$)';
$$;

create or replace function public.guard_display_name()
returns trigger
language plpgsql
as $$
begin
  if public.is_reserved_display_name(new.display_name) then
    raise exception 'Ese nombre está reservado para entidades oficiales.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_display_name on public.profiles;
create trigger trg_profiles_guard_display_name
  before insert or update of display_name on public.profiles
  for each row execute function public.guard_display_name();

-- ── Verified organizers ──────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_verified_organizer boolean not null default false;

-- People edit their own name, neighborhood and visitor flag. Verifying an
-- organizer is done by the city with the service role (SQL editor or server):
--   update public.profiles set is_verified_organizer = true where id = '<uuid>';
revoke update on public.profiles from authenticated;
grant update (display_name, neighborhood, is_visitor) on public.profiles to authenticated;

alter table public.events
  add column if not exists organizer_verified boolean not null default false;

-- ── Citizen reports confirmed by the city ────────────────────────────────
alter table public.forum_threads
  add column if not exists city_verified_at timestamptz;

-- ── Community reports ────────────────────────────────────────────────────
alter table public.events add column if not exists community_reports integer not null default 0;
alter table public.forum_threads add column if not exists community_reports integer not null default 0;
alter table public.forum_posts add column if not exists community_reports integer not null default 0;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('event', 'thread', 'post')),
  content_id uuid not null,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'scam', 'offensive', 'misinformation', 'impersonation', 'other')),
  created_at timestamptz not null default now(),
  unique (kind, content_id, reporter_id)
);

create index if not exists idx_content_reports_target on public.content_reports (kind, content_id);

-- Three distinct reporters hold published content until a moderator decides.
-- Same threshold as COMMUNITY_REPORT_HOLD_THRESHOLD in src/lib/moderation/trust-policy.ts.
create or replace function public.handle_content_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text := case new.kind when 'event' then 'events' when 'thread' then 'forum_threads' else 'forum_posts' end;
  owner_column text := case new.kind when 'event' then 'organizer_id' else 'author_id' end;
  owner uuid;
begin
  execute format('select %I from public.%I where id = $1', owner_column, tbl) into owner using new.content_id;
  if owner is not null and owner = new.reporter_id then
    raise exception 'No puedes reportar tu propia publicación.' using errcode = 'P0001';
  end if;
  execute format(
    'update public.%I set community_reports = community_reports + 1,
       moderation_status = case when community_reports + 1 >= 3 and moderation_status = ''published'' then ''held'' else moderation_status end
     where id = $1',
    tbl
  ) using new.content_id;
  return new;
end;
$$;

drop trigger if exists trg_content_reports_apply on public.content_reports;
create trigger trg_content_reports_apply
  after insert on public.content_reports
  for each row execute function public.handle_content_report();

alter table public.content_reports enable row level security;

drop policy if exists "content_reports_insert_self" on public.content_reports;
create policy "content_reports_insert_self" on public.content_reports for insert
  to authenticated with check (reporter_id = auth.uid());

drop policy if exists "content_reports_read_own_or_city" on public.content_reports;
create policy "content_reports_read_own_or_city" on public.content_reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.current_user_role() = 'city');

-- ── Moderation audit log ─────────────────────────────────────────────────
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('event', 'thread', 'post')),
  content_id uuid not null,
  action text not null check (action in ('approve', 'remove', 'resolve', 'verify')),
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_actions_content on public.moderation_actions (kind, content_id, created_at desc);

alter table public.moderation_actions enable row level security;

-- Written by the server (service role) only; the city reads it.
drop policy if exists "moderation_actions_city_read" on public.moderation_actions;
create policy "moderation_actions_city_read" on public.moderation_actions for select
  to authenticated using (public.current_user_role() = 'city');

-- ── Account deletion (Ley 1581: supresión) ───────────────────────────────
-- Called by the server right before deleting the auth user. Removes what the
-- person wrote, cancels their upcoming events and anonymizes past ones.
create or replace function public.delete_community_account(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.forum_posts where author_id = target;
  delete from public.forum_threads where author_id = target;
  update public.events
    set status = 'cancelled'
    where organizer_id = target and starts_at > now();
  update public.events
    set organizer_name = 'Cuenta eliminada', organizer_id = null
    where organizer_id = target;
  delete from public.content_reports where reporter_id = target;
  delete from public.event_registrations where user_id = target;
end;
$$;

revoke all on function public.delete_community_account(uuid) from public, anon, authenticated;
