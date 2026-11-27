-- pgcrypto lives in the "extensions" schema on Supabase. create_business_claim()
-- and claim_business() (20261127000004_vendor_portal) call digest() and
-- gen_random_bytes() with search_path = public, so they fail on the hosted
-- project. Applied to production on 27 Nov 2026 together with the pending
-- migrations.
alter function public.create_business_claim(text) set search_path = public, extensions;
alter function public.claim_business(text) set search_path = public, extensions;
