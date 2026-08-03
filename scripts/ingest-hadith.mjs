/**
 * Ingests hadith into hadith_chunks with embeddings.
 * Run: node --env-file=.env.local scripts/ingest-hadith.mjs [--only=bukhari,muslim]
 *
 * Source: fawazahmed0/hadith-api (Unlicense — public domain). Arabic and
 * English are separate editions aligned by hadith number, so both are fetched
 * and joined before embedding.
 *
 * Resumable: upserts on (collection, hadith_number), and skips anything already
 * embedded so a re-run costs nothing for work already done.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_KEY = process.env.VOYAGE_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !VOYAGE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VOYAGE_API_KEY');
  process.exit(1);
}

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

/** Ordered by how much fiqh actually leans on them. */
const COLLECTIONS = [
  ['bukhari', 'Sahih al-Bukhari'],
  ['muslim', 'Sahih Muslim'],
  ['abudawud', 'Sunan Abu Dawud'],
  ['tirmidhi', "Jami' at-Tirmidhi"],
  ['nasai', "Sunan an-Nasa'i"],
  ['ibnmajah', 'Sunan Ibn Majah'],
  ['malik', 'Muwatta Malik'],
  ['nawawi', 'Forty Hadith of an-Nawawi'],
  ['qudsi', 'Forty Hadith Qudsi']
];

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

// Voyage throttles accounts with no payment method to 3 RPM / 10k TPM.
const PACED = process.env.PACED !== '0';
const TOKEN_BUDGET = PACED ? 7500 : 100_000;
const MIN_GAP_MS = PACED ? 21_000 : 0;
const MAX_BATCH = 128;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const estimateTokens = (t) => Math.ceil(t.length / 3);

let lastRequestAt = 0;
async function pace() {
  const wait = lastRequestAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function fetchResilient(url, init, attempts = 5) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      await sleep(3000 * 2 ** i);
    }
  }
  throw lastError;
}

async function embed(texts) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await pace();
    const res = await fetchResilient('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${VOYAGE_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        input: texts,
        model: 'voyage-3.5',
        input_type: 'document'
      })
    });
    if (res.ok) {
      const json = await res.json();
      const ordered = new Array(texts.length);
      for (const item of json.data) ordered[item.index] = item.embedding;
      return ordered;
    }
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`Voyage ${res.status}: ${await res.text()}`);
    }
    await sleep(PACED ? 30_000 : 2000 * 2 ** attempt);
  }
  throw new Error('Voyage failed after retries');
}

async function upsert(rows) {
  const res = await fetchResilient(
    `${SUPABASE_URL}/rest/v1/hadith_chunks?on_conflict=collection,hadith_number`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(rows)
    }
  );
  if (!res.ok) throw new Error(`Upsert ${res.status}: ${await res.text()}`);
}

/** Hadith numbers already embedded, so a resumed run skips them. */
async function alreadyDone(collection) {
  const done = new Set();
  for (let offset = 0; ; offset += 1000) {
    const res = await fetchResilient(
      `${SUPABASE_URL}/rest/v1/hadith_chunks?collection=eq.${collection}&embedding=not.is.null&select=hadith_number&limit=1000&offset=${offset}`,
      { headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const rows = await res.json();
    for (const r of rows) done.add(String(r.hadith_number));
    if (rows.length < 1000) break;
  }
  return done;
}

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

for (const [slug, name] of COLLECTIONS) {
  if (only && !only.includes(slug)) continue;

  const [en, ar] = await Promise.all(
    [`${CDN}/eng-${slug}.min.json`, `${CDN}/ara-${slug}.min.json`].map((u) =>
      fetchResilient(u).then((r) => r.json())
    )
  );

  const arabicByNumber = new Map(
    ar.hadiths.map((h) => [String(h.hadithnumber), h.text])
  );
  const done = await alreadyDone(slug);

  const pending = en.hadiths.filter(
    (h) => !done.has(String(h.hadithnumber)) && clean(h.text).length > 0
  );

  console.log(
    `\n${name}: ${en.hadiths.length} total, ${done.size} already done, ${pending.length} to do`
  );
  if (pending.length === 0) continue;

  // Batch by estimated tokens — hadith length varies enormously, and a fixed
  // row count blows the 10k TPM ceiling on the long narrations.
  const batches = [];
  let current = [];
  let tokens = 0;
  for (const h of pending) {
    const size = estimateTokens(clean(h.text)) + 40;
    if (current.length && (tokens + size > TOKEN_BUDGET || current.length >= MAX_BATCH)) {
      batches.push(current);
      current = [];
      tokens = 0;
    }
    current.push(h);
    tokens += size;
  }
  if (current.length) batches.push(current);

  let done_ = 0;
  for (const batch of batches) {
    const prepared = batch.map((h) => {
      const text = clean(h.text);
      const reference = `${name} ${h.hadithnumber}`;
      return {
        collection: slug,
        collection_name: name,
        hadith_number: String(h.hadithnumber),
        book_number: h.reference?.book ?? null,
        arabic: clean(arabicByNumber.get(String(h.hadithnumber)) ?? ''),
        text,
        grades: h.grades ?? [],
        reference,
        language: 'en',
        // Embedded with its reference so the vector carries provenance, the
        // same shape the Qur'an rows use.
        _embed: `${reference}. ${text}`
      };
    });

    const vectors = await embed(prepared.map((p) => p._embed));
    await upsert(
      prepared.map(({ _embed, ...row }, i) => ({
        ...row,
        embedding: `[${vectors[i].join(',')}]`
      }))
    );

    done_ += prepared.length;
    process.stdout.write(`\r  ${done_}/${pending.length}   `);
  }
  console.log(`\n  ${name} done.`);
}

console.log('\nAll requested collections ingested.');
