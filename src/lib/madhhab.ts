/**
 * Madhhab preference. Set at onboarding, stored on the profile, changeable at
 * any time, and used as a filter on retrieval.
 *
 * ⚠️ It currently has no corpus to filter. The only embedded corpus is the
 * Qur'an, which carries no madhhab tag — so the preference reaches the fiqh
 * prompt (which leads with that school's position where the sources cover it)
 * but changes nothing about which passages come back. It becomes a real filter
 * the moment a madhhab-tagged fiqh corpus is ingested, which is still the
 * project's biggest open dependency.
 */

export const MADHHABS = [
  'hanafi',
  'maliki',
  'shafii',
  'hanbali',
  'jafari',
  'all'
] as const;

export type Madhhab = (typeof MADHHABS)[number];

export const MADHHAB_NAMES: Record<Madhhab, { en: string; ar: string }> = {
  hanafi: { en: 'Hanafi', ar: 'الحنفي' },
  maliki: { en: 'Maliki', ar: 'المالكي' },
  shafii: { en: "Shafi'i", ar: 'الشافعي' },
  hanbali: { en: 'Hanbali', ar: 'الحنبلي' },
  jafari: { en: "Ja'fari", ar: 'الجعفري' },
  all: { en: 'Show all schools', ar: 'اعرض كل المذاهب' }
};
