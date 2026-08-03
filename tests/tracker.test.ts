import { describe, expect, it } from 'vitest';
import { PRAYERS } from '@/lib/prayer';
import {
  currentStreak,
  dayKey,
  addDays,
  isDayComplete,
  outstanding,
  recentDays,
  toDayMap,
  totalOutstanding,
  type PrayerLog,
  type PrayerStatus
} from '@/lib/tracker';

const TODAY = new Date(2026, 7, 2); // 2 August 2026, local

function fullDay(date: Date, status: PrayerStatus = 'prayed'): PrayerLog[] {
  return PRAYERS.map((prayer) => ({ date: dayKey(date), prayer, status }));
}

describe('day completion', () => {
  it('needs all five prayers', () => {
    const partial = toDayMap(fullDay(TODAY).slice(0, 4));
    expect(isDayComplete(partial.get(dayKey(TODAY)))).toBe(false);
    expect(isDayComplete(toDayMap(fullDay(TODAY)).get(dayKey(TODAY)))).toBe(true);
  });

  it('counts a made-up prayer, but not a missed one', () => {
    const qada = toDayMap(fullDay(TODAY, 'qada'));
    expect(isDayComplete(qada.get(dayKey(TODAY)))).toBe(true);

    const withMissed = fullDay(TODAY);
    withMissed[2] = { ...withMissed[2], status: 'missed' };
    expect(isDayComplete(toDayMap(withMissed).get(dayKey(TODAY)))).toBe(false);
  });

  it('treats an unlogged day as incomplete', () => {
    expect(isDayComplete(undefined)).toBe(false);
    expect(isDayComplete({})).toBe(false);
  });
});

describe('streak', () => {
  it('counts consecutive complete days', () => {
    const logs = [0, 1, 2, 3].flatMap((back) => fullDay(addDays(TODAY, -back)));
    expect(currentStreak(logs, TODAY)).toBe(4);
  });

  it('does not punish a today that is still in progress', () => {
    // Yesterday and the day before are complete; today has only Fajr so far.
    const logs = [
      ...fullDay(addDays(TODAY, -1)),
      ...fullDay(addDays(TODAY, -2)),
      { date: dayKey(TODAY), prayer: 'fajr' as const, status: 'prayed' as const }
    ];
    expect(currentStreak(logs, TODAY)).toBe(2);
  });

  it('breaks on a missed prayer', () => {
    const broken = fullDay(addDays(TODAY, -1));
    broken[0] = { ...broken[0], status: 'missed' };
    const logs = [...fullDay(TODAY), ...broken, ...fullDay(addDays(TODAY, -2))];
    expect(currentStreak(logs, TODAY)).toBe(1);
  });

  it('is zero with nothing logged', () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it('does not count days after today', () => {
    const logs = [...fullDay(addDays(TODAY, 1)), ...fullDay(TODAY)];
    expect(currentStreak(logs, TODAY)).toBe(1);
  });
});

describe('qada ledger', () => {
  it('floors outstanding at zero when over-made-up', () => {
    expect(outstanding({ prayer: 'fajr', owed: 3, madeUp: 5 })).toBe(0);
    expect(outstanding({ prayer: 'fajr', owed: 10, madeUp: 4 })).toBe(6);
  });

  it('totals across prayers', () => {
    expect(
      totalOutstanding([
        { prayer: 'fajr', owed: 10, madeUp: 4 },
        { prayer: 'asr', owed: 2, madeUp: 2 },
        { prayer: 'isha', owed: 7, madeUp: 0 }
      ])
    ).toBe(13);
  });
});

describe('day keys', () => {
  it('uses local calendar dates, not UTC instants', () => {
    // 23:30 local on the 2nd is still the 2nd, whatever UTC says.
    expect(dayKey(new Date(2026, 7, 2, 23, 30))).toBe('2026-08-02');
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('returns recent days oldest first, ending today', () => {
    const days = recentDays(7, TODAY);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(dayKey(TODAY));
    expect(days[0]).toBe(dayKey(addDays(TODAY, -6)));
  });
});
