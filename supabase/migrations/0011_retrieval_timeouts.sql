-- Retrieval was timing out for signed-out visitors.
--
-- Measured: a warm vector search returns in ~110ms, but the first one after
-- the instance has been idle takes ~2.25s while the HNSW index is read from
-- disk into shared buffers. Supabase gives the `anon` role a 3s statement
-- timeout, so a cold search sits just under the line and any concurrent load
-- tips it over. The error surfaced as
-- "Verse search failed: canceling statement due to statement timeout" on the
-- general chat route, and never once in testing, because testing kept the
-- index warm.
--
-- Two changes. The first stops it failing; the second stops it being slow,
-- which is the part a user actually notices.

-- 1. A timeout scoped to the search functions rather than to the role.
--
-- Raising the role's statement_timeout would apply to every query a caller
-- can make, which is exactly the protection that setting exists to give. This
-- applies only where a slow answer is legitimate.
alter function match_quran_chunks(vector, integer, double precision)
  set statement_timeout = '15s';
alter function match_hadith_chunks(vector, integer, double precision)
  set statement_timeout = '15s';
alter function match_dua_entries(vector, integer, double precision)
  set statement_timeout = '15s';

/**
 * 2. Keeps the vector indexes in shared buffers.
 *
 * A trivial search against each corpus. The result is discarded; the point is
 * that the index pages stay resident, so the first real question of the
 * morning is answered in 110ms rather than 2.25 seconds.
 *
 * The zero vector is deliberate: it is a valid input, matches nothing in
 * particular, and costs the same index traversal as a real query.
 */
create or replace function warm_vector_indexes() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zero vector(1024) := array_fill(0::real, array[1024])::vector;
begin
  perform 1 from quran_chunks
    order by embedding <=> v_zero limit 1;
  perform 1 from hadith_chunks
    order by embedding <=> v_zero limit 1;
exception
  when others then
    -- Warming is an optimisation. It must never be the reason a scheduled job
    -- reports failure.
    raise notice 'warm_vector_indexes: %', sqlerrm;
end;
$$;

revoke all on function warm_vector_indexes() from public;
revoke all on function warm_vector_indexes() from anon, authenticated;
grant execute on function warm_vector_indexes() to service_role;

do $$
begin
  perform cron.unschedule('warm-vector-indexes')
  where exists (select 1 from cron.job where jobname = 'warm-vector-indexes');

  -- Every five minutes. Frequent enough that the buffers never go cold,
  -- infrequent enough to be invisible on any billing dimension.
  perform cron.schedule(
    'warm-vector-indexes',
    '*/5 * * * *',
    $job$select public.warm_vector_indexes()$job$
  );
exception
  when others then
    raise notice 'pg_cron unavailable (%); indexes will cold-start', sqlerrm;
end;
$$;
