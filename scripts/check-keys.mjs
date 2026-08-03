/**
 * Checks every configured credential with one cheap live call each.
 * Run: node --env-file=.env.local scripts/check-keys.mjs
 *
 * Prints only pass/fail and non-sensitive facts — never a key.
 */

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

async function checkQuran() {
  const { QURAN_OAUTH_URL, QURAN_API_BASE, QURAN_CLIENT_ID, QURAN_CLIENT_SECRET } =
    process.env;
  if (!QURAN_CLIENT_ID || !QURAN_CLIENT_SECRET) {
    return record('Quran.com', null, 'not configured');
  }

  const tokenRes = await fetch(QURAN_OAUTH_URL, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${QURAN_CLIENT_ID}:${QURAN_CLIENT_SECRET}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials&scope=content'
  });
  if (!tokenRes.ok) {
    return record('Quran.com', false, `token ${tokenRes.status}`);
  }
  const { access_token } = await tokenRes.json();

  const res = await fetch(`${QURAN_API_BASE}/content/api/v4/chapters`, {
    headers: { 'x-auth-token': access_token, 'x-client-id': QURAN_CLIENT_ID }
  });
  if (!res.ok) return record('Quran.com', false, `chapters ${res.status}`);

  const { chapters } = await res.json();
  record('Quran.com', chapters.length === 114, `${chapters.length} surahs`);
}

async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return record('Anthropic', null, 'not configured');

  // Listing models costs nothing and proves the key and its permissions.
  const res = await fetch('https://api.anthropic.com/v1/models?limit=1', {
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
  });
  if (!res.ok) return record('Anthropic', false, `${res.status}`);
  const { data } = await res.json();
  record('Anthropic', true, `reachable, e.g. ${data[0]?.id ?? 'unknown'}`);
}

async function checkVoyage() {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return record('Voyage (embeddings)', null, 'not configured');

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: ['sahn'], model: 'voyage-3.5' })
  });
  if (!res.ok) return record('Voyage (embeddings)', false, `${res.status}`);
  const json = await res.json();
  record('Voyage (embeddings)', true, `${json.data[0].embedding.length} dimensions`);
}

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return record('Supabase (anon)', null, 'not configured');

  const res = await fetch(`${url}/rest/v1/dua_entries?select=id&limit=1`, {
    headers: { apikey: key }
  });
  record('Supabase (anon)', res.ok, `rest ${res.status}`);
}

async function checkServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return record('Supabase (service)', null, 'not configured');

  // Reaching an owner-only table proves the key bypasses RLS, which is exactly
  // what corpus ingestion needs — and why it must never reach the browser.
  const res = await fetch(`${url}/rest/v1/counsel_threads?select=id&limit=1`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  });
  record('Supabase (service)', res.ok, `bypasses RLS: ${res.status}`);
}

async function checkMetals() {
  const key = process.env.METALS_API_KEY;
  const provider = process.env.METALS_PROVIDER;
  if (!key) return record('Metals price', null, 'not configured');
  if (provider !== 'metals_dev') {
    return record('Metals price', null, `provider "${provider}" not wired yet`);
  }

  const res = await fetch(
    `https://api.metals.dev/v1/latest?api_key=${key}&currency=GBP&unit=toz`
  );
  if (!res.ok) return record('Metals price', false, `${res.status}`);
  const json = await res.json();
  if (json.status !== 'success') {
    return record('Metals price', false, json.error_message ?? 'error');
  }
  record(
    'Metals price',
    true,
    `gold £${json.metals.gold}/toz, silver £${json.metals.silver}/toz`
  );
}

for (const check of [
  checkSupabase,
  checkServiceRole,
  checkQuran,
  checkAnthropic,
  checkVoyage,
  checkMetals
]) {
  try {
    await check();
  } catch (error) {
    record(check.name, false, error.message);
  }
}

const mark = (ok) => (ok === null ? '—' : ok ? '✓' : '✗');
for (const { name, ok, detail } of results) {
  console.log(`${mark(ok)} ${name.padEnd(22)} ${detail}`);
}

const failed = results.filter((r) => r.ok === false);
process.exit(failed.length ? 1 : 0);
