/**
 * Builds content/cities.json from the GeoNames cities15000 dump.
 * Run: node scripts/build-cities.mjs [--min-population=250000]
 *
 * Source: https://download.geonames.org/export/dump/cities15000.zip
 * Licence: CC BY 4.0. Attribution is rendered on every page that uses this
 * data; see the footer of the prayer city pages.
 *
 * Committed rather than fetched at build time. A page of prayer times must not
 * depend on a third party being reachable, and a build that can fail because
 * someone else's CDN is down is a build that will.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const argMin = process.argv.find((a) => a.startsWith('--min-population='));
const MIN_POPULATION = argMin ? Number(argMin.split('=')[1]) : 250_000;

const SOURCE = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1];
if (!SOURCE) {
  console.error('Pass --source=/path/to/cities15000.txt');
  process.exit(1);
}

/** GeoNames column indices, 0-based. */
const GEONAME_ID = 0;
const NAME = 1;
const ASCII = 2;
const ALT_NAMES = 3;
const LAT = 4;
const LNG = 5;
const COUNTRY = 8;
const POPULATION = 14;
const TIMEZONE = 17;

/**
 * Letters that exist in Persian and Urdu but not in Arabic. A name containing
 * one is mis-tagged: GeoNames' Arabic rows are good, but not perfectly sorted.
 *
 * Includes Persian yeh (U+06CC) and keheh (U+06A9), which look almost
 * identical to their Arabic counterparts and are the reason Andijon arrived as
 * أندیجان. Eyeballing a sample is the only way these surface.
 */
const NOT_ARABIC = /[\u067E\u0686\u0698\u06AF\u06A4\u0679\u0688\u0691\u06BA\u06BE\u06D2\u06CC\u06A9\u06C1\u06D0]/;

/**
 * Kebab-case ASCII. The slug is the URL and the URL is permanent, so it is
 * built from the ASCII name rather than the local one: a slug that changes
 * when a display name is corrected would break every link to the page.
 */
function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Arabic names, from alternateNamesV2 filtered to lang=ar.
 *
 * Not from the alternatenames column of cities15000: that is a truncated,
 * unsorted grab-bag, and reading it produced "لأندأن" for London. The tagged
 * rows give لندن.
 *
 * `isPreferredName` is preferred but not required. Only 4,790 places on earth
 * carry the flag, and requiring it would delete the Arabic page for London,
 * Birmingham, Sarajevo, Detroit and Bradford, whose unflagged tagged names are
 * all correct. Historic and colloquial forms are excluded outright.
 *
 * Where nothing survives, the city gets no Arabic page at all and `ar` is
 * dropped from its hreflang set. A mangled endonym is worse than an absent
 * page, and hreflang pointing at a 404 makes Google distrust the annotations
 * across the whole domain.
 */
function loadArabicNames(path) {
  const best = new Map();
  for (const row of readFileSync(path, 'utf8').split('\n')) {
    if (!row) continue;
    const f = row.split('\t');
    const [, geonameId, lang, name, preferred, , colloquial, historic] = f;
    if (lang !== 'ar' || !name) continue;
    if (colloquial === '1' || historic === '1') continue;
    if (NOT_ARABIC.test(name)) continue;
    if (name.includes('(') || name.length < 2) continue;

    const current = best.get(geonameId);
    const isPreferred = preferred === '1';

    if (!current) {
      best.set(geonameId, { name, preferred: isPreferred });
      continue;
    }
    if (isPreferred && !current.preferred) {
      best.set(geonameId, { name, preferred: isPreferred });
      continue;
    }
    if (isPreferred !== current.preferred) continue;

    // Shortest wins, EXCEPT where the shorter candidate is just the longer one
    // with the definite article stripped. Rabat is الرباط, not رباط, and a
    // pure length tiebreak picks the wrong one every time.
    const stripped = (v) => v.replace(/^ال/, '');
    const sameWord = stripped(name) === stripped(current.name);
    if (sameWord) {
      if (name.startsWith('ال') && !current.name.startsWith('ال')) {
        best.set(geonameId, { name, preferred: isPreferred });
      }
      continue;
    }
    if (name.length < current.name.length) {
      best.set(geonameId, { name, preferred: isPreferred });
    }
  }
  return best;
}

const AR_SOURCE = process.argv.find((a) => a.startsWith('--arabic='))?.split('=')[1];
const arabicNames = AR_SOURCE ? loadArabicNames(AR_SOURCE) : new Map();

const rows = readFileSync(SOURCE, 'utf8').split('\n');
const byCountry = new Map();
let skipped = 0;

