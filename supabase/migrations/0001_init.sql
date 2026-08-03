-- Sahn — initial schema.
-- Every table carries RLS. Default is deny: RLS is enabled with no permissive
-- policy beyond the ones written here, so a row is unreachable unless a policy
-- names it. Personal worship data (prayer_logs, ramadan_days, counsel_threads)
-- is owner-only, always.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ── profiles ────────────────────────────────────────────────────────────────

create type madhhab as enum (
  'hanafi', 'maliki', 'shafii', 'hanbali', 'jafari', 'all'
);

create type calc_method as enum (
  'mwl', 'isna', 'umm_al_qura', 'karachi', 'egyptian', 'moonsighting'
);

create type asr_method as enum ('standard', 'hanafi');

create type subscription_tier as enum ('free', 'paid');

create table profiles (
  id                uuid primary key references auth.users on delete cascade,
  locale            text not null default 'en' check (locale in ('en', 'ar')),
  madhhab           madhhab not null default 'all',
  calc_method       calc_method not null default 'mwl',
  asr_method        asr_method not null default 'standard',
  location          jsonb,           -- { label, latitude, longitude }
  timezone          text,
  subscription_tier subscription_tier not null default 'free',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- A profile row appears the moment the user does; nothing in the app has to
-- remember to create one.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── worship ─────────────────────────────────────────────────────────────────

create type prayer_name as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
create type prayer_status as enum ('prayed', 'jamaah', 'qada', 'missed');

create table prayer_logs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  date     date not null,
  prayer   prayer_name not null,
  status   prayer_status not null,
  logged_at timestamptz not null default now(),
  unique (user_id, date, prayer)
);
create index prayer_logs_user_date_idx on prayer_logs (user_id, date desc);

create table qada_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  prayer_type   prayer_name not null,
  count_owed    integer not null default 0 check (count_owed >= 0),
  count_made_up integer not null default 0 check (count_made_up >= 0),
  updated_at    timestamptz not null default now(),
  unique (user_id, prayer_type)
);

-- ── duas (public corpus) ────────────────────────────────────────────────────

create table dua_entries (
  id              uuid primary key default gen_random_uuid(),
  arabic          text not null,
  transliteration text,
  translations    jsonb not null default '{}'::jsonb,  -- { en: "...", ar: "..." }
  source_ref      text not null,
  audio_url       text,
  tags            text[] not null default '{}',
  -- Dimension is set for the Phase 4 embedding model; change here, not per row.
  embedding       vector(1536)
);
create index dua_entries_tags_idx on dua_entries using gin (tags);

-- ── quran ───────────────────────────────────────────────────────────────────

create table quran_bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  surah      smallint not null check (surah between 1 and 114),
  ayah       smallint not null check (ayah > 0),
  note       text,
  created_at timestamptz not null default now()
);
create index quran_bookmarks_user_idx on quran_bookmarks (user_id, created_at desc);

create table reading_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  plan_type   text not null,                  -- khatam_30 | khatam_60 | khatam_90
  target_date date,
  last_position jsonb not null default '{}'::jsonb,  -- { surah, ayah }
  updated_at  timestamptz not null default now(),
  unique (user_id, plan_type)
);

create table quran_chunks (
  id             uuid primary key default gen_random_uuid(),
  surah          smallint not null check (surah between 1 and 114),
  ayah           smallint not null check (ayah > 0),
  arabic         text not null,
  translation_id text not null,
  text           text not null,
  tafsir_context text,
  language       text not null default 'en',
  embedding      vector(1536),
  unique (surah, ayah, translation_id)
);
create index quran_chunks_position_idx on quran_chunks (surah, ayah);

-- ── ramadan ─────────────────────────────────────────────────────────────────

create table ramadan_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  hijri_year smallint not null,
  day        smallint not null check (day between 1 and 30),
  fasted     boolean,
  taraweeh   boolean,
  juz_read   smallint check (juz_read between 1 and 30),
  reflection text,
  unique (user_id, hijri_year, day)
);

create table missed_fasts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  hijri_year smallint not null,
  count      smallint not null default 0 check (count >= 0),
  made_up    smallint not null default 0 check (made_up >= 0),
  fidya_paid boolean not null default false,
  unique (user_id, hijri_year)
);

-- ── zakat ───────────────────────────────────────────────────────────────────

create table zakat_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  calculated_at timestamptz not null default now(),
  hawl_date     date,
  assets        jsonb not null default '{}'::jsonb,
  liabilities   jsonb not null default '{}'::jsonb,
  nisab_basis   text not null check (nisab_basis in ('gold', 'silver')),
  -- The spot price is stored with the record, not looked up again later:
  -- a calculation must remain reproducible on the day it was made.
  spot_price    jsonb not null,
  currency      text not null default 'GBP',
  amount_due    numeric(14, 2) not null
);
create index zakat_records_user_idx on zakat_records (user_id, calculated_at desc);

-- ── chat ────────────────────────────────────────────────────────────────────

create type chat_route as enum ('fiqh', 'general', 'sensitive');

create table chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  module     text,
  title      text,
  created_at timestamptz not null default now()
);
create index chat_threads_user_idx on chat_threads (user_id, created_at desc);

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references chat_threads on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  route      chat_route,
  citations  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index chat_messages_thread_idx on chat_messages (thread_id, created_at);

-- Counsel content is stored encrypted by the application; the server never
-- holds plaintext, and nothing here is joined into analytics.
create table counsel_threads (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  encrypted_content bytea not null,
  created_at        timestamptz not null default now()
);
create index counsel_threads_user_idx on counsel_threads (user_id, created_at desc);

-- ── row level security ──────────────────────────────────────────────────────

alter table profiles         enable row level security;
alter table prayer_logs      enable row level security;
alter table qada_ledger      enable row level security;
alter table dua_entries      enable row level security;
alter table quran_bookmarks  enable row level security;
alter table reading_progress enable row level security;
alter table quran_chunks     enable row level security;
alter table ramadan_days     enable row level security;
alter table missed_fasts     enable row level security;
alter table zakat_records    enable row level security;
alter table chat_threads     enable row level security;
alter table chat_messages    enable row level security;
alter table counsel_threads  enable row level security;

-- Owner-only tables: one policy each, covering all four verbs.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'prayer_logs', 'qada_ledger', 'quran_bookmarks',
    'reading_progress', 'ramadan_days', 'missed_fasts', 'zakat_records',
    'chat_threads', 'counsel_threads'
  ]
  loop
    execute format($f$
      create policy %1$I on public.%1$I
        for all to authenticated
        using ((select auth.uid()) = %2$s)
        with check ((select auth.uid()) = %2$s);
    $f$, t, case when t = 'profiles' then 'id' else 'user_id' end);
  end loop;
end $$;

-- Messages inherit ownership from their thread.
create policy chat_messages_owner on chat_messages
  for all to authenticated
  using (
    exists (
      select 1 from chat_threads th
      where th.id = chat_messages.thread_id
        and th.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from chat_threads th
      where th.id = chat_messages.thread_id
        and th.user_id = (select auth.uid())
    )
  );

-- Public corpora: read by anyone, written only by the service role (which
-- bypasses RLS), so the ingestion pipeline needs no policy of its own.
create policy dua_entries_public_read on dua_entries
  for select to anon, authenticated using (true);

create policy quran_chunks_public_read on quran_chunks
  for select to anon, authenticated using (true);
