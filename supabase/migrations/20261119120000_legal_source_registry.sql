-- Phase 0: catalogue of Uganda legal sources we may cite or ingest later (RAG).
-- Tracks licence, authority tier, host policy, sync timestamps and content checksums.
-- ULII rows stay pending_licence — collectors must not scrape ulii.org (docs/SOURCES.md).

CREATE TABLE IF NOT EXISTS public.legal_source_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  kind TEXT NOT NULL CHECK (
    kind IN ('judgment', 'legislation', 'editorial', 'catalogue', 'news', 'feed')
  ),
  authority TEXT NOT NULL CHECK (
    authority IN ('judgment', 'legislation', 'editorial', 'catalogue', 'news')
  ),
  host_policy TEXT NOT NULL CHECK (
    host_policy IN ('host_full_text', 'host_metadata', 'link_only')
  ),
  licence TEXT NOT NULL CHECK (char_length(licence) BETWEEN 2 AND 120),
  api_status TEXT NOT NULL DEFAULT 'disabled' CHECK (
    api_status IN ('disabled', 'pending_licence', 'licensed', 'active', 'link_only')
  ),
  home_url TEXT CHECK (home_url IS NULL OR home_url ~ '^https://'),
  attribution TEXT CHECK (attribution IS NULL OR char_length(attribution) <= 400),
  last_synced_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  content_checksum TEXT CHECK (content_checksum IS NULL OR char_length(content_checksum) <= 128),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_source_registry_status
  ON public.legal_source_registry (api_status, authority);

ALTER TABLE public.legal_source_registry ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.legal_source_registry TO anon, authenticated;
GRANT ALL ON public.legal_source_registry TO service_role;

-- Public may read catalogue rows (no secrets stored here). Writes: service role or admin.
DROP POLICY IF EXISTS "Source registry is readable" ON public.legal_source_registry;
CREATE POLICY "Source registry is readable"
  ON public.legal_source_registry FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage source registry" ON public.legal_source_registry;
CREATE POLICY "Admins manage source registry"
  ON public.legal_source_registry FOR ALL
  TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_legal_source_registry_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_source_registry_updated ON public.legal_source_registry;
CREATE TRIGGER trg_legal_source_registry_updated
  BEFORE UPDATE ON public.legal_source_registry
  FOR EACH ROW EXECUTE FUNCTION public.touch_legal_source_registry_updated_at();

-- Seed Phase 0 inventory (docs/CORPUS_INVENTORY.md). Idempotent on slug.
INSERT INTO public.legal_source_registry (
  slug, name, kind, authority, host_policy, licence, api_status, home_url, attribution, notes
) VALUES
  (
    'lf-judgements',
    'LegalFinder judgments',
    'judgment',
    'judgment',
    'host_full_text',
    'owner-upload',
    'active',
    'https://legalfinder.co/judgements',
    'Published on LegalFinder',
    'Admin-uploaded PDFs. Replace demo/sample content before public launch claims.'
  ),
  (
    'lf-library',
    'LegalFinder e-library',
    'catalogue',
    'catalogue',
    'host_full_text',
    'owner-upload',
    'active',
    'https://legalfinder.co/library',
    'LegalFinder library',
    'Mark legislation vs catalogue carefully per item category.'
  ),
  (
    'lf-advice',
    'LegalFinder advice guides',
    'editorial',
    'editorial',
    'host_full_text',
    'owner-editorial',
    'active',
    'https://legalfinder.co/advice',
    'LegalFinder guide (editorial)',
    'Not official law — Counsellor must label as editorial.'
  ),
  (
    'lf-news',
    'LegalFinder news',
    'news',
    'news',
    'host_full_text',
    'owner-editorial',
    'active',
    'https://legalfinder.co/news',
    'LegalFinder news',
    'Optional for RAG.'
  ),
  (
    'feed-judiciary',
    'Judiciary of Uganda news',
    'feed',
    'news',
    'host_metadata',
    'aggregation-headline-link',
    'active',
    'https://www.judiciary.go.ug/',
    'Source: Judiciary of Uganda',
    'Polite collector in legal-feed; no full-article mirror.'
  ),
  (
    'feed-upf',
    'Uganda Police Force posts',
    'feed',
    'news',
    'host_metadata',
    'aggregation-headline-link',
    'active',
    'https://www.upf.go.ug/',
    'Source: Uganda Police Force',
    'Redact sensitive personal data in summaries (DPPA 2019).'
  ),
  (
    'ulii-judgments',
    'ULII judgments',
    'judgment',
    'judgment',
    'link_only',
    'cc-by-nc-pending',
    'pending_licence',
    'https://ulii.org/',
    'Source: ULII (ulii.org), CC BY-NC 4.0',
    'No scrape. Enable only after written API licence. Respect ai-input=no.'
  ),
  (
    'ulii-legislation',
    'ULII legislation catalogue',
    'legislation',
    'legislation',
    'link_only',
    'cc-by-nc-pending',
    'pending_licence',
    'https://ulii.org/en/legislation/',
    'Source: ULII (ulii.org), CC BY-NC 4.0',
    'No scrape until licensed.'
  ),
  (
    'ug-constitution',
    'Constitution of the Republic of Uganda',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    'https://ulii.org/en/legislation/',
    'Constitution of Uganda — confirm hostable edition',
    'Core statute pack (Phase 3). Confirm official PDF rights before host_full_text.'
  ),
  (
    'ug-penal-code',
    'Penal Code Act',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Core statute pack (Phase 3).'
  ),
  (
    'ug-cpa',
    'Criminal Procedure Code Act',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Core statute pack (Phase 3).'
  ),
  (
    'ug-evidence',
    'Evidence Act',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Core statute pack (Phase 3).'
  ),
  (
    'ug-land',
    'Land Act',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Core statute pack (Phase 3).'
  ),
  (
    'ug-employment',
    'Employment Act',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Core statute pack (Phase 3).'
  ),
  (
    'ug-family',
    'Family and succession statutes',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Confirm Cap. numbers and editions before hosting.'
  ),
  (
    'ug-companies',
    'Companies Act',
    'legislation',
    'legislation',
    'link_only',
    'tbd-official-edition',
    'link_only',
    NULL,
    NULL,
    'Core statute pack (Phase 3).'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  authority = EXCLUDED.authority,
  host_policy = EXCLUDED.host_policy,
  licence = EXCLUDED.licence,
  api_status = EXCLUDED.api_status,
  home_url = EXCLUDED.home_url,
  attribution = EXCLUDED.attribution,
  notes = EXCLUDED.notes,
  updated_at = now();
