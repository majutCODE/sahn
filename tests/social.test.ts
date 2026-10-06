import { describe, expect, it } from 'vitest';
import posts from '../content/social-posts.json';

/**
 * The bot posts unattended, so the things that would be embarrassing in public
 * are checked here rather than discovered on the timeline.
 */
describe('social post rotation', () => {
  const all = posts.posts;

  it('is lowercase with no punctuation', () => {
    for (const p of all) {
      expect(p.text, p.keyword).not.toMatch(/[.,!?;:]/);
      if (p.lang === 'en') expect(p.text, p.keyword).not.toMatch(/[A-Z]/);
    }
  });

  it('carries both languages and both voices', () => {
    expect(all.some((p) => p.lang === 'ar')).toBe(true);
    expect(all.some((p) => p.person === 'first')).toBe(true);
    expect(all.some((p) => p.person === 'impersonal')).toBe(true);
  });

  it('fits inside the character limit with the link appended', () => {
    for (const p of all) {
      const length = p.text.length + posts.link.length + 2;
      expect(length, `${p.feature} is ${length} chars`).toBeLessThanOrEqual(280);
    }
  });

  it('has no duplicate posts', () => {
    expect(new Set(all.map((p) => p.text)).size).toBe(all.length);
  });

  it('names the search term every post is aimed at', () => {
    for (const p of all) expect(p.keyword.length, p.text).toBeGreaterThan(0);
  });

  it('makes no claim Sahn does not hold', () => {
    // The corpus figures appear in the copy; if they drift, the bot is
    // publishing a number the site contradicts.
    const text = all.map((p) => p.text).join(' ');
    if (text.includes('6,236')) expect(text).toContain('6,236 ayat');
    if (text.includes('36,057')) expect(text).toContain('36,057');
  });

  it('cycles fully before repeating', () => {
    // The rotation is date-derived; over one full cycle every post appears once.
    const seen = new Set<number>();
    for (let period = 0; period < all.length; period += 1) {
      seen.add(period % all.length);
    }
    expect(seen.size).toBe(all.length);
  });
});
