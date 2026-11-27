-- Límites de uso compartidos (#126): con más de una réplica en Dokploy, cada proceso
-- contaba por su lado. Ahora el contador vive aquí y lo comparten todas.
-- Ventana fija por llave; la llave ya viene como hash (nunca la IP en claro).

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);

alter table public.rate_limits enable row level security;
-- Sin políticas: solo el servidor (llave de servicio) la usa.

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
  started timestamptz;
begin
  if p_limit <= 0 or p_window_seconds <= 0 or char_length(coalesce(p_key, '')) not between 1 and 200 then
    raise exception 'Parámetros inválidos.' using errcode = 'P0001';
  end if;

  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case
      when r.window_start <= now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end,
    hits = case
      when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1
      else r.hits + 1
    end
  returning r.hits, r.window_start into current_hits, started;

  -- Limpieza ocasional de llaves viejas, sin un cron aparte.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  allowed := current_hits <= p_limit;
  remaining := greatest(p_limit - current_hits, 0);
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(p_window_seconds - extract(epoch from (now() - started)))::integer)
  end;
  return next;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
