import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { quranFetch } from '@/lib/quran/client';
import { DEFAULT_TRANSLATION, stripFootnotes } from '@/lib/quran/resources';
import type { Verse } from '@/lib/quran/types';

export type DuaRow = {
  id: string;
  slug: string;
  title: Record<string, string>;
  arabic: string;
  transliteration: string | null;
  source_ref: string;
  quran_ref: string | null;
  tags: string[];
  translation_pending: boolean;
  translations: Record<string, string>;
};

export type Dua = DuaRow & {
  /** Resolved at render: Qur'anic du'as borrow the Quran.com translation. */
  translation: string | null;
};

/**
 * Every du'a, with translations resolved where we are licensed to show one.
 *
 * Qur'anic du'as are translated through the Quran.com licence, which covers
 * them. Prophetic du'as carry `translation_pending` until a licensed or
 * commissioned translation exists — the UI says so rather than guessing.
 */
export async function fetchDuas(locale: string): Promise<Dua[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dua_entries')
    .select(
      'id, slug, title, arabic, transliteration, source_ref, quran_ref, tags, translation_pending, translations'
    )
    .order('slug');

  if (error) throw new Error(`Could not load duas: ${error.message}`);
  const rows = (data ?? []) as DuaRow[];

  // Arabic readers are shown the Arabic; no translation is fetched at all.
  if (locale === 'ar') {
    return rows.map((row) => ({
      ...row,
      translation: row.translations?.ar ?? null
    }));
  }

  const refs = rows.map((r) => r.quran_ref).filter((r): r is string => Boolean(r));
  const quranTranslations = await fetchQuranTranslations(refs);

  return rows.map((row) => ({
    ...row,
    translation:
      row.translations?.en ??
      (row.quran_ref ? (quranTranslations.get(row.quran_ref) ?? null) : null)
  }));
}

/** One batched lookup rather than a request per du'a. */
async function fetchQuranTranslations(refs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  await Promise.all(
    [...new Set(refs)].map(async (ref) => {
      try {
        const { verse } = await quranFetch<{ verse: Verse }>(
          `verses/by_key/${ref}`,
          { params: { translations: DEFAULT_TRANSLATION } }
        );
        const text = verse.translations?.[0]?.text;
        if (text) out.set(ref, stripFootnotes(text));
      } catch {
        // A missing translation is not a broken page: the Arabic still shows.
      }
    })
  );

  return out;
}
