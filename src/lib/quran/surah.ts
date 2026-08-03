import 'server-only';
import { quranFetch } from './client';
import { stripFootnotes } from './resources';
import type { Chapter, Pagination, Verse } from './types';

export type ReaderAyah = {
  number: number;
  key: string;
  arabic: string;
  translation: string | null;
};

export type SurahContent = {
  chapter: Chapter;
  ayat: ReaderAyah[];
};

/**
 * A whole surah, in reading order.
 *
 * The API pages verses, so this follows the cursor to the end rather than
 * showing a partial al-Baqarah. Responses are cached for a day by the client,
 * so the extra round trips are paid once.
 */
export async function fetchSurah(
  surah: number,
  { locale, translationId }: { locale: string; translationId: number | null }
): Promise<SurahContent> {
  const { chapter } = await quranFetch<{ chapter: Chapter }>(
    `chapters/${surah}`,
    { params: { language: locale } }
  );

  const ayat: ReaderAyah[] = [];
  let page = 1;

  for (;;) {
    const data = await quranFetch<{ verses: Verse[]; pagination: Pagination }>(
      `verses/by_chapter/${surah}`,
      {
        params: {
          language: locale,
          fields: 'text_uthmani',
          translations: translationId ?? undefined,
          per_page: 50,
          page
        }
      }
    );

    for (const verse of data.verses) {
      const translation = verse.translations?.[0]?.text;
      ayat.push({
        number: verse.verse_number,
        key: verse.verse_key,
        arabic: verse.text_uthmani ?? '',
        translation: translation ? stripFootnotes(translation) : null
      });
    }

    if (!data.pagination.next_page) break;
    page = data.pagination.next_page;

    // The longest surah is 286 ayat; anything past this is a runaway cursor.
    if (page > 10) break;
  }

  return { chapter, ayat };
}
