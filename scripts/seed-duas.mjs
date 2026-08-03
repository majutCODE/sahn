/**
 * Seeds dua_entries from content/duas.json.
 * Run: node --env-file=.env.local scripts/seed-duas.mjs
 *
 * Upserts on `slug`, so it is safe to re-run after editing the content file.
 * Uses the service role key: dua_entries is public-read but write-locked, and
 * ingestion is the one job that legitimately bypasses RLS.
 */

import { readFile } from 'node:fs/promises';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const { duas } = JSON.parse(
  await readFile(new URL('../content/duas.json', import.meta.url), 'utf8')
);

const rows = duas.map((d) => ({
  slug: d.slug,
  title: d.title,
  arabic: d.arabic,
  transliteration: d.transliteration ?? null,
  source_ref: d.source_ref,
  quran_ref: d.quran_ref ?? null,
  tags: d.tags ?? [],
  // Qur'anic du'as are translated live through the Quran.com licence; the
  // prophetic ones carry our own English rendering in the content file. A
  // du'a is only "pending" if neither route can produce a translation.
  translation_pending: !d.quran_ref && !d.translations?.en,
  translations: d.translations ?? {}
}));

const response = await fetch(`${url}/rest/v1/dua_entries?on_conflict=slug`, {
  method: 'POST',
  headers: {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    prefer: 'resolution=merge-duplicates,return=representation'
  },
  body: JSON.stringify(rows)
});

if (!response.ok) {
  console.error(`Seed failed: ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const saved = await response.json();
const quranic = saved.filter((r) => r.quran_ref).length;

console.log(`Seeded ${saved.length} du'as.`);
console.log(`  ${quranic} Qur'anic — translated live via the Quran.com licence`);
const own = saved.filter((r) => r.translations?.en).length;
console.log(`  ${saved.length - quranic} prophetic — ${own} with our own translation`);
const pending = saved.filter((r) => r.translation_pending).length;
if (pending) console.log(`  ${pending} still untranslated`);
console.log(
  `  ${new Set(saved.flatMap((r) => r.tags)).size} distinct situation tags`
);
