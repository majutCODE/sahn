import { describe, expect, it } from 'vitest';
import {
  SURAHS,
  TOTAL_AYAT,
  ayatIn,
  dueNow,
  memorisedAyat,
  strengthLabel,
  surahByNumber,
  type Portion
} from '../src/lib/hifz';

const portion = (over: Partial<Portion> = {}): Portion => ({
  id: Math.random().toString(),
  surah: 2,
  ayah_from: 1,
  ayah_to: 10,
  strength: 0,
  last_reviewed_at: null,
  next_review_at: new Date().toISOString(),
  ...over
});

describe('surah data', () => {
  it('has all 114 and the right total', () => {
    expect(SURAHS).toHaveLength(114);
    expect(TOTAL_AYAT).toBe(6236);
  });

  it('agrees with well-known lengths', () => {
    expect(surahByNumber(1)?.ayat).toBe(7);
    expect(surahByNumber(2)?.ayat).toBe(286);
    expect(surahByNumber(36)?.ayat).toBe(83);
    expect(surahByNumber(114)?.ayat).toBe(6);
  });
});

describe('memorised total', () => {
  it('counts a single portion inclusively', () => {
    // 1 to 10 is ten ayat, not nine.
    expect(ayatIn(portion({ ayah_from: 1, ayah_to: 10 }))).toBe(10);
    expect(memorisedAyat([portion({ ayah_from: 1, ayah_to: 10 })])).toBe(10);
  });

  it('counts overlapping portions once', () => {
    // The failure that would otherwise reward re-adding the same passage.
    const p = [
      portion({ ayah_from: 1, ayah_to: 20 }),
      portion({ ayah_from: 1, ayah_to: 50 })
    ];
    expect(memorisedAyat(p)).toBe(50);
  });

  it('merges adjacent portions without double counting the join', () => {
    const p = [
      portion({ ayah_from: 1, ayah_to: 10 }),
      portion({ ayah_from: 11, ayah_to: 20 })
    ];
    expect(memorisedAyat(p)).toBe(20);
  });

  it('keeps separate runs separate', () => {
    const p = [
      portion({ ayah_from: 1, ayah_to: 10 }),
      portion({ ayah_from: 50, ayah_to: 59 })
    ];
    expect(memorisedAyat(p)).toBe(20);
  });

  it('does not merge across surahs', () => {
    const p = [
      portion({ surah: 1, ayah_from: 1, ayah_to: 7 }),
      portion({ surah: 2, ayah_from: 1, ayah_to: 7 })
    ];
    expect(memorisedAyat(p)).toBe(14);
  });
});

describe('review queue', () => {
  it('includes only what is due, soonest first', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const due = dueNow([
      portion({ next_review_at: future }),
      portion({ next_review_at: past })
    ]);
    expect(due).toHaveLength(1);
    expect(due[0].next_review_at).toBe(past);
  });
});

describe('strength labels', () => {
  it('names every level and clamps out of range', () => {
    expect(strengthLabel(0)).toBe('new');
    expect(strengthLabel(5)).toBe('firm');
    expect(strengthLabel(99)).toBe('firm');
    expect(strengthLabel(-1)).toBe('new');
  });
});
