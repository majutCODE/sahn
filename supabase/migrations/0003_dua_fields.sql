-- The dua library ships Arabic-first: the Arabic text is Qur'an and hadith and
-- carries no restriction, but the standard English translation of Hisn
-- al-Muslim is under copyright. These columns let an entry be useful and
-- honest before a licensed translation exists.

alter table dua_entries
  -- Short label per locale, e.g. {"en": "On leaving the house", "ar": "..."}.
  add column title jsonb not null default '{}'::jsonb,
  -- Set when the du'a is Qur'anic ("2:201", or "20:25-28" for a passage).
  -- Those get a real translation immediately from the Quran.com licence.
  add column quran_ref text,
  -- False once a licensed or commissioned translation is in `translations`.
  add column translation_pending boolean not null default true,
  -- Stable key so re-seeding updates rather than duplicating.
  add column slug text;

create unique index dua_entries_slug_idx on dua_entries (slug);
create index dua_entries_quran_ref_idx on dua_entries (quran_ref)
  where quran_ref is not null;
