-- Corroboración (#126): la prioridad de un reporte sube sola cuando varias personas
-- distintas reportan riesgo en el mismo lugar. La subida queda en la auditoría.
alter table public.moderation_actions
  drop constraint if exists moderation_actions_action_check;
alter table public.moderation_actions
  add constraint moderation_actions_action_check
  check (action in (
    'approve', 'remove', 'resolve', 'verify',
    'appeal', 'appeal_upheld', 'appeal_overturned',
    'corroborate'
  ));

create index if not exists idx_forum_threads_place_risk
  on public.forum_threads (place_id, created_at desc)
  where triage_priority <> 'none' and moderation_status = 'published';
