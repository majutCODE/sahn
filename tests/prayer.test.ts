import { describe, expect, it } from 'vitest';
import {
  computeDay,
  currentPrayer,
  nextPrayer,
  qiblaBearing,
  type PrayerSettings
} from '@/lib/prayer';
import { findCity, searchCities } from '@/lib/cities';
import { defaultSettings, parseSettings } from '@/lib/settings';

const RALEIGH = { latitude: 35.775, longitude: -78.6336 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const TROMSO = { latitude: 69.6496, longitude: 18.956 };

const base: PrayerSettings = {
  method: 'mwl',
  asr: 'standard',
  highLatitudeRule: 'auto'
};

const at = (d: Date, zone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);

describe('prayer times', () => {
  it('matches known values for Raleigh, MWL, 12 July 2015', () => {
    const day = computeDay(RALEIGH, new Date(2015, 6, 12), base);
    const zone = 'America/New_York';

    expect(at(day.fajr, zone)).toBe('04:22');
    expect(at(day.sunrise, zone)).toBe('06:08');
    expect(at(day.dhuhr, zone)).toBe('13:21');
    expect(at(day.asr, zone)).toBe('17:09');
    expect(at(day.maghrib, zone)).toBe('20:32');
    expect(at(day.isha, zone)).toBe('22:11');
  });

  it('puts the Hanafi asr later than the standard asr', () => {
    const date = new Date(2015, 6, 12);
    const standard = computeDay(RALEIGH, date, base);
    const hanafi = computeDay(RALEIGH, date, { ...base, asr: 'hanafi' });

    expect(hanafi.asr.getTime()).toBeGreaterThan(standard.asr.getTime());
    expect(at(hanafi.asr, 'America/New_York')).toBe('18:22');
  });

  it('keeps the day in order', () => {
    const day = computeDay(LONDON, new Date(2026, 7, 2), base);
    const order = [day.fajr, day.sunrise, day.dhuhr, day.asr, day.maghrib, day.isha];
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i].getTime()).toBeGreaterThan(order[i - 1].getTime());
    }
  });

  it('resolves a finite Isha above the Arctic circle in midsummer', () => {
    // Tromsø in June never reaches the twilight angle; without a high-latitude
    // rule this is where the calculation returns an invalid date.
    const day = computeDay(TROMSO, new Date(2026, 5, 21), base);
    for (const t of Object.values(day)) {
      expect(Number.isNaN(t.getTime())).toBe(false);
    }
  });
});

describe('next prayer', () => {
  it('rolls over to tomorrow’s Fajr once Isha has passed', () => {
    const day = computeDay(LONDON, new Date(2026, 7, 2), base);
    const afterIsha = new Date(day.isha.getTime() + 60_000);
    const next = nextPrayer(LONDON, base, afterIsha);

    expect(next.prayer).toBe('fajr');
    expect(next.tomorrow).toBe(true);
    expect(next.time.getTime()).toBeGreaterThan(afterIsha.getTime());
  });

  it('names the upcoming prayer during the day', () => {
    const day = computeDay(LONDON, new Date(2026, 7, 2), base);
    const justBeforeAsr = new Date(day.asr.getTime() - 60_000);

    expect(nextPrayer(LONDON, base, justBeforeAsr).prayer).toBe('asr');
    expect(nextPrayer(LONDON, base, justBeforeAsr).tomorrow).toBe(false);
  });

  it('reports no current prayer before Fajr', () => {
    const day = computeDay(LONDON, new Date(2026, 7, 2), base);
    const beforeFajr = new Date(day.fajr.getTime() - 60_000);

    expect(currentPrayer(LONDON, base, beforeFajr)).toBe(null);
    expect(currentPrayer(LONDON, base, new Date(day.asr.getTime() + 60_000))).toBe(
      'asr'
    );
  });
});

describe('qibla', () => {
  // Published reference bearings, and the reason the compass can be trusted.
  it.each([
    ['Washington DC', { latitude: 38.9072, longitude: -77.0369 }, 56.56],
    ['London', LONDON, 118.99],
    ['Jakarta', { latitude: -6.2088, longitude: 106.8456 }, 295.15]
  ])('points from %s', (_name, point, expected) => {
    expect(qiblaBearing(point)).toBeCloseTo(expected, 1);
  });
});

describe('settings', () => {
  it('falls back to defaults on junk', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('nonsense')).toEqual(defaultSettings());
    expect(parseSettings({ method: 'not-a-method' }).method).toBe('mwl');
    expect(parseSettings({ asr: 42 }).asr).toBe('standard');
  });

  it('rejects out-of-range coordinates', () => {
    expect(
      parseSettings({ location: { latitude: 200, longitude: 0 } }).location
    ).toBe(null);
    expect(
      parseSettings({ location: { latitude: 'x', longitude: 0 } }).location
    ).toBe(null);
  });

  it('keeps a valid location', () => {
    const parsed = parseSettings({
      location: {
        latitude: 51.5,
        longitude: -0.12,
        cityId: 'london',
        timeZone: 'Europe/London',
        source: 'manual'
      }
    });
    expect(parsed.location?.cityId).toBe('london');
    expect(parsed.location?.source).toBe('manual');
  });

  it('stores a city id rather than a resolved name, so the label follows the locale', () => {
    const city = findCity('bradford');
    expect(city?.en).toBe('Bradford');
    expect(city?.ar).toBe('برادفورد');
    // Nothing in the persisted shape carries a display string.
    const parsed = parseSettings({
      location: { latitude: 1, longitude: 1, label: 'Bradford', source: 'manual' }
    });
    expect(parsed.location).not.toHaveProperty('label');
  });

  it('finds cities in both scripts, ignoring diacritics', () => {
    expect(searchCities('Male').map((c) => c.id)).toContain('male');
    expect(searchCities('برادفورد').map((c) => c.id)).toContain('bradford');
    expect(searchCities('مكة').map((c) => c.id)).toContain('mecca');
    expect(searchCities('zzzz')).toEqual([]);
  });
});
