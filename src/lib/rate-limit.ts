import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { reportError } from '@/lib/observability/report';
import type { NextRequest } from 'next/server';

/**
 * Request limits for the endpoints that cost money.
 *
 * Every chat message is a classifier call, an embedding call and a Sonnet
 * completion. The route is open to the internet, so without a limit the only
 * thing standing between a for-loop and the card on file is nobody having
 * found the domain yet.
 *
 * Signed-in callers get a much larger allowance: they are attached to a
 * verified email, and heavy use by a real person is the product working.
 */
export const LIMITS = {
  chat: { anon: { minute: 3, hour: 15 }, user: { minute: 10, hour: 120 } },
  search: { anon: { minute: 10, hour: 60 }, user: { minute: 20, hour: 300 } }
} as const;

export type LimitedRoute = keyof typeof LIMITS;

export type RateLimitVerdict = {
  allowed: boolean;
  retryAfter: number;
  hourRemaining: number;
  /**
   * Why the verdict is what it is. A limiter that fails open is invisible
   * when it breaks — it just stops limiting, and everything looks fine until
   * the bill arrives. This is surfaced as a response header so the state can
   * be checked from outside without reading logs.
   */
  state: 'ok' | 'unconfigured' | 'error';
};

/**
 * The caller's identity for limiting purposes.
 *
 * IPs are hashed, never stored raw. An IP is personal data, the table would
 * otherwise be a log of who visited and when, and a hash is all a counter
 * needs. The salt makes the hash useless to anyone who obtains the table
 * without also obtaining the environment.
 */
function bucketKey(route: LimitedRoute, request: NextRequest, userId?: string) {
  if (userId) return `${route}:u:${userId}`;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const salt = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const hash = createHash('sha256').update(`${salt}:${ip}`).digest('base64url');
  return `${route}:a:${hash.slice(0, 24)}`;
}

/**
 * Counts one request and says whether to serve it.
 *
 * Fails open. If the counter is unreachable the request proceeds — an outage
 * in the limiter should not take the product down with it, and the exposure
 * is bounded by how long Postgres is unavailable.
 */
export async function checkRateLimit(
  route: LimitedRoute,
  request: NextRequest,
  userId?: string
): Promise<RateLimitVerdict> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const open = (state: 'unconfigured' | 'error'): RateLimitVerdict => ({
    allowed: true,
    retryAfter: 0,
    hourRemaining: -1,
    state
  });

  if (!url || !key) {
    void reportError('rate-limit', new Error('not configured'), 'requests are NOT being limited');
    return open('unconfigured');
  }

  const limits = userId ? LIMITS[route].user : LIMITS[route].anon;

  try {
    // Service role, because the counter table is deliberately unreachable by
    // the caller — a limit you can reset yourself is decoration.
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: bucketKey(route, request, userId),
      p_minute_limit: limits.minute,
      p_hour_limit: limits.hour
    });

    if (error || !data) {
      void reportError('rate-limit', new Error(error?.message ?? 'rpc failed'), 'requests are NOT being limited');
      return open('error');
    }

    const result = data as {
      allowed: boolean;
      retry_after: number;
      hour_remaining: number;
    };

    return {
      allowed: result.allowed,
      retryAfter: result.retry_after,
      hourRemaining: result.hour_remaining,
      state: 'ok'
    };
  } catch (error) {
    void reportError('rate-limit', error, 'requests are NOT being limited');
    return open('error');
  }
}

/** Headers a client can act on rather than guess from. */
export function rateLimitHeaders(verdict: RateLimitVerdict): Record<string, string> {
  const headers: Record<string, string> = { 'x-ratelimit-state': verdict.state };
  if (verdict.hourRemaining >= 0) {
    headers['x-ratelimit-remaining'] = String(verdict.hourRemaining);
  }
  if (!verdict.allowed) headers['retry-after'] = String(verdict.retryAfter);
  return headers;
}
