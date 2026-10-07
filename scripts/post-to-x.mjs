/**
 * The X bot.
 *
 *   node scripts/post-to-x.mjs --dry-run        would it post now, and what
 *   node scripts/post-to-x.mjs --plan=30        print a month of the schedule
 *   node scripts/post-to-x.mjs                  post, if this hour is a slot
 *
 * Runs hourly and usually does nothing. The point is to look like a person
 * rather than a cron job: some days carry three posts, some carry one, and
 * roughly one day in five is silent. A fixed "every three days at ten" is the
 * most obvious tell there is.
 *
 * Everything is derived from the date, so there is no state to store, no file
 * to commit back and no race between runs. The same day always produces the
 * same plan, which also means --plan can show you the next month before
 * anything goes out.
 */

import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PLAN_DAYS = Number(args.find((a) => a.startsWith('--plan='))?.split('=')[1] ?? 0);

const { posts: pool, link } = JSON.parse(
  readFileSync(new URL('../content/social-posts.json', import.meta.url), 'utf8')
);

/**
 * Walked in file order.
 *
 * An earlier version grouped the file by language and alternated here, which
 * fixed one problem and left another: consecutive posts still shared a tone,
 * so a stretch of the schedule read as fifty contrarian lines in a row. The
 * ordering now lives in the file itself, round-robin across the seven tones
 * with no two neighbours sharing a tone, a language or a link. Nothing to
 * shuffle at run time, and `--plan` shows exactly what will go out.
 */
const posts = pool;

/** Deterministic PRNG. Same seed, same sequence, on any machine. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dayNumber = (date) => Math.floor(date.getTime() / 86_400_000);

/** Day the sequence is counted from. Moving it reshuffles everything. */
const ANCHOR_DAY = dayNumber(new Date('2026-10-01T00:00:00Z'));

/** How many posts a given day carries. Weighted for a human rhythm. */
function countFor(day) {
  const roll = rng(day * 2654435761)();
  return roll < 0.2 ? 0 : roll < 0.6 ? 1 : roll < 0.88 ? 2 : 3;
}

/**
 * How many posts have gone out before this day.
 *
 * The pool is walked by this running total, so every line is used once before
 * any repeats. The previous version indexed by `day * 3 % length`, and with 48
 * lines a stride of 3 only ever reaches 16 of them: two thirds of the pool
 * could never post, and the rest repeated on a sixteen day cycle. Counting
 * actual posts cannot drift out of step with the pool size however it changes.
 */
function sequenceBefore(day) {
  let total = 0;
  for (let d = ANCHOR_DAY; d < day; d += 1) total += countFor(d);
  return total;
}

/**
 * The day's plan: which UTC hours carry a post, and which post each one is.
 *
 * Weighted so a quiet day is common and a three-post day is rare, which is
 * roughly how a person who has a job actually posts. Hours sit between 07:00
 * and 21:00 UTC, covering morning in the UK through evening in the Gulf, and
 * never two in the same hour.
 */
function planFor(date) {
  const day = dayNumber(date);
  const random = rng(day * 2654435761);
  const count = countFor(day);

  // Re-roll the hours off the same seed, after the count has been taken.
  random();
  const hours = new Set();
  while (hours.size < count) hours.add(7 + Math.floor(random() * 15));

  const seqStart = sequenceBefore(day);

  return [...hours].sort((a, b) => a - b).map((hour, index) => {
    const sequence = seqStart + index;
    const post = posts[sequence % posts.length];
    // Per line, not a ratio. A link under an observation reads as bait and a
    // link under a feature reads as a door, so the lines that carry one say so
    // in the file. A bare line also travels further on X, which is why it is
    // about one post in nine rather than one in three.
    const withLink = post.link === true;
    return { hour, post, withLink };
  });
}

const compose = (slot) => (slot.withLink ? `${slot.post.text}\n\n${link}` : slot.post.text);

if (PLAN_DAYS > 0) {
  const start = new Date();
  let total = 0;
  for (let i = 0; i < PLAN_DAYS; i += 1) {
    const date = new Date(start.getTime() + i * 86_400_000);
    const plan = planFor(date);
    total += plan.length;
    const label = date.toISOString().slice(0, 10);
    if (plan.length === 0) {
      console.log(`${label}  -`);
      continue;
    }
    for (const slot of plan) {
      console.log(
        `${label}  ${String(slot.hour).padStart(2, '0')}:00  ` +
          `${slot.post.lang} ${slot.post.tone.padEnd(10)} ${slot.withLink ? '+link' : '     '}  ` +
          slot.post.text.slice(0, 58)
      );
    }
  }
  console.log(`\n  ${total} posts over ${PLAN_DAYS} days, ${(total / PLAN_DAYS).toFixed(1)} a day`);
  process.exit(0);
}

const now = new Date();
const slot = planFor(now).find((s) => s.hour === now.getUTCHours());

if (!slot) {
  console.log(`Nothing scheduled for ${now.toISOString().slice(0, 13)}:00 UTC.`);
  process.exit(0);
}

const text = compose(slot);

if (DRY_RUN) {
  console.log(`--- dry run: would post now (${slot.post.lang}, ${slot.post.keyword}) ---\n`);
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
  console.error('Missing X credentials.');
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

  // The JSON body is not part of the signature base for this endpoint. Signing
  // it produces a 401 that looks exactly like bad credentials and is not.
  const base = [
    method.toUpperCase(),
    enc(url),
    enc(Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&'))
  ].join('&');

  params.oauth_signature = createHmac('sha1', `${enc(creds.secret)}&${enc(creds.tokenSecret)}`)
    .update(base)
    .digest('base64');

  return 'OAuth ' + Object.keys(params).sort().map((k) => `${enc(k)}="${enc(params[k])}"`).join(', ');
}

const url = 'https://api.x.com/2/tweets';
const response = await fetch(url, {
  method: 'POST',
  headers: { authorization: authHeader('POST', url), 'content-type': 'application/json' },
  body: JSON.stringify({ text })
});

const body = await response.text();

// A delayed or duplicated run can replay the same slot. X rejects an identical
// post as a duplicate, which is the behaviour we want, so it is not an error.
if (response.status === 403 && body.includes('duplicate')) {
  console.log('Already posted this one. Nothing to do.');
  process.exit(0);
}

if (!response.ok) {
  console.error(`X refused the post: ${response.status}`);
  console.error(body.slice(0, 400));
  process.exit(1);
}

console.log(`Posted (${slot.post.lang}, ${slot.post.keyword}):\n${text}`);
