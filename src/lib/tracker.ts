import { PRAYERS, type Prayer } from './prayer';

/**
 * Salah tracker logic. Pure, so the rules that decide what counts are testable
 * and stated in one place rather than scattered through a component.
 */

export const PRAYER_STATUSES = ['prayed', 'jamaah', 'qada', 'missed'] as const;
export type PrayerStatus = (typeof PRAYER_STATUSES)[number];

export type PrayerLog = {
  /** Calendar date, YYYY-MM-DD in the user's own local reckoning. */
  date: string;
  prayer: Prayer;
  status: PrayerStatus;
};

/** A day's five slots, keyed by prayer. Absent means not yet logged. */
export type DayRecord = Partial<Record<Prayer, PrayerStatus>>;

export function toDayMap(logs: PrayerLog[]): Map<string, DayRecord> {
  const map = new Map<string, DayRecord>();
  for (const log of logs) {
    const day = map.get(log.date) ?? {};
    day[log.prayer] = log.status;
    map.set(log.date, day);
  }
  return map;
}

/** Local calendar date as YYYY-MM-DD. Never derived from a UTC instant. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * A day is complete when all five prayers are accounted for and none is
 * recorded as missed. Making up a prayer late still counts: the point of the
 * qada status is that the prayer was eventually prayed.
 */
export function isDayComplete(day: DayRecord | undefined): boolean {
  if (!day) return false;
  return PRAYERS.every((p) => {
    const status = day[p];
    return status !== undefined && status !== 'missed';
  });
}

/**
 * Consecutive complete days ending today.
 *
 * Today is not counted against the user while it is still in progress: an
 * incomplete today leaves the streak standing at yesterday's figure rather
 * than resetting it at Fajr every morning. That is a deliberate choice —
 * the tracker is a tool, not a judge.
 */
export function currentStreak(
  logs: PrayerLog[],
  today: Date = new Date()
): number {
  const days = toDayMap(logs);
  let streak = 0;
  let cursor = today;

  if (!isDayComplete(days.get(dayKey(cursor)))) {
    cursor = addDays(cursor, -1);
  }

  // A year is a generous ceiling and keeps this from walking forever on
  // malformed data.
  for (let i = 0; i < 366; i += 1) {
    if (!isDayComplete(days.get(dayKey(cursor)))) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export type QadaEntry = { prayer: Prayer; owed: number; madeUp: number };

/** Outstanding count, floored at zero so an over-entry cannot go negative. */
export function outstanding(entry: QadaEntry): number {
  return Math.max(0, entry.owed - entry.madeUp);
}

export function totalOutstanding(entries: QadaEntry[]): number {
  return entries.reduce((sum, e) => sum + outstanding(e), 0);
}

/** The last `count` days, oldest first, for the week and month grids. */
export function recentDays(count: number, today: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    dayKey(addDays(today, -(count - 1 - i)))
  );
}
