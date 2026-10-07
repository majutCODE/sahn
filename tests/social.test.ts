import { describe, expect, it } from 'vitest';
import posts from '../content/social-posts.json';

/**
 * The bot posts unattended, so the things that would be embarrassing in public
 * are checked here rather than discovered on the timeline.
 */
describe('social post rotation', () => {
  const all = posts.posts;
  const arabic = all.filter((p) => p.lang === 'ar');

  it('is lowercase with no punctuation', () => {
    for (const p of all) {
      expect(p.text, p.keyword).not.toMatch(/[.,!?;:"'،؛؟]/);
      if (p.lang === 'en') expect(p.text, p.keyword).not.toMatch(/[A-Z]/);
    }
  });

  it('carries both languages and both voices', () => {
    expect(all.some((p) => p.lang === 'ar')).toBe(true);
    expect(all.some((p) => p.person === 'first')).toBe(true);
    expect(all.some((p) => p.person === 'impersonal')).toBe(true);
  });

  it('keeps Arabic at roughly a fifth of the pool', () => {
    // Enough that an Arabic-speaking follower sees their own language in the
    // first week, not so much that the account reads as two accounts.
    const share = arabic.length / all.length;
    expect(share).toBeGreaterThanOrEqual(0.15);
    expect(share).toBeLessThanOrEqual(0.25);
  });

  it('writes Arabic in Arabic', () => {
    // A latin character in an Arabic line means a line that was half
    // translated, which is worse than one that was not translated at all.
    for (const p of arabic) expect(p.text, p.keyword).not.toMatch(/[A-Za-z]/);
  });

  it('fits inside the character limit with the link appended', () => {
    for (const p of all) {
      const length = p.text.length + (p.link ? posts.link.length + 2 : 0);
      expect(length, `${p.keyword} is ${length} chars`).toBeLessThanOrEqual(280);
    }
  });

  it('spends the link rather than attaching it by default', () => {
    // An account that links in every post is an ad. Links sit on the lines
    // where the reader would actually want the thing.
    const share = all.filter((p) => p.link).length / all.length;
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThanOrEqual(0.2);
  });

  it('has no duplicate posts', () => {
    expect(new Set(all.map((p) => p.text)).size).toBe(all.length);
  });

  it('names the search term every post is aimed at', () => {
    for (const p of all) expect(p.keyword.length, p.text).toBeGreaterThan(0);
  });

  it('never runs two neighbours of the same kind together', () => {
    // The bot walks the file in order, so variety is a property of the
    // ordering. Two contrarian lines or two links back to back is what the
    // timeline would actually show.
    for (let i = 1; i < all.length; i += 1) {
      const a = all[i - 1];
      const b = all[i];
      expect(a.tone === b.tone, `${i}: two ${a.tone} in a row`).toBe(false);
      expect(a.lang === 'ar' && b.lang === 'ar', `${i}: two arabic in a row`).toBe(false);
      expect(Boolean(a.link && b.link), `${i}: two links in a row`).toBe(false);
    }
  });

  it('runs for months before repeating', () => {
    // At the bot's own rate — a weighted 1.4 posts a day — the pool is the
    // only thing standing between the account and a visible loop.
    expect(all.length / 1.4).toBeGreaterThan(180);
  });

  it('makes no claim Sahn does not hold', () => {
    // The corpus figures appear in the copy; if they drift, the bot is
    // publishing a number the site contradicts.
    const text = all.map((p) => p.text).join(' ');
    expect(text).not.toMatch(/\b6237\b|\b6235\b/);
    expect(text).not.toMatch(/\b36056\b|\b36058\b/);
  });
});
