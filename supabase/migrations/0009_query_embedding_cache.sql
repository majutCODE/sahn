-- Cache for query embeddings.
--
-- Without a payment method Voyage allows 3 requests per minute across the
-- whole site, and every question costs one. But questions repeat: "can I
-- combine prayers when travelling", "what breaks a fast", "is zakat due on
-- gold" get asked constantly, and each asking embeds identical text to an
-- identical vector. Serving the second and every later asking from Postgres
-- removes it from the Voyage budget entirely.
--
-- This does not raise the ceiling. It means far fewer questions reach it.
--
-- Only a hash of the question is stored, never the question itself. The cache
-- needs equality, not the text, and a table of what people have asked Sahn is
-- not a table worth having.

create table query_embeddings (
  -- sha256 of the normalised question, hex encoded.
  query_hash  text        primary key,
  model       text        not null,
  embedding   vector(1024) not null,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

-- Pruning reads this; nothing else queries by date.
create index query_embeddings_last_used_idx on query_embeddings (last_used_at);

-- Default-deny. Reached only by the server's service-role client.
--
-- Deliberately NOT exposed as a SECURITY DEFINER function the way the rate
-- limiter is: a writable cache reachable by callers is a cache-poisoning
-- primitive. Anyone could store a garbage vector against the hash of a common
-- question and quietly corrupt retrieval for everyone who asks it.
alter table query_embeddings enable row level security;

/**
 * Drops entries nothing has asked for in sixty days.
 *
 * The long tail is enormous and mostly asked once. Keeping every one-off
 * question forever grows the table without improving the hit rate.
 */
create or replace function prune_query_embeddings() returns void
language sql
security definer
set search_path = public
as $$
  delete from query_embeddings where last_used_at < now() - interval '60 days';
$$;

revoke all on function prune_query_embeddings() from public;
revoke all on function prune_query_embeddings() from anon, authenticated;
grant execute on function prune_query_embeddings() to service_role;

do $$
begin
  perform cron.unschedule('prune-query-embeddings')
  where exists (select 1 from cron.job where jobname = 'prune-query-embeddings');

  perform cron.schedule(
    'prune-query-embeddings',
    '43 4 * * *',
    $job$select public.prune_query_embeddings()$job$
  );
exception
  when others then
    raise notice 'pg_cron unavailable (%); prune must be run manually', sqlerrm;
end;
$$;
