import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reportError } from '@/lib/observability/report';
import { fetchRecitation } from '@/lib/quran/audio';
import { isReciterId } from '@/lib/quran/resources';

export const runtime = 'nodejs';

const schema = z.object({
  surah: z.coerce.number().int().min(1).max(114),
  // Checked against the curated list, not just "is a number": this value goes
  // into an upstream path, and an unknown id would 404 the whole surah.
  reciter: z.coerce.number().int().refine(isReciterId, 'unknown reciter')
});

/**
 * Audio for one surah in a chosen recitation.
 *
 * The page ships the default reciter's files with the server render, so this
 * is only reached when someone changes reciter — no round trip for the common
 * case, and no flash of a silent reader for the uncommon one.
 */
export async function GET(request: NextRequest) {
  const params = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!params.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const audio = await fetchRecitation(params.data.surah, params.data.reciter);
    return NextResponse.json(
      { audio },
      // A recitation is a fixed set of files; the CDN can hold it for a day.
      { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } }
    );
  } catch (error) {
    void reportError('retrieval', error, `recitation ${params.data.reciter}`);
    return NextResponse.json({ error: 'audio_unavailable' }, { status: 503 });
  }
}
