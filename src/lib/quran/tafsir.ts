import 'server-only';
import { quranFetch } from './client';
import { DEFAULT_TAFSIR } from './resources';

export type TafsirEntry = {
  /** Which ayah was asked for. */
  key: string;
  /** Every ayah this passage covers — commentary is often written per group. */
  covers: string[];
  resourceName: string;
  paragraphs: string[];
};

type TafsirResponse = {
  tafsir: {
    resource_name: string;
    text: string;
    verses?: Record<string, unknown>;
  };
};

/**
 * Turns the API's HTML into plain paragraphs.
 *
 * The response is arbitrary HTML from a third party rendered inside our page,
 * so none of it is trusted. Rather than sanitising a tag whitelist — which is
 * a permanent game against whatever the source starts emitting — block
 * boundaries become paragraph breaks and every tag is discarded. Commentary
 * loses its bold and its links; it keeps its structure, which is the part that
 * carries meaning.
 */
function toParagraphs(html: string): string[] {
  return html
    .replace(/<\/(p|div|h\d|li|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Commentary on one ayah.
 *
 * `verse_key` is `surah:ayah`. The passage returned frequently covers several
 * ayat at once, which the caller should say rather than implying the
 * commentary is about the single verse the reader tapped.
 */
export async function fetchTafsir(
  verseKey: string,
  tafsirId: number = DEFAULT_TAFSIR
): Promise<TafsirEntry> {
  const data = await quranFetch<TafsirResponse>(
    `tafsirs/${tafsirId}/by_ayah/${verseKey}`,
    { params: {} }
  );

  return {
    key: verseKey,
    covers: Object.keys(data.tafsir.verses ?? {}),
    resourceName: data.tafsir.resource_name,
    paragraphs: toParagraphs(data.tafsir.text ?? '')
  };
}
