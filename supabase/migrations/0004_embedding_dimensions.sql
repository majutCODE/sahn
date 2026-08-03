-- The initial schema guessed vector(1536). The embedding model we actually
-- settled on — voyage-3.5 — returns 1024 dimensions, and pgvector rejects an
-- insert whose dimension does not match the column exactly. Caught by the
-- credential check before any corpus was ingested; both tables are still empty,
-- so this is a straight column retype rather than a re-embed.

alter table dua_entries
  alter column embedding type vector(1024) using null;

alter table quran_chunks
  alter column embedding type vector(1024) using null;

-- Cosine similarity is what the retrieval queries use, per the build spec.
-- HNSW over ivfflat: it needs no training pass, so it behaves correctly on an
-- empty table and stays correct as rows arrive during ingestion.
create index quran_chunks_embedding_idx
  on quran_chunks using hnsw (embedding vector_cosine_ops);

create index dua_entries_embedding_idx
  on dua_entries using hnsw (embedding vector_cosine_ops);
