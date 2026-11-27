-- Lista de espera (#126): cuando un evento se llena, las personas pueden anotarse y
-- entran solas, en orden de llegada, apenas alguien libera un cupo.

create table if not exists public.event_waitlist (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_event_waitlist_order
  on public.event_waitlist (event_id, created_at);
create index if not exists idx_event_waitlist_user
  on public.event_waitlist (user_id);

alter table public.event_waitlist enable row level security;

-- Cada persona ve solo su lugar; quien organiza ve la lista de su evento.
drop policy if exists "waitlist_read_own_or_organizer" on public.event_waitlist;
create policy "waitlist_read_own_or_organizer" on public.event_waitlist for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );

drop policy if exists "waitlist_delete_self" on public.event_waitlist;
create policy "waitlist_delete_self" on public.event_waitlist for delete
  to authenticated using (user_id = auth.uid());

-- Anotarse pasa por esta función: solo si el evento está lleno y la persona no está inscrita.
create or replace function public.join_waitlist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para anotarte en la lista de espera.' using errcode = 'P0001';
  end if;
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' or ev.moderation_status <> 'published' then
    raise exception 'Este evento no está disponible para inscripciones.' using errcode = 'P0001';
  end if;
  if coalesce(ev.ends_at, ev.starts_at) < now() then
    raise exception 'Este evento ya pasó.' using errcode = 'P0001';
  end if;
  if ev.capacity is null or ev.registered_count < ev.capacity then
    raise exception 'Todavía hay cupos: inscríbete directamente.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.event_registrations where event_id = p_event_id and user_id = auth.uid()) then
    raise exception 'Ya estás inscrito en este evento.' using errcode = 'P0001';
  end if;
  insert into public.event_waitlist (event_id, user_id) values (p_event_id, auth.uid())
  on conflict do nothing;
end;
$$;

revoke all on function public.join_waitlist(uuid) from public, anon;
grant execute on function public.join_waitlist(uuid) to authenticated;

-- Cuando alguien libera un cupo, la primera persona de la lista entra.
create or replace function public.handle_event_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  next_user uuid;
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
    -- Quien se inscribe sale de la lista de espera de ese evento.
    delete from public.event_waitlist where event_id = new.event_id and user_id = new.user_id;
    return new;
  end if;

  update public.events set registered_count = greatest(registered_count - 1, 0) where id = old.event_id;

  select * into ev from public.events where id = old.event_id for update;
  if ev.status = 'published'
     and ev.moderation_status = 'published'
     and coalesce(ev.ends_at, ev.starts_at) >= now()
     and (ev.capacity is null or ev.registered_count < ev.capacity) then
    select user_id into next_user
    from public.event_waitlist
    where event_id = old.event_id
    order by created_at
    limit 1
    for update skip locked;
    if next_user is not null then
      -- El insert dispara este mismo trigger: suma el cupo y la saca de la lista.
      insert into public.event_registrations (event_id, user_id) values (old.event_id, next_user)
      on conflict do nothing;
    end if;
  end if;
  return old;
end;
$$;
