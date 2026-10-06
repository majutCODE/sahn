import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reportError } from '@/lib/observability/report';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const schema = z.object({
  message: z.string().min(1).max(500),
  // React's digest for the error, which is what correlates a client report
  // with the server-side render that produced it.
  digest: z.string().max(100).optional(),
  path: z.string().max(200).optional()
});

/**
 * Lets a broken page tell us it is broken.
 *
 * Server faults already report themselves; a render error in the browser was
 * invisible until somebody said so out loud. That happened: a service worker
 * bug produced a client-side error for every returning visitor while every
 * server-side check passed.
 *
 * Nothing from the page is accepted beyond the error text and the path. The
 * endpoint is public by necessity - a page that cannot render cannot
 * authenticate - so it is rate limited, and the reporter deduplicates by
 * fingerprint, which bounds a flood to one row and one email per hour however
 * many times it is called.
 */
export async function POST(request: NextRequest) {
  const verdict = await checkRateLimit('search', request);
  if (!verdict.allowed) return NextResponse.json({ ok: true });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { message, digest, path } = body.data;
  await reportError(
    'chat',
    new Error(`Client render error: ${message}`),
    [path && `path: ${path}`, digest && `digest: ${digest}`]
      .filter(Boolean)
      .join(' | ')
  );

  return NextResponse.json({ ok: true });
}
