import { describe, expect, it } from 'vitest';
import { COVERED_COUNTRIES, crisisResources } from '../src/lib/chat/crisis';

/**
 * The crisis list is the highest-consequence content in the product. These
 * tests do not check that a number is correct — only a person can do that —
 * but they do check the properties that make a wrong answer impossible to
 * ship silently.
 */
describe('crisis resources', () => {
  it('falls back to the directory for an unknown country', () => {
    for (const country of [undefined, '', 'ZZ', 'xx', 'KW']) {
      const { region } = crisisResources('self_harm', country);
      expect(region).toBe('INT');
    }
  });

  it('never returns an empty list', () => {
    for (const country of [...COVERED_COUNTRIES, undefined, 'ZZ']) {
      for (const category of ['self_harm', 'abuse'] as const) {
        expect(crisisResources(category, country).helplines.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every covered country a way to reach help immediately', () => {
    // Either an emergency number or, where no specialist line could be
    // verified, the directory. Never a category with neither.
    for (const country of COVERED_COUNTRIES) {
      for (const category of ['self_harm', 'abuse'] as const) {
        const { helplines } = crisisResources(category, country);
        const hasRoute = helplines.some(
          (h) => h.name === 'Emergency' || h.name === 'Find a Helpline'
        );
        expect(hasRoute, `${country}/${category}`).toBe(true);
      }
    }
  });

  it('is case-insensitive about the country code', () => {
    expect(crisisResources('self_harm', 'gb').region).toBe('GB');
    expect(crisisResources('self_harm', 'Gb').region).toBe('GB');
  });

  it('distinguishes abuse from self-harm where it has specialist lines', () => {
    const selfHarm = crisisResources('self_harm', 'GB').helplines.map((h) => h.name);
    const abuse = crisisResources('abuse', 'GB').helplines.map((h) => h.name);
    expect(selfHarm).not.toEqual(abuse);
    expect(abuse.some((n) => n.includes('Domestic Abuse'))).toBe(true);
  });

  it('carries both languages on every note', () => {
    // A helpline whose note renders blank in Arabic is worse than no note.
    for (const country of [...COVERED_COUNTRIES, 'ZZ']) {
      for (const category of ['self_harm', 'abuse'] as const) {
        for (const line of crisisResources(category, country).helplines) {
          if (!line.note) continue;
          expect(line.note.en.length, line.name).toBeGreaterThan(0);
          expect(line.note.ar.length, line.name).toBeGreaterThan(0);
        }
      }
    }
  });
});