for (const row of rows) {
  if (!row.trim()) continue;
  const f = row.split('\t');
  const population = Number(f[POPULATION]);
  if (!Number.isFinite(population) || population < MIN_POPULATION) continue;

  const country = f[COUNTRY];
  const slug = slugify(f[ASCII] || f[NAME]);
  const timeZone = f[TIMEZONE];
  if (!country || !slug || !timeZone) {
    skipped += 1;
    continue;
  }

  const city = {
    slug,
    name: f[NAME],
    ar: arabicNames.get(f[GEONAME_ID])?.name ?? null,
    country,
    latitude: Number(f[LAT]),
    longitude: Number(f[LNG]),
    timeZone,
    population
  };

  const list = byCountry.get(country) ?? [];
  // Two cities in one country can share a slug (several countries have more
  // than one Springfield). The larger keeps the URL; the smaller is dropped
  // rather than given a numbered slug nobody would ever link to.
  const clash = list.find((c) => c.slug === slug);
  if (clash) {
    if (population > clash.population) Object.assign(clash, city);
    continue;
  }
  list.push(city);
  byCountry.set(country, list);
}

/**
 * Merge the curated set.
 *
 * Population is the wrong axis for this product. Blackburn, Dewsbury, Mostar
 * and Novi Pazar have real daily prayer-time demand and would never clear a
 * size threshold, while plenty of anonymous 250k cities will never rank for
 * anything. These are pulled from the same dump regardless of population, so
 * their coordinates and timezones are as real as everything else.
 *
 * `priority` is what actually ships: generateStaticParams and the sitemap read
 * this flag, not the whole set.
 */
const priority = JSON.parse(
  readFileSync(new URL('../content/priority-cities.json', import.meta.url), 'utf8')
);

const wanted = new Map(
  priority.cities.map((c) => [`${c.country}:${c.slug}`, c])
);
const found = new Set();

// Second pass over the dump, this time ignoring the population floor.
for (const row of rows) {
  if (!row.trim()) continue;
  const f = row.split('\t');
  const country = f[COUNTRY];
  const slug = slugify(f[ASCII] || f[NAME]);
  const key = `${country}:${slug}`;
  const want = wanted.get(key);
  if (!want || found.has(key)) continue;

  const list = byCountry.get(country) ?? [];
  const existing = list.find((c) => c.slug === slug);
  if (existing) {
    existing.priority = true;
    if (want.ar && !existing.ar) existing.ar = want.ar;
    found.add(key);
    continue;
  }

  list.push({
    slug,
    name: f[NAME],
    ar: arabicNames.get(f[GEONAME_ID])?.name ?? want.ar ?? null,
    country,
    latitude: Number(f[LAT]),
    longitude: Number(f[LNG]),
    timeZone: f[TIMEZONE],
    population: Number(f[POPULATION]) || 0,
    priority: true
  });
  byCountry.set(country, list);
  found.add(key);
}

const missing = [...wanted.keys()].filter((k) => !found.has(k));

for (const list of byCountry.values()) {
  list.sort((a, b) => b.population - a.population);
}

const countries = [...byCountry.keys()].sort();
const total = [...byCountry.values()].reduce((n, l) => n + l.length, 0);

writeFileSync(
  new URL('../content/cities.json', import.meta.url),
  `${JSON.stringify(
    {
      source: 'GeoNames cities15000 (CC BY 4.0)',
      minPopulation: MIN_POPULATION,
      generated: new Date().toISOString().slice(0, 10),
      countries: Object.fromEntries([...byCountry].sort())
    },
    null,
    0
  )}\n`
);

const withArabic = [...byCountry.values()].flat().filter((c) => c.ar).length;

console.log(`Wrote content/cities.json`);
console.log(`  ${total} cities over ${MIN_POPULATION.toLocaleString()} population`);
console.log(`  ${countries.length} countries`);
console.log(`  ${withArabic} with an Arabic name (${Math.round((withArabic / total) * 100)}%)`);
console.log(`  ${total - withArabic} will have no Arabic page, and no ar hreflang`);
const shipping = [...byCountry.values()].flat().filter((c) => c.priority);
console.log(`  ${shipping.length} marked priority - this is what actually ships first`);
console.log(`  ${shipping.filter((c) => c.ar).length} of those have Arabic`);
if (missing.length) {
  console.log(`\n  NOT FOUND in the dump, fix the slug or drop them:`);
  for (const key of missing) console.log(`    ${key}`);
}
if (skipped) console.log(`  ${skipped} skipped for missing country, slug or timezone`);
