/**
 * Which of the API's resources Sahn ships by default.
 *
 * The service offers 8 English translations, 3 English tafsirs and 12
 * reciters. These are the defaults, chosen for plainness and wide acceptance
 * rather than for scholarly preference — and every one of them is meant to be
 * switchable by the user, so nothing here is a ruling about which is best.
 */

export const TRANSLATIONS = {
  saheeh: 20,
  abdelHaleem: 85,
  pickthall: 19,
  yusufAli: 22,
  usmani: 84,
  hilaliKhan: 203,
  maududi: 95,
  transliteration: 57
} as const;

export const TAFSIRS = {
  ibnKathir: 169,
  maarifAlQuran: 168,
  tazkirulQuran: 817
} as const;

export const RECITERS = {
  husary: 12,
  abdulBasit: 2,
  sudais: 3,
  shatri: 4
} as const;

/**
 * Defaults. Saheeh International reads plainly and is the most widely used
 * English rendering; Ibn Kathir is the tafsir most readers will have heard of;
 * al-Husary's murattal is slow enough to follow along with.
 */
export const DEFAULT_TRANSLATION = TRANSLATIONS.saheeh;
export const DEFAULT_TAFSIR = TAFSIRS.ibnKathir;
export const DEFAULT_RECITER = RECITERS.husary;

/** Arabic readers get no translation by default — the text is the text. */
export function defaultTranslationFor(locale: string): number | null {
  return locale === 'ar' ? null : DEFAULT_TRANSLATION;
}

/**
 * Translations carry footnote markup like `<sup foot_note=227235>1</sup>`.
 * Sahn does not render footnotes yet, and a raw tag in the middle of an ayah
 * is worse than no marker at all.
 */
export function stripFootnotes(text: string): string {
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
