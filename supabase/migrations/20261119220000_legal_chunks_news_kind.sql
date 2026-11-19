-- Phase 2: allow Judiciary/UPF feed aggregation rows as citeable `news` chunks.

ALTER TABLE public.legal_chunks
  DROP CONSTRAINT IF EXISTS legal_chunks_source_kind_check;

ALTER TABLE public.legal_chunks
  ADD CONSTRAINT legal_chunks_source_kind_check
  CHECK (source_kind IN ('advice', 'judgment', 'library', 'news'));

ALTER TABLE public.legal_chunks
  DROP CONSTRAINT IF EXISTS legal_chunks_authority_check;

ALTER TABLE public.legal_chunks
  ADD CONSTRAINT legal_chunks_authority_check
  CHECK (authority IN ('judgment', 'legislation', 'editorial', 'catalogue', 'news'));
