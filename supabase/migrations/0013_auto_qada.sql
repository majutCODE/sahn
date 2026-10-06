-- The tracker and the qada ledger did not talk to each other.
--
-- Marking Fajr missed recorded a missed Fajr, and the ledger that exists to
-- count missed prayers knew nothing about it. Every user did the same work
-- twice, and the two numbers drifted apart the moment anyone forgot.
--
-- The ledger now moves by the DELTA between the old status and the new one,
-- which is what makes corrections work. Mark a prayer missed and one is owed.
-- Change your mind and mark it prayed, and the one is taken back. Mark it qada
-- because you made it up later, and it is both owed and paid, which nets to
-- nothing outstanding while still recording that it happened.

/**
 * What a status implies for the ledger.
 *
 *   missed -> owed, not yet made up
 *   qada   -> owed, and made up: it was missed at its time and paid later
 *   prayed -> nothing owed
 *   jamaah -> nothing owed
 */
create or replace function qada_effect(p_status prayer_status)
returns table (owed integer, made_up integer)
language sql
immutable
as $$
  select
    case when p_status in ('missed', 'qada') then 1 else 0 end,
    case when p_status = 'qada' then 1 else 0 end;
$$;

/**
 * Moves the ledger for one logged prayer changing status.
 *
 * SECURITY INVOKER, so row-level security applies and a caller can only ever
 * move their own ledger. The whole adjustment is one statement: a read, a
 * decision and a write from the application would race with itself the moment
 * someone taps two prayers quickly.
 *
 * `p_old_status` is null when the prayer had no log before.
 */
create or replace function apply_qada_delta(
  p_prayer     prayer_name,
  p_old_status prayer_status,
  p_new_status prayer_status
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old record;
  v_new record;
  v_owed_delta integer;
  v_made_delta integer;
begin
  select * into v_old from qada_effect(p_old_status);
  select * into v_new from qada_effect(p_new_status);

  v_owed_delta := coalesce(v_new.owed, 0) - coalesce(v_old.owed, 0);
  v_made_delta := coalesce(v_new.made_up, 0) - coalesce(v_old.made_up, 0);

  if v_owed_delta = 0 and v_made_delta = 0 then
    return;
  end if;

  insert into qada_ledger (user_id, prayer_type, count_owed, count_made_up)
  values (
    (select auth.uid()),
    p_prayer,
    greatest(v_owed_delta, 0),
    greatest(v_made_delta, 0)
  )
  on conflict (user_id, prayer_type) do update
    set
      -- Never below zero. A ledger that reads "-2 owed" because someone
      -- corrected more entries than they created is worse than one that
      -- simply stops at nothing outstanding.
      count_owed    = greatest(qada_ledger.count_owed + v_owed_delta, 0),
      count_made_up = greatest(qada_ledger.count_made_up + v_made_delta, 0),
      updated_at    = now();
end;
$$;

revoke all on function apply_qada_delta(prayer_name, prayer_status, prayer_status) from public;
grant execute on function apply_qada_delta(prayer_name, prayer_status, prayer_status) to authenticated;
