/**
 * Hijri conversion, computed locally against the Umm al-Qura calendar that
 * ICU already ships. No library and no API: the same non-negotiable as prayer
 * times — a date must be knowable offline.
 *
 * Every conversion is anchored to 12:00 UTC. Anchoring to midnight would put
 * the instant within a day of a boundary in either direction, so a user in
 * Auckland or Honolulu would see yesterday's or tomorrow's Hijri date.
 */

export type HijriDate = { year: number; month: number; day: number };

/** Months are 1-indexed, matching HijriDate.month. */
export const HIJRI_MONTHS = [
  { en: 'Muharram', ar: 'مُحَرَّم' },
  { en: 'Safar', ar: 'صَفَر' },
  { en: "Rabi' al-Awwal", ar: 'ربيع الأول' },
  { en: "Rabi' al-Thani", ar: 'ربيع الآخر' },
  { en: 'Jumada al-Ula', ar: 'جمادى الأولى' },
  { en: 'Jumada al-Akhirah', ar: 'جمادى الآخرة' },
  { en: 'Rajab', ar: 'رَجَب' },
  { en: "Sha'ban", ar: 'شَعْبان' },
  { en: 'Ramadan', ar: 'رَمَضان' },
  { en: 'Shawwal', ar: 'شَوّال' },
  { en: "Dhu al-Qi'dah", ar: 'ذو القعدة' },
  { en: 'Dhu al-Hijjah', ar: 'ذو الحجة' }
] as const;

const DAY = 86_400_000;

const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC'
});

/** Midday UTC on the given civil date, the anchor every conversion uses. */
export function utcNoon(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  );
}

export function toHijri(date: Date): HijriDate {
  const parts = formatter.formatToParts(utcNoon(date));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value.replace(/\D/g, ''));

  return { year: get('year'), month: get('month'), day: get('day') };
}

function compare(a: HijriDate, b: HijriDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Approximate day number for a Hijri date, using mean lunar periods. */
function meanDayNumber(h: HijriDate): number {
  return (h.year - 1) * 354.367 + (h.month - 1) * 29.530589 + (h.day - 1);
}

/**
 * The Gregorian date on which a Hijri date falls.
 *
 * The seek is driven by the *day distance* between the current and target
 * dates, not by comparing their fields: a five-month gap is one small number
 * field-wise but 148 days on the calendar, and stepping by the field
 * difference would crawl. Mean lunar periods get within a day or two in two
 * iterations, then a short bounded scan lands exactly on ICU's own table
 * rather than trusting the arithmetic.
 */
export function fromHijri(target: HijriDate): Date {
  // 1 Muharram 1 AH ≈ 19 July 622 CE in the proleptic Gregorian calendar.
  let current = new Date(
    Date.UTC(622, 6, 19, 12) + Math.round(meanDayNumber(target)) * DAY
  );

  for (let i = 0; i < 8; i += 1) {
    const here = toHijri(current);
    if (compare(here, target) === 0) return current;
    const delta = Math.round(meanDayNumber(target) - meanDayNumber(here));
    if (delta === 0) break;
    current = new Date(current.getTime() + delta * DAY);
  }

  // Exact landing. The approximation is never more than a few days out, so a
  // ±40 day window is generous; scanning outwards finds the nearer match first.
  for (let offset = 0; offset <= 40; offset += 1) {
    for (const sign of offset === 0 ? [0] : [1, -1]) {
      const candidate = new Date(current.getTime() + sign * offset * DAY);
      if (compare(toHijri(candidate), target) === 0) return candidate;
    }
  }

  throw new Error(
    `No Gregorian date for Hijri ${target.year}-${target.month}-${target.day}`
  );
}

/** Number of days in a Hijri month, 29 or 30. */
export function hijriMonthLength(year: number, month: number): number {
  const next =
    month === 12
      ? { year: year + 1, month: 1, day: 1 }
      : { year, month: month + 1, day: 1 };
  const start = fromHijri({ year, month, day: 1 });
  return Math.round((fromHijri(next).getTime() - start.getTime()) / DAY);
}

export type FastKind = 'monday' | 'thursday' | 'ayyam-al-beed';

/**
 * Recommended voluntary fasts. Ayyam al-Beed takes precedence in the label
 * when it lands on a Monday or Thursday, being the more specific occasion.
 */
export function recommendedFast(date: Date, hijri = toHijri(date)): FastKind | null {
  if (hijri.day === 13 || hijri.day === 14 || hijri.day === 15) {
    return 'ayyam-al-beed';
  }
  const weekday = utcNoon(date).getUTCDay();
  if (weekday === 1) return 'monday';
  if (weekday === 4) return 'thursday';
  return null;
}

export type KeyDateId =
  | 'muharram'
  | 'ashura'
  | 'ramadan'
  | 'eid-al-fitr'
  | 'arafah'
  | 'eid-al-adha';

export type KeyDate = {
  id: KeyDateId;
  hijri: HijriDate;
  gregorian: Date;
};

/** The dates named in the spec, for one Hijri year. */
export function keyDates(hijriYear: number): KeyDate[] {
  const marks: Array<[KeyDateId, number, number]> = [
    ['muharram', 1, 1],
    ['ashura', 1, 10],
    ['ramadan', 9, 1],
    ['eid-al-fitr', 10, 1],
    ['arafah', 12, 9],
    ['eid-al-adha', 12, 10]
  ];

  return marks.map(([id, month, day]) => {
    const hijri = { year: hijriYear, month, day };
    return { id, hijri, gregorian: fromHijri(hijri) };
  });
}
