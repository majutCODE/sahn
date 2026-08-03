import { fromHijri, hijriMonthLength, toHijri, utcNoon } from './hijri';

/** Ramadan is the ninth month. */
const RAMADAN = 9;

export type RamadanDay = {
  day: number;
  /** null = not answered yet, which is different from "no". */
  fasted: boolean | null;
  taraweeh: boolean | null;
  juz_read: number | null;
  reflection: string | null;
};

export type MissedFasts = {
  hijri_year: number;
  count: number;
  made_up: number;
  fidya_paid: boolean;
};

export type RamadanMonth = {
  hijriYear: number;
  /** 29 or 30, from the Umm al-Qura calendar. */
  length: number;
  /** Gregorian date of 1 Ramadan. */
  start: Date;
  /** Gregorian date of the last day. */
  end: Date;
};

/**
 * The Ramadan the planner should open on.
 *
 * During Ramadan, this one. Outside it, the next one — a planner that opens on
 * a month that finished eight months ago is useless, and the whole point of
 * the screen before Ramadan is preparing for the one coming.
 */
export function relevantRamadanYear(now = new Date()): number {
  const hijri = toHijri(now);
  return hijri.month > RAMADAN ? hijri.year + 1 : hijri.year;
}

export function ramadanMonth(hijriYear: number): RamadanMonth {
  const length = hijriMonthLength(hijriYear, RAMADAN);
  const start = fromHijri({ year: hijriYear, month: RAMADAN, day: 1 });
  const end = fromHijri({ year: hijriYear, month: RAMADAN, day: length });
  return { hijriYear, length, start, end };
}

/** The Gregorian date of a given day of Ramadan. */
export function gregorianForDay(month: RamadanMonth, day: number): Date {
  const date = new Date(month.start);
  date.setUTCDate(date.getUTCDate() + (day - 1));
  return date;
}

/**
 * Which day of Ramadan it is today, or null outside the month.
 *
 * Compared at UTC noon like the rest of the Hijri code: comparing raw
 * timestamps makes the answer depend on the reader's clock time of day.
 */
export function currentDay(month: RamadanMonth, now = new Date()): number | null {
  const today = utcNoon(now).getTime();
  const start = utcNoon(month.start).getTime();
  const end = utcNoon(month.end).getTime();
  if (today < start || today > end) return null;
  return Math.round((today - start) / 86_400_000) + 1;
}

export type RamadanProgress = {
  /** Days answered "yes" to fasting. */
  fasted: number;
  taraweeh: number;
  /** Distinct juz recorded, so re-reading one does not inflate the count. */
  juzRead: number;
  /** Days that have passed, capped at the month length. */
  elapsed: number;
};

export function summarise(
  days: RamadanDay[],
  month: RamadanMonth,
  now = new Date()
): RamadanProgress {
  const today = currentDay(month, now);
  const past = utcNoon(now).getTime() > utcNoon(month.end).getTime();
  const elapsed = today ?? (past ? month.length : 0);

  return {
    fasted: days.filter((d) => d.fasted === true).length,
    taraweeh: days.filter((d) => d.taraweeh === true).length,
    juzRead: new Set(days.map((d) => d.juz_read).filter((j): j is number => !!j))
      .size,
    elapsed
  };
}

/**
 * Fasts still owed.
 *
 * Made-up days are subtracted, and the result never goes below zero: a ledger
 * that reads "-2 owed" because someone made up more than they recorded missing
 * is confusing rather than reassuring.
 */
export function outstanding(missed: MissedFasts): number {
  return Math.max(missed.count - missed.made_up, 0);
}
