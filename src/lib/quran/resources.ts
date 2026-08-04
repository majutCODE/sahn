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
  minshawi: 9,
  afasy: 7,
  sudais: 3,
  shatri: 4,
  shuraym: 10,
  rifai: 5,
  tablawi: 11,
  husaryPlain: 6,
  abdulBasitMujawwad: 1,
  minshawiMujawwad: 8
} as const;

export type ReciterId = (typeof RECITERS)[keyof typeof RECITERS];

/**
 * The reciters offered in the reader, in the order they are listed.
 *
 * Names are written here rather than taken from the API at render time: the
 * list is fixed, the endpoint costs a round trip on every page, and a reciter
 * whose name arrives late would make the picker flicker.
 *
 * Murattal readings come first because they are measured enough to follow
 * along with; the mujawwad recordings are slower and more ornamented, which is
 * a listening choice rather than a reading one.
 */
export const RECITER_LIST: ReadonlyArray<{
  id: ReciterId;
  name: string;
  style?: string;
}> = [
  { id: RECITERS.husary, name: 'Mahmoud Khalil al-Husary', style: 'Muallim' },
  { id: RECITERS.husaryPlain, name: 'Mahmoud Khalil al-Husary' },
  { id: RECITERS.abdulBasit, name: 'AbdulBaset AbdulSamad', style: 'Murattal' },
  { id: RECITERS.minshawi, name: 'Mohamed Siddiq al-Minshawi', style: 'Murattal' },
  { id: RECITERS.afasy, name: 'Mishari Rashid al-Afasy' },
  { id: RECITERS.sudais, name: 'Abdur-Rahman as-Sudais' },
  { id: RECITERS.shatri, name: 'Abu Bakr al-Shatri' },
  { id: RECITERS.shuraym, name: 'Sa\'ud ash-Shuraym' },
  { id: RECITERS.rifai, name: 'Hani ar-Rifai' },
  { id: RECITERS.tablawi, name: 'Mohamed al-Tablawi' },
  {
    id: RECITERS.abdulBasitMujawwad,
    name: 'AbdulBaset AbdulSamad',
    style: 'Mujawwad'
  },
  {
    id: RECITERS.minshawiMujawwad,
    name: 'Mohamed Siddiq al-Minshawi',
    style: 'Mujawwad'
  }
];

/** Guards a stored or submitted id against the list above. */
export function isReciterId(value: unknown): value is ReciterId {
  return RECITER_LIST.some((r) => r.id === value);
}

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
