-- Hadith corpus.
--
-- The Qur'an alone cannot answer a fiqh question — fiqh is the scholarly
-- working-out, and hadith is the material it works from. Without this the fiqh
-- route can only ever say "I have the verses but not the commentary".
--
-- Source: the public-domain (Unlicense) hadith-api dataset, which carries the
-- Arabic and an English rendering aligned by hadith number, plus the gradings.
-- Nothing here is under copyright, so the corpus survives this becoming a real
-- product rather than having to be torn out.

create table hadith_chunks (
  id              uuid primary key default gen_random_uuid(),
  -- Slug of the collection: bukhari, muslim, abudawud, ...
  collection      text not null,
  -- Display name as cited: "Sahih al-Bukhari".
  collection_name text not null,
  hadith_number   text not null,
  book_number     smallint,
  arabic          text not null,
  text            text not null,
  -- Gradings as supplied, e.g. "Sahih (Darussalam)". Kept verbatim rather than
  -- normalised: a grading is a scholarly judgement, not a field to tidy.
  grades          jsonb not null default '[]'::jsonb,
  reference       text not null,
  language        text not null default 'en',
  embedding       vector(1024),
  unique (collection, hadith_number)
);

create index hadith_chunks_collection_idx on hadith_chunks (collection, book_number);
create index hadith_chunks_embedding_idx
  on hadith_chunks using hnsw (embedding vector_cosine_ops);

alter table hadith_chunks enable row level security;

-- Public corpus: read by anyone, written only by the service role.
create policy hadith_chunks_public_read on hadith_chunks
  for select to anon, authenticated using (true);

create or replace function match_hadith_chunks(
  query_embedding vector(1024),
  match_count int default 8,
  min_similarity float default 0.30
)
returns table (
  collection text,
  collection_name text,
  hadith_number text,
  arabic text,
  text text,
  grades jsonb,
  reference text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    h.collection,
    h.collection_name,
    h.hadith_number,
    h.arabic,
    h.text,
    h.grades,
    h.reference,
    1 - (h.embedding <=> query_embedding) as similarity
  from hadith_chunks h
  where h.embedding is not null
    and 1 - (h.embedding <=> query_embedding) >= min_similarity
  order by h.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

grant execute on function match_hadith_chunks(vector, int, float) to anon, authenticated;
