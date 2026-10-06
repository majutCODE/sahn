/**
 * Builds content/surahs.json: the 114 surahs with their ayah counts and names.
 * Run: node --env-file=.env.local scripts/build-surahs.mjs
 *
 * Ayah counts are derived from quran_chunks rather than typed from a reference
 * site, so the numbers agree with the corpus the rest of the product searches.
 * Names come from the Quran.com API once and are committed: the hifz tracker
 * must work offline, and a memorisation screen that cannot render a surah name
 * without a round trip is not a memorisation screen.
 */

import { writeFileSync } from 'node:fs';

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { QURAN_OAUTH_URL, QURAN_API_BASE, QURAN_CLIENT_ID, QURAN_CLIENT_SECRET } =
  process.env;

if (!SUPABASE || !KEY || !QURAN_CLIENT_ID) {
  console.error('Missing Supabase or Quran API credentials.');
  process.exit(1);
}

const headers = { apikey: KEY, authorization: `Bearer ${KEY}` };

// Highest ayah number per surah, straight from the corpus.
const counts = new Map();
for (let offset = 0; offset < 7000; offset += 1000) {
  const res = await fetch(
    `${SUPABASE}/rest/v1/quran_chunks?select=surah,ayah&limit=1000&offset=${offset}`,
    { headers }
  );
  for (const row of await res.json()) {
    counts.set(row.surah, Math.max(counts.get(row.surah) ?? 0, row.ayah));
  }
}

const token = await (
  await fetch(QURAN_OAUTH_URL, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${QURAN_CLIENT_ID}:${QURAN_CLIENT_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=content'
  })
).json();

const chapters = await (
  await fetch(`${QURAN_API_BASE}/content/api/v4/chapters?language=en`, {
    headers: { 'x-auth-token': token.access_token, 'x-client-id': QURAN_CLIENT_ID }
  })
).json();

const surahs = chapters.chapters.map((c) => ({
  surah: c.id,
  ayat: counts.get(c.id) ?? c.verses_count,
  name: c.name_simple,
  arabic: c.name_arabic,
  translated: c.translated_name?.name ?? c.name_simple,
  // Juz are not one-to-one with surahs; this is the juz the surah starts in,
  // which is what a reader uses to find their place.
  revelation: c.revelation_place
}));

const mismatches = surahs.filter((s) => s.ayat !== chapters.chapters.find((c) => c.id === s.surah).verses_count);

writeFileSync(
  new URL('../content/surahs.json', import.meta.url),
  `${JSON.stringify({ total: surahs.reduce((n, s) => n + s.ayat, 0), surahs })}\n`
);

console.log(`Wrote content/surahs.json`);
console.log(`  ${surahs.length} surahs, ${surahs.reduce((n, s) => n + s.ayat, 0)} ayat`);
if (mismatches.length) {
  console.log(`  ${mismatches.length} where the corpus and the API disagree on length:`);
  for (const m of mismatches) console.log(`    ${m.surah} ${m.name}`);
}
