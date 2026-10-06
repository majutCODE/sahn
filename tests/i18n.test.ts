import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ar from '../messages/ar.json';
import en from '../messages/en.json';
import { locales, localeDirection, localeFormatTag } from '@/i18n/routing';
import { modules } from '@/lib/modules';

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : leafKeys(value, path);
  });
}

const enKeys = leafKeys(en as Tree).sort();
const arKeys = leafKeys(ar as Tree).sort();

describe('message catalogues', () => {
  it('define exactly the same keys in both locales', () => {
    expect(arKeys).toEqual(enKeys);
  });

  it('leaves no message empty', () => {
    for (const tree of [en, ar] as Tree[]) {
      const empties = leafKeys(tree).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Tree)[key], tree);
        return typeof value === 'string' && value.trim() === '';
      });
      expect(empties).toEqual([]);
    }
  });

  it('keeps ICU placeholders identical across locales', () => {
    const placeholders = (tree: Tree, path: string) => {
      const value = path
        .split('.')
        .reduce<unknown>((node, key) => (node as Tree)[key], tree) as string;
      return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    };

    for (const path of enKeys) {
      expect(placeholders(ar as Tree, path), path).toEqual(
        placeholders(en as Tree, path)
      );
    }
  });
});

describe('modules', () => {
  it('has a name and summary in both locales', () => {
    for (const m of modules) {
      expect(enKeys).toContain(`modules.${m.id}.name`);
      expect(enKeys).toContain(`modules.${m.id}.summary`);
    }
  });

  it('has a route on disk for every entry in the rail', () => {
    for (const m of modules) {
      const route = fileURLToPath(
        new URL(`../src/app/[locale]${m.href}/page.tsx`, import.meta.url)
      );
      expect(existsSync(route), m.href).toBe(true);
    }
  });
});

describe('direction and numerals', () => {
  it('maps every locale to a direction', () => {
    for (const locale of locales) {
      expect(['ltr', 'rtl']).toContain(localeDirection[locale]);
    }
    expect(localeDirection.ar).toBe('rtl');
  });

  it('renders Eastern Arabic digits in ar and Western digits in en', () => {
    const arabic = new Intl.NumberFormat(localeFormatTag.ar).format(2026);
    const latin = new Intl.NumberFormat(localeFormatTag.en).format(2026);

    expect(arabic).toBe('٢٬٠٢٦');
    expect(latin).toBe('2,026');
  });
});

/**
 * Every shipped country needs a name in both locales.
 *
 * Adding cities and adding their country names are two separate edits, and the
 * second is easy to forget: the build logged MISSING_MESSAGE for ten countries
 * the first time this set expanded, which next-intl turns into a thrown error
 * on the page rather than a quiet fallback.
 */
describe('prayer page country names', () => {
  it('covers every country in the shipped set', async () => {
    const cities = (await import('../content/cities.json')).default as {
      countries: Record<string, Array<{ country: string; priority?: boolean }>>;
    };
    const shipped = [
      ...new Set(
        Object.values(cities.countries)
          .flat()
          .filter((c) => c.priority)
          .map((c) => c.country)
      )
    ];

    for (const locale of ['en', 'ar'] as const) {
      const messages = (await import(`../messages/${locale}.json`)).default as {
        prayerPages: { countries: Record<string, string> };
      };
      const missing = shipped.filter((c) => !messages.prayerPages.countries[c]);
      expect(missing, `${locale} is missing country names`).toEqual([]);
    }
  });
});
