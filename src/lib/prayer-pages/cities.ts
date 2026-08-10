import data from '../../../content/cities.json';
import type { CalcMethod } from '../prayer';

export type City = {
  slug: string;
  name: string;
  ar: string | null;
  country: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  population: number;
  priority?: boolean;
};

type Dataset = {
  source: string;
  minPopulation: number;
  generated: string;
  countries: Record<string, City[]>;
};

const dataset = data as Dataset;

export const ATTRIBUTION = dataset.source;

/**
 * Calculation method by country.
 *
 * Every one of these is the convention of a real authority, and the page says
 * which and why. That sentence is not decoration: it is the difference between
 * a computed figure and a figure a reader can decide whether to trust, and it
 * is also what stops five thousand pages reading as one page with the nouns
 * swapped.
 *
 * Where a country's own authority is not represented in adhan, the nearest
 * convention is used and the page says so rather than implying official
 * backing it does not have.
 */
const METHOD_BY_COUNTRY: Record<string, CalcMethod> = {
  // Umm al-Qura, the convention of the Two Holy Mosques.
  SA: 'umm_al_qura', AE: 'umm_al_qura', QA: 'umm_al_qura', KW: 'umm_al_qura',
  BH: 'umm_al_qura', OM: 'umm_al_qura', YE: 'umm_al_qura',

  // Egyptian General Authority of Survey.
  EG: 'egyptian', LY: 'egyptian', SD: 'egyptian', SY: 'egyptian',
  LB: 'egyptian', JO: 'egyptian', PS: 'egyptian', IQ: 'egyptian',

  // University of Islamic Sciences, Karachi.
  PK: 'karachi', IN: 'karachi', BD: 'karachi', AF: 'karachi', LK: 'karachi',

  // Islamic Society of North America.
  US: 'isna', CA: 'isna',

  // Muslim World League is the default; listed where it is a deliberate
  // choice rather than a fallback.
  GB: 'mwl', FR: 'mwl', DE: 'mwl', NL: 'mwl', BE: 'mwl', SE: 'mwl',
  NO: 'mwl', DK: 'mwl', ES: 'mwl', IT: 'mwl', BA: 'mwl', AL: 'mwl',
  MK: 'mwl', RS: 'mwl', ZA: 'mwl', KE: 'mwl', TZ: 'mwl', NG: 'mwl',
  SN: 'mwl', AU: 'mwl', MA: 'mwl', DZ: 'mwl', TN: 'mwl',

  // Diyanet İşleri Başkanlığı. adhan has no Diyanet preset; MWL is the
  // closest convention and the page says as much.
  TR: 'mwl',

  // MUIS and JAKIM both use an 20/18 convention close to MWL.
  SG: 'mwl', MY: 'mwl', ID: 'mwl', BN: 'mwl'
};

export function methodFor(country: string): CalcMethod {
  return METHOD_BY_COUNTRY[country] ?? 'mwl';
}

/** Countries whose own authority is approximated rather than implemented. */
export const APPROXIMATED = new Set(['TR', 'SG', 'MY', 'ID', 'BN']);

export function countries(): string[] {
  return Object.keys(dataset.countries).sort();
}

export function citiesIn(country: string): City[] {
  return dataset.countries[country] ?? [];
}

export function findCity(country: string, slug: string): City | undefined {
  return citiesIn(country).find((c) => c.slug === slug);
}

/** Only these are built and listed. See content/priority-cities.json. */
export function shippedCities(): City[] {
  return Object.values(dataset.countries)
    .flat()
    .filter((c) => c.priority);
}

export function shippedCountries(): string[] {
  return [...new Set(shippedCities().map((c) => c.country))].sort();
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: City, b: City): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * The nearest shipped cities, for internal linking.
 *
 * Drawn from the shipped set rather than the full dataset: linking to a page
 * that is not built would be a dead end for a reader and a 404 for a crawler.
 * Not restricted to the same country, because the nearest city to Detroit is
 * across a border and pretending otherwise would be strange.
 */
export function nearestCities(city: City, count = 6): City[] {
  return shippedCities()
    .filter((c) => !(c.country === city.country && c.slug === city.slug))
    .map((c) => ({ city: c, km: distanceKm(city, c) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
    .map((entry) => entry.city);
}

/** Display name in the reader's language, falling back to the Latin name. */
export function cityName(city: City, locale: string): string {
  return locale === 'ar' ? (city.ar ?? city.name) : city.name;
}

/**
 * Whether this city has an Arabic page at all.
 *
 * Drives both routing and hreflang. A city with no usable Arabic name gets no
 * `ar` page, and `ar` is dropped from its `alternates.languages` rather than
 * pointing at a 404, which would make Google distrust the annotations across
 * the whole domain.
 */
export function hasArabicPage(city: City): boolean {
  return Boolean(city.ar);
}
