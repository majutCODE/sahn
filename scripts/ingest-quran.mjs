/**
 * Ingests all 6,236 ayat into quran_chunks with embeddings.
 * Run: node --env-file=.env.local scripts/ingest-quran.mjs
 *
 * Resumable: rows are upserted on (surah, ayah, translation_id), so re-running
 * after an interruption costs API calls for what is already there but never
 * duplicates. Pass --from=N to skip ahead to a surah.
 *
 * Uses the service role key — dua_entries and quran_chunks are public-read and
 * write-locked, and ingestion is the one job that legitimately bypasses RLS.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VOYAGE_KEY = process.env.VOYAGE_API_KEY;
const QURAN_OAUTH = process.env.QURAN_OAUTH_URL;
const QURAN_API = process.env.QURAN_API_BASE;
const QURAN_ID = process.env.QURAN_CLIENT_ID;
const QURAN_SECRET = process.env.QURAN_CLIENT_SECRET;

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  VOYAGE_API_KEY: VOYAGE_KEY,
  QURAN_CLIENT_ID: QURAN_ID
})) {
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
}

const TRANSLATION_ID = 20; // Saheeh International
const EMBED_MODEL = 'voyage-3.5';

/**
 * Voyage throttles accounts with no payment method to 3 requests and 10,000
 * tokens per minute. Both limits bind, so batches are sized by estimated tokens
 * rather than by row count, and requests are spaced to stay under 3 RPM.
 *
 * At this pace the full 6,236 ayat take roughly 25 minutes. Adding a payment
 * method lifts the limits (the free token allowance still applies) and the same
 * script finishes in about a minute — set PACED=0 to run flat out.
 */
const PACED = process.env.PACED !== '0';
const TOKEN_BUDGET = PACED ? 7500 : 100_000;
const MIN_REQUEST_GAP_MS = PACED ? 21_000 : 0;
const MAX_BATCH = 128;

/** Deliberately generous — overshooting the token estimate costs a 429. */
const estimateTokens = (text) => Math.ceil(text.length / 3);

let lastRequestAt = 0;
async function pace() {
  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

const fromArg = process.argv.find((a) => a.startsWith('--from='));
const startSurah = fromArg ? Number(fromArg.split('=')[1]) : 1;

// ── Quran.com ───────────────────────────────────────────────────────────────

let token = null;
let tokenExpires = 0;

async function quranToken() {
  if (token && tokenExpires > Date.now()) return token;
  const res = await fetchResilient(QURAN_OAUTH, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${QURAN_ID}:${QURAN_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=content'
  });
  if (!res.ok) throw new Error(`Quran token: ${res.status}`);
  const json = await res.json();
  token = json.access_token;
  tokenExpires = Date.now() + (json.expires_in - 60) * 1000;
  return token;
}

async function quranGet(path, params = {}) {
  const url = new URL(`/content/api/v4/${path}`, QURAN_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetchResilient(url, {
      headers: { 'x-auth-token': await quranToken(), 'x-client-id': QURAN_ID }
    });
    if (res.ok) return res.json();
    if (res.status === 401) {
      token = null;
      continue;
    }
    // 429 / 5xx — back off and retry rather than losing the run.
    await sleep(1000 * 2 ** attempt);
  }
  throw new Error(`Quran API failed: ${url.pathname}`);
}

// ── Voyage ──────────────────────────────────────────────────────────────────

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
        model: EMBED_MODEL,
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
    // A 429 here means the minute's budget is already spent — waiting less than
    // a full window just burns another request against the same limit.
    await sleep(PACED ? 30_000 : 2000 * 2 ** attempt);
  }
  throw new Error('Voyage failed after retries');
}

// ── Supabase ────────────────────────────────────────────────────────────────

async function upsert(rows) {
  const res = await fetchResilient(
    `${SUPABASE_URL}/rest/v1/quran_chunks?on_conflict=surah,ayah,translation_id`,
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch that survives a dropped connection. `fetch` throws rather than
 * returning a status on network failure, so status-only retry logic lets a
 * single blip kill a 30-minute run.
 */
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
const stripTags = (s) =>
  s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ── Run ─────────────────────────────────────────────────────────────────────

const { chapters } = await quranGet('chapters', { language: 'en' });
console.log(`${chapters.length} surahs; starting at ${startSurah}`);

let done = 0;
let embedded = 0;
const started = Date.now();

for (const chapter of chapters) {
  if (chapter.id < startSurah) {
    done += chapter.verses_count;
    continue;
  }

  const verses = [];
  let page = 1;
  for (;;) {
    const data = await quranGet(`verses/by_chapter/${chapter.id}`, {
      language: 'en',
      fields: 'text_uthmani',
      translations: TRANSLATION_ID,
      per_page: 50,
      page
    });
    verses.push(...data.verses);
    if (!data.pagination.next_page) break;
    page = data.pagination.next_page;
  }

  // Split the surah into batches that fit the token budget. A long ayah can be
  // several hundred tokens on its own, so a fixed row count overshoots badly on
  // surahs like al-Baqarah and undershoots on the short ones.
  const batches = [];
  let current = [];
  let currentTokens = 0;
  for (const verse of verses) {
    const size = estimateTokens(verse.translations?.[0]?.text ?? '') + 30;
    if (
      current.length > 0 &&
      (currentTokens + size > TOKEN_BUDGET || current.length >= MAX_BATCH)
    ) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(verse);
    currentTokens += size;
  }
  if (current.length) batches.push(current);

  for (const slice of batches) {
    const prepared = slice.map((v) => {
      const translation = stripTags(v.translations?.[0]?.text ?? '');
      return {
        surah: chapter.id,
        ayah: v.verse_number,
        arabic: v.text_uthmani ?? '',
        translation_id: String(TRANSLATION_ID),
        text: translation,
        // What actually gets embedded. The surah name gives the vector some
        // anchoring context, so "verses about patience" can surface an ayah
        // whose own wording never uses the word.
        tafsir_context: `Surah ${chapter.name_simple} (${chapter.id}:${v.verse_number}). ${translation}`,
        language: 'en'
      };
    });

    const vectors = await embed(prepared.map((p) => p.tafsir_context));
    embedded += prepared.length;

    await upsert(
      prepared.map((p, n) => ({ ...p, embedding: `[${vectors[n].join(',')}]` }))
    );

    done += prepared.length;
    const rate = done / ((Date.now() - started) / 1000);
    process.stdout.write(
      `\r  ${String(done).padStart(4)}/6236  surah ${String(chapter.id).padStart(3)}  ${rate.toFixed(0)}/s   `
    );
  }
}

console.log(`\nDone. ${embedded} ayat embedded and stored.`);
