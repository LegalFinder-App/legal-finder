-- Phase 5: expose publish/index timestamps from FTS so Counsellor can show “source date”
-- and “last indexed” on citation cards. No scrape; metadata only.
-- Return row type changed vs 20261119210000 — must DROP before recreate (CREATE OR REPLACE
-- cannot widen OUT columns). Live DBs that hit 42P13: run 20261119230100_… instead.

DROP FUNCTION IF EXISTS public.search_legal_chunks(text, integer, text[], text, text);

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
  published_at timestamptz,
  updated_at timestamptz,
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
    c.published_at,
    c.updated_at,
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
