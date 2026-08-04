import { createHash } from 'node:crypto';

/**
 * The cache key for a question.
 *
 * Separate from `cache.ts` because these are pure functions with no database
 * and no secrets, and `server-only` would otherwise make them untestable —
 * which is backwards, since collision behaviour is the part that most needs
 * testing.
 */

/**
 * Folds away the differences that do not change meaning, so "What breaks a
 * fast?" and "what breaks a fast" are one cache entry rather than two.
 *
 * Deliberately conservative. Aggressive normalisation — stripping stop words,
 * stemming — would collide questions that genuinely differ, and a collision
 * here serves passages for a question nobody asked, with nothing downstream
 * able to notice.
 */
export function normaliseQuery(query: string): string {
  return query
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?!.،؟]+$/u, '')
    .trim();
}

export function queryHash(query: string): string {
  return createHash('sha256').update(normaliseQuery(query)).digest('hex');
}
