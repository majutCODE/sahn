import { describe, expect, it } from 'vitest';
import { normaliseQuery, queryHash } from '../src/lib/embeddings/query-key';

/**
 * The cache key decides two things: how often Voyage is spared a request, and
 * whether two genuinely different questions can be served the same vector. The
 * second is the dangerous one — a collision retrieves passages for a question
 * nobody asked, and nothing downstream would notice.
 */
describe('query normalisation', () => {
  it('folds case and whitespace', () => {
    expect(queryHash('What breaks a fast?')).toBe(queryHash('what breaks a fast'));
    expect(queryHash('what  breaks   a fast')).toBe(queryHash('what breaks a fast'));
    expect(queryHash('  what breaks a fast  ')).toBe(queryHash('what breaks a fast'));
  });

  it('folds trailing punctuation in both scripts', () => {
    expect(normaliseQuery('is zakat due on gold?')).toBe('is zakat due on gold');
    expect(normaliseQuery('ما حكم الصيام؟')).toBe('ما حكم الصيام');
  });

  it('keeps genuinely different questions apart', () => {
    const pairs: Array<[string, string]> = [
      ['can i combine prayers', 'can i shorten prayers'],
      ['zakat on gold', 'zakat on silver'],
      ['is it permissible', 'is it not permissible'],
      ['ما حكم الصيام', 'ما حكم الصلاة']
    ];
    for (const [a, b] of pairs) {
      expect(queryHash(a), `${a} vs ${b}`).not.toBe(queryHash(b));
    }
  });

  it('does not strip meaning-bearing punctuation mid-question', () => {
    // Only trailing marks go. An internal one can carry the sense.
    expect(normaliseQuery('what about 2:187, does it apply')).toContain('2:187,');
  });

  it('is stable across Unicode representations', () => {
    // The same Arabic text composed two ways must hit one entry, or the cache
    // silently halves its own hit rate on Arabic.
    const composed = 'صلاة'.normalize('NFC');
    const decomposed = 'صلاة'.normalize('NFD');
    expect(queryHash(composed)).toBe(queryHash(decomposed));
  });

  it('produces a hex sha256, not the question', () => {
    const hash = queryHash('something private someone asked');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('private');
  });
});
