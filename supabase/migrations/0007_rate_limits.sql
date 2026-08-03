-- Rate limiting for the endpoints that spend money.
--
-- Postgres rather than in-process memory: serverless functions are replaced
-- and duplicated constantly, so a counter held in a module variable protects
-- nothing — each cold start hands out a fresh allowance.
--
-- Fixed windows rather than a sliding log. A sliding window is fairer at the
-- boundary, but it means storing every request; the worst case here is that a
-- caller gets a double allowance across one boundary, which does not matter
-- when the point is to stop a loop rather than to meter precisely.

create table rate_limit_counters (
  bucket_key   text        not null,
  window_kind  text        not null check (window_kind in ('minute', 'hour')),
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket_key, window_kind)
);

-- No policies: default-deny with RLS on means only the service role and the
-- SECURITY DEFINER function below can touch it. Callers must never be able to
-- read another caller's counter, let alone reset their own.
alter table rate_limit_counters enable row level security;

/**
 * Records one request against a key and reports whether it is allowed.
 *
 * Both windows are checked in a single call because two round trips per chat
 * message is latency the user feels. The minute window stops a burst; the
 * hour window stops a slow grind.
 *
 * Counts increment even when the request is refused: someone hammering a
 * refused endpoint should stay refused, not recover by being persistent.
 */
create or replace function consume_rate_limit(
  p_key          text,
  p_minute_limit integer,
  p_hour_limit   integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minute_count integer;
  v_hour_count   integer;
  v_hour_start   timestamptz;
  v_retry_after  integer := 0;
begin
  insert into rate_limit_counters (bucket_key, window_kind, window_start, count)
  values (p_key, 'minute', date_trunc('minute', now()), 1)
  on conflict (bucket_key, window_kind) do update
    set count = case
          when rate_limit_counters.window_start < date_trunc('minute', now())
          then 1
          else rate_limit_counters.count + 1
        end,
        window_start = greatest(
          rate_limit_counters.window_start,
          date_trunc('minute', now())
        )
  returning count into v_minute_count;

  insert into rate_limit_counters (bucket_key, window_kind, window_start, count)
  values (p_key, 'hour', date_trunc('hour', now()), 1)
  on conflict (bucket_key, window_kind) do update
    set count = case
          when rate_limit_counters.window_start < date_trunc('hour', now())
          then 1
          else rate_limit_counters.count + 1
        end,
        window_start = greatest(
          rate_limit_counters.window_start,
          date_trunc('hour', now())
        )
  returning count, window_start into v_hour_count, v_hour_start;

  if v_minute_count > p_minute_limit then
    v_retry_after := ceil(
      extract(epoch from (date_trunc('minute', now()) + interval '1 minute' - now()))
    );
  elsif v_hour_count > p_hour_limit then
    v_retry_after := ceil(
      extract(epoch from (v_hour_start + interval '1 hour' - now()))
    );
  end if;

  return jsonb_build_object(
    'allowed', v_retry_after = 0,
    'retry_after', v_retry_after,
    'hour_remaining', greatest(p_hour_limit - v_hour_count, 0)
  );
end;
$$;

revoke all on function consume_rate_limit(text, integer, integer) from public;
revoke all on function consume_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function consume_rate_limit(text, integer, integer) to service_role;

/**
 * Drops windows nobody has touched for a day. Without it the table grows one
 * row per key forever, and most keys are a single anonymous visitor who never
 * returns.
 */
create or replace function prune_rate_limit_counters() returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limit_counters where window_start < now() - interval '1 day';
$$;

revoke all on function prune_rate_limit_counters() from public;
revoke all on function prune_rate_limit_counters() from anon, authenticated;
grant execute on function prune_rate_limit_counters() to service_role;
