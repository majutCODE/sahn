-- Server-side error capture.
--
-- Three real faults shipped to production and stayed there because nothing
-- reported them: the auth callback sending every sign-in link to a 404, the
-- rate limiter failing open and silently not limiting, and retrieval telling
-- people there were no sources when it had simply been throttled. Each was
-- found by a person clicking something, which is not a monitoring strategy.
--
-- Deliberately not a third-party service. Sahn already holds worship records
-- and chat history, and an error reporter is exactly the kind of thing that
-- hoovers up request context and ships it somewhere else. This stores what the
-- code chooses to store, in the same database, under the same RLS.

create table error_events (
  -- Stable across occurrences of the same fault, so a broken deploy is one
  -- row with a count rather than ten thousand rows.
  fingerprint text        primary key,
  scope       text        not null,
  message     text        not null,
  detail      text,
  count       integer     not null default 1,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  -- When the last alert went out, so a persistent fault does not send mail
  -- every few seconds.
  notified_at timestamptz
);

create index error_events_last_seen_idx on error_events (last_seen desc);

-- Default-deny. Written by the server's service-role client only; there is no
-- reason for a browser to read or write this.
alter table error_events enable row level security;

/**
 * Records one occurrence and reports whether an alert is due.
 *
 * Both halves happen in one statement because the alternative is a read, a
 * decision, and a write with a race in the middle — under a burst that sends
 * one email per instance rather than one email.
 *
 * `p_cooldown_seconds` is how long a fingerprint stays quiet after alerting.
 */
create or replace function record_error(
  p_fingerprint      text,
  p_scope            text,
  p_message          text,
  p_detail           text,
  p_cooldown_seconds integer default 3600
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_should_notify boolean;
begin
  insert into error_events (fingerprint, scope, message, detail, notified_at)
  values (p_fingerprint, p_scope, p_message, p_detail, now())
  on conflict (fingerprint) do update
    set count       = error_events.count + 1,
        last_seen   = now(),
        message     = excluded.message,
        detail      = excluded.detail,
        notified_at = case
          when error_events.notified_at is null
            or error_events.notified_at < now() - make_interval(secs => p_cooldown_seconds)
          then now()
          else error_events.notified_at
        end
  returning (notified_at = now()) into v_should_notify;

  return coalesce(v_should_notify, true);
end;
$$;

revoke all on function record_error(text, text, text, text, integer) from public;
revoke all on function record_error(text, text, text, text, integer) from anon, authenticated;
grant execute on function record_error(text, text, text, text, integer) to service_role;

/** Errors nothing has seen for 30 days are history, not signal. */
create or replace function prune_error_events() returns void
language sql
security definer
set search_path = public
as $$
  delete from error_events where last_seen < now() - interval '30 days';
$$;

revoke all on function prune_error_events() from public;
revoke all on function prune_error_events() from anon, authenticated;
grant execute on function prune_error_events() to service_role;

do $$
begin
  perform cron.unschedule('prune-error-events')
  where exists (select 1 from cron.job where jobname = 'prune-error-events');

  perform cron.schedule(
    'prune-error-events',
    '51 4 * * *',
    $job$select public.prune_error_events()$job$
  );
exception
  when others then
    raise notice 'pg_cron unavailable (%); prune must be run manually', sqlerrm;
end;
$$;
