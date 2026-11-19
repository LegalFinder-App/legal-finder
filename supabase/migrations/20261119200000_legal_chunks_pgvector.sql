-- Phase 1: pgvector store for Counsellor hybrid retrieval (Uganda legal RAG plan).
-- Apply in Supabase SQL Editor if you don't run npm run db:migrate locally.
-- Embeddings: OpenAI text-embedding-3-small (1536 dims). Without OPENAI_API_KEY the app
-- falls back to keyword search over published catalogues.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.legal_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('advice', 'judgment', 'library')),
  source_id TEXT NOT NULL,
  source_registry_slug TEXT REFERENCES public.legal_source_registry (slug) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0 CHECK (chunk_index >= 0),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 400),
  citation TEXT CHECK (citation IS NULL OR char_length(citation) <= 240),
  authority TEXT NOT NULL CHECK (
    authority IN ('judgment', 'legislation', 'editorial', 'catalogue')
  ),
  chunk_text TEXT NOT NULL CHECK (char_length(chunk_text) BETWEEN 1 AND 8000),
  source_url TEXT CHECK (source_url IS NULL OR source_url ~ '^https?://|^/'),
  href TEXT CHECK (href IS NULL OR char_length(href) <= 400),
  court TEXT CHECK (court IS NULL OR char_length(court) <= 160),
  category TEXT CHECK (category IS NULL OR char_length(category) <= 120),
  case_number TEXT CHECK (case_number IS NULL OR char_length(case_number) <= 120),
  decided_on DATE,
  year INTEGER CHECK (year IS NULL OR (year >= 1890 AND year <= 2100)),
  published_at TIMESTAMPTZ,
  content_hash TEXT NOT NULL CHECK (char_length(content_hash) BETWEEN 8 AND 128),
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_kind, source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_source
  ON public.legal_chunks (source_kind, source_id);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_authority
  ON public.legal_chunks (authority);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding
  ON public.legal_chunks
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.legal_chunks TO authenticated;
GRANT ALL ON public.legal_chunks TO service_role;

DROP POLICY IF EXISTS "Admins can read legal chunks" ON public.legal_chunks;
CREATE POLICY "Admins can read legal chunks"
  ON public.legal_chunks FOR SELECT
  TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_legal_chunks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_chunks_updated ON public.legal_chunks;
CREATE TRIGGER trg_legal_chunks_updated
  BEFORE UPDATE ON public.legal_chunks
  FOR EACH ROW EXECUTE FUNCTION public.touch_legal_chunks_updated_at();

CREATE OR REPLACE FUNCTION public.match_legal_chunks(
  query_embedding vector(1536),
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
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM public.legal_chunks c
  WHERE c.embedding IS NOT NULL
    AND (filter_kinds IS NULL OR c.source_kind = ANY (filter_kinds))
    AND (filter_court IS NULL OR c.court = filter_court)
    AND (filter_category IS NULL OR c.category = filter_category)
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 40));
$$;

REVOKE ALL ON FUNCTION public.match_legal_chunks(vector, integer, text[], text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_legal_chunks(vector, integer, text[], text, text) TO service_role;
