import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import { PRODUCTION_ORIGIN, siteUrl } from '@/lib/site';

/**
 * Error reporting.
 *
 * Every fault worth knowing about goes through here instead of stopping at a
 * console.error nobody reads. Three of those shipped to production this week
 * and were found by a person clicking something.
 *
 * Two deliberate limits:
 *
 * Nothing from a user's message is recorded. Not the question, not the
 * conversation, not the email address. A reporter that captures request
 * context would be quietly logging what people ask Sahn in private, which is
 * a worse problem than the one it solves. Scope and error text only.
 *
 * It never throws. A failure inside the reporter must not become the error
 * the user sees — the whole point is that it sits inside catch blocks.
 */

export type ErrorScope =
  | 'chat'
  | 'counsel'
  | 'classifier'
  | 'retrieval'
  | 'rate-limit'
  | 'auth'
  | 'account'
  | 'ramadan'
  | 'tracker'
  | 'threads';

/**
 * Groups occurrences of the same fault.
 *
 * Built from the scope and the error's shape rather than its full text, so
 * that ten thousand failures during a bad deploy are one row with a count and
 * one email, not ten thousand of each. Digits are flattened because ids and
 * timestamps in a message would otherwise make every occurrence unique — the
 * single most common way error grouping fails.
 */
function fingerprint(scope: string, message: string): string {
  const shape = message.replace(/\d+/g, 'N').slice(0, 200);
  return createHash('sha256').update(`${scope}:${shape}`).digest('hex').slice(0, 32);
}

function describe(error: unknown): { message: string; detail: string | null } {
  if (error instanceof Error) {
    return {
      message: `${error.name}: ${error.message}`.slice(0, 500),
      detail: error.stack?.slice(0, 4000) ?? null
    };
  }
  return { message: String(error).slice(0, 500), detail: null };
}

/**
 * Records an error and emails on the first occurrence of each kind.
 *
 * Scheduled with `after()` rather than left as a floating promise. A route
 * handler that returns while an unawaited write is still in flight is frozen
 * by the platform the moment it responds, and the write never lands — which
 * is exactly what happened on the first attempt at this: the failure was
 * reported correctly and recorded nowhere. `after()` keeps the invocation
 * alive until the work finishes, without making the user wait for it.
 */
export async function reportError(
  scope: ErrorScope,
  error: unknown,
  context?: string
): Promise<void> {
  const { message, detail } = describe(error);

  // Always visible in the platform logs, whatever happens below.
  console.error(`[${scope}]`, message, context ?? '');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const work = () => persist(url, key, scope, message, detail, context);

  try {
    after(work);
  } catch {
    // Outside a request scope — a script, or a test. Just do it inline.
    await work();
  }
}

async function persist(
  url: string,
  key: string,
  scope: ErrorScope,
  message: string,
  detail: string | null,
  context?: string
): Promise<void> {
  try {
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: shouldNotify, error: rpcError } = await admin.rpc('record_error', {
      p_fingerprint: fingerprint(scope, message),
      p_scope: scope,
      p_message: message,
      p_detail: context ? `${context}\n\n${detail ?? ''}`.trim() : detail
    });

    if (rpcError || !shouldNotify) return;
    await alert(scope, message, context);
  } catch {
    // A reporter that throws inside a catch block turns a handled error into
    // an unhandled one. Never.
  }
}

/**
 * Emails the first occurrence of a fault.
 *
 * Production only. A developer does not need mail about an error they are
 * looking at, and preview deployments would otherwise alert on every
 * experiment.
 */
async function alert(scope: string, message: string, context?: string) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  if (!key || !to || siteUrl() !== PRODUCTION_ORIGIN) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Sahn <noreply@sahn-ai.com>',
      to,
      subject: `Sahn: ${scope} — ${message.slice(0, 80)}`,
      text: [
        `Scope:   ${scope}`,
        `Message: ${message}`,
        context ? `Context: ${context}` : null,
        '',
        'Further occurrences of this same fault are counted but will not email',
        'again for an hour.'
      ]
        .filter(Boolean)
        .join('\n')
    })
  });
}
