/**
 * The posting schedule and the OAuth 1.0a signing, shared by both posters.
 *
 * There are two: the Cloudflare Worker that actually runs the thing, and the
 * CLI that exists so a person can ask "what would you post" without posting.
 * If they drifted, --plan would be describing a schedule the Worker does not
 * follow, which is worse than having no --plan at all. So everything that both
 * need lives here and nothing here touches the network or the disk.
 *
 * The only thing deliberately left out is HMAC-SHA1. Node has node:crypto and
 * Workers have Web Crypto, and the two have no common API, so each caller
 * injects its own. The part that actually goes wrong in OAuth 1.0a is the
 * signature base string, and that is in here, written once.
 */

/** Deterministic PRNG. Same seed, same sequence, on any machine. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dayNumber = (date) => Math.floor(date.getTime() / 86_400_000);

/**
 * Day the sequence is counted from. Moving it reshuffles everything, so it is
 * fixed in the past and stays there.
 */
export const ANCHOR_DAY = dayNumber(new Date('2026-10-01T00:00:00Z'));

/**
 * How many posts a given day carries.
 *
 * Weighted so a silent day is common and a three-post day is rare, which is
 * roughly how a person with a job posts. A fixed "every three days at ten" is
 * the most obvious tell there is.
 */
export function countFor(day) {
  const roll = rng(day * 2654435761)();
  return roll < 0.2 ? 0 : roll < 0.6 ? 1 : roll < 0.88 ? 2 : 3;
}

/**
 * How many posts have gone out before this day.
 *
 * The pool is walked by this running total, so every line is used once before
 * any repeats. An earlier version indexed by `day * 3 % length`, and with 48
 * lines a stride of 3 only ever reached 16 of them: two thirds could never
 * post. Counting actual posts cannot drift out of step with the pool size
 * however that size changes.
 *
 * This is a loop from a fixed anchor rather than arithmetic, which costs a few
 * thousand iterations a year and buys the property that the schedule for any
 * date can be computed from nothing but the date.
 */
export function sequenceBefore(day) {
  let total = 0;
  for (let d = ANCHOR_DAY; d < day; d += 1) total += countFor(d);
  return total;
}

/**
 * The day's plan: which UTC hours carry a post, and which post each one is.
 *
 * Hours sit between 07:00 and 21:00 UTC, which is morning in the UK through
 * evening in the Gulf, and never two in the same hour.
 */
export function planFor(date, posts) {
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
    // in the file.
    return { hour, post, withLink: post.link === true, sequence };
  });
}

export const compose = (slot, link) =>
  slot.withLink ? `${slot.post.text}\n\n${link}` : slot.post.text;

/** RFC 3986, which is stricter than encodeURIComponent about these four. */
export const enc = (v) =>
  encodeURIComponent(v).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

/**
 * Builds the OAuth 1.0a Authorization header.
 *
 * `hmac` is injected and must return the base64 HMAC-SHA1 of (key, data).
 * `nonce` and `timestamp` are parameters rather than generated in here so that
 * a test can assert the two implementations produce byte-identical headers;
 * callers in production pass fresh random values.
 */
export async function oauthHeader({ method, url, creds, nonce, timestamp, hmac }) {
  const params = {
    oauth_consumer_key: creds.key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: creds.token,
    oauth_version: '1.0'
  };

  // The JSON body is not part of the signature base for this endpoint. Signing
  // it produces a 401 that looks exactly like bad credentials and is not.
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

  params.oauth_signature = await hmac(
    `${enc(creds.secret)}&${enc(creds.tokenSecret)}`,
    base
  );

  return (
    'OAuth ' +
    Object.keys(params)
      .sort()
      .map((k) => `${enc(k)}="${enc(params[k])}"`)
      .join(', ')
  );
}
