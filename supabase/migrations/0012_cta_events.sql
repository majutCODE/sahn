-- Did a search visitor actually use the assistant?
--
-- This is the only number that says whether the prayer-time pages are worth
-- expanding. Search Console will report impressions and clicks; it cannot
-- report that someone read Fajr and then asked a question, and 300 visitors
-- who leave immediately is a different business from 300 of whom 40 start a
-- conversation.
--
-- Counted here rather than in a third-party analytics product for two
-- reasons: Vercel's custom events need a paid plan, and adding a processor
-- would mean amending the privacy notice for something the database can do.
-- Nothing identifying is recorded - no user, no IP, no question text. A row
-- says "a conversation began from this page, in this language".

create table cta_events (
  id         bigserial primary key,
  -- The page the visitor came from, e.g. /en/prayer/gb/blackburn.
  source     text        not null,
  locale     text        not null check (locale in ('en', 'ar')),
  created_at timestamptz not null default now()
);

create index cta_events_source_idx on cta_events (source, created_at desc);

-- Default-deny. Written by the server's service-role client only.
alter table cta_events enable row level security;

/** One conversation begun from a content page. */
create or replace function record_cta(p_source text, p_locale text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into cta_events (source, locale)
  values (left(p_source, 200), p_locale);
$$;

revoke all on function record_cta(text, text) from public;
revoke all on function record_cta(text, text) from anon, authenticated;
grant execute on function record_cta(text, text) to service_role;

/**
 * Conversion by page, which is the report worth reading.
 *
 * Sessions per source over a window, so the question "which kinds of city
 * convert" can be answered from data rather than from the thesis that
 * produced the curated list.
 */
create or replace function cta_summary(p_days integer default 30)
returns table (source text, locale text, sessions bigint)
language sql
security definer
set search_path = public
as $$
  select source, locale, count(*) as sessions
  from cta_events
  where created_at > now() - make_interval(days => p_days)
  group by source, locale
  order by sessions desc;
$$;

revoke all on function cta_summary(integer) from public;
revoke all on function cta_summary(integer) from anon, authenticated;
grant execute on function cta_summary(integer) to service_role;
