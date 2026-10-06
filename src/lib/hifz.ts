import data from '../../content/surahs.json';

export type Surah = {
  surah: number;
  ayat: number;
  name: string;
  arabic: string;
  translated: string;
  revelation: string;
};

export type Portion = {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  strength: number;
  last_reviewed_at: string | null;
  next_review_at: string;
};

const dataset = data as { total: number; surahs: Surah[] };

export const SURAHS: readonly Surah[] = dataset.surahs;
export const TOTAL_AYAT = dataset.total;

export function surahByNumber(n: number): Surah | undefined {
  return SURAHS.find((s) => s.surah === n);
}

export function ayatIn(portion: Portion): number {
  return Math.max(0, portion.ayah_to - portion.ayah_from + 1);
}

/**
 * How much of the Qur'an is held.
 *
 * Overlapping portions are counted once. Someone who adds "al-Baqarah 1-20"
 * and later "al-Baqarah 1-50" has memorised fifty ayat, not seventy, and a
 * progress figure that rewards re-adding the same passage is worse than no
 * figure at all.
 */
export function memorisedAyat(portions: Portion[]): number {
  const bySurah = new Map<number, Array<[number, number]>>();
  for (const p of portions) {
    const ranges = bySurah.get(p.surah) ?? [];
    ranges.push([p.ayah_from, p.ayah_to]);
    bySurah.set(p.surah, ranges);
  }

  let total = 0;
  for (const ranges of bySurah.values()) {
    ranges.sort((a, b) => a[0] - b[0]);
    let [start, end] = ranges[0];
    for (const [from, to] of ranges.slice(1)) {
      if (from <= end + 1) {
        end = Math.max(end, to);
      } else {
        total += end - start + 1;
        [start, end] = [from, to];
      }
    }
    total += end - start + 1;
  }
  return total;
}

/** Portions whose review is due, soonest first. */
export function dueNow(portions: Portion[], now = new Date()): Portion[] {
  return portions
    .filter((p) => new Date(p.next_review_at).getTime() <= now.getTime())
    .sort(
      (a, b) =>
        new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
    );
}

/**
 * Strength as a word rather than a number.
 *
 * A bare 3/5 invites someone to treat memorisation as a score to maximise.
 * What the number actually means is how long it can safely go unreviewed.
 */
export const STRENGTH_LABELS = ['new', 'shaky', 'settling', 'steady', 'strong', 'firm'] as const;
export type StrengthLabel = (typeof STRENGTH_LABELS)[number];

export function strengthLabel(strength: number): StrengthLabel {
  return STRENGTH_LABELS[Math.min(Math.max(strength, 0), 5)];
}
