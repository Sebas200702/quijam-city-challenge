-- Privacy (Ley 1581 de 2012, review of PR #206): the default display name must
-- never be derived from the email. Before this migration an account without a
-- `display_name` in its metadata (for example Google sign-in) got the part of
-- the email before the @ as its public name, which is readable without a
-- session and is sent to Gemini as context.
--
-- New order: sign-up `display_name`, then the Google `full_name` / `name`,
-- then the neutral "Persona de la comunidad". A candidate that is too short or
-- reserved for official entities also falls back to the neutral name, so the
-- guard trigger never blocks a sign-up.
--
-- Existing rows are NOT rewritten: those people can change their name in
-- /perfil → Editar perfil.

create or replace function public.handle_new_community_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text := left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  ), 60);
begin
  if candidate is null
    or char_length(candidate) < 2
    or public.is_reserved_display_name(candidate) then
    candidate := 'Persona de la comunidad';
  end if;

  insert into public.profiles (id, display_name, neighborhood, is_visitor)
  values (
    new.id,
    candidate,
    nullif(trim(new.raw_user_meta_data ->> 'neighborhood'), ''),
    coalesce((new.raw_user_meta_data ->> 'is_visitor')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- `create or replace` keeps grants, but restate the hardening of 20261127000003.
revoke execute on function public.handle_new_community_user() from public, anon, authenticated;
