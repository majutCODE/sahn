import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import pool from '../content/social-posts.json';
import { countFor, oauthHeader, planFor, sequenceBefore } from '../scripts/lib/social-schedule.mjs';
import { post } from '../workers/post-to-x/src/index.js';

/**
 * The bot runs unattended on Cloudflare for years at a time. Nobody is going to
 * notice a wrong signature or a schedule that stalls, so the things that cannot
 * be observed in production are pinned here.
 */

/** What the CLI would use. */
const nodeHmac = (key: string, data: string) =>
  createHmac('sha1', key).update(data).digest('base64');

/** What the Worker uses. Node 22 has the same Web Crypto the Worker has. */
async function webHmac(key: string, data: string) {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

const creds = {
  key: 'consumer-key',
  secret: 'consumer-secret',
  token: 'access-token',
  tokenSecret: 'access-token-secret'
};
const fixed = { nonce: 'a'.repeat(32), timestamp: '1791336000' };

describe('oauth 1.0a signing', () => {
  it('signs identically under node crypto and web crypto', async () => {
    // The Worker and the CLI share the base-string code but not the HMAC, so
    // this is the assertion that the two cannot quietly diverge. A mismatch
    // would show up in production as a 401 that looks like bad credentials.
    const args = { method: 'POST', url: 'https://api.x.com/2/tweets', creds, ...fixed };
    const a = await oauthHeader({ ...args, hmac: nodeHmac });
    const b = await oauthHeader({ ...args, hmac: webHmac });
    expect(a).toBe(b);
  });

  it('carries exactly the six oauth parameters plus the signature', async () => {
    const header = await oauthHeader({
      method: 'POST',
      url: 'https://api.x.com/2/tweets',
      creds,
      ...fixed,
      hmac: nodeHmac
    });
    const keys = [...header.replace(/^OAuth /, '').matchAll(/(\w+)="/g)].map((m) => m[1]);
    expect(keys).toEqual([
      'oauth_consumer_key',
      'oauth_nonce',
      'oauth_signature',
      'oauth_signature_method',
      'oauth_timestamp',
      'oauth_token',
      'oauth_version'
    ]);
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
  });

  it('percent-encodes the signature, which is where this breaks silently', async () => {
    // A base64 signature routinely contains + / and =, and an unencoded one is
    // accepted-looking and rejected. Over many nonces at least one signature
    // will contain a character that must be escaped.
    const headers = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        oauthHeader({
          method: 'POST',
          url: 'https://api.x.com/2/tweets',
          creds,
          nonce: `nonce-${i}`,
          timestamp: '1791336000',
          hmac: nodeHmac
        })
      )
    );
    const signatures = headers.map((h) => h.match(/oauth_signature="([^"]*)"/)![1]);
    expect(signatures.some((s) => s.includes('%3D') || s.includes('%2B') || s.includes('%2F'))).toBe(true);
    for (const s of signatures) expect(s).not.toMatch(/[+/=]/);
  });
});

describe('schedule', () => {
  const posts = pool.posts;

  it('reaches every post before repeating any', () => {
    // The whole reason the pool is 350 lines. If the walk skipped positions the
    // account would loop visibly however large the pool got - which is exactly
    // the bug the old `day * 3 % 48` had.
    const seen = new Set<number>();
    let day = Math.floor(Date.UTC(2026, 9, 1) / 86_400_000);
    for (let i = 0; i < 1200 && seen.size < posts.length; i += 1, day += 1) {
      const start = sequenceBefore(day);
      for (let n = 0; n < countFor(day); n += 1) seen.add((start + n) % posts.length);
    }
    expect(seen.size).toBe(posts.length);
  });

  it('never schedules two posts in the same hour', () => {
    for (let i = 0; i < 400; i += 1) {
      const date = new Date(Date.UTC(2026, 9, 7) + i * 86_400_000);
      const hours = planFor(date, posts).map((s: { hour: number }) => s.hour);
      expect(new Set(hours).size).toBe(hours.length);
    }
  });

  it('posts at a human rate with silent days', () => {
    let total = 0;
    let silent = 0;
    for (let i = 0; i < 365; i += 1) {
      const n = planFor(new Date(Date.UTC(2026, 9, 7) + i * 86_400_000), posts).length;
      total += n;
      if (n === 0) silent += 1;
    }
    const perDay = total / 365;
    expect(perDay).toBeGreaterThan(1);
    expect(perDay).toBeLessThan(2);
    // Roughly one day in five carries nothing. A bot that posts every day is
    // legible as a bot.
    expect(silent / 365).toBeGreaterThan(0.1);
  });

  it('keeps every post inside the hours a person is awake for', () => {
    for (let i = 0; i < 200; i += 1) {
      for (const slot of planFor(new Date(Date.UTC(2026, 9, 7) + i * 86_400_000), posts)) {
        expect(slot.hour).toBeGreaterThanOrEqual(7);
        expect(slot.hour).toBeLessThanOrEqual(21);
      }
    }
  });

  it('still has posts left years from now', () => {
    // Wrapping rather than running dry is the point: the sequence keeps
    // indexing into the pool forever.
    const far = new Date(Date.UTC(2031, 0, 1));
    const plan = planFor(far, posts);
    for (const slot of plan) expect(slot.post.text.length).toBeGreaterThan(0);
  });
});

describe('the worker', () => {
  it('does nothing in an hour with no slot', async () => {
    // 03:00 UTC is outside the posting window entirely, so this is true of
    // every day and needs no fixture.
    const result = await post({}, new Date(Date.UTC(2026, 9, 8, 3)));
    expect(result).toEqual({ posted: false, reason: 'no slot this hour' });
  });

  it('refuses to post rather than throwing when secrets are missing', async () => {
    // Finding the slot must not be what surfaces a config problem, and a
    // missing secret must not become an unhandled rejection in a cron.
    const hour = planFor(new Date(Date.UTC(2026, 9, 8)), pool.posts)[0].hour;
    const result = await post({}, new Date(Date.UTC(2026, 9, 8, hour)));
    expect(result).toEqual({ posted: false, reason: 'missing credentials' });
  });
});
