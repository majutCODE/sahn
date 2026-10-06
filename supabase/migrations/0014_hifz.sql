-- Memorisation tracking with spaced review.
--
-- Nothing in the product served the person actively memorising, which is a
-- large share of the people this is for and the group most likely to open an
-- app every single day.
--
-- A portion is a contiguous run of ayat inside one surah, because that is how
-- people actually memorise: "al-Baqarah 1 to 20", not "al-Baqarah". Someone
-- can hold several portions of the same surah at different strengths.

create table hifz_portions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  surah       smallint not null check (surah between 1 and 114),
  ayah_from   smallint not null check (ayah_from >= 1),
  ayah_to     smallint not null check (ayah_to >= 1),

  -- 0 is newly added and unreviewed. Each confident review moves it up one and
  -- pushes the next review further out; a shaky one drops it back to 1 rather
  -- than to 0, because forgetting a portion you once knew is not the same as
  -- meeting it for the first time.
  strength    smallint not null default 0 check (strength between 0 and 5),

  last_reviewed_at timestamptz,
  next_review_at   timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  constraint hifz_range_ordered check (ayah_to >= ayah_from),
  -- One row per range per surah. Re-adding the same range updates it rather
  -- than creating a duplicate that would be reviewed twice.
  unique (user_id, surah, ayah_from, ayah_to)
);

create index hifz_due_idx on hifz_portions (user_id, next_review_at);

alter table hifz_portions enable row level security;

create policy hifz_portions on hifz_portions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

/**
 * The interval for each strength, in days.
 *
 * Roughly the Leitner progression. The first gap is deliberately short: a
 * portion reviewed once is not learned, and the common failure in memorisation
 * apps is letting new material drift out of sight before it has settled.
 */
create or replace function hifz_interval_days(p_strength smallint)
returns integer
language sql
immutable
as $$
  select case p_strength
    when 0 then 1
    when 1 then 2
    when 2 then 5
    when 3 then 12
    when 4 then 30
    else 75
  end;
$$;

/**
 * Records a review.
 *
 * `p_confident` false drops the portion back to strength 1 and brings it
 * forward, which is the whole point of tracking strength rather than a simple
 * "done" flag.
 */
create or replace function hifz_review(p_id uuid, p_confident boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_strength smallint;
begin
  select strength into v_strength from hifz_portions where id = p_id;
  if not found then return; end if;

  v_strength := case
    when p_confident then least(v_strength + 1, 5)
    else 1
  end;

  update hifz_portions
  set strength = v_strength,
      last_reviewed_at = now(),
      next_review_at = now() + make_interval(days => hifz_interval_days(v_strength))
  where id = p_id;
end;
$$;

revoke all on function hifz_review(uuid, boolean) from public;
grant execute on function hifz_review(uuid, boolean) to authenticated;
