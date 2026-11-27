-- Event reminders, cancellation/update notices and moderation notices (#91, #92).
-- Privacy (Ley 1581 de 2012): each person reads, marks read and deletes only
-- their own notifications; cascades automatically when the profile is deleted.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (
    kind in (
      'event_reminder',
      'event_cancelled',
      'event_updated',
      'moderation_approved',
      'moderation_removed'
    )
  ),
  title text not null check (char_length(title) between 2 and 160),
  body text not null check (char_length(body) between 2 and 500),
  href text not null default '/inicio' check (href like '/%'),
  event_id uuid references public.events (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

-- Only the recipient reads, marks as read or deletes their own notifications.
-- Inserts come from the server (service role) or security-definer triggers only.
drop policy if exists "user_notifications_select_self" on public.user_notifications;
create policy "user_notifications_select_self"
  on public.user_notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_notifications_update_self" on public.user_notifications;
create policy "user_notifications_update_self"
  on public.user_notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_notifications_delete_self" on public.user_notifications;
create policy "user_notifications_delete_self"
  on public.user_notifications for delete
  to authenticated
  using (user_id = auth.uid());

revoke insert on public.user_notifications from anon, authenticated;

-- Notify every registered attendee when an organizer cancels an event.
create or replace function public.notify_event_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'cancelled' and new.status = 'cancelled' then
    insert into public.user_notifications (user_id, kind, title, body, href, event_id)
    select
      r.user_id,
      'event_cancelled',
      'Evento cancelado: ' || left(new.title, 120),
      'El organizador canceló "' || left(new.title, 120) || '". Revisa otros planes en la agenda.',
      '/agenda/' || new.id::text,
      new.id
    from public.event_registrations r
    where r.event_id = new.id
      and (new.organizer_id is null or r.user_id <> new.organizer_id);
  end if;
  return new;
end;
$$;

revoke all on function public.notify_event_cancelled() from public, anon, authenticated;

drop trigger if exists trg_events_notify_cancelled on public.events;
create trigger trg_events_notify_cancelled
  after update of status on public.events
  for each row execute function public.notify_event_cancelled();

-- Publish live notification inserts to authenticated subscribers (RLS applies).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'user_notifications'
    ) then
      alter publication supabase_realtime add table public.user_notifications;
    end if;
  end if;
end;
$$;
