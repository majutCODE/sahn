-- Cosine similarity search over the embedded corpus.
--
-- These are SECURITY INVOKER (the Postgres default), so RLS still applies:
-- quran_chunks and dua_entries are public-read, which is exactly the access
-- these need. Making them SECURITY DEFINER would hand callers a way around
-- RLS on a table that later gains stricter policies.

create or replace function match_quran_chunks(
  query_embedding vector(1024),
  match_count int default 8,
  min_similarity float default 0.30
)
returns table (
  surah smallint,
  ayah smallint,
  arabic text,
  text text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    c.surah,
    c.ayah,
    c.arabic,
    c.text,
    -- <=> is cosine DISTANCE, so similarity is its complement. Getting this
    -- backwards silently returns the least relevant verses first.
    1 - (c.embedding <=> query_embedding) as similarity
  from quran_chunks c
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

create or replace function match_dua_entries(
  query_embedding vector(1024),
  match_count int default 8,
  min_similarity float default 0.30
)
returns table (
  id uuid,
  slug text,
  title jsonb,
  arabic text,
  transliteration text,
  source_ref text,
  quran_ref text,
  similarity float
)
language sql
stable
set search_path = public
as $$
  select
    d.id,
    d.slug,
    d.title,
    d.arabic,
    d.transliteration,
    d.source_ref,
    d.quran_ref,
    1 - (d.embedding <=> query_embedding) as similarity
  from dua_entries d
  where d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) >= min_similarity
  order by d.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

grant execute on function match_quran_chunks(vector, int, float) to anon, authenticated;
grant execute on function match_dua_entries(vector, int, float) to anon, authenticated;
