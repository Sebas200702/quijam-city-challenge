-- Hardening flagged by the Supabase security advisor.
--
-- 1. Trigger functions run as SECURITY DEFINER but are only meant to fire from
--    their triggers. Remove direct EXECUTE through /rest/v1/rpc. Triggers keep
--    firing: PostgreSQL does not check EXECUTE when a trigger runs.
--    current_user_role() stays executable: RLS policies call it.
-- 2. Pin search_path on the functions that did not set it.

revoke execute on function public.handle_new_community_user() from public, anon, authenticated;
revoke execute on function public.handle_event_registration() from public, anon, authenticated;
revoke execute on function public.handle_forum_post() from public, anon, authenticated;
revoke execute on function public.handle_content_report() from public, anon, authenticated;

alter function public.touch_updated_at() set search_path = public;
alter function public.is_reserved_display_name(text) set search_path = public;
alter function public.guard_display_name() set search_path = public;
