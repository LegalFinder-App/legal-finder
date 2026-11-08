-- Legal intelligence feed: headlines from the Judiciary of Uganda and the Uganda Police Force,
-- collected by the daily /api/cron/legal-feed job (src/lib/legal-feed/sync.server.ts).
-- Aggregation only: headline, date, category, a short redacted summary and a link to the
-- original — never the full article. Sources and rules: docs/SOURCES.md.
--
-- Everyone may read live items; only the service role (the collector) writes.

CREATE TABLE IF NOT EXISTS public.legal_feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('judiciary', 'upf', 'ulii')),
  source_id TEXT NOT NULL,                       -- the source's own id (post id, article id)
  url TEXT NOT NULL CHECK (url ~ '^https://'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 400),
  summary TEXT CHECK (char_length(summary) <= 600),
  summary_withheld BOOLEAN NOT NULL DEFAULT false, -- redaction removed every sentence
  category TEXT CHECK (char_length(category) <= 80),
  published_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,                         -- gone at the source, or taken down on request
  UNIQUE (source, source_id)
);

ALTER TABLE public.legal_feed_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.legal_feed_items TO anon, authenticated;
GRANT ALL ON public.legal_feed_items TO service_role;

DROP POLICY IF EXISTS "Live feed items are public" ON public.legal_feed_items;
CREATE POLICY "Live feed items are public"
  ON public.legal_feed_items FOR SELECT
  TO anon, authenticated
  USING (removed_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_legal_feed_live
  ON public.legal_feed_items (published_at DESC)
  WHERE removed_at IS NULL;

-- Per-source bookkeeping for the collector (cursors, ETags, content hashes, last error).
-- Not readable by the public.
CREATE TABLE IF NOT EXISTS public.legal_feed_sync_state (
  source TEXT PRIMARY KEY CHECK (source IN ('judiciary', 'upf', 'ulii')),
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT CHECK (char_length(last_error) <= 2000),
  state JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.legal_feed_sync_state ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.legal_feed_sync_state TO service_role;
