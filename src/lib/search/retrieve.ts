import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { embedQueryCached } from '@/lib/embeddings/cache';
import { toVectorLiteral } from '@/lib/embeddings/voyage';

/**
 * Retrieval over the embedded corpora — Qur'an and hadith.
 *
 * Everything the fiqh route is allowed to say comes from here. If this returns
 * nothing, the correct behaviour downstream is to say so, not to fall back on
 * the model's own knowledge.
 */

export type VerseMatch = {
  surah: number;
  ayah: number;
  arabic: string;
  text: string;
  similarity: number;
};

export type HadithMatch = {
  collection: string;
  collection_name: string;
  hadith_number: string;
  arabic: string;
  text: string;
  grades: Array<{ name?: string; grade?: string }> | null;
  reference: string;
  similarity: number;
};

export type RetrievalOptions = {
  limit?: number;
  /**
   * Cosine similarity floor. Below roughly 0.35 the matches stop being about
   * the question, and a weak passage in the fiqh prompt is worse than none —
   * it invites the model to stretch.
   */
  minSimilarity?: number;
};

export async function searchVerses(
  query: string,
  options: RetrievalOptions = {}
): Promise<VerseMatch[]> {
  const embedding = await embedQueryCached(query);
  return matchVerses(embedding, options);
}

async function matchVerses(
  embedding: number[],
  { limit = 8, minSimilarity = 0.35 }: RetrievalOptions
): Promise<VerseMatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('match_quran_chunks', {
    query_embedding: toVectorLiteral(embedding),
    match_count: limit,
    min_similarity: minSimilarity
  });
  if (error) throw new Error(`Verse search failed: ${error.message}`);
  return (data ?? []) as VerseMatch[];
}

async function matchHadith(
  embedding: number[],
  { limit = 8, minSimilarity = 0.35 }: RetrievalOptions
): Promise<HadithMatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('match_hadith_chunks', {
    query_embedding: toVectorLiteral(embedding),
    match_count: limit,
    min_similarity: minSimilarity
  });
  if (error) throw new Error(`Hadith search failed: ${error.message}`);
  return (data ?? []) as HadithMatch[];
}

export type Sources = {
  verses: VerseMatch[];
  hadith: HadithMatch[];
};

/**
 * Both corpora from a single embedding.
 *
 * The embedding is computed once and reused across both searches. Embedding
 * twice would be correct but wasteful, and on a throttled key it halves how
 * many questions the product can answer in a minute.
 */
export async function searchSources(
  query: string,
  options: RetrievalOptions = {}
): Promise<Sources> {
  const embedding = await embedQueryCached(query);
  const [verses, hadith] = await Promise.all([
    matchVerses(embedding, options),
    matchHadith(embedding, options)
  ]);
  return { verses, hadith };
}

export type Citation = {
  /** Stable id so the client can key a chip to a source panel. */
  id: string;
  kind: 'quran' | 'hadith';
  reference: string;
  arabic: string;
  text: string;
  /** Grading, for hadith only — a scholarly judgement, shown not hidden. */
  grade?: string;
  href?: string;
};

export function toCitations({ verses, hadith }: Sources): Citation[] {
  const quran: Citation[] = verses.map((v) => ({
    id: `q-${v.surah}:${v.ayah}`,
    kind: 'quran' as const,
    reference: `Qur'an ${v.surah}:${v.ayah}`,
    arabic: v.arabic,
    text: v.text,
    href: `/quran/${v.surah}#ayah-${v.ayah}`
  }));

  const narrations: Citation[] = hadith.map((h) => ({
    id: `h-${h.collection}-${h.hadith_number}`,
    kind: 'hadith' as const,
    reference: h.reference,
    arabic: h.arabic,
    text: h.text,
    grade: h.grades?.map((g) => g.grade).filter(Boolean).join(', ') || undefined
  }));

  return [...quran, ...narrations];
}

/**
 * The passage block handed to the fiqh prompt.
 *
 * Each passage carries its own reference inline so the model cannot cite
 * something it did not receive — reference and text arrive together or not at
 * all. Hadith gradings are included because a weak narration and a sahih one
 * do not carry the same weight, and hiding that would misrepresent the source.
 */
export function formatPassages({ verses, hadith }: Sources): string {
  const parts: string[] = [];

  verses.forEach((v, i) => {
    parts.push(`[Q${i + 1}] Qur'an ${v.surah}:${v.ayah}\n${v.arabic}\n${v.text}`);
  });

  hadith.forEach((h, i) => {
    const grade = h.grades?.map((g) => g.grade).filter(Boolean).join(', ');
    parts.push(
      `[H${i + 1}] ${h.reference}${grade ? ` — graded: ${grade}` : ''}\n${h.text}`
    );
  });

  return parts.join('\n\n');
}
