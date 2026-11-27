-- MFA (TOTP) required for the city role (issue #124).
--
-- Every city-only RLS policy and SECURITY DEFINER guard decides through
-- public.current_user_role() = 'city' (rls_policies, community_schema,
-- trust_and_safety, vendor_portal). Instead of rewriting each policy, this
-- redefines that single function: a city account only counts as 'city' when
-- the session's JWT carries `aal = 'aal2'` (a verified second factor);
-- at aal1 it is treated as 'visitor'. This is equivalent to adding
-- `(auth.jwt() ->> 'aal') = 'aal2'` to every city-only policy, as recommended
-- in https://supabase.com/docs/guides/auth/auth-mfa ("Enforce for all users").
--
-- Unchanged: anon/service-role callers (auth.uid() is null -> 'visitor'),
-- vendor and visitor roles, and every user reading their own user_profiles row
-- (policy `user_id = auth.uid() or ...`), which the MFA gate relies on.
-- Consequence: city accounts without an enrolled and verified TOTP factor
-- lose city powers in the database until they complete MFA.

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
  resolved text;
begin
  if auth.uid() is null then
    return 'visitor';
  end if;

  select role into profile_role
  from public.user_profiles
  where user_id = auth.uid();

  if profile_role is not null then
    resolved := profile_role;
  else
    jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';
    if jwt_role in ('visitor', 'vendor', 'city') then
      resolved := jwt_role;
    else
      resolved := 'visitor';
    end if;
  end if;

  if resolved = 'city' and coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    return 'visitor';
  end if;

  return resolved;
end;
$$;

grant execute on function public.current_user_role() to anon, authenticated;
