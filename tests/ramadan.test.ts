import { describe, expect, it } from 'vitest';
import { toHijri } from '../src/lib/hijri';
import {
  currentDay,
  gregorianForDay,
  outstanding,
  ramadanMonth,
  relevantRamadanYear,
  summarise,
  type RamadanDay
} from '../src/lib/ramadan';

const day = (n: number, over: Partial<RamadanDay> = {}): RamadanDay => ({
  day: n,
  fasted: null,
  taraweeh: null,
  juz_read: null,
  reflection: null,
  ...over
});

describe('ramadan month', () => {
  it('starts on 1 Ramadan and ends on the last day', () => {
    const month = ramadanMonth(1447);
    expect(toHijri(month.start)).toMatchObject({ month: 9, day: 1 });
    expect(toHijri(month.end)).toMatchObject({ month: 9, day: month.length });
  });

  it('is 29 or 30 days', () => {
    for (const year of [1446, 1447, 1448, 1449, 1450]) {
      expect([29, 30]).toContain(ramadanMonth(year).length);
    }
  });

  it('maps each day to a consecutive Gregorian date', () => {
    const month = ramadanMonth(1447);
    for (let d = 1; d <= month.length; d++) {
      expect(toHijri(gregorianForDay(month, d)).day).toBe(d);
    }
  });
});

describe('relevantRamadanYear', () => {
  it('stays on this year during Ramadan', () => {
    const month = ramadanMonth(1447);
    expect(relevantRamadanYear(gregorianForDay(month, 5))).toBe(1447);
  });

  it('moves to next year once Ramadan has passed', () => {
    const month = ramadanMonth(1447);
    const after = new Date(month.end);
    after.setUTCDate(after.getUTCDate() + 40);
    expect(relevantRamadanYear(after)).toBe(1448);
  });

  it('still points at this year before Ramadan begins', () => {
    const month = ramadanMonth(1447);
    const before = new Date(month.start);
    before.setUTCDate(before.getUTCDate() - 40);
    expect(relevantRamadanYear(before)).toBe(1447);
  });
});

describe('currentDay', () => {
  it('is null outside the month', () => {
    const month = ramadanMonth(1447);
    const before = new Date(month.start);
    before.setUTCDate(before.getUTCDate() - 1);
    expect(currentDay(month, before)).toBeNull();

    const after = new Date(month.end);
    after.setUTCDate(after.getUTCDate() + 1);
    expect(currentDay(month, after)).toBeNull();
  });

  it('counts from one on the first day', () => {
    const month = ramadanMonth(1447);
    expect(currentDay(month, month.start)).toBe(1);
    expect(currentDay(month, month.end)).toBe(month.length);
  });

  it('does not shift with the time of day', () => {
    const month = ramadanMonth(1447);
    const morning = new Date(month.start);
    morning.setUTCHours(1);
    const night = new Date(month.start);
    night.setUTCHours(23);
    expect(currentDay(month, morning)).toBe(currentDay(month, night));
  });
});

describe('summarise', () => {
  const month = ramadanMonth(1447);

  it('counts only explicit yeses', () => {
    const days = [day(1, { fasted: true }), day(2, { fasted: false }), day(3)];
    expect(summarise(days, month, month.start).fasted).toBe(1);
  });

  it('does not double-count a juz read twice', () => {
    const days = [day(1, { juz_read: 3 }), day(2, { juz_read: 3 }), day(3, { juz_read: 4 })];
    expect(summarise(days, month, month.start).juzRead).toBe(2);
  });

  it('reports the whole month as elapsed once it is over', () => {
    const after = new Date(month.end);
    after.setUTCDate(after.getUTCDate() + 5);
    expect(summarise([], month, after).elapsed).toBe(month.length);
  });

  it('reports nothing elapsed before it starts', () => {
    const before = new Date(month.start);
    before.setUTCDate(before.getUTCDate() - 5);
    expect(summarise([], month, before).elapsed).toBe(0);
  });
});

describe('outstanding', () => {
  it('subtracts what has been made up', () => {
    expect(outstanding({ hijri_year: 1447, count: 6, made_up: 2, fidya_paid: false })).toBe(4);
  });

  it('never goes negative', () => {
    expect(outstanding({ hijri_year: 1447, count: 2, made_up: 5, fidya_paid: false })).toBe(0);
  });
});
