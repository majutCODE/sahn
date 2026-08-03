-- 0007 created a prune function and left nothing to call it, so the counter
-- table would have grown one row per visitor forever. Most rows belong to an
-- anonymous caller who never returns.
--
-- pg_cron is wrapped rather than assumed: if the extension is unavailable the
-- migration still applies and the only consequence is a table that needs
-- pruning by hand, which is much better than a migration that cannot run.

do $$
begin
  create extension if not exists pg_cron with schema extensions;

  perform cron.unschedule('prune-rate-limits')
  where exists (select 1 from cron.job where jobname = 'prune-rate-limits');

  perform cron.schedule(
    'prune-rate-limits',
    '17 4 * * *',
    $job$select public.prune_rate_limit_counters()$job$
  );
exception
  when others then
    raise notice 'pg_cron unavailable (%); prune must be run manually', sqlerrm;
end;
$$;

-- Rows written while proving the limiter worked.
delete from rate_limit_counters where bucket_key like 'test:%' or bucket_key = 'sdk:test';
