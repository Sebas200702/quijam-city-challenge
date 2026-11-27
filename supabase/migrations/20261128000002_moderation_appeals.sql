-- Apelaciones (#126): quien tuvo contenido retirado pide una segunda revisión.
-- Queda en la cola de la ciudad y en la auditoría (moderation_actions).

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('event', 'thread', 'post')),
  content_id uuid not null,
  appellant_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 500),
  status text not null default 'open' check (status in ('open', 'upheld', 'overturned')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  -- Una sola apelación por contenido: la segunda revisión es la última.
  unique (kind, content_id)
);

create index if not exists idx_moderation_appeals_open
  on public.moderation_appeals (status, created_at desc);

alter table public.moderation_appeals enable row level security;

drop policy if exists "moderation_appeals_read_own_or_city" on public.moderation_appeals;
create policy "moderation_appeals_read_own_or_city" on public.moderation_appeals for select
  to authenticated
  using (appellant_id = auth.uid() or public.current_user_role() = 'city');

-- Sin políticas de insert/update: las apelaciones se crean con request_appeal()
-- y las cierra el servidor con la llave de servicio.

alter table public.moderation_actions
  drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions
  add constraint moderation_actions_action_check
  check (action in ('approve', 'remove', 'resolve', 'verify', 'appeal', 'appeal_upheld', 'appeal_overturned'));

create or replace function public.request_appeal(p_kind text, p_content_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
  owner_column text;
  owner uuid;
  current_status text;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para apelar.' using errcode = 'P0001';
  end if;
  if p_kind not in ('event', 'thread', 'post') then
    raise exception 'Solicitud inválida.' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_message, '')) not between 10 and 500 then
    raise exception 'Cuéntanos en 10 a 500 caracteres por qué debemos revisarlo de nuevo.' using errcode = 'P0001';
  end if;

  tbl := case p_kind when 'event' then 'events' when 'thread' then 'forum_threads' else 'forum_posts' end;
  owner_column := case p_kind when 'event' then 'organizer_id' else 'author_id' end;
  execute format('select %I, moderation_status from public.%I where id = $1', owner_column, tbl)
    into owner, current_status using p_content_id;

  if owner is distinct from auth.uid() then
    raise exception 'Solo quien lo publicó puede apelar.' using errcode = 'P0001';
  end if;
  if current_status is distinct from 'removed' then
    raise exception 'Solo se apela contenido retirado.' using errcode = 'P0001';
  end if;

  insert into public.moderation_appeals (kind, content_id, appellant_id, message)
  values (p_kind, p_content_id, auth.uid(), p_message);

  insert into public.moderation_actions (moderator_id, kind, content_id, action)
  values (null, p_kind, p_content_id, 'appeal');
exception when unique_violation then
  raise exception 'Ya pediste una segunda revisión de esto.' using errcode = 'P0001';
end;
$$;

revoke all on function public.request_appeal(text, uuid, text) from public, anon;
grant execute on function public.request_appeal(text, uuid, text) to authenticated;
