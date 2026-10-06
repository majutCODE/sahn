/**
 * Posts one entry from content/social-posts.json to X.
 *
 * Run: node scripts/post-to-x.mjs --dry-run      (prints, posts nothing)
 *      node scripts/post-to-x.mjs                (posts)
 *
 * Which post goes out is derived from the date rather than stored anywhere:
 * the number of three-day periods since the epoch, modulo the pool size. That
 * means no state file to commit back, no race between runs, and a full cycle
 * before anything repeats. Change the pool and the rotation simply shifts.
 *
 * Auth is OAuth 1.0a user context, which is what POST /2/tweets wants for a
 * single-account bot. The four credentials come from the X developer portal;
 * see .github/workflows/social.yml for which secrets they map to.
 */

import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const PERIOD_DAYS = 3;

const { posts, link } = JSON.parse(
  readFileSync(new URL('../content/social-posts.json', import.meta.url), 'utf8')
);

const periods = Math.floor(Date.now() / (PERIOD_DAYS * 86_400_000));
const chosen = posts[periods % posts.length];
const text = `${chosen.text}\n\n${link}`;

if (DRY_RUN) {
  console.log(`--- dry run: would post (${chosen.feature}, ${text.length} chars) ---\n`);
  console.log(text);
  process.exit(0);
}

const creds = {
  key: process.env.X_API_KEY,
  secret: process.env.X_API_SECRET,
  token: process.env.X_ACCESS_TOKEN,
  tokenSecret: process.env.X_ACCESS_SECRET
};

if (Object.values(creds).some((v) => !v)) {
  console.error('Missing X credentials. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET.');
  process.exit(1);
}

/** RFC 3986, which is stricter than encodeURIComponent about these four. */
const enc = (v) =>
  encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function authHeader(method, url) {
  const params = {
    oauth_consumer_key: creds.key,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.token,
    oauth_version: '1.0'
  };

  // The JSON body is NOT part of the signature base for this endpoint; only
  // the oauth_* parameters are. Including it produces a 401 that looks like
  // bad credentials and is not.
  const base = [
    method.toUpperCase(),
    enc(url),
    enc(
      Object.keys(params)
        .sort()
        .map((k) => `${enc(k)}=${enc(params[k])}`)
        .join('&')
    )
  ].join('&');

  const signingKey = `${enc(creds.secret)}&${enc(creds.tokenSecret)}`;
  params.oauth_signature = createHmac('sha1', signingKey).update(base).digest('base64');

  return (
    'OAuth ' +
    Object.keys(params)
      .sort()
      .map((k) => `${enc(k)}="${enc(params[k])}"`)
      .join(', ')
  );
}

const url = 'https://api.x.com/2/tweets';
const response = await fetch(url, {
  method: 'POST',
  headers: {
    authorization: authHeader('POST', url),
    'content-type': 'application/json'
  },
  body: JSON.stringify({ text })
});

const body = await response.text();

if (!response.ok) {
  console.error(`X refused the post: ${response.status}`);
  console.error(body.slice(0, 400));
  process.exit(1);
}

console.log(`Posted (${chosen.feature}):`);
console.log(text);
console.log(body.slice(0, 200));
