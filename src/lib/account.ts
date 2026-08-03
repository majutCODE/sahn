/**
 * Every table that holds something belonging to a person.
 *
 * Listed explicitly rather than discovered from the schema at runtime: an
 * export that silently skips a table is worse than one that fails, because
 * the person believes they have a complete copy. `tests/account.test.ts`
 * reads the migrations and fails if a user-owned table is missing here, so
 * adding one to the schema without adding it to this list breaks the build.
 */
export const EXPORTED_TABLES = [
  'profiles',
  'prayer_logs',
  'qada_ledger',
  'quran_bookmarks',
  'reading_progress',
  'ramadan_days',
  'missed_fasts',
  'zakat_records',
  'chat_threads',
  'chat_messages',
  'counsel_threads'
] as const;

export type ExportedTable = (typeof EXPORTED_TABLES)[number];
