/**
 * Shapes returned by the Quran.com content API, narrowed to what Sahn reads.
 * Kept separate from the client so client components can import the types
 * without tripping the `server-only` guard.
 */

export type Chapter = {
  id: number;
  revelation_place: 'makkah' | 'madinah';
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: { language_name: string; name: string };
};

export type Translation = {
  id?: number;
  resource_id: number;
  resource_name?: string;
  text: string;
};

export type Verse = {
  id: number;
  verse_number: number;
  verse_key: string;
  juz_number: number;
  hizb_number: number;
  page_number: number;
  text_uthmani?: string;
  text_indopak?: string;
  translations?: Translation[];
  words?: Word[];
};

export type Word = {
  id: number;
  position: number;
  text_uthmani?: string;
  translation?: { text: string };
  transliteration?: { text: string };
};

export type TranslationResource = {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: { name: string; language_name: string };
};

export type TafsirResource = TranslationResource;

export type RecitationResource = {
  id: number;
  reciter_name: string;
  style?: string;
  translated_name: { name: string; language_name: string };
};

export type Pagination = {
  per_page: number;
  current_page: number;
  next_page: number | null;
  total_pages: number;
  total_records: number;
};
