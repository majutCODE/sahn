import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { reportError } from '@/lib/observability/report';
import { fetchTafsir } from '@/lib/quran/tafsir';

export const runtime = 'nodejs';

// surah:ayah, both within range. Anything else is not a verse key, and this
// value is interpolated into an upstream path.
const keySchema = z
  .string()
  .regex(/^(?:[1-9]|[1-9]\d|1[01]\d)(?::(?:[1-9]|[1-9]\d|[12]\d\d))$/);

/**
 * Commentary for one ayah, fetched on demand.
 *
 * Not loaded with the surah: al-Baqarah would mean 286 requests to render a
 * page almost nobody reads end to end. It arrives when a reader opens it.
 */
export async function GET(request: NextRequest) {
  const key = keySchema.safeParse(new URL(request.url).searchParams.get('verse'));
  if (!key.success) {
    return NextResponse.json({ error: 'invalid_verse' }, { status: 400 });
  }

  try {
    const tafsir = await fetchTafsir(key.data);
    return NextResponse.json(
      { tafsir },
      // Commentary does not change. Letting the CDN hold it keeps a reader
      // opening several ayat off the upstream API entirely.
      { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } }
    );
  } catch (error) {
    void reportError('retrieval', error, `tafsir for ${key.data}`);
    return NextResponse.json({ error: 'tafsir_unavailable' }, { status: 503 });
  }
}
