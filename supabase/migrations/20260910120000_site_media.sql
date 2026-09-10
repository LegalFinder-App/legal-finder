-- Reference table for app-owned imagery (practice-area illustrations, dashboard empty states,
-- hero variants) hosted on ImageKit — see scripts/seed-site-media.mjs, which populates this
-- table once. `keywords` lets a lawyer's free-text `practice_areas` (there is no fixed
-- practice-area lookup table) be fuzzy-matched to the closest illustration at read time.
CREATE TABLE public.site_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('hero', 'empty_state', 'practice_area')),
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  credit_name TEXT,
  credit_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX site_media_category_idx ON public.site_media (category);

ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;

-- Public reference imagery — readable by everyone, including signed-out visitors on the
-- marketing pages; only admins curate it.
GRANT SELECT ON public.site_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_media TO authenticated;

CREATE POLICY "site_media_read" ON public.site_media FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "site_media_admin_write" ON public.site_media FOR ALL TO authenticated
  USING (public.has_role((auth.jwt()->>'sub'), 'admin'))
  WITH CHECK (public.has_role((auth.jwt()->>'sub'), 'admin'));
