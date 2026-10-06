import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { searchSources } from '@/lib/search/retrieve';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(20).optional()
});

/**
 * Both corpora, from one embedding.
 *
 * The module searched only the Qur'an while 36,000 narrations sat embedded and
 * indexed beside it, reachable from chat and from nowhere else. searchSources
 * runs both queries in parallel off a single embedding, so covering the hadith
 * costs no extra Voyage request - which is the whole reason it was written
 * that way.
 */

export async function POST(request: NextRequest) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Each search is an embedding call against a paid quota.
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const verdict = await checkRateLimit('search', request, user?.id);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: verdict.retryAfter },
      { status: 429, headers: rateLimitHeaders(verdict) }
    );
  }

  try {
    // Deliberately no summary, no commentary, no "these verses suggest".
    // The spec is explicit: return the sources and let the user read them.
    const { verses, hadith } = await searchSources(body.data.query, {
      limit: body.data.limit ?? 8
    });
    return NextResponse.json({ verses, hadith });
  } catch {
    return NextResponse.json({ error: 'search_failed' }, { status: 503 });
  }
}
