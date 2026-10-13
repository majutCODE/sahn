/**
 * What Google actually thinks of the site.
 *
 *   node --env-file=.env.local scripts/search-console.mjs
 *   node --env-file=.env.local scripts/search-console.mjs --days=90 --limit=40
 *   node --env-file=.env.local scripts/search-console.mjs --json
 *
 * Traffic is a lagging indicator and currently reads zero, which cannot tell
 * "ranking slowly, on track" apart from "not ranking at all". Impressions and
 * average position can, and they live here.
 *
 * --json writes the whole pull to .search-console.json so it can be read in
 * full rather than through whatever this prints.
 */

import { writeFileSync } from 'node:fs';
import { accessToken, loadKey, PROPERTY, query } from './lib/search-console.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const DAYS = flag('days', 28);
const LIMIT = flag('limit', 25);
const WRITE_JSON = args.includes('--json');

const day = (offset) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
// Search Console lags about two days; asking for yesterday returns a window
// that is still filling and makes every trend look like a cliff at the end.
const range = { startDate: day(DAYS + 2), endDate: day(2) };

// A stack trace is the wrong answer to "you have not set the key yet". Every
// failure here is a setup problem with a readable cause, so print the cause.
let token;
try {
  token = await accessToken(loadKey());
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

const pull = (dimensions, rowLimit = LIMIT) =>
  query(token, PROPERTY, { ...range, dimensions, rowLimit });

const [totals] = await query(token, PROPERTY, { ...range });
const [queries, pages, countries, dates] = await Promise.all([
  pull(['query']),
  pull(['page']),
  pull(['country'], 10),
  pull(['date'], 400)
]);

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const line = (label, row) =>
  `  ${String(row.clicks).padStart(5)} ${String(row.impressions).padStart(7)} ` +
  `${pct(row.ctr).padStart(6)} ${row.position.toFixed(1).padStart(5)}  ${label}`;

console.log(`\n${PROPERTY}   ${range.startDate} to ${range.endDate}\n`);
if (!totals) {
  console.log('  No data at all for this window.');
  process.exit(0);
}
console.log(
  `  ${totals.clicks} clicks, ${totals.impressions} impressions, ` +
    `${pct(totals.ctr)} CTR, average position ${totals.position.toFixed(1)}`
);

const section = (title, rows, label) => {
  if (rows.length === 0) return;
  console.log(`\n${title}\n  clicks  impr    ctr   pos`);
  for (const row of rows) console.log(line(label(row), row));
};

section('Queries', queries, (r) => r.keys[0]);
section('Pages', pages, (r) => r.keys[0].replace('https://sahn-ai.com', ''));
section('Countries', countries, (r) => r.keys[0].toUpperCase());

// A trend rather than 90 rows: the question is whether impressions are moving.
if (dates.length > 1) {
  const half = Math.floor(dates.length / 2);
  const sum = (rows, f) => rows.reduce((a, r) => a + f(r), 0);
  const first = dates.slice(0, half);
  const last = dates.slice(half);
  console.log(
    `\nTrend\n  first half  ${sum(first, (r) => r.impressions)} impressions` +
      `\n  second half ${sum(last, (r) => r.impressions)} impressions`
  );
}

if (WRITE_JSON) {
  writeFileSync(
    '.search-console.json',
    JSON.stringify({ range, totals, queries, pages, countries, dates }, null, 2)
  );
  console.log('\nWrote .search-console.json');
}
