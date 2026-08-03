import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { searchVerses } from '@/lib/search/retrieve';

const schema = z.object({
  query: z.string().min(2).max(500),
  limit: z.number().int().min(1).max(20).optional()
});

export async function POST(request: NextRequest) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    // Deliberately no summary, no commentary, no "these verses suggest".
    // The spec is explicit: return the verses and let the user read them.
    const verses = await searchVerses(body.data.query, {
      limit: body.data.limit ?? 10
    });
    return NextResponse.json({ verses });
  } catch {
    return NextResponse.json({ error: 'search_failed' }, { status: 503 });
  }
}
