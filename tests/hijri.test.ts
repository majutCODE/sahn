import { describe, expect, it } from 'vitest';
import {
  fromHijri,
  hijriMonthLength,
  keyDates,
  recommendedFast,
  toHijri
} from '@/lib/hijri';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('hijri conversion', () => {
  it('converts known Gregorian dates', () => {
    // Umm al-Qura: 1 Muharram 1447 falls on 26 June 2025.
    expect(toHijri(new Date(2025, 5, 26))).toEqual({
      year: 1447,
      month: 1,
      day: 1
    });
    expect(toHijri(new Date(2000, 0, 1)).year).toBe(1420);
  });

  it('round-trips every day of a full Hijri year', () => {
    for (let month = 1; month <= 12; month += 1) {
      const length = hijriMonthLength(1447, month);
      expect([29, 30]).toContain(length);
      for (let day = 1; day <= length; day += 1) {
        const target = { year: 1447, month, day };
        expect(toHijri(fromHijri(target)), `${month}/${day}`).toEqual(target);
      }
    }
  });

  it('round-trips across a wide span of years', () => {
    for (let year = 1400; year <= 1500; year += 7) {
      for (const month of [1, 9, 12]) {
        const target = { year, month, day: 1 };
        expect(toHijri(fromHijri(target)), `${year}/${month}`).toEqual(target);
      }
    }
  });

  it('gives a Hijri year of 354 or 355 days', () => {
    const start = fromHijri({ year: 1447, month: 1, day: 1 });
    const next = fromHijri({ year: 1448, month: 1, day: 1 });
    const days = Math.round((next.getTime() - start.getTime()) / 86_400_000);
    expect([354, 355]).toContain(days);
  });
});

describe('key dates', () => {
  it('places Eid al-Fitr the day after the last of Ramadan', () => {
    const dates = keyDates(1447);
    const ramadan = dates.find((d) => d.id === 'ramadan')!;
    const eid = dates.find((d) => d.id === 'eid-al-fitr')!;
    const ramadanLength = hijriMonthLength(1447, 9);

    const expected = new Date(
      ramadan.gregorian.getTime() + ramadanLength * 86_400_000
    );
    expect(iso(eid.gregorian)).toBe(iso(expected));
  });

  it('puts Eid al-Adha the day after Arafah', () => {
    const dates = keyDates(1447);
    const arafah = dates.find((d) => d.id === 'arafah')!;
    const adha = dates.find((d) => d.id === 'eid-al-adha')!;
    expect(adha.gregorian.getTime() - arafah.gregorian.getTime()).toBe(86_400_000);
  });

  it('returns all six marks', () => {
    expect(keyDates(1447).map((d) => d.id)).toEqual([
      'muharram',
      'ashura',
      'ramadan',
      'eid-al-fitr',
      'arafah',
      'eid-al-adha'
    ]);
  });
});

describe('recommended fasts', () => {
  it('marks the white days regardless of weekday', () => {
    for (const day of [13, 14, 15]) {
      const date = fromHijri({ year: 1447, month: 2, day });
      expect(recommendedFast(date)).toBe('ayyam-al-beed');
    }
  });

  it('marks Mondays and Thursdays', () => {
    // 5 January 2026 is a Monday; 8 January 2026 is a Thursday.
    const monday = new Date(2026, 0, 5);
    const thursday = new Date(2026, 0, 8);
    expect(monday.getDay()).toBe(1);
    expect(thursday.getDay()).toBe(4);
    expect(recommendedFast(monday)).toBe('monday');
    expect(recommendedFast(thursday)).toBe('thursday');
  });

  it('leaves other days unmarked', () => {
    const date = fromHijri({ year: 1447, month: 2, day: 20 });
    const weekday = date.getUTCDay();
    if (weekday !== 1 && weekday !== 4) {
      expect(recommendedFast(date)).toBe(null);
    }
  });
});
