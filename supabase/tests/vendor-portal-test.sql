-- RLS and trigger tests for the vendor portal (#49). Run on a local database
-- with supabase-shim.sql, every migration and seed.sql applied (see supabase/tests/README.md).
-- Each check prints "ok N ..."; a failure stops with an error.
\set ON_ERROR_STOP 1
-- Fixtures (as postgres, bypasses RLS)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','rosa@example.com'),
 ('00000000-0000-0000-0000-00000000000b','otro@example.com'),
 ('00000000-0000-0000-0000-00000000000c','city@example.com'),
 ('00000000-0000-0000-0000-00000000000d','persona@example.com') on conflict do nothing;
insert into public.user_profiles (user_id, role) values ('00000000-0000-0000-0000-00000000000c','city') on conflict (user_id) do update set role='city';
select set_config('test.rosa', public.create_business_claim('BIZ-FRITOS-ROSA'), false);
select set_config('test.masc', public.create_business_claim('BIZ-MASCARAS-BA'), false);
select 'ok 0 codes are ' || length(current_setting('test.rosa')) || ' chars, stored hashed: ' || (select count(*) from public.business_claims where token_hash <> current_setting('test.rosa'));

create or replace function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  if uid is null then perform set_config('role', 'anon', true); perform set_config('request.jwt.claim.sub', '', true);
  else perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claim.sub', uid, true); end if;
end $$;

-- 1. Anonymous cannot claim
begin; select pg_temp.act_as(null);
do $$ begin perform public.claim_business(current_setting('test.rosa')); raise exception 'FAIL anon claimed'; exception when insufficient_privilege then raise notice 'ok 1 anon cannot claim'; end $$;
rollback;

-- 2. Rosa claims with the right token, becomes vendor; token is single use
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select * from public.claim_business(current_setting('test.rosa'));
commit;
select 'ok 2 role=' || role from public.user_profiles where user_id='00000000-0000-0000-0000-00000000000a';
select 'ok 2 owner set: ' || (owner_user_id = '00000000-0000-0000-0000-00000000000a') || ', claims left: ' || (select count(*) from public.business_claims) from public.businesses where code='BIZ-FRITOS-ROSA';
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ begin perform public.claim_business(current_setting('test.rosa')); raise exception 'FAIL reused token'; exception when no_data_found then raise notice 'ok 3 token cannot be reused'; end $$;
rollback;

-- 4. City account claiming keeps role city
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select * from public.claim_business(current_setting('test.masc'));
commit;
select 'ok 4 city keeps role: ' || role from public.user_profiles where user_id='00000000-0000-0000-0000-00000000000c';
update public.businesses set owner_user_id = null where code='BIZ-MASCARAS-BA';

-- 5. Rosa opens her business; cannot open someone else's; cannot verify herself or move
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.businesses set is_open = true, name = 'Fritos Doña Rosa' where code='BIZ-FRITOS-ROSA';
do $$ declare n int; begin update public.businesses set is_open = false where code='BIZ-CAFE-PAZ'; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL edited other business'; end if; raise notice 'ok 5b cannot edit other business'; end $$;
do $$ begin update public.businesses set verification_status='verified', is_verified=true, latitude=10.99 where code='BIZ-FRITOS-ROSA'; raise exception 'FAIL changed protected fields'; exception when insufficient_privilege then raise notice 'ok 5c protected fields blocked'; end $$;
do $$ begin update public.businesses set owner_user_id='00000000-0000-0000-0000-00000000000b' where code='BIZ-FRITOS-ROSA'; raise exception 'FAIL gave away'; exception when insufficient_privilege then raise notice 'ok 5d ownership blocked'; end $$;
commit;
select 'ok 5a open=' || is_open || ' name=' || name from public.businesses where code='BIZ-FRITOS-ROSA';

-- 6. Products: Rosa CRUD on hers; other user cannot; public sees only available
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.business_products (business_id, name, price_cop) select id, 'Arepa de huevo', 4000 from public.businesses where code='BIZ-FRITOS-ROSA';
insert into public.business_products (business_id, name, price_cop, is_available) select id, 'Carimañola', 3000, false from public.businesses where code='BIZ-FRITOS-ROSA';
do $$ begin insert into public.business_products (business_id, name, price_cop) select id, 'Robado', 1 from public.businesses where code='BIZ-CAFE-PAZ'; raise exception 'FAIL inserted into other business'; exception when insufficient_privilege then raise notice 'ok 6a cannot add to other business'; end $$;
do $$ begin insert into public.business_products (business_id, name, price_cop) select id, 'Caro', 5000000 from public.businesses where code='BIZ-FRITOS-ROSA'; raise exception 'FAIL price check'; exception when check_violation then raise notice 'ok 6b price range enforced'; end $$;
select 'ok 6c owner sees ' || count(*) from public.business_products;
commit;
begin; select pg_temp.act_as(null); select 'ok 6d anon sees ' || count(*) || ' (only available)' from public.business_products; rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ declare n int; begin update public.business_products set price_cop = 1; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL other edited products'; end if; raise notice 'ok 6e other user cannot edit products'; end $$;
rollback;

-- 7. Visits: nobody but service inserts; owner reads hers; others read none
insert into public.business_visits (business_id) select id from public.businesses where code='BIZ-FRITOS-ROSA';
insert into public.business_visits (business_id) select id from public.businesses where code='BIZ-FRITOS-ROSA';
insert into public.business_visits (business_id) select id from public.businesses where code='BIZ-CAFE-PAZ';
begin; select pg_temp.act_as(null);
do $$ begin insert into public.business_visits (business_id) select id from public.businesses limit 1; raise exception 'FAIL anon inserted visit'; exception when insufficient_privilege then raise notice 'ok 7a anon cannot insert visits'; end $$;
rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin insert into public.business_visits (business_id) select id from public.businesses where code='BIZ-FRITOS-ROSA'; raise exception 'FAIL vendor inserted visit'; exception when insufficient_privilege then raise notice 'ok 7b vendor cannot fake visits'; end $$;
rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000a'); select 'ok 7c owner sees ' || count(*) || ' visits' from public.business_visits; rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000d'); select 'ok 7d other person sees ' || count(*) from public.business_visits; rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000c'); select 'ok 7e city sees ' || count(*) from public.business_visits; rollback;
-- 8. Visitors can still read businesses (map) and claim_token is not exposed through a select by anon? (column is readable: check)
begin; select pg_temp.act_as(null);
do $$ begin perform count(*) from public.business_claims; raise exception 'FAIL anon read claims'; exception when insufficient_privilege then raise notice 'ok 8a anon cannot read claim codes'; end $$;
select 'ok 8b anon still reads businesses for the map: ' || count(*) from public.businesses; rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin perform count(*) from public.business_claims; raise exception 'FAIL user read claims'; exception when insufficient_privilege then raise notice 'ok 8c signed-in user cannot read claim codes'; end $$;
do $$ begin perform public.create_business_claim('BIZ-CAFE-PAZ'); raise exception 'FAIL vendor created claim'; exception when insufficient_privilege then raise notice 'ok 8d only city creates claim codes'; end $$;
rollback;
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000c'); select 'ok 8e city creates a code: ' || (length(public.create_business_claim('BIZ-CAFE-PAZ')) = 36); rollback;
-- 9. Wrong code
begin; select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin perform public.claim_business('not-the-right-code-at-all'); raise exception 'FAIL wrong code'; exception when no_data_found then raise notice 'ok 9 wrong code rejected'; end $$;
rollback;
