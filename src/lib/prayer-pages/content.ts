import { computeDay, type PrayerSettings } from '../prayer';
import { APPROXIMATED, methodFor, type City } from './cities';

/**
 * Decides which paragraphs a city's page carries, and with what figures.
 *
 * The point is that different cities get *different sections*, not the same
 * section with different numbers in it. Five thousand pages built from one
 * template read as one page however carefully the values vary, and that is
 * what gets a programmatic cluster classified as doorway pages.
 *
 * So the composition is driven by the data: a city above the Arctic circle
 * gets a paragraph nobody else gets, a city on the equator gets a different
 * one, a city whose national authority is not the method we compute gets a
 * third. Most cities get two or three of the eight, and which two or three
 * depends on where they are.
 */

export type SectionKey =
  | 'highLatitude'
  | 'extremeLatitude'
  | 'equatorial'
  | 'southernSeasons'
  | 'methodApproximated'
  | 'ummAlQuraIsha'
  | 'hanafiAsr'
  | 'moderateVariation';

export type Section = {
  key: SectionKey;
  /** ICU values for the message of the same name. */
  values: Record<string, string | number>;
};

export type YearShape = {
  /** Minutes from midnight, in the city's own timezone. */
  earliestFajr: number;
  latestFajr: number;
  earliestIsha: number;
  latestIsha: number;
  shortestDayHours: number;
  longestDayHours: number;
};

const SETTINGS = (city: City): PrayerSettings => ({
  method: methodFor(city.country),
  asr: 'standard',
  highLatitudeRule: 'auto'
});

/** Minutes from local midnight, read in the city's own zone. */
function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * How the year actually behaves at this location.
 *
 * Sampled fortnightly rather than daily: 26 samples capture both solstices and
 * the equinoxes to within a few minutes, and this runs for every city on every
 * revalidate.
 */
export function yearShape(city: City, year = new Date().getUTCFullYear()): YearShape {
  const settings = SETTINGS(city);
  let earliestFajr = Infinity;
  let latestFajr = -Infinity;
  let earliestIsha = Infinity;
  let latestIsha = -Infinity;
  let shortest = Infinity;
  let longest = -Infinity;

  for (let day = 1; day <= 365; day += 14) {
    const date = new Date(Date.UTC(year, 0, day, 12));
    const times = computeDay(city, date, settings);
    if (Number.isNaN(times.fajr.getTime())) continue;

    const fajr = localMinutes(times.fajr, city.timeZone);
    const isha = localMinutes(times.isha, city.timeZone);
    earliestFajr = Math.min(earliestFajr, fajr);
    latestFajr = Math.max(latestFajr, fajr);
    earliestIsha = Math.min(earliestIsha, isha);
    latestIsha = Math.max(latestIsha, isha);

    const dayLength =
      (times.maghrib.getTime() - times.sunrise.getTime()) / 3_600_000;
    if (Number.isFinite(dayLength)) {
      shortest = Math.min(shortest, dayLength);
      longest = Math.max(longest, dayLength);
    }
  }

  return {
    earliestFajr,
    latestFajr,
    earliestIsha,
    latestIsha,
    shortestDayHours: shortest,
    longestDayHours: longest
  };
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    Math.round(minutes % 60)
  ).padStart(2, '0')}`;

/**
 * The sections this city gets.
 *
 * Ordered by how much they explain: the thing most likely to surprise someone
 * looking at these particular times comes first.
 */
export function sectionsFor(city: City, shape: YearShape): Section[] {
  const sections: Section[] = [];
  const lat = Math.abs(city.latitude);
  const fajrSpread = shape.latestFajr - shape.earliestFajr;
  const dayRange = shape.longestDayHours - shape.shortestDayHours;

  if (lat >= 60) {
    sections.push({
      key: 'extremeLatitude',
      values: {
        latitude: lat.toFixed(1),
        longest: shape.longestDayHours.toFixed(1),
        shortest: shape.shortestDayHours.toFixed(1)
      }
    });
  } else if (lat >= 48) {
    sections.push({
      key: 'highLatitude',
      values: {
        latitude: lat.toFixed(1),
        earliestFajr: clock(shape.earliestFajr),
        latestIsha: clock(shape.latestIsha),
        spreadHours: (fajrSpread / 60).toFixed(1)
      }
    });
  } else if (lat <= 10) {
    sections.push({
      key: 'equatorial',
      values: {
        latitude: lat.toFixed(1),
        rangeMinutes: Math.round(dayRange * 60)
      }
    });
  } else {
    sections.push({
      key: 'moderateVariation',
      values: {
        earliestFajr: clock(shape.earliestFajr),
        latestFajr: clock(shape.latestFajr),
        spreadMinutes: Math.round(fajrSpread)
      }
    });
  }

  // Below the equator the seasonal shape is inverted relative to how almost
  // every article on this subject describes it, which is worth saying.
  if (city.latitude < -10) {
    sections.push({ key: 'southernSeasons', values: {} });
  }

  if (APPROXIMATED.has(city.country)) {
    sections.push({ key: 'methodApproximated', values: {} });
  }

  if (methodFor(city.country) === 'umm_al_qura') {
    sections.push({ key: 'ummAlQuraIsha', values: {} });
  }

  // Where the Hanafi position is the local majority, the Asr on this page will
  // look early to a good number of readers. Better to explain than to be
  // quietly wrong for them.
  if (['PK', 'IN', 'BD', 'AF', 'TR'].includes(city.country)) {
    sections.push({ key: 'hanafiAsr', values: {} });
  }

  return sections;
}

/**
 * Questions answered from this city's computed data.
 *
 * Which questions appear depends on the same signals as the sections, so the
 * FAQ block is not identical furniture on every page either.
 */
export type FaqKey =
  | 'tomorrowFajr'
  | 'todayIsha'
  | 'qiblaDirection'
  | 'methodUsed'
  | 'summerFajr'
  | 'winterIsha';

export function faqFor(city: City): FaqKey[] {
  const keys: FaqKey[] = ['tomorrowFajr', 'todayIsha', 'qiblaDirection'];
  keys.push(Math.abs(city.latitude) >= 48 ? 'summerFajr' : 'methodUsed');
  if (Math.abs(city.latitude) >= 55) keys.push('winterIsha');
  return keys;
}
