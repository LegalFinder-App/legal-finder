-- Phase 1b: Anthropic-only stack — Postgres full-text search on legal_chunks.
-- Anthropic does not ship an embeddings API; we do not require OpenAI or Voyage.
-- Apply in Supabase SQL Editor after 20261119200000_legal_chunks_pgvector.sql
-- (embedding column may stay null forever).

ALTER TABLE public.legal_chunks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(citation, '')), 'B')
    || setweight(to_tsvector('english', coalesce(chunk_text, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_legal_chunks_search_vector
  ON public.legal_chunks USING gin (search_vector);

CREATE OR REPLACE FUNCTION public.search_legal_chunks(
  query_text text,
  match_count integer DEFAULT 12,
  filter_kinds text[] DEFAULT NULL,
  filter_court text DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_kind text,
  source_id text,
  title text,
  citation text,
  authority text,
  chunk_text text,
  source_url text,
  href text,
  court text,
  category text,
  case_number text,
  decided_on date,
  year integer,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    SELECT websearch_to_tsquery(
      'english',
      left(trim(both FROM coalesce(query_text, '')), 200)
    ) AS tsq
  )
  SELECT
    c.id,
    c.source_kind,
    c.source_id,
    c.title,
    c.citation,
    c.authority,
    c.chunk_text,
    c.source_url,
    c.href,
    c.court,
    c.category,
    c.case_number,
    c.decided_on,
    c.year,
    ts_rank_cd(c.search_vector, q.tsq)::float AS similarity
  FROM public.legal_chunks c
  CROSS JOIN q
  WHERE q.tsq::text <> ''
    AND c.search_vector @@ q.tsq
    AND (filter_kinds IS NULL OR c.source_kind = ANY (filter_kinds))
    AND (filter_court IS NULL OR c.court = filter_court)
    AND (filter_category IS NULL OR c.category = filter_category)
  ORDER BY similarity DESC, c.published_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(match_count, 40));
$$;

REVOKE ALL ON FUNCTION public.search_legal_chunks(text, integer, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_legal_chunks(text, integer, text[], text, text) TO service_role;
